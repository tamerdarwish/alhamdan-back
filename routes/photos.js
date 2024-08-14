const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');

// Get all photos for an event
router.get('/event/:eventId', async (req, res) => {
  const { eventId } = req.params;
  const { data, error } = await supabase.from('photos').select('*').eq('event_id', eventId);
  if (error) return res.status(500).json(error);
  res.json(data);
});

// Upload a new photo for an event
router.post('/event/:eventId', async (req, res) => {
  const { eventId } = req.params;
  const { url } = req.body;
  const { data, error } = await supabase.from('photos').insert([{ event_id: eventId, url }]);
  if (error) return res.status(500).json(error);
  res.json(data);
});

// Mark a photo as selected for printing
router.put('/:id/select', async (req, res) => {
  const { id } = req.params;
  const { selected_for_printing } = req.body;
  const { data, error } = await supabase.from('photos').update({ selected_for_printing }).eq('id', id);
  if (error) return res.status(500).json(error);
  res.json(data);
});

// Delete a photo
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('photos').delete().eq('id', id);
  if (error) return res.status(500).json(error);
  res.json({ message: 'Photo deleted' });
});

module.exports = router;
