type RecordLike = Record<string, unknown>;
export type PublicTransactionOptions = {
    isOwner?: boolean;
};
/** Strip internal pricing config from category payloads. */
export declare function sanitizeCategoryForPublic(category: RecordLike | null | undefined): {
    [x: string]: unknown;
} | null | undefined;
/** Public product shape for storefront APIs. */
export declare function sanitizeProductForPublic(product: RecordLike | null | undefined): {
    category?: {
        [x: string]: unknown;
    } | null | undefined;
} | null | undefined;
export declare function sanitizeProductsForPublic(products: RecordLike[]): ({
    category?: {
        [x: string]: unknown;
    } | null | undefined;
} | null | undefined)[];
/** Slim transaction payload for public clients (GET /check, history, check-status). */
export declare function sanitizeTransactionForPublic(trx: RecordLike | null | undefined, options?: PublicTransactionOptions): RecordLike | null | undefined;
export declare function sanitizeTransactionsForPublic(transactions: RecordLike[], options?: PublicTransactionOptions): (RecordLike | null | undefined)[];
export declare function toPublicTransactionResponse(trx: RecordLike, options?: PublicTransactionOptions & {
    overrides?: RecordLike;
}): RecordLike | null | undefined;
/** Checkout create response — no gateway/vendor internals. */
export declare function toPublicCheckoutResponse(payload: {
    id?: string;
    invoice: string;
    status?: string;
    paymentUrl?: string | null;
    paymentDeeplink?: string | null;
    paymentNo?: string | null;
    paymentName?: string | null;
    expired?: number | null;
    productName?: string;
    amount: number;
    basePrice?: number;
    adminFee?: number;
    discountAmount?: number;
}): RecordLike;
export {};
//# sourceMappingURL=sanitize.d.ts.map