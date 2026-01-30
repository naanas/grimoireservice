import { Router } from 'express';
import { createTransaction, getProducts, handleIpaymuCallback, handleVipCallback, getTransaction, getCategories, getCategoryBySlug, createDeposit, getHistory, checkGameId, getVendorProducts, checkTransactionStatus, getBestSellingCategories, getPopularCategories } from '../controllers/transaction.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createTransactionSchema, createDepositSchema } from '../schemas/transaction.schema.js';
import { checkGameIdSchema } from '../schemas/transaction.verify.schema.js';
const router = Router();
router.get('/history', authenticateToken, getHistory);
router.get('/categories', getCategories);
router.get('/categories/best-selling', getBestSellingCategories);
router.get('/categories/popular', getPopularCategories);
router.get('/categories/:slug', getCategoryBySlug);
router.get('/products', getProducts);
router.get('/check/:id', getTransaction);
router.post('/create', validate(createTransactionSchema), createTransaction); // Create handles its own auth for Balance
router.post('/deposit', authenticateToken, validate(createDepositSchema), createDeposit); // Deposit PROTECTED
router.post('/check-id', validate(checkGameIdSchema), checkGameId); // Public
router.get('/vendor-products', getVendorProducts);
router.post('/check-status/:id', checkTransactionStatus);
router.post('/callback/ipaymu', handleIpaymuCallback);
router.post('/callback/vip', handleVipCallback);
export default router;
//# sourceMappingURL=transaction.route.js.map