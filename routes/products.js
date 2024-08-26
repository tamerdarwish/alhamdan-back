const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');

// Get all products
router.get('/', async (req, res) => {
    
  const { data, error } = await supabase.from('products').select('*');
  if (error) return res.status(500).json(error);

  res.json(data);
});

// Get a single product by ID
router.get('/:id', async (req, res) => {
    
  const { id } = req.params;
  console.log(id);

  const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
  if (error) return res.status(500).json(error);
  console.log(data);

  res.json(data);
});

// Add a new product
router.post('/', async (req, res) => {
  const { name, description, price, stock, category_id } = req.body;
  const { data, error } = await supabase.from('products').insert([{ name, description, price, stock, category_id }]);
  if (error) return res.status(500).json(error);
  res.json(data);
});

// Update an existing product
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, price, stock, category_id } = req.body;
  const { data, error } = await supabase.from('products').update({ name, description, price, stock, category_id }).eq('id', id);
  if (error) return res.status(500).json(error);
  res.json(data);
});

// Delete a product
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return res.status(500).json(error);
  res.json({ message: 'Product deleted' });
});

module.exports = router;
