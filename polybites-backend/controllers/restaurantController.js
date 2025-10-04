import db from '../models/db.js';

export const getRestaurants = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT 
        r.*,
        COALESCE(AVG(fr.rating), 0) as average_rating,
        COUNT(DISTINCT fr.id) as review_count,
        COUNT(DISTINCT f.id) as menu_item_count,
        (
          SELECT AVG(food_value) FROM (
            SELECT 
              CASE WHEN COUNT(fr2.id) > 0 AND f2.price > 0 
                THEN AVG(fr2.rating) / f2.price 
                ELSE NULL 
              END as food_value
            FROM foods f2
            LEFT JOIN food_reviews fr2 ON fr2.food_id = f2.id
            WHERE f2.restaurant_id = r.id
            GROUP BY f2.id
            HAVING COUNT(fr2.id) > 0 AND f2.price > 0
          ) as food_values
        ) as average_value
      FROM restaurants r
      LEFT JOIN foods f ON f.restaurant_id = r.id
      LEFT JOIN food_reviews fr ON fr.food_id = f.id
      GROUP BY r.id
      ORDER BY r.id ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Database Query Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getRestaurantById = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query(`
      SELECT 
        r.*,
        COALESCE(AVG(fr.rating), 0) as average_rating,
        COUNT(DISTINCT fr.id) as review_count,
        COUNT(DISTINCT f.id) as menu_item_count,
        (
          SELECT AVG(food_value) FROM (
            SELECT 
              CASE WHEN COUNT(fr2.id) > 0 AND f2.price > 0 
                THEN AVG(fr2.rating) / f2.price 
                ELSE NULL 
              END as food_value
            FROM foods f2
            LEFT JOIN food_reviews fr2 ON fr2.food_id = f2.id
            WHERE f2.restaurant_id = r.id
            GROUP BY f2.id
            HAVING COUNT(fr2.id) > 0 AND f2.price > 0
          ) as food_values
        ) as average_value
      FROM restaurants r
      LEFT JOIN foods f ON f.restaurant_id = r.id
      LEFT JOIN food_reviews fr ON fr.food_id = f.id
      WHERE r.id = $1
      GROUP BY r.id
    `, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Database Query Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};