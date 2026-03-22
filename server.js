const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const { createServer } = require('http')
const { Server } = require('socket.io')
require('dotenv').config()

const app = express()
const httpServer = createServer(app)

// ── Socket.io ──────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:5173',
      process.env.FRONTEND_URL
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
})

// ── Middleware ─────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({
  origin: [
    'http://localhost:5173',
    process.env.FRONTEND_URL
  ],
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