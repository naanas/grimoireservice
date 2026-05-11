import { Router } from 'express';
import { getConfig, updateConfig, getAllConfig } from '../controllers/config.controller.js';
import { authenticateToken, verifyAdmin } from '../middleware/auth.middleware.js';
const router = Router();
// Public read (Filtered)
router.get('/', getConfig);
// Admin read (Full)
router.get('/all', authenticateToken, verifyAdmin, getAllConfig);
// Admin write
router.put('/', authenticateToken, verifyAdmin, updateConfig);
export default router;
//# sourceMappingURL=config.route.js.map