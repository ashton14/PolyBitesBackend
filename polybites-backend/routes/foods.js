import express from 'express';
import { getFoods, getFoodById, getFoodsByRestaurantId, searchFoodsByRestaurantId } from '../controllers/foodController.js';

const router = express.Router();

router.get('/', getFoods);
router.get('/restaurant/:restaurantId', getFoodsByRestaurantId);
router.get('/restaurant/:restaurantId/search', searchFoodsByRestaurantId);
router.get('/:id', getFoodById);

export default router;