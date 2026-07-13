import { ChatService } from './chat.service.js';
import * as whatsappService from './whatsapp.service.js';
import { prisma } from '../lib/prisma.js';
export const CHAT_AUTO_REPLY = 'Mohon tunggu sebentar, pesan Anda sedang kami teruskan ke admin. Tim kami akan membalas sesegera mungkin.';
const waNotifyCooldown = new Map();
const WA_COOLDOWN_MS = 5 * 60 * 1000;
function getAdminWaNumber() {
    return process.env.ADMIN_NOTIFY_WA || process.env.ADMIN_WA_NUMBER || '082131077460';
}
function getAdminChatUrl() {
    const base = process.env.FRONTEND_URL || 'https://grimoirecoins.store';
    return `${base.replace(/\/$/, '')}/admin/chat`;
}
/** Send one-time auto-reply when customer opens chat and no admin is online. */
export async function sendChatAutoReplyIfNeeded(sessionId, io, adminOnline) {
    if (adminOnline)
        return null;
    const existing = await prisma.chatMessage.findFirst({
        where: { sessionId, sender: 'ADMIN', content: CHAT_AUTO_REPLY },
    });
    if (existing)
        return null;
    const autoMessage = await ChatService.addMessage(sessionId, 'ADMIN', CHAT_AUTO_REPLY);
    io.to(sessionId).emit('receive_message', autoMessage);
    return autoMessage;
}
/** WhatsApp ping to admin — debounced per session. */
export async function notifyAdminChatActivity(sessionId, options) {
    const now = Date.now();
    const last = waNotifyCooldown.get(sessionId) ?? 0;
    if (now - last < WA_COOLDOWN_MS)
        return;
    waNotifyCooldown.set(sessionId, now);
    const preview = options.preview?.trim().slice(0, 120) || '-';
    const message = [
        '🔔 *CHAT CUSTOMER BARU*',
        '---------------------------',
        `Dari: ${options.customerLabel}`,
        `Pesan: ${preview}`,
        '',
        `👉 Buka admin: ${getAdminChatUrl()}`,
        `Session: ${sessionId}`,
    ].join('\n');
    await whatsappService.sendMessage(getAdminWaNumber(), message).catch(() => undefined);
}
export async function getSessionCustomerLabel(sessionId) {
    const session = await prisma.chatSession.findUnique({
        where: { id: sessionId },
        include: { user: { select: { name: true, email: true } } },
    });
    if (!session)
        return 'Customer';
    if (session.user?.name)
        return session.user.name;
    if (session.guestName)
        return session.guestName;
    if (session.guestEmail)
        return session.guestEmail;
    return 'Guest';
}
//# sourceMappingURL=chat-notify.service.js.map