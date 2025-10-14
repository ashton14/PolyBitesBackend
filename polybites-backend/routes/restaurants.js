import express from 'express';
import { getRestaurants, getRestaurantById, searchRestaurants, getRestaurantStats } from '../controllers/restaurantController.js';

const router = express.Router();

router.get('/', getRestaurants);
router.get('/search', searchRestaurants);
router.get('/:id/stats', getRestaurantStats); // Specific route before generic :id
router.get('/:id', getRestaurantById);

export default router;