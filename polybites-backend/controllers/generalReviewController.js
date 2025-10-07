import db from '../models/db.js';

export const getGeneralReviews = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM general_reviews ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error('Database Query Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getGeneralReviewById = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query('SELECT * FROM general_reviews WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'General review not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Database Query Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getGeneralReviewsByRestaurantId = async (req, res) => {
  const { restaurantId } = req.params;
  try {
    const { rows } = await db.query(
      'SELECT * FROM general_reviews WHERE restaurant_id = $1 ORDER BY created_at DESC',
      [restaurantId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Database Query Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getGeneralReviewsByUserId = async (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    const { rows } = await db.query(
      `SELECT 
        gr.*,
        r.name as restaurant_name,
        COALESCE(l.like_count, 0) as like_count
       FROM general_reviews gr 
       JOIN restaurants r ON gr.restaurant_id = r.id 
       LEFT JOIN (
         SELECT general_review_id, COUNT(*) as like_count
         FROM general_review_likes
         GROUP BY general_review_id
       ) l ON gr.id = l.general_review_id
       WHERE gr.user_id = $1 
       ORDER BY gr.created_at DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Database Query Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createGeneralReview = async (req, res) => {
  const { user_id, restaurant_id, rating, text, anonymous } = req.body;

  try {
    const { rows } = await db.query(
      'INSERT INTO general_reviews (user_id, restaurant_id, rating, text, anonymous) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [user_id, restaurant_id, rating, text, anonymous]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Database Query Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteGeneralReview = async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // First check if the review exists and belongs to the user
    const { rows } = await db.query(
      'SELECT * FROM general_reviews WHERE id = $1 AND user_id = $2',
      [id, user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'General review not found or unauthorized' });
    }

    // Delete all likes associated with this review first
    await db.query('DELETE FROM general_review_likes WHERE general_review_id = $1', [id]);

    // Then delete the review
    await db.query('DELETE FROM general_reviews WHERE id = $1 RETURNING *', [id]);

    res.status(200).json({ message: 'Review deleted successfully' });
  } catch (err) {
    console.error('Database Query Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Like functionality

export const getLike = async (req, res) => {
  const { reviewId, userId } = req.params;

  if (!reviewId || !userId) {
    return res.status(400).json({ error: 'Review ID and User ID are required' });
  }

  try {
    const { rows } = await db.query(
      'SELECT * FROM general_review_likes WHERE general_review_id = $1 AND user_id = $2',
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
      'SELECT * FROM general_review_likes WHERE general_review_id = $1 AND user_id = $2',
      [review_id, user_id]
    );

    if (existingLike.length > 0) {
      // Like exists, so remove it
      await db.query(
        'DELETE FROM general_review_likes WHERE general_review_id = $1 AND user_id = $2',
        [review_id, user_id]
      );
    } else {
      // Like doesn't exist, so add it
      await db.query(
        'INSERT INTO general_review_likes (general_review_id, user_id) VALUES ($1, $2)',
        [review_id, user_id]
      );
    }

    // Get the updated like count
    const { rows: [likeCount] } = await db.query(
      'SELECT COUNT(*) as likes FROM general_review_likes WHERE general_review_id = $1',
      [review_id]
    );

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
      'SELECT COUNT(*) as likes FROM general_review_likes WHERE general_review_id = $1',
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

export const getGeneralReviewStats = async (req, res) => {
  const { restaurantId } = req.params;
  try {
    const { rows } = await db.query(
      `SELECT 
        COUNT(id) as review_count,
        COALESCE(AVG(rating), 0) as average_rating
       FROM general_reviews
       WHERE restaurant_id = $1
       GROUP BY restaurant_id`,
      [restaurantId]
    );
    res.json(rows[0] || { review_count: 0, average_rating: 0 });
  } catch (err) {
    console.error('Database Query Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const reportGeneralReview = async (req, res) => {
  const { general_review_id, reason, user_id } = req.body;

  if (!general_review_id) {
    return res.status(400).json({ error: 'General review ID is required' });
  }

  if (!user_id) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // Check if the review exists
    const { rows: reviewCheck } = await db.query(
      'SELECT id FROM general_reviews WHERE id = $1',
      [general_review_id]
    );

    if (reviewCheck.length === 0) {
      return res.status(404).json({ error: 'General review not found' });
    }

    // Create the report
    const { rows } = await db.query(
      'INSERT INTO general_review_reports (general_review_id, reason, user_id) VALUES ($1, $2, $3) RETURNING *',
      [general_review_id, reason, user_id]
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
