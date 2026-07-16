console.log('🚀 SERVER FILE VERSION: TEST123');
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const authRoutes = require('./src/routes/auth/auth.routes');
const cvRoutes = require('./src/routes/cv/cv.routes');
const aiRoutes = require('./src/routes/ai/ai.routes');
const applicationRoutes = require('./src/routes/application/application.routes');
const adminRoutes = require('./src/routes/admin/admin.routes');
const profileRoutes = require('./src/routes/profile/profile.routes');
const compareRoutes = require('./src/routes/compare/compare.routes');

console.log('✅ Auth Routes loaded successfully!');
console.log('✅ CV Routes loaded successfully!');
console.log('✅ AI Routes loaded successfully!');
console.log('✅ Application Routes loaded successfully!');
console.log('✅ Admin Routes loaded successfully!');
console.log('✅ Profile Routes loaded successfully!');
console.log('✅ Compare Routes loaded successfully!');

// ===== DEBUG: Check what each require() actually returns =====
console.log('auth type:', typeof authRoutes, authRoutes);
console.log('cv type:', typeof cvRoutes, cvRoutes);
console.log('ai type:', typeof aiRoutes, aiRoutes);
console.log('application type:', typeof applicationRoutes, applicationRoutes);
console.log('admin type:', typeof adminRoutes, adminRoutes);
console.log('profile type:', typeof profileRoutes, profileRoutes);
console.log('compare type:', typeof compareRoutes, compareRoutes);
// ============================================================

app.use('/api/auth', authRoutes);
app.use('/api/cv', cvRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/application', applicationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/compare', compareRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found'
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Something went wrong!'
  });
});

const PORT = 5000;

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Atlas connected successfully');

    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Server Error:', error);
  }
};

startServer();