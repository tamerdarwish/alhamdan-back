const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');

// Create a new order (الشفرة التي لديك بالفعل)
router.post('/', async (req, res) => {
  const { 
    cartItems, 
    totalPrice,
    fullName,
    address,
    phoneNumber
  } = req.body;

  if (!cartItems || !totalPrice) {
    return res.status(400).json({ error: 'Missing cart items or total price' });
  }

  const { data, error } = await supabase
    .from('orders')
    .insert([
      {
        cart_items: cartItems,
        total_price: totalPrice,
        customer_name: fullName,
        address: address,
        phone_number: phoneNumber,
        status: false
      }
    ]);

  if (error) {
    console.error('Error inserting order:', error);
    return res.status(500).json({ error: 'Failed to create order' });
  }

  res.status(201).json({ message: 'Order created successfully', data });
});

// Fetch all orders (النقطة الجديدة التي نضيفها)
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*'); // جلب كل الأعمدة من جدول الطلبات

  if (error) {
    console.error('Error fetching orders:', error);
    return res.status(500).json({ error: 'Failed to fetch orders' });
  }

  res.status(200).json(data); // إرسال البيانات كاستجابة
});

router.post('/', async (req, res) => {
  const { 
    cartItems, 
    totalPrice,
    fullName,
    address,
    phoneNumber
  } = req.body;

  if (!cartItems || !totalPrice) {
    return res.status(400).json({ error: 'Missing cart items or total price' });
  }

  const { data, error } = await supabase
    .from('orders')
    .insert([
      {
        cart_items: cartItems,
        total_price: totalPrice,
        customer_name: fullName,
        address: address,
        phone_number: phoneNumber,
        status: false
      }
    ]);

  if (error) {
    console.error('Error inserting order:', error);
    return res.status(500).json({ error: 'Failed to create order' });
  }

  res.status(201).json({ message: 'Order created successfully', data });
});

// Fetch all orders (النقطة الجديدة التي نضيفها)
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*'); // جلب كل الأعمدة من جدول الطلبات

  if (error) {
    console.error('Error fetching orders:', error);
    return res.status(500).json({ error: 'Failed to fetch orders' });
  }

  res.status(200).json(data); // إرسال البيانات كاستجابة
});

// Fetch a specific order by ID (النقطة الجديدة التي نضيفها)
router.get('/:id', async (req, res) => {
  const { id } = req.params; // الحصول على معرف الطلبية من المعاملات

  if (!id) {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id) // تحديد الطلبية باستخدام المعرف
    .single(); // الحصول على طلبية واحدة

  if (error) {
    console.error('Error fetching order:', error);
    return res.status(500).json({ error: 'Failed to fetch order' });
  }

  if (!data) {
    return res.status(404).json({ error: 'Order not found' });
  }

  res.status(200).json(data); // إرسال بيانات الطلبية كاستجابة
});


// Update order status
router.patch('/:id', async (req, res) => {
  
  const { id } = req.params;
  const { status } = req.body; // استلام الحالة الجديدة

  if (status === undefined) {
    return res.status(400).json({ error: 'Missing status' });
  }

  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .match({ id });

  if (error) {
    console.error('Error updating order status:', error);
    return res.status(500).json({ error: 'Failed to update order status' });
  }

  res.status(200).json(data);
});

module.exports = router;
