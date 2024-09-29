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
router.post('/send', async (req, res) => {
  const { name, email, message } = req.body;

  // تحقق من البيانات المدخلة
  if (!name || !email || !message) {
    return res.status(400).json({ message: 'يرجى ملء جميع الحقول.' });
  }

  const mailOptions = {
    from: email,
    to: 'darweshteam@gmail.com', // استبدل بهذا البريد الإلكتروني الذي تريد إرسال الرسائل إليه
    subject: 'رسالة جديدة من نموذج الاتصال',
    text: `اسم المرسل: ${name}\nالبريد الإلكتروني: ${email}\nالرسالة: ${message}`,
  };

  try {
    // إرسال البريد الإلكتروني باستخدام nodemailer
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
    res.status(200).json({ message: 'تم إرسال الرسالة بنجاح.' });
  } catch (error) {
    console.error('Error occurred while sending email:', error);

    // تحديد نوع الخطأ
    if (error.responseCode === 535) {
      return res.status(500).json({ message: 'فشل في المصادقة مع خادم البريد. تأكد من صحة بيانات الدخول.' });
    }

    res.status(500).json({ message: 'حدث خطأ أثناء إرسال الرسالة. حاول مرة أخرى لاحقًا.' });
  }
});

module.exports = router;
