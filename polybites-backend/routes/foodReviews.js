import express from 'express';
import { getFoodReviews, getFoodReviewById, createFoodReview, getFoodReviewsByFoodId, getFoodReviewsByRestaurantId, getFoodReviewDetails, getFoodReviewStats, getFoodReviewStatsByRestaurant, deleteFoodReview, getLike, toggleLike, getReviewLikes, getFoodReviewsByUserId } from '../controllers/foodReviewController.js';

const router = express.Router();

// More specific routes first
router.get('/food-review-details', getFoodReviewDetails);
router.get('/food/:foodId/stats', getFoodReviewStats);
router.get('/restaurant/:restaurantId/stats', getFoodReviewStatsByRestaurant);
router.get('/food/:foodId', getFoodReviewsByFoodId);
router.get('/restaurant/:restaurantId', getFoodReviewsByRestaurantId);
router.get('/user/:userId', getFoodReviewsByUserId);

// Like routes
router.get('/:reviewId/likes', getReviewLikes);
router.post('/:reviewId/toggle-like', toggleLike);
router.get('/:reviewId/like/:userId', getLike);

// Generic routes last
router.get('/', getFoodReviews);
router.post('/', createFoodReview);
router.delete('/:id', deleteFoodReview);
router.get('/:id', getFoodReviewById);

export default router;