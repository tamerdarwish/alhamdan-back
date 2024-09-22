// src/routes/adminRoutes.js

const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { supabase } = require('../supabaseClient');
const adminAuth = require('../middleware/adminAuth');

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();
    

  if (error || !data || data.password !== password) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  // Generate JWT token
  const token = jwt.sign({ id: data.id, role: 'authenticated' }, process.env.JWT_SECRET, { expiresIn: '1h' });

  res.json({ token });
});



module.exports = router;
