const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');

// الحصول على جميع المناسبات
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('events').select('*');
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// الحصول على مناسبة واحدة حسب الـ ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase.from('events').select('*').eq('id', id).single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching event by ID:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// الحصول على مناسبة واحدة حسب كود الوصول
router.get('/by-code/:access_code', async (req, res) => {
  const { access_code } = req.params;
  try {
    const { data, error } = await supabase.from('events').select('*').eq('access_code', access_code).single();
    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching event by access code:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// إنشاء مناسبة جديدة
router.post('/', async (req, res) => {
  const { name, date, main_image, drive_link, access_code, watermark_setting, album } = req.body;

  if (!name || !date || !access_code) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { data, error } = await supabase.from('events').insert([{ name, date, main_image, drive_link, access_code, watermark_setting, album }]);
    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// تحديث مناسبة
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, date, main_image, drive_link, access_code, watermark_setting } = req.body;

  if (!id || !name || !date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { data: existingEvent, error: fetchError } = await supabase.from('events').select('*').eq('id', id).single();
    if (fetchError || !existingEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const { data, error: updateError } = await supabase
      .from('events')
      .update({ name, date, main_image, drive_link, access_code, watermark_setting })
      .eq('id', id)
      .select('*')
      .single();
    
    if (updateError) throw updateError;
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// حذف مناسبة
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { data: existingEvent, error: fetchError } = await supabase.from('events').select('*').eq('id', id).single();
    if (fetchError || !existingEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) throw error;

    res.json({ success: true, message: 'Event deleted' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// تحديث حالة الطباعة لصورة في الألبوم
router.put('/:eventId/album/:imageId', async (req, res) => {
  const { eventId, imageId } = req.params;
  const { printStatus } = req.body;

  try {
    const { data: event, error: fetchError } = await supabase.from('events').select('album').eq('id', eventId).single();
    if (fetchError || !event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const album = event.album.map(image => JSON.parse(image));
    const updatedAlbum = album.map((image) => (image.id === imageId ? { ...image, printStatus } : image));

    const updatedAlbumJSON = updatedAlbum.map(image => JSON.stringify(image));

    const { data, error: updateError } = await supabase
      .from('events')
      .update({ album: updatedAlbumJSON })
      .eq('id', eventId)
      .select('*')
      .single();

    if (updateError) throw updateError;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating album print status:', error);
    res.status(500).json({ error: 'Failed to update album' });
  }
});

// دالة للتحقق مما إذا كان كود الوصول موجودًا بالفعل
router.get('/check-code/:access_code', async (req, res) => {
  const { access_code } = req.params;

  try {
    // البحث عن مناسبة تحتوي على نفس كود الوصول
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('access_code', access_code);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    if (data.length > 0) {
      // إذا تم العثور على مناسبة بهذا الكود
      res.json({ exists: true, message: 'Access code already exists.' });
    } else {
      // إذا لم يتم العثور على مناسبة
      res.json({ exists: false, message: 'Access code is available.' });
    }
  } catch (error) {
    console.error('Error checking access code:', error);
    res.status(500).json({ error: 'Failed to check access code' });
  }
});


module.exports = router;
