import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
if (!process.env.JWT_SECRET) {
    throw new Error("Fatal Error: JWT_SECRET is not defined in environment variables.");
}
const JWT_SECRET = process.env.JWT_SECRET;

// POST /api/auth/register
export const register = async (req: Request, res: Response) => {
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
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    { phoneNumber }
                ]
            }
        });

        if (existingUser) {
            return res.status(400).json({ success: false, message: "Email or Phone Number already registered" });
        }

        // 3. Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 4. Create User
        const user = await prisma.user.create({
            data: {
                name,
                email,
                phoneNumber,
                password: hashedPassword,
                role: 'USER'
            }
        });

        // 5. Generate Token
        const token = jwt.sign({ id: user.id, role: user.role, phoneNumber: user.phoneNumber }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: {
                user: { id: user.id, name: user.name, email: user.email, phoneNumber: user.phoneNumber },
                token
            }
        });

    } catch (error: any) {
        console.error("Register Error:", error);
        res.status(500).json({ success: false, message: "Registration failed" });
    }
};

// POST /api/auth/login
export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) return res.status(400).json({ success: false, message: "Email and password required" });

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.password) {
            console.log(`❌ [LOGIN] User not found or no password for: ${email}`);
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log(`❌ [LOGIN] Password mismatch for: ${email}`);
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        console.log(`✅ [LOGIN] Success for: ${email}`);

        const token = jwt.sign({ id: user.id, role: user.role, phoneNumber: user.phoneNumber }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            success: true,
            message: "Login successful",
            data: {
                user: { id: user.id, name: user.name, email: user.email, role: user.role, balance: user.balance, phoneNumber: user.phoneNumber },
                token
            }
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ success: false, message: "Login failed" });
    }
};

// GET /api/auth/profile
// GET /api/auth/profile
export const getProfile = async (req: Request, res: Response) => {
    try {
        // User is attached by middleware
        const decoded = (req as any).user;
        if (!decoded || !decoded.id) return res.status(401).json({ success: false, message: "Unauthorized" });

        const user = await prisma.user.findUnique({ where: { id: decoded.id } });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        res.json({
            success: true,
            data: { id: user.id, name: user.name, email: user.email, role: user.role, balance: user.balance, phoneNumber: user.phoneNumber }
        });
    } catch (error) {
        console.error("Auth Error:", error);
        res.status(401).json({ success: false, message: "Unauthorized" });
    }
};

// POST /api/auth/google
import { OAuth2Client } from 'google-auth-library';
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleLogin = async (req: Request, res: Response) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ success: false, message: "Google token is required" });

        const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
        if (!GOOGLE_CLIENT_ID) {
            console.error("GOOGLE_CLIENT_ID is not set in environment variables");
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
            // Create new user
            // Note: Password is required in schema but nullable? No, schema says `password String?` so it is nullable.
            // However, we might need a phone number. Google doesn't always provide it. 
            // We'll set a placeholder or make it optional in schema?
            // Checking schema: phoneNumber String? @unique. It is nullable.

            user = await prisma.user.create({
                data: {
                    email,
                    name: name || "Google User",
                    password: null, // No password for OAuth users
                    role: 'USER',
                    // We don't have phone number from Google usually, so we leave it null.
                }
            });
        }

        // Generate Token
        const jwtToken = jwt.sign(
            { id: user.id, role: user.role, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: "Google Login successful",
            data: {
                user: { id: user.id, name: user.name, email: user.email, role: user.role, balance: user.balance, phoneNumber: user.phoneNumber },
                token: jwtToken
            }
        });

    } catch (error) {
        console.error("Google Login Error:", error);
        res.status(500).json({ success: false, message: "Google Login failed" });
    }
};
