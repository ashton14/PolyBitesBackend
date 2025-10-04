import express from 'express';
import { createMessage, getMessages, getMessageById } from '../controllers/messageController.js';

const router = express.Router();

router.post('/', createMessage);
router.get('/', getMessages);
router.get('/:id', getMessageById);

export default router;

