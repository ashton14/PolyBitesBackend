import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

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

// API Routes
app.use('/test', testRouter);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/food-reviews', foodReviewRoutes);
app.use('/api/restaurant-reviews', restaurantReviewRoutes);
app.use('/api/general-reviews', generalReviewRoutes);
app.use('/api/messages', messageRoutes);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  // Server is running
});