import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
// Load .env from backend root
dotenv.config({ path: path.join(__dirname, '../../.env') });
async function verifySmtp() {
    console.log("--- SMTP DIAGNOSTIC ---");
    console.log(`HOST: ${process.env.SMTP_HOST}`);
    console.log(`USER: ${process.env.SMTP_USER}`);
    if (!process.env.SMTP_PASS) {
        console.error("❌ ERROR: SMTP_PASS is missing.");
        return;
    }
    const configs = [
        { port: 465, secure: true, name: "SSL (Port 465)" },
        { port: 587, secure: false, name: "TLS (Port 587)" }
    ];
    for (const config of configs) {
        console.log(`\nTesting ${config.name}...`);
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: config.port,
            secure: config.secure,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            tls: {
                rejectUnauthorized: false // Sometimes helps with self-signed certs
            }
        });
        try {
            await transporter.verify();
            console.log(`✅ ${config.name}: CONNECTION SUCCESSFUL!`);
            console.log(`Attempting to send email via ${config.name}...`);
            await transporter.sendMail({
                from: `"${process.env.APP_NAME || 'Test'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
                to: process.env.SMTP_USER,
                subject: `Test Email via ${config.name}`,
                html: '<p>SMTP is working!</p>'
            });
            console.log(`✅ ${config.name}: EMAIL SENT!`);
            return; // Stop if success
        }
        catch (error) {
            console.error(`❌ ${config.name}: FAILED.`);
            console.error(`Error: ${error.message}`);
            if (error.response)
                console.error(`Response: ${error.response}`);
        }
    }
    console.log("\n❌ All attempts failed. Please check credentials or firewall.");
}
verifySmtp();
//# sourceMappingURL=test-email.js.map