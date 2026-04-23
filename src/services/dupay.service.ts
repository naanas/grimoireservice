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

const mapChannelToDupayMethod = (paymentMethod: string, channel?: string): string => {
    const method = (paymentMethod || '').toLowerCase();
    const rawChannel = (channel || '').toLowerCase();
    const normalizedChannel = rawChannel.replace(/^va_/, '');

    const directMap: Record<string, string> = {
        qris: 'QRISC',
        qrisc: 'QRISC',
        bca: 'BCAVA',
        bcava: 'BCAVA',
        mandiri: 'MANDIRIVA',
        mandiriva: 'MANDIRIVA',
        bni: 'BNIVA',
        bniva: 'BNIVA',
        bri: 'BRIVA',
        briva: 'BRIVA',
        cimb: 'CIMBVA',
        cimbva: 'CIMBVA',
        permata: 'PERMATAVA',
        permatava: 'PERMATAVA',
        dana: 'DANA',
        ovo: 'OVO',
        shopeepay: 'SHOPEEPAY',
        alfamart: 'ALFAMART',
        indomaret: 'INDOMARET',
    };

    if (directMap[normalizedChannel]) return directMap[normalizedChannel];
    if (directMap[method]) return directMap[method];

    if (method === 'va') return 'BCAVA';
    if (method === 'ewallet') return 'DANA';
    if (method === 'retail' || method === 'cstore') return 'ALFAMART';

    return 'QRISC';
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
        payment_method: mapChannelToDupayMethod(paymentMethod, paymentChannel),
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
            paymentNo: trx?.checkout_url || trx?.pg_reference_id || null,
            paymentName: 'Dupay',
            paymentTrxId: trx?.id || trx?.pg_reference_id || null,
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
