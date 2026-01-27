/**
 * Send WhatsApp Message using Fonnte
 * @param target Target format: '08123...' or '628123...'
 * @param message Message content
 */
export declare const sendMessage: (target: string, message: string) => Promise<{
    success: boolean;
    data?: never;
    message?: never;
} | {
    success: boolean;
    data: any;
    message?: never;
} | {
    success: boolean;
    message: any;
    data?: never;
}>;
//# sourceMappingURL=whatsapp.service.d.ts.map