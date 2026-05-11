export declare const createPayment: (trxId: string, amount: number, method: "TRIPAY" | "IPAYMU", channel: string, buyerName: string, buyerEmail: string, buyerPhone: string, productName: string, tripayApiKey?: string, tripayPrivateKey?: string, tripayMerchantCode?: string, tripayMode?: string, basePrice?: number, adminFee?: number) => Promise<{
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
//# sourceMappingURL=payment.service.d.ts.map