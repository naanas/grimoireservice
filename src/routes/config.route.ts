import { Router } from 'express';
import { getConfig, updateConfig } from '../controllers/config.controller.js';
import { authenticateToken, verifyAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// Public read (or protected if sensitive)
router.get('/', getConfig);

// Admin write
router.put('/', authenticateToken, verifyAdmin, updateConfig);

export default router;
