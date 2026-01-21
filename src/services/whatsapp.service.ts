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
    if (!FONNTE_TOKEN) {
        console.warn('⚠️  [WA] No FONNTE_TOKEN set. Skipping WhatsApp notification.');
        return { success: false, message: 'No Token' };
    }

    // Basic formatter: Fonnte prefers 08xx or 628xx.
    // If user inputs 08, convert to 628 for consistency, though Fonnte supports both usually.
    // Let's keep it as is or robustify. Fonnte docs say: "target: 08123456789 or 628123456789"
    // So we just pass it.

    // If target is empty or invalid
    if (!target || target.length < 5) return { success: false };

    try {
        console.log(`📨 [WA] Sending to ${target}...`);

        const response = await axios.post(
            'https://api.fonnte.com/send',
            {
                target: target,
                message: message,
            },
            {
                headers: {
                    Authorization: FONNTE_TOKEN,
                },
            }
        );

        console.log(`✅ [WA] Sent! Status: ${response.data?.status}`);
        return { success: true, data: response.data };

    } catch (error: any) {
        console.error(`❌ [WA] Failed: ${error.response?.data?.reason || error.message}`);
        return { success: false, message: error.message };
    }
};
