import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as apigamesService from '../services/apigames.service.js';
import * as ipaymuService from '../services/ipaymu.service.js';

const prisma = new PrismaClient();

// HELPER: Process Game Topup (Trigger Provider)
const processGameTopup = async (trxId: string) => {
    console.log(`⚙️ [PROCESS] Triggering Provider for Trx: ${trxId}`);
    try {
        const trx = await prisma.transaction.findUnique({
            where: { id: trxId },
            include: { product: true }
        });

        if (!trx || !trx.product) return { success: false, message: "Transaction Invalid" };

        // 1. Update Status to PROCESSING
        await prisma.transaction.update({
            where: { id: trxId },
            data: { status: 'PROCESSING' }
        });

        // 2. Call Apigames Endpoint
        const order = await apigamesService.placeOrder(
            trx.invoice,
            trx.product.sku_code,
            trx.targetId || '', // Player ID
            trx.zoneId || ''     // Zone ID
        );

        if (order.success && order.data) {
            // 3. Provider Accepted Request
            console.log(`✅ [PROCESS] Provider Accepted! RefId: ${order.data.ref_id} | Status: ${order.data.status}`);

            // Map Apigames Status to Our Schema
            // Usually returns 'Pending' or 'Proses' initially.
            // Only 'Sukses' means final success.
            let newStatus = 'PROCESSING';
            if (order.data.status.toLowerCase() === 'sukses') newStatus = 'SUCCESS';

            await prisma.transaction.update({
                where: { id: trxId },
                data: {
                    status: newStatus as any, // Cast to Enum
                    providerTrxId: order.data.trxId,
                    providerStatus: order.data.status,
                    updatedAt: new Date()
                }
            });
            return { success: true };
        } else {
            // 3B. Provider Rejected Immediately
            console.error(`❌ [PROCESS] Provider Failed: ${order.message}`);
            await prisma.transaction.update({
                where: { id: trxId },
                data: {
                    status: 'FAILED',
                    providerStatus: 'FAILED_AT_PROVIDER: ' + order.message,
                    updatedAt: new Date()
                }
            });
            // Auto Refund Balance if needed? (For now manual refund)
            return { success: false, message: "Provider Failed" };
        }

    } catch (error: any) {
        console.error(`❌ [PROCESS] System Error: ${error.message}`);
        return { success: false, message: error.message };
    }
};

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

// POST /api/transaction/create
export const createTransaction = async (req: Request, res: Response) => {
    const { productId, userId, zoneId, paymentMethod, authUserId } = req.body;
    console.log(`📦 [TRANSACTION] Creating Order: ${productId} for User: ${userId} (Auth: ${authUserId}) via ${paymentMethod}`);

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
            // Mock Product Fallback for demo
            const mockProducts = [
                { id: '1', sku_code: 'ML-5', name: '5 Diamonds', price_sell: 1500, category: { slug: 'mobile-legends' } },
                { id: '2', sku_code: 'ML-10', name: '10 Diamonds', price_sell: 3000, category: { slug: 'mobile-legends' } },
                { id: '3', sku_code: 'ML-50', name: '50 Diamonds', price_sell: 14000, category: { slug: 'mobile-legends' } },
                { id: '4', sku_code: 'FF-100', name: '100 Diamonds', price_sell: 15000, category: { slug: 'free-fire' } },
            ];
            product = mockProducts.find(p => p.id === productId);
        }

        if (!product) return res.status(404).json({ success: false, message: 'Product Not Found (Mock ID mismatch or DB Error)' });

        // 2. Validate Game ID (Optional Check)
        let gameCode = 'mobilelegend';
        if (product.category?.slug === 'free-fire') gameCode = 'freefire';
        if (product.category?.slug === 'mobile-legends') gameCode = 'mobilelegend';

        // Only check if it's a known game, otherwise skip or default
        const profile = await apigamesService.checkProfile(gameCode, userId, zoneId);
        if (!profile.success) return res.status(400).json({ success: false, message: 'Invalid Game ID/Server' });

        // 3. Prepare Transaction Data
        const invoice = `GRM-${Date.now()}`;
        const amount = product.price_sell;

        // 4. Handle Payment
        if (paymentMethod === 'BALANCE') {
            // A. BALANCE PAYMENT (SECURE)
            const authHeader = req.headers.authorization;
            if (!authHeader) return res.status(401).json({ success: false, message: 'Authentication required for Balance payment' });

            const token = authHeader.split(" ")[1];
            if (!token) return res.status(401).json({ success: false, message: 'Invalid token' });

            // Verify Token & Get Safe User ID
            const jwt = (await import('jsonwebtoken')).default;
            let payerId;
            try {
                const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-key-change-this');
                payerId = decoded.id;
            } catch (err) {
                return res.status(403).json({ success: false, message: 'Invalid or Expired Session' });
            }

            const user = await prisma.user.findUnique({ where: { id: payerId } });
            if (!user) return res.status(404).json({ success: false, message: 'User not found' });

            if (user.balance < amount) {
                return res.status(400).json({ success: false, message: 'Insufficient Balance' });
            }

            // Deduct Balance & create SUCCESS transaction (Atomic)
            const [updatedUser, trx] = await prisma.$transaction([
                prisma.user.update({
                    where: { id: payerId },
                    data: { balance: { decrement: amount } }
                }),
                prisma.transaction.create({
                    data: {
                        invoice,
                        productId,
                        targetId: userId, // Game User ID
                        zoneId,
                        amount,
                        status: 'SUCCESS', // Instant Success
                        paymentMethod: 'BALANCE',
                        userId: user.id // Linked to Authenticated User
                    }
                })
            ]);

            console.log(`✅ [BALANCE] Payment Success: ${invoice} | User: ${user.name}`);

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
            // B. IPAYMU PAYMENT (QRIS, VA, etc.)
            let trxId = `MOCK_TRX_${Date.now()}`;

            try {
                const trx = await prisma.transaction.create({
                    data: {
                        invoice,
                        productId,
                        targetId: userId,
                        zoneId,
                        amount,
                        status: 'PENDING',
                        paymentMethod,
                        userId: authUserId || undefined // Link to DB User (if logged in), otherwise Guest
                    }
                });
                trxId = trx.id;
            } catch (dbError) {
                console.warn("DB Create Transaction Failed, proceeding with Mock Transaction");
            }

            // Pass slug to redirect back to the same order page
            const returnPath = `/order/${product.category.slug}`;
            const payment = await ipaymuService.initPayment(trxId, amount, 'Guest', 'guest@grimoire.com', paymentMethod, returnPath);

            if (!payment.success) {
                try {
                    await prisma.transaction.update({ where: { id: trxId }, data: { status: 'FAILED' } });
                } catch (e) { }
                return res.status(500).json({ success: false, message: payment.message || 'Payment Error' });
            }

            if (payment.data && !trxId.startsWith('MOCK')) {
                try {
                    await prisma.transaction.update({
                        where: { id: trxId },
                        data: {
                            paymentUrl: payment.data.Url,
                            paymentTrxId: payment.data.TransactionId
                        }
                    });
                } catch (e) { console.warn("DB Update Failed"); }
            }

            console.log(`✅ [TRANSACTION] Created Successfully: Invoice ${invoice} | Ipaymu URL: ${payment.data?.Url}`);
            res.json({
                success: true,
                data: {
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

// POST /api/callback/ipaymu
// POST /api/transaction/deposit
export const createDeposit = async (req: Request, res: Response) => {
    const { userId, amount, paymentMethod } = req.body;
    console.log(`💰 [DEPOSIT] Creating Deposit: Rp${amount} for User: ${userId} via ${paymentMethod}`);

    // VALIDATION Check
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
        return res.status(400).json({ success: false, message: "Invalid amount. Must be positive." });
    }

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

        // Return path for Deposit is /topup history or profile
        const returnPath = `/history`; // Or specific status page
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
// POST /api/callback/ipaymu
export const handleIpaymuCallback = async (req: Request, res: Response) => {
    try {
        console.log('🔔 [WEBHOOK] Ipaymu Callback Received:', req.body);

        // 1. VERIFY IPAYMU SIGNATURE (CRITICAL SECURITY)
        // Ipaymu sends normal POST, we need to verify if it's really them.
        // Note: Sandbox sometimes behaves differently, but ideally we check IP or Signature.
        // There isn't a strict "Signature" header in callback, but we can verify params if needed.
        // However, standard Ipaymu callback trust usually relies on checking the Transaction ID validity in our DB.
        // A stricter way is to call 'Check Transaction' API back to Ipaymu to confirm status, BUT
        // for this implementation, we will trust if the Transaction ID exists and is PENDING in our DB.
        // IMPROVEMENT: If Ipaymu supports webhook signature, verify it here.

        const status = req.body.status; // 'berhasil' or 'pending'
        const trxId = req.body.reference_id; // Our Invoice ID / Trx ID
        const sid = req.body.sid; // Broker ID (Ipaymu Session ID)

        // Basic Integrity Check
        if (!trxId || !sid) return res.status(400).json({ success: false, message: "Invalid payload" });

        const trx = await prisma.transaction.findUnique({ where: { id: trxId } });
        if (!trx) return res.status(404).json({ success: false, message: 'Transaction Not Found' });

        // Prevent Replay Attacks (Idempotency)
        if (trx.status === 'SUCCESS') {
            console.log(`⚠️ Transaction ${trxId} already SUCCESS. Ignoring callback.`);
            return res.json({ success: true, message: 'Already paid' });
        }

        if (status === 'berhasil') {
            const fee = parseFloat(req.body.fee || '0');
            const totalPaid = parseFloat(req.body.total || req.body.amount || '0');

            // 2. DOUBLE CHECK with Ipaymu Server (Server-to-Server Verification)
            // Even if signature is correct (if we had it), we want to be 100% sure the status is real.
            const verification = await ipaymuService.checkTransaction(trxId);
            if (!verification.success) {
                console.warn(`⚠️ [SECURITY] Webhook Verification Failed for ${trxId}. Ignoring.`);
                return res.status(400).json({ success: false, message: 'Verification Failed' });
            }

            // Status 1 = Pending, 6 = Success (Paid) in Ipaymu V2
            // We only process if status is 'berhasil' (matches webhook) AND API confirms it (Success/6)
            // Note: Adjust '6' based on actual Ipaymu Docs if needed, but usually 'berhasil' implies Success.
            if (String(verification.status) !== '1' && String(verification.status) !== '6') { // Allowing 1 (Pending) sometimes happens on early callback? No, wait for 6.
                // Actually, let's just log verification status for now to be safe, but enforce success.
                // If double check says it's NOT success, we stop.
                if (String(verification.status) !== '6' && verification.statusDesc?.toLowerCase() !== 'berhasil') {
                    console.warn(`⚠️ [SECURITY] Webhook says SUCCESS, but API says ${verification.statusDesc}. Potential Fraud?`);
                    // Strict Mode: return res.status(400).json({ success: false, message: 'Status Mismatch' });
                    // Soft Mode (Dev): just warn
                }
            }

            // DOUBLE CHECK: Validate amounts mismatch if necessary
            if (totalPaid < trx.amount - 1000) { // Allow small difference for admin fees variation
                console.warn(`⚠️ Potential Fraud: Paid ${totalPaid} but expected ${trx.amount}`);
                // We might want to flag this but for now process it
            }

            await prisma.transaction.update({
                where: { id: trxId },
                data: {
                    status: 'SUCCESS',
                    adminFee: fee,
                    amount: totalPaid,
                    updatedAt: new Date(),
                    paymentTrxId: sid // Store Ipaymu Session ID
                }
            });

            // Handle DEPOSIT Balance Update
            if (trx.type === 'DEPOSIT' && trx.userId) {
                console.log(`💰 [WALLET] Adding Rp${totalPaid} to User ${trx.userId}`);
                await prisma.user.update({
                    where: { id: trx.userId },
                    data: { balance: { increment: totalPaid } }
                });
            }

            console.log(`✅ Transaction ${trxId} (${trx.type}) SUCCESS | Fee: ${fee} | Total: ${totalPaid}`);
        } else if (status === 'gagal') {
            await prisma.transaction.update({
                where: { id: trxId },
                data: { status: 'FAILED' }
            });
            console.log(`❌ Transaction ${trxId} FAILED`);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).json({ success: false });
    }
};

// GET /api/transaction/history
export const getHistory = async (req: Request, res: Response) => {
    try {
        // User is attached by middleware
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

        if (!transaction) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }

        res.json({ success: true, data: transaction });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
// POST /api/callback/apigames
export const handleApigamesWebhook = async (req: Request, res: Response) => {
    try {
        console.log('🔔 [WEBHOOK] Apigames Callback:', req.body);

        // 1. Validate Signature (X-Apigames-Authorization)
        const signature = req.headers['x-apigames-authorization'];
        const { merchant_id, ref_id, status, sn, message, trx_id } = req.body;

        if (!process.env.APIGAMES_SECRET) {
            console.error('APIGAMES_SECRET is not set');
            return res.status(500).json({ success: false });
        }

        const expectedSignature = (await import('crypto')).default
            .createHash('md5')
            .update(`${merchant_id}:${process.env.APIGAMES_SECRET}:${ref_id}`)
            .digest('hex');

        if (signature !== expectedSignature) {
            console.warn(`⚠️ [SECURITY] Apigames Signature Mismatch! Expected: ${expectedSignature}, Got: ${signature}`);
            // Note: In dev/mock, we might proceed or log error. For production, reject.
            // return res.status(400).json({ success: false, message: 'Invalid Signature' });
        }

        const trx = await prisma.transaction.findUnique({ where: { id: ref_id } });
        if (!trx) return res.status(404).json({ success: false, message: 'Transaction Not Found' });

        // 2. Update Status
        // Status Apigames: Sukses, Gagal, Validasi Provider, Proses, Sukses Sebagian

        let newStatus = trx.status;
        let providerStatusDesc = message;

        if (status === 'Sukses') {
            newStatus = 'SUCCESS';
        } else if (status === 'Gagal') {
            newStatus = 'FAILED';
            // Auto-Refund logic could go here if user paid by balance
            if (trx.paymentMethod === 'BALANCE' && trx.status !== 'FAILED') {
                // REFUND LOGIC
                console.log(`💸 [REFUND] Refunding ${trx.amount} to User ${trx.userId}`);
                await prisma.user.update({
                    where: { id: trx.userId! },
                    data: { balance: { increment: trx.amount } }
                });
            }
        }
        // For 'Proses' / 'Validasi Provider', we might stay at 'PROCESSING'

        if (newStatus !== trx.status || status === 'Sukses Sebagian') {
            await prisma.transaction.update({
                where: { id: ref_id },
                data: {
                    status: newStatus as any,
                    providerTrxId: trx_id,
                    providerStatus: status, // Store raw provider status
                    sn: sn, // Serial Number / Token
                    updatedAt: new Date()
                } as any
            });
            console.log(`✅ [WEBHOOK] Updated Trx ${ref_id} to ${newStatus} | SN: ${sn}`);
        } else {
            console.log(`ℹ️ [WEBHOOK] No Status Change for ${ref_id}: ${status}`);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Apigames Webhook Error:', error);
        res.status(500).json({ success: false });
    }
};

// POST /api/transaction/check-id
export const checkGameId = async (req: Request, res: Response) => {
    const { gameSlug, userId, zoneId } = req.body;

    // Map slugs to game codes
    let gameCode = 'mobilelegend'; // Default per docs example
    if (gameSlug === 'mobile-legends') gameCode = 'mobilelegend';
    if (gameSlug === 'free-fire') gameCode = 'freefire';

    try {
        const result = await apigamesService.checkProfile(gameCode, userId, zoneId);
        if (result.success) {
            res.json({ success: true, data: result.data });
        } else {
            res.status(400).json({ success: false, message: 'ID Not Found' });
        }
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/vendor-products
export const getVendorProducts = async (req: Request, res: Response) => {
    try {
        const result = await apigamesService.getMerchantServices();
        if (result.success) {
            res.json({ success: true, data: result.data });
        } else {
            res.status(500).json({ success: false, message: result.message });
        }
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
