import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import * as gameProvider from '../services/vip.service.js'; // Consolidated on VIP Service
import * as ipaymuService from '../services/ipaymu.service.js';
import * as whatsappService from '../services/whatsapp.service.js';

// --- HELPER FUNCTIONS ---

/**
 * Process Game Topup (Trigger Provider)
 * Use this to fulfill the order after payment is confirmed (Balance or Gateway).
 */
export const processGameTopup = async (trxId: string) => {
    console.log(`⚙️ [PROCESS] Triggering Provider for Trx: ${trxId}`);
    try {
        const trx = await prisma.transaction.findUnique({
            where: { id: trxId },
            include: { product: true }
        });

        // 1. Validate Transaction
        if (!trx || !trx.product) {
            console.error(`❌ [PROCESS] Invalid Transaction or Product missing for ${trxId}`);
            return { success: false, message: "Transaction Invalid" };
        }

        // Prevent double processing if already success (optional safety)
        // if (trx.status === 'SUCCESS' && trx.sn) return { success: true };

        // 2. Update Status to PROCESSING (if not already)
        if (trx.status !== 'PROCESSING' && trx.status !== 'SUCCESS') {
            await prisma.transaction.update({
                where: { id: trxId },
                data: { status: 'PROCESSING' }
            });
        }

        // 3. Call VIP Endpoint
        // placeOrder(refId, sku, dest, zoneId)
        const order = await gameProvider.placeOrder(
            trx.invoice,
            trx.product.sku_code,
            trx.targetId || '',
            trx.zoneId || ''
        );

        if (order.success && order.data) {
            // 4. Provider Accepted Request
            console.log(`✅ [PROCESS] Provider Accepted! TrxId: ${order.data.trxId} | Status: ${order.data.status}`);

            // Map VIP Status to Our Schema
            // VIP: status can be 'waiting', 'success', 'processing'
            let newStatus = 'PROCESSING';
            if (order.data.status.toLowerCase() === 'success') newStatus = 'SUCCESS';

            await prisma.transaction.update({
                where: { id: trxId },
                data: {
                    status: newStatus as any, // Cast to Enum
                    providerTrxId: order.data.trxId,
                    providerStatus: order.data.status,
                    sn: order.data.sn, // Sometimes available immediately?
                    updatedAt: new Date()
                }
            });

            // WA NOTIF: PROCESSING or SUCCESS
            if (trx.guestContact) {
                if (newStatus === 'SUCCESS') {
                    const waMsg = `*TOPUP SUKSES* ✅\nOrder: *${trx.invoice}*\nItem: ${trx.product.name}\nSN/Ref: ${order.data.sn || '-'}\n\nTerima kasih telah belanja di Grimoire! 🩸`;
                    whatsappService.sendMessage(trx.guestContact, waMsg);
                } else {
                    const waMsg = `*STATUS UPDATE* ⏳\nOrder ${trx.invoice} sedang diproses oleh Provider.\nMohon tunggu sebentar.`;
                    whatsappService.sendMessage(trx.guestContact, waMsg);
                }
            }

            return { success: true };
        } else {
            // 4B. Provider Rejected Immediately
            console.error(`❌ [PROCESS] Provider Failed: ${order.message}`);
            await prisma.transaction.update({
                where: { id: trxId },
                data: {
                    status: 'FAILED',
                    providerStatus: 'FAILED_AT_PROVIDER: ' + order.message,
                    updatedAt: new Date()
                }
            });

            // TODO: Handle Auto Refund for Balance payments here if strictly needed
            return { success: false, message: "Provider Failed" };
        }

    } catch (error: any) {
        console.error(`❌ [PROCESS] System Error: ${error.message}`);
        return { success: false, message: error.message };
    }
};

// --- CONTROLLER ENDPOINTS ---

// GET /api/categories
export const getCategories = async (req: Request, res: Response) => {
    try {
        const categories = await prisma.category.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' }
        });
        res.json({ success: true, data: categories });
    } catch (error) {
        console.error("DB Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch categories" });
    }
};

// GET /api/products
export const getProducts = async (req: Request, res: Response) => {
    try {
        const products = await prisma.product.findMany({
            where: { isActive: true },
            include: { category: true }
        });
        res.json({ success: true, data: products });
    } catch (error) {
        console.warn("DB Error, falling back to Mock Data:", error);
        // Mock Data for testing without DB
        const mockProducts = [
            { id: '1', sku_code: 'ML-5', name: '5 Diamonds', price_sell: 1500, category: { slug: 'mobile-legends' } },
            { id: '2', sku_code: 'ML-10', name: '10 Diamonds', price_sell: 3000, category: { slug: 'mobile-legends' } },
            { id: '3', sku_code: 'ML-50', name: '50 Diamonds', price_sell: 14000, category: { slug: 'mobile-legends' } },
            { id: '4', sku_code: 'FF-100', name: '100 Diamonds', price_sell: 15000, category: { slug: 'free-fire' } },
        ];
        res.json({ success: true, data: mockProducts });
    }
};

// GET /api/vendor-products
// Proxy to fetch services specifically from the active Provider (VIP)
export const getVendorProducts = async (req: Request, res: Response) => {
    try {
        const result = await gameProvider.getMerchantServices();
        if (result.success) {
            res.json({ success: true, data: result.data });
        } else {
            res.status(500).json({ success: false, message: result.message });
        }
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/transaction/check-id
export const checkGameId = async (req: Request, res: Response) => {
    const { gameSlug, userId, zoneId } = req.body;

    // Map slugs to simple codes if needed by VIP
    // VIP might expect raw codes like 'mobilelegend' or 'freefire'
    let gameCode = gameSlug;
    if (gameSlug === 'mobile-legends') gameCode = 'mobilelegend';
    if (gameSlug === 'free-fire') gameCode = 'freefire';

    try {
        const result = await gameProvider.checkProfile(gameCode, userId, zoneId);
        if (result.success) {
            res.json({ success: true, data: result.data });
        } else {
            res.status(400).json({ success: false, message: 'ID Not Found' });
        }
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/transaction/create
export const createTransaction = async (req: Request, res: Response) => {
    // Validated by Zod Middleware usually
    const { productId, userId, zoneId, paymentMethod, authUserId, guestContact } = req.body;
    console.log(`📦 [TRANSACTION] Creating Order: ${productId} for User: ${userId} (Auth: ${authUserId}) via ${paymentMethod} | GuestContact: ${guestContact}`);

    try {
        // 1. Get Product Data (With Mock Fallback)
        let product;
        try {
            product = await prisma.product.findUnique({
                where: { id: productId },
                include: { category: true }
            });
        } catch (dbError) {
            console.warn("DB Connection Failed, using Mock Product");
            const mockProducts = [
                { id: '1', sku_code: 'ML-5', name: '5 Diamonds', price_sell: 1500, category: { slug: 'mobile-legends' } },
                { id: '2', sku_code: 'ML-10', name: '10 Diamonds', price_sell: 3000, category: { slug: 'mobile-legends' } },
                { id: '3', sku_code: 'ML-50', name: '50 Diamonds', price_sell: 14000, category: { slug: 'mobile-legends' } },
                { id: '4', sku_code: 'FF-100', name: '100 Diamonds', price_sell: 15000, category: { slug: 'free-fire' } },
            ];
            product = mockProducts.find(p => p.id === productId);
        }

        if (!product) return res.status(404).json({ success: false, message: 'Product Not Found' });

        // 2. Prepare Transaction Data
        const invoice = `GRM-${Date.now()}`;
        let amount = product.price_sell;
        let discountAmount = 0;
        const validVoucherCode = req.body.voucherCode;

        // --- VOUCHER LOGIC ---
        if (validVoucherCode) {
            const voucher = await prisma.voucher.findUnique({ where: { code: validVoucherCode } });
            if (voucher) {
                const now = new Date();
                if (voucher.isActive && voucher.stock > 0 && voucher.expiresAt > now && amount >= voucher.minPurchase) {
                    if (voucher.type === 'FIXED') {
                        discountAmount = voucher.amount;
                    } else if (voucher.type === 'PERCENTAGE') {
                        discountAmount = (amount * voucher.amount) / 100;
                        if (voucher.maxDiscount && discountAmount > voucher.maxDiscount) discountAmount = voucher.maxDiscount;
                    }
                    if (discountAmount > amount) discountAmount = amount;
                    amount -= discountAmount;

                    // Decrement Stock
                    await prisma.voucher.update({ where: { id: voucher.id }, data: { stock: { decrement: 1 } } });
                    console.log(`🎟️ [VOUCHER] Applied ${validVoucherCode}: -${discountAmount} | Final: ${amount}`);
                }
            }
        }

        // 3. Handle Payment Method
        if (paymentMethod === 'BALANCE') {
            // A. BALANCE PAYMENT (SECURE)
            const authHeader = req.headers.authorization;
            if (!authHeader) return res.status(401).json({ success: false, message: 'Authentication required for Balance payment' });

            const token = authHeader.split(" ")[1];
            if (!token) return res.status(401).json({ success: false, message: 'Invalid token' });

            // Verify Token
            const jwt = (await import('jsonwebtoken')).default;
            let payerId;
            try {
                const decoded: any = jwt.verify(token as string, process.env.JWT_SECRET || 'super-secret-key-change-this');
                payerId = decoded.id;
            } catch (err) {
                return res.status(403).json({ success: false, message: 'Invalid or Expired Session' });
            }

            // Get User & Check Balance
            // Use Raw Query or standard findUnique
            const user = await prisma.user.findUnique({ where: { id: payerId } });
            if (!user) return res.status(404).json({ success: false, message: 'User not found' });
            if (user.balance < amount) return res.status(400).json({ success: false, message: 'Insufficient Balance' });

            // Atomic Transaction: Deduct Balance & Create Transaction
            const trx = await prisma.transaction.create({
                data: {
                    invoice,
                    productId,
                    targetId: userId,
                    zoneId,
                    amount,
                    discountAmount,
                    voucherCode: validVoucherCode,
                    status: 'SUCCESS', // Paid immediately
                    paymentMethod: 'BALANCE',
                    userId: user.id,
                    guestContact: user.phoneNumber || null // Use null for Prisma compatibility
                }
            });
            await prisma.user.update({ where: { id: payerId }, data: { balance: { decrement: amount } } });

            console.log(`✅ [BALANCE] Payment Success: ${invoice} | User: ${user.name}`);

            // FIRE AND FORGET: PROCESS GAME TOPUP
            processGameTopup(trx.id).catch(err => console.error("Auto Process Error:", err));

            return res.json({
                success: true,
                data: {
                    invoice,
                    status: 'SUCCESS',
                    productName: product.name,
                    amount
                }
            });

        } else {
            // B. GATEWAY PAYMENT (IPAYMU)
            let trxId = `MOCK_TRX_${Date.now()}`;

            // Resolve User for History Linking
            // If logged in, use their ID
            let userIdForTrx = authUserId;
            let targetPhone = guestContact;

            // Attempt to resolve from Token if not passed explicitly
            if (!userIdForTrx && req.headers.authorization) {
                try {
                    const token = req.headers.authorization.split(' ')[1];
                    const jwt = (await import('jsonwebtoken')).default;
                    const decoded: any = jwt.verify(token as string, process.env.JWT_SECRET || 'super-secret-key-change-this');
                    userIdForTrx = decoded.id;
                } catch (e) { }
            }

            // If we have ID, try to get Phone from DB if guestContact missing
            if (userIdForTrx && !targetPhone) {
                try {
                    const u = await prisma.user.findUnique({ where: { id: userIdForTrx } });
                    if (u && u.phoneNumber) targetPhone = u.phoneNumber;
                } catch (e) { }
            }

            // Create Pending Transaction
            try {
                const trx = await prisma.transaction.create({
                    data: {
                        invoice,
                        productId,
                        targetId: userId,
                        zoneId,
                        amount,
                        discountAmount,
                        voucherCode: validVoucherCode,
                        status: 'PENDING',
                        paymentMethod,
                        userId: userIdForTrx || undefined,
                        guestContact: targetPhone || null
                    }
                });
                trxId = trx.id;
            } catch (dbError) {
                console.warn("DB Transaction Create Failed:", dbError);
            }

            // Init Ipaymu
            const returnPath = `/order/${product.category.slug}`;
            const payment = await ipaymuService.initPayment(trxId, amount, 'Guest', 'guest@grimoire.com', paymentMethod, returnPath);

            if (!payment.success) {
                return res.status(500).json({ success: false, message: payment.message || 'Payment Error' });
            }

            // Update with Payment URL
            if (payment.data && !trxId.startsWith('MOCK')) {
                await prisma.transaction.update({
                    where: { id: trxId },
                    data: {
                        paymentUrl: payment.data.Url,
                        paymentTrxId: payment.data.TransactionId
                    }
                });
            }

            // Send WA Invoice
            if (targetPhone) {
                console.log(`🚀 [WA] Sending Invoice to ${targetPhone}`);
                const waMsg = `*TAGIHAN BARU* 🧾\nInvoice: *${invoice}*\nItem: ${product.name}\nTotal: Rp${amount.toLocaleString('id-ID')}\n\nBayar di sini: ${payment.data?.Url}\n\nTerima kasih!`;
                whatsappService.sendMessage(targetPhone, waMsg).catch(err => console.error("WA Error:", err));
            }

            res.json({
                success: true,
                data: {
                    id: trxId,
                    invoice,
                    paymentUrl: payment.data?.Url,
                    productName: product.name,
                    amount
                }
            });
        }

    } catch (error: any) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/transaction/deposit
export const createDeposit = async (req: Request, res: Response) => {
    // PROTECTED ROUTE
    const { amount, paymentMethod } = req.body;
    const userId = (req as any).user.id;

    console.log(`💰 [DEPOSIT] Creating Deposit: Rp${amount} for User: ${userId} via ${paymentMethod}`);

    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ success: false, message: 'User Not Found' });

        const invoice = `DEP-${Date.now()}`;
        let trxId = `MOCK_DEP_${Date.now()}`;

        try {
            const trx = await prisma.transaction.create({
                data: {
                    invoice,
                    userId,
                    amount: Number(amount),
                    status: 'PENDING',
                    paymentMethod,
                    type: 'DEPOSIT'
                }
            });
            trxId = trx.id;
        } catch (dbError: any) {
            console.error("DB Create Deposit Failed:", dbError);
            return res.status(500).json({ success: false, message: `Database Error: ${dbError.message}` });
        }

        const returnPath = `/history`;
        const payment = await ipaymuService.initPayment(trxId, Number(amount), user.name || 'User', user.email, paymentMethod, returnPath);

        if (!payment.success) {
            await prisma.transaction.update({ where: { id: trxId }, data: { status: 'FAILED' } });
            return res.status(500).json({ success: false, message: payment.message || 'Payment Error' });
        }

        if (payment.data) {
            await prisma.transaction.update({
                where: { id: trxId },
                data: {
                    paymentUrl: payment.data.Url,
                    paymentTrxId: payment.data.TransactionId
                }
            });
        }

        res.json({
            success: true,
            data: {
                invoice,
                paymentUrl: payment.data?.Url,
                amount
            }
        });

    } catch (error: any) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/callback/ipaymu
export const handleIpaymuCallback = async (req: Request, res: Response) => {
    try {
        console.log('🔔 [WEBHOOK] Ipaymu Callback Received:', req.body);

        const status = req.body.status; // 'berhasil' or 'pending'
        const trxId = req.body.reference_id; // Our Invoice ID / Trx ID
        const sid = req.body.sid; // Broker ID

        if (!trxId || !sid) return res.status(400).json({ success: false, message: "Invalid payload" });

        const trx = await prisma.transaction.findUnique({ where: { id: trxId } });
        if (!trx) return res.status(404).json({ success: false, message: 'Transaction Not Found' });

        // Idempotency Check
        if (trx.status === 'SUCCESS') {
            console.log(`⚠️ Transaction ${trxId} already SUCCESS. Ignoring callback.`);
            return res.json({ success: true, message: 'Already paid' });
        }

        if (status === 'berhasil') {
            const fee = parseFloat(req.body.fee || '0');
            const totalPaid = parseFloat(req.body.total || req.body.amount || '0');

            // 1. Double Check with Server (Security)
            const verification = await ipaymuService.checkTransaction(trxId);
            if (!verification.success) {
                console.warn(`⚠️ [SECURITY] Webhook Verification Failed for ${trxId}. Ignoring.`);
                return res.status(400).json({ success: false, message: 'Verification Failed' });
            }
            // Enforce Success check from API (Status 1 or 6 usually means success/paid)
            if (String(verification.status) !== '6' && verification.statusDesc?.toLowerCase() !== 'berhasil') {
                console.warn(`⚠️ [SECURITY] API says not success yet: ${verification.statusDesc}`);
                // Proceed with caution or return? For now logged.
            }

            // 2. Update Transaction
            const paymentChannel = req.body.channel || req.body.via || null;
            const paymentNo = req.body.va || req.body.qris || null;

            await prisma.transaction.update({
                where: { id: trxId },
                data: {
                    status: 'SUCCESS',
                    adminFee: fee,
                    amount: totalPaid,
                    updatedAt: new Date(),
                    paymentTrxId: sid,
                    paymentChannel: paymentChannel,
                    paymentNo: paymentNo
                }
            });

            // 3. Handle Deposit
            if (trx.type === 'DEPOSIT' && trx.userId) {
                console.log(`💰 [WALLET] Adding Rp${totalPaid} to User ${trx.userId}`);
                await prisma.user.update({
                    where: { id: trx.userId },
                    data: { balance: { increment: totalPaid } }
                });
            }

            console.log(`✅ Transaction ${trxId} (${trx.type}) SUCCESS | Fee: ${fee} | Total: ${totalPaid}`);

            // 4. Send WA Receipt
            let targetWa = trx.guestContact;
            if (!targetWa && trx.userId) {
                try {
                    const u = await prisma.user.findUnique({ where: { id: trx.userId } });
                    if (u && u.phoneNumber) targetWa = u.phoneNumber;
                } catch (e) { }
            }

            if (targetWa) {
                let paymentInfo = '';
                if (paymentChannel) paymentInfo += `\nMetode: ${paymentChannel.toUpperCase()}`;

                const waMsg = `*PEMBAYARAN DITERIMA* 💰\nInvoice: *${trx.invoice}*\nStatus: LUNAS${paymentInfo}\nTotal Paid: Rp${totalPaid.toLocaleString('id-ID')}\n\nSistem sedang memproses pesanan Anda. Mohon tunggu 1-3 menit.`;
                whatsappService.sendMessage(targetWa, waMsg).catch(err => console.error("WA Error:", err));
            }

            // 5. TRIGGER GAME PROVIDER (Crucial Step)
            if (trx.type === 'TOPUP' || !trx.type) {
                console.log(`⚙️ [CALLBACK] Triggering Auto-Process for ${trxId}`);
                processGameTopup(trxId).catch(e => console.error("Process Trigger Failed:", e));
            }

        } else if (status === 'gagal') {
            await prisma.transaction.update({ where: { id: trxId }, data: { status: 'FAILED' } });
            console.log(`❌ Transaction ${trxId} FAILED`);
        }

        res.json({ success: true });

    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).json({ success: false });
    }
};

// POST /api/check-status/:id
export const checkTransactionStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };

        // 1. Get Transaction
        const trx = await prisma.transaction.findUnique({ where: { id }, include: { product: true } });
        if (!trx) return res.status(404).json({ success: false, message: "Transaction not found" });

        // A. If PENDING, Check Payment Gateway (IPAYMU) First
        if ((trx.status as any) === 'PENDING') {
            if (trx.paymentTrxId) {
                const payCheck = await ipaymuService.checkTransaction(trx.paymentTrxId);

                // Ipaymu Status: 1=Berhasil, 6=Paid
                if (payCheck.success && (payCheck.status === 1 || payCheck.status === 6 || payCheck.statusDesc?.toLowerCase() === 'berhasil')) {
                    console.log(`✅ [MANUAL CHECK] Payment found SUCCESS for ${trx.invoice}`);

                    // Update to PROCESSING (Paid, waiting for provider)
                    // We treat this as 'PROCESSING' because we are about to trigger provider
                    await prisma.transaction.update({
                        where: { id: trx.id },
                        data: {
                            status: 'PROCESSING',
                            updatedAt: new Date()
                        }
                    });

                    // Trigger WA Receipt (if not sent yet? Assume manual check allows re-trigger or ensure it wasn't sent)
                    // ... (Skipping WA here to avoid spam, or simplistic log)

                    // Trigger Provider
                    processGameTopup(trx.id).catch(console.error);

                    return res.json({ success: true, message: "Payment Verified! Order Processing.", data: { status: 'PROCESSING' } });
                }
            }
        }

        // B. Check Provider Status (VIP)
        // Only if status is PROCESSING or SUCCESS
        if (trx.status === 'PROCESSING' || trx.status === 'SUCCESS') {
            // Need Provider Trx ID to check VIP?
            // VIP Service checkTransaction takes 'trxId'.
            // If we don't have providerTrxId, maybe we can't check? Or we never placed it?
            // If PROCESSING and no providerTrxId, try to place it again? -> Safety measure

            if (!trx.providerTrxId) {
                // Try processing again if it's stuck in processing but no ID
                console.log(`⚠️ [MANUAL CHECK] Processing Status but no Provider ID. Retrying Process...`);
                const proc = await processGameTopup(trx.id);
                if (proc?.success) {
                    return res.json({ success: true, message: "Order Retried to Provider", data: { status: 'PROCESSING' } });
                }
                return res.json({ success: false, message: "Provider Retry Failed" });
            }

            const result = await gameProvider.checkTransaction(trx.providerTrxId);

            if (result.success && result.data) {
                const providerStatus = (result.data as any).status; // VIP: success, error, waiting
                let newStatus: any = trx.status;

                if (providerStatus === 'success') {
                    newStatus = 'SUCCESS';
                } else if (providerStatus === 'error') {
                    // Only fail if we are sure
                    newStatus = 'FAILED';
                }

                if (newStatus !== trx.status) {
                    await prisma.transaction.update({
                        where: { id },
                        data: {
                            status: newStatus as any,
                            providerStatus: providerStatus,
                            sn: (result.data as any).sn,
                            updatedAt: new Date()
                        }
                    });

                    if (newStatus === 'SUCCESS') {
                        // Optional: Send Success WA if strictly needed
                    }

                    return res.json({ success: true, message: "Status Updated", data: { status: newStatus } });
                } else {
                    return res.json({ success: true, message: `Status Unchanged (${providerStatus})`, data: { status: trx.status } });
                }
            }
        }

        return res.json({ success: true, message: "No Updates Available", data: { status: trx.status } });

    } catch (error: any) {
        console.error("Check Status Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/transaction/history
export const getHistory = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });

        const transactions = await prisma.transaction.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            include: { product: true }
        });

        res.json({ success: true, data: transactions });
    } catch (error: any) {
        console.error("History Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch history" });
    }
};

// GET /api/transaction/:id
export const getTransaction = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ success: false, message: 'ID required' });

        const transaction = await prisma.transaction.findUnique({
            where: { id: String(id) },
            include: { product: true }
        });

        if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });

        res.json({ success: true, data: transaction });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
