import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const VIP_APIID = process.env.VIP_APIID || '';
const VIP_APIKEY = process.env.VIP_APIKEY || '';
const VIP_URL = process.env.VIP_URL || 'https://vip-reseller.co.id/api/game-feature';
const createSignature = () => {
    return crypto.createHash('md5').update(VIP_APIID + VIP_APIKEY).digest('hex');
};
const checkGame = async (gameCode) => {
    try {
        const payload = new URLSearchParams();
        payload.append('key', VIP_APIKEY);
        payload.append('sign', createSignature());
        payload.append('type', 'services');
        payload.append('filter_game', gameCode); // Testing Code
        payload.append('filter_status', 'available');
        const response = await axios.post(VIP_URL, payload);
        const resData = response.data;
        if (resData.result) {
            console.log(`[SUCCESS] '${gameCode}' -> Found ${resData.data.length} items`);
            return true;
        }
        else {
            console.log(`[FAILED]  '${gameCode}' -> ${resData.message}`);
            return false;
        }
    }
    catch (error) {
        console.error(`[ERROR]   '${gameCode}' -> ${error.message}`);
        return false;
    }
};
(async () => {
    console.log('--- PROBING VIP GAME CODES ---');
    const candidates = [
        'Mobile Legends',
        'mobile-legends',
        'mobile_legends',
        'Mobile Legends Bang Bang',
        'Free Fire',
        'free-fire',
        'free_fire',
        'Genshin Impact',
        'genshin-impact',
        'genshin_impact'
    ];
    for (const code of candidates) {
        await checkGame(code);
    }
})();
//# sourceMappingURL=probe_vip_game.js.map