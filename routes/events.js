const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');

// الحصول على جميع المناسبات
router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('events').select('*');
  if (error) return res.status(500).json(error);
  res.json(data);
});

// الحصول على مناسبة واحدة حسب الـ ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from('events').select('*').eq('id', id).single();
  if (error) return res.status(500).json(error);
  res.json(data);
});

// إنشاء مناسبة جديدة
router.post('/', async (req, res) => {
  const { name, date, main_image, drive_link, access_code, watermark_setting ,album} = req.body;
  
  const { data, error } = await supabase.from('events').insert([{ name, date, main_image, drive_link, access_code, watermark_setting, album}]);
  if (error) {
    console.error(error);
    return res.status(500).json(error);
  }
  
  res.json({ success: true, data });
});

// تحديث مناسبة
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, date, main_image, drive_link, access_code, watermark_setting } = req.body;

  // تحقق من صحة البيانات المطلوبة
  if (!id || !name || !date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // تحقق من وجود السجل في قاعدة البيانات
    const { data: existingEvent, error: fetchError } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();
      
    if (fetchError) {
      return res.status(500).json({ error: 'Failed to fetch event' });
    }

    if (!existingEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // تحديث السجل
    const { data, error: updateError } = await supabase
      .from('events')
      .update({ name, date, main_image, drive_link, access_code, watermark_setting })
      .eq('id', id)
      .select('*')  // تأكد من إعادة السجل المحدث
      .single();    // يضمن الحصول على سجل واحد فقط

    if (updateError || !data) {
      return res.status(500).json({ error: 'Failed to update event' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// حذف مناسبة
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) return res.status(500).json(error);
  res.json({ message: 'Event deleted' });
});

module.exports = router;
