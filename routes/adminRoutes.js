const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // استخدام bcryptjs
const router = express.Router();
const { supabase } = require('../supabaseClient');

// تسجيل مستخدم جديد
router.post('/register', async (req, res) => {
  const { email, password, username } = req.body;

  // طباعة البيانات المرسلة من العميل
  console.log('Received data for registration:', { email, password, username });

  // تحقق من وجود الحقول المطلوبة
  if (!email || !password || !username) {
    console.log('Missing fields');
    return res.status(400).json({ message: 'All fields are required' });
  }

  // تحقق إذا كان البريد الإلكتروني موجودًا مسبقًا
  const { data: existingUser, error: existingUserError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  // طباعة حالة البحث عن المستخدم
  if (existingUser) {
    console.log('User already exists with this email:', email);
    return res.status(400).json({ message: 'Email is already taken' });
  } else {
    console.log('No existing user found with this email.');
  }

  // تشفير كلمة المرور
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hashed successfully.');
    
    // إضافة المستخدم الجديد إلى قاعدة البيانات
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          email,
          password: hashedPassword,
          username, // يمكنك إضافة حقول أخرى حسب الحاجة
          role:'admin',
        }
      ])
      .single();

    // طباعة حالة إضافة المستخدم
    if (error) {
      console.log('Error inserting user into database:', error);
      return res.status(400).json({ message: 'Error registering user', error });
    }

    console.log('User added to database successfully:', data);

    // توليد توكن JWT
    const token = jwt.sign({ id: data.id, role: 'authenticated' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log('JWT token generated successfully.');

    // إرسال التوكن للمستخدم
    res.status(201).json({ token });
  } catch (err) {
    console.log('Error hashing password:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// تسجيل الدخول
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  console.log('Login attempt for email:', email);

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  // طباعة حالة البحث عن المستخدم
  if (error || !data) {
    console.log('No user found or error fetching user:', error);
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  // مقارنة كلمة المرور
  const isPasswordValid = await bcrypt.compare(password, data.password);
  console.log('Password comparison result:', isPasswordValid);

  if (!isPasswordValid) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  // توليد توكن JWT
  const token = jwt.sign({ id: data.id, role: 'authenticated' }, process.env.JWT_SECRET, { expiresIn: '1h' });

  // إرسال التوكن للمستخدم
  console.log('JWT token generated successfully for login.');

  res.json({ token });
});

module.exports = router;
