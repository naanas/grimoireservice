import { Router } from 'express';
import { createTransaction, getProducts, handleIpaymuCallback, getTransaction, getCategories, createDeposit, getHistory, checkGameId, handleApigamesWebhook, getVendorProducts } from '../controllers/transaction.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
const router = Router();
router.get('/history', authenticateToken, getHistory);
router.get('/categories', getCategories);
router.get('/products', getProducts);
router.get('/check/:id', getTransaction);
router.post('/create', createTransaction); // Create handles its own auth for Balance
router.post('/deposit', createDeposit); // Deposit can be public or protected. Let's keep it public for now as it takes userId in body (admin style) or refactor to protected. 
router.post('/check-id', checkGameId);
router.get('/vendor-products', getVendorProducts);
router.post('/callback/ipaymu', handleIpaymuCallback);
router.post('/callback/apigames', handleApigamesWebhook);
export default router;
//# sourceMappingURL=transaction.route.js.map