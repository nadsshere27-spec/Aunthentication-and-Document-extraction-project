// backend/src/controllers/product/product.controller.js
//
// Full CRUD for the "Products" sidebar tab.

const Product = require('../../models/Product');
const { getNextSequence } = require('../../services/chatbot/sequenceService');

// ============================================
// GET /api/products
// Supports optional ?category= and ?search= filters
// ============================================
const getAllProducts = async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const products = await Product.find(filter).sort({ displayId: 1 }).lean();

    res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ success: false, message: 'Failed to load products' });
  }
};

// ============================================
// GET /api/products/categories
// Distinct category list, used for the filter dropdown / form select
// ============================================
const getCategories = async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    res.status(200).json({ success: true, categories: categories.sort() });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, message: 'Failed to load categories' });
  }
};

// ============================================
// GET /api/products/:id
// ============================================
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.status(200).json({ success: true, product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ success: false, message: 'Failed to load product' });
  }
};

// ============================================
// POST /api/products
// ============================================
const createProduct = async (req, res) => {
  try {
    const { name, category, price, stock } = req.body;

    if (!name || !category || price === undefined || price === '') {
      return res.status(400).json({
        success: false,
        message: 'Name, category and price are required'
      });
    }

    const numericPrice = Number(price);
    const numericStock = stock === undefined || stock === '' ? 0 : Number(stock);

    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ success: false, message: 'Price must be a valid positive number' });
    }
    if (Number.isNaN(numericStock) || numericStock < 0) {
      return res.status(400).json({ success: false, message: 'Stock must be a valid non-negative number' });
    }

    const displayId = await getNextSequence('products');

    const product = await Product.create({
      displayId,
      name: name.trim(),
      category: category.trim(),
      price: numericPrice,
      stock: numericStock
    });

    res.status(201).json({ success: true, message: 'Product created', product });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ success: false, message: 'Failed to create product' });
  }
};

// ============================================
// PUT /api/products/:id
// ============================================
const updateProduct = async (req, res) => {
  try {
    const { name, category, price, stock } = req.body;
    const update = {};

    if (name !== undefined) update.name = name.trim();
    if (category !== undefined) update.category = category.trim();

    if (price !== undefined) {
      const numericPrice = Number(price);
      if (Number.isNaN(numericPrice) || numericPrice < 0) {
        return res.status(400).json({ success: false, message: 'Price must be a valid positive number' });
      }
      update.price = numericPrice;
    }

    if (stock !== undefined) {
      const numericStock = Number(stock);
      if (Number.isNaN(numericStock) || numericStock < 0) {
        return res.status(400).json({ success: false, message: 'Stock must be a valid non-negative number' });
      }
      update.stock = numericStock;
    }

    const product = await Product.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.status(200).json({ success: true, message: 'Product updated', product });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ success: false, message: 'Failed to update product' });
  }
};

// ============================================
// DELETE /api/products/:id
// ============================================
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.status(200).json({ success: true, message: 'Product deleted' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
};

module.exports = {
  getAllProducts,
  getCategories,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};