const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'store.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency and performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    price INTEGER NOT NULL,
    description TEXT NOT NULL,
    fabric_care TEXT NOT NULL,
    tile_label TEXT NOT NULL,
    image_url TEXT DEFAULT '',
    stock_xs INTEGER DEFAULT 0,
    stock_s INTEGER DEFAULT 0,
    stock_m INTEGER DEFAULT 0,
    stock_l INTEGER DEFAULT 0,
    stock_xl INTEGER DEFAULT 0,
    featured INTEGER DEFAULT 0,
    show_in_hero INTEGER DEFAULT 0,
    hero_image TEXT DEFAULT '',
    hero_image_mobile TEXT DEFAULT '',
    hero_alt TEXT DEFAULT '',
    hero_scale REAL DEFAULT 1.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pincode TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    payment_status TEXT DEFAULT 'pending',
    total_amount INTEGER NOT NULL,
    items_json TEXT NOT NULL,
    status TEXT DEFAULT 'Confirmed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Auto-migrate new hero columns if products table already exists
try {
  const columns = db.pragma('table_info(products)').map(c => c.name);
  if (!columns.includes('show_in_hero')) {
    db.exec('ALTER TABLE products ADD COLUMN show_in_hero INTEGER DEFAULT 0');
  }
  if (!columns.includes('hero_image')) {
    db.exec("ALTER TABLE products ADD COLUMN hero_image TEXT DEFAULT ''");
  }
  if (!columns.includes('hero_image_mobile')) {
    db.exec("ALTER TABLE products ADD COLUMN hero_image_mobile TEXT DEFAULT ''");
  }
  if (!columns.includes('hero_alt')) {
    db.exec("ALTER TABLE products ADD COLUMN hero_alt TEXT DEFAULT ''");
  }
  if (!columns.includes('hero_scale')) {
    db.exec('ALTER TABLE products ADD COLUMN hero_scale REAL DEFAULT 1.0');
  }
} catch (e) {
  console.warn('Migration note:', e.message);
}

module.exports = db;

