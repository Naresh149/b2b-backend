const express = require('express');
const router = express.Router();
const {
  placeOrder, getMyOrders, getOrderDetail,
  getAllOrders, updateOrderStatus
} = require('../controllers/orderController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.post('/', protect, placeOrder);
router.get('/my', protect, getMyOrders);
router.get('/:id', protect, getOrderDetail);
router.get('/', protect, adminOnly, getAllOrders);
router.put('/:id/status', protect, updateOrderStatus);

module.exports = router;