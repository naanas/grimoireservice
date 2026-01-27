import { z } from 'zod';
export const checkGameIdSchema = z.object({
    userId: z.string().min(1, "User ID Required"),
    zoneId: z.string().optional(),
    gameCode: z.string().optional(),
    gameSlug: z.string().optional()
}).refine(data => data.gameCode || data.gameSlug, {
    message: "Either gameCode or gameSlug must be provided",
    path: ["gameCode"]
});
//# sourceMappingURL=transaction.verify.schema.js.map