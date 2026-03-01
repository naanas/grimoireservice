import type { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';

// Setup Storage
const storage = multer.diskStorage({
    destination: (req: any, file: any, cb: any) => {
        const uploadPath = path.join(process.cwd(), 'public/uploads');
        fs.ensureDirSync(uploadPath); // Ensure directory exists
        cb(null, uploadPath);
    },
    filename: (req: any, file: any, cb: any) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'media-' + uniqueSuffix + ext);
    }
});

// Filter File Types
const fileFilter = (req: any, file: any, cb: any) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|webm|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Error: Only Images/Videos are allowed!'));
    }
};

export const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB Limit (for short videos)
    fileFilter: fileFilter
}).single('file');

// POST /api/upload
export const uploadFile = (req: Request, res: Response) => {
    upload(req, res, (err: any) => {
        if (err) {
            console.error('[uploadFile] Error:', err);
            return res.status(400).json({ success: false, message: 'File upload failed. Only images/videos are allowed (max 50MB).' });
        }
        if (!(req as any).file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        // Return Public URL
        const protocol = req.protocol;
        const host = req.get('host');
        const publicUrl = `${protocol}://${host}/uploads/${(req as any).file.filename}`;

        res.json({
            success: true,
            message: 'File uploaded successfully',
            data: {
                url: publicUrl,
                filename: (req as any).file.filename,
                mimetype: (req as any).file.mimetype
            }
        });
    });
};
