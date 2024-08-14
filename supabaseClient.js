// supabaseClient.js
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config(); // تحميل المتغيرات من .env

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseKey) {
  throw new Error('supabaseKey is required.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase };
