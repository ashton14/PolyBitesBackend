import express from 'express';
import { createMessage, getMessageById } from '../controllers/messageController.js';

const router = express.Router();

router.post('/', createMessage);
router.get('/:id', getMessageById);

export default router;

