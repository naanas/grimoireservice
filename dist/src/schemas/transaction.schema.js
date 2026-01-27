import { z } from 'zod';
export const createTransactionSchema = z.object({
    productId: z.string().min(1, 'Product ID is required'),
    userId: z.string().min(1, 'User/Target ID (Game ID) is required'),
    zoneId: z.string().optional(),
    paymentMethod: z.enum(['BALANCE', 'QRIS', 'VA', 'EWALLET', 'RETAIL', 'Qris', 'CreditCard'], {
        error: () => ({ message: 'Invalid Payment Method' })
    }),
    authUserId: z.string().optional(), // Optional, for guest tracking if needed
    guestContact: z.string().optional(), // WhatsApp number for notifications
});
export const createDepositSchema = z.object({
    amount: z.number().int().positive('Amount must be a positive number').min(10000, 'Minimum deposit is Rp10.000'),
    paymentMethod: z.string().min(1, 'Payment Method is required'),
    // userId is NO LONGER required in body for security (IDOR prevention). We get it from the token.
});
//# sourceMappingURL=transaction.schema.js.map