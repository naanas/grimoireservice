import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const VIP_APIID = process.env.VIP_APIID || '';
const VIP_APIKEY = process.env.VIP_APIKEY || '';
const VIP_URL = process.env.VIP_URL || '';
// MOCK MODE support if needed, but usually we use real API with Sandbox keys if available.
// MOCK MODE removed.

// Helper: MD5 Signature (API ID + API KEY)
const createSignature = () => {
    return crypto.createHash('md5').update(VIP_APIID + VIP_APIKEY).digest('hex');
};

// 1. Check Profile (Game ID)
export const checkProfile = async (gameCode: string, userId: string, zoneId?: string) => {
    console.log(`[VIP] Check ID: ${gameCode} | ${userId} | ${zoneId || '-'}`);

    try {
        const payload = new URLSearchParams();
        payload.append('key', VIP_APIKEY);
        payload.append('sign', createSignature());
        payload.append('type', 'get-nickname');
        payload.append('code', gameCode);
        payload.append('target', userId);
        if (zoneId) payload.append('additional_target', zoneId);

        const response = await axios.post(VIP_URL, payload);
        const resData = response.data;

        // { result: true, data: "Nickname", message: "Success" }
        if (resData.result) {
            return {
                success: true,
                data: {
                    username: resData.data,
                    user_id: userId,
                    zone_id: zoneId
                }
            };
        } else {
            return { success: false, message: resData.message || 'User Not Found' };
        }
    } catch (error: any) {
        console.error('[VIP] Check Profile Error:', error.message);
        return { success: false, message: 'Provider Error' };
    }
};

// 2. Get Services (Product List)
export const getMerchantServices = async (filterGame?: string) => {
    console.log(`[VIP] Fetching Services...`);

    try {
        const payload = new URLSearchParams();
        payload.append('key', VIP_APIKEY);
        payload.append('sign', createSignature());
        payload.append('type', 'services');
        if (filterGame) payload.append('filter_game', filterGame);
        payload.append('filter_status', 'available');

        const response = await axios.post(VIP_URL, payload);
        const resData = response.data;

        // { result: true, data: [ { code, game, name, price: { basic, premium, special }, status } ] }
        if (resData.result) {
            // Map to standard format expected by Controller
            const products = resData.data.map((item: any) => ({
                code: item.code,
                name: item.name,
                category: item.game,
                price: item.price.basic, // Use BASIC price (standard)
                status: item.status === 'available'
            }));

            return { success: true, data: products };
        } else {
            return { success: false, message: resData.message || 'Failed to fetch services' };
        }
    } catch (error: any) {
        console.error('[VIP] Services Error:', error.message);
        return { success: false, message: 'Provider Error' };
    }
};

// 3. Place Order
export const placeOrder = async (refId: string, sku: string, dest: string, zoneId?: string) => {
    console.log(`[VIP] Order: ${refId} ${sku} -> ${dest}`);

    try {
        const payload = new URLSearchParams();
        payload.append('key', VIP_APIKEY);
        payload.append('sign', createSignature());
        payload.append('type', 'order');
        payload.append('service', sku);
        payload.append('data_no', dest);
        payload.append('data_zone', zoneId || '');

        // VIP doesn't ask for ref_id? That's risky for idempotency.
        // But usually we save the returned 'trxid' (Provider ID).

        const response = await axios.post(VIP_URL, payload);
        const resData = response.data;

        // { result: true, data: { trxid, data, zone, service, status, price, balance } }
        if (resData.result) {
            return {
                success: true,
                data: {
                    trxId: resData.data.trxid,
                    status: resData.data.status === 'success' ? 'SUCCESS' : 'PENDING', // usually 'waiting'
                    sn: '', // delivered later
                    message: resData.message,
                    price: resData.data.price
                }
            };
        } else {
            return { success: false, message: resData.message || 'Order Failed' };
        }

    } catch (error: any) {
        console.error('[VIP] Order Error:', error.message);
        return { success: false, message: 'Provider Connection Error' };
    }
};

// 4. Check Transaction Status
export const checkTransaction = async (trxId: string) => {
    // Note: VIP uses Provider TrxID, not our RefID usually?
    // Docs say 'trxid'.
    console.log(`[VIP] Check Status: ${trxId}`);

    try {
        const payload = new URLSearchParams();
        payload.append('key', VIP_APIKEY);
        payload.append('sign', createSignature());
        payload.append('type', 'status');
        payload.append('trxid', trxId);

        const response = await axios.post(VIP_URL, payload);
        const resData = response.data;

        // { result: true, data: [ { trxid, status, note, sn } ] }
        if (resData.result && resData.data && resData.data.length > 0) {
            const tx = resData.data[0];
            return {
                success: true,
                data: {
                    status: tx.status, // success, error, waiting
                    sn: tx.note || '', // sometimes SN is in note? Docs say 'note', example doesn't show SN field strictly.
                    // Actually logic needed: if status success, maybe note has SN?
                    message: tx.message || tx.note
                }
            };
        } else {
            return { success: false, message: 'Transaction Not Found' };
        }
    } catch (error: any) {
        console.error('[VIP] Status Check Error:', error.message);
        return { success: false, message: 'Provider Error' };
    }
};
