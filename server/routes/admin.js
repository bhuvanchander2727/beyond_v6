const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db');

// Ensure uploads folder exists in public/uploads
const uploadsDir = path.join(__dirname, '..', '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `product-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|avif/;
    const extname = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowed.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files (jpg, jpeg, png, webp, avif) are allowed'));
  }
});

// Helper for tokens
const SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'beyond_secure_secret_2026';
function generateToken() {
  const timestamp = Date.now();
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(`admin-${timestamp}`).digest('hex');
  return Buffer.from(`${timestamp}:${signature}`).toString('base64');
}

function verifyToken(token) {
  try {
    if (!token) return false;
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [timestamp, signature] = decoded.split(':');
    if (!timestamp || !signature) return false;

    // Check expiry (24 hours)
    const age = Date.now() - parseInt(timestamp, 10);
    if (isNaN(age) || age > 24 * 60 * 60 * 1000) return false;

    const expectedSignature = crypto.createHmac('sha256', SECRET_KEY).update(`admin-${timestamp}`).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch (e) {
    return false;
  }
}

// Auth middleware
function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.headers['x-admin-token'];

  if (!verifyToken(token)) {
    return res.status(401).json({ success: false, error: 'Unauthorized access. Please log in as admin.' });
  }
  next();
}

// Helper slug generator
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

// POST /api/admin/login
router.post('/login', (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || 'beyond2026';

  if (!password || password !== adminPassword) {
    return res.status(401).json({ success: false, error: 'Invalid admin password' });
  }

  const token = generateToken();
  res.json({ success: true, token, message: 'Authentication successful' });
});

// GET /api/admin/verify
router.get('/verify', requireAdminAuth, (req, res) => {
  res.json({ success: true, message: 'Token is valid' });
});

// GET /api/admin/orders
router.get('/orders', requireAdminAuth, (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM orders ORDER BY id DESC');
    const orders = stmt.all();
    for (const o of orders) {
      try {
        o.items = JSON.parse(o.items_json);
      } catch (e) {
        o.items = [];
      }
    }
    res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    console.error('Error fetching admin orders:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve orders' });
  }
});

// PATCH /api/admin/orders/:id/status
router.patch('/orders/:id/status', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }

    const stmt = db.prepare('UPDATE orders SET status = ? WHERE id = ?');
    const result = stmt.run(status, id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    res.json({ success: true, message: 'Order status updated successfully' });
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ success: false, error: 'Failed to update order status' });
  }
});

// POST /api/admin/upload - upload product photo
router.post('/upload', requireAdminAuth, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file uploaded' });
    }
    const relativeUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, url: relativeUrl });
  } catch (err) {
    console.error('Error uploading file:', err);
    res.status(500).json({ success: false, error: err.message || 'File upload failed' });
  }
});

// POST /api/admin/products - add product
router.post('/products', requireAdminAuth, (req, res) => {
  try {
    const {
      name,
      slug: customSlug,
      category,
      price,
      description,
      fabric_care,
      tile_label,
      image_url,
      stock_xs,
      stock_s,
      stock_m,
      stock_l,
      stock_xl,
      featured,
      show_in_hero,
      hero_image,
      hero_image_mobile,
      hero_alt,
      hero_scale
    } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({ success: false, error: 'Name, Category, and Price are required' });
    }

    const slug = slugify(customSlug || name);
    // Ensure slug uniqueness
    const checkSlugStmt = db.prepare('SELECT id FROM products WHERE slug = ?');
    if (checkSlugStmt.get(slug)) {
      return res.status(400).json({ success: false, error: `Product slug "${slug}" already exists` });
    }

    const insertStmt = db.prepare(`
      INSERT INTO products (
        name, slug, category, price, description, fabric_care, tile_label,
        image_url, stock_xs, stock_s, stock_m, stock_l, stock_xl, featured,
        show_in_hero, hero_image, hero_image_mobile, hero_alt, hero_scale
      ) VALUES (
        @name, @slug, @category, @price, @description, @fabric_care, @tile_label,
        @image_url, @stock_xs, @stock_s, @stock_m, @stock_l, @stock_xl, @featured,
        @show_in_hero, @hero_image, @hero_image_mobile, @hero_alt, @hero_scale
      )
    `);

    const result = insertStmt.run({
      name: name.trim(),
      slug,
      category: category.trim(),
      price: parseInt(price, 10),
      description: (description || '').trim(),
      fabric_care: (fabric_care || '').trim(),
      tile_label: (tile_label || name).trim(),
      image_url: (image_url || '').trim(),
      stock_xs: parseInt(stock_xs, 10) || 0,
      stock_s: parseInt(stock_s, 10) || 0,
      stock_m: parseInt(stock_m, 10) || 0,
      stock_l: parseInt(stock_l, 10) || 0,
      stock_xl: parseInt(stock_xl, 10) || 0,
      featured: featured ? 1 : 0,
      show_in_hero: show_in_hero ? 1 : 0,
      hero_image: (hero_image || '').trim(),
      hero_image_mobile: (hero_image_mobile || '').trim(),
      hero_alt: (hero_alt || name).trim(),
      hero_scale: !isNaN(parseFloat(hero_scale)) ? parseFloat(hero_scale) : 1.0
    });

    res.status(201).json({ success: true, productId: result.lastInsertRowid, slug });
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ success: false, error: 'Failed to create product' });
  }
});

// PUT /api/admin/products/:id - edit product
router.put('/products/:id', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      slug: customSlug,
      category,
      price,
      description,
      fabric_care,
      tile_label,
      image_url,
      stock_xs,
      stock_s,
      stock_m,
      stock_l,
      stock_xl,
      featured,
      show_in_hero,
      hero_image,
      hero_image_mobile,
      hero_alt,
      hero_scale
    } = req.body;

    const checkProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!checkProduct) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const slug = slugify(customSlug || name || checkProduct.name);
    // Check slug collision
    const checkSlugStmt = db.prepare('SELECT id FROM products WHERE slug = ? AND id != ?');
    if (checkSlugStmt.get(slug, id)) {
      return res.status(400).json({ success: false, error: `Slug "${slug}" already in use by another product` });
    }

    const updateStmt = db.prepare(`
      UPDATE products SET
        name = @name,
        slug = @slug,
        category = @category,
        price = @price,
        description = @description,
        fabric_care = @fabric_care,
        tile_label = @tile_label,
        image_url = @image_url,
        stock_xs = @stock_xs,
        stock_s = @stock_s,
        stock_m = @stock_m,
        stock_l = @stock_l,
        stock_xl = @stock_xl,
        featured = @featured,
        show_in_hero = @show_in_hero,
        hero_image = @hero_image,
        hero_image_mobile = @hero_image_mobile,
        hero_alt = @hero_alt,
        hero_scale = @hero_scale
      WHERE id = @id
    `);

    updateStmt.run({
      id,
      name: (name || checkProduct.name).trim(),
      slug,
      category: (category || checkProduct.category).trim(),
      price: price !== undefined ? parseInt(price, 10) : checkProduct.price,
      description: description !== undefined ? description.trim() : checkProduct.description,
      fabric_care: fabric_care !== undefined ? fabric_care.trim() : checkProduct.fabric_care,
      tile_label: tile_label !== undefined ? tile_label.trim() : checkProduct.tile_label,
      image_url: image_url !== undefined ? image_url.trim() : checkProduct.image_url,
      stock_xs: stock_xs !== undefined ? parseInt(stock_xs, 10) : checkProduct.stock_xs,
      stock_s: stock_s !== undefined ? parseInt(stock_s, 10) : checkProduct.stock_s,
      stock_m: stock_m !== undefined ? parseInt(stock_m, 10) : checkProduct.stock_m,
      stock_l: stock_l !== undefined ? parseInt(stock_l, 10) : checkProduct.stock_l,
      stock_xl: stock_xl !== undefined ? parseInt(stock_xl, 10) : checkProduct.stock_xl,
      featured: featured !== undefined ? (featured ? 1 : 0) : checkProduct.featured,
      show_in_hero: show_in_hero !== undefined ? (show_in_hero ? 1 : 0) : (checkProduct.show_in_hero || 0),
      hero_image: hero_image !== undefined ? hero_image.trim() : (checkProduct.hero_image || ''),
      hero_image_mobile: hero_image_mobile !== undefined ? hero_image_mobile.trim() : (checkProduct.hero_image_mobile || ''),
      hero_alt: hero_alt !== undefined ? hero_alt.trim() : (checkProduct.hero_alt || checkProduct.name),
      hero_scale: hero_scale !== undefined && !isNaN(parseFloat(hero_scale)) ? parseFloat(hero_scale) : (checkProduct.hero_scale || 1.0)
    });

    res.json({ success: true, message: 'Product updated successfully' });
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ success: false, error: 'Failed to update product' });
  }
});

// DELETE /api/admin/products/:id - delete product
router.delete('/products/:id', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM products WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ success: false, error: 'Failed to delete product' });
  }
});

// GET /api/admin/subscribers
router.get('/subscribers', requireAdminAuth, (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM subscribers ORDER BY id DESC');
    const subscribers = stmt.all();
    res.json({ success: true, count: subscribers.length, subscribers });
  } catch (err) {
    console.error('Error fetching subscribers:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve subscribers' });
  }
});

module.exports = router;
