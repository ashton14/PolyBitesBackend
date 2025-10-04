import express from 'express';
import { getFoods, getFoodById, getFoodsByRestaurantId } from '../controllers/foodController.js';

const router = express.Router();

router.get('/', getFoods);
router.get('/restaurant/:restaurantId', getFoodsByRestaurantId);
router.get('/:id', getFoodById);

export default router;