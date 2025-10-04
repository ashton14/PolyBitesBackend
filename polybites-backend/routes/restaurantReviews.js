import express from 'express';
import { getRestaurantReviews } from '../controllers/restaurantReviewController.js';

const router = express.Router();

router.get('/', getRestaurantReviews);

export default router;