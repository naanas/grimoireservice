import type { Request, Response } from 'express';
export declare const startSession: (req: Request, res: Response) => Promise<void>;
export declare const getMySessions: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getSessionById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getActiveSessions: (req: Request, res: Response) => Promise<void>;
export declare const endSession: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=chat.controller.d.ts.map