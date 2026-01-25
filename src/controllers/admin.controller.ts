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

        const whereClause: any = {};
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
import * as gameProvider from '../services/vip.service.js';

export const syncProducts = async (req: Request, res: Response) => {
    try {
        console.log("🔄 [SYNC] Starting Product Sync...");
        const result = await gameProvider.getMerchantServices();

        if (!result.success || !result.data) {
            return res.status(500).json({ success: false, message: result.message || "Failed to fetch from provider" });
        }

        const items = result.data; // [{ code, name, price, category }]
        let updatedCount = 0;
        let createdCount = 0;

        console.log(`📦 [SYNC] Found ${items.length} items from Provider. Processing...`);

        // 1. Process Categories
        // We need to ensure categories exist.
        // Group items by category name
        const categories = [...new Set(items.map((i: any) => i.category))];

        const categoryMap = new Map<string, string>(); // Name -> ID

        for (const rawCatName of categories) {
            if (!rawCatName) continue;
            const catName = String(rawCatName);

            // Simple Slug: mobile legends -> mobile-legends
            const slug = catName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

            // Upsert Category
            const cat = await prisma.category.upsert({
                where: { slug: slug },
                update: {}, // Don't change name if exists, just get ID
                create: {
                    name: catName,
                    slug: slug,
                    isActive: true
                }
            });
            categoryMap.set(catName, cat.id);
        }

        // 2. Process Products
        for (const item of items) {
            const catId = categoryMap.get(item.category);

            // Should we disable auto-create? 
            // The user wants to "Sync". Usually means "Make my DB link equal to Provider".
            // We will upsert.

            // Price Logic:
            // Provider gives "Basic Price". We need to set "Selling Price".
            // If new product: Selling Price = Provider Price + Margin (e.g. 5% or 500)
            // If existing: Update Provider Price ONLY? Or Update Selling Price too? 
            // SAFETY: Update Provider Price. Keep Selling Price unless it's lower than provider price (loss prevention)?
            // Better: Just update provider price. User manages selling price.

            // Exception: New Product -> Selling Price = Provider Price + 1000 (Safe Default)

            const existing = await prisma.product.findUnique({ where: { sku_code: item.code } });

            if (existing) {
                // Update
                if (existing.price_provider !== item.price) {
                    await prisma.product.update({
                        where: { id: existing.id },
                        data: {
                            price_provider: item.price,
                            // Optional: updates price_sell automatically? No, dangerous.
                            // But if price_sell < item.price, maybe warn or bump?
                            // Let's leave price_sell alone unless user asks.
                            updatedAt: new Date()
                        }
                    });
                    updatedCount++;
                }
            } else {
                // Create
                if (catId) {
                    await prisma.product.create({
                        data: {
                            sku_code: item.code,
                            name: item.name,
                            price_provider: item.price,
                            price_sell: item.price + (item.price * 0.1), // Default 10% margin
                            categoryId: catId,
                            isActive: true // Auto-activate?
                        }
                    });
                    createdCount++;
                }
            }
        }

        console.log(`✅ [SYNC] Completed. Updated: ${updatedCount}, Created: ${createdCount}`);

        res.json({
            success: true,
            message: `Sync Complete. updated: ${updatedCount}, created: ${createdCount}`,
            data: { updatedCount, createdCount }
        });

    } catch (error: any) {
        console.error("Sync Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
