import express from 'express';
import { getCurrentUser, login } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.get('/me', protect, getCurrentUser);

export default router;
