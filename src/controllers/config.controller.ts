import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

// GET /api/config (Public - Filtered)
export const getConfig = async (req: Request, res: Response) => {
    try {
        const configMap: Record<string, string> = {};

        if ((prisma as any).systemConfig) {
            const configs = await (prisma as any).systemConfig.findMany();
            configs.forEach((c: any) => {
                // Filter out sensitive keys
                const key = c.key.toUpperCase();
                if (!key.includes('KEY') && !key.includes('SECRET') && !key.includes('PASSWORD') && !key.includes('PRIVATE') && !key.includes('CODE')) {
                    configMap[c.key] = c.value;
                }
            });
        }

        // Public Defaults
        if (!configMap['PAYMENT_GATEWAY']) {
            configMap['PAYMENT_GATEWAY'] = process.env.PAYMENT_GATEWAY || 'IPAYMU';
        }

        res.json({ success: true, data: configMap });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/config/all (Admin Only)
export const getAllConfig = async (req: Request, res: Response) => {
    try {
        const configMap: Record<string, string> = {};

        if ((prisma as any).systemConfig) {
            const configs = await (prisma as any).systemConfig.findMany();
            configs.forEach((c: any) => {
                configMap[c.key] = c.value;
            });
        }

        res.json({ success: true, data: configMap });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /api/config
export const updateConfig = async (req: Request, res: Response) => {
    try {
        const { key, value } = req.body;

        if (!key) {
            return res.status(400).json({ success: false, message: 'Key is required' });
        }
        // Removed `if (!value)` check to allow empty string values

        if (!(prisma as any).systemConfig) {
            return res.status(503).json({
                success: false,
                message: 'SystemConfig model not ready. Please run "npx prisma generate" in backend folder.'
            });
        }

        const config = await (prisma as any).systemConfig.upsert({
            where: { key },
            update: { value },
            create: { key, value }
        });

        console.log(`[CONFIG] Updated ${key} to ${value}`);

        res.json({ success: true, data: config });
    } catch (error: any) {
        console.error("Update Config Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
