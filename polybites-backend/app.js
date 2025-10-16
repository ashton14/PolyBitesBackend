import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import NodeCache from 'node-cache';

import testRouter from './routes/test.js';
import restaurantRoutes from './routes/restaurants.js';
import profileRoutes from './routes/profiles.js';
import foodRoutes from './routes/foods.js';
import foodReviewRoutes from './routes/foodReviews.js';
import restaurantReviewRoutes from './routes/restaurantReviews.js';
import generalReviewRoutes from './routes/generalReviews.js';
import messageRoutes from './routes/messages.js';

dotenv.config(); // ✅ correct way to load .env in ESM

const app = express(); // <-- ONLY HERE do we declare 'app'

// Initialize cache with 5 minute default TTL
const cache = new NodeCache({ stdTTL: 300 });

// Caching middleware with selective caching (excludes user-specific endpoints)
const cacheMiddleware = (duration = 300) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Skip caching for user-specific endpoints
    const userSpecificPatterns = [
      '/like/',           // Like status endpoints: /api/food-reviews/130/like/userId
      '/user/',           // User-specific data: /api/food-reviews/user/userId
      '/toggle-like',     // Like toggle endpoints: /api/food-reviews/130/toggle-like
      '/likes'            // Like count endpoints: /api/food-reviews/130/likes
    ];
    
    const isUserSpecific = userSpecificPatterns.some(pattern => 
      req.originalUrl.includes(pattern)
    );
    
    if (isUserSpecific) {
      console.log(`🚫 SKIP CACHE for user-specific endpoint: ${req.originalUrl}`);
      return next();
    }
    
    const key = req.originalUrl;
    const cachedData = cache.get(key);
    
    if (cachedData) {
      console.log(`🚀 CACHE HIT for: ${key}`);
      
      // Determine data type and count for logging
      if (cachedData.data && Array.isArray(cachedData.data)) {
        if (key.includes('restaurant')) {
          console.log(`✅ RESTAURANTS: Retrieved ${cachedData.data.length} restaurants from PERMANENT CACHE`);
        } else if (key.includes('food')) {
          console.log(`✅ FOODS: Retrieved ${cachedData.data.length} foods from PERMANENT CACHE`);
        }
      } else if (Array.isArray(cachedData)) {
        if (key.includes('food')) {
          console.log(`✅ FOODS: Retrieved ${cachedData.length} foods from PERMANENT CACHE`);
        }
      }
      
      return res.json(cachedData);
    }
    
    console.log(`💾 CACHE MISS for: ${key}`);
    
    
    // Store original res.json
    const originalJson = res.json;
    res.json = function(data) {
      if (duration === 0) {
        // No TTL - cache forever until manually invalidated
        cache.set(key, data);
        console.log(`💾 CACHE STORED for: ${key} (NO TTL - invalidate only)`);
      } else {
        cache.set(key, data, duration);
        console.log(`💾 CACHE STORED for: ${key} (TTL: ${duration}s)`);
      }
      originalJson.call(this, data);
    };
    
    next();
  };
};

// Configure CORS
app.use(cors({
  origin: ['https://poly-bites-frontend.vercel.app', 'http://localhost:3000', 'https://www.polybites.org'], // Your frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Basic Route
app.get('/', (req, res) => {
  res.send('PolyBites Backend is running!');
});

// Cache management endpoints
app.post('/api/cache/clear', (req, res) => {
  cache.flushAll();
  res.json({ message: 'Cache cleared successfully' });
});

app.get('/api/cache/stats', (req, res) => {
  const stats = cache.getStats();
  res.json({
    keys: cache.keys().length,
    hits: stats.hits,
    misses: stats.misses,
    hitRate: stats.hits / (stats.hits + stats.misses) || 0
  });
});

// Export cache for use in controllers
export { cache };

// API Routes with caching (only for static data)
app.use('/test', testRouter);
app.use('/api/restaurants', cacheMiddleware(0), restaurantRoutes); // NO timeout - invalidate only
app.use('/api/foods', cacheMiddleware(0), foodRoutes); // NO timeout - invalidate only

// API Routes with cache invalidation (dynamic data with smart caching)
app.use('/api/profiles', cacheMiddleware(60), profileRoutes); // 1 min cache
app.use('/api/food-reviews', cacheMiddleware(0), foodReviewRoutes); // NO timeout - invalidate only
app.use('/api/restaurant-reviews', cacheMiddleware(0), restaurantReviewRoutes); // NO timeout - invalidate only
app.use('/api/general-reviews', cacheMiddleware(0), generalReviewRoutes); // NO timeout - invalidate only
app.use('/api/messages', messageRoutes); // No cache - real-time messages

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  // Server is running
});