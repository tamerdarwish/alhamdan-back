const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');

// Get all orders for an event
router.get('/event/:eventId', async (req, res) => {
  const { eventId } = req.params;
  const { data, error } = await supabase.from('orders').select('*').eq('event_id', eventId);
  if (error) return res.status(500).json(error);
  res.json(data);
});

// Create a new order
router.post('/', async (req, res) => {
  const { event_id, photo_id } = req.body;
  const { data, error } = await supabase.from('orders').insert([{ event_id, photo_id }]);
  if (error) return res.status(500).json(error);
  res.json(data);
});

// Delete an order
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('orders').delete().eq('id', id);
  if (error) return res.status(500).json(error);
  res.json({ message: 'Order deleted' });
});

module.exports = router;
