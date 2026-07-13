type SyncableTransaction = {
    id: string;
    status: string;
    invoice: string;
    providerTrxId?: string | null;
    providerStatus?: string | null;
    type?: string | null;
    sn?: string | null;
    guestContact?: string | null;
    userId?: string | null;
    targetId?: string | null;
    product?: {
        name?: string | null;
    } | null;
};
/**
 * Poll VIP/provider for in-flight topups and persist status changes.
 * Safe to call from GET /check — only hits provider status API (not order).
 */
export declare function syncProviderStatusIfNeeded(trx: SyncableTransaction): Promise<SyncableTransaction>;
export {};
//# sourceMappingURL=transaction-sync.service.d.ts.map