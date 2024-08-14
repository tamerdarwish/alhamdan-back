// src/routes/adminRoutes.js

const express = require('express');
const router = express.Router();

// Mock admin credentials (replace with actual authentication logic)
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

// Handle admin login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  console.log('Received login attempt:', { email, password }); // Add debug log

  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

module.exports = router;
