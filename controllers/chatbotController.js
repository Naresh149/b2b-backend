const OpenAI = require('openai')
const db = require('../config/db')

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
})

exports.chat = async (req, res) => {
  const { message } = req.body
  if (!message) return res.status(400).json({ error: 'Message required!' })

  try {
    // Get products from DB
    const products = await new Promise((resolve, reject) => {
      db.query(
        `SELECT p.title, p.price, p.stock, c.name as category
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.is_active = 1 LIMIT 50`,
        (err, results) => {
          if (err) reject(err)
          else resolve(results)
        }
      )
    })

    // Get cart
    const cartItems = await new Promise((resolve, reject) => {
      db.query(
        `SELECT p.title, c.quantity, p.price
         FROM cart c
         JOIN products p ON c.product_id = p.id
         WHERE c.user_id = ?`,
        [req.user.id],
        (err, results) => {
          if (err) reject(err)
          else resolve(results)
        }
      )
    })

    // Get orders
    const orders = await new Promise((resolve, reject) => {
      db.query(
        `SELECT id, total, status, created_at
         FROM orders WHERE buyer_id = ?
         ORDER BY created_at DESC LIMIT 5`,
        [req.user.id],
        (err, results) => {
          if (err) reject(err)
          else resolve(results)
        }
      )
    })

    const systemPrompt = `You are a helpful B2B e-commerce assistant for B2B Shop.
You help buyers find products, check their cart, track orders, and answer questions.

Available products:
${products.map(p => `- ${p.title} | Rs.${p.price} | Stock: ${p.stock} | Category: ${p.category}`).join('\n')}

User cart:
${cartItems.length > 0
  ? cartItems.map(i => `- ${i.title} x${i.quantity} = Rs.${i.price * i.quantity}`).join('\n')
  : 'Cart is empty'}

Recent orders:
${orders.length > 0
  ? orders.map(o => `- Order #${o.id} | Rs.${o.total} | Status: ${o.status}`).join('\n')
  : 'No orders yet'}

Rules:
- Be friendly and helpful
- Help find products by name category or price
- Keep responses short and clear
- Use Rs. for prices
- If asked to add to cart tell them to click Add to Cart button`

    const response = await client.chat.completions.create({
      model: 'meta-llama/llama-3.2-3b-instruct:free',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
    })

    res.json({ reply: response.choices[0].message.content })

  } catch (err) {
    console.error('Chatbot error:', err.message)
    res.status(500).json({ error: err.message })
  }
}