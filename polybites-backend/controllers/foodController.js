import db from '../models/db.js';

// Helper to get food stats (average_rating, review_count) for a list of food IDs
async function getFoodStatsMap(foodIds) {
  if (!foodIds.length) return {};
  const { rows } = await db.query(
    `SELECT food_id, COUNT(id) as review_count, COALESCE(AVG(rating), 0) as average_rating
     FROM food_reviews
     WHERE food_id = ANY($1)
     GROUP BY food_id`,
    [foodIds]
  );
  const statsMap = {};
  rows.forEach(row => {
    statsMap[row.food_id] = {
      review_count: parseInt(row.review_count),
      average_rating: parseFloat(row.average_rating)
    };
  });
  return statsMap;
}

export const getFoods = async (req, res) => {
  try {
    console.log(`🍽️ FOODS: Fetching from DATABASE QUERY`);
    
    // Get all foods with stats in a single optimized query
    const { rows } = await db.query(`
      SELECT 
        f.*,
        COALESCE(COUNT(fr.id), 0) as review_count,
        COALESCE(AVG(fr.rating), 0) as average_rating,
        CASE 
          WHEN COUNT(fr.id) > 0 AND f.price > 0 
          THEN AVG(fr.rating) / f.price 
          ELSE NULL 
        END as value
      FROM foods f
      LEFT JOIN food_reviews fr ON f.id = fr.food_id
      GROUP BY f.id
      ORDER BY f.id ASC
    `);
    
    // Convert string values to appropriate types
    const foodsWithStats = rows.map(food => ({
      ...food,
      review_count: parseInt(food.review_count),
      average_rating: parseFloat(food.average_rating),
      value: food.value ? parseFloat(food.value) : null
    }));
    
    console.log(`✅ FOODS BY RESTAURANT: Retrieved ${foodsWithStats.length} foods from DATABASE QUERY`);
    console.log(`✅ FOODS BY RESTAURANT: Sample food ratings:`, foodsWithStats.slice(0, 3).map(f => ({id: f.id, name: f.name, rating: f.average_rating})));
    res.json({ data: foodsWithStats });
  } catch (err) {
    console.error('Database Query Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getFoodById = async (req, res) => {
  const { id } = req.params;
  try {
    console.log(`🍽️ FOOD BY ID: Fetching from DATABASE QUERY for food ${id}`);
    const { rows } = await db.query('SELECT * FROM foods WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Food item not found' });
    }
    const food = rows[0];
    const statsMap = await getFoodStatsMap([food.id]);
    const stats = statsMap[food.id] || { review_count: 0, average_rating: 0 };
    console.log(`🍽️ FOOD BY ID: Food ${id} has ${stats.review_count} reviews, avg rating: ${stats.average_rating}`);
    let value = null;
    if (stats.review_count > 0 && food.price > 0) {
      value = stats.average_rating / food.price;
    }
    res.json({
      ...food,
      average_rating: stats.average_rating,
      review_count: stats.review_count,
      value
    });
  } catch (err) {
    console.error('Database Query Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getFoodsByRestaurantId = async (req, res) => {
  const { restaurantId } = req.params;
  try {
    console.log(`🍽️ FOODS BY RESTAURANT: Fetching from DATABASE QUERY for restaurant ${restaurantId}`);
    
    // Single optimized query instead of multiple queries
    const { rows } = await db.query(`
      SELECT 
        f.*,
        COALESCE(COUNT(fr.id), 0) as review_count,
        COALESCE(AVG(fr.rating), 0) as average_rating,
        CASE 
          WHEN COUNT(fr.id) > 0 AND f.price > 0 
          THEN AVG(fr.rating) / f.price 
          ELSE NULL 
        END as value
      FROM foods f
      LEFT JOIN food_reviews fr ON f.id = fr.food_id
      WHERE f.restaurant_id = $1
      GROUP BY f.id
      ORDER BY f.id ASC
    `, [restaurantId]);
    
    // Convert string values to appropriate types
    const foodsWithStats = rows.map(food => ({
      ...food,
      review_count: parseInt(food.review_count),
      average_rating: parseFloat(food.average_rating),
      value: food.value ? parseFloat(food.value) : null
    }));
    
    console.log(`✅ FOODS BY RESTAURANT: Retrieved ${foodsWithStats.length} foods from DATABASE QUERY`);
    res.json(foodsWithStats);
  } catch (err) {
    console.error('Database Query Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const searchFoodsByRestaurantId = async (req, res) => {
  const { restaurantId } = req.params;
  const { q } = req.query; // search query parameter
  
  try {
    if (!q || q.trim() === '') {
      // If no search query, return all foods for the restaurant
      return getFoodsByRestaurantId(req, res);
    }

    console.log(`🔍 FOOD SEARCH: Fetching from DATABASE QUERY for restaurant ${restaurantId}, search term: "${q}"`);

    // Get all foods for the restaurant first (this will be cached)
    const { rows } = await db.query(`
      SELECT 
        f.*,
        COALESCE(COUNT(fr.id), 0) as review_count,
        COALESCE(AVG(fr.rating), 0) as average_rating,
        CASE 
          WHEN COUNT(fr.id) > 0 AND f.price > 0 
          THEN AVG(fr.rating) / f.price 
          ELSE NULL 
        END as value
      FROM foods f
      LEFT JOIN food_reviews fr ON f.id = fr.food_id
      WHERE f.restaurant_id = $1
      GROUP BY f.id
      ORDER BY f.id ASC
    `, [restaurantId]);

    // Convert string values to appropriate types
    const foodsWithStats = rows.map(food => ({
      ...food,
      review_count: parseInt(food.review_count),
      average_rating: parseFloat(food.average_rating),
      value: food.value ? parseFloat(food.value) : null
    }));

    // Client-side filtering - much faster than database queries
    const searchTerm = q.trim().toLowerCase();
    const filteredFoods = foodsWithStats.filter(food => 
      food.name.toLowerCase().includes(searchTerm) ||
      (food.description && food.description.toLowerCase().includes(searchTerm))
    );
    
    console.log(`✅ FOOD SEARCH: Found ${filteredFoods.length} results from DATABASE QUERY + LOCAL FILTERING`);
    res.json(filteredFoods);
  } catch (err) {
    console.error('Database Query Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};