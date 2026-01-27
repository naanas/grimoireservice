import { z } from 'zod';
export declare const checkGameIdSchema: z.ZodObject<{
    userId: z.ZodString;
    zoneId: z.ZodOptional<z.ZodString>;
    gameCode: z.ZodOptional<z.ZodString>;
    gameSlug: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
//# sourceMappingURL=transaction.verify.schema.d.ts.map