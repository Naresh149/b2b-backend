require('dotenv').config()
const OpenAI = require('openai')

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
})

async function test() {
  try {
    console.log('Testing OpenRouter API...')
    const response = await client.chat.completions.create({
      model: 'meta-llama/llama-3.2-3b-instruct:free',
      messages: [
        { role: 'user', content: 'Say hello in one sentence' }
      ],
    })
    console.log('✅ Success!')
    console.log('Response:', response.choices[0].message.content)
  } catch (err) {
    console.log('❌ Error:', err.message)
  }
}

test()