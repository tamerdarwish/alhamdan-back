const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');

// Create a new order
router.post('/', async (req, res) => {
  const { cartItems, totalPrice } = req.body; // افترض أن الطلبية تأتي من طلب POST

  // تحقق من وجود البيانات المطلوبة
  if (!cartItems || !totalPrice) {
    return res.status(400).json({ error: 'Missing cart items or total price' });
  }

  // أدخل الطلبية في جدول orders
  const { data, error } = await supabase
    .from('orders')
    .insert([
      {
        cart_items: cartItems, // يمكنك تعديل هذا الحقل وفقًا لهيكل بياناتك
        total_price: totalPrice,
        status: false // قيمة افتراضية للحالة
      }
    ]);

  if (error) {
    console.error('Error inserting order:', error);
    return res.status(500).json({ error: 'Failed to create order' });
  }

  // أرسل استجابة بنجاح العملية
  res.status(201).json({ message: 'Order created successfully', data });
});

module.exports = router;
