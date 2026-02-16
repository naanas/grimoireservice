import nodemailer from 'nodemailer';
import { logger } from '../lib/logger.js';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    // Timeouts to prevent hanging
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 5000,    // 5 seconds
    socketTimeout: 10000,     // 10 seconds
});

export const sendVerificationEmail = async (to: string, token: string, name: string) => {
    try {
        const verificationUrl = `${process.env.BACKEND_URL || 'http://localhost:4000'}/api/auth/verify-email?token=${token}`;

        logger.info(`📧 [EMAIL] Sending verification email to ${to}`);

        const info = await transporter.sendMail({
            from: `"${process.env.APP_NAME || 'Grimoire Coins'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to,
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

        logger.info(`✅ [EMAIL] Sent: ${info.messageId}`);
        return true;
    } catch (error: any) {
        logger.error(`❌ [EMAIL] Failed to send: ${error.message}`);
        return false;
    }
};
