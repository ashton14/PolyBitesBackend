import db from '../models/db.js';

export const getRestaurants = async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100 items per request
    const offset = (page - 1) * limit;
    
    // Get total count for pagination info
    const { rows: countRows } = await db.query('SELECT COUNT(*) FROM restaurants');
    const totalCount = parseInt(countRows[0].count);
    
    // Get paginated restaurants with simplified query for better performance
    const { rows } = await db.query(`
      SELECT 
        r.*,
        COUNT(DISTINCT f.id) as menu_item_count
      FROM restaurants r
      LEFT JOIN foods f ON f.restaurant_id = r.id
      GROUP BY r.id
      ORDER BY r.id ASC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    res.json({
      data: rows,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (err) {
    console.error('Database Query Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getRestaurantById = async (req, res) => {
  const { id } = req.params;
  try {
    // Simplified query - just get basic restaurant info
    const { rows } = await db.query(`
      SELECT 
        r.*,
        COUNT(DISTINCT f.id) as menu_item_count
      FROM restaurants r
      LEFT JOIN foods f ON f.restaurant_id = r.id
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

// New separate endpoint for restaurant statistics
export const getRestaurantStats = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query(`
      SELECT 
        COALESCE(
          (SELECT AVG(rating) FROM (
            SELECT rating FROM food_reviews fr 
            JOIN foods f ON fr.food_id = f.id 
            WHERE f.restaurant_id = $1
            UNION ALL
            SELECT rating FROM general_reviews gr 
            WHERE gr.restaurant_id = $1
          ) all_reviews), 0
        ) as average_rating,
        (
          SELECT COUNT(*) FROM (
            SELECT fr.id FROM food_reviews fr 
            JOIN foods f ON fr.food_id = f.id 
            WHERE f.restaurant_id = $1
            UNION ALL
            SELECT gr.id FROM general_reviews gr 
            WHERE gr.restaurant_id = $1
          ) all_reviews
        ) as review_count,
        (
          SELECT AVG(food_value) FROM (
            SELECT 
              CASE WHEN COUNT(fr2.id) > 0 AND f2.price > 0 
                THEN AVG(fr2.rating) / f2.price 
                ELSE NULL 
              END as food_value
            FROM foods f2
            LEFT JOIN food_reviews fr2 ON fr2.food_id = f2.id
            WHERE f2.restaurant_id = $1
            GROUP BY f2.id
            HAVING COUNT(fr2.id) > 0 AND f2.price > 0
          ) as food_values
        ) as average_value
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

export const searchRestaurants = async (req, res) => {
  try {
    const { q } = req.query; // search query parameter
    
    if (!q || q.trim() === '') {
      return getRestaurants(req, res); // fallback to get all restaurants
    }

    const searchTerm = `%${q.trim()}%`;
    const { rows } = await db.query(`
      SELECT 
        r.*,
        COALESCE(
          (SELECT AVG(rating) FROM (
            SELECT rating FROM food_reviews fr 
            JOIN foods f ON fr.food_id = f.id 
            WHERE f.restaurant_id = r.id
            UNION ALL
            SELECT rating FROM general_reviews gr 
            WHERE gr.restaurant_id = r.id
          ) all_reviews), 0
        ) as average_rating,
        (
          SELECT COUNT(*) FROM (
            SELECT fr.id FROM food_reviews fr 
            JOIN foods f ON fr.food_id = f.id 
            WHERE f.restaurant_id = r.id
            UNION ALL
            SELECT gr.id FROM general_reviews gr 
            WHERE gr.restaurant_id = r.id
          ) all_reviews
        ) as review_count,
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
      WHERE r.name ILIKE $1 OR r.description ILIKE $1
      GROUP BY r.id
      ORDER BY r.id ASC
    `, [searchTerm]);
    res.json(rows);
  } catch (err) {
    console.error('Database Query Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};