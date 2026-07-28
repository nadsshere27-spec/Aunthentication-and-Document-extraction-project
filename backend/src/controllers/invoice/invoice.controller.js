// backend/src/controllers/invoice/invoice.controller.js
//
// Powers the "Invoices" and "Customers" sidebar tabs.
// There's no separate Customer collection in this app — a customer is just
// whoever is named on an invoice — so the customer list/table is DERIVED
// from Invoice data via aggregation instead of duplicating that data into
// a new model.

const Invoice = require('../../models/Invoice');

// ============================================
// GET /api/invoices
// Plain table of invoices, newest first.
// ============================================
const getAllInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({})
      .sort({ date: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: invoices.length,
      invoices
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load invoices'
    });
  }
};

// ============================================
// GET /api/invoices/:id
// ============================================
const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).lean();

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    res.status(200).json({ success: true, invoice });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load invoice'
    });
  }
};

// ============================================
// GET /api/invoices/customers
// One row per customer, aggregated from their invoices:
// total spent, number of invoices, status breakdown, last invoice date.
// ============================================
const getAllCustomers = async (req, res) => {
  try {
    const customers = await Invoice.aggregate([
      {
        $group: {
          _id: '$customerName',
          totalInvoices: { $sum: 1 },
          totalSpent: { $sum: '$amount' },
          lastInvoiceDate: { $max: '$date' },
          paidCount: {
            $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] }
          },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          cancelledCount: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 0,
          customerName: '$_id',
          totalInvoices: 1,
          totalSpent: 1,
          lastInvoiceDate: 1,
          paidCount: 1,
          pendingCount: 1,
          cancelledCount: 1
        }
      },
      { $sort: { totalSpent: -1 } }
    ]);

    res.status(200).json({
      success: true,
      count: customers.length,
      customers
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load customers'
    });
  }
};

// ============================================
// GET /api/invoices/customers/:name
// All invoices belonging to one customer (drill-down from the Customers tab)
// ============================================
const getCustomerInvoices = async (req, res) => {
  try {
    const { name } = req.params;
    const invoices = await Invoice.find({ customerName: name })
      .sort({ date: -1 })
      .lean();

    res.status(200).json({
      success: true,
      customerName: name,
      count: invoices.length,
      invoices
    });
  } catch (error) {
    console.error('Get customer invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load customer invoices'
    });
  }
};

module.exports = {
  getAllInvoices,
  getInvoiceById,
  getAllCustomers,
  getCustomerInvoices
};