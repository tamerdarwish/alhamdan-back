const express = require('express');
const { supabase } = require('./supabaseClient');

const router = express.Router();

// نقطة نهاية لجلب الأحداث
router.get('/events', async (req, res) => {
  const { data, error } = await supabase
    .from('events')
    .select('*');
  if (error) return res.status(500).json(error);
  res.json(data);
});

// نقطة نهاية لإضافة حدث جديد
router.post('/events', async (req, res) => {
  const { name, date } = req.body;
  const { data, error } = await supabase
    .from('events')
    .insert([{ name, date }]);
  if (error) return res.status(500).json(error);
  res.status(201).json(data);
});

// نقطة نهاية لإضافة صورة
router.post('/photos', async (req, res) => {
  const { eventId, url } = req.body;
  const { data, error } = await supabase
    .from('photos')
    .insert([{ event_id: eventId, url }]);
  if (error) return res.status(500).json(error);
  res.status(201).json(data);
});

// نقطة نهاية لإضافة طلب طباعة
router.post('/print-requests', async (req, res) => {
  const { photoId, userId, printOptions } = req.body;
  const { data, error } = await supabase
    .from('print_requests')
    .insert([{ photo_id: photoId, user_id: userId, print_options: printOptions }]);
  if (error) return res.status(500).json(error);
  res.status(201).json(data);
});

// نقطة نهاية لإدارة خيارات العلامة المائية
router.post('/watermark-options', async (req, res) => {
  const { userId, watermarkOption } = req.body;
  const { data, error } = await supabase
    .from('watermark_options')
    .upsert([{ user_id: userId, watermark_option: watermarkOption }]);
  if (error) return res.status(500).json(error);
  res.status(201).json(data);
});

module.exports = router;
