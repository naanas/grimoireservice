/**
 * Initializes a transaction on Tripay securely in Node.js
 */
export declare const initPayment: (trxId: string, amount: number, buyerName: string, buyerEmail: string, buyerPhone: string, productName: string, paymentChannel: string, basePrice?: number, adminFee?: number, optMode?: string, optApiKey?: string, optPrivateKey?: string, optMerchantCode?: string) => Promise<{
    success: boolean;
    message: string;
    paymentUrl: any;
    paymentNo: any;
    paymentName: any;
    paymentTrxId: any;
    expiredTime: any;
} | {
    success: boolean;
    message: any;
    paymentUrl?: never;
    paymentNo?: never;
    paymentName?: never;
    paymentTrxId?: never;
    expiredTime?: never;
}>;
//# sourceMappingURL=tripay.service.d.ts.map