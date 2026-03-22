const express = require('express');
const router = express.Router();
const {
  getCart, addToCart, updateCart,
  removeFromCart, clearCart
} = require('../controllers/cartController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getCart);
router.post('/', protect, addToCart);
router.put('/:id', protect, updateCart);
router.delete('/:id', protect, removeFromCart);
router.delete('/', protect, clearCart);

module.exports = router;