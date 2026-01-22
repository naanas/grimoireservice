import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

import transactionRoutes from './routes/transaction.route.js';
import authRoutes from './routes/auth.route.js';

import contentRoutes from './routes/content.route.js';
import voucherRoutes from './routes/voucher.route.js';

app.use(cors());
app.use(express.json());
// Ipaymu Callback uses x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

// Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

    if (req.body && Object.keys(req.body).length > 0) {
        // Create a shallow copy to avoid mutating the original body
        const safeBody = { ...req.body };

        // Mask sensitive fields
        const sensitiveFields = ['password', 'token', 'secret', 'pin', 'cvv'];
        sensitiveFields.forEach(field => {
            if (safeBody[field]) safeBody[field] = '***MASKED***';
        });

        console.log('📦 Body:', JSON.stringify(safeBody, null, 2));
    }
    next();
});

app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/voucher', voucherRoutes);
app.use('/api', transactionRoutes);

app.get('/', (req, res) => {
    res.send('Grimoire Coins Backend is Running! 🩸');
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const startServer = async () => {
    try {
        // 1. Check Database Connection
        console.log('🔄 Connecting to Database...');
        await prisma.$connect();
        console.log('✅ Database Connection: SUCCESS');
    } catch (error) {
        console.error('❌ Database Connection: FAILED');
        console.error('⚠️  System running in Limited Mode (Mock Data only for Products)');
    }

    // 2. Check Payment Gateway Config
    // 2. Check Configurations
    const isMock = process.env.MOCK_MODE === 'true';
    if (isMock) {
        console.log('✅ Game Provider: MOCK MODE (Safe for Dev)');
    } else {
        console.log('⚠️  Game Provider: REAL API (Careful!)');
    }

    if (process.env.IPAYMU_API_KEY) {
        console.log('✅ Payment Gateway: CONNECTED (Ipaymu Production/Sandbox)');
    } else {
        console.warn('❌ Payment Gateway: MISSING API KEY');
    }

    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT} (Updated)`);
    });
};

startServer();
