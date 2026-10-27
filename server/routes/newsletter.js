const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/newsletter - subscribe to newsletter
router.post('/', (req, res) => {
  try {
    const { email } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address' });
    }

    // Check if already subscribed
    const checkStmt = db.prepare('SELECT id FROM subscribers WHERE email = ?');
    const existing = checkStmt.get(cleanEmail);

    if (existing) {
      return res.json({ success: true, message: 'You are already on the list for our small-batch releases.' });
    }

    const insertStmt = db.prepare('INSERT INTO subscribers (email) VALUES (?)');
    insertStmt.run(cleanEmail);

    res.status(201).json({
      success: true,
      message: 'You’re on the list. We’ll notify you when new batches drop.'
    });
  } catch (err) {
    console.error('Error saving subscriber:', err);
    res.status(500).json({ success: false, error: 'Could not subscribe. Please try again later.' });
  }
});

module.exports = router;
