const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');
const { Buffer } = require('buffer');

// دالة لتحميل الصورة من الرابط وتخزينها في Supabase Storage
const uploadImageToSupabase = async (file, imageName) => {
  try {
    console.log(`Uploading image with name: ${imageName}`);
    const { data, error } = await supabase.storage.from('print').upload(imageName, file, {
      contentType: file.type,
    });

    if (error) {
      console.error('Error uploading image:', error);
      throw error;
    }

    // الحصول على رابط الصورة المخزنة
    const { publicURL } = supabase.storage.from('print').getPublicUrl(imageName);
    return publicURL;

  } catch (error) {
    console.error('Error in uploadImageToSupabase:', error);
    throw error;
  }
};

// الحصول على جميع الصور لحدث معين
router.get('/event/:eventId', async (req, res) => {
  const { eventId } = req.params;
  const { data, error } = await supabase.from('photos').select('*').eq('event_id', eventId);
  if (error) return res.status(500).json(error);
  res.json(data);
});

// رفع صورة جديدة لحدث معين
router.post('/event/:eventId', async (req, res) => {
  const { eventId } = req.params;
  const { url } = req.body;
  const { data, error } = await supabase.from('photos').insert([{ event_id: eventId, url }]);
  if (error) return res.status(500).json(error);
  res.json(data);
});

// وضع علامة على الصورة كصورة مختارة للطباعة
router.put('/:id/select', async (req, res) => {
  const { id } = req.params;
  const { selected_for_printing } = req.body;
  const { data, error } = await supabase.from('photos').update({ selected_for_printing }).eq('id', id);
  if (error) return res.status(500).json(error);
  res.json(data);
});

// حذف صورة
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('photos').delete().eq('id', id);
  if (error) return res.status(500).json(error);
  res.json({ message: 'Photo deleted' });
});

/*********************************************************************************
 * 
 * نقاط نهاية خاصة برفع صور الزبائن للطباعة
 * 
***********************************************************************************/

// رفع صورة جديدة مع معلومات الزبون
router.post('/photos', async (req, res) => {
  try {
    const customerPhotos = [];
    const { customer_name, customer_email } = req.body;

    if (!customer_name || !customer_email) {
      console.log('Customer information is missing');
      return res.status(400).json({ error: 'مطلوب معلومات الزبون' });
    }

    // تحميل وتخزين كل صورة ثم الحصول على الرابط الثابت
    const files = req.files['photos[]'];
    for (const [index, file] of files.entries()) {
      const imageName = file.originalname; // استخدم اسم الملف الأصلي
      const publicUrl = await uploadImageToSupabase(file.buffer, imageName);
      customerPhotos.push({ url: publicUrl, size: req.body.sizes[index], copies: req.body.copies[index] });
    }

    // إدراج معلومات الزبون مع الصور في سطر واحد
    const { data, error } = await supabase.from('customer_photos').insert([
      {
        customer_name,
        customer_email,
        photos: customerPhotos, // تخزين الصور كمصفوفة في السطر نفسه
      },
    ]);

    if (error) {
      console.error('Error inserting customer photos:', error);
      return res.status(500).json({ error: 'Failed to save customer photos', details: error.message });
    }

    res.status(200).json({ message: 'Photos uploaded successfully', data });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});


// تحديث معلومات الصورة (حجم الصورة وعدد النسخ)
router.put('/photos/:id', async (req, res) => {
  const { id } = req.params;
  const { size, copies } = req.body;

  if (!size || !copies) {
    return res.status(400).json({ error: 'مطلوب تحديث معلومات الصورة كاملة' });
  }

  const { data, error } = await supabase.from('customer_photos').update({ size, copies }).eq('id', id);
  if (error) return res.status(500).json(error);
  res.json(data);
});

// حذف صورة
router.delete('/photos/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('customer_photos').delete().eq('id', id);
  if (error) return res.status(500).json(error);
  res.json({ message: 'تم حذف الصورة بنجاح' });
});

module.exports = router;
