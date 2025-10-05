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
    const { rows } = await db.query('SELECT * FROM foods ORDER BY id ASC');
    const foodIds = rows.map(f => f.id);
    const statsMap = await getFoodStatsMap(foodIds);
    const foodsWithStats = rows.map(food => {
      const stats = statsMap[food.id] || { review_count: 0, average_rating: 0 };
      let value = null;
      if (stats.review_count > 0 && food.price > 0) {
        value = stats.average_rating / food.price;
      }
      return {
        ...food,
        average_rating: stats.average_rating,
        review_count: stats.review_count,
        value
      };
    });
    res.json(foodsWithStats);
  } catch (err) {
    console.error('Database Query Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getFoodById = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query('SELECT * FROM foods WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Food item not found' });
    }
    const food = rows[0];
    const statsMap = await getFoodStatsMap([food.id]);
    const stats = statsMap[food.id] || { review_count: 0, average_rating: 0 };
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
    const { rows } = await db.query('SELECT * FROM foods WHERE restaurant_id = $1', [restaurantId]);
    const foodIds = rows.map(f => f.id);
    const statsMap = await getFoodStatsMap(foodIds);
    const foodsWithStats = rows.map(food => {
      const stats = statsMap[food.id] || { review_count: 0, average_rating: 0 };
      let value = null;
      if (stats.review_count > 0 && food.price > 0) {
        value = stats.average_rating / food.price;
      }
      return {
        ...food,
        average_rating: stats.average_rating,
        review_count: stats.review_count,
        value
      };
    });
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
    let query, params;
    
    if (!q || q.trim() === '') {
      // If no search query, return all foods for the restaurant
      return getFoodsByRestaurantId(req, res);
    }

    const searchTerm = `%${q.trim()}%`;
    query = `
      SELECT * FROM foods 
      WHERE restaurant_id = $1 
      AND (name ILIKE $2 OR description ILIKE $2)
      ORDER BY id ASC
    `;
    params = [restaurantId, searchTerm];

    const { rows } = await db.query(query, params);
    const foodIds = rows.map(f => f.id);
    const statsMap = await getFoodStatsMap(foodIds);
    const foodsWithStats = rows.map(food => {
      const stats = statsMap[food.id] || { review_count: 0, average_rating: 0 };
      let value = null;
      if (stats.review_count > 0 && food.price > 0) {
        value = stats.average_rating / food.price;
      }
      return {
        ...food,
        average_rating: stats.average_rating,
        review_count: stats.review_count,
        value
      };
    });
    res.json(foodsWithStats);
  } catch (err) {
    console.error('Database Query Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};