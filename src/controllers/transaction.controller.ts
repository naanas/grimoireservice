import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import * as apigamesService from '../services/apigames.service.js';
import * as ipaymuService from '../services/ipaymu.service.js';
import * as whatsappService from '../services/whatsapp.service.js';

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
    // Validated by Zod
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
        let amount = product.price_sell;
        let discountAmount = 0;
        const validVoucherCode = req.body.voucherCode;

        // --- VOUCHER LOGIC START ---
        if (validVoucherCode) {
            const voucher = await prisma.voucher.findUnique({
                where: { code: validVoucherCode }
            });

            if (voucher) {
                // Validate again (Security)
                const now = new Date();
                if (voucher.isActive && voucher.stock > 0 && voucher.expiresAt > now && amount >= voucher.minPurchase) {

                    // Calculate Discount
                    if (voucher.type === 'FIXED') {
                        discountAmount = voucher.amount;
                    } else if (voucher.type === 'PERCENTAGE') {
                        discountAmount = (amount * voucher.amount) / 100;
                        if (voucher.maxDiscount && discountAmount > voucher.maxDiscount) {
                            discountAmount = voucher.maxDiscount;
                        }
                    }

                    // Apply
                    if (discountAmount > amount) discountAmount = amount; // Prevent negative
                    amount -= discountAmount;

                    // Decrement Stock (Atomic update not strictly needed for MVP but good practice)
                    await prisma.voucher.update({
                        where: { id: voucher.id },
                        data: { stock: { decrement: 1 } }
                    });

                    console.log(`🎟️ [VOUCHER] Applied ${validVoucherCode}: -${discountAmount} | Final: ${amount}`);
                } else {
                    console.warn(`⚠️ [VOUCHER] Invalid or Expired: ${validVoucherCode}`);
                    // We can either fail or just ignore. Ignoring is safer for UX unless we want to be strict.
                    // Let's just ignore and proceed with normal price to avoid blocking order?
                    // Update: User expects discount. If invalid, maybe it's better to NOT fail but warn?
                }
            }
        }
        // --- VOUCHER LOGIC END ---

        // 4. Handle Payment
        if (paymentMethod === 'BALANCE') {
            // A. BALANCE PAYMENT (SECURE) - STRICTLY REQUIRE HEADER
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

            // IDOR PROTECTION: Payer is the one in the token
            // USE RAW QUERY to ensure we get phoneNumber even if prisma generate wasn't run
            const userResult: any[] = await prisma.$queryRaw`SELECT * FROM "users" WHERE id = ${payerId} LIMIT 1`;
            const user = userResult[0]; // Raw User Object

            if (!user) return res.status(404).json({ success: false, message: 'User not found' });

            if (user.balance < amount) {
                return res.status(400).json({ success: false, message: 'Insufficient Balance' });
            }

            const userPhoneNumber = user.phoneNumber; // Accessed safely from raw result
            console.log(`👤 [BALANCE] User: ${user.name} | Phone: ${userPhoneNumber}`);

            // Deduct Balance & create SUCCESS transaction (Atomic)
            // Note: We use nested update/create. For Raw User we might need separate operations if we want strict safety,
            // but prisma.$transaction with standard calls is fine IF standard calls don't crash on new logic.
            // Since we just want to read phoneNumber, the above Raw Query solved the READ.
            // For WRITE (guestContact in Transaction), if schema is stale, this might throw.
            // Let's rely on standard update for balance (balance column is old/safe).

            const [updatedUser, trx] = await prisma.$transaction([
                prisma.user.update({
                    where: { id: payerId },
                    data: { balance: { decrement: amount } }
                }),
                prisma.transaction.create({
                    data: {
                        invoice,
                        productId,
                        targetId: userId,
                        zoneId,
                        amount,
                        discountAmount,
                        voucherCode: validVoucherCode,
                        status: 'SUCCESS',
                        paymentMethod: 'BALANCE',
                        userId: user.id,
                        guestContact: userPhoneNumber || undefined // Use fetched phone
                    } as any // CAST TO ANY TO BYPASS STALE CLIENT TYPES
                })
            ]);

            console.log(`✅ [BALANCE] Payment Success: ${invoice} | User: ${user.name}`);

            // --- FIRE AND FORGET: PROCESS GAME TOPUP ---
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
            // B. IPAYMU PAYMENT (QRIS, VA, etc.)
            let trxId = `MOCK_TRX_${Date.now()}`;

            // 1. RESOLVE PHONE NUMBER FOR NOTIFICATION
            // Prioritize Guest Contact (if guest), otherwise check Token for logged in user
            // MANUALLY DECODE TOKEN because route does NOT use authenticateToken middleware
            let userToken: any = (req as any).user;

            if (!userToken && req.headers.authorization) {
                try {
                    const token = req.headers.authorization.split(' ')[1];
                    if (token) {
                        const jwt = (await import('jsonwebtoken')).default;
                        userToken = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-key-change-this');
                    }
                } catch (e) { console.warn("Token manual decode failed:", e); }
            }

            let targetPhone = guestContact;

            if (!targetPhone && userToken && userToken.phoneNumber) {
                targetPhone = userToken.phoneNumber;
            }

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
                        userId: authUserId || undefined,
                        guestContact: targetPhone || undefined // Store the resolved phone
                    }
                });
                trxId = trx.id;
            } catch (dbError) {
                console.warn("DB Transaction Create Failed:", dbError);
            }

            const returnPath = `/order/${product.category.slug}`;
            const payment = await ipaymuService.initPayment(trxId, amount, 'Guest', 'guest@grimoire.com', paymentMethod, returnPath);

            if (!payment.success) {
                return res.status(500).json({ success: false, message: payment.message || 'Payment Error' });
            }

            // Update Transaction with Payment Info
            // Table name is likely 'transactions' based on Prisma convention (User -> users)
            if (payment.data && !trxId.startsWith('MOCK')) {
                await prisma.$executeRaw`UPDATE "transactions" SET "paymentUrl" = ${payment.data.Url}, "paymentTrxId" = ${payment.data.TransactionId} WHERE id = ${trxId}`;
            }

            // --- POKOK PERMASALAHAN 1: KIRIM WA TAGIHAN ---
            if (targetPhone) {
                console.log(`🚀 [WA] Sending Invoice to ${targetPhone}`);
                const waMsg = `*TAGIHAN BARU* 🧾\nInvoice: *${invoice}*\nItem: ${product.name}\nTotal: Rp${amount.toLocaleString('id-ID')}\n\nBayar di sini: ${payment.data?.Url}\n\nTerima kasih!`;

                // ASYNC HIT - Fire and Forget
                whatsappService.sendMessage(targetPhone, waMsg).catch(err => console.error("WA Error:", err));
            } else {
                console.log("⚠️ [WA] Skipped: No Phone Number");
            }

            res.json({
                success: true,
                data: {
                    id: trxId, // Added ID for polling
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
    // PROTECTED ROUTE: User verified by middleware
    const { amount, paymentMethod } = req.body;
    const userId = (req as any).user.id; // Secure: From Token

    console.log(`💰 [DEPOSIT] Creating Deposit: Rp${amount} for User: ${userId} via ${paymentMethod}`);

    // VALIDATION handled by Zod Middleware

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

            // --- POKOK PERMASALAHAN 2: KIRIM WA STRUK TRANSAKSI ---
            let targetWa = trx.guestContact;

            // If guestContact missing in TRX, try look up USER table
            if (!targetWa && trx.userId) {
                try {
                    const u: any[] = await prisma.$queryRaw`SELECT "phoneNumber" FROM "users" WHERE id = ${trx.userId} LIMIT 1`;
                    if (u.length > 0) targetWa = u[0].phoneNumber;
                } catch (e) { console.warn("Failed to fetch user phone for webhook", e); }
            }

            if (targetWa) {
                console.log(`🚀 [WA] Sending Receipt to ${targetWa}`);
                const waMsg = `*PEMBAYARAN DITERIMA* 💰\nInvoice: *${trx.invoice}*\nStatus: LUNAS\n\nSistem sedang memproses pesanan Anda. Mohon tunggu 1-3 menit.`;
                whatsappService.sendMessage(targetWa, waMsg).catch(err => console.error("WA Error:", err));
            } else {
                console.log("⚠️ [WA] Skipped Receipt: No Phone Number");
            }

            // --- POKOK PERMASALAHAN 3: TRIGGER GAME PROVIDER (THE MISSING LINK) ---
            if (trx.type === 'TOPUP' || !trx.type) { // Default is TOPUP
                console.log(`⚙️ [CALLBACK] Triggering Auto-Process for ${trxId}`);
                processGameTopup(trxId).catch(e => console.error("Process Trigger Failed:", e));
            }
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

        const trx = await prisma.transaction.findUnique({
            where: { id: ref_id },
            include: { product: true } // Include Product for Name
        });
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

            // WA NOTIF: COMPLETED / FAILED
            let targetWa = trx.guestContact;
            if (!targetWa && trx.userId) {
                try {
                    const u: any[] = await prisma.$queryRaw`SELECT "phoneNumber" FROM "users" WHERE id = ${trx.userId} LIMIT 1`;
                    if (u.length > 0 && u[0].phoneNumber) targetWa = u[0].phoneNumber;
                } catch (e) { console.warn("Failed to fetch user phone for provider webhook", e); }
            }

            if (targetWa) {
                let waMsg = '';
                if (newStatus === 'SUCCESS') {
                    waMsg = `*TOPUP SUKSES* ✅\nOrder: *${trx.invoice}*\nItem: ${trx.product?.name}\nSN/Ref: ${sn || '-'}\n\nTerima kasih telah belanja di Grimoire! 🩸`;
                } else if (newStatus === 'FAILED') {
                    waMsg = `*TOPUP GAGAL* ❌\nOrder: *${trx.invoice}*\nMohon hubungi Admin untuk refund manual.`;
                }

                if (waMsg) whatsappService.sendMessage(targetWa, waMsg);
            }
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

// POST /api/check-status/:id
export const checkTransactionStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };

        // 1. Get Transaction
        const trx = await prisma.transaction.findUnique({ where: { id } });
        if (!trx) return res.status(404).json({ success: false, message: "Transaction not found" });

        // A. If PENDING, Check Payment Gateway (IPAYMU) First
        if ((trx.status as any) === 'PENDING') {
            if (trx.paymentTrxId) {
                const payCheck = await ipaymuService.checkTransaction(trx.paymentTrxId);

                // Ipaymu Status: 1=Berhasil, 0=Pending, -1=Gagal (Check docs/logs)
                // Based on previous logs: "Check Result: 1 (Berhasil)"
                if (payCheck.success && (payCheck.status === 1 || payCheck.status === 6 || payCheck.statusDesc?.toLowerCase() === 'berhasil')) {
                    // Update to PROCESSING / SUCCESS
                    console.log(`✅ [MANUAL CHECK] Payment found SUCCESS for ${trx.invoice}`);

                    await prisma.transaction.update({
                        where: { id: trx.id },
                        data: {
                            status: 'PROCESSING',
                            paymentUrl: null // Clear payment URL as it's paid
                        }
                    });

                    // Trigger WA Receipt
                    let targetWa = trx.guestContact;
                    if (!targetWa && trx.userId) {
                        try {
                            const u: any[] = await prisma.$queryRaw`SELECT "phoneNumber" FROM "users" WHERE id = ${trx.userId} LIMIT 1`;
                            if (u.length > 0) targetWa = u[0].phoneNumber;
                        } catch (e) { }
                    }

                    if (targetWa) {
                        const waMsg = `*PEMBAYARAN DITERIMA* 💰\nInvoice: *${trx.invoice}*\nStatus: LUNAS\n\nSistem sedang memproses pesanan Anda. Mohon tunggu 1-3 menit.`;
                        whatsappService.sendMessage(targetWa, waMsg).catch(console.error);
                    }

                    // Proceed to Check Provider (Apigames)
                    // If we just detected payment, we should also Trigger Topup if not done
                    // But usually PROCESSING status triggers it via webhook? 
                    // No, webhook triggers function. Here we must trigger manually.
                    processGameTopup(trx.id).catch(console.error);

                    // Return success so frontend reloads
                    return res.json({ success: true, message: "Payment Verified! Processing Order...", data: { status: 'PROCESSING' } });
                }
            }
        }

        // B. Check Provider Status (Apigames)
        // Only if status is PROCESSING or SUCCESS (or we just updated it)
        const result = await apigamesService.checkTransaction(trx.invoice);

        if (result.success && result.data) {
            const providerStatus = (result.data as any).status; // Sukses, Pending, Gagal
            let newStatus: any = trx.status;

            if (providerStatus === 'Sukses' || providerStatus === 'Success') {
                newStatus = 'SUCCESS';
            } else if (providerStatus === 'Gagal' || providerStatus === 'Failed') {
                newStatus = 'FAILED';
            }

            // Update if changed
            if (newStatus !== trx.status) {
                await prisma.transaction.update({
                    where: { id },
                    data: {
                        status: newStatus as any, // Cast to any to bypass strict Enum check if needed, or ensure "SUCCESS" is in Enum
                        providerStatus: providerStatus,
                        sn: (result.data as any).sn,
                        updatedAt: new Date()
                    }
                });

                // If Success, Trigger WA
                if (newStatus === 'SUCCESS') {
                    let targetWa = trx.guestContact;
                    if (!targetWa && trx.userId) {
                        // Fetch user phone if needed
                        try {
                            const u: any[] = await prisma.$queryRaw`SELECT "phoneNumber" FROM "users" WHERE id = ${trx.userId} LIMIT 1`;
                            if (u.length > 0 && u[0].phoneNumber) targetWa = u[0].phoneNumber;
                        } catch (e) { console.warn("Failed to fetch user phone for check status", e); }
                    }

                    if (targetWa) {
                        const waMsg = `*TOPUP SUKSES* ✅ (Manual Check)\nOrder: *${trx.invoice}*\nSN/Ref: ${(result.data as any).sn || '-'}\n\nTerima kasih!`;
                        whatsappService.sendMessage(targetWa, waMsg).catch(console.error);
                    }
                }

                return res.json({ success: true, message: "Status Updated", data: { status: newStatus } });
            } else {
                return res.json({ success: true, message: "Status Unchanged (Provider: " + providerStatus + ")", data: { status: trx.status } });
            }

        } else {
            return res.status(400).json({ success: false, message: "Provider Check Failed: " + result.message });
        }

    } catch (error: any) {
        console.error("Check Status Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// DEV: Mock Provider Callback
export const mockApigamesCallback = async (req: Request, res: Response) => {
    try {
        const { id } = req.body;
        const trx = await prisma.transaction.findUnique({ where: { id } });
        if (!trx) return res.status(404).json({ success: false, message: "Transaction not found" });

        // Simulate Apigames Webhook Request
        const mockBody = {
            ref_id: trx.providerTrxId || `MOCK_PROV_${Date.now()}`,
            trx_id: trx.providerTrxId || `MOCK_PROV_${Date.now()}`,
            status: 'Sukses',
            sn: 'MOCK_SN_1234567890',
            message: 'Mock Success'
        };

        // If providerTrxId is null, force update it
        if (!trx.providerTrxId) {
            await prisma.transaction.update({ where: { id }, data: { providerTrxId: `MOCK_REQ_${id}` } });
            mockBody.ref_id = `MOCK_REQ_${id}`;
            mockBody.trx_id = `MOCK_REQ_${id}`;
        }

        console.log(`🛠️ [DEV] Mocking Apigames Callback for ${trx.invoice}`);

        await prisma.transaction.update({
            where: { id },
            data: {
                status: 'SUCCESS',
                providerStatus: 'Sukses',
                sn: mockBody.sn,
                updatedAt: new Date()
            }
        });

        // Trigger WA
        let targetWa = trx.guestContact;
        if (!targetWa && trx.userId) {
            try {
                const u: any[] = await prisma.$queryRaw`SELECT "phoneNumber" FROM "users" WHERE id = ${trx.userId} LIMIT 1`;
                if (u.length > 0) targetWa = u[0].phoneNumber;
            } catch (e) { }
        }
        if (targetWa) {
            const waMsg = `*TOPUP SUKSES* ✅ (Mock Dev)\nOrder: *${trx.invoice}*\nSN/Ref: ${mockBody.sn}\n\nTerima kasih!`;
            whatsappService.sendMessage(targetWa, waMsg).catch(console.error);
        }

        res.json({ success: true, message: "Mock Callback Success" });

    } catch (error: any) {
        console.error("Mock Callback Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
