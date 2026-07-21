require('dotenv').config();
const mongoose = require('mongoose');
const Invoice = require('../src/models/Invoice');

const CATEGORIES = ['Mobile', 'Electronics', 'Groceries', 'Clothing', 'Furniture', 'Stationery'];
const ITEMS = {
  Mobile: ['iPhone 15', 'Samsung Galaxy S24', 'Phone Case', 'Charger', 'Earbuds'],
  Electronics: ['Laptop', 'Monitor', 'Keyboard', 'Mouse', 'Webcam'],
  Groceries: ['Rice 5kg', 'Cooking Oil', 'Milk Pack', 'Sugar 1kg', 'Tea Box'],
  Clothing: ['T-Shirt', 'Jeans', 'Jacket', 'Shoes', 'Cap'],
  Furniture: ['Office Chair', 'Study Table', 'Bookshelf', 'Sofa', 'Bed Frame'],
  Stationery: ['Notebook', 'Pen Set', 'Printer Paper', 'Stapler', 'Marker Pack']
};
const CUSTOMERS = ['Ali Raza', 'Sara Khan', 'Ahmed Malik', 'Fatima Noor', 'Bilal Sheikh', 'Hina Aslam', 'Usman Tariq', 'Zara Iqbal'];

const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomAmount = () => Math.floor(Math.random() * 45000) + 500;

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    await Invoice.deleteMany({});
    console.log('🗑️  Cleared old invoices');

    const invoices = [];
    const today = new Date();

    for (let i = 1; i <= 150; i++) {
      const category = randomFrom(CATEGORIES);
      const daysAgo = Math.floor(Math.random() * 30); // spread over last 30 days
      const date = new Date(today);
      date.setDate(date.getDate() - daysAgo);
      date.setHours(Math.floor(Math.random() * 12) + 9, Math.floor(Math.random() * 60));

      invoices.push({
        invoiceNumber: `INV-${1000 + i}`,
        date,
        category,
        itemName: randomFrom(ITEMS[category]),
        amount: randomAmount(),
        customerName: randomFrom(CUSTOMERS),
        status: Math.random() > 0.15 ? 'paid' : 'pending'
      });
    }

    // Guarantee a decent number of "today" invoices for testing
    for (let i = 0; i < 13; i++) {
      const category = randomFrom(CATEGORIES);
      invoices.push({
        invoiceNumber: `INV-TODAY-${i + 1}`,
        date: new Date(),
        category,
        itemName: randomFrom(ITEMS[category]),
        amount: randomAmount(),
        customerName: randomFrom(CUSTOMERS),
        status: 'paid'
      });
    }

    await Invoice.insertMany(invoices);
    console.log(`✅ Seeded ${invoices.length} dummy invoices`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seed();