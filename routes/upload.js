const express = require('express');
const multer = require('multer');
const { supabase } = require('../supabaseClient'); // تأكد من مسار supabaseClient الصحيح
const { v4: uuidv4 } = require('uuid');
const { Readable } = require('stream');
const path = require('path');
const sharp = require('sharp');





const router = express.Router();

// إعداد التخزين لـ multer
const storage = multer.memoryStorage();
const upload = multer({
  storage
});
require('dotenv').config();

router.post('/', upload.single('file'), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }
  
      const { buffer, originalname, mimetype } = file;
      const fileName = `${uuidv4()}_${originalname}`;
  
      // رفع الصورة إلى Supabase
      const { data, error } = await supabase.storage
        .from('images')
        .upload(fileName, buffer, { contentType: mimetype });
  
      if (error) {
        console.error('Error uploading to Supabase:', error);
        return res.status(500).json({ success: false, message: 'Failed to upload image to Supabase' });
      }
  
      // استرجاع رابط الملف المرفوع من Supabase
      const fileUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/images/${fileName}`;
      
      res.status(200).json({ success: true, url: fileUrl });
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ success: false, message: 'Error uploading file' });
    }
  });
  
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


  // نقطة النهاية لحفظ العلامة المائية
  router.post('/watermark/:fileName', async (req, res) => {
    
    try {
      console.log('Endpoint hit'); // تأكيد وصول الطلب
  
      const { fileName } = req.params;
      const { watermark } = req.body; // استلام watermark من الجسم (body)
  
      // التحقق من صحة قيمة watermark
      const validWatermarkSettings = ['0', '1', '2'];
      if (!validWatermarkSettings.includes(watermark)) {
        console.log('Invalid watermark setting:', watermark);
        return res.status(400).json({ success: false, message: 'Invalid watermark setting' });
      }
  
      // تحميل الصورة الأصلية من Supabase باستخدام fetch
      const response = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/public/images/${fileName}`);
  
      if (!response.ok) {
        throw new Error('Failed to fetch image from Supabase');
      }
  
      // تحويل الـ Response إلى Buffer
      const fileStream = await response.arrayBuffer();
      let imageBuffer = Buffer.from(fileStream);
  
      // إضافة العلامة المائية بناءً على watermarkSetting
      if (watermark === '1' || watermark === '2') {
        console.log('Adding watermark:', watermark);
        const watermarkPath = path.join(__dirname, '../logo.png'); // تعديل المسار حسب موقع الملف
        const watermarkImage = await sharp(watermarkPath);
  
        if (watermark === '1') {
          // وضع العلامة المائية على طرف الصورة
          imageBuffer = await sharp(imageBuffer)
            .composite([{ input: await watermarkImage.toBuffer(), gravity: 'southeast' }])
            .toBuffer();
        } else if (watermark === '2') {
          // تغطية الصورة بالكامل بالعلامة المائية
          const watermarkResized = await watermarkImage
            .resize({ width: 200, height: 200 })
            .toBuffer();
  
          imageBuffer = await sharp(imageBuffer)
            .composite([{ input: watermarkResized, tile: true, gravity: 'centre', blend: 'overlay' }])
            .toBuffer();
        }
      }
  
      console.log('Watermark setting:', watermark);
      console.log('Image Buffer length:', imageBuffer.length);
  
      // تعيين نوع المحتوى وإرسال الصورة المعدلة
      res.set('Content-Type', 'image/jpeg');
      res.send(imageBuffer);
    } catch (error) {
      console.error('Error processing download:', error);
      res.status(500).json({ success: false, message: 'Error downloading image' });
    }
  });

  router.post('/upload', upload.array('images'), async (req, res) => {
    try {
      const watermarkSetting = req.body.watermark; // استلام watermark من الجسم (body)
  
      // التحقق من صحة قيمة watermark
      const validWatermarkSettings = ['0', '1', '2'];
      if (!validWatermarkSettings.includes(watermarkSetting)) {
        return res.status(400).json({ success: false, message: 'Invalid watermark setting' });
      }
  
      const results = [];
  
      for (const file of req.files) {
        // إضافة العلامة المائية بناءً على watermarkSetting
        let imageBuffer = file.buffer;
  
        if (watermarkSetting === '1' || watermarkSetting === '2') {
          const watermarkPath = path.join(__dirname, '../logo.png'); // تعديل المسار حسب موقع الملف
          const watermarkImage = await sharp(watermarkPath);
  
          if (watermarkSetting === '1') {
            // وضع العلامة المائية على طرف الصورة
            imageBuffer = await sharp(imageBuffer)
              .composite([{ input: await watermarkImage.toBuffer(), gravity: 'southeast' }])
              .toBuffer();
          } else if (watermarkSetting === '2') {
            // تغطية الصورة بالكامل بالعلامة المائية
            const watermarkResized = await watermarkImage
              .resize({ width: 200, height: 200 })
              .toBuffer();
  
            imageBuffer = await sharp(imageBuffer)
              .composite([{ input: watermarkResized, tile: true, gravity: 'centre', blend: 'overlay' }])
              .toBuffer();
          }
        }
  
        // أضف الصورة المعدلة إلى النتائج
        results.push({
          originalName: file.originalname,
          modifiedImageBuffer: imageBuffer
        });
      }
  
      // إرسال الصور المعدلة كاستجابة
      res.json({ success: true, results });
    } catch (error) {
      console.error('Error processing upload:', error);
      res.status(500).json({ success: false, message: 'Error processing images' });
    }
  });


// نقطة النهاية لتحديث الصورة الرئيسية
router.post('/', upload.single('image'), async (req, res) => {
  console.log('ss');
  
  const { name, description, price } = req.body;
  const image = req.file;

  // التحقق من وجود الصورة
  if (!image) {
    return res.status(400).json({ error: 'Image is required' });
  }

  // رفع الصورة إلى Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('product-images') // استبدل 'product-images' باسم الباكت الخاص بك في Supabase
    .upload(`products/${Date.now()}_${path.basename(image.originalname)}`, fs.createReadStream(image.path), {
      contentType: image.mimetype,
    });

  if (uploadError) {
    fs.unlinkSync(image.path); // حذف الملف إذا حدث خطأ
    return res.status(500).json(uploadError);
  }

  // الحصول على رابط الصورة
  const { publicURL } = supabase.storage.from('product-images').getPublicUrl(`products/${Date.now()}_${path.basename(image.originalname)}`);

  // إدخال بيانات المنتج في قاعدة البيانات
  const { data, error } = await supabase
    .from('products')
    .insert([{ name, description, price, image_url: publicURL }]);

  if (error) {
    fs.unlinkSync(image.path); // حذف الملف إذا حدث خطأ
    return res.status(500).json(error);
  }

  // حذف الملف من السيرفر بعد رفعه
  fs.unlinkSync(image.path);

  res.json({ success: true, data });
});
  
  
// نقطة النهاية لتحديث الصورة الرئيسية
router.post('/update-main-image/:eventId', upload.single('file'), async (req, res) => {

  try {
    const { eventId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { buffer, originalname, mimetype } = file;
    const fileName = `${uuidv4()}_${originalname}`;

    // رفع الصورة إلى Supabase
    const { data, error } = await supabase.storage
      .from('images')
      .upload(fileName, buffer, { contentType: mimetype });

    if (error) {
      console.error('Error uploading to Supabase:', error);
      return res.status(500).json({ success: false, message: 'Failed to upload image to Supabase' });
    }

    // استرجاع رابط الصورة الجديدة من Supabase
    const fileUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/images/${fileName}`;

    // تحديث الرابط في قاعدة البيانات
    const { error: updateError } = await supabase
      .from('events')
      .update({ main_image: fileUrl }) // تحديث حقل الصورة الرئيسية
      .eq('id', eventId);

    if (updateError) {
      console.error('Error updating event image:', updateError);
      return res.status(500).json({ success: false, message: 'Failed to update event image' });
    }

    res.status(200).json({ success: true, url: fileUrl });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ success: false, message: 'Error uploading file' });
  }
});

module.exports = router;
