import db from '../models/db.js';

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
       ORDER BY review_count DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Database Query Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createFoodReview = async (req, res) => {
  const { user_id, food_id, rating, text, anonymous } = req.body;

  try {
    const { rows } = await db.query(
      'INSERT INTO food_reviews (user_id, food_id, rating, text, anonymous) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [user_id, food_id, rating, text, anonymous]
    );
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
    // First check if the review exists and belongs to the user
    const { rows } = await db.query(
      'SELECT * FROM food_reviews WHERE id = $1 AND user_id = $2',
      [id, user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Food review not found or unauthorized' });
    }

    // Delete all likes associated with this review first
    await db.query('DELETE FROM likes WHERE food_review_id = $1', [id]);

    // Then delete the review
    await db.query('DELETE FROM food_reviews WHERE id = $1 RETURNING *', [id]);

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
      'SELECT * FROM likes WHERE food_review_id = $1 AND user_id = $2',
      [reviewId, userId]
    );
    res.json({ exists: rows.length > 0 });
  } catch (err) {
    console.error('Database Query Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const toggleLike = async (req, res) => {
  const { review_id, user_id } = req.body;

  if (!review_id || !user_id) {
    return res.status(400).json({ error: 'Review ID and User ID are required' });
  }

  try {
    // First check if the like already exists
    const { rows: existingLike } = await db.query(
      'SELECT * FROM likes WHERE food_review_id = $1 AND user_id = $2',
      [review_id, user_id]
    );

    if (existingLike.length > 0) {
      // Like exists, so remove it
      await db.query(
        'DELETE FROM likes WHERE food_review_id = $1 AND user_id = $2',
        [review_id, user_id]
      );
    } else {
      // Like doesn't exist, so add it
      await db.query(
        'INSERT INTO likes (food_review_id, user_id) VALUES ($1, $2)',
        [review_id, user_id]
      );
    }

    // Get the updated like count
    const { rows: [likeCount] } = await db.query(
      'SELECT COUNT(*) as likes FROM likes WHERE food_review_id = $1',
      [review_id]
    );

    res.json({ 
      likes: parseInt(likeCount.likes),
      liked: existingLike.length === 0 // If we added a like, user now likes it
    });
  } catch (err) {
    console.error('Database Query Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getReviewLikes = async (req, res) => {
  const { reviewId } = req.params;

  try {
    const { rows: [result] } = await db.query(
      'SELECT COUNT(*) as likes FROM likes WHERE food_review_id = $1',
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
         FROM likes
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