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

    const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || '';

    try {
        console.log(`📨 [WA Service] Forwarding request to Java Microservice (8081) for ${target}...`);

        const response = await axios.post(NOTIFICATION_SERVICE_URL, {
            target: target,
            message: message
        });

        console.log(`✅ [WA Service] Success! Response from Java:`, response.data);
        return { success: true, data: response.data };

    } catch (error: any) {
        console.error(`❌ [WA Service] Failed to connect to Java Service: ${error.message}`);
        console.warn(`⚠️  Make sure 'notification-service' is running on port 8081!`);
        return { success: false, message: error.message };
    }
};
