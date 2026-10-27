const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper to sanitize text
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, '');
}

// POST /api/orders - Create an order
router.post('/', (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      city,
      state,
      pincode,
      paymentMethod,
      items
    } = req.body;

    // Validate inputs
    const cleanName = sanitize(name);
    const cleanEmail = sanitize(email).toLowerCase();
    const cleanPhone = sanitize(phone).replace(/\D/g, '');
    const cleanAddress = sanitize(address);
    const cleanCity = sanitize(city);
    const cleanState = sanitize(state);
    const cleanPincode = sanitize(pincode).replace(/\D/g, '');
    const cleanPayment = sanitize(paymentMethod) || 'cod';

    if (!cleanName || cleanName.length < 2) {
      return res.status(400).json({ success: false, error: 'Valid full name is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, error: 'Valid email address is required' });
    }

    if (!cleanPhone || cleanPhone.length < 10) {
      return res.status(400).json({ success: false, error: 'Valid 10-digit phone number is required' });
    }

    if (!cleanAddress || cleanAddress.length < 5) {
      return res.status(400).json({ success: false, error: 'Valid delivery address is required' });
    }

    if (!cleanCity || !cleanState) {
      return res.status(400).json({ success: false, error: 'City and State are required' });
    }

    if (!cleanPincode || cleanPincode.length !== 6) {
      return res.status(400).json({ success: false, error: 'Valid 6-digit PIN code is required' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Your bag is empty' });
    }

    // Check stock and calculate total amount safely from DB
    let totalAmount = 0;
    const validatedItems = [];

    const getProductStmt = db.prepare('SELECT * FROM products WHERE id = ?');

    for (const item of items) {
      const product = getProductStmt.get(item.productId);
      if (!product) {
        return res.status(400).json({ success: false, error: `Product not found for ID ${item.productId}` });
      }

      const sizeKey = `stock_${(item.size || '').toLowerCase()}`;
      const qty = parseInt(item.quantity, 10) || 1;

      if (!(sizeKey in product)) {
        return res.status(400).json({ success: false, error: `Invalid size ${item.size} for ${product.name}` });
      }

      if (product[sizeKey] < qty) {
        return res.status(400).json({
          success: false,
          error: `Insufficient stock for ${product.name} (Size: ${item.size}). Only ${product[sizeKey]} available.`
        });
      }

      const itemTotal = product.price * qty;
      totalAmount += itemTotal;

      validatedItems.push({
        productId: product.id,
        slug: product.slug,
        name: product.name,
        size: item.size,
        price: product.price,
        quantity: qty,
        tile_label: product.tile_label,
        image_url: product.image_url,
        itemTotal
      });
    }

    // Generate unique order number (e.g., BYD-2026-894123)
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const orderNumber = `BYD-2026-${randomSuffix}`;

    // Execute atomic transaction: decrement stock and insert order
    const insertOrderStmt = db.prepare(`
      INSERT INTO orders (
        order_number, customer_name, email, phone, address, city, state, pincode,
        payment_method, payment_status, total_amount, items_json, status
      ) VALUES (
        @order_number, @customer_name, @email, @phone, @address, @city, @state, @pincode,
        @payment_method, @payment_status, @total_amount, @items_json, @status
      )
    `);

    const updateStockStatements = {
      xs: db.prepare('UPDATE products SET stock_xs = stock_xs - ? WHERE id = ?'),
      s: db.prepare('UPDATE products SET stock_s = stock_s - ? WHERE id = ?'),
      m: db.prepare('UPDATE products SET stock_m = stock_m - ? WHERE id = ?'),
      l: db.prepare('UPDATE products SET stock_l = stock_l - ? WHERE id = ?'),
      xl: db.prepare('UPDATE products SET stock_xl = stock_xl - ? WHERE id = ?')
    };

    const processOrder = db.transaction(() => {
      // Decrement stock
      for (const item of validatedItems) {
        const sizeLower = item.size.toLowerCase();
        if (updateStockStatements[sizeLower]) {
          updateStockStatements[sizeLower].run(item.quantity, item.productId);
        }
      }

      // Insert order
      const result = insertOrderStmt.run({
        order_number: orderNumber,
        customer_name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        address: cleanAddress,
        city: cleanCity,
        state: cleanState,
        pincode: cleanPincode,
        payment_method: cleanPayment,
        payment_status: cleanPayment === 'cod' ? 'Pending (COD)' : 'Paid (Simulated)',
        total_amount: totalAmount,
        items_json: JSON.stringify(validatedItems),
        status: 'Confirmed'
      });

      return result;
    });

    processOrder();

    res.status(201).json({
      success: true,
      order: {
        order_number: orderNumber,
        customer_name: cleanName,
        email: cleanEmail,
        total_amount: totalAmount,
        payment_method: cleanPayment,
        items: validatedItems
      }
    });
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ success: false, error: 'Failed to place order. Please try again.' });
  }
});

// GET /api/orders/:orderNumber - Fetch order by order number
router.get('/:orderNumber', (req, res) => {
  try {
    const { orderNumber } = req.params;
    const stmt = db.prepare('SELECT * FROM orders WHERE order_number = ?');
    const order = stmt.get(orderNumber);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    order.items = JSON.parse(order.items_json);
    res.json({ success: true, order });
  } catch (err) {
    console.error('Error retrieving order:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve order' });
  }
});

module.exports = router;
