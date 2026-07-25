const SCHEMA_CONTEXT = {
  invoices: {
    collection: "Invoice",
    description: "Customer invoices, one line item per invoice — this is a record "
      + "of a SALE, not the product catalog itself.",
    fields: {
      _id: "ObjectId",
      displayId: "Number — the human-friendly sequential ID, e.g. invoice #25",
      invoiceNumber: "String",
      date: "Date",
      category: "String",
      itemName: "String — what was sold in this transaction",
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
    description: "The actual product catalog / inventory. THIS is where product "
      + "names, prices, and stock levels live — not on invoices.",
    fields: {
      _id: "ObjectId",
      displayId: "Number — the human-friendly sequential ID, e.g. product #25",
      name: "String — the product's name",
      category: "String",
      price: "Number — the product's price",
      stock: "Number — units currently in stock",
      createdAt: "Date"
    },
    notes: "ANY question about 'a product', 'the price of X', 'list of products', "
      + "'products in category Y', 'stock of X', 'what products do we sell', "
      + "'name a product', etc. -> ALWAYS query the products collection, filtering "
      + "on the products.name field with a case-insensitive $regex when a specific "
      + "product is named. NEVER answer product-catalog questions from invoices, "
      + "even though invoices also has an itemName/category field — those describe "
      + "a past sale, not the current catalog."
  }
};

// "distinct" added so "list of customers", "list of categories", "what payment
// methods do we use" etc. can be answered without inventing a fake collection.
const ALLOWED_OPERATIONS = ["find", "count", "aggregate", "distinct"];

// Only things we genuinely have no data model for at all.
const UNSUPPORTED_DOMAINS = ["suppliers", "finance", "expenses", "profit", "payable"];

// ---------- Write (create/update/delete) config ----------
// Kept separate from the read config above on purpose: read questions never
// touch this, so nothing about the existing read-only behavior changes.

const ALLOWED_WRITE_OPERATIONS = ["create", "update", "delete"];

// Fields that MUST be provided (by the user, across however many messages it
// takes) before a create can actually happen.
const REQUIRED_FIELDS = {
  products: ["name", "price"],
  invoices: ["customerName", "itemName", "amount"],
};

// Fields auto-filled on create if the user didn't specify them. Values that
// are functions get called at creation time (e.g. "now").
const DEFAULT_VALUES = {
  products: { category: "Uncategorized", stock: 0 },
  invoices: {
    category: "Uncategorized",
    status: "pending",
    paymentMethod: "unknown",
    tax: 0,
    date: () => new Date(),
  },
};

// Fields the AI is never allowed to set directly, even if it tries — these
// are either system-managed (displayId, timestamps) or the Mongo internal id.
const NON_WRITABLE_FIELDS = ["_id", "displayId", "createdAt", "updatedAt"];

module.exports = {
  SCHEMA_CONTEXT,
  ALLOWED_OPERATIONS,
  UNSUPPORTED_DOMAINS,
  ALLOWED_WRITE_OPERATIONS,
  REQUIRED_FIELDS,
  DEFAULT_VALUES,
  NON_WRITABLE_FIELDS,
};