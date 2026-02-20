import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

// Global Tripay Config fetcher based on environment variables
const getTripayConfig = (overrideMode?: string, overrideKey?: string, overridePriv?: string, overrideCode?: string) => {
    const globalMode = process.env.TRIPAY_MODE || 'SANDBOX';
    const mode = overrideMode || globalMode;

    // Explicit Prod/SB keys for standard usage if none provided
    const apiKey = overrideKey || (mode === 'PRODUCTION' ? process.env.TRIPAY_PROD_API_KEY : process.env.TRIPAY_SB_API_KEY) || process.env.TRIPAY_API_KEY;
    const privateKey = overridePriv || (mode === 'PRODUCTION' ? process.env.TRIPAY_PROD_PRIVATE_KEY : process.env.TRIPAY_SB_PRIVATE_KEY) || process.env.TRIPAY_PRIVATE_KEY;
    const merchantCode = overrideCode || (mode === 'PRODUCTION' ? process.env.TRIPAY_PROD_MERCHANT_CODE : process.env.TRIPAY_SB_MERCHANT_CODE) || process.env.TRIPAY_MERCHANT_CODE;
    const baseUrl = mode === 'PRODUCTION' ? 'https://tripay.co.id/api' : 'https://tripay.co.id/api-sandbox';

    return { mode, apiKey, privateKey, merchantCode, baseUrl };
};

/**
 * Initializes a transaction on Tripay securely in Node.js
 */
export const initPayment = async (
    trxId: string,
    amount: number,
    buyerName: string,
    buyerEmail: string,
    buyerPhone: string,
    productName: string,
    paymentChannel: string,
    basePrice?: number,
    adminFee?: number,
    // Optional Config Overrides
    optMode?: string,
    optApiKey?: string,
    optPrivateKey?: string,
    optMerchantCode?: string
) => {

    const conf = getTripayConfig(optMode, optApiKey, optPrivateKey, optMerchantCode);

    if (!conf.apiKey || !conf.privateKey || !conf.merchantCode) {
        console.error(`❌ [TRIPAY Service] Missing Credentials for Mode: ${conf.mode}`);
        return { success: false, message: 'Tripay Configuration Error.' };
    }

    console.log(`[TRIPAY Service] Init Payment: ${trxId} Rp${amount} via ${paymentChannel} (${conf.mode})`);

    // Payload Prepping
    const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';

    // Reconstruct Return URL logic from Java
    const returnUrl = `${frontendUrl}/history?id=${trxId}`;

    // Accurate logic for items (handling fees)
    let productPrice = basePrice ? Math.floor(basePrice) : Math.floor(amount);
    if (!basePrice && adminFee && adminFee > 0) {
        productPrice -= Math.floor(adminFee);
    }

    const items: any[] = [{
        sku: 'TOPUP',
        name: productName,
        price: productPrice,
        quantity: 1
    }];

    if (adminFee && adminFee > 0) {
        items.push({
            sku: 'FEE',
            name: 'Admin Fee',
            price: Math.floor(adminFee),
            quantity: 1
        });
        amount = productPrice + Math.floor(adminFee); // Sync total amount exactly
    }

    const payloadObj = {
        method: paymentChannel, // e.g., 'QRISC', 'BCAVA'
        merchant_ref: trxId,
        amount: Math.floor(amount),
        customer_name: buyerName || 'Guest',
        customer_email: buyerEmail || 'guest@grimoire.com',
        customer_phone: buyerPhone || '081234567890',
        order_items: items,
        return_url: returnUrl,
        expired_time: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // + 24 Hours
        signature: ''
    };

    // Construct Signature exactly like Java did
    // String data = merchantCode + merchantRef + amount;
    // Mac hmac = Mac.getInstance("HmacSHA256")... -> hex
    const signatureStr = `${conf.merchantCode}${trxId}${payloadObj.amount}`;
    payloadObj.signature = crypto.createHmac('sha256', conf.privateKey as string).update(signatureStr).digest('hex');

    try {
        const response = await axios.post(`${conf.baseUrl}/transaction/create`, payloadObj, {
            headers: {
                'Authorization': `Bearer ${conf.apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000 // Match Java timeout reliability
        });

        const resData = response.data;
        if (resData.success) {
            console.log(`✅ [TRIPAY Service] Created ${trxId} successfully on Tripay.`);
            const payloadData = resData.data;

            // Map payment data (QR vs VA)
            let paymentNo = null;
            if (payloadData.qr_string) paymentNo = payloadData.qr_string;
            else if (payloadData.qr_url) paymentNo = payloadData.qr_url;
            else paymentNo = payloadData.pay_code;

            return {
                success: true,
                message: "Success",
                paymentUrl: payloadData.checkout_url,
                paymentNo: paymentNo,
                paymentName: payloadData.payment_name,
                paymentTrxId: payloadData.reference,
                expiredTime: payloadData.expired_time
            };

        } else {
            console.error(`❌ [TRIPAY Service] Refused:`, resData.message);
            return { success: false, message: resData.message || 'Payment Creation Refused' };
        }

    } catch (error: any) {
        console.error(`❌ [TRIPAY Service] HTTP Error for ${trxId}:`, error.response?.data || error.message);
        return {
            success: false,
            message: error.response?.data?.message || 'Payment Gateway HTTP Connection Error'
        };
    }
};
