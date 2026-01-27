import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
const app = express();
const PORT = process.env.PORT || 4000;
import transactionRoutes from './routes/transaction.route.js';
import authRoutes from './routes/auth.route.js';
import contentRoutes from './routes/content.route.js';
import voucherRoutes from './routes/voucher.route.js';
import adminRoutes from './routes/admin.route.js';
// Security Middlewares
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || '*', // Restrict in production
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);
app.use(express.json());
// Ipaymu Callback uses x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));
// Request Logger (Secure)
app.use((req, res, next) => {
    // Skip logging for health checks to reduce noise
    if (req.url === '/api/health')
        return next();
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    if (req.body && Object.keys(req.body).length > 0) {
        // Create a shallow copy to avoid mutating the original body
        const safeBody = { ...req.body };
        // Deep Mask sensitive fields function
        const maskSensitive = (obj) => {
            const sensitiveFields = ['password', 'token', 'secret', 'pin', 'cvv', 'creditCard'];
            for (const key in obj) {
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    maskSensitive(obj[key]);
                }
                else if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
                    obj[key] = '***MASKED***';
                }
            }
        };
        maskSensitive(safeBody);
        console.log('📦 Body:', JSON.stringify(safeBody, null, 2));
    }
    next();
});
app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/voucher', voucherRoutes);
app.use('/api', transactionRoutes);
app.use('/api/admin', adminRoutes);
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
    }
    catch (error) {
        console.error('❌ Database Connection: FAILED');
        console.error('⚠️  System running in Limited Mode (Mock Data only for Products)');
    }
    // 2. Check Payment Gateway Config
    // 2. Check Configurations
    const isMock = process.env.MOCK_MODE === 'true';
    if (isMock) {
        console.log('✅ Game Provider: MOCK MODE (Safe for Dev)');
    }
    else {
        console.log('⚠️  Game Provider: REAL API (Careful!)');
    }
    // Check Payment Gateway Config (Dynamic)
    const paymentEnv = process.env.PAYMENT_ENV === 'PRODUCTION' ? 'PROD' : 'DEV';
    const activeKey = process.env[`IPAYMU_API_KEY_${paymentEnv}`];
    if (activeKey) {
        console.log(`✅ Payment Gateway: CONNECTED (Ipaymu ${paymentEnv} Environment)`);
    }
    else {
        console.warn(`❌ Payment Gateway: MISSING API KEY for ${paymentEnv} environment! Check .env`);
    }
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT} (Updated)`);
    });
};
startServer();
//# sourceMappingURL=index.js.map