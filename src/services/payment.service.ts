import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:8081';

export const createPayment = async (
    trxId: string,
    amount: number,
    method: 'TRIPAY' | 'IPAYMU',
    channel: string,
    buyerName: string,
    buyerEmail: string,
    buyerPhone: string,
    productName: string
) => {
    try {
        console.log(`[PAYMENT-SERVICE] Creating ${method} transaction for ${trxId}`);
        const response = await axios.post(`${PAYMENT_SERVICE_URL}/api/payment/create`, {
            transactionId: trxId,
            amount: amount,
            method: method,
            channel: channel,
            buyerName: buyerName,
            buyerEmail: buyerEmail,
            buyerPhone: buyerPhone,
            productName: productName
        });

        return response.data;
    } catch (error: any) {
        console.error('[PAYMENT-SERVICE] Error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Payment Service Error');
    }
};
