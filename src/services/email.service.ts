import { Resend } from 'resend';
import { logger } from '../lib/logger.js';
import dotenv from 'dotenv';
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendVerificationEmail = async (to: string, token: string, name: string) => {
    try {
        const verificationUrl = `${process.env.BACKEND_URL || 'http://localhost:4000'}/api/auth/verify-email?token=${token}`;

        logger.info(`📧 [EMAIL] Sending verification email to ${to} via Resend`);

        // Use 'onboarding@resend.dev' if domain is not yet verified for testing
        // Once verified, use 'support@grimoirecoins.store' or consistent sender
        const fromAddress = process.env.SMTP_FROM || 'Grimoire Coins <support@grimoirecoins.store>';

        const { data, error } = await resend.emails.send({
            from: fromAddress,
            to: [to],
            subject: 'Verifikasi Email Anda - Grimoire Coins',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #b91c1c;">Selamat Datang di Grimoire Coins! 🩸</h2>
                    <p>Halo <strong>${name}</strong>,</p>
                    <p>Terima kasih telah mendaftar. Silakan verifikasi email Anda untuk mengaktifkan akun dan mulai bertransaksi.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationUrl}" style="background-color: #b91c1c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verifikasi Email Saya</a>
                    </div>

                    <p style="font-size: 12px; color: #666;">Atau salin link ini ke browser Anda:</p>
                    <p style="font-size: 12px; color: #666; word-break: break-all;">${verificationUrl}</p>
                    
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #999;">Jika Anda tidak merasa mendaftar, abaikan email ini.</p>
                </div>
            `,
        });

        if (error) {
            logger.error(`❌ [EMAIL] Resend Error: ${error.message}`);
            return false;
        }

        logger.info(`✅ [EMAIL] Sent via Resend ID: ${data?.id}`);
        return true;
    } catch (error: any) {
        logger.error(`❌ [EMAIL] Unexpected Error: ${error.message}`);
        return false;
    }
};
