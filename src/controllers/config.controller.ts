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
                if (key.startsWith('PROMO_POPUP') || (!key.includes('KEY') && !key.includes('SECRET') && !key.includes('PASSWORD') && !key.includes('PRIVATE') && !key.includes('CODE'))) {
                    configMap[c.key] = c.value;
                }
            });
        }

        // Public Defaults
        if (!configMap['PAYMENT_GATEWAY']) {
            configMap['PAYMENT_GATEWAY'] = process.env.PAYMENT_GATEWAY || 'DUPAY';
        }

        res.json({ success: true, data: configMap });
    } catch (error: any) {
        console.error('[getConfig] Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
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
        console.error('[getAllConfig] Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
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

        const SENSITIVE_KEYS = ['KEY', 'SECRET', 'PASSWORD', 'TOKEN', 'PRIVATE'];
        const isSensitive = SENSITIVE_KEYS.some(k => key.toUpperCase().includes(k));
        console.log(`[CONFIG] Updated ${key} to ${isSensitive ? '[REDACTED]' : value}`);

        res.json({ success: true, data: config });
    } catch (error: any) {
        console.error('[updateConfig] Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
