const express = require('express');
const router = express.Router();
const {
  getStats, getMonthlySales, getAllUsers,
  toggleUserStatus, getAllOrders, updateOrderStatus,
  getSellerStats, getSellerOrders
} = require('../controllers/adminController');
const { protect, adminOnly, sellerOnly } = require('../middleware/authMiddleware');

// Admin routes
router.get('/stats', protect, adminOnly, getStats);
router.get('/monthly-sales', protect, adminOnly, getMonthlySales);
router.get('/users', protect, adminOnly, getAllUsers);
router.put('/users/:id/toggle', protect, adminOnly, toggleUserStatus);
router.get('/orders', protect, adminOnly, getAllOrders);
router.put('/orders/:id/status', protect, updateOrderStatus);

// Seller routes
router.get('/seller/stats', protect, sellerOnly, getSellerStats);
router.get('/seller/orders', protect, sellerOnly, getSellerOrders);

module.exports = router;