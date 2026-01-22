import type { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    try {
        schema.parse(req.body);
        next();
    } catch (error) {
        if (error instanceof ZodError) {
            console.warn("Validation Error Details:", JSON.stringify(error));
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors: ((error as any).errors || []).map((e: any) => ({ field: (e.path || []).join('.'), message: e.message }))
            });
        }
        next(error);
    }
};
