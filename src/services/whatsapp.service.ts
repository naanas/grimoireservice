import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const FONNTE_TOKEN = process.env.FONNTE_TOKEN;

/**
 * Send WhatsApp Message using Fonnte
 * @param target Target format: '08123...' or '628123...'
 * @param message Message content
 */
export const sendMessage = async (target: string, message: string) => {
    // Basic validation
    if (!target || target.length < 5) return { success: false };

    if (!FONNTE_TOKEN) {
        console.warn(`⚠️  [WA Service] FONNTE_TOKEN is missing. Notification skipped for ${target}.`);
        return { success: false, message: 'Fonnte Token missing' };
    }

    try {
        console.log(`📨 [WA Service] Sending message directly to Fonnte API for ${target}...`);

        const response = await axios.post('https://api.fonnte.com/send', {
            target: target,
            message: message,
            delay: '2', // Optional delay string like '2'
            countryCode: '62' // Adjust as needed
        }, {
            headers: {
                'Authorization': FONNTE_TOKEN,
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 second timeout for external API
        });

        if (response.data.status) {
            console.log(`✅ [WA Service] Success! Fonnte accepted message for ${target}.`);
            return { success: true, data: response.data };
        } else {
            console.warn(`⚠️ [WA Service] Fonnte declined:`, response.data.reason);
            return { success: false, message: response.data.reason };
        }

    } catch (error: any) {
        console.error(`❌ [WA Service] Failed to connect to Fonnte API: ${error.message}`);
        return { success: false, message: error.message };
    }
};
