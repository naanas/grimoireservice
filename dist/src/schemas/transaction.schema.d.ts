import { z } from 'zod';
export declare const createTransactionSchema: z.ZodObject<{
    productId: z.ZodString;
    userId: z.ZodString;
    zoneId: z.ZodOptional<z.ZodString>;
    paymentMethod: z.ZodEnum<{
        va: "va";
        qris: "qris";
        ewallet: "ewallet";
        cstore: "cstore";
        QRIS: "QRIS";
        BALANCE: "BALANCE";
        VA: "VA";
        EWALLET: "EWALLET";
        RETAIL: "RETAIL";
        Qris: "Qris";
        CreditCard: "CreditCard";
        cc: "cc";
        cod: "cod";
        paylater: "paylater";
    }>;
    authUserId: z.ZodOptional<z.ZodString>;
    guestContact: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const createDepositSchema: z.ZodObject<{
    amount: z.ZodNumber;
    paymentMethod: z.ZodString;
}, z.core.$strip>;
//# sourceMappingURL=transaction.schema.d.ts.map