import type { Request, Response } from 'express';
export declare const getCategories: (req: Request, res: Response) => Promise<void>;
export declare const getProducts: (req: Request, res: Response) => Promise<void>;
export declare const createTransaction: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createDeposit: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const handleIpaymuCallback: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getHistory: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getTransaction: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const handleApigamesWebhook: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const checkGameId: (req: Request, res: Response) => Promise<void>;
export declare const getVendorProducts: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=transaction.controller.d.ts.map