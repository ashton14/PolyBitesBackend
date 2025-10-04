import db from '../models/db.js';

export const getRestaurantReviews = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM restaurant_reviews');
    res.json(rows);
  } catch (err) {
    console.error('Database Query Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};