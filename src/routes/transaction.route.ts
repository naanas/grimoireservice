import { Router } from 'express';
import { createTransaction, getProducts, handleIpaymuCallback, getTransaction, getCategories, createDeposit, getHistory, checkGameId, handleApigamesWebhook, getVendorProducts, checkTransactionStatus, mockApigamesCallback } from '../controllers/transaction.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createTransactionSchema, createDepositSchema } from '../schemas/transaction.schema.js';

const router = Router();

router.get('/history', authenticateToken, getHistory);
router.get('/categories', getCategories);
router.get('/products', getProducts);
router.get('/check/:id', getTransaction);
router.post('/create', validate(createTransactionSchema), createTransaction); // Create handles its own auth for Balance
router.post('/deposit', authenticateToken, validate(createDepositSchema), createDeposit); // Deposit PROTECTED
router.post('/check-id', checkGameId); // Public
router.get('/vendor-products', getVendorProducts);
router.post('/check-status/:id', checkTransactionStatus);
router.post('/dev/mock-callback', mockApigamesCallback); // DEV ONLY
router.post('/callback/ipaymu', handleIpaymuCallback);
router.post('/callback/apigames', handleApigamesWebhook);

export default router;
