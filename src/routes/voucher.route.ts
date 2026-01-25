import { Router } from 'express';
import { checkVoucher } from '../controllers/voucher.controller.js';

const router = Router();

router.get('/', (req, res) => {
    res.json({ success: true, message: "Voucher API Active" });
});

router.post('/check', checkVoucher);
export default router;
