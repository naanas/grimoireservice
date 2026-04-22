import { prisma } from '../lib/prisma.js';
// GET /api/content/banners
// GET /api/content/banners
export const getActiveBanners = async (req, res) => {
    try {
        console.log("📢 [Content] Fetching Banners...");
        const banners = await prisma.banner.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
        });
        console.log(`✅ [Content] Found ${banners.length} banners`);
        res.json({ success: true, data: banners });
    }
    catch (error) {
        console.error("❌ Fetch Banners Error:", error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
// GET /api/content/leaderboard
export const getLeaderboard = async (req, res) => {
    try {
        // Aggregate Total Spent by User (Only Registered Users)
        const leaderboard = await prisma.transaction.groupBy({
            by: ['userId'],
            where: {
                status: 'SUCCESS',
                userId: { not: null }
            },
            _sum: {
                amount: true
            },
            orderBy: {
                _sum: {
                    amount: 'desc'
                }
            },
            take: 10
        });
        // Enrich with User Names
        // We can't include user relation in groupBy, so we fetch users manually
        const enrichedBoard = await Promise.all(leaderboard.map(async (entry) => {
            if (!entry.userId)
                return null;
            const user = await prisma.user.findUnique({
                where: { id: entry.userId },
                select: { name: true }
            });
            return {
                userId: entry.userId,
                name: user?.name || 'Unknown Warrior',
                totalSpent: entry._sum.amount || 0
            };
        }));
        res.json({ success: true, data: enrichedBoard.filter(Boolean) });
    }
    catch (error) {
        console.error('Leaderboard Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
export const createBanner = async (req, res) => {
    try {
        const { title, imageUrl, linkUrl } = req.body;
        if (!imageUrl)
            return res.status(400).json({ success: false, message: 'Image URL is required' });
        const banner = await prisma.banner.create({
            data: {
                title: title,
                imageUrl: imageUrl,
                linkUrl: linkUrl,
                isActive: true
            }
        });
        res.json({ success: true, data: banner });
    }
    catch (error) {
        console.error('[createBanner] Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
// DELETE /api/content/banners/:id
export const deleteBanner = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.banner.delete({ where: { id: id } });
        res.json({ success: true, message: 'Banner deleted' });
    }
    catch (error) {
        console.error('[deleteBanner] Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
// PATCH /api/content/banners/:id/toggle
export const toggleBannerActive = async (req, res) => {
    try {
        const { id } = req.params;
        const banner = await prisma.banner.findUnique({ where: { id: id } });
        if (!banner)
            return res.status(404).json({ success: false, message: 'Banner not found' });
        const updated = await prisma.banner.update({
            where: { id: id },
            data: { isActive: !banner.isActive }
        });
        res.json({ success: true, data: updated });
    }
    catch (error) {
        console.error('[toggleBannerActive] Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
//# sourceMappingURL=content.controller.js.map