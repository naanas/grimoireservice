import { Router } from 'express';
import { register, login, getProfile, googleLogin, verifyEmail, completeProfile } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.get('/verify-email', verifyEmail);
router.get('/me', authenticateToken, getProfile); // Fetch Fresh User Data
router.post('/complete-profile', authenticateToken, completeProfile);

export default router;
