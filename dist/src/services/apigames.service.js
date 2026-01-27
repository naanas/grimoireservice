import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();
// Mock Mode Removed
const APIGAMES_URL = process.env.APIGAMES_URL || 'https://v1.apigames.id';
const MERCHANT_ID = process.env.APIGAMES_MERCHANT_ID || '';
const SECRET_KEY = process.env.APIGAMES_SECRET || '';
// Helper: Create MD5 Signature
const createSignature = (payload) => {
    return crypto.createHash('md5').update(payload).digest('hex');
};
export const checkProfile = async (gameCode, userId, zoneId) => {
    console.log(`[APIGAMES] Check Profile: ${gameCode} ${userId} ${zoneId}`);
    // Map Game Codes for Apigames
    if (gameCode === 'mobile-legends')
        gameCode = 'mobilelegend';
    if (gameCode === 'free-fire')
        gameCode = 'freefire';
    try {
        // Signature: md5(merchant_id + secret_key)
        const signature = createSignature(MERCHANT_ID + SECRET_KEY);
        // URL: /merchant/[merchant_id]/cek-username/[game_code]?user_id=[user_id]&signature=[signature]
        // Note: For MLBB, user_id usually is userId+zoneId or passed as separate param? 
        // Docs say: ?user_id=[user_id]
        // Usually for MLBB: user_id=12345678(1234) or user_id=12345678&zone_id=1234? 
        // Based on common Apigames: user_id for ML is usually "ID" or "IDzone". 
        // Let's assume user_id=ID first. If zone needed, maybe appended.
        // But some docs allow appending. Let's try standard format.
        let finalUserId = userId;
        if (gameCode === 'mobilelegend' && zoneId) {
            finalUserId = `${userId}(${zoneId})`;
        }
        const url = `${APIGAMES_URL}/merchant/${MERCHANT_ID}/cek-username/${gameCode}?user_id=${finalUserId}&signature=${signature}`;
        const response = await axios.get(url);
        const resData = response.data;
        // Response Logic based on docs
        // { status: 1, rc: 0, message: "Data Found", data: { is_valid: true, username: "..." } }
        if (resData.status === 1 && resData.rc === 0 && resData.data.is_valid) {
            return {
                success: true,
                data: {
                    username: resData.data.username,
                    user_id: userId,
                    zone_id: zoneId
                }
            };
        }
        else {
            return { success: false, message: 'User Not Found' };
        }
    }
    catch (error) {
        console.error('[APIGAMES] Check Error:', error.message);
        return { success: false, message: 'Provider Error' };
    }
};
export const getMerchantServices = async () => {
    console.log(`[APIGAMES] Fetching Product List...`);
    try {
        // Signature: md5(merchant_id + secret_key)
        const signature = createSignature(MERCHANT_ID + SECRET_KEY);
        // Endpoint: /v1/price?merchant_id=...&signature=...
        const url = `${APIGAMES_URL}/v1/price?merchant_id=${MERCHANT_ID}&signature=${signature}`;
        const response = await axios.get(url);
        const resData = response.data;
        // Response format usually: { status: 1, data: [ { code: '...', price: ... } ] }
        if (resData.status === 1) {
            return {
                success: true,
                data: resData.data
            };
        }
        else {
            return { success: false, message: resData.error_msg || 'Failed to fetch services' };
        }
    }
    catch (error) {
        console.error('[APIGAMES] Service List Error:', error.message);
        return { success: false, message: `Provider Error: ${error.message} | ${JSON.stringify(error.response?.data)}` };
    }
};
export const placeOrder = async (refId, sku, dest, zoneId) => {
    console.log(`[APIGAMES] Order: ${refId} ${sku} to ${dest}`);
    try {
        // Signature: md5(merchant_id + secret_key + ref_id)
        const signature = createSignature(`${MERCHANT_ID}:${SECRET_KEY}:${refId}`);
        const payload = {
            ref_id: refId,
            merchant_id: MERCHANT_ID,
            produk: sku,
            tujuan: dest,
            server_id: zoneId || "",
            signature: signature
        };
        const response = await axios.post(`${APIGAMES_URL}/v2/transaksi`, payload);
        const resData = response.data;
        if (resData.status === 1) {
            return {
                success: true,
                data: {
                    ref_id: resData.data.ref_id,
                    trxId: resData.data.trx_id,
                    status: resData.data.status,
                    sn: resData.data.sn,
                    message: resData.data.message,
                    price: resData.data.price
                }
            };
        }
        else {
            return { success: false, message: resData.error_msg || 'Provider Failed' };
        }
    }
    catch (error) {
        console.error('[APIGAMES] Order Error:', error.message);
        return { success: false, message: 'Provider Connection Error' };
    }
};
export const checkTransaction = async (refId) => {
    console.log(`[APIGAMES] Check Status: ${refId}`);
    try {
        const signature = createSignature(`${MERCHANT_ID}:${SECRET_KEY}:${refId}`);
        const url = `${APIGAMES_URL}/v2/transaksi/status?merchant_id=${MERCHANT_ID}&ref_id=${refId}&signature=${signature}`;
        const response = await axios.get(url);
        const resData = response.data;
        if (resData.status === 1 || (resData.data && resData.data.status)) {
            return {
                success: true,
                data: {
                    ref_id: resData.data.ref_id,
                    status: resData.data.status,
                    sn: resData.data.sn,
                    message: resData.data.message
                }
            };
        }
        else {
            return { success: false, message: resData.error_msg || 'Status Check Failed' };
        }
    }
    catch (error) {
        console.error('[APIGAMES] Status Check Error:', error.message);
        return { success: false, message: 'Provider Error' };
    }
};
//# sourceMappingURL=apigames.service.js.map