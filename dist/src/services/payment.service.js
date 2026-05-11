import dotenv from 'dotenv';
import { logger } from '../lib/logger.js';
import * as tripay from './tripay.service.js';
import * as ipaymu from './ipaymu.service.js';
import * as dupay from './dupay.service.js';
dotenv.config();
const enrichWhitelistHint = (rawMessage) => {
    const msg = (rawMessage || '').toLowerCase();
    const isWhitelistLike = msg.includes('whitelist') || (msg.includes('ip') && (msg.includes('allow') || msg.includes('forbidden')));
    if (!isWhitelistLike)
        return rawMessage;
    const isDupayWhitelist = msg.includes('api key ini') || msg.includes('whitelisted ips') || msg.includes('dupay cms');
    if (isDupayWhitelist) {
        return `${rawMessage} | Hint: Tambahkan IP server grimoireservice ke whitelist merchant di Dupay (Whitelisted IPs).`;
    }
    return `${rawMessage} | Hint: Tambahkan IP egress/server Dupay ke whitelist di dashboard Payment Gateway (Tripay/dll).`;
};
export const createPayment = async (trxId, amount, method, channel, buyerName, buyerEmail, buyerPhone, productName, 
// Optional Credentials
tripayApiKey, tripayPrivateKey, tripayMerchantCode, tripayMode, basePrice, adminFee, dupayBaseUrl, dupayApiKey, dupaySecretKey, dupayGatewayName) => {
    try {
        logger.info(`[PAYMENT-SERVICE] Native routing ${method} transaction for ${trxId}`);
        if (method === 'DUPAY') {
            const dupayConfig = {
                baseUrl: dupayBaseUrl || '',
                apiKey: dupayApiKey || '',
                secretKey: dupaySecretKey || '',
                gatewayName: dupayGatewayName || ''
            };
            const result = await dupay.initPayment(trxId, amount, channel, channel, {
                baseUrl: dupayConfig.baseUrl,
                apiKey: dupayConfig.apiKey,
                secretKey: dupayConfig.secretKey,
                gatewayName: dupayConfig.gatewayName,
            });
            if (!result.success)
                throw new Error(result.message);
            return result;
        }
        else if (method === 'TRIPAY') {
            const result = await tripay.initPayment(trxId, amount, buyerName, buyerEmail, buyerPhone, productName, channel, basePrice, adminFee, tripayMode, tripayApiKey, tripayPrivateKey, tripayMerchantCode);
            if (!result.success)
                throw new Error(result.message);
            return result;
        }
        else if (method === 'IPAYMU') {
            const result = await ipaymu.initPayment(trxId, amount, buyerName, buyerEmail, channel // Ipaymu expects channel as method parameter inside init payment logic mapping
            );
            if (!result.success)
                throw new Error(result.message);
            // Map Ipaymu return to standard Tripay-like format for transaction controller
            return {
                success: true,
                message: "Success",
                paymentUrl: result.data?.Url,
                paymentNo: null,
                paymentDeeplink: null,
                paymentName: 'Ipaymu URL',
                paymentTrxId: result.data?.TransactionId || `${result.data?.SessionId}`,
                expiredTime: null
            };
        }
        else {
            throw new Error(`Unsupported Gateway Method: ${method}`);
        }
    }
    catch (error) {
        const baseMessage = error?.message || 'Payment Service Core Error';
        const enrichedMessage = enrichWhitelistHint(baseMessage);
        logger.error(`[PAYMENT-SERVICE] Error: ${enrichedMessage}`);
        throw new Error(enrichedMessage);
    }
};
//# sourceMappingURL=payment.service.js.map