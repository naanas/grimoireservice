import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-this';
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
    }
    catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({ success: false, message: "Registration failed" });
    }
};
// POST /api/auth/login
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ success: false, message: "Email and password required" });
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
    }
    catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ success: false, message: "Login failed" });
    }
};
// GET /api/auth/profile
// GET /api/auth/profile
export const getProfile = async (req, res) => {
    try {
        // User is attached by middleware
        const decoded = req.user;
        if (!decoded || !decoded.id)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        const user = await prisma.user.findUnique({ where: { id: decoded.id } });
        if (!user)
            return res.status(404).json({ success: false, message: "User not found" });
        res.json({
            success: true,
            data: { id: user.id, name: user.name, email: user.email, role: user.role, balance: user.balance, phoneNumber: user.phoneNumber }
        });
    }
    catch (error) {
        console.error("Auth Error:", error);
        res.status(401).json({ success: false, message: "Unauthorized" });
    }
};
//# sourceMappingURL=auth.controller.js.map