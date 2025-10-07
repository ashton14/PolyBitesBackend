import express from 'express';
import { 
  getGeneralReviews, 
  getGeneralReviewById, 
  createGeneralReview, 
  getGeneralReviewsByRestaurantId, 
  getGeneralReviewsByUserId,
  deleteGeneralReview, 
  getLike, 
  toggleLike, 
  getReviewLikes,
  getGeneralReviewStats
} from '../controllers/generalReviewController.js';

const router = express.Router();

// More specific routes first
router.get('/restaurant/:restaurantId/stats', getGeneralReviewStats);
router.get('/restaurant/:restaurantId', getGeneralReviewsByRestaurantId);
router.get('/user/:userId', getGeneralReviewsByUserId);

// Like routes
router.get('/:reviewId/likes', getReviewLikes);
router.post('/:reviewId/toggle-like', toggleLike);
router.get('/:reviewId/like/:userId', getLike);

// Generic routes last
router.get('/', getGeneralReviews);
router.post('/', createGeneralReview);
router.delete('/:id', deleteGeneralReview);
router.get('/:id', getGeneralReviewById);

export default router;

