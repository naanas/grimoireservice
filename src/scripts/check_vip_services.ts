
import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const VIP_APIID = process.env.VIP_APIID || '';
const VIP_APIKEY = process.env.VIP_APIKEY || '';
const VIP_URL = process.env.VIP_URL || 'https://vip-reseller.co.id/api/game-feature';

const createSignature = () => {
    return crypto.createHash('md5').update(VIP_APIID + VIP_APIKEY).digest('hex');
};

(async () => {
    console.log('--- CHECKING VIP SERVICES ---');
    console.log(`URL: ${VIP_URL}`);

    try {
        const payload = new URLSearchParams();
        payload.append('key', VIP_APIKEY);
        payload.append('sign', createSignature());
        payload.append('type', 'services');
        payload.append('filter_status', 'available');

        // We DO NOT filter by game here, to see ALL available games

        const response = await axios.post(VIP_URL, payload);
        const resData = response.data;

        if (resData.result) {
            console.log(`✅ Success! Found ${resData.data.length} services.`);

            // Group by Game to see unique game names
            const games = new Set();
            resData.data.forEach((item: any) => {
                games.add(item.game);
            });

            console.log('\n--- AVAILABLE GAMES (Exact Names from Provider) ---');
            const sortedGames = Array.from(games).sort();
            sortedGames.forEach(g => console.log(`- '${g}'`));

        } else {
            console.error('❌ Failed:', resData.message);
        }

    } catch (error: any) {
        console.error('❌ Request Error:', error.message);
        if (error.response) console.error('Data:', error.response.data);
    }
})();
