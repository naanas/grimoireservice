import { Router } from 'express';
import { getActiveBanners, getLeaderboard } from '../controllers/content.controller.js';

const router = Router();

router.get('/', (req, res) => {
    res.json({ success: true, message: "Content API Active" });
});

router.get('/banners', getActiveBanners);
router.get('/leaderboard', getLeaderboard);

export default router;
