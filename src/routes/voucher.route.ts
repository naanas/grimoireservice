import { Router } from 'express';
import { checkVoucher } from '../controllers/voucher.controller.js';

const router = Router();

router.post('/check', checkVoucher);

export default router;
