import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { logger } from '../lib/logger.js';
import crypto from 'crypto';
import { sendVerificationEmail } from '../services/email.service.js';
if (!process.env.JWT_SECRET) {
    throw new Error("Fatal Error: JWT_SECRET is not defined in environment variables.");
}
const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const client = new OAuth2Client(GOOGLE_CLIENT_ID);
// POST /api/auth/register
export const register = async (req, res) => {
    try {
        const { name, email, password, phoneNumber } = req.body;
        // 1. Validation
        if (!name || !email || !password || !phoneNumber) {
            return res.status(400).json({ success: false, message: "All fields are required (including WhatsApp Number)" });
        }
        // Validate Phone Format (Basic)
        if (!phoneNumber.startsWith('08') && !phoneNumber.startsWith('62')) {
            return res.status(400).json({ success: false, message: "Invalid Phone Number format (Use 08xx or 62xx)" });
        }
        // 2. Check if user exists (Email OR Phone)
        // 2. Check if user exists (Email OR Phone)
        let user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    { phoneNumber }
                ]
            }
        });
        // 3. Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(32).toString('hex');
        if (user) {
            if (user.isVerified) {
                return res.status(400).json({ success: false, message: "Email or Phone Number already registered" });
            }
            // Handle Unverified Re-registration (Overwrite)
            logger.info(`♻️ [REGISTER] Overwriting unverified user: ${user.email}`);
            user = await prisma.user.update({
                where: { id: user.id },
                data: {
                    name,
                    email,
                    phoneNumber,
                    password: hashedPassword,
                    verificationToken
                }
            });
        }
        else {
            // 5. Create User
            user = await prisma.user.create({
                data: {
                    name,
                    email,
                    phoneNumber,
                    password: hashedPassword,
                    role: 'USER',
                    isVerified: false,
                    verificationToken
                }
            });
        }
        // 6. Send Verification Email
        // We wait for it to ensure email is valid. If it fails, we might want to warn user.
        const emailSent = await sendVerificationEmail(email, verificationToken, name);
        if (!emailSent) {
            logger.warn(`⚠️ [REGISTER] Failed to send verification email to ${email}`);
            // Optional: Return warning, but user is created.
        }
        // 7. Generate Token (Login immediately? Or force verify first?)
        // Usually, we force verify. So NO token returned, or token with restricted scope?
        // Let's return success message asking to verify.
        res.status(201).json({
            success: true,
            message: "Registration successful! Please check your email to verify your account.",
            data: {
                user: { id: user.id, name: user.name, email: user.email, phoneNumber: user.phoneNumber },
                // token: jwtToken // Do not auto-login if verification required
            }
        });
    }
    catch (error) {
        logger.error(`Register Error: ${error}`);
        res.status(500).json({ success: false, message: "Registration failed" });
    }
};
// GET /api/auth/verify-email
export const verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;
        if (!token || typeof token !== 'string') {
            return res.status(400).json({ success: false, message: "Invalid token" });
        }
        const user = await prisma.user.findFirst({
            where: { verificationToken: token }
        });
        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid or expired verification link." });
        }
        // Update User
        await prisma.user.update({
            where: { id: user.id },
            data: {
                isVerified: true,
                verificationToken: null // Clear token to prevent reuse
            }
        });
        logger.info(`✅ [VERIFY] User verified: ${user.email}`);
        // Redirect to Frontend Login
        return res.redirect(`${FRONTEND_URL}/login?verified=true`);
    }
    catch (error) {
        logger.error(`Verify Email Error: ${error}`);
        res.status(500).json({ success: false, message: "Verification failed" });
    }
};
// POST /api/auth/login
export const login = async (req, res) => {
    try {
        const { email, password, recaptchaToken } = req.body;
        if (!email || !password)
            return res.status(400).json({ success: false, message: "Email and password required" });
        if (!recaptchaToken)
            return res.status(400).json({ success: false, message: "reCAPTCHA token missing. Please verify you are not a robot." });
        // Verify reCAPTCHA token with Google
        const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
        if (recaptchaSecret) {
            try {
                const recaptchaRes = await fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecret}&response=${recaptchaToken}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                });
                const recaptchaData = await recaptchaRes.json();
                if (!recaptchaData.success) {
                    logger.warn(`🤖 [LOGIN] reCAPTCHA failed for ${email}`);
                    return res.status(400).json({ success: false, message: "reCAPTCHA verification failed. Please try again." });
                }
            }
            catch (err) {
                logger.error(`reCAPTCHA Verification Error: ${err}`);
                return res.status(500).json({ success: false, message: "Unable to verify reCAPTCHA." });
            }
        }
        else {
            logger.warn("⚠️ RECAPTCHA_SECRET_KEY is not configured in .env. Skipping reCAPTCHA verification.");
        }
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.password) {
            logger.warn(`❌ [LOGIN] User not found or no password for: ${email}`);
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }
        // Check Verification
        if (!user.isVerified) {
            return res.status(401).json({ success: false, message: "Please verify your email first." });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            logger.warn(`❌ [LOGIN] Password mismatch for: ${email}`);
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }
        logger.info(`✅ [LOGIN] Success for: ${email}`);
        const token = jwt.sign({ id: user.id, role: user.role, phoneNumber: user.phoneNumber }, JWT_SECRET, { expiresIn: '7d' });
        res.json({
            success: true,
            message: "Login successful",
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    balance: user.balance,
                    phoneNumber: user.phoneNumber,
                    hasPassword: !!user.password
                },
                token
            }
        });
    }
    catch (error) {
        logger.error(`Login Error: ${error}`);
        res.status(500).json({ success: false, message: "Login failed" });
    }
};
// GET /api/auth/profile
export const getProfile = async (req, res) => {
    try {
        // User is attached by middleware
        const authReq = req;
        const decoded = authReq.user;
        if (!decoded || !decoded.id)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        const user = await prisma.user.findUnique({ where: { id: decoded.id } });
        if (!user)
            return res.status(404).json({ success: false, message: "User not found" });
        res.json({
            success: true,
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                balance: user.balance,
                phoneNumber: user.phoneNumber,
                hasPassword: !!user.password
            }
        });
    }
    catch (error) {
        logger.error(`Auth Error: ${error}`);
        res.status(401).json({ success: false, message: "Unauthorized" });
    }
};
// POST /api/auth/google
export const googleLogin = async (req, res) => {
    try {
        const { token, mode } = req.body;
        if (!token)
            return res.status(400).json({ success: false, message: "Google token is required" });
        if (!GOOGLE_CLIENT_ID) {
            logger.error("GOOGLE_CLIENT_ID is not set in environment variables");
            return res.status(500).json({ success: false, message: "Server configuration error" });
        }
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            return res.status(400).json({ success: false, message: "Invalid Google Token" });
        }
        const { email, name } = payload;
        // Check if user exists
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            if (mode === 'login') {
                return res.status(404).json({ success: false, message: "Google Account not registered. Please sign up first." });
            }
            // Create new user (Google Auth is auto-verified)
            user = await prisma.user.create({
                data: {
                    email,
                    name: name || "Google User",
                    password: null, // No password for OAuth users
                    role: 'USER',
                    isVerified: true // Google Users are verified
                }
            });
        }
        else {
            // If user exists but not verified (e.g. tried registering manually but didn't verify), verify them now since they used Google?
            if (!user.isVerified) {
                await prisma.user.update({ where: { id: user.id }, data: { isVerified: true } });
            }
        }
        // Generate Token
        const jwtToken = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({
            success: true,
            message: "Google Login successful",
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    balance: user.balance,
                    phoneNumber: user.phoneNumber,
                    hasPassword: !!user.password
                },
                token: jwtToken
            }
        });
    }
    catch (error) {
        logger.error(`Google Login Error: ${error}`);
        res.status(500).json({ success: false, message: "Google Login failed" });
    }
};
// POST /api/auth/complete-profile
export const completeProfile = async (req, res) => {
    try {
        const authReq = req;
        const userId = authReq.user?.id;
        const { phoneNumber, password } = req.body;
        if (!userId)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        if (!phoneNumber || !password) {
            return res.status(400).json({ success: false, message: "Phone number and password are required" });
        }
        // Validate Phone Format (Basic)
        if (!phoneNumber.startsWith('08') && !phoneNumber.startsWith('62')) {
            return res.status(400).json({ success: false, message: "Invalid Phone Number format (Use 08xx or 62xx)" });
        }
        // Check if phone number is already used by another user
        const existingPhone = await prisma.user.findFirst({
            where: {
                phoneNumber,
                NOT: { id: userId }
            }
        });
        if (existingPhone) {
            return res.status(400).json({ success: false, message: "Phone number already in use" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                phoneNumber,
                password: hashedPassword
            }
        });
        logger.info(`✅ [PROFILE] User ${userId} completed profile.`);
        res.json({
            success: true,
            message: "Profile completed successfully",
            data: {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                balance: updatedUser.balance,
                phoneNumber: updatedUser.phoneNumber,
                hasPassword: !!updatedUser.password
            }
        });
    }
    catch (error) {
        logger.error(`Complete Profile Error: ${error}`);
        res.status(500).json({ success: false, message: "Failed to complete profile" });
    }
};
//# sourceMappingURL=auth.controller.js.map