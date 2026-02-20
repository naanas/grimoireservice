import dotenv from 'dotenv';
import { logger } from '../lib/logger.js';
import * as tripay from './tripay.service.js';
import * as ipaymu from './ipaymu.service.js';
dotenv.config();

export const createPayment = async (
    trxId: string,
    amount: number,
    method: 'TRIPAY' | 'IPAYMU',
    channel: string,
    buyerName: string,
    buyerEmail: string,
    buyerPhone: string,
    productName: string,
    // Optional Credentials
    tripayApiKey?: string,
    tripayPrivateKey?: string,
    tripayMerchantCode?: string,
    tripayMode?: string,
    basePrice?: number,
    adminFee?: number
) => {
    try {
        logger.info(`[PAYMENT-SERVICE] Native routing ${method} transaction for ${trxId}`);

        if (method === 'TRIPAY') {
            const result = await tripay.initPayment(
                trxId, amount, buyerName, buyerEmail, buyerPhone, productName, channel,
                basePrice, adminFee, tripayMode, tripayApiKey, tripayPrivateKey, tripayMerchantCode
            );

            if (!result.success) throw new Error(result.message);
            return result;

        } else if (method === 'IPAYMU') {
            const result = await ipaymu.initPayment(
                trxId, amount, buyerName, buyerEmail, channel // Ipaymu expects channel as method parameter inside init payment logic mapping
            );

            if (!result.success) throw new Error(result.message);

            // Map Ipaymu return to standard Tripay-like format for transaction controller
            return {
                success: true,
                message: "Success",
                paymentUrl: result.data?.Url,
                paymentNo: null,
                paymentName: 'Ipaymu URL',
                paymentTrxId: result.data?.TransactionId || `${result.data?.SessionId}`,
                expiredTime: null
            };

        } else {
            throw new Error(`Unsupported Gateway Method: ${method}`);
        }

    } catch (error: any) {
        logger.error(`[PAYMENT-SERVICE] Error: ${error.message}`);
        throw new Error(error.message || 'Payment Service Core Error');
    }
};
