import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();
// Config - Dynamic Loading
const MODE = process.env.PAYMENT_ENV === 'PRODUCTION' ? 'PROD' : 'DEV';
let IPAYMU_BASE_URL;
let IPAYMU_API_KEY;
let IPAYMU_VA;
if (MODE === 'PROD') {
    IPAYMU_BASE_URL = process.env.IPAYMU_API_URL_PROD || process.env.IPAYMU_API_URL || '';
    IPAYMU_API_KEY = (process.env.IPAYMU_API_KEY_PROD || process.env.IPAYMU_API_KEY || '').trim();
    IPAYMU_VA = (process.env.IPAYMU_VA_PROD || process.env.IPAYMU_VA || '').trim();
}
else {
    IPAYMU_BASE_URL = process.env.IPAYMU_API_URL_DEV || process.env.IPAYMU_API_URL || '';
    IPAYMU_API_KEY = (process.env.IPAYMU_API_KEY_DEV || process.env.IPAYMU_API_KEY || '').trim();
    IPAYMU_VA = (process.env.IPAYMU_VA_DEV || process.env.IPAYMU_VA || '').trim();
}
console.log(`[IPAYMU] Initialized Mode: ${MODE}`);
export const initPayment = async (trxId, amount, buyerName, buyerEmail, paymentMethod, returnPath) => {
    console.log(`[IPAYMU] Init Payment: ${trxId} Rp${amount} via ${paymentMethod}`);
    // Debugging Credentials (Masked)
    const keyStart = IPAYMU_API_KEY.substring(0, 5);
    const keyEnd = IPAYMU_API_KEY.substring(IPAYMU_API_KEY.length - 5);
    console.log(`[IPAYMU] Config: VA='${IPAYMU_VA}' | Key='${keyStart}***${keyEnd}'`);
    // Map Payment Method to Ipaymu valid values
    let method = 'qris';
    let channel = null;
    const pmLower = paymentMethod.toLowerCase();
    if (pmLower === 'qris') {
        method = 'qris';
        channel = 'qris'; // Channel for QRIS is usually 'qris' or 'mpm'
    }
    else if (pmLower === 'va') {
        method = 'va';
        channel = null; // Generic VA, let user choose on Ipaymu page (if supported) or default? 
        // Note: If Ipaymu Direct API requires channel, this might fail without a channel. 
        // But for "Redirect" payment (which returnUrl implies), sending just method 'va' usually opens the list.
    }
    else if (pmLower.startsWith('va_')) {
        // Handle specific like VA_BCA -> method='va', channel='bca'
        method = 'va';
        channel = pmLower.replace('va_', '');
    }
    const returnUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000'; // Should be ngrok/public URL for callbacks
    // Use specific return path (e.g. /order/mobile-legends) or default to history
    const finalReturnUrl = returnPath ? `${returnUrl}${returnPath}?id=${trxId}` : `${returnUrl}/history?id=${trxId}`;
    const bodyObj = {
        "product": ["Topup Game"],
        "qty": ["1"],
        "price": [amount.toFixed(0)],
        "returnUrl": finalReturnUrl,
        "cancelUrl": `${returnUrl}/order`,
        "notifyUrl": `${backendUrl}/api/callback/ipaymu`,
        "referenceId": trxId,
        "buyerName": buyerName || "Guest",
        "buyerEmail": buyerEmail || "guest@gmail.com",
        "buyerPhone": "08123456789",
        "paymentMethod": method
    };
    if (channel) {
        bodyObj.paymentChannel = channel;
    }
    if (bodyObj.notifyUrl.includes('localhost')) {
        console.warn('⚠️  [IPAYMU] WARNING: notifyUrl is set to LOCALHOST. Callbacks will FAIL unless you use ngrok/tunnel.');
    }
    try {
        const bodyJson = JSON.stringify(bodyObj);
        // 2. Generate Signature (The Correct V2 Way)
        // Step A: Hash Body with SHA256 -> Lowercase Hex
        const bodyHash = crypto.createHash('sha256').update(bodyJson).digest('hex').toLowerCase();
        // Step B: Construct StringToSign -> "POST:VA:BodyHash:Key"
        const stringToSign = `POST:${IPAYMU_VA}:${bodyHash}:${IPAYMU_API_KEY}`;
        // Step C: HMAC-SHA256 the StringToSign using API Key
        const signature = crypto.createHmac('sha256', IPAYMU_API_KEY)
            .update(stringToSign)
            .digest('hex')
            .toLowerCase();
        console.log(`[IPAYMU] StringToSign: ${stringToSign}`);
        console.log(`[IPAYMU] Signature: ${signature}`);
        // 3. Send Request
        const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14); // YYYYMMDDhhmmss
        const response = await axios.post(`${IPAYMU_BASE_URL}/payment`, bodyJson, {
            headers: {
                'Content-Type': 'application/json',
                'va': IPAYMU_VA,
                'signature': signature,
                'timestamp': timestamp
            }
        });
        const resData = response.data;
        if (resData.Success) {
            console.log('[IPAYMU] Success:', resData.Data);
            return {
                success: true,
                data: {
                    SessionId: resData.Data.SessionID,
                    Url: resData.Data.Url,
                    TransactionId: resData.Data.TransactionId
                }
            };
        }
        else {
            console.error('[IPAYMU] Failed Response:', resData);
            return { success: false, message: resData.Message || 'Ipaymu Transaction Failed' };
        }
    }
    catch (error) {
        console.error('[IPAYMU] HTTP Exception:', error.response?.data || error.message);
        return { success: false, message: error.response?.data?.Message || 'Payment Gateway Connection Error' };
    }
};
// --- NEW DIRECT PAYMENT (EMBEDDED) ---
export const directPayment = async (trxId, amount, buyerName, buyerEmail, buyerPhone, paymentMethod, paymentChannel) => {
    console.log(`[IPAYMU] Direct Payment: ${trxId} Rp${amount} | Method: ${paymentMethod}:${paymentChannel}`);
    // Config logic same as initPayment
    const returnUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const bodyObj = {
        "name": buyerName || "Guest",
        "phone": buyerPhone || "08123456789",
        "email": buyerEmail || "guest@gmail.com",
        "amount": amount,
        "notifyUrl": `${backendUrl}/api/callback/ipaymu`,
        "expired": 24, // 24 hours
        "expiredType": "hours",
        "comments": `Order ${trxId}`,
        "referenceId": trxId,
        "paymentMethod": paymentMethod,
        "paymentChannel": paymentChannel,
        "product": ["Topup Game"],
        "qty": ["1"],
        "price": [amount],
        "weight": ["1"],
        "width": ["1"],
        "height": ["1"],
        "length": ["1"],
        "deliveryArea": "76111",
        "deliveryAddress": "Digital Product"
    };
    try {
        const bodyJson = JSON.stringify(bodyObj);
        // Generate Signature
        const bodyHash = crypto.createHash('sha256').update(bodyJson).digest('hex').toLowerCase();
        const stringToSign = `POST:${IPAYMU_VA}:${bodyHash}:${IPAYMU_API_KEY}`;
        const signature = crypto.createHmac('sha256', IPAYMU_API_KEY).update(stringToSign).digest('hex').toLowerCase();
        // Send Request to /payment/direct
        const response = await axios.post(`${IPAYMU_BASE_URL}/payment/direct`, bodyJson, {
            headers: {
                'Content-Type': 'application/json',
                'va': IPAYMU_VA,
                'signature': signature,
                'timestamp': new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)
            }
        });
        const resData = response.data;
        if (resData.Success) {
            console.log('[IPAYMU] Direct Success:', resData.Data);
            return {
                success: true,
                data: resData.Data // Contains PaymentNo, PaymentName, Expired, QrString, etc.
            };
        }
        else {
            console.error('[IPAYMU] Direct Failed:', resData);
            return { success: false, message: resData.Message || 'Payment Generation Failed' };
        }
    }
    catch (error) {
        console.error('[IPAYMU] Direct HTTP Error:', error.response?.data || error.message);
        return { success: false, message: error.response?.data?.Message || 'Payment Gateway Error' };
    }
};
// 4. Double Check Transaction (Server-to-Server)
export const checkTransaction = async (trxId) => {
    console.log(`[IPAYMU] Checking Status for: ${trxId}`);
    try {
        const bodyObj = { transactionId: trxId };
        const bodyJson = JSON.stringify(bodyObj);
        // Generate Signature
        const bodyHash = crypto.createHash('sha256').update(bodyJson).digest('hex').toLowerCase();
        const stringToSign = `POST:${IPAYMU_VA}:${bodyHash}:${IPAYMU_API_KEY}`;
        const signature = crypto.createHmac('sha256', IPAYMU_API_KEY).update(stringToSign).digest('hex').toLowerCase();
        const response = await axios.post(`${IPAYMU_BASE_URL}/transaction`, bodyJson, {
            headers: {
                'Content-Type': 'application/json',
                'va': IPAYMU_VA,
                'signature': signature,
                'timestamp': new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)
            }
        });
        const resData = response.data;
        if (resData.Success) {
            console.log(`[IPAYMU] Check Result: ${resData.Data.Status} (${resData.Data.StatusDesc})`);
            return {
                success: true,
                status: resData.Data.Status, // 1 = Pending, 6 = Success
                statusDesc: resData.Data.StatusDesc,
                data: resData.Data // Expose full data (Channel, Via, PaymentNo, etc.)
            };
        }
        return { success: false, message: 'Transaction Not Found in Ipaymu' };
    }
    catch (error) {
        console.error('[IPAYMU] Check Error:', error.response?.data || error.message);
        return { success: false, message: 'Failed to verify with Ipaymu' };
    }
};
//# sourceMappingURL=ipaymu.service.js.map