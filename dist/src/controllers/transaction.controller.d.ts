import type { Request, Response } from 'express';
/**
 * Process Game Topup (Trigger Provider)
 * Use this to fulfill the order after payment is confirmed (Balance or Gateway).
 */
export declare const processGameTopup: (trxId: string) => Promise<{
    success: boolean;
    message?: never;
} | {
    success: boolean;
    message: any;
}>;
export declare const getCategories: (req: Request, res: Response) => Promise<void>;
export declare const getCategoryBySlug: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getBestSellingCategories: (req: Request, res: Response) => Promise<void>;
export declare const getPopularCategories: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getProducts: (req: Request, res: Response) => Promise<void>;
export declare const getVendorProducts: (req: Request, res: Response) => Promise<void>;
export declare const checkGameId: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createTransaction: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createDeposit: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const handleIpaymuCallback: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const checkTransactionStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getHistory: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getTransaction: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const handleVipCallback: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=transaction.controller.d.ts.map