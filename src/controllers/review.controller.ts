import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

// POST /api/reviews - Submit review (authenticated users only)
export const createReview = async (req: Request, res: Response) => {
    try {
        const { categoryId, rating, comment } = req.body;
        const userId = (req as any).user?.id;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Login required to submit review' });
        }

        // Validation
        if (!categoryId || !rating) {
            return res.status(400).json({ success: false, message: 'Category ID and rating are required' });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
        }

        // Check if category exists
        const category = await (prisma as any).category.findUnique({
            where: { id: categoryId }
        });

        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        // Check if user already reviewed this category
        const existingReview = await (prisma as any).review.findUnique({
            where: {
                userId_categoryId: {
                    userId,
                    categoryId
                }
            }
        });

        if (existingReview) {
            return res.status(400).json({ success: false, message: 'You have already reviewed this game' });
        }

        // Create review
        const review = await (prisma as any).review.create({
            data: {
                userId,
                categoryId,
                rating: parseInt(rating),
                comment: comment || null,
                isApproved: false
            },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                },
                category: {
                    select: {
                        name: true,
                        slug: true
                    }
                }
            }
        });

        console.log(`[REVIEW] New review submitted for ${category.name} by user ${userId}`);

        res.json({
            success: true,
            message: 'Review submitted successfully! Awaiting admin approval.',
            data: review
        });
    } catch (error: any) {
        console.error('Create Review Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// GET /api/reviews?categoryId=xxx - Get approved reviews
export const getReviews = async (req: Request, res: Response) => {
    try {
        const { categoryId, categorySlug } = req.query;

        if (!categoryId && !categorySlug) {
            return res.status(400).json({ success: false, message: 'Category ID or slug required' });
        }

        let whereClause: any = {
            isApproved: true
        };

        if (categoryId) {
            whereClause.categoryId = categoryId as string;
        } else if (categorySlug) {
            // Find category by slug first
            const category = await (prisma as any).category.findUnique({
                where: { slug: categorySlug as string }
            });

            if (!category) {
                return res.status(404).json({ success: false, message: 'Category not found' });
            }

            whereClause.categoryId = category.id;
        }

        const reviews = await (prisma as any).review.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json({ success: true, data: reviews });
    } catch (error: any) {
        console.error('Get Reviews Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// GET /api/reviews/stats?categoryId=xxx - Get rating summary
export const getReviewStats = async (req: Request, res: Response) => {
    try {
        const { categoryId, categorySlug } = req.query;

        if (!categoryId && !categorySlug) {
            return res.status(400).json({ success: false, message: 'Category ID or slug required' });
        }

        let targetCategoryId: string;

        if (categoryId) {
            targetCategoryId = categoryId as string;
        } else {
            const category = await (prisma as any).category.findUnique({
                where: { slug: categorySlug as string }
            });

            if (!category) {
                return res.status(404).json({ success: false, message: 'Category not found' });
            }

            targetCategoryId = category.id;
        }

        // Get all approved reviews for this category
        const reviews = await (prisma as any).review.findMany({
            where: {
                categoryId: targetCategoryId,
                isApproved: true
            },
            select: {
                rating: true
            }
        });

        if (reviews.length === 0) {
            return res.json({
                success: true,
                data: {
                    avgRating: 0,
                    totalReviews: 0,
                    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
                }
            });
        }

        // Calculate stats
        const totalReviews = reviews.length;
        const sumRating = reviews.reduce((sum: number, r: any) => sum + r.rating, 0);
        const avgRating = parseFloat((sumRating / totalReviews).toFixed(1));

        // Rating distribution
        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach((r: any) => {
            distribution[r.rating as keyof typeof distribution]++;
        });

        res.json({
            success: true,
            data: {
                avgRating,
                totalReviews,
                distribution
            }
        });
    } catch (error: any) {
        console.error('Get Review Stats Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// GET /api/reviews/my-review?categoryId=xxx - Check if user already reviewed
export const getMyReview = async (req: Request, res: Response) => {
    try {
        const { categoryId } = req.query;
        const userId = (req as any).user?.id;

        if (!userId) {
            return res.json({ success: true, data: null });
        }

        if (!categoryId) {
            return res.status(400).json({ success: false, message: 'Category ID required' });
        }

        const review = await (prisma as any).review.findUnique({
            where: {
                userId_categoryId: {
                    userId,
                    categoryId: categoryId as string
                }
            }
        });

        res.json({ success: true, data: review });
    } catch (error: any) {
        console.error('Get My Review Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
