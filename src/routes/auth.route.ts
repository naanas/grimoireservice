import { Router } from 'express';
import { register, login, getProfile, googleLogin } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.get('/me', authenticateToken, getProfile); // Fetch Fresh User Data

export default router;
