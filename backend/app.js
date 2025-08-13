const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { handleUploadError } = require('./src/middlewares/fileUpload');

const app = express();

// Security middleware
app.use(helmet()); 
app.use(cors({ origin: '*' }));
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }); 
app.use(limiter);

// Placeholder for routes
app.get('/', (req, res) => res.json({ message: 'LinkUp API' }));
// Routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/posts', require('./src/routes/postRoutes'));
app.use('/api/comments', require('./src/routes/commentRoutes'));
app.use('/api/chat', require('./src/routes/chatRoutes'));
app.use('/api/notifications', require('./src/routes/notificationRoutes'));
app.use('/api/search', require('./src/routes/searchRoutes'));
app.use('/api/profile', require('./src/routes/profileRoutes'));
app.use('/api/admin', require('./src/routes/adminRoutes'));


// File upload error handler
app.use(handleUploadError);

// Global error handler (expanded later)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong' });
});

module.exports = app;