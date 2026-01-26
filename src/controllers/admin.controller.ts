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
import * as gameProvider from '../services/game.service.js';

export const syncProducts = async (req: Request, res: Response) => {
    console.log('🔄 [SYNC] Starting Product Sync (VIP/Game Provider)...');

    try {
        // 1. Get all Active Categories that have a 'code' (Provider Code)
        // These codes correspond to what the Provider expects in 'filter_game'.
        const categories = await prisma.category.findMany({
            where: { isActive: true, code: { not: null } }
        });

        console.log(`📦 [SYNC] Found ${categories.length} categories to check.`);
        const syncResults: any[] = [];
        let totalUpdated = 0;
        let totalCreated = 0;

        for (const cat of categories) {
            if (!cat.code) continue;

            // 2. Fetch from Provider
            // VIP needs 'filter_game' -> game.service.ts -> getMerchantServices(filterGame)
            const result = await gameProvider.getMerchantServices(cat.code);

            if (result.success && Array.isArray(result.data) && result.data.length > 0) {
                let catCount = 0;
                for (const item of result.data) {
                    // Item: { code, name, price, status: boolean }
                    // Logic: Selling Price = Provider Price + (Provider Price * ProfitMargin%)
                    const providerPrice = Number(item.price);
                    const margin = cat.profitMargin || 5.0; // Default 5.0%

                    // Calculation: 10000 + (10000 * 5/100) = 10500
                    const rawSellingPrice = providerPrice + (providerPrice * (margin / 100));
                    // Round up to nearest 100 or just ceil? Let's Ceil for now.
                    const sellingPrice = Math.ceil(rawSellingPrice);

                    // Upsert Product
                    const existing = await prisma.product.findUnique({ where: { sku_code: item.code } });

                    if (existing) {
                        // Update
                        // Update Price Provider always.
                        // Update Price Sell ONLY if Auto-Sync is desirable or logic dictates.
                        // For now we AUTO UPDATE Selling Price based on margin to ensure profit is maintained if capital rises.
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
                        // Create
                        await prisma.product.create({
                            data: {
                                sku_code: item.code,
                                name: item.name,
                                price_provider: providerPrice,
                                price_sell: sellingPrice,
                                categoryId: cat.id,
                                isActive: item.status
                            }
                        });
                        totalCreated++;
                        catCount++;
                    }
                }
                syncResults.push({ category: cat.name, found: result.data.length, new: catCount });
            } else {
                // If data empty, maybe 'Product not found' or 'No service'
                // console.warn(`⚠️ No products for ${cat.name} (${cat.code})`);
                // syncResults.push({ category: cat.name, status: 'Empty/Error', msg: result.message });
            }
        }

        console.log(`✅ [SYNC] Completed. Updated: ${totalUpdated}, Created: ${totalCreated}`);

        res.json({
            success: true,
            message: "Sync Completed",
            data: {
                updated: totalUpdated,
                created: totalCreated,
                details: syncResults
            }
        });

    } catch (error: any) {
        console.error('❌ Sync Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
