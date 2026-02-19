import express from 'express';
import { uploadFile } from '../controllers/upload.controller.js';
// Add Auth middleware if you want to restrict uploads to Admins only
// import { protect, adminOnly } from '../middleware/auth.middleware.js';

const router = express.Router();

// Currently public for simplicity, but ideally protect with adminOnly
router.post('/', uploadFile);

export default router;
