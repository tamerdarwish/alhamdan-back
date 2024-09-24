const express = require('express');
const multer = require('multer');
const { supabase } = require('../supabaseClient'); // تأكد من مسار supabaseClient الصحيح
const { v4: uuidv4 } = require('uuid');
const { Readable } = require('stream');
const path = require('path');
const sharp = require('sharp');
require('dotenv').config();
const formidable = require('formidable');


const router = express.Router();
// إعداد التخزين لـ multer
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 500* 1024 * 1024, 
    files: 999 // أو العدد الذي تريده
  }
});


// نقطة النهاية لرفع صورة الألبوم
router.post('/:eventId/add-images', upload.array('images'), async (req, res) => {
  const { eventId } = req.params;
  const photos = req.files;
  const imageObjects = [];

  try {
    // التحقق من وجود الصور
    if (!photos || photos.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    // جلب الألبوم الحالي للمناسبة من جدول events
    const { data: existingEvent, error: fetchError } = await supabase
      .from('events')
      .select('album')
      .eq('id', eventId)
      .single();

    if (fetchError) {
      console.error(`Failed to fetch event album for eventId ${eventId}:`, fetchError.message);
      throw new Error('Failed to fetch event album');
    }

    const existingAlbum = existingEvent.album || [];

    // رفع الصور وحفظها ككائنات تحتوي على الرابط ومعرف فريد
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const fileName = `${Date.now()}_${photo.originalname}`; // إضافة الوقت لجعل الاسم مميزاً
      const filePath = `images/${eventId}/${fileName}`; // مسار الحفظ في باكت "images"

      // التحقق مما إذا كانت الصورة موجودة بالفعل في الألبوم
      const isAlreadyInAlbum = existingAlbum.some(img => img.url && img.url.includes(photo.originalname));

      if (!isAlreadyInAlbum) {
        // رفع الصورة إلى Supabase Storage
        const { error: uploadError } = await supabase
          .storage
          .from('images')
          .upload(filePath, photo.buffer, { contentType: photo.mimetype });

        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          throw uploadError;
        }

        // الحصول على رابط الصورة العام
        const { data: publicUrlData, error: urlError } = await supabase
          .storage
          .from('images')
          .getPublicUrl(filePath);

        if (urlError) {
          console.error('Error getting public URL:', urlError);
          throw urlError;
        }

        const publicURL = publicUrlData.publicUrl;

        // إضافة كائن الصورة إلى مصفوفة الصور الجديدة مع معرف فريد
        imageObjects.push({ id: uuidv4(), url: publicURL, printStatus: false });
      } else {
        console.log(`Image ${photo.originalname} already exists in the album.`);
      }
    }

    // دمج الصور الجديدة مع الألبوم الحالي
    const updatedAlbum = [...existingAlbum, ...imageObjects];

    // تحديث الألبوم في جدول events
    const { error: updateError } = await supabase
      .from('events')
      .update({ album: updatedAlbum })
      .eq('id', eventId);

    if (updateError) {
      console.error(`Failed to update event album for eventId ${eventId}:`, updateError.message);
      throw new Error('Failed to update event album');
    }

    // الرد بنجاح وتحديث الألبوم
    res.status(200).json({ success: true, album: updatedAlbum });
  } catch (error) {
    console.error('Error adding images:', error);
    res.status(500).json({ success: false, message: 'Error uploading images' });
  }
});


// دالة لرفع الصورة
async function uploadImage(file) {
  const { buffer, originalname, mimetype } = file;
  const fileName = `${Date.now()}_${originalname}`;
  
  const { data, error } = await supabase.storage
    .from('images')
    .upload(fileName, buffer, { contentType: mimetype });

  if (error) throw new Error('Failed to upload image to Supabase');

  return {
    id: uuidv4(),
    url: `${process.env.SUPABASE_URL}/storage/v1/object/public/images/${fileName}`,
    printStatus: false,
  };
}

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
      const validWatermarkSettings = ['بدون علامة مائية', 'علامة مائية جزئية', 'علامة مائية كاملة'];
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
      if (watermark === 'علامة مائية جزئية' || watermark === 'علامة مائية كاملة') {
        console.log('Adding watermark:', watermark);
        const watermarkPath = path.join(__dirname, '../logo.png'); // تعديل المسار حسب موقع الملف
        const watermarkImage = await sharp(watermarkPath);
  
        if (watermark === 'علامة مائية جزئية') {
          // وضع العلامة المائية على طرف الصورة
          imageBuffer = await sharp(imageBuffer)
            .composite([{ input: await watermarkImage.toBuffer(), gravity: 'southeast' }])
            .toBuffer();
        } else if (watermark === 'علامة مائية كاملة') {
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
      const validWatermarkSettings = ['بدون علامة مائية', 'علامة مائية جزئية', 'علامة مائية كاملة'];
      if (!validWatermarkSettings.includes(watermarkSetting)) {
        return res.status(400).json({ success: false, message: 'Invalid watermark setting' });
      }
  
      const results = [];
  
      for (const file of req.files) {
        // إضافة العلامة المائية بناءً على watermarkSetting
        let imageBuffer = file.buffer;
  
        if (watermarkSetting === 'علامة مائية جزئية' || watermarkSetting === '2') {
          const watermarkPath = path.join(__dirname, '../logo.png'); // تعديل المسار حسب موقع الملف
          const watermarkImage = await sharp(watermarkPath);
  
          if (watermarkSetting === '1') {
            // وضع العلامة المائية على طرف الصورة
            imageBuffer = await sharp(imageBuffer)
              .composite([{ input: await watermarkImage.toBuffer(), gravity: 'southeast' }])
              .toBuffer();
          } else if (watermarkSetting === 'علامة مائية كاملة') {
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
