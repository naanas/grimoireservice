import express from 'express';
import { authenticateToken as strictAuth, verifyAdmin, optionalAuthenticate } from '../middleware/auth.middleware.js';
import { startSession, getSessionById, getActiveSessions, endSession } from '../controllers/chat.controller.js';
const router = express.Router();
router.post('/session/guest', startSession);
router.post('/session/user', strictAuth, startSession);
router.post('/session/end', optionalAuthenticate, endSession);
router.get('/session/:sessionId', getSessionById);
// Admin Routes
router.get('/admin/sessions', strictAuth, verifyAdmin, getActiveSessions);
export default router;
//# sourceMappingURL=chat.route.js.map