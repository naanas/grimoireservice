import { Router } from 'express';
import { authenticateToken, verifyAdmin } from '../middleware/auth.middleware.js';
import * as adminController from '../controllers/admin.controller.js';
const router = Router();
// Protect all admin routes
router.use(authenticateToken, verifyAdmin);
router.get('/stats', adminController.getDashboardStats);
router.get('/transactions', adminController.getAllTransactions);
router.post('/transactions/:id/retry', adminController.retryTransaction);
router.get('/products', adminController.getAllProducts);
router.patch('/products/:id/price', adminController.updateProductPrice);
router.post('/products/sync', adminController.syncProducts);
router.get('/categories', adminController.getAllCategories);
router.patch('/categories/:id', adminController.updateCategory);
// Payment method management
router.get('/payment-methods', adminController.getPaymentMethods);
router.post('/payment-methods/toggle', adminController.togglePaymentMethod);
// Review moderation
router.get('/reviews', adminController.getAllReviews);
router.patch('/reviews/:id/approve', adminController.approveReview);
router.delete('/reviews/:id', adminController.deleteReview);
export default router;
//# sourceMappingURL=admin.route.js.map