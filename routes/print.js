// src/routes/photoRoutes.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');
const multer = require('multer');
const upload = multer();
const { Pool } = require('pg');
const pool = new Pool(); // إعداد اتصال بقاعدة البيانات

// نقطة نهاية لرفع الصور
router.post('/upload', upload.array('photos'), async (req, res) => {
  const { customer_name, customer_email, sizes, copies,delivery_method,address,phone_number } = req.body; // جلب بيانات الحجم والنسخ
  const photos = req.files;
  const photoObjects = [];
console.log( req.body);

  try {
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const size = sizes[i]; // الحصول على الحجم المقابل للصورة
      const copiesCount = copies[i]; // الحصول على عدد النسخ المقابل للصورة

      const filePath = `customer_photos/${customer_email}/${photo.originalname}`;
      const { error: uploadError } = await supabase
        .storage
        .from('print')
        .upload(filePath, photo.buffer);

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        throw uploadError;
      }

      const { data, error: urlError } = await supabase
        .storage
        .from('print')
        .getPublicUrl(filePath);

      if (urlError) {
        console.error('Error getting public URL:', urlError);
        throw urlError;
      }

      const publicURL = data.publicUrl;
      // تخزين الرابط والحجم وعدد النسخ في كائن الصورة
      photoObjects.push({ url: publicURL, size, copies: copiesCount });
    }

    // تخزين بيانات الصور في Supabase Realtime Database
    const { error: insertError } = await supabase
      .from('customer_photos')
      .upsert({
        customer_name,
        customer_email,
        photos: photoObjects,
        status: false,
        delivery_method,
        address,
        phone_number,
      });

    if (insertError) {
      console.error('Error inserting data into Realtime Database:', insertError);
      throw insertError;
    }

    res.status(200).json({ message: 'تم رفع الصور وتخزينها بنجاح' });
  } catch (error) {
    console.error('Error:', error);
    res.status(400).json({ error: 'حدث خطأ أثناء رفع الصور.' });
  }
});

//ننقطة نهاية لجلب الالبومات للطباعة
router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('customer_photos').select('*');
  if (error) return res.status(500).json(error);

  res.json(data);
});


// Get a single Album by ID
router.get('/:id', async (req, res) => {
    
  const { id } = req.params;

  const { data, error } = await supabase.from('customer_photos').select('*').eq('id', id).single();
  if (error) return res.status(500).json(error);

  res.json(data);
});

// تحديث حالة الألبوم
router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    // تحديث الحالة في Supabase Realtime Database
    const { data, error } = await supabase
      .from('customer_photos')
      .update({ status })
      .eq('id', id);

    if (error) {
      console.error('Error updating album status:', error);
      return res.status(500).json({ error: 'حدث خطأ أثناء تحديث الحالة.' });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Error:', error);
    res.status(400).json({ error: 'حدث خطأ أثناء تحديث الحالة.' });
  }
});


module.exports = router;
