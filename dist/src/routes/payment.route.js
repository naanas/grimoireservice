import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller.js';
const router = Router();
// Public endpoint - get active payment methods
router.get('/methods', paymentController.getActivePaymentMethods);
export default router;
//# sourceMappingURL=payment.route.js.map