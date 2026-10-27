const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/products - list all products with optional filters and sorting
router.get('/', (req, res) => {
  try {
    const { category, sort, featured, limit } = req.query;

    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (category && category !== 'All') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (featured === 'true' || featured === '1') {
      query += ' AND featured = 1';
    }

    if (sort === 'price_asc') {
      query += ' ORDER BY price ASC';
    } else if (sort === 'price_desc') {
      query += ' ORDER BY price DESC';
    } else if (sort === 'newest') {
      query += ' ORDER BY id DESC';
    } else {
      query += ' ORDER BY featured DESC, id ASC';
    }

    if (limit && !isNaN(parseInt(limit, 10))) {
      query += ' LIMIT ?';
      params.push(parseInt(limit, 10));
    }

    const stmt = db.prepare(query);
    const products = stmt.all(...params);

    res.json({ success: true, count: products.length, products });
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve products' });
  }
});

// GET /api/products/hero - get items for hero carousel
router.get('/hero', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT slug, name, price, hero_image as image, hero_image_mobile as mobileImage, hero_alt as alt, hero_scale as scale
      FROM products
      WHERE show_in_hero = 1
      ORDER BY id ASC
    `);
    const items = stmt.all();
    res.json({ success: true, count: items.length, items });
  } catch (err) {
    console.error('Error fetching hero products:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve hero products' });
  }
});

// GET /api/products/:slug - get product details by slug
router.get('/:slug', (req, res) => {
  try {
    const { slug } = req.params;
    const stmt = db.prepare('SELECT * FROM products WHERE slug = ?');
    const product = stmt.get(slug);

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    res.json({ success: true, product });
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve product details' });
  }
});

module.exports = router;
