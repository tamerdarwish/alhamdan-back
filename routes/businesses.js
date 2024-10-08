const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');

// Get all businesses with optional category filter
router.get('/', async (req, res) => {
    const { category } = req.query; // استخراج الفئة من الاستعلام إذا كانت موجودة
  
    let query = supabase.from('businesses').select('*');
  
    // إذا كانت الفئة موجودة، نقوم بإضافة فلتر للفئة
    if (category) {
      query = query.eq('category', category);
    }
  
    const { data, error } = await query;
    
    if (error) return res.status(500).json(error);
    res.json(data);
  });
  

// Get all categories
router.get('/categories', async (req, res) => {
    const { data, error } = await supabase.from('categories').select('*');
    if (error) return res.status(500).json(error);
    res.json(data);
  });


// Create a new business
router.post('/', async (req, res) => {
  const { title, address, phone,description,website,category } = req.body;
  const { data, error } = await supabase.from('businesses').insert([{ title, address, phone,description,website ,category}]);
  if (error) return res.status(500).json(error);
  res.json(data);
});

// Update a business
router.put('/:id', async (req, res) => {
    const { id } = req.params; // الحصول على معرف المحل من الرابط
    const { title, address, phone, description, website, category } = req.body; // استخرج القيم من req.body
  
    // استخدم id المحل لتحديثه
    const { data, error } = await supabase
      .from('businesses')
      .update({ title, address, phone, description, website, category }) // استخدم القيم المستخرجة
      .eq('id', id); // تحقق من id المحل
  
    if (error) return res.status(500).json(error); // إذا كان هناك خطأ، أرجع خطأ
    res.json(data); // أرجع البيانات المحدثة
  });
  

// Delete a business
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('businesses').delete().eq('id', id);
  if (error) return res.status(500).json(error);
  res.json({ message: 'business deleted' });
});

module.exports = router;
