const express = require('express');
const multer = require('multer');
const { supabase } = require('../supabaseClient'); // تأكد من مسار supabaseClient الصحيح

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
  
      const imageUrls = await Promise.all(req.files.map(async (file) => {
        const { buffer, originalname, mimetype } = file;
        const fileName = `${Date.now()}_${originalname}`;
  
        const { data, error } = await supabase.storage
          .from('images')
          .upload(fileName, buffer, { contentType: mimetype });
  
        if (error) {
          throw new Error('Failed to upload image to Supabase');
        }
  
        return `${process.env.SUPABASE_URL}/storage/v1/object/public/images/${fileName}`;
      }));
  
      const { data: existingEvent, error: fetchError } = await supabase
        .from('events')
        .select('album')
        .eq('id', eventId)
        .single();
  
      if (fetchError) {
        throw new Error('Failed to fetch event album');
      }
  
      const updatedAlbum = [...(existingEvent.album || []), ...imageUrls];
  
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
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ success: false, message: 'No image URL provided' });
    }

    // حذف الصورة من Supabase
    const { error: deleteError } = await supabase.storage
      .from('images')
      .remove([imageUrl.split('/').pop()]);

    if (deleteError) {
      console.error('Supabase delete error:', deleteError);
      return res.status(500).json({ success: false, message: 'Failed to delete image from Supabase' });
    }

    // تحديث مصفوفة الألبوم في الحدث باستخدام Supabase
    const { error: updateError } = await supabase
      .from('events')
      .update({ album: supabase.sql`array_remove(album, ${imageUrl})` })
      .match({ id: eventId });

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
  
      // تحقق من البيانات المستلمة
      console.log('Received images for deletion:', images);
  
      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ success: false, message: 'No images provided for deletion' });
      }
  
      const fileNames = images.map(url => url.split('/').pop());
  
      console.log('Deleting files:', fileNames);
  
      const { error: deleteError } = await supabase.storage
        .from('images')
        .remove(fileNames);
  
      if (deleteError) {
        console.error('Supabase delete error:', deleteError);
        return res.status(500).json({ success: false, message: 'Failed to delete images from Supabase' });
      }
  
      const { data: existingEvent, error: fetchError } = await supabase
        .from('events')
        .select('album')
        .eq('id', eventId)
        .single();
  
      if (fetchError) {
        console.error('Supabase fetch error:', fetchError);
        return res.status(500).json({ success: false, message: 'Failed to fetch event album' });
      }
  
      const updatedAlbum = existingEvent.album.filter(url => !images.includes(url));
  
      console.log('Updated album:', updatedAlbum);
  
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
