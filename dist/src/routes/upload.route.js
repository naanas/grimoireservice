import express from 'express';
import { uploadFile } from '../controllers/upload.controller.js';
import { authenticateToken, verifyAdmin } from '../middleware/auth.middleware.js';
const router = express.Router();
// Protected: Admin only
router.post('/', authenticateToken, verifyAdmin, uploadFile);
export default router;
//# sourceMappingURL=upload.route.js.map