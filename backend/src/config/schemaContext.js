const SCHEMA_CONTEXT = {
  invoices: {
    collection: "Invoice",
    description: "Customer invoices, one line item per invoice",
    fields: {
      _id: "ObjectId",
      invoiceNumber: "String",
      date: "Date",
      category: "String",
      itemName: "String",
      amount: "Number",
      customerName: "String",
      status: "String enum: ['paid','pending','cancelled']",
      paymentMethod: "String enum: ['cash','card','bank_transfer','unknown']",
      tax: "Number",
      createdAt: "Date",
      updatedAt: "Date"
    },
    notes: "There is no separate Customer collection. A 'list of customers' or "
      + "'who are our customers' question means: distinct customerName values "
      + "from this collection. A question about one named customer means: find "
      + "invoices where customerName matches that name (case-insensitive, partial "
      + "match ok via $regex)."
  },
  products: {
    collection: "Product",
    description: "Product/inventory catalog",
    fields: {
      _id: "ObjectId",
      name: "String",
      category: "String",
      price: "Number",
      stock: "Number",
      createdAt: "Date"
    }
  }
};

// "distinct" added so "list of customers", "list of categories", "what payment
// methods do we use" etc. can be answered without inventing a fake collection.
const ALLOWED_OPERATIONS = ["find", "count", "aggregate", "distinct"];

// Only things we genuinely have no data model for at all.
const UNSUPPORTED_DOMAINS = ["suppliers", "finance", "expenses", "profit", "payable"];

module.exports = { SCHEMA_CONTEXT, ALLOWED_OPERATIONS, UNSUPPORTED_DOMAINS };