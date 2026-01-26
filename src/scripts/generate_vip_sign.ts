
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const VIP_APIID = process.env.VIP_APIID || '';
const VIP_APIKEY = process.env.VIP_APIKEY || '';
const VIP_URL = process.env.VIP_URL || 'https://vip-reseller.co.id/api/game-feature';

console.log('--- VIP RESELLER SIGNATURE GENERATOR ---');
console.log(`API ID: ${VIP_APIID}`);
console.log(`API KEY: ${VIP_APIKEY ? '****' + VIP_APIKEY.slice(-4) : 'NOT FOUND'}`);

if (!VIP_APIID || !VIP_APIKEY) {
    console.error('Error: Missing VIP_APIID or VIP_APIKEY in .env');
    process.exit(1);
}

// Formula: md5(API ID + API KEY)
const sign = crypto.createHash('md5').update(VIP_APIID + VIP_APIKEY).digest('hex');

console.log(`\n✅ SIGNATURE: ${sign}`);

console.log('\n--- CURL TEST EXAMPLE ---');
console.log(`curl -X POST ${VIP_URL} \\`);
console.log(`  -d "key=${VIP_APIKEY}" \\`);
console.log(`  -d "sign=${sign}" \\`);
console.log(`  -d "type=get-nickname" \\`);
console.log(`  -d "code=mobile-legends" \\`);
console.log(`  -d "target=12345678" \\`);
console.log(`  -d "additional_target=1234"`);

console.log('\n--- NODEJS TEST ---');
// Optional: Perform the request
import axios from 'axios';

(async () => {
    try {
        console.log('Sending test request for Mobile Legends (Target: 84837222, Zone: 2169)...');
        const payload = new URLSearchParams();
        payload.append('key', VIP_APIKEY);
        payload.append('sign', sign);
        payload.append('type', 'get-nickname');
        payload.append('code', 'mobile-legends');
        payload.append('target', '84837222'); // Example ID
        payload.append('additional_target', '2169'); // Example Zone

        const res = await axios.post(VIP_URL, payload);
        console.log('Response:', JSON.stringify(res.data, null, 2));
    } catch (err: any) {
        console.error('Request Failed:', err.message);
        if (err.response) {
            console.error('Data:', err.response.data);
        }
    }
})();
