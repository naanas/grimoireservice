import { prisma } from '../lib/prisma.js';
// Payment channels list (must match frontend PaymentChannels.ts)
const PAYMENT_CHANNELS = [
    { code: 'qris', name: 'QRIS', method: 'qris', group: 'QRIS' },
    { code: 'bca', name: 'BCA Virtual Account', method: 'va', group: 'Virtual Account' },
    { code: 'mandiri', name: 'Mandiri Virtual Account', method: 'va', group: 'Virtual Account' },
    { code: 'bni', name: 'BNI Virtual Account', method: 'va', group: 'Virtual Account' },
    { code: 'bri', name: 'BRI Virtual Account', method: 'va', group: 'Virtual Account' },
    { code: 'cimb', name: 'CIMB Niaga VA', method: 'va', group: 'Virtual Account' },
    { code: 'permata', name: 'Permata Virtual Account', method: 'va', group: 'Virtual Account' },
    { code: 'indomaret', name: 'Indomaret', method: 'cstore', group: 'Retail' },
    { code: 'alfamart', name: 'Alfamart', method: 'cstore', group: 'Retail' },
    { code: 'dana', name: 'DANA', method: 'ewallet', group: 'E-Wallet' },
    { code: 'ovo', name: 'OVO', method: 'ewallet', group: 'E-Wallet' },
    { code: 'shopeepay', name: 'ShopeePay', method: 'ewallet', group: 'E-Wallet' },
    { code: 'linkaja', name: 'LinkAja', method: 'ewallet', group: 'E-Wallet' }
];
// GET /api/payment/methods - Get ACTIVE payment methods only (Public)
export const getActivePaymentMethods = async (req, res) => {
    try {
        // Get all payment method configs from SystemConfig
        const configs = await prisma.systemConfig.findMany({
            where: {
                key: {
                    startsWith: 'payment_method_'
                }
            }
        });
        // Create a map of code -> status
        const statusMap = {};
        configs.forEach((config) => {
            const code = config.key.replace('payment_method_', '');
            statusMap[code] = config.value === 'active';
        });
        // Filter only active payment methods
        const activeMethods = PAYMENT_CHANNELS.filter(channel => {
            // If not configured, default to active
            return statusMap[channel.code] !== undefined ? statusMap[channel.code] : true;
        });
        res.json({ success: true, data: activeMethods });
    }
    catch (error) {
        console.error("Get Active Payment Methods Error:", error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
//# sourceMappingURL=payment.controller.js.map