-- Essential database indexes to improve query performance and reduce egress
-- Run these in your Supabase SQL editor or database client

-- Indexes for foreign key relationships (most important)
CREATE INDEX IF NOT EXISTS idx_foods_restaurant_id ON foods(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_food_reviews_food_id ON food_reviews(food_id);
CREATE INDEX IF NOT EXISTS idx_food_reviews_user_id ON food_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_general_reviews_restaurant_id ON general_reviews(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_messages_profile_id ON messages(profile_id);

-- Indexes for frequently used ORDER BY clauses
CREATE INDEX IF NOT EXISTS idx_food_reviews_created_at ON food_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_foods_id ON foods(id);
CREATE INDEX IF NOT EXISTS idx_restaurants_id ON restaurants(id);

-- Composite index for restaurant stats queries (most expensive queries)
CREATE INDEX IF NOT EXISTS idx_food_reviews_food_restaurant ON food_reviews(food_id) INCLUDE (rating);
CREATE INDEX IF NOT EXISTS idx_foods_restaurant_id_composite ON foods(restaurant_id, id);

-- Index for search functionality
CREATE INDEX IF NOT EXISTS idx_restaurants_name_search ON restaurants USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_foods_name_search ON foods USING gin(to_tsvector('english', name));

-- Index for like/dislike queries
CREATE INDEX IF NOT EXISTS idx_food_review_likes_review_user ON food_review_likes(food_review_id, user_id);
