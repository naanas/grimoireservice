import { prisma } from '../lib/prisma.js';
import * as gameProvider from './game.service.js';
import * as whatsappService from './whatsapp.service.js';
import { emitTransactionUpdate } from '../lib/socket.js';
const SYNC_COOLDOWN_MS = 4000;
const lastProviderSync = new Map();
function mapProviderStatusToAppStatus(providerStatus, current) {
    const pStatus = String(providerStatus).toLowerCase();
    if (pStatus === 'success' || pStatus === 'sukses' || pStatus === 'berhasil') {
        return 'SUCCESS';
    }
    if (pStatus === 'error' || pStatus === 'failed' || pStatus === 'gagal') {
        return 'FAILED';
    }
    return current;
}
/**
 * Poll VIP/provider for in-flight topups and persist status changes.
 * Safe to call from GET /check — only hits provider status API (not order).
 */
export async function syncProviderStatusIfNeeded(trx) {
    if (!trx?.id || trx.status !== 'PROCESSING' || !trx.providerTrxId) {
        return trx;
    }
    const isDeposit = trx.type === 'DEPOSIT' || trx.invoice?.startsWith('DEP-');
    if (isDeposit)
        return trx;
    const now = Date.now();
    const last = lastProviderSync.get(trx.id) ?? 0;
    if (now - last < SYNC_COOLDOWN_MS) {
        return trx;
    }
    lastProviderSync.set(trx.id, now);
    const previousStatus = trx.status;
    try {
        const result = await gameProvider.checkTransaction(trx.invoice, trx.providerTrxId);
        if (!result.success || !result.data) {
            return trx;
        }
        const providerStatus = String(result.data.status || '');
        const newStatus = mapProviderStatusToAppStatus(providerStatus, trx.status);
        const sn = result.data.sn || trx.sn || null;
        if (newStatus === trx.status && providerStatus === (trx.providerStatus || '') && sn === (trx.sn || null)) {
            return trx;
        }
        const updated = await prisma.transaction.update({
            where: { id: trx.id },
            data: {
                status: newStatus,
                providerStatus,
                sn,
                updatedAt: new Date(),
            },
            include: { product: true },
        });
        emitTransactionUpdate(trx.id, newStatus);
        if (newStatus === 'SUCCESS' && previousStatus !== 'SUCCESS') {
            let targetWa = trx.guestContact;
            if (!targetWa && trx.userId) {
                const u = await prisma.user.findUnique({ where: { id: trx.userId } });
                if (u?.phoneNumber)
                    targetWa = u.phoneNumber;
            }
            if (targetWa) {
                const productName = updated.product?.name || trx.product?.name || 'Item';
                const targetId = updated.targetId || trx.targetId || '-';
                const waMsg = `🌟 *GRIMOIRE COINS STORE* 🌟\n---------------------------\n✅ *TOPUP SUKSES*\nInvoice: *${updated.invoice}*\nGame: ${productName}\nUser ID: ${targetId}\n\n🔑 *SN / KODE:*\n${sn || '-'}\n---------------------------\nTerima kasih sudah berbelanja di Grimoire Coins!`;
                whatsappService.sendMessage(targetWa, waMsg).catch(console.error);
            }
        }
        return updated;
    }
    catch (err) {
        console.error(`[SYNC-PROVIDER] Failed for ${trx.id}:`, err.message);
        return trx;
    }
}
//# sourceMappingURL=transaction-sync.service.js.map