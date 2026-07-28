// backend/src/routes/invoice/invoice.routes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const {
  getAllInvoices,
  getInvoiceById,
  getAllCustomers,
  getCustomerInvoices
} = require('../../controllers/invoice/invoice.controller');

console.log('✅ invoice.routes.js is being loaded!');

// NOTE: /customers routes are registered before /:id so "customers" is
// never swallowed by the :id param matcher.
router.get('/customers', authenticate, getAllCustomers);
router.get('/customers/:name', authenticate, getCustomerInvoices);

router.get('/', authenticate, getAllInvoices);
router.get('/:id', authenticate, getInvoiceById);

module.exports = router;