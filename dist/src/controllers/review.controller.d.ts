import type { Request, Response } from 'express';
export declare const createReview: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getReviews: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getReviewStats: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getMyReview: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=review.controller.d.ts.map