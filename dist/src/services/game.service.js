import * as apigames from './apigames.service.js';
import * as vip from './vip.service.js';
import dotenv from 'dotenv';
dotenv.config();
export const PROVIDER = process.env.GAME_PROVIDER || '';
console.log(`🎮 [GAME SERVICE] Selected Provider: ${PROVIDER}`);
export const checkProfile = async (gameCode, userId, zoneId) => {
    if (PROVIDER === 'VIP') {
        return await vip.checkProfile(gameCode, userId, zoneId);
    }
    else {
        return await apigames.checkProfile(gameCode, userId, zoneId);
    }
};
export const getMerchantServices = async (filterGame) => {
    // Apigames doesnt support filter in arguments usually, but we can pass it
    // Adapter logic to normalize might be needed here if formats differ drastically
    if (PROVIDER === 'VIP') {
        return await vip.getMerchantServices(filterGame);
    }
    else {
        return await apigames.getMerchantServices();
    }
};
export const placeOrder = async (refId, sku, dest, zoneId) => {
    if (PROVIDER === 'VIP') {
        return await vip.placeOrder(refId, sku, dest, zoneId);
    }
    else {
        return await apigames.placeOrder(refId, sku, dest, zoneId);
    }
};
export const checkTransaction = async (refId, providerId) => {
    // Apigames uses RefID (our invoice)
    // VIP uses Provider ID (trxid)
    if (PROVIDER === 'VIP') {
        if (!providerId)
            return { success: false, message: 'VIP requires Provider ID for status check' };
        return await vip.checkTransaction(providerId);
    }
    else {
        return await apigames.checkTransaction(refId);
    }
};
//# sourceMappingURL=game.service.js.map