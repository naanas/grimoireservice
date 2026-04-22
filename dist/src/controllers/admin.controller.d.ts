import type { Request, Response } from 'express';
export declare const getDashboardStats: (req: Request, res: Response) => Promise<void>;
export declare const getAllTransactions: (req: Request, res: Response) => Promise<void>;
export declare const updateProductPrice: (req: Request, res: Response) => Promise<void>;
export declare const getAllProducts: (req: Request, res: Response) => Promise<void>;
export declare const syncProducts: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getAllCategories: (req: Request, res: Response) => Promise<void>;
export declare const updateCategory: (req: Request, res: Response) => Promise<void>;
export declare const retryTransaction: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getPaymentMethods: (req: Request, res: Response) => Promise<void>;
export declare const togglePaymentMethod: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getAllReviews: (req: Request, res: Response) => Promise<void>;
export declare const approveReview: (req: Request, res: Response) => Promise<void>;
export declare const deleteReview: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=admin.controller.d.ts.map