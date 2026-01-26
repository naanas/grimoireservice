const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

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
        payload.append('code', 'mobile-legends');
        payload.append('target', '12345678');
        payload.append('additional_target', '1234');

        console.log('Sending Payload:', payload.toString());

        const response = await axios.post(VIP_URL, payload, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
};

(async () => {
    await testCheckProfile();
})();
