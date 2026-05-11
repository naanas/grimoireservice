import nodemailer from 'nodemailer';
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
export const sendVerificationEmail = async (email, token) => {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
    const mailOptions = {
        from: `"Grimoire Topup" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Verify Your Grimoire ID',
        html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #8b0000; text-align: center;">Welcome to the Coven</h2>
                <p>Greetings,</p>
                <p>You have taken the first step to join the Grimoire. To complete your registration and seal your identity, please verify your email address.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationUrl}" style="background-color: #8b0000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email</a>
                </div>
                <p>If you did not request this, please ignore this email. The abyss remains closed to the unworthy.</p>
                <br>
                <p style="font-size: 12px; color: #777; text-align: center;">Grimoire Topup Game</p>
            </div>
        `,
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log(`Verification email sent to ${email}`);
        return true;
    }
    catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};
//# sourceMappingURL=email.js.map