const express = require('express');
const router = express.Router();
const {
  getProducts, getProduct, createProduct,
  updateProduct, deleteProduct, getSellerProducts
} = require('../controllers/productController');
const { protect, sellerOnly } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/', getProducts);
router.get('/seller', protect, sellerOnly, getSellerProducts);
router.get('/:id', getProduct);
router.post('/', protect, sellerOnly, upload.single('image'), createProduct);
router.put('/:id', protect, sellerOnly, upload.single('image'), updateProduct);
router.delete('/:id', protect, sellerOnly, deleteProduct);

module.exports = router;