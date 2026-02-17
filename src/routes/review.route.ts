import { Router } from 'express';
import * as reviewController from '../controllers/review.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

// Public endpoints
router.get('/', reviewController.getReviews); // GET /api/reviews?categoryId=xxx
router.get('/stats', reviewController.getReviewStats); // GET /api/reviews/stats?categoryId=xxx

// Protected endpoints (require login)
router.post('/', authenticateToken, reviewController.createReview); // POST /api/reviews
router.get('/my-review', authenticateToken, reviewController.getMyReview); // GET /api/reviews/my-review?categoryId=xxx

export default router;
