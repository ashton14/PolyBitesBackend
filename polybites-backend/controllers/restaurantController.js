import db from '../models/db.js';

export const getRestaurants = async (req, res) => {
  try {
    console.log(`📊 RESTAURANTS: Fetching from DATABASE QUERY`);
    
    // No pagination needed for 30 restaurants - just get all restaurants
    const { rows } = await db.query(`
      SELECT 
        r.*,
        COUNT(DISTINCT f.id) as menu_item_count
      FROM restaurants r
      LEFT JOIN foods f ON f.restaurant_id = r.id
      GROUP BY r.id
      ORDER BY r.id ASC
    `);
    
    console.log(`✅ RESTAURANTS: Retrieved ${rows.length} restaurants from DATABASE QUERY`);
    res.json({ data: rows });
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
    console.log(`📊 RESTAURANT STATS: Fetching from DATABASE QUERY for restaurant ${id}`);
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
    
    console.log(`📊 RESTAURANT STATS: Retrieved stats for restaurant ${id} from DATABASE QUERY`);
    console.log(`📊 RESTAURANT STATS: Average rating: ${rows[0].average_rating}, Review count: ${rows[0].review_count}`);
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

    console.log(`🔍 RESTAURANT SEARCH: Fetching from DATABASE QUERY for search term: "${q}"`);
    
    // Get all restaurants first (this will be cached)
    const { rows } = await db.query(`
      SELECT 
        r.*,
        COUNT(DISTINCT f.id) as menu_item_count
      FROM restaurants r
      LEFT JOIN foods f ON f.restaurant_id = r.id
      GROUP BY r.id
      ORDER BY r.id ASC
    `);
    
    // Client-side filtering - much faster than database queries
    const searchTerm = q.trim().toLowerCase();
    const filteredRestaurants = rows.filter(restaurant => 
      restaurant.name.toLowerCase().includes(searchTerm) ||
      (restaurant.description && restaurant.description.toLowerCase().includes(searchTerm))
    );
    
    console.log(`✅ RESTAURANT SEARCH: Found ${filteredRestaurants.length} results from DATABASE QUERY + LOCAL FILTERING`);
    res.json({ data: filteredRestaurants });
  } catch (err) {
    console.error('Database Query Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};