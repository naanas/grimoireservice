import { Router } from 'express';
import { authenticateToken, verifyAdmin } from '../middleware/auth.middleware.js';
import * as adminController from '../controllers/admin.controller.js';

const router = Router();

// Protect all admin routes
router.use(authenticateToken, verifyAdmin as any);

router.get('/stats', adminController.getDashboardStats);

router.get('/transactions', adminController.getAllTransactions);

router.get('/products', adminController.getAllProducts);
router.patch('/products/:id/price', adminController.updateProductPrice);
router.post('/products/sync', adminController.syncProducts);

export default router;
