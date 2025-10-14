import db from '../models/db.js';
import { cache } from '../app.js';

export const getFoodReviews = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM food_reviews');
    res.json(rows);
  } catch (err) {
    console.error('Database Query Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getFoodReviewById = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query('SELECT * FROM food_reviews WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Food review not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Database Query Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getFoodReviewsByFoodId = async (req, res) => {
  const { foodId } = req.params;
  try {
    const { rows } = await db.query('SELECT * FROM food_reviews WHERE food_id = $1 ORDER BY id ASC', [foodId]);
    res.json(rows);
  } catch (err) {
    console.error('Database Query Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getFoodReviewsByRestaurantId = async (req, res) => {
  const { restaurantId } = req.params;
  try {
    const { rows } = await db.query(
      `SELECT fr.*, f.name as food_name 
       FROM food_reviews fr 
       JOIN foods f ON fr.food_id = f.id 
       WHERE f.restaurant_id = $1 
       ORDER BY fr.id ASC`,
      [restaurantId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Database Query Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getFoodReviewDetails = async (req, res) => {
  try {
    // Add pagination and limits to prevent excessive data transfer
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200); // Max 200 items per request
    const offset = (page - 1) * limit;
    
    // Get total count for pagination info
    const { rows: countRows } = await db.query('SELECT COUNT(DISTINCT r.id) FROM restaurants r');
    const totalCount = parseInt(countRows[0].count);
    
    const { rows } = await db.query(
      `SELECT 
        r.id as restaurant_id,
        r.name as restaurant_name,
        COUNT(fr.id) as review_count,
        COALESCE(AVG(fr.rating), 0) as average_rating
       FROM restaurants r
       LEFT JOIN foods f ON f.restaurant_id = r.id
       LEFT JOIN food_reviews fr ON fr.food_id = f.id
       GROUP BY r.id, r.name
       ORDER BY review_count DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
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

export const createFoodReview = async (req, res) => {
  const { user_id, food_id, rating, text, anonymous } = req.body;

  try {
    // Get restaurant_id for cache invalidation
    const { rows: foodRows } = await db.query('SELECT restaurant_id FROM foods WHERE id = $1', [food_id]);
    const restaurant_id = foodRows[0]?.restaurant_id;

    const { rows } = await db.query(
      'INSERT INTO food_reviews (user_id, food_id, rating, text, anonymous) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [user_id, food_id, rating, text, anonymous]
    );

    // Invalidate relevant caches
    console.log('🗑️ CACHE INVALIDATION: Clearing caches after new food review');
    cache.del('/api/food-reviews');
    cache.del(`/api/food-reviews/food/${food_id}`);
    cache.del(`/api/food-reviews/food/${food_id}/stats`);
    cache.del('/api/foods');
    cache.del(`/api/foods/restaurant/${restaurant_id}`);
    cache.del(`/api/foods/restaurant/${restaurant_id}?q=*`);
    
    // Clear restaurant stats caches (food reviews affect restaurant stats)
    if (restaurant_id) {
      cache.del('/api/restaurants');
      cache.del(`/api/restaurants/${restaurant_id}`);
      cache.del(`/api/restaurants/${restaurant_id}/stats`);
      cache.del(`/api/restaurants/search?q=*`);
    }

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Database Query Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getFoodReviewStats = async (req, res) => {
  const { foodId } = req.params;
  try {
    const { rows } = await db.query(
      `SELECT 
        COUNT(id) as review_count,
        COALESCE(AVG(rating), 0) as average_rating
       FROM food_reviews
       WHERE food_id = $1
       GROUP BY food_id`,
      [foodId]
    );
    res.json(rows[0] || { review_count: 0, average_rating: 0 });
  } catch (err) {
    console.error('Database Query Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getFoodReviewStatsByRestaurant = async (req, res) => {
  const { restaurantId } = req.params;
  try {
    const { rows } = await db.query(
      `SELECT 
        f.id as food_id,
        COUNT(fr.id) as review_count,
        COALESCE(AVG(fr.rating), 0) as average_rating
       FROM foods f
       LEFT JOIN food_reviews fr ON fr.food_id = f.id
       WHERE f.restaurant_id = $1
       GROUP BY f.id
       ORDER BY f.id`,
      [restaurantId]
    );
    
    // Convert to a map for easier frontend consumption
    const ratingsMap = {};
    rows.forEach(row => {
      ratingsMap[row.food_id] = {
        review_count: parseInt(row.review_count),
        average_rating: parseFloat(row.average_rating)
      };
    });
    
    res.json(ratingsMap);
  } catch (err) {
    console.error('Database Query Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteFoodReview = async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // First check if the review exists and belongs to the user, get food_id for cache invalidation
    const { rows } = await db.query(
      'SELECT food_id FROM food_reviews WHERE id = $1 AND user_id = $2',
      [id, user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Food review not found or unauthorized' });
    }

    const food_id = rows[0].food_id;

    // Get restaurant_id for cache invalidation
    const { rows: foodRows } = await db.query('SELECT restaurant_id FROM foods WHERE id = $1', [food_id]);
    const restaurant_id = foodRows[0]?.restaurant_id;

    // Delete all likes associated with this review first
    await db.query('DELETE FROM food_review_likes WHERE food_review_id = $1', [id]);

    // Then delete the review
    await db.query('DELETE FROM food_reviews WHERE id = $1 RETURNING *', [id]);

    // Invalidate relevant caches
    console.log('🗑️ CACHE INVALIDATION: Clearing caches after food review deletion');
    cache.del('/api/food-reviews');
    cache.del(`/api/food-reviews/food/${food_id}`);
    cache.del(`/api/food-reviews/food/${food_id}/stats`);
    cache.del('/api/foods');
    cache.del(`/api/foods/restaurant/${restaurant_id}`);
    cache.del(`/api/foods/restaurant/${restaurant_id}?q=*`);
    
    // Clear restaurant stats caches (food reviews affect restaurant stats)
    if (restaurant_id) {
      cache.del('/api/restaurants');
      cache.del(`/api/restaurants/${restaurant_id}`);
      cache.del(`/api/restaurants/${restaurant_id}/stats`);
      cache.del(`/api/restaurants/search?q=*`);
    }

    res.status(200).json({ message: 'Review deleted successfully' });
  } catch (err) {
    console.error('Database Query Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getLike = async (req, res) => {
  const { reviewId, userId } = req.params;

  if (!reviewId || !userId) {
    return res.status(400).json({ error: 'Review ID and User ID are required' });
  }

  try {
    const { rows } = await db.query(
      'SELECT * FROM food_review_likes WHERE food_review_id = $1 AND user_id = $2',
      [reviewId, userId]
    );
    res.json({ exists: rows.length > 0 });
  } catch (err) {
    console.error('Database Query Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const toggleLike = async (req, res) => {
  // Get review_id from URL params or body
  const review_id = req.params.reviewId || req.body.review_id;
  const { user_id } = req.body;

  if (!review_id || !user_id) {
    return res.status(400).json({ error: 'Review ID and User ID are required' });
  }

  try {
    // First check if the like already exists
    const { rows: existingLike } = await db.query(
      'SELECT * FROM food_review_likes WHERE food_review_id = $1 AND user_id = $2',
      [review_id, user_id]
    );

    if (existingLike.length > 0) {
      // Like exists, so remove it
      await db.query(
        'DELETE FROM food_review_likes WHERE food_review_id = $1 AND user_id = $2',
        [review_id, user_id]
      );
    } else {
      // Like doesn't exist, so add it
      await db.query(
        'INSERT INTO food_review_likes (food_review_id, user_id) VALUES ($1, $2)',
        [review_id, user_id]
      );
    }

    // Get the updated like count and food_id for cache invalidation
    const { rows: [likeCount] } = await db.query(
      'SELECT COUNT(*) as likes FROM food_review_likes WHERE food_review_id = $1',
      [review_id]
    );

    // Get food_id for cache invalidation
    const { rows: foodRows } = await db.query('SELECT food_id FROM food_reviews WHERE id = $1', [review_id]);
    const food_id = foodRows[0]?.food_id;

    if (food_id) {
      // Get restaurant_id for cache invalidation
      const { rows: restaurantRows } = await db.query('SELECT restaurant_id FROM foods WHERE id = $1', [food_id]);
      const restaurant_id = restaurantRows[0]?.restaurant_id;

      // Invalidate relevant caches (likes affect review display)
      console.log('🗑️ CACHE INVALIDATION: Clearing caches after like toggle');
      cache.del('/api/food-reviews');
      cache.del(`/api/food-reviews/food/${food_id}`);
      cache.del(`/api/food-reviews/food/${food_id}/stats`);
      cache.del('/api/foods');
      cache.del(`/api/foods/restaurant/${restaurant_id}`);
      cache.del(`/api/foods/restaurant/${restaurant_id}?q=*`);
      
      // Clear restaurant stats caches (likes don't affect stats, but keep consistency)
      cache.del('/api/restaurants');
      cache.del(`/api/restaurants/${restaurant_id}`);
      cache.del(`/api/restaurants/${restaurant_id}/stats`);
      cache.del(`/api/restaurants/search?q=*`);
    }

    res.json({ 
      likes: parseInt(likeCount.likes),
      liked: existingLike.length === 0 // If we added a like, user now likes it
    });
  } catch (err) {
    console.error('Database Query Error:', err.message);
    console.error('Error details:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};

export const getReviewLikes = async (req, res) => {
  const { reviewId } = req.params;

  try {
    const { rows: [result] } = await db.query(
      'SELECT COUNT(*) as likes FROM food_review_likes WHERE food_review_id = $1',
      [reviewId]
    );

    res.json({
      likes: parseInt(result.likes)
    });
  } catch (err) {
    console.error('Database Query Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 

export const getFoodReviewsByUserId = async (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    const { rows } = await db.query(
      `SELECT 
        fr.*,
        f.name as food_name,
        f.food_type AS food_type,
        r.name as restaurant_name,
        r.id as restaurant_id,
        COALESCE(l.like_count, 0) as like_count
       FROM food_reviews fr 
       JOIN foods f ON fr.food_id = f.id 
       JOIN restaurants r ON f.restaurant_id = r.id 
       LEFT JOIN (
         SELECT food_review_id, COUNT(*) as like_count
         FROM food_review_likes
         GROUP BY food_review_id
       ) l ON fr.id = l.food_review_id
       WHERE fr.user_id = $1 
       ORDER BY fr.created_at DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Database Query Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const reportFoodReview = async (req, res) => {
  const { food_review_id, reason, user_id } = req.body;

  if (!food_review_id) {
    return res.status(400).json({ error: 'Food review ID is required' });
  }

  if (!user_id) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // Check if the review exists
    const { rows: reviewCheck } = await db.query(
      'SELECT id FROM food_reviews WHERE id = $1',
      [food_review_id]
    );

    if (reviewCheck.length === 0) {
      return res.status(404).json({ error: 'Food review not found' });
    }

    // Create the report
    const { rows } = await db.query(
      'INSERT INTO food_review_reports (food_review_id, reason, user_id) VALUES ($1, $2, $3) RETURNING *',
      [food_review_id, reason, user_id]
    );

    res.status(201).json({ 
      message: 'Report submitted successfully',
      report: rows[0]
    });
  } catch (err) {
    console.error('Database Query Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};