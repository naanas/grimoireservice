import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { getAvailableChannels, type DupayChannel } from '../services/dupay.service.js';

// Hardcoded fallback list — dipakai HANYA kalau dupaybe mati atau gateway belum
// punya channel_mapping sama sekali. Setelah konfigurasi di CMS lengkap, daftar
// aktif 100% source-of-truth dari dupaybe.
const PAYMENT_CHANNELS_FALLBACK = [
    { code: 'qris', name: 'QRIS', method: 'qris', group: 'QRIS' },
    { code: 'bca', name: 'BCA Virtual Account', method: 'va', group: 'Virtual Account' },
    { code: 'mandiri', name: 'Mandiri Virtual Account', method: 'va', group: 'Virtual Account' },
    { code: 'bni', name: 'BNI Virtual Account', method: 'va', group: 'Virtual Account' },
    { code: 'bri', name: 'BRI Virtual Account', method: 'va', group: 'Virtual Account' },
    { code: 'cimb', name: 'CIMB Niaga VA', method: 'va', group: 'Virtual Account' },
    { code: 'permata', name: 'Permata Virtual Account', method: 'va', group: 'Virtual Account' },
    { code: 'indomaret', name: 'Indomaret', method: 'cstore', group: 'Retail' },
    { code: 'alfamart', name: 'Alfamart', method: 'cstore', group: 'Retail' },
    { code: 'dana', name: 'DANA', method: 'ewallet', group: 'E-Wallet' },
    { code: 'ovo', name: 'OVO', method: 'ewallet', group: 'E-Wallet' },
    { code: 'shopeepay', name: 'ShopeePay', method: 'ewallet', group: 'E-Wallet' },
    { code: 'linkaja', name: 'LinkAja', method: 'ewallet', group: 'E-Wallet' },
];

// Mapping DupayChannel -> bentuk yang dipakai grimoire frontend (PaymentChannel).
// Field dengan nilai 0/kosong diset ke undefined supaya optional chaining di UI
// ga render "Rp 0" untuk channel tanpa fee (mis. QRIS zero-fee).
const orUndef = (n?: number) => (n && n > 0 ? n : undefined);
const toFrontendShape = (ch: DupayChannel) => ({
    code: ch.code,
    name: ch.label || ch.code.toUpperCase(),
    method: ch.method || 'va',
    group: ch.group || 'Virtual Account',
    logo: ch.logo || `/payment/${ch.code}.png`,
    flatFee: orUndef(ch.fee_flat),
    percentFee: orUndef(ch.fee_percent),
    minAmount: orUndef(ch.min_amount),
    maxAmount: orUndef(ch.max_amount),
});

// GET /api/payment/methods - Get ACTIVE payment methods (Public)
//
// Flow:
//   1. Fetch daftar channel aktif dari dupaybe (source of truth).
//   2. Apply filter dari SystemConfig (`payment_method_<code>`) sebagai kill-switch
//      per-channel di level grimoire. Default aktif kalau config tidak ada.
//   3. Kalau dupaybe return kosong (belum dikonfig / error), fallback ke
//      PAYMENT_CHANNELS_FALLBACK supaya UI tetap ada yang tampil.
export const getActivePaymentMethods = async (_req: Request, res: Response) => {
    try {
        const [dupayChannels, configs] = await Promise.all([
            getAvailableChannels(),
            (prisma as any).systemConfig.findMany({
                where: { key: { startsWith: 'payment_method_' } },
            }),
        ]);

        const statusMap: Record<string, boolean> = {};
        configs.forEach((c: any) => {
            const code = c.key.replace('payment_method_', '');
            statusMap[code] = c.value === 'active';
        });

        let source: Array<{ code: string; name: string; method: string; group: string; logo?: string; flatFee?: number; percentFee?: number; minAmount?: number; maxAmount?: number }>;

        if (dupayChannels.length > 0) {
            source = dupayChannels.map(toFrontendShape);
        } else {
            console.warn('[PAYMENT] Dupay channels empty, using hardcoded fallback');
            source = PAYMENT_CHANNELS_FALLBACK;
        }

        // Apply kill-switch SystemConfig
        const active = source.filter(ch =>
            statusMap[ch.code] !== undefined ? statusMap[ch.code] : true
        );

        res.json({ success: true, data: active });
    } catch (error: any) {
        console.error('[PAYMENT] Get Active Payment Methods Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
