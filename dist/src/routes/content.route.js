import { Router } from 'express';
import { getActiveBanners, getLeaderboard, createBanner, deleteBanner, toggleBannerActive } from '../controllers/content.controller.js';
const router = Router();
router.get('/', (req, res) => {
    res.json({ success: true, message: "Content API Active" });
});
router.get('/banners', getActiveBanners);
router.post('/banners', createBanner);
router.delete('/banners/:id', deleteBanner);
router.patch('/banners/:id/toggle', toggleBannerActive);
router.get('/leaderboard', getLeaderboard);
export default router;
//# sourceMappingURL=content.route.js.map