const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');

// Get all products
/*router.get('/', async (req, res) => {
    
  const { data, error } = await supabase.from('products').select('*');
  if (error) return res.status(500).json(error);

  res.json(data);
});*/

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

// Get all products with pagination and search
router.get('/', async (req, res) => {
    try {
      const { page = 1, limit = 16, search = '' } = req.query;
      const offset = (page - 1) * limit;
      const limitNum = parseInt(limit, 10); // التأكد من أن limit هو عدد صحيح
  
      // استعلام للحصول على العناصر
      const { data: products, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .ilike('name', `%${search}%`)
        .range(offset, offset + limitNum - 1);
  
      // استعلام للحصول على عدد العناصر الكلي
      const { count, error: countError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .ilike('name', `%${search}%`);
  
      if (fetchError || countError) {
        console.error('Supabase query error:', fetchError || countError);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
  
      res.json({ products, total: count });
    } catch (err) {
      console.error('Unexpected error:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  

module.exports = router;
