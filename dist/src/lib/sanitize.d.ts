/** Remove internal cost fields from product payloads sent to public clients. */
export declare function sanitizeProductForPublic(product: Record<string, unknown> | null | undefined): {
    [x: string]: unknown;
} | null | undefined;
/** Strip provider cost from nested product on transaction responses. */
export declare function sanitizeTransactionForPublic(trx: Record<string, unknown> | null | undefined): Record<string, unknown> | null | undefined;
export declare function sanitizeProductsForPublic(products: Record<string, unknown>[]): ({
    [x: string]: unknown;
} | null | undefined)[];
export declare function sanitizeTransactionsForPublic(transactions: Record<string, unknown>[]): (Record<string, unknown> | null | undefined)[];
//# sourceMappingURL=sanitize.d.ts.map