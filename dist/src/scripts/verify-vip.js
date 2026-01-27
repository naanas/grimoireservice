import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const VIP_APIID = process.env.VIP_APIID || '';
const VIP_APIKEY = process.env.VIP_APIKEY || '';
const VIP_URL = process.env.VIP_URL || 'https://vip-reseller.co.id/api/game-feature';
console.log('--- VIP Config ---');
console.log('URL:', VIP_URL);
console.log('API ID:', VIP_APIID);
console.log('API KEY:', VIP_APIKEY ? '******' + VIP_APIKEY.slice(-5) : 'MISSING');
const createSignature = () => {
    return crypto.createHash('md5').update(VIP_APIID + VIP_APIKEY).digest('hex');
};
const testCheckProfile = async () => {
    console.log('\n--- Testing Check Profile (Mobile Legends) ---');
    try {
        const payload = new URLSearchParams();
        payload.append('key', VIP_APIKEY);
        payload.append('sign', createSignature());
        payload.append('type', 'get-nickname');
        payload.append('code', 'mobilelegend'); // Common code, might be different
        payload.append('target', '12345678'); // Dummy ID
        payload.append('additional_target', '1234'); // Dummy Zone
        console.log('Sending Payload:', payload.toString());
        const response = await axios.post(VIP_URL, payload, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded' // Explicit header
            }
        });
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(response.data, null, 2));
    }
    catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
};
const testServiceList = async () => {
    console.log('\n--- Testing Service List ---');
    try {
        const payload = new URLSearchParams();
        payload.append('key', VIP_APIKEY);
        payload.append('sign', createSignature());
        payload.append('type', 'services');
        payload.append('filter_status', 'available');
        const response = await axios.post(VIP_URL, payload);
        console.log('Status:', response.status);
        console.log('Data (First 2 items):', JSON.stringify(response.data.data?.slice(0, 2), null, 2));
    }
    catch (error) {
        console.error('Error:', error.message);
    }
};
(async () => {
    await testCheckProfile();
    // await testServiceList(); // Optional
})();
//# sourceMappingURL=verify-vip.js.map