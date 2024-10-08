const express = require('express');
const multer = require('multer');
const { supabase } = require('../supabaseClient');

const router = express.Router();

// إعداد multer لتخزين الملفات في الذاكرة
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Middleware لمعالجة JSON و URL-encoded
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// Get all audios
router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('audios').select('*');
  if (error) return res.status(500).json(error);
  
  res.json(data);
});

// Get a single audio by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;  
  const { data, error } = await supabase.from('audios').select('*').eq('id', id).single();
  if (error) return res.status(500).json(error);
  
  res.json(data);
});

// Create a new audio
// Create a new audio
router.post('/', upload.single('mainImage'), async (req, res) => {
    const { title, description, url } = req.body;
    const main_img = req.file; // الحصول على الملف المرفوع

    // تحقق من أن req.body يحتوي على القيم المطلوبة
    if (!title || !description || !url) {
        return res.status(400).json({ message: 'يجب توفير العنوان والوصف والرابط' });
    }

    let imageUrl = null;

    // إذا كان هناك ملف مرفوع، ارفعه إلى Supabase
    if (main_img) {
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('images')
            .upload(`audios/${main_img.originalname}`, main_img.buffer, {
                contentType: main_img.mimetype,
                upsert: true,
            });

        if (uploadError) {
            return res.status(500).json(uploadError);
        }

        imageUrl = `${supabase.storage.from('images').getPublicUrl(`audios/${main_img.originalname}`).data.publicUrl}`;
    }

    // إدراج البيانات في جدول 'audios'
    const { data, error } = await supabase.from('audios').insert([{ title, description, url, main_img: imageUrl }]);

    if (error) {
        return res.status(500).json(error);
    }

    res.json(data);
});

// Update an audio
router.put('/:id', upload.single('mainImage'), async (req, res) => {
    const { id } = req.params;
    const { title, description, url } = req.body;
    const main_img = req.file; // الحصول على الملف المرفوع
  
    let imageUrl = null;
  
    // إذا كان هناك ملف مرفوع، ارفعه إلى Supabase
    if (main_img) {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(`audios/${main_img.originalname}`, main_img.buffer, {
          contentType: main_img.mimetype,
          upsert: true,
        });
  
      if (uploadError) {
        return res.status(500).json(uploadError);
      }
  
      imageUrl = `${supabase.storage.from('images').getPublicUrl(`audios/${main_img.originalname}`).data.publicUrl}`;
    }
  
    // تحديث البيانات في جدول 'audios'
    const updateData = { title, description, url };
    if (imageUrl) updateData.main_img = imageUrl; // أضف صورة إذا كانت موجودة
  
    const { data, error } = await supabase.from('audios').update(updateData).eq('id', id);
    if (error) return res.status(500).json(error);
    
    res.json(data);
});
  
// Delete an audio
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('audios').delete().eq('id', id);
  if (error) return res.status(500).json(error);
  
  res.json({ message: 'Audio deleted' });
});

module.exports = router;
