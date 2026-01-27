export declare const initPayment: (trxId: string, amount: number, buyerName: string, buyerEmail: string, paymentMethod: string, returnPath?: string) => Promise<{
    success: boolean;
    data: {
        SessionId: any;
        Url: any;
        TransactionId: any;
    };
    message?: never;
} | {
    success: boolean;
    message: any;
    data?: never;
}>;
export declare const checkTransaction: (trxId: string) => Promise<{
    success: boolean;
    status: any;
    statusDesc: any;
    data: any;
    message?: never;
} | {
    success: boolean;
    message: string;
    status?: never;
    statusDesc?: never;
    data?: never;
}>;
//# sourceMappingURL=ipaymu.service.d.ts.map