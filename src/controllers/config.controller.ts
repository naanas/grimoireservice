import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

// GET /api/config
export const getConfig = async (req: Request, res: Response) => {
    try {
        const configs = await (prisma as any).systemConfig.findMany();
        const configMap: Record<string, string> = {};
        configs.forEach((c: any) => {
            configMap[c.key] = c.value;
        });

        // Return default if not set
        if (!configMap['PAYMENT_GATEWAY']) {
            configMap['PAYMENT_GATEWAY'] = process.env.PAYMENT_GATEWAY || 'IPAYMU';
        }

        res.json({ success: true, data: configMap });
    } catch (error: any) {
        console.error("Get Config Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /api/config
export const updateConfig = async (req: Request, res: Response) => {
    try {
        const { key, value } = req.body;

        if (!key || !value) {
            return res.status(400).json({ success: false, message: 'Key and Value required' });
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
