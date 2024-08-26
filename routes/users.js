const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');

// Get all users
router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('users').select('*');
  if (error) return res.status(500).json(error);
  res.json(data);
});

// Get a single user by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
  if (error) return res.status(500).json(error);
  res.json(data);
});

// Create a new user
router.post('/', async (req, res) => {
  const { username, password, role } = req.body;
  const { data, error } = await supabase.from('users').insert([{ username, password, role }]);
  if (error) return res.status(500).json(error);
  res.json(data);
});

// Update a user
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { username, password, role } = req.body;
  const { data, error } = await supabase.from('users').update({ username, password, role }).eq('user_id', id);
  if (error) return res.status(500).json(error);
  res.json(data);
});

// Delete a user
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) return res.status(500).json(error);
  res.json({ message: 'User deleted' });
});

module.exports = router;
