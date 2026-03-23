const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const { createServer } = require('http')
const { Server } = require('socket.io')
require('dotenv').config()

const app = express()
const httpServer = createServer(app)

// ── Allowed Origins ────────────────────────────────────

const allowedOrigins = [
  'http://localhost:5173',
  'https://lucky-tapioca-d355f7.netlify.app',
  'https://b2b-ecommerce-india.netlify.app',
  process.env.FRONTEND_URL
]
// const allowedOrigins = [
//   'http://localhost:5173',
//   'https://lucky-tapioca-d355f7.netlify.app',
//   'https://b2b-backend-b6l6.onrender.com',
//   process.env.FRONTEND_URL
// ]

// ── Socket.io ──────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
})

// ── Middleware ─────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}))
app.use(express.json())
app.use('/uploads', express.static('uploads'))

// ── Routes ─────────────────────────────────────────────
app.use('/api/auth', require('./routes/authRoutes'))
app.use('/api/products', require('./routes/productRoutes'))
app.use('/api/categories', require('./routes/categoryRoutes'))
app.use('/api/cart', require('./routes/cartRoutes'))
app.use('/api/orders', require('./routes/orderRoutes'))
app.use('/api/payments', require('./routes/paymentRoutes'))
app.use('/api/admin', require('./routes/adminRoutes'))
app.use('/api/chatbot', require('./routes/chatbotRoutes'))
app.use('/api/reviews', require('./routes/reviewRoutes'))
app.use('/api/notifications', require('./routes/notificationRoutes'))

// ── Health Check ───────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: '🚀 B2B API is running!' })
})

// ── Socket.io Events ───────────────────────────────────
const connectedUsers = {}

io.on('connection', (socket) => {
  console.log('⚡ User connected:', socket.id)

  socket.on('join', (userId) => {
    connectedUsers[userId] = socket.id
    console.log(`👤 User ${userId} joined`)
  })

  socket.on('send_message', (data) => {
    const { to, message, from } = data
    const receiverSocket = connectedUsers[to]
    if (receiverSocket) {
      io.to(receiverSocket).emit('receive_message', {
        message,
        from,
        timestamp: new Date()
      })
    }
  })

  socket.on('order_update', (data) => {
    const receiverSocket = connectedUsers[data.userId]
    if (receiverSocket) {
      io.to(receiverSocket).emit('notification', data)
    }
  })

  socket.on('disconnect', () => {
    Object.keys(connectedUsers).forEach(key => {
      if (connectedUsers[key] === socket.id) {
        delete connectedUsers[key]
      }
    })
    console.log('❌ User disconnected:', socket.id)
  })
})

// Export io
app.set('io', io)

// ── Start Server ───────────────────────────────────────
const PORT = process.env.PORT || 5000
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running → http://localhost:${PORT}`)
})