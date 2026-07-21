require('dotenv').config();
const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Product = require('../models/Product');

const CATEGORIES = ['Mobile', 'Electronics', 'Groceries', 'Clothing', 'Furniture', 'Stationery'];
const CUSTOMERS = ['Ali Raza', 'Sara Khan', 'Bilal Ahmed', 'Ayesha Malik', 'Usman Tariq', 'Hina Farooq', 'Zain Abbas', 'Mahnoor Iqbal'];
const PAYMENT_METHODS = ['cash', 'card', 'bank_transfer'];
const STATUSES = ['paid', 'paid', 'paid', 'pending', 'cancelled']; // weighted toward paid

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDateWithinLastNDays(n) {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * n);
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  date.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60), 0, 0);
  return date;
}

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  await Invoice.deleteMany({});
  await Product.deleteMany({});
  console.log('🗑️  Cleared old Invoice/Product data');

  // ---- Products ----
  const productNames = {
    Mobile: ['iPhone 14', 'Samsung Galaxy S23', 'Redmi Note 12', 'Pixel 7'],
    Electronics: ['Laptop Charger', 'Bluetooth Speaker', 'Wireless Mouse', 'HDMI Cable'],
    Groceries: ['Rice 5kg', 'Cooking Oil 1L', 'Sugar 1kg', 'Tea Pack'],
    Clothing: ['Men Shirt', 'Women Kurta', 'Kids Jacket', 'Jeans'],
    Furniture: ['Office Chair', 'Wooden Table', 'Bookshelf', 'Sofa Set'],
    Stationery: ['Notebook Pack', 'Pen Set', 'Stapler', 'A4 Paper Ream']
  };

  const products = [];
  for (const category of CATEGORIES) {
    for (const name of productNames[category]) {
      products.push({
        name,
        category,
        price: Math.floor(Math.random() * 50000) + 500,
        stock: Math.floor(Math.random() * 100)
      });
    }
  }
  await Product.insertMany(products);
  console.log(`✅ Seeded ${products.length} products`);

  // ---- Invoices ----
  const invoices = [];
  const todayCount = 15; // guarantees "today" questions have real data

  // Spread across last 60 days
  for (let i = 0; i < 150; i++) {
    const category = randomFrom(CATEGORIES);
    const amount = Math.floor(Math.random() * 20000) + 500;
    invoices.push({
      invoiceNumber: `INV-${1000 + i}`,
      date: randomDateWithinLastNDays(60),
      category,
      itemName: randomFrom(productNames[category]),
      amount,
      customerName: randomFrom(CUSTOMERS),
      status: randomFrom(STATUSES),
      paymentMethod: randomFrom(PAYMENT_METHODS),
      tax: Math.round(amount * 0.05)
    });
  }

  // Guarantee some invoices dated exactly today
  for (let i = 0; i < todayCount; i++) {
    const category = randomFrom(CATEGORIES);
    const amount = Math.floor(Math.random() * 20000) + 500;
    const today = new Date();
    today.setHours(Math.floor(Math.random() * 10) + 9, Math.floor(Math.random() * 60), 0, 0);
    invoices.push({
      invoiceNumber: `INV-TODAY-${i}`,
      date: today,
      category,
      itemName: randomFrom(productNames[category]),
      amount,
      customerName: randomFrom(CUSTOMERS),
      status: randomFrom(STATUSES),
      paymentMethod: randomFrom(PAYMENT_METHODS),
      tax: Math.round(amount * 0.05)
    });
  }

  await Invoice.insertMany(invoices);
  console.log(`✅ Seeded ${invoices.length} invoices (${todayCount} dated today)`);

  console.log('🎉 Seeding complete');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});