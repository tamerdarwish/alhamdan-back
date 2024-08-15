const express = require('express');
const multer = require('multer');
const { supabase } = require('../supabaseClient'); // تأكد من مسار supabaseClient الصحيح
const { v4: uuidv4 } = require('uuid');


const router = express.Router();

// إعداد التخزين لـ multer
const storage = multer.memoryStorage();
const upload = multer({
  storage
});
require('dotenv').config();
// نقطة النهاية لرفع صورة الألبوم
router.post('/:eventId/add-images', upload.array('images', 999), async (req, res) => {
  try {
    const { eventId } = req.params;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    // رفع الصور وحفظها ككائنات تحتوي على الحقول المطلوبة
    const imageObjects = await Promise.all(req.files.map(async (file) => {
      const { buffer, originalname, mimetype } = file;
      const fileName = `${Date.now()}_${originalname}`;

      const { data, error } = await supabase.storage
        .from('images')
        .upload(fileName, buffer, { contentType: mimetype });

      if (error) {
        throw new Error('Failed to upload image to Supabase');
      }

      // إنشاء كائن يحتوي على رابط الصورة وحالة الطباعة
      return {
        id: uuidv4(),
        url: `${process.env.SUPABASE_URL}/storage/v1/object/public/images/${fileName}`,
        printStatus: false
      };
    }));

    const { data: existingEvent, error: fetchError } = await supabase
      .from('events')
      .select('album')
      .eq('id', eventId)
      .single();

    if (fetchError) {
      throw new Error('Failed to fetch event album');
    }

    // دمج الألبوم الحالي مع الصور الجديدة
    const updatedAlbum = [...(existingEvent.album || []), ...imageObjects];

    const { error: updateError } = await supabase
      .from('events')
      .update({ album: updatedAlbum })
      .eq('id', eventId);

    if (updateError) {
      throw new Error('Failed to update event album');
    }

    res.status(200).json({ success: true, album: updatedAlbum });
  } catch (error) {
    console.error('Error adding images:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// نقطة النهاية لحذف صورة من الألبوم
router.delete('/:eventId/delete-image', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { imageId } = req.body;

    if (!imageId) {
      return res.status(400).json({ success: false, message: 'No image ID provided' });
    }

    // الحصول على الألبوم الحالي
    const { data: eventData, error: fetchError } = await supabase
      .from('events')
      .select('album')
      .eq('id', eventId)
      .single();

    if (fetchError) {
      console.error('Supabase fetch error:', fetchError);
      return res.status(500).json({ success: false, message: 'Failed to fetch event album' });
    }

    // العثور على الصورة في الألبوم باستخدام imageId
    const parsedAlbum = eventData.album.map(item => JSON.parse(item));

    const imageToDelete = parsedAlbum.find(image => image.id === imageId);

    if (!imageToDelete) {
      return res.status(404).json({ success: false, message: 'Image not found in album' });
    }

    // حذف الصورة من Supabase
    const { error: deleteError } = await supabase.storage
      .from('images')
      .remove([imageToDelete.url.split('/').pop()]);

    if (deleteError) {
      console.error('Supabase delete error:', deleteError);
      return res.status(500).json({ success: false, message: 'Failed to delete image from Supabase' });
    }

    // تحديث مصفوفة الألبوم بإزالة الكائن الذي يحتوي على الـ imageId
    const updatedAlbum = parsedAlbum.filter(image => image.id !== imageId)
                                    .map(image => JSON.stringify(image)); // تحويل الكائنات إلى نصوص JSON

    const { error: updateError } = await supabase
      .from('events')
      .update({ album: updatedAlbum })
      .eq('id', eventId);

    if (updateError) {
      console.error('Supabase update error:', updateError);
      return res.status(500).json({ success: false, message: 'Failed to update event album' });
    }

    res.status(200).json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});



// نقطة النهاية لحذف مجموعة من الصور من الألبوم
router.delete('/:eventId/delete-images', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { images } = req.body;


    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ success: false, message: 'No images provided for deletion' });
    }

    // استخراج أسماء الملفات من الروابط
    const fileNames = images.map(image => image.url.split('/').pop());


    // حذف الملفات من Supabase
    const { error: deleteError } = await supabase.storage
      .from('images')
      .remove(fileNames);

    if (deleteError) {
      console.error('Supabase delete error:', deleteError);
      return res.status(500).json({ success: false, message: 'Failed to delete images from Supabase' });
    }

    // الحصول على الألبوم الحالي
    const { data: existingEvent, error: fetchError } = await supabase
      .from('events')
      .select('album')
      .eq('id', eventId)
      .single();

    if (fetchError) {
      console.error('Supabase fetch error:', fetchError);
      return res.status(500).json({ success: false, message: 'Failed to fetch event album' });
    }

    // تصفية الألبوم بناءً على المعرفات
    const imagesToDeleteIds = images.map(image => image.id);
    const updatedAlbum = existingEvent.album
      .filter(item => {
        const image = JSON.parse(item);
        return !imagesToDeleteIds.includes(image.id);
      });


    // تحديث الألبوم في قاعدة البيانات
    const { error: updateError } = await supabase
      .from('events')
      .update({ album: updatedAlbum })
      .eq('id', eventId);

    if (updateError) {
      console.error('Supabase update error:', updateError);
      return res.status(500).json({ success: false, message: 'Failed to update event album' });
    }

    res.json({ success: true, album: updatedAlbum });
  } catch (error) {
    console.error('Error deleting images:', error);
    res.status(500).json({ success: false, message: 'Failed to delete images' });
  }
});

module.exports = router;
