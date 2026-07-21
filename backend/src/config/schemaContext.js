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
    }
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

const ALLOWED_OPERATIONS = ["find", "count", "aggregate"];
const UNSUPPORTED_DOMAINS = ["suppliers", "finance", "expenses", "profit", "payable", "customers as separate entity"];

module.exports = { SCHEMA_CONTEXT, ALLOWED_OPERATIONS, UNSUPPORTED_DOMAINS };