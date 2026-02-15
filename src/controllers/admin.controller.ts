import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

// GET /api/admin/stats
export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [
            totalTransactions,
            todayTransactions,
            successTransactions,
            totalRevenue,
            pendingTransactions
        ] = await Promise.all([
            prisma.transaction.count(),
            prisma.transaction.count({ where: { createdAt: { gte: today } } }),
            prisma.transaction.count({ where: { status: 'SUCCESS' } }),
            prisma.transaction.aggregate({
                _sum: { amount: true },
                where: { status: 'SUCCESS' }
            }),
            prisma.transaction.count({ where: { status: { in: ['PENDING', 'PROCESSING'] } } })
        ]);

        // Get Recent Transactions
        const recentTransactions = await prisma.transaction.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { name: true, email: true } }, product: true }
        });

        res.json({
            success: true,
            data: {
                totalTransactions,
                todayTransactions,
                successRate: totalTransactions > 0 ? ((successTransactions / totalTransactions) * 100).toFixed(1) : 0,
                totalRevenue: totalRevenue._sum.amount || 0,
                pendingCount: pendingTransactions,
                recentTransactions
            }
        });
    } catch (error: any) {
        console.error("Admin Stats Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/admin/transactions
export const getAllTransactions = async (req: Request, res: Response) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const status = req.query.status as string; // Optional filter
        const search = req.query.search as string; // Search filter

        const whereClause: any = {};
        if (status && status !== 'ALL') {
            whereClause.status = status;
        }

        if (search) {
            whereClause.OR = [
                { invoice: { contains: search, mode: 'insensitive' } },
                { user: { name: { contains: search, mode: 'insensitive' } } },
                { user: { email: { contains: search, mode: 'insensitive' } } },
                { guestContact: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [total, transactions] = await Promise.all([
            prisma.transaction.count({ where: whereClause }),
            prisma.transaction.findMany({
                where: whereClause,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { name: true, email: true } },
                    product: { select: { name: true, sku_code: true } }
                }
            })
        ]);

        res.json({
            success: true,
            data: {
                transactions,
                pagination: {
                    total,
                    page,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error: any) {
        console.error("Admin Transactions Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/admin/products/:id/price
export const updateProductPrice = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const { price_sell, isActive } = req.body;

        const updateData: any = {};
        if (price_sell !== undefined) updateData.price_sell = Number(price_sell);
        if (isActive !== undefined) updateData.isActive = Boolean(isActive);

        const product = await prisma.product.update({
            where: { id },
            data: updateData
        });

        res.json({ success: true, message: "Product updated", data: product });
    } catch (error: any) {
        console.error("Update Product Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/admin/products
export const getAllProducts = async (req: Request, res: Response) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 50; // More items for products
        const skip = (page - 1) * limit;
        const search = req.query.search as string;
        const categoryId = req.query.categoryId as string;

        const whereClause: any = {};
        if (categoryId && categoryId !== 'all') {
            whereClause.categoryId = categoryId;
        }

        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { sku_code: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [total, products] = await Promise.all([
            prisma.product.count({ where: whereClause }),
            prisma.product.findMany({
                where: whereClause,
                skip,
                take: limit,
                orderBy: { categoryId: 'asc' }, // Group by category implicitly
                include: { category: { select: { name: true } } }
            })
        ]);

        res.json({
            success: true,
            data: {
                products,
                pagination: {
                    total,
                    page,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error: any) {
        console.error("Admin Products Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
// POST /api/admin/products/sync
import * as vipService from '../services/vip.service.js';
import * as fs from 'fs';
import * as path from 'path';

export const syncProducts = async (req: Request, res: Response) => {
    try {
        // 1. Fetch from Provider
        console.log('🔄 [SYNC] Fetching products from VIP...');
        const result = await vipService.getMerchantServices(); // Use direct export

        if (!result.success || !Array.isArray(result.data)) {
            return res.status(400).json({ success: false, message: result.message || 'No products found' });
        }
        const providerServices = result.data;
        console.log(`📦 [SYNC] Received ${providerServices.length} services from VIP.`);

        // [NEW] Load Manual Category Mapping from JSON (Generated from Excel)
        let manualCats = new Map();
        try {
            const mappingPath = path.join(process.cwd(), 'category_mapping.json'); // Fix path to root
            if (fs.existsSync(mappingPath)) {
                const rawMapping = fs.readFileSync(mappingPath, 'utf-8');
                const mappingData = JSON.parse(rawMapping);
                mappingData.forEach((item: any) => {
                    // Map by Name (e.g. "Mobile Legends A") AND Brand
                    if (item.name) manualCats.set(item.name.toLowerCase(), item);
                    // if (item.brand) manualCats.set(item.brand.toLowerCase(), item); // Don't map by brand generic, only specific name?
                    // Actually, if Excel has specific "Mobile Legends A", we want to map "Mobile Legends A" products to that ID.
                });
                console.log(`📂 [SYNC] Loaded ${mappingData.length} manual category mappings.`);
            } else {
                console.warn(`⚠️ [SYNC] Mapping file not found at ${mappingPath}`);
            }
        } catch (e) {
            console.error("❌ Failed to load category mapping:", e);
        }

        // 2. Get All Active Categories for mapping
        const categories = await prisma.category.findMany({
            where: { isActive: true }
        });

        const catMap = new Map();
        categories.forEach(c => {
            if (c.code) catMap.set(c.code.toLowerCase(), c);
            catMap.set(c.name.toLowerCase(), c);
            catMap.set(c.slug.toLowerCase(), c); // Added slug for robust matching
        });

        // 3. Attempt to Clear Database
        // User requested "kosongkan db" (Empty DB).
        // This might fail if products are linked to transactions.
        try {
            console.log('🗑️ [SYNC] Attempting to delete all existing products...');
            await prisma.product.deleteMany({});
            console.log('✅ [SYNC] Database cleared successfully.');
        } catch (dbError: any) {
            console.warn('⚠️ [SYNC] Could not clear database (likely due to existing transactions). Proceeding with soft-sync (Update/Insert).');

            // Fallback: Mark all as Inactive first so we know what's obsolete
            await prisma.product.updateMany({
                data: { isActive: false }
            });
        }

        let totalUpdated = 0;
        let totalCreated = 0;
        let totalCategoriesCreated = 0; // Track created categories
        let skipped = 0;
        let processedCount = 0;
        const totalItems = providerServices.length;

        const io = req.app.get('io'); // Get Socket Instance

        // Helper: Determine Group (Ported from Microservice)
        const determineGroup = (game: string, name: string): string => {
            const nameLower = name.toLowerCase();
            const gameLower = game.toLowerCase();

            let group = game; // Default Group is Game Name

            if (gameLower.includes("mobile") && gameLower.includes("legend")) {
                if (nameLower.includes("starlight") || nameLower.includes("twilight") || nameLower.includes("pass") || nameLower.includes("weekly")) {
                    group = "Membership";
                } else if (nameLower.includes("joki") || nameLower.includes("win") || nameLower.includes("rank")) {
                    group = "Joki Rank";
                } else if (nameLower.includes("global") || nameLower.includes("server")) {
                    if (nameLower.includes("indonesia")) {
                        group = "Indonesia Server";
                    } else {
                        group = "Global Server";
                    }
                }
            } else if (gameLower.includes("free") && gameLower.includes("fire")) {
                if (nameLower.includes("member") || nameLower.includes("mingguan") || nameLower.includes("bulanan")) {
                    group = "Membership";
                } else if (nameLower.includes("level up")) {
                    group = "Event";
                }
            }
            return group;
        };

        // Helper: Normalize Brand (Group variations into one Game Brand)
        const normalizeBrand = (name: string): string => {
            const lower = name.toLowerCase();
            if (lower.includes("mobile") && lower.includes("legend")) return "Mobile Legends";
            if (lower.includes("free") && lower.includes("fire")) return "Free Fire";
            if (lower.includes("pubg")) return "PUBG Mobile";
            if (lower.includes("genshin")) return "Genshin Impact";
            if (lower.includes("honkai")) return "Honkai: Star Rail";
            if (lower.includes("valorant")) return "Valorant";
            if (lower.includes("cod") || lower.includes("call of duty")) return "Call of Duty Mobile";

            // Default: Use full name, maybe strip common suffixes if generic logic needed
            return name;
        };

        // 4. Process Each Service
        for (const item of providerServices) {
            processedCount++;

            // Emit Progress
            if (processedCount % 20 === 0 || processedCount === totalItems) {
                if (io) {
                    io.emit('admin_sync_progress', {
                        current: processedCount,
                        total: totalItems,
                        percentage: Math.round((processedCount / totalItems) * 100)
                    });
                }
            }
            // item: { code, name, category (game), price, status }

            // Find Matching Category
            let catName = (item.category || 'Unknown Game').trim();
            const catKey = catName.toLowerCase();

            // Initialize category variable for scope
            let category: any = null;

            // NEW: Check Manual Mapping first
            const mappedCat = manualCats.get(catKey);
            if (mappedCat) {
                // Try to find by ID first (Most reliable)
                category = await prisma.category.findUnique({ where: { id: mappedCat.id } });

                if (!category) {
                    // Create with forced ID
                    const slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                    const brand = normalizeBrand(catName);

                    try {
                        category = await prisma.category.create({
                            data: {
                                id: mappedCat.id, // FORCE ID
                                name: catName,
                                slug: slug + '-' + Math.floor(Math.random() * 1000),
                                code: slug,
                                isActive: true,
                                brand: brand
                            }
                        });
                        console.log(`✨ [SYNC] Created Mapped Category: ${catName} | ID: ${mappedCat.id}`);
                        totalCategoriesCreated++;
                    } catch (e) {
                        console.error(`❌ Failed to create mapped category ${catName}`, e);
                    }
                }
            }

            // Fallback: Standard Lookup if not found via Mapping
            if (!category) {
                category = catMap.get(catKey);
            }

            // If not found by direct name, try slugifying the name and checking
            if (!category) {
                const potentialSlug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                category = catMap.get(potentialSlug);
            }

            // [NEW] Ensure Existing Category has correct Brand (Self-Healing)
            if (category) {
                const correctBrand = normalizeBrand(category.name);
                if ((category as any).brand !== correctBrand) {
                    await prisma.category.update({
                        where: { id: category.id },
                        data: { brand: correctBrand }
                    });
                    // Update local map reference
                    (category as any).brand = correctBrand;
                    // console.log(`🔧 [SYNC] Fixed Brand for Category: ${category.name} -> ${correctBrand}`);
                }
            }

            // Auto-Create Category if missing (and not mapped)
            if (!category) {
                try {
                    // Generate Slug
                    const slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                    const brand = normalizeBrand(catName);

                    category = await prisma.category.create({
                        data: {
                            name: catName,
                            slug: slug + '-' + Math.floor(Math.random() * 1000), // Ensure unique slug
                            code: slug, // Use slug as code initially
                            isActive: true, // Auto-active
                            brand: brand
                        }
                    });

                    // Add to Map so we don't create it again for next product
                    catMap.set(catKey, category);
                    if (category.code) catMap.set(category.code.toLowerCase(), category);
                    catMap.set(category.slug.toLowerCase(), category);

                    console.log(`✨ [SYNC] Auto-Created Category: ${catName} | Brand: ${brand}`);
                    totalCategoriesCreated++;
                } catch (catError) {
                    console.error(`❌ Failed to auto-create category ${catName}:`, catError);
                    skipped++;
                    continue; // Skip product if category creation failed
                }
            }

            // Logic: Selling Price
            const providerPrice = Number(item.price);
            const margin = category.profitMargin || 5.0;
            const rawSellingPrice = providerPrice + (providerPrice * (margin / 100));
            const sellingPrice = Math.ceil(rawSellingPrice);

            // Calculate Group
            const group = determineGroup(catName, item.name);

            // Upsert (Works for both Fresh Start and Update scenarios)
            const existing = await prisma.product.findUnique({ where: { sku_code: item.code } });

            if (existing) {
                await prisma.product.update({
                    where: { id: existing.id },
                    data: {
                        name: item.name,
                        price_provider: providerPrice,
                        // price_sell: sellingPrice, // Optional: Update or keep manual override? 
                        // Let's update it if it's 0, otherwise maybe respect previous manual edits? 
                        // User asked "why products wrong", usually implies strict sync.
                        // But let's stick to update price logic from before:
                        price_sell: sellingPrice,
                        isActive: item.status !== false, // VIP returns boolean or check
                        categoryId: category.id, // CRITICAL FIX
                        group: group, // CRITICAL FIX
                        updatedAt: new Date()
                    }
                });
                totalUpdated++;
            } else {
                await prisma.product.create({
                    data: {
                        sku_code: item.code,
                        name: item.name,
                        price_provider: providerPrice,
                        price_sell: sellingPrice,
                        categoryId: category.id,
                        group: group, // CRITICAL FIX
                        isActive: item.status !== false
                    }
                });
                totalCreated++;
            }
        }

        console.log(`✅ [SYNC] Completed. Updated: ${totalUpdated}, Created: ${totalCreated}, New Categories: ${totalCategoriesCreated}, Skipped: ${skipped}`);

        res.json({
            success: true,
            message: "Sync Completed",
            data: {
                updated: totalUpdated,
                created: totalCreated,
                newCategories: totalCategoriesCreated,
                skipped,
                total: providerServices.length
            }
        });

    } catch (error: any) {
        console.error('❌ Sync Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};



// GET /api/admin/categories
export const getAllCategories = async (req: Request, res: Response) => {
    try {
        const search = req.query.search as string;
        const isActive = req.query.isActive as string; // 'true', 'false', or undefined
        const whereClause: any = {};

        if (isActive && isActive !== 'all') {
            whereClause.isActive = isActive === 'true';
        }

        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { slug: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } }
            ];
        }

        const limitQuery = req.query.limit;

        if (limitQuery === 'all') {
            const categories = await prisma.category.findMany({
                where: whereClause,
                orderBy: { name: 'asc' },
                include: { _count: { select: { products: true } } }
            });
            res.json({ success: true, data: categories });
            return;
        }

        const page = Number(req.query.page) || 1;
        const limit = Number(limitQuery) || 10;
        const skip = (page - 1) * limit;

        const [total, categories] = await Promise.all([
            prisma.category.count({ where: whereClause }),
            prisma.category.findMany({
                where: whereClause,
                skip,
                take: limit,
                orderBy: { name: 'asc' },
                include: { _count: { select: { products: true } } }
            })
        ]);

        res.json({
            success: true,
            data: {
                categories,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error: any) {
        console.error("Get Categories Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/admin/categories/:id
export const updateCategory = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const { profitMargin, isActive, name, requiresZoneId, requiresServerId } = req.body;

        console.log(`🛠️ [Admin] Updating Category ${id}...`);

        // 1. Update Category Details
        const updateData: any = {};
        if (profitMargin !== undefined) updateData.profitMargin = Number(profitMargin);
        if (isActive !== undefined) updateData.isActive = Boolean(isActive);
        if (name !== undefined) updateData.name = String(name);
        if (requiresZoneId !== undefined) updateData.requiresZoneId = Boolean(requiresZoneId);
        if (requiresServerId !== undefined) updateData.requiresServerId = Boolean(requiresServerId);

        const category = await prisma.category.update({
            where: { id },
            data: updateData
        });

        // 2. If Profit Margin Changed -> Recalculate All Products in this Category
        if (profitMargin !== undefined) {
            console.log(`📉 Profit Margin Changed to ${profitMargin}%. Recalculating products via SQL...`);

            // Direct SQL Update for Performance (O(1) database op vs O(N) loop)
            // price_sell = price_provider + (price_provider * (margin / 100))
            const count = await prisma.$executeRaw`
                UPDATE "products"
                SET "price_sell" = CEIL("price_provider" + ("price_provider" * ${Number(profitMargin)} / 100))
                WHERE "categoryId" = ${id}
            `;

            console.log(`✅ Updated ${count} products with new margin.`);
        }

        res.json({ success: true, message: "Category updated successfully", data: category });

    } catch (error: any) {
        console.error("Update Category Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
import axios from 'axios';
import * as ipaymuService from '../services/ipaymu.service.js';

// POST /api/admin/transactions/:id/retry
export const retryTransaction = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { processGameTopup } = await import('./transaction.controller.js');
        const gameProvider = await import('../services/game.service.js');
        const whatsappService = await import('../services/whatsapp.service.js');

        const trxId = String(id);
        const trx = await prisma.transaction.findUnique({
            where: { id: trxId },
            include: { product: true }
        });

        if (!trx) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }

        const isDeposit = trx.type === 'DEPOSIT';

        // 1. Basic Validation
        if (trx.status === 'SUCCESS') {
            return res.status(400).json({ success: false, message: 'Transaction is already successful' });
        }

        // For TOPUP (Game), product is required. For DEPOSIT, it isn't.
        if (!isDeposit && !trx.product) {
            return res.status(404).json({ success: false, message: 'Product missing for topup transaction' });
        }

        if (isDeposit) {
            console.log(`🚀 [DEPOSIT-RETRY] Syncing with gateway for invoice ${trx.invoice}...`);

            if (!trx.paymentTrxId) {
                return res.status(400).json({ success: false, message: 'Payment Reference (paymentTrxId) missing. Cannot sync with gateway.' });
            }

            let payCheck: any = { success: false };
            const gateway = (trx as any).paymentGateway || 'IPAYMU';

            if (gateway === 'IPAYMU') {
                payCheck = await ipaymuService.checkTransaction(trx.paymentTrxId);
            } else if (gateway === 'TRIPAY') {
                const configs = await (prisma as any).systemConfig.findMany({
                    where: { key: { in: ['TRIPAY_MODE', 'TRIPAY_SB_API_KEY', 'TRIPAY_PROD_API_KEY'] } }
                });
                const configMap: Record<string, string> = {};
                configs.forEach((c: any) => configMap[c.key] = c.value);

                const mode = configMap['TRIPAY_MODE'] || 'PRODUCTION';
                const apiKey = mode === 'SANDBOX' ? configMap['TRIPAY_SB_API_KEY'] : configMap['TRIPAY_PROD_API_KEY'];
                const baseUrl = mode === 'SANDBOX' ? 'https://tripay.co.id/api-sandbox' : 'https://tripay.co.id/api';

                try {
                    const response = await axios.get(`${baseUrl}/transaction/check-status`, {
                        params: { reference: trx.paymentTrxId },
                        headers: { 'Authorization': `Bearer ${apiKey}` },
                        validateStatus: (status) => status < 999
                    });

                    const data = response.data;
                    // Tripay Check Status returns { success: true, message: "Status transaksi saat ini PAID" }
                    if (data?.success && data.message?.includes('PAID')) {
                        payCheck = { success: true, status: 6, statusDesc: 'Berhasil' };
                    }
                } catch (err: any) {
                    console.error(`❌ [TRIPAY] Check Status Error:`, err.response?.data || err.message);
                }
            }

            if (payCheck.success && (payCheck.status === 1 || payCheck.status === 6 || payCheck.statusDesc?.toLowerCase() === 'berhasil')) {
                // Payment confirmed!
                await prisma.$transaction(async (tx) => {
                    await tx.transaction.update({
                        where: { id: trxId },
                        data: { status: 'SUCCESS', updatedAt: new Date() }
                    });

                    if (trx.userId) {
                        await tx.user.update({
                            where: { id: trx.userId },
                            data: { balance: { increment: trx.amount } }
                        });
                    }
                });

                // Send WA notification
                let targetWa = trx.guestContact;
                if (!targetWa && trx.userId) {
                    const u = await prisma.user.findUnique({ where: { id: trx.userId } });
                    if (u) targetWa = u.phoneNumber;
                }
                if (targetWa) {
                    const waMsg = `🌟 *GRIMOIRE COINS STORE* 🌟\n---------------------------\n💰 *PEMBAYARAN TERVERIFIKASI*\nInvoice: *${trx.invoice}*\nStatus: BERHASIL (Manual Retry)\nTotal: Rp${trx.amount.toLocaleString('id-ID')}\n\nSaldo Anda telah ditambahkan. Terima kasih!`;
                    whatsappService.sendMessage(targetWa, waMsg).catch(console.error);
                }

                return res.json({ success: true, message: 'Payment verified and balance added successfully.' });
            } else {
                return res.status(400).json({ success: false, message: 'Gateway reports payment is still pending or failed.' });
            }
        }

        // 1.5. MANDATORY GATEWAY CHECK for PENDING Game Topups (User Protection) 🛡️
        if (!isDeposit && trx.status === 'PENDING') {
            console.log(`🔍 [SAFE-RETRY] Verifying Gateway status for PENDING Game Topup: ${trx.invoice}...`);

            if (!trx.paymentTrxId) {
                return res.status(400).json({ success: false, message: 'Payment Reference missing. Cannot verify payment status.' });
            }

            let payCheck: any = { success: false };
            let gateway = (trx as any).paymentGateway;
            if (!gateway) {
                const cfg = await prisma.systemConfig.findUnique({ where: { key: 'PAYMENT_GATEWAY' } });
                gateway = cfg?.value || 'TRIPAY';
            }

            if (gateway === 'IPAYMU') {
                const ipaymuService = await import('../services/ipaymu.service.js');
                payCheck = await ipaymuService.checkTransaction(trx.paymentTrxId);
            } else if (gateway === 'TRIPAY') {
                const configs = await (prisma as any).systemConfig.findMany({
                    where: { key: { in: ['TRIPAY_MODE', 'TRIPAY_SB_API_KEY', 'TRIPAY_PROD_API_KEY'] } }
                });
                const configMap: Record<string, string> = {};
                configs.forEach((c: any) => configMap[c.key] = c.value);

                const mode = configMap['TRIPAY_MODE'] || 'PRODUCTION';
                const apiKey = mode === 'SANDBOX' ? configMap['TRIPAY_SB_API_KEY'] : configMap['TRIPAY_PROD_API_KEY'];
                const baseUrl = mode === 'SANDBOX' ? 'https://tripay.co.id/api-sandbox' : 'https://tripay.co.id/api';

                try {
                    const axios = (await import('axios')).default;
                    const response = await axios.get(`${baseUrl}/transaction/check-status`, {
                        params: { reference: trx.paymentTrxId },
                        headers: { 'Authorization': `Bearer ${apiKey}` },
                        validateStatus: (status) => status < 999
                    });
                    if (response.data?.success && response.data.message === 'PAID') {
                        payCheck = { success: true, status: 6, statusDesc: 'Berhasil' };
                    }
                } catch (err: any) {
                    console.error(`❌ [TRIPAY] Check Status Error:`, err.message);
                }
            }

            if (payCheck.success && (payCheck.status === 6 || payCheck.statusDesc?.toLowerCase() === 'berhasil')) {
                console.log(`✅ [SAFE-RETRY] Payment confirmed! Updating status to PROCESSING.`);
                await prisma.transaction.update({
                    where: { id: trxId },
                    data: { status: 'PROCESSING', updatedAt: new Date() }
                });
                // Continue to provider logic below
            } else {
                return res.status(400).json({ success: false, message: 'CRITICAL: Payment is still PENDING at Gateway. Admin cannot retry order until user pays!' });
            }
        }

        // --- CONTINUE WITH TOPUP (GAME) RETRY LOGIC ---
        console.log(`🔄 [SAFE-RETRY] Analyzing Topup Transaction: ${trx.invoice} (${trxId})`);

        // 2. [INQUIRY BEFORE ORDER] 🛡️
        // Check if the provider already has a successful record for this invoice
        let checkResult = null;
        if (gameProvider.PROVIDER === 'APIGAMES') {
            // Apigames allows inquiry by our Invoice (ref_id)
            checkResult = await gameProvider.checkTransaction(trx.invoice);
        } else if (gameProvider.PROVIDER === 'VIP' && trx.providerTrxId) {
            // VIP requires their ID
            checkResult = await gameProvider.checkTransaction(trx.invoice, trx.providerTrxId);
        }

        if (checkResult && checkResult.success && checkResult.data) {
            const pStatus = checkResult.data.status?.toLowerCase();
            console.log(`🔍 [SAFE-RETRY] Provider reported status: ${pStatus}`);

            // If it's already success or on-process at provider, DON'T re-order.
            if (pStatus === 'success' || pStatus === 'processing' || pStatus === 'waiting' || pStatus === '1') {
                console.log(`✅ [SAFE-RETRY] Found existing record at provider. Updating DB instead of re-ordering.`);

                const newStatus = pStatus === 'success' || pStatus === '1' ? 'SUCCESS' : 'PROCESSING';

                await prisma.transaction.update({
                    where: { id: trxId },
                    data: {
                        status: newStatus as any,
                        sn: (checkResult.data as any).sn || trx.sn,
                        providerTrxId: (checkResult.data as any).trxId || trx.providerTrxId,
                        providerStatus: (checkResult.data as any).status,
                        updatedAt: new Date()
                    }
                });

                return res.json({
                    success: true,
                    message: `Existing transaction found at provider (${newStatus}). DB Updated.`,
                    data: checkResult.data
                });
            }
        }

        // 3. If no existing successful record found -> Proceed to Re-Order
        console.log(`🚀 [SAFE-RETRY] No active record found at provider. Placing new order...`);

        // Reset providerStatus to allow lock to be acquired in processGameTopup
        await prisma.transaction.update({
            where: { id: trxId },
            data: { providerStatus: null }
        });

        const result = await processGameTopup(trxId);

        if (result.success) {
            res.json({ success: true, message: 'New order placed successfully', data: result });
        } else {
            res.status(400).json({ success: false, message: result.message || 'Retry failed at provider' });
        }

    } catch (error: any) {
        console.error("Safe Retry Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
