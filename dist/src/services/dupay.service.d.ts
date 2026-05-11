type DupayCreatePaymentResult = {
    success: boolean;
    message: string;
    paymentUrl: string | null;
    paymentNo: string | null;
    paymentDeeplink: string | null;
    paymentName: string;
    paymentTrxId: string | null;
    expiredTime: string | null;
};
export type DupayChannel = {
    code: string;
    label?: string;
    method?: 'va' | 'qris' | 'cstore' | 'ewallet' | '';
    group?: string;
    logo?: string;
    min_amount?: number;
    max_amount?: number;
    fee_flat?: number;
    fee_percent?: number;
    active?: boolean;
};
type DupayWebhookForwardParams = {
    gatewayName: string;
    rawPayload: string;
    signature?: string;
};
/**
 * Fetch daftar channel aktif dari Dupay orchestrator.
 * Source of truth: channel_mapping di tabel payment_gateways (dikonfig via dupay-cms).
 *
 * Endpoint ini public (no auth), supaya response bisa di-cache di edge layer kalau perlu.
 */
export declare const getAvailableChannels: (gatewayName?: string) => Promise<DupayChannel[]>;
/**
 * Forward webhook payload yang diterima grimoireservice ke dupaybe.
 * Dipakai saat callback provider (mis. Tripay) harus mengarah ke domain grimoire,
 * tapi status transaksi di dupaybe tetap harus sinkron.
 */
export declare const forwardWebhookToDupay: ({ gatewayName, rawPayload, signature, }: DupayWebhookForwardParams) => Promise<boolean>;
export declare const initPayment: (trxId: string, amount: number, paymentMethod: string, paymentChannel?: string, cfg?: {
    baseUrl?: string;
    apiKey?: string;
    secretKey?: string;
    gatewayName?: string;
}) => Promise<DupayCreatePaymentResult>;
export {};
//# sourceMappingURL=dupay.service.d.ts.map