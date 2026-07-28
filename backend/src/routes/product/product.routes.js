// backend/src/routes/product/product.routes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const {
  getAllProducts,
  getCategories,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../../controllers/product/product.controller');

// /categories before /:id so it's never swallowed by the param matcher
router.get('/categories', authenticate, getCategories);

router.get('/', authenticate, getAllProducts);
router.post('/', authenticate, createProduct);

router.get('/:id', authenticate, getProductById);
router.put('/:id', authenticate, updateProduct);
router.delete('/:id', authenticate, deleteProduct);

module.exports = router;