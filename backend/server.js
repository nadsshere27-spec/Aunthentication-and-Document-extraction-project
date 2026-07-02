console.log('🚀 SERVER FILE VERSION: TEST123');
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const portfinder = require('portfinder');

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const authRoutes = require('./src/routes/auth/auth.routes');
const cvRoutes = require('./src/routes/cv/cv.routes');
const aiRoutes = require('./src/routes/ai/ai.routes');
const applicationRoutes = require('./src/routes/application/application.routes');

console.log('✅ Auth Routes loaded successfully!');
console.log('✅ CV Routes loaded successfully!');
console.log('✅ AI Routes loaded successfully!');
console.log('✅ Application Routes loaded successfully!');

app.use('/api/auth', authRoutes);
app.use('/api/cv', cvRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/application', applicationRoutes);

// Health Route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Direct Test Route
app.get('/test-direct', (req, res) => {
  console.log('🎯 DIRECT TEST HIT!');
  res.json({ ok: true, message: 'Direct test works!' });
});

// 404
app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found'
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Something went wrong!'
  });
});

// ============================================
// AUTO-DETECT AVAILABLE PORT
// ============================================
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB Atlas connected successfully");

    const PORT = await portfinder.getPortPromise({
      port: 5000,
      stopPort: 5010
    });

    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
      console.log(`✅ IMPORTANT: Update frontend api.js with port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Server Error:', error);
  }
};

startServer();