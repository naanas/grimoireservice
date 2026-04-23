import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

type DupayCreatePaymentResult = {
    success: boolean;
    message: string;
    paymentUrl: string | null;
    paymentNo: string | null;
    paymentName: string;
    paymentTrxId: string | null;
    expiredTime: string | null;
};

const DUPAY_BASE_URL = (process.env.DUPAY_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const DUPAY_GATEWAY_NAME = process.env.DUPAY_GATEWAY_NAME || 'TripaySandbox';

/**
 * Normalisasi channel code sebelum dikirim ke Dupay orchestrator.
 * Translasi final ke kode PG (BCAVA, QRIS, dst.) sekarang ditangani oleh
 * `channel_mapping` JSON di dupay-cms (per-gateway), bukan hardcoded di sini.
 *
 * Kita cuma rapih-rapih input:
 *  - lowercase
 *  - buang prefix "va_" / "ewallet_" / "retail_" kalau ada
 */
const normalizeChannel = (paymentMethod: string, channel?: string): string => {
    const raw = (channel || paymentMethod || '').toLowerCase().trim();
    return raw.replace(/^(va_|ewallet_|retail_|cstore_)/, '');
};

export type DupayChannel = {
    code: string;
    label?: string;
    method?: 'va' | 'qris' | 'cstore' | 'ewallet' | '';
    group?: string;
    logo?: string;
    min_amount?: number;
    max_amount?: number;
    fee_flat?: number;
    fee_percent?: number;
    active?: boolean;
};

/**
 * Fetch daftar channel aktif dari Dupay orchestrator.
 * Source of truth: channel_mapping di tabel payment_gateways (dikonfig via dupay-cms).
 *
 * Endpoint ini public (no auth), supaya response bisa di-cache di edge layer kalau perlu.
 */
export const getAvailableChannels = async (gatewayName?: string): Promise<DupayChannel[]> => {
    const name = (gatewayName || DUPAY_GATEWAY_NAME).trim();
    const endpointCandidates = [
        '/v1/channels',        // current dupaybe public endpoint
        '/v1/charge/channels', // backward compatibility (older routing)
        '/channels',           // safety if DUPAY_BASE_URL already includes /v1
    ];
    try {
        for (const endpoint of endpointCandidates) {
            try {
                const res = await axios.get(`${DUPAY_BASE_URL}${endpoint}`, {
                    params: { gateway: name },
                    timeout: 10000,
                });
                const data = res.data?.data;
                if (Array.isArray(data)) return data;
            } catch (error: any) {
                // Try next candidate on common routing/config mismatch statuses.
                const status = error?.response?.status;
                if (status === 404 || status === 405 || status === 301 || status === 302) {
                    continue;
                }
                throw error;
            }
        }
        return [];
    } catch (error: any) {
        console.error('[DUPAY] getAvailableChannels error:', error?.response?.data || error?.message);
        return [];
    }
};

export const initPayment = async (
    trxId: string,
    amount: number,
    paymentMethod: string,
    paymentChannel?: string,
    cfg?: {
        baseUrl?: string;
        apiKey?: string;
        secretKey?: string;
        gatewayName?: string;
    }
): Promise<DupayCreatePaymentResult> => {
    const baseUrl = (cfg?.baseUrl || DUPAY_BASE_URL).replace(/\/$/, '');
    const apiKey = (cfg?.apiKey || '').trim();
    const secretKey = (cfg?.secretKey || '').trim();
    const gatewayName = (cfg?.gatewayName || DUPAY_GATEWAY_NAME).trim();

    if (!apiKey || !secretKey) {
        return {
            success: false,
            message: 'Dupay API key/secret belum diatur di System Config admin.',
            paymentUrl: null,
            paymentNo: null,
            paymentName: 'Dupay',
            paymentTrxId: null,
            expiredTime: null,
        };
    }

    const payload = {
        order_id: trxId,
        amount: Math.floor(amount),
        currency: 'IDR',
        payment_method: normalizeChannel(paymentMethod, paymentChannel),
        gateway_name: gatewayName,
    };

    const payloadJson = JSON.stringify(payload);
    const timestamp = new Date().toISOString();
    const signature = crypto
        .createHmac('sha256', secretKey)
        .update(payloadJson + timestamp)
        .digest('hex');

    try {
        const response = await axios.post(`${baseUrl}/v1/charge`, payload, {
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': apiKey,
                'X-Timestamp': timestamp,
                'X-Signature': signature,
                'X-Idempotency-Key': trxId,
            },
            timeout: 30000,
        });

        const trx = response.data?.data;
        return {
            success: true,
            message: 'Success',
            paymentUrl: trx?.checkout_url || null,
            paymentNo: trx?.payment_code || trx?.checkout_url || null,
            paymentName: 'Dupay',
            paymentTrxId: trx?.pg_reference_id || trx?.id || null,
            expiredTime: null,
        };
    } catch (error: any) {
        const errBody = error?.response?.data;
        const errMessage =
            errBody?.error ||
            errBody?.message ||
            error?.message ||
            'Gagal membuat transaksi ke Dupay';

        return {
            success: false,
            message: errMessage,
            paymentUrl: null,
            paymentNo: null,
            paymentName: 'Dupay',
            paymentTrxId: null,
            expiredTime: null,
        };
    }
};
