import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import * as gameProvider from '../services/game.service.js'; // Consolidated on Game Service (Adapter)
import * as ipaymuService from '../services/ipaymu.service.js';
import * as whatsappService from '../services/whatsapp.service.js';
import * as crypto from 'crypto'; // Added for VIP callback signature validation
import axios from 'axios';

// --- HELPER FUNCTIONS ---

export const handleTripayCallback = async (req: Request, res: Response) => {
    const callbackSignature = req.headers['x-callback-signature'];
    const event = req.headers['x-callback-event'];

    const { merchant_ref, status, reference } = req.body;
    console.log(`🔔 [TRIPAY-CALLBACK] Event: ${event} | Ref: ${merchant_ref} | TripayRef: ${reference}`);

    if (event !== 'payment_status') {
        return res.json({ success: true });
    }

    try {
        // 1. Fetch Transaction to determine mode if needed (or just fetch all configs)
        const trx = await prisma.transaction.findUnique({
            where: { id: merchant_ref }
        });

        if (!trx) {
            console.error(`❌ [TRIPAY-CALLBACK] Transaction ${merchant_ref} not found`);
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }

        // 2. Fetch Tripay Configs from DB
        const configs = await prisma.systemConfig.findMany({
            where: {
                key: { in: ['TRIPAY_MODE', 'TRIPAY_SB_PRIVATE_KEY', 'TRIPAY_PROD_PRIVATE_KEY'] }
            }
        });
        const configMap: any = {};
        configs.forEach(c => configMap[c.key] = c.value);

        const mode = configMap['TRIPAY_MODE'] || process.env.TRIPAY_MODE || 'SANDBOX';
        const privateKey = mode === 'PRODUCTION'
            ? (configMap['TRIPAY_PROD_PRIVATE_KEY'] || process.env.TRIPAY_PROD_PRIVATE_KEY)
            : (configMap['TRIPAY_SB_PRIVATE_KEY'] || process.env.TRIPAY_SB_PRIVATE_KEY);

        if (!privateKey) {
            console.error("❌ [TRIPAY-CALLBACK] Tripay Private Key is missing");
            return res.status(500).json({ success: false, message: 'Configuration Error' });
        }

        // 3. Validate Signature
        // Tripay manual: hash = hmac_sha256(json_body, private_key)
        const signature = crypto.createHmac('sha256', privateKey).update(JSON.stringify(req.body)).digest('hex');

        if (signature !== callbackSignature) {
            console.error(`❌ [TRIPAY-CALLBACK] Invalid Signature. Got: ${callbackSignature} | Expected: ${signature}`);
            return res.status(400).json({ success: false, message: 'Invalid Signature' });
        }

        // 4. Map Status
        let newStatus = trx.status;
        if (status === 'PAID') newStatus = 'SUCCESS';
        else if (status === 'FAILED' || status === 'EXPIRED' || status === 'REFUND') newStatus = 'FAILED';

        if (newStatus === 'SUCCESS' && trx.status !== 'SUCCESS') {
            // Update reference if missing
            if (!trx.paymentTrxId) {
                await prisma.transaction.update({
                    where: { id: merchant_ref },
                    data: { paymentTrxId: reference }
                });
            }
            // Trigger background process (non-blocking)
            processGameTopup(merchant_ref).catch(e => console.error("❌ [TRIPAY-CALLBACK] Background Topup Error:", e));
        } else if (newStatus === 'FAILED' && trx.status !== 'FAILED') {
            await prisma.transaction.update({
                where: { id: merchant_ref },
                data: { status: 'FAILED', providerStatus: `TRIPAY_${status}` }
            });
        }

        res.json({ success: true });
    } catch (error: any) {
        console.error("❌ [TRIPAY-CALLBACK] Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Process Game Topup (Trigger Provider)
 * Use this to fulfill the order after payment is confirmed (Balance or Gateway).
 */
export const processGameTopup = async (trxId: string) => {
    console.log(`⚙️ [PROCESS] Triggering Provider for Trx: ${trxId}`);
    console.log(`⚠️  Game Provider: ${gameProvider.PROVIDER} (REAL API - Careful!)`);
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

        // 2. Concurrency Lock: Ensure we don't double-hit the provider
        // We attempt to set providerStatus to 'REQUESTING'. 
        // If it's already set (REQUESTING, SUCCESS, PROCESSING, etc), we skip.
        if (trx.providerStatus && trx.providerStatus !== 'FAILED') {
            console.log(`⚠️ [PROCESS] Provider Status is '${trx.providerStatus}', skipping to avoid race condition.`);
            return { success: true, message: "Already Requesting/Processed" };
        }

        // Lock it
        const lock = await prisma.transaction.updateMany({
            where: {
                id: trxId,
                OR: [
                    { providerStatus: null },
                    { providerStatus: 'FAILED' } // Allow retry if failed previously?
                ]
            },
            data: {
                status: 'PROCESSING',
                providerStatus: 'REQUESTING'
            }
        });

        if (lock.count === 0) {
            console.log(`⚠️ [PROCESS] Locked by another worker. Skipping.`);
            return { success: true, message: "Locked" };
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
            // 4B. Provider Rejected Immediately (e.g. Insufficient Balance, System error)
            console.error(`❌ [PROCESS] Provider Failed: ${order.message}`);
            await prisma.transaction.update({
                where: { id: trxId },
                data: {
                    status: 'PROVIDER_FAILED' as any,
                    providerStatus: 'PROVIDER_ERROR: ' + (order.message || 'Unknown'),
                    updatedAt: new Date()
                }
            });

            // TODO: Manual intervention required message via notification service
            return { success: false, message: order.message };
        }

    } catch (error: any) {
        console.error(`❌ [PROCESS] System Error: ${error.message}`);
        // Unlock Provider Status so we can retry later or manual fix
        try {
            await prisma.transaction.update({
                where: { id: trxId },
                data: {
                    providerStatus: 'FAILED_SYS: ' + error.message,
                    status: 'FAILED' // Or keep PROCESSING? Safe to fail.
                }
            });
        } catch (e) { }
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

        // Group by Brand to return unique entries for Home Page
        const uniqueBrands: any[] = [];
        const seenBrands = new Set();

        for (const cat of categories) {
            const brand = (cat as any).brand || cat.name; // Fallback to name if brand not set
            if (!seenBrands.has(brand)) {
                seenBrands.add(brand);
                uniqueBrands.push({
                    ...cat,
                    name: brand // Display Brand Name instead of specific Category Name
                });
            }
        }

        res.json({ success: true, data: uniqueBrands });
    } catch (error) {
        console.error("DB Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch categories" });
    }
};

// GET /api/categories/:slug
export const getCategoryBySlug = async (req: Request, res: Response) => {
    try {
        const { slug } = req.params as { slug: string };
        const category = await prisma.category.findUnique({
            where: { slug }
        });
        if (!category) return res.status(404).json({ success: false, message: "Category not found" });

        // Fetch Siblings (Variations)
        let variations: any[] = [];
        if ((category as any).brand) {
            variations = await prisma.category.findMany({
                where: {
                    brand: (category as any).brand,
                    isActive: true,
                    slug: { not: category.slug } // Exclude self
                } as any
            });
        }

        // If no brand or no other variations, 'variations' will just be empty or just self if we queried differently.
        // Let's ensure 'variations' contains at least itself if brand exists, or logic to handle single items.
        // If brand is null, variations is empty.

        res.json({ success: true, data: { ...category, variations } });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/categories/best-selling
export const getBestSellingCategories = async (req: Request, res: Response) => {
    try {
        // Group transactions by productId to get count
        // Then we need to map to categories. 
        // Efficient way: Raw Query or 2 steps (Aggregate -> Fetch) where we aggregate by product, then fetch products.
        // Even better: Aggregate directly if possible. 
        // For Prisma, easiest is GroupBy on Transaction, but we can't join in GroupBy.
        // Let's use Raw Query for performance and "3 table join" logic requested.

        // "get value categorynya join kan 3 table yaitu table transavtion by product id, table product by categiory id"
        // UPDATED: Group by BRAND to avoid duplicates on home page
        const result: any[] = await prisma.$queryRaw`
            SELECT 
                MIN(c.id) as id, 
                COALESCE(c.brand, c.name) as name, 
                MIN(c.slug) as slug, 
                MIN(c.image) as image, 
                COUNT(t.id) as total_sales
            FROM transactions t
            JOIN products p ON t."productId" = p.id
            JOIN categories c ON p."categoryId" = c.id
            WHERE t.status = 'SUCCESS'
            GROUP BY COALESCE(c.brand, c.name)
            ORDER BY total_sales DESC
            LIMIT 10
        `;

        // Serialize BigInt if any returns from Count
        const formatted = result.map(item => ({
            ...item,
            total_sales: Number(item.total_sales)
        }));

        res.json({ success: true, data: formatted });
    } catch (error: any) {
        console.error("Best Selling Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/categories/popular
export const getPopularCategories = async (req: Request, res: Response) => {
    try {
        // Defined as "Trending" (Last 7 Days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const result: any[] = await prisma.$queryRaw`
             SELECT 
                MIN(c.id) as id, 
                COALESCE(c."brand", c.name) as name, 
                MIN(c.slug) as slug, 
                MIN(c.image) as image, 
                COUNT(t.id) as trend_score
            FROM transactions t
            JOIN products p ON t."productId" = p.id
            JOIN categories c ON p."categoryId" = c.id
            WHERE t.status = 'SUCCESS' AND t."createdAt" >= ${sevenDaysAgo}
            GROUP BY COALESCE(c."brand", c.name)
            ORDER BY trend_score DESC
            LIMIT 10
        `;

        // Fallback: If no trending data (new app), return random or all time
        if (result.length === 0) {
            const fallback: any[] = await prisma.$queryRaw`
                SELECT 
                    MIN(c.id) as id, 
                    COALESCE(c.brand, c.name) as name, 
                    MIN(c.slug) as slug, 
                    MIN(c.image) as image, 
                    0 as total_sales
                FROM categories c
                WHERE c."isActive" = true
                GROUP BY COALESCE(c.brand, c.name)
                ORDER BY RANDOM()
                LIMIT 10
            `;
            return res.json({ success: true, data: fallback });
        }

        const formatted = result.map(item => ({
            ...item,
            trend_score: Number(item.trend_score),
            total_sales: Number(item.trend_score) // Keep compatibility if frontend expects total_sales
        }));

        res.json({ success: true, data: formatted });
    } catch (error: any) {
        console.error("Popular Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};


// GET /api/products
export const getProducts = async (req: Request, res: Response) => {
    try {
        const { category, includeVariations } = req.query;

        let whereClause: any = { isActive: true };

        if (category) {
            if (includeVariations === 'true') {
                // Fetch products for ALL variations of this category's brand
                const rootCat = await prisma.category.findUnique({ where: { slug: String(category) } });

                if (rootCat && (rootCat as any).brand) {
                    // Match any category with the same BRAND
                    whereClause.category = {
                        brand: (rootCat as any).brand,
                        isActive: true
                    } as any;
                } else {
                    // Fallback if no brand or cat not found: just match slug
                    whereClause.category = { slug: String(category) };
                }
            } else {
                // Default: Match specific category slug only
                whereClause.category = { slug: String(category) };
            }
        }

        const products = await prisma.product.findMany({
            where: whereClause,
            include: { category: true },
            orderBy: [
                { category: { name: 'asc' } }, // Sort by Category Name first (e.g. A, B, Global)
                { price_sell: 'asc' }
            ]
        });
        res.json({ success: true, data: products });
    } catch (error: any) {
        console.error("DB Error:", error);
        res.status(500).json({ success: false, message: "System Error: Failed to fetch products" });
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
    const { gameCode, gameSlug, userId, zoneId } = req.body as { gameCode?: string, gameSlug?: string, userId: string, zoneId?: string };
    console.log(`🔍 [CHECK-ID] Payload:`, req.body);

    try {
        let codeToSend = gameCode;

        // If gameCode is NOT provided (legacy), look it up via gameSlug
        if (!codeToSend && gameSlug) {
            const category = await prisma.category.findUnique({ where: { slug: String(gameSlug) } });
            if (!category) {
                console.warn(`⚠️ [CHECK-ID] Category not found for slug: ${gameSlug}`);
                return res.status(400).json({ success: false, message: 'Game Category Not Found' });
            }
            codeToSend = category.code || category.name;
        }

        // Optional: Verification step even if code provided? 
        // For now, let's assume if code is sent, it's valid enough or provider will reject.
        // But to be safe, we can check if a category with this code exists if we want strictness.
        // Let's stick to the user's request: "frontend sends category name (code)".

        if (!codeToSend) {
            return res.status(400).json({ success: false, message: 'Game Code or Slug required' });
        }

        console.log(`✅ [CHECK-ID] Using Code: '${codeToSend}'`);

        const result = await gameProvider.checkProfile(codeToSend, userId, zoneId);
        if (result.success) {
            res.json({ success: true, data: result.data });
        } else {
            console.warn(`[CHECK-ID-FAIL] Code: ${codeToSend} User: ${userId} -> Msg: ${result.message}`);
            // Forward provider message if available (e.g. "User Not Found"), otherwise fallback
            // If message is unrelated to finding user (e.g. system error), use 500? No, provider usually returns 200 with error msg.
            // Let's stick to 400 for user errors.
            const status = result.message?.toLowerCase().includes('error') ? 500 : 400;
            res.status(status).json({ success: false, message: result.message || 'ID Not Found' });
        }
    } catch (error: any) {
        // Log only message to avoid stack trace leak
        console.error(`[CHECK-ID-ERR]`, error.message);
        res.status(500).json({ success: false, message: 'System Error' });
    }
};

// POST /api/transaction/create
export const createTransaction = async (req: Request, res: Response) => {
    // Validated by Zod Middleware usually
    const { productId, userId, zoneId, paymentMethod, paymentChannel, authUserId, guestContact } = req.body;
    console.log(`📦 [TRANSACTION] Creating Order: ${productId} for User: ${userId} (Auth: ${authUserId}) via ${paymentMethod}:${paymentChannel || 'Redirect'} | GuestContact: ${guestContact}`);

    try {
        // 1. Get Product Data (With Mock Fallback)
        let product;
        try {
            product = await prisma.product.findUnique({
                where: { id: productId },
                include: { category: true }
            });
        } catch (dbError) {
            console.error("DB Connection Failed:", dbError);
            return res.status(500).json({ success: false, message: 'Database Error' });
        }

        if (!product) return res.status(404).json({ success: false, message: 'Product Not Found' });

        // 2. Prepare Transaction Data
        const invoice = `GRM-${Date.now()}`;
        let amount = product.price_sell;
        let discountAmount = 0;
        const validVoucherCode = req.body.voucherCode;

        // --- VOUCHER LOGIC ---
        // --- VOUCHER LOGIC (Fixed Race Condition) ---
        if (validVoucherCode) {
            // Logic moved to atomic transaction block below for safety
            // We just verify existence here initially, but final check must be atomic
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
                    // Note: Stock decrement happens in Prisma Transaction
                }
            }
        }

        const finalAmount = amount - discountAmount;

        // --- GATEWAY FEE CALCULATION ---
        // Calculate fee based on payment method to ensure backend amount matches frontend display
        // Rates should match PaymentChannels.ts
        let adminFee = 0;

        // Helper to match logic
        const getFee = (method: string, channel: string | undefined, price: number) => {
            // QRIS (0.7%)
            if (method === 'QRIS' || (method === 'qris' && (!channel || channel === 'qris'))) {
                return Math.floor(price * 0.007);
            }
            // Virtual Account (Flat ~4000-4500)
            if (method === 'VA' || method === 'va') {
                if (channel?.includes('mandiri')) return 4000;
                if (channel?.includes('bri')) return 3500;
                return 4500; // BCA, BNI, CIMB, Permata default
            }
            // E-Wallet (~1.5% - 2.0%)
            if (method === 'EWALLET' || method === 'ewallet') {
                if (channel?.includes('shopeepay')) return Math.floor(price * 0.02);
                return Math.floor(price * 0.015); // DANA, OVO, LinkAja
            }
            // Retail (Flat ~3500)
            if (method === 'CSTORE' || method === 'cstore') {
                return 3500;
            }
            return 0;
        };

        if (paymentMethod !== 'BALANCE') {
            adminFee = getFee(paymentMethod, paymentChannel, finalAmount);
        }

        const totalPayable = finalAmount + adminFee;

        // 3. Handle Payment Method
        if (paymentMethod === 'BALANCE') {
            // A. BALANCE PAYMENT (SECURE)
            const authHeader = req.headers.authorization;
            if (!authHeader) return res.status(401).json({ success: false, message: 'Authentication required for Balance payment' });

            const token = authHeader.split(" ")[1];
            if (!token) return res.status(401).json({ success: false, message: 'Invalid token' });

            // Verify Token (REMOVED: Using middleware is better, but let's keep for legacy/internal check)
            let payerId;
            try {
                if (!process.env.JWT_SECRET) throw new Error("Missing Secret");
                const decoded: any = jwt.verify(token as string, process.env.JWT_SECRET);
                payerId = decoded.id;
            } catch (err) {
                return res.status(403).json({ success: false, message: 'Invalid or Expired Session' });
            }

            // Atomic Transaction: Deduct Balance & Create Transaction & Decrement Voucher
            // To fix race condition, we perform updates in a transaction and use predicates (where clause)
            try {
                await prisma.$transaction(async (tx) => {
                    // 1. Deduct Balance (Atomic Check)
                    const payer = await tx.user.update({
                        where: { id: payerId, balance: { gte: finalAmount } },
                        data: { balance: { decrement: finalAmount } }
                    });

                    // 2. Decrement Voucher (Atomic Check)
                    if (validVoucherCode && discountAmount > 0) {
                        await tx.voucher.update({
                            where: { code: validVoucherCode, stock: { gt: 0 } },
                            data: { stock: { decrement: 1 } }
                        });
                    }

                    // 3. Create Transaction Record
                    const trx = await tx.transaction.create({
                        data: {
                            invoice,
                            productId,
                            targetId: userId,
                            zoneId,
                            amount: finalAmount,
                            discountAmount,
                            voucherCode: validVoucherCode,
                            status: 'PROCESSING',
                            paymentMethod: 'BALANCE',
                            paymentGateway: 'BALANCE',
                            userId: payer.id,
                            guestContact: payer.phoneNumber || null
                        } as any
                    });

                    // Respond SUCCESS immediately
                    res.json({
                        success: true,
                        data: {
                            invoice,
                            status: 'PROCESSING',
                            productName: product.name,
                            amount: finalAmount
                        }
                    });

                    // Async Process
                    console.log(`✅ [BALANCE] Payment Success: ${invoice} | User: ${payer.name}`);

                    // Send WA
                    if (payer.phoneNumber) {
                        const waMsg = `🌟 *GRIMOIRE COINS STORE* 🌟\n---------------------------\n💰 *PEMBAYARAN DITERIMA*\nInvoice: *${invoice}*\nStatus: LUNAS (Saldo)\nTotal Paid: Rp${finalAmount.toLocaleString('id-ID')}\n\n⏳ *Sedang Memproses...*\nOrder Anda sedang dikerjakan oleh sistem. Mohon tunggu 1-3 menit.\n---------------------------`;
                        whatsappService.sendMessage(payer.phoneNumber, waMsg).catch(console.error);
                    }

                    processGameTopup(trx.id).catch(err => console.error("Auto Process Error:", err));
                });

                return; // Response handled inside transaction block

            } catch (txError: any) {
                if (txError.code === 'P2025') {
                    // Record to update not found -> Condition failed (Insufficient balance or voucher stock)
                    return res.status(400).json({ success: false, message: 'Insufficient Balance or Voucher ran out just now.' });
                }
                throw txError;
            }





        } else {
            // B. GATEWAY PAYMENT (TRIPAY / IPAYMU) -> Handled by Java Service
            // Resolve User for History Linking
            let userIdForTrx = authUserId;
            let targetPhone = guestContact;

            if (!userIdForTrx && req.headers.authorization) {
                try {
                    const token = req.headers.authorization.split(' ')[1];
                    const jwt = (await import('jsonwebtoken')).default;
                    if (!process.env.JWT_SECRET) throw new Error("Missing Secret");
                    const decoded: any = jwt.verify(token as string, process.env.JWT_SECRET);
                    userIdForTrx = decoded.id;
                } catch (e) { }
            }

            if (userIdForTrx && !targetPhone) {
                try {
                    const u = await prisma.user.findUnique({ where: { id: userIdForTrx } });
                    if (u && u.phoneNumber) targetPhone = u.phoneNumber;
                } catch (e) { }
            }

            // --- GATEWAY SELECTION ---
            let gateway = 'IPAYMU'; // Default
            let tripayConfig = {
                mode: 'PRODUCTION', // Default
                apiKey: '',
                privateKey: '',
                merchantCode: ''
            };

            try {
                // Fetch All Configs at once to minimize DB calls
                const configs = await (prisma as any).systemConfig.findMany({
                    where: {
                        key: { in: ['PAYMENT_GATEWAY', 'TRIPAY_MODE', 'TRIPAY_SB_API_KEY', 'TRIPAY_SB_PRIVATE_KEY', 'TRIPAY_SB_MERCHANT_CODE', 'TRIPAY_PROD_API_KEY', 'TRIPAY_PROD_PRIVATE_KEY', 'TRIPAY_PROD_MERCHANT_CODE'] }
                    }
                });

                const configMap: Record<string, string> = {};
                configs.forEach((c: any) => configMap[c.key] = c.value);

                // 1. Gateway Selection
                if (configMap['PAYMENT_GATEWAY']) {
                    gateway = configMap['PAYMENT_GATEWAY'].toUpperCase();
                } else {
                    gateway = (process.env.PAYMENT_GATEWAY || 'IPAYMU').toUpperCase();
                }

                // 2. Tripay Config Selection
                if (gateway === 'TRIPAY') {
                    const mode = configMap['TRIPAY_MODE'] || 'PRODUCTION';
                    tripayConfig.mode = mode;

                    if (mode === 'SANDBOX') {
                        tripayConfig.apiKey = configMap['TRIPAY_SB_API_KEY'] || '';
                        tripayConfig.privateKey = configMap['TRIPAY_SB_PRIVATE_KEY'] || '';
                        tripayConfig.merchantCode = configMap['TRIPAY_SB_MERCHANT_CODE'] || '';
                    } else {
                        tripayConfig.apiKey = configMap['TRIPAY_PROD_API_KEY'] || '';
                        tripayConfig.privateKey = configMap['TRIPAY_PROD_PRIVATE_KEY'] || '';
                        tripayConfig.merchantCode = configMap['TRIPAY_PROD_MERCHANT_CODE'] || '';
                    }
                }

            } catch (e) {
                // If DB fails, fallback to ENV
                gateway = (process.env.PAYMENT_GATEWAY || 'IPAYMU').toUpperCase();
            }

            // Create Pending Transaction in DB First
            let trxId = `TRX-${Date.now()}`;
            try {
                const trx = await prisma.transaction.create({
                    data: {
                        invoice,
                        productId,
                        targetId: userId, // Game User ID
                        zoneId,
                        amount: totalPayable, // Store TOTAL including fee
                        discountAmount,
                        adminFee: adminFee, // Store Fee separately for records
                        voucherCode: validVoucherCode,
                        status: 'PENDING',
                        paymentMethod,
                        paymentGateway: gateway,
                        userId: userIdForTrx || undefined,
                        guestContact: targetPhone || null
                    } as any
                });
                trxId = trx.id;
            } catch (dbError) {
                console.warn("DB Transaction Create Failed:", dbError);
                return res.status(500).json({ success: false, message: "Database Error" });
            }

            // Call Java Payment Service
            // Determine Method Logic:
            // Input `paymentMethod`: "TRIPAY", "IPAYMU", "QRIS", "VA_BCA"? 
            // The frontend usually sends specific method info.
            // Setup: 
            // - Logic: If paymentMethod is generic (e.g. 'VA', 'QRIS') we need to know WHICH PROVDER to use.
            // - Start with: All 'QRIS' -> Tripay? Or Ipaymu? 
            // - User decided: Tripay + Migrate Ipaymu.
            // - Let's assume frontend sends Provider explicitly OR we map it.
            // - Current Frontend sends "QRIS", "VA_BCA", etc. (derived from channel).
            // - Let's Default to Tripay for new stuff, Use Ipaymu for legacy? 
            // - User wants "Ipaymu pindah juga". So Java handles both.
            // - We need to tell Java WHICH ONE. 
            // - Let's Map: "TRIPAY" or "IPAYMU" as `method` arg to Java.
            // - How do we know? Maybe add config/env? Or frontend sends it?
            // - For now: Let's assume we pass "TRIPAY" as default, or check a flag.

            // FIXME: Hardcoded selection or derived?
            // "satu project sama tripay". 
            // Let's use IPAYMU for existing Ipaymu Channels if we can distinguish.
            // OR change all to Tripay? 
            // User: "yang ipaymu pindah juga bisa gga?". Meaning KEEP Ipaymu but in Java.
            // So we need to Select based on Channel.

            const paymentService = await import('../services/payment.service.js');

            let finalChannel = paymentChannel || paymentMethod;

            // Channel Mapping (Node -> Java Service)
            // Frontend sends lowercase codes (e.g. 'bca', 'qris')
            if (gateway === 'TRIPAY') {
                const map: any = {
                    'bca': 'BCAVA',
                    'mandiri': 'MANDIRIVA',
                    'bni': 'BNIVA',
                    'bri': 'BRIVA',
                    'cimb': 'CIMBVA',
                    'permata': 'PERMATAVA',
                    'alfamart': 'ALFAMART',
                    'indomaret': 'INDOMARET',
                    'qris': 'QRIS',
                    'dana': 'DANA',
                    'ovo': 'OVO',
                    'shopeepay': 'SHOPEEPAY'
                };
                if (map[finalChannel]) finalChannel = map[finalChannel];
                else finalChannel = finalChannel.toUpperCase(); // Fallback
            } else if (gateway === 'IPAYMU') {
                // Java IpaymuGateway handles mapping, but we can ensure clean codes here
                const vaList = ['bca', 'mandiri', 'bni', 'bri', 'cimb', 'permata', 'danamon'];
                if (vaList.includes(finalChannel)) {
                    // Just send 'bca', 'mandiri' etc. Java will handle it.
                    // But if it already has va_ prefix, keep it or normalize.
                    finalChannel = finalChannel.replace('va_', '');
                }
            }

            console.log(`🔌 [GATEWAY] Using ${gateway} (${tripayConfig.mode}) for Channel: ${finalChannel} (Original: ${paymentChannel})`);

            const payment = await paymentService.createPayment(
                trxId,
                totalPayable, // Use Final Amount + Fee
                gateway as 'TRIPAY' | 'IPAYMU', // 'TRIPAY' | 'IPAYMU'
                finalChannel, // 'QRIS', 'BCAVA', etc.
                trxId, // BuyerName (Anon)
                'guest@grimoire.com',
                targetPhone || '08123456789',
                product.name,
                // Pass Credentials
                tripayConfig.apiKey,
                tripayConfig.privateKey,
                tripayConfig.merchantCode,
                tripayConfig.mode
            );

            // Update Transaction with Result
            if (payment.success) {
                await prisma.transaction.update({
                    where: { id: trxId },
                    data: {
                        paymentUrl: payment.paymentUrl,
                        paymentTrxId: payment.paymentTrxId,
                        paymentNo: payment.paymentNo,
                        paymentChannel: payment.paymentName // standardized name
                    }
                });

                // Response
                res.json({
                    success: true,
                    data: {
                        id: trxId,
                        invoice,
                        paymentUrl: payment.paymentUrl,
                        paymentNo: payment.paymentNo,
                        paymentName: payment.paymentName,
                        expired: payment.expiredTime,
                        productName: product.name,
                        amount
                    }
                });
            } else {
                // Return Error
                res.status(400).json({ success: false, message: payment.message });
            }

        }

    } catch (error: any) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/transaction/deposit
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
        let trxId = `TRX_DEP_${Date.now()}`; // Consistent ID format

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

        const paymentService = await import('../services/payment.service.js');

        // Determine Gateway from ENV
        const envGateway = process.env.PAYMENT_GATEWAY || 'IPAYMU';
        const gateway = envGateway.toUpperCase();

        let finalChannel = paymentMethod; // e.g. 'VA_BCA'

        // Channel Logic for Deposit (Assume Frontend sends correct codes or same mapping needed?)
        // Frontend likely sends 'va_bca' or 'qris'. 
        // If Tripay, we might need to map 'va_bca' -> 'BCAVA'.
        if (gateway === 'TRIPAY') {
            const map: any = {
                'va_bca': 'BCAVA',
                'va_mandiri': 'MANDIRIVA',
                'va_bni': 'BNIVA',
                'va_bri': 'BRIVA',
                'va_cimb': 'CIMBVA',
                'va_permata': 'PERMATAVA',
                'qris': 'QRIS'
            };
            if (map[finalChannel]) finalChannel = map[finalChannel];
            else finalChannel = finalChannel.toUpperCase().replace('VA_', '') + 'VA'; // Try heuristic
        }

        const payment = await paymentService.createPayment(
            trxId,
            Number(amount),
            gateway as 'TRIPAY' | 'IPAYMU',
            finalChannel,
            user.name || 'User',
            user.email,
            user.phoneNumber || '08123456789',
            'Deposit Saldo'
        );

        if (!payment.success) {
            await prisma.transaction.update({ where: { id: trxId }, data: { status: 'FAILED' } });
            return res.status(500).json({ success: false, message: payment.message || 'Payment Error' });
        }

        // Update DB
        await prisma.transaction.update({
            where: { id: trxId },
            data: {
                paymentUrl: payment.paymentUrl,
                paymentTrxId: payment.paymentTrxId,
                paymentNo: payment.paymentNo,
                paymentChannel: payment.paymentName
            }
        });

        res.json({
            success: true,
            data: {
                invoice,
                paymentUrl: payment.paymentUrl,
                paymentNo: payment.paymentNo,
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
        const ipaymuTrxId = req.body.trx_id; // iPaymu Transaction ID (Integer)
        const sid = req.body.sid; // Broker ID

        if (!trxId || !sid) return res.status(400).json({ success: false, message: "Invalid payload" });

        const trx = await prisma.transaction.findUnique({ where: { id: trxId } });
        if (!trx) return res.status(404).json({ success: false, message: 'Transaction Not Found' });

        // Idempotency Check
        if (trx.status === 'SUCCESS' || trx.status === 'PROCESSING') {
            console.log(`⚠️ Transaction ${trxId} already SUCCESS/PROCESSING. Ignoring callback.`);
            return res.json({ success: true, message: 'Already paid' });
        }

        if (status === 'berhasil') {
            const fee = parseFloat(req.body.fee || '0');
            const totalPaid = parseFloat(req.body.total || req.body.amount || '0');

            // 1. Double Check with Server (Security) using IPAYMU ID
            // If we use trxId (UUID), verify fails because API expects Integer ID
            const verification = await ipaymuService.checkTransaction(String(ipaymuTrxId));
            if (!verification.success) {
                console.warn(`⚠️ [SECURITY] Webhook Verification Failed for ${trxId}. Ignoring.`);
                return res.status(400).json({ success: false, message: 'Verification Failed' });
            }
            // Enforce Success check from API (Status 1 or 6 usually means success/paid)
            if (String(verification.status) !== '6' && verification.statusDesc?.toLowerCase() !== 'berhasil') {
                console.warn(`⚠️ [SECURITY] API says not success yet: ${verification.statusDesc}`);
                return res.status(400).json({ success: false, message: 'Verification Status Mismatch' });
            }

            // 2. Update Transaction
            const paymentChannel = req.body.channel || req.body.via || null;
            const paymentNo = req.body.va || req.body.qris || null;

            // Standard Practice: 
            // - Topup: Payment Paid -> 'PROCESSING' (waiting for provider)
            // - Deposit: Payment Paid -> 'SUCCESS' (balance added instantly)
            const newStatus = (trx.type === 'DEPOSIT') ? 'SUCCESS' : 'PROCESSING';

            await prisma.transaction.update({
                where: { id: trxId },
                data: {
                    status: newStatus,
                    adminFee: fee,
                    amount: totalPaid,
                    updatedAt: new Date(),
                    paymentTrxId: sid,
                    paymentChannel: paymentChannel as string,
                    paymentNo: paymentNo as string
                }
            });

            // ⚡ Real-Time Update
            const io = req.app.get('io');
            if (io) {
                console.log(`🔌 [SOCKET] Emitting Update to ${trxId}: ${newStatus}`);
                io.to(trxId).emit('transaction_update', {
                    status: newStatus,
                    transactionId: trxId
                });
            }

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

                const waMsg = `🌟 *GRIMOIRE COINS STORE* 🌟\n---------------------------\n💰 *PEMBAYARAN DITERIMA*\nInvoice: *${trx.invoice}*\nStatus: LUNAS${paymentInfo}\nTotal Paid: Rp${totalPaid.toLocaleString('id-ID')}\n\n⏳ *Sedang Memproses...*\nOrder Anda sedang dikerjakan oleh sistem. Mohon tunggu 1-3 menit.\n---------------------------`;
                whatsappService.sendMessage(targetWa, waMsg).catch(err => console.error("WA Error:", err));
            }

            // 5. TRIGGER GAME PROVIDER (Crucial Step)
            if (trx.type === 'TOPUP' || !trx.type) {
                console.log(`⚙️ [CALLBACK] Triggering Auto-Process for ${trxId}`);
                processGameTopup(trxId).catch(e => console.error("Process Trigger Failed:", e));
            }

        } else if (status === 'gagal') {
            // User Request: If payment fails, set to PENDING (Payment Pending) instead of FAILED
            await prisma.transaction.update({ where: { id: trxId }, data: { status: 'PENDING' } });
            console.log(`❌ Transaction ${trxId} Payment Failed -> Reverted to PENDING`);
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
        if (!id || id === 'null' || id === 'undefined') {
            return res.status(400).json({ success: false, message: "Invalid Transaction ID" });
        }

        // 1. Get Transaction
        const trx = await prisma.transaction.findUnique({ where: { id }, include: { product: true } });
        if (!trx) return res.status(404).json({ success: false, message: "Transaction not found" });

        // A. If PENDING, Check Payment Gateway First
        if ((trx.status as any) === 'PENDING') {
            if (trx.paymentTrxId) {
                let payCheck: any = { success: false };

                // Determine Gateway
                const gateway = (trx as any).paymentGateway || 'IPAYMU'; // Fallback for older records

                if (gateway === 'IPAYMU') {
                    payCheck = await ipaymuService.checkTransaction(trx.paymentTrxId);
                } else if (gateway === 'TRIPAY') {
                    // IMPLEMENT TRIPAY CHECK IN NODE.JS OR CALL JAVA
                    // For now, let's keep it in Node.js for speed
                    console.log(`🔍 [TRIPAY] Checking Status for: ${trx.paymentTrxId}`);
                    // Fetch Tripay Config
                    const configs = await (prisma as any).systemConfig.findMany({
                        where: {
                            key: { in: ['TRIPAY_MODE', 'TRIPAY_SB_API_KEY', 'TRIPAY_PROD_API_KEY'] }
                        }
                    });
                    const configMap: Record<string, string> = {};
                    configs.forEach((c: any) => configMap[c.key] = c.value);

                    const mode = configMap['TRIPAY_MODE'] || 'PRODUCTION';
                    const apiKey = mode === 'SANDBOX' ? configMap['TRIPAY_SB_API_KEY'] : configMap['TRIPAY_PROD_API_KEY'];
                    const baseUrl = mode === 'SANDBOX' ? 'https://tripay.co.id/api-sandbox' : 'https://tripay.co.id/api';

                    try {
                        const response = await axios.get(`${baseUrl}/transaction/detail`, {
                            params: { reference: trx.paymentTrxId },
                            headers: { 'Authorization': `Bearer ${apiKey}` }
                        });
                        const data = response.data?.data;
                        if (data && (data.status === 'PAID' || data.status === 'SETTLEMENT')) {
                            payCheck = { success: true, status: 6, statusDesc: 'Berhasil' };
                        } else {
                            console.log(`ℹ️ [TRIPAY] Status is still: ${data?.status}`);
                        }
                    } catch (err: any) {
                        console.error(`❌ [TRIPAY] Check Error:`, err.response?.data || err.message);
                    }
                }

                // Unified Status Handling: Ipaymu Status 1=Berhasil, 6=Paid
                if (payCheck.success && (payCheck.status === 1 || payCheck.status === 6 || payCheck.statusDesc?.toLowerCase() === 'berhasil')) {
                    console.log(`✅ [MANUAL CHECK] Payment found SUCCESS for ${trx.invoice} via ${(trx as any).paymentGateway}`);

                    // Update to PROCESSING (Paid, waiting for provider)
                    await prisma.transaction.update({
                        where: { id: trx.id },
                        data: {
                            status: 'PROCESSING',
                            updatedAt: new Date()
                        }
                    });

                    // Trigger Provider
                    processGameTopup(trx.id).catch(console.error);

                    return res.json({ success: true, message: "Payment Verified! Order Processing.", data: { status: 'PROCESSING' } });
                }
            }
        }

        // B. Check Provider Status (VIP)
        // Only if status is PROCESSING or SUCCESS
        // B. Check Provider Status (VIP)
        console.log(`🔍 [CHECK-STATUS] ID: ${id} | Status: ${trx.status} | ProviderID: ${trx.providerTrxId}`);

        if (trx.status === 'PROCESSING' || trx.status === 'SUCCESS') {
            if (!trx.providerTrxId) {
                // ... existing retry logic ...
                // skipping for brevity in replacement, assuming it's unchanged unless I need to include it.
                // Wait, I need to include the whole block to replace correctly.
                // Retaining Retry Logic:
                console.log(`⚠️ [MANUAL CHECK] Processing Status but no Provider ID. Retrying Process...`);
                const proc = await processGameTopup(trx.id);
                if (proc?.success) {
                    return res.json({ success: true, message: "Order Retried to Provider", data: { status: 'PROCESSING' } });
                }
                return res.json({ success: false, message: "Provider Retry Failed" });
            }

            console.log(`🔍 [CHECK-STATUS] Calling VIP CheckTransaction...`);
            // Adapter expects (refId, providerId). VIP needs providerId (2nd arg).
            const result = await gameProvider.checkTransaction(trx.invoice, trx.providerTrxId);
            console.log(`🔍 [CHECK-STATUS] VIP Result:`, JSON.stringify(result));

            if (result.success && result.data) {
                const providerStatus = (result.data as any).status;
                console.log(`🔍 [CHECK-STATUS] Provider Says: ${providerStatus}`);

                let newStatus: any = trx.status;

                // Sync Status Logic with Callback (Case Insensitive)
                const pStatus = String(providerStatus).toLowerCase();
                if (pStatus === 'success' || pStatus === 'sukses' || pStatus === 'berhasil') {
                    newStatus = 'SUCCESS';
                } else if (pStatus === 'error' || pStatus === 'failed' || pStatus === 'gagal') {
                    newStatus = 'FAILED';
                }

                console.log(`🔍 [CHECK-STATUS] Decision: ${trx.status} -> ${newStatus}`);

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

                    // ⚡ Real-Time Update
                    const io = req.app.get('io');
                    if (io) {
                        console.log(`🔌 [SOCKET] Emitting Update to ${id}: ${newStatus}`);
                        io.to(id).emit('transaction_update', {
                            status: newStatus,
                            transactionId: id
                        });
                    }

                    // Send WA if Success
                    if (newStatus === 'SUCCESS') {
                        console.log(`📨 [WA] Sending Success Notification via Manual Sync...`);
                        // Re-fetch to get contacts if needed, or use existing 'trx' object (trx.guestContact/userId)
                        // But 'trx' object might be stale? No, 'trx' has guestContact.
                        let targetWa = trx.guestContact;
                        if (!targetWa && trx.userId) {
                            const u = await prisma.user.findUnique({ where: { id: trx.userId } });
                            if (u) targetWa = u.phoneNumber;
                        }

                        if (targetWa) {
                            const waMsg = `🌟 *GRIMOIRE COINS STORE* 🌟\n---------------------------\n✅ *TOPUP SUKSES*\nInvoice: *${trx.invoice}*\nGame: ${trx.product?.name}\nUser ID: ${trx.targetId}\n\n🔑 *SN / KODE:*\n${(result.data as any).sn}\n---------------------------\nTerima kasih sudah berbelanja di Grimoire Coins!`;
                            whatsappService.sendMessage(targetWa, waMsg).catch(console.error);
                        }
                    }

                    return res.json({ success: true, message: "Status Updated", data: { status: newStatus } });
                } else {
                    return res.json({ success: true, message: `Status Unchanged (${providerStatus})`, data: { status: trx.status } });
                }
            } else {
                console.error(`❌ [CHECK-STATUS] VIP Check Failed: ${result.message}`);
                return res.json({ success: false, message: `Provider Check Failed: ${result.message}` });
            }
        }

        return res.json({ success: true, message: "No Updates Available (Not Processing)", data: { status: trx.status } });

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

        // IDOR Protection: 
        // If transaction has a userId, ensure only the owner can see full details.
        // For guest transactions, we might allow public view but hide sensitive contact info.
        const authUser = (req as any).user;
        const isOwner = authUser && authUser.id === transaction.userId;

        if (transaction.userId && !isOwner) {
            return res.status(403).json({ success: false, message: 'Access Denied: Private Transaction' });
        }

        // Sensitive Data Masking for non-owners (e.g. public status check)
        const safeData = {
            ...transaction,
            guestContact: isOwner ? transaction.guestContact : '********' + (transaction.guestContact?.slice(-3) || '')
        };

        res.json({ success: true, data: safeData });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const VIP_WHITELIST_IP = '178.248.73.218';

// POST /api/transaction/callback/vip
export const handleVipCallback = async (req: Request, res: Response) => {
    // 1. IP Whitelist Check
    const remoteIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
    if (process.env.NODE_ENV === 'production') {
        const isWhitelisted = remoteIp === VIP_WHITELIST_IP || remoteIp.includes(VIP_WHITELIST_IP);
        if (!isWhitelisted) {
            console.warn(`❌ [VIP CALLBACK] Unauthorized IP: ${remoteIp}`);
            return res.status(403).json({ result: false, message: 'Unauthorized IP' });
        }
    }

    // 2. Signature Check (Improved security note)
    const signature = req.headers['x-client-signature'] as string;
    const apiId = process.env.VIP_APIID || '';
    const apiKey = process.env.VIP_APIKEY || '';

    // Note: Provider signature is static (apiId + apiKey). 
    // We add additional data checks below to mitigate replay/fraud.
    const mySignature = crypto.createHash('md5').update(apiId + apiKey).digest('hex');

    // Secure Comparison (Timing Safe)
    const signatureBuffer = Buffer.from(signature || '');
    const expectedBuffer = Buffer.from(mySignature);

    if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
        console.error(`❌ [VIP CALLBACK] Invalid Signature from ${remoteIp}. Got: ${signature}`);
        return res.status(403).json({ result: false, message: 'Invalid Signature' });
    }

    // 3. Payload Validation
    const { data } = req.body;
    if (!data || !data.trxid) {
        console.error(`❌ [VIP CALLBACK] Invalid Payload structure.`);
        return res.status(400).json({ result: false, message: 'Invalid Payload' });
    }

    const { trxid, status, note } = data;

    try {
        // Find Transaction by Provider ID
        const transaction = await prisma.transaction.findFirst({
            where: { providerTrxId: trxid }
        });

        if (!transaction) {
            console.error(`❌ [VIP CALLBACK] Transaction Not Found for Provider ID: ${trxid}`);
            return res.status(404).json({ result: false, message: 'Transaction Not Found' });
        }

        // --- IDEMPOTENCY & SECURITY CHECK ---
        // If transaction is already SUCCESS, we DO NOT allow changing it back to something else via callback.
        if (transaction.status === 'SUCCESS') {
            console.log(`ℹ️ [VIP CALLBACK] Transaction ${transaction.invoice} already SUCCESS. Ignoring callback.`);
            return res.json({ result: true, message: 'Already success' });
        }

        console.log(`🔔 [VIP CALLBACK] Updating Trx ${transaction.invoice} | Old Status: ${transaction.status} -> New: ${status}`);

        let newStatus: any = transaction.status;
        let sn = transaction.sn || '';

        // Map Status
        if (status === 'success') {
            newStatus = 'SUCCESS';
            sn = note || sn;
        } else if (status === 'error') {
            newStatus = 'FAILED';
            sn = note || sn;
        } else if (status === 'waiting' || status === 'processing') {
            newStatus = 'PROCESSING';
        } else {
            // Keep current status or map unknown as FAILED?
            // Safer to just log and keep current if unknown.
        }

        if (newStatus !== transaction.status) {
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: newStatus,
                    providerStatus: status,
                    sn: sn,
                    updatedAt: new Date()
                }
            });

            // Send WA Notification
            if (newStatus === 'SUCCESS') {
                console.log(`📨 [WA] Sending Success Notification via Callback...`);
                let targetWa = transaction.guestContact;
                if (!targetWa && transaction.userId) {
                    const u = await prisma.user.findUnique({ where: { id: transaction.userId } });
                    if (u) targetWa = u.phoneNumber;
                }

                if (targetWa) {
                    const fullTrx = await prisma.transaction.findUnique({ where: { id: transaction.id }, include: { product: true } });
                    const prodName = fullTrx?.product?.name || 'Item';

                    const waMsg = `🌟 *GRIMOIRE COINS STORE* 🌟\n---------------------------\n✅ *TOPUP SUKSES*\nInvoice: *${transaction.invoice}*\nGame: ${prodName}\nUser ID: ${transaction.targetId}\n\n🔑 *SN / KODE:*\n${sn}\n---------------------------\nTerima kasih sudah berbelanja di Grimoire Coins!`;
                    whatsappService.sendMessage(targetWa, waMsg).catch(console.error);
                }
            }
        }

        return res.json({ result: true, message: 'Callback Processed' });

    } catch (error: any) {
        console.error('❌ [VIP CALLBACK] System Error:', error);
        return res.status(500).json({ result: false, message: 'Internal Error' });
    }
};
