require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./db');
const seed = require('./seed');

const app = express();
const PORT = process.env.PORT || 3000;

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets from /public
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// API Routes
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/newsletter', require('./routes/newsletter'));
app.use('/api/admin', require('./routes/admin'));

// HTML Page Routes (Clean URLs)
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.get('/shop', (req, res) => {
  res.sendFile(path.join(publicDir, 'shop.html'));
});

app.get('/product/:slug', (req, res) => {
  res.sendFile(path.join(publicDir, 'product.html'));
});

app.get('/bag', (req, res) => {
  res.sendFile(path.join(publicDir, 'bag.html'));
});

app.get('/checkout', (req, res) => {
  res.sendFile(path.join(publicDir, 'checkout.html'));
});

app.get('/confirmation', (req, res) => {
  res.sendFile(path.join(publicDir, 'confirmation.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(publicDir, 'about.html'));
});

app.get('/returns', (req, res) => {
  res.sendFile(path.join(publicDir, 'returns.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(publicDir, 'admin.html'));
});

// Fallback 404 handler for unmatched pages
app.use((req, res) => {
  if (req.accepts('html')) {
    res.status(404).sendFile(path.join(publicDir, 'index.html'));
  } else {
    res.status(404).json({ success: false, error: 'Resource not found' });
  }
});

// Auto-seed if products table is empty
try {
  const count = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  if (count === 0) {
    console.log('No products found in database. Auto-seeding initial products...');
    seed();
  }
} catch (e) {
  console.error('Error checking product count:', e);
}

// Start server
app.listen(PORT, () => {
  console.log(`Beyond clothing store running at http://localhost:${PORT}`);
});
