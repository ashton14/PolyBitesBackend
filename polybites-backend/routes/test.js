import express from 'express';
import { supabase } from '../db/supabaseClient.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // Example: Fetch from a Supabase table named "users"
    const { data, error } = await supabase
      .from('users')   // <-- Replace with any existing table in your DB
      .select('*')
      .limit(5);

    if (error) throw error;

    res.status(200).json({
      message: 'Success!',
      data: data,
    });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to fetch data',
      error: err.message,
    });
  }
});

export default router;