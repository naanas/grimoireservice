export declare const checkProfile: (gameCode: string, userId: string, zoneId?: string) => Promise<{
    success: boolean;
    data: {
        username: any;
        user_id: string;
        zone_id: string | undefined;
    };
    message?: never;
} | {
    success: boolean;
    message: string;
    data?: never;
}>;
export declare const getMerchantServices: () => Promise<{
    success: boolean;
    data: any;
    message?: never;
} | {
    success: boolean;
    message: any;
    data?: never;
}>;
export declare const placeOrder: (refId: string, sku: string, dest: string, zoneId?: string) => Promise<{
    success: boolean;
    data: {
        ref_id: string;
        status: string;
        trx_id: string;
        sn: string;
        price: number;
        message: string;
        trxId?: never;
    };
    message?: never;
} | {
    success: boolean;
    data: {
        ref_id: any;
        trxId: any;
        status: any;
        sn: any;
        message: any;
        price: any;
        trx_id?: never;
    };
    message?: never;
} | {
    success: boolean;
    message: any;
    data?: never;
}>;
//# sourceMappingURL=apigames.service.d.ts.map