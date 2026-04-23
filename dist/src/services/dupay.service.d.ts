type DupayCreatePaymentResult = {
    success: boolean;
    message: string;
    paymentUrl: string | null;
    paymentNo: string | null;
    paymentName: string;
    paymentTrxId: string | null;
    expiredTime: string | null;
};
export declare const initPayment: (trxId: string, amount: number, paymentMethod: string, paymentChannel?: string, cfg?: {
    baseUrl?: string;
    apiKey?: string;
    secretKey?: string;
    gatewayName?: string;
}) => Promise<DupayCreatePaymentResult>;
export {};
//# sourceMappingURL=dupay.service.d.ts.map