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
import * as gameProvider from '../services/game.service.js';

export const syncProducts = async (req: Request, res: Response) => {
    console.log('🔄 [SYNC] Starting Product Sync (VIP/Game Provider)...');

    try {
        // 1. Fetch ALL Services from Provider (One Request)
        const result = await gameProvider.getMerchantServices();

        if (!result.success || !Array.isArray(result.data)) {
            throw new Error(result.message || "Failed to fetch services from provider");
        }

        const providerServices = result.data;
        console.log(`📦 [SYNC] Received ${providerServices.length} services from Provider.`);

        // 2. Get All Active Categories
        const categories = await prisma.category.findMany({
            where: { isActive: true }
        });

        // Map Category Code/Name to ID for quick lookup
        // We match Provider 'game' field to Category 'code' OR 'name'
        const catMap = new Map();
        categories.forEach(c => {
            if (c.code) catMap.set(c.code.toLowerCase(), c);
            catMap.set(c.name.toLowerCase(), c); // Fallback match by Name
        });

        let totalUpdated = 0;
        let totalCreated = 0;
        let skipped = 0;

        // 3. Process Each Service
        for (const item of providerServices) {
            // item: { code, name, category (game), price, status }

            // Find Matching Category
            const catKey = (item.category || '').toLowerCase();
            const category = catMap.get(catKey);

            if (!category) {
                // console.warn(`⚠️ Skipping service '${item.name}' - Category '${item.category}' not found in DB.`);
                skipped++;
                continue;
            }

            // Logic: Selling Price
            const providerPrice = Number(item.price);
            const margin = category.profitMargin || 5.0;
            const rawSellingPrice = providerPrice + (providerPrice * (margin / 100));
            const sellingPrice = Math.ceil(rawSellingPrice);

            // Upsert
            const existing = await prisma.product.findUnique({ where: { sku_code: item.code } });

            if (existing) {
                await prisma.product.update({
                    where: { id: existing.id },
                    data: {
                        name: item.name,
                        price_provider: providerPrice,
                        price_sell: sellingPrice,
                        isActive: item.status,
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
                        isActive: item.status
                    }
                });
                totalCreated++;
            }
        }

        console.log(`✅ [SYNC] Completed. Updated: ${totalUpdated}, Created: ${totalCreated}, Skipped: ${skipped}`);

        res.json({
            success: true,
            message: "Sync Completed",
            data: {
                updated: totalUpdated,
                created: totalCreated,
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
