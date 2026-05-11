import type { Request, Response } from 'express';
export declare const getActiveBanners: (req: Request, res: Response) => Promise<void>;
export declare const getLeaderboard: (req: Request, res: Response) => Promise<void>;
export declare const createBanner: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteBanner: (req: Request, res: Response) => Promise<void>;
export declare const toggleBannerActive: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=content.controller.d.ts.map