import { VoucherType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
export const checkVoucher = async (req, res) => {
    try {
        const { code, amount } = req.body;
        if (!code)
            return res.status(400).json({ success: false, message: "Code is required" });
        const voucher = await prisma.voucher.findUnique({
            where: { code }
        });
        if (!voucher) {
            console.warn(`[Voucher] Code not found: ${code}`);
            return res.status(400).json({ success: false, message: "Voucher not found" });
        }
        if (!voucher.isActive) {
            return res.status(400).json({ success: false, message: "Voucher is inactive" });
        }
        if (new Date() > voucher.expiresAt) {
            return res.status(400).json({ success: false, message: "Voucher expired" });
        }
        if (voucher.stock <= 0) {
            return res.status(400).json({ success: false, message: "Voucher out of stock" });
        }
        if (amount < voucher.minPurchase) {
            return res.status(400).json({ success: false, message: `Min purchase Rp ${voucher.minPurchase.toLocaleString()}` });
        }
        // Calculate Discount
        let discount = 0;
        if (voucher.type === 'FIXED') {
            discount = voucher.amount;
        }
        else if (voucher.type === 'PERCENTAGE') {
            discount = (amount * voucher.amount) / 100;
            if (voucher.maxDiscount && discount > voucher.maxDiscount) {
                discount = voucher.maxDiscount;
            }
        }
        // Ensure discount doesn't exceed total
        if (discount > amount)
            discount = amount;
        res.json({
            success: true,
            data: {
                code: voucher.code,
                discount,
                finalPrice: amount - discount
            }
        });
    }
    catch (error) {
        console.error("Check Voucher Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
//# sourceMappingURL=voucher.controller.js.map