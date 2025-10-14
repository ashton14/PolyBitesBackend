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

// Caching middleware
const cacheMiddleware = (duration = 300) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    const key = req.originalUrl;
    const cachedData = cache.get(key);
    
    if (cachedData) {
      console.log(`Cache HIT for: ${key}`);
      return res.json(cachedData);
    }
    
    console.log(`Cache MISS for: ${key}`);
    
    // Store original res.json
    const originalJson = res.json;
    res.json = function(data) {
      cache.set(key, data, duration);
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
app.use('/api/restaurants', cacheMiddleware(600), restaurantRoutes); // 10 min cache
app.use('/api/foods', cacheMiddleware(600), foodRoutes); // 10 min cache

// API Routes without caching (dynamic data)
app.use('/api/profiles', profileRoutes); // No cache - user data changes frequently
app.use('/api/food-reviews', foodReviewRoutes); // No cache - reviews added frequently
app.use('/api/restaurant-reviews', restaurantReviewRoutes); // No cache - reviews added frequently
app.use('/api/general-reviews', generalReviewRoutes); // No cache - reviews added frequently
app.use('/api/messages', messageRoutes); // No cache - real-time messages

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  // Server is running
});