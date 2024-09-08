// routes/contactRoutes.js
const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

// إنشاء ناقل البريد الإلكتروني
const transporter = nodemailer.createTransport({
  service: 'Gmail', // يمكنك استخدام خدمات بريد إلكتروني أخرى
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// مسار لإرسال الرسائل
router.post('/send', (req, res) => {
  const { name, email, message } = req.body;

  const mailOptions = {
    from: email,
    to: 'darweshteam@gmail.com', // استبدل بهذا البريد الإلكتروني الذي تريد إرسال الرسائل إليه
    subject: 'رسالة جديدة من نموذج الاتصال',
    text: `اسم المرسل: ${name}\nالبريد الإلكتروني: ${email}\nالرسالة: ${message}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Error:', error);
      return res.status(500).send('فشل في إرسال الرسالة.');
    }
    console.log('Email sent:', info.response);
    res.status(200).send('تم إرسال الرسالة بنجاح.');
  });
});

module.exports = router;
