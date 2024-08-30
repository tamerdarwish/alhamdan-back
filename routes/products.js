const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');


const storage = multer.memoryStorage();
const upload = multer({
  storage
});

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

const uploadImage = async (file) => {
    if (!file) return null;
  
    const fileName = `${uuidv4()}_${file.originalname}`;
    const { data, error } = await supabase.storage
      .from('product-images') // تأكد من أن هذا هو اسم الباكيت الصحيح
      .upload(fileName, file.buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.mimetype,
      });
  
    if (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image');
    }
  
    // Return the path or URL of the uploaded image
    return `https://ktrisstkzwmwgxncinfo.supabase.co/storage/v1/object/public/product-images/${fileName}`;
  };
  
// Add a new product
router.post('/', upload.single('image'), async (req, res) => {
    const { name, description, price } = req.body;
    const imageFile = req.file;
  
    try {
      // Check if file is provided
      if (!imageFile) {
        return res.status(400).json({ error: 'No image file provided' });
      }
  
      // Upload image to storage
      const imageUrl = await uploadImage(imageFile);
  
      // Insert product into database
      const { data, error } = await supabase.from('products').insert([{ 
        name, 
        description, 
        price, 
        image_url: imageUrl // تأكد من أن هذا هو الرابط الصحيح
      }]);
  
      if (error) return res.status(500).json(error);
      res.json(data);
    } catch (err) {
      console.error('Error adding product:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
// Update an existing product
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, price, image_url } = req.body;
  const { data, error } = await supabase.from('products').update({ name, description, price, image_url }).eq('id', id);
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
