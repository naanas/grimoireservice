import type { Server } from 'socket.io';
export declare const CHAT_AUTO_REPLY = "Mohon tunggu sebentar, pesan Anda sedang kami teruskan ke admin. Tim kami akan membalas sesegera mungkin.";
/** Send one-time auto-reply when customer opens chat and no admin is online. */
export declare function sendChatAutoReplyIfNeeded(sessionId: string, io: Server, adminOnline: boolean): Promise<{
    id: string;
    createdAt: Date;
    sessionId: string;
    sender: import(".prisma/client").$Enums.Role;
    content: string;
    isRead: boolean;
} | null>;
/** WhatsApp ping to admin — debounced per session. */
export declare function notifyAdminChatActivity(sessionId: string, options: {
    customerLabel: string;
    preview?: string;
}): Promise<void>;
export declare function getSessionCustomerLabel(sessionId: string): Promise<string>;
//# sourceMappingURL=chat-notify.service.d.ts.map