import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
dotenv.config();
import helmet from 'helmet';
const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 4000;
const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || '*',
        methods: ['GET', 'POST', 'PATCH', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }
});
app.set('io', io);
import transactionRoutes from './routes/transaction.route.js';
import authRoutes from './routes/auth.route.js';
import contentRoutes from './routes/content.route.js';
import voucherRoutes from './routes/voucher.route.js';
import adminRoutes from './routes/admin.route.js';
import chatRoutes from './routes/chat.route.js';
import { PROVIDER } from './services/game.service.js';
import { ChatService } from './services/chat.service.js';
// Security Middlewares
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || '*', // Restrict in production
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
// app.use(limiter); // Limit removed by request
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
// Socket.IO Logic
// Track connected admins and users
const adminSockets = new Set();
const userSessions = new Map(); // socketId -> sessionId
io.on('connection', (socket) => {
    console.log(`🔌 Socket Connected: ${socket.id}`);
    // User/Guest joins their specific session
    socket.on('join_session', (sessionId) => {
        if (!sessionId)
            return;
        socket.join(sessionId);
        userSessions.set(socket.id, sessionId);
        console.log(`👤 User joined session: ${sessionId}`);
        // Notify Admin: User is Online
        io.to('admin_room').emit('user_status', { sessionId, online: true });
        // Notify User: Admin Online Status
        socket.emit('admin_status', { online: adminSockets.size > 0 });
    });
    // Admin joins the admin room to listen for all chats
    socket.on('join_admin', (token) => {
        try {
            if (!process.env.JWT_SECRET)
                return;
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded && decoded.role === 'ADMIN') {
                socket.join('admin_room');
                adminSockets.add(socket.id);
                console.log(`🛡️ Admin ${decoded.email} joined admin channel`);
                // Notify All Users: Admin is Online
                // We broadcast to all rooms (or just keep it simple)
                // Since users are in rooms named by sessionId, we can try to broadcast to all? 
                // Easier: just emit to everyone. Though 'join_session' handles initial check.
                io.emit('admin_status', { online: true });
            }
        }
        catch (error) {
            console.log('⚠️ Admin join failed: Invalid token');
        }
    });
    // Handle Sending Messages
    socket.on('send_message', async (data) => {
        try {
            const { sessionId, content, sender, token } = data; // sender: 'USER' | 'ADMIN'
            if (!sessionId || !content)
                return;
            // Optional: Verify sender if needed
            if (sender === 'ADMIN') {
                if (!triggerAdminVerification(token)) {
                    socket.emit('error', 'Unauthorized Admin');
                    return;
                }
            }
            // Save to DB
            const savedMessage = await ChatService.addMessage(sessionId, sender, content);
            // Broadcast to the specific session (updates User UI and Admin UI showing that chat)
            io.to(sessionId).emit('receive_message', savedMessage);
            // If User sent it, notify Admin Room (so they see a notification or list update)
            if (sender === 'USER') {
                io.to('admin_room').emit('admin_notification', {
                    type: 'NEW_MESSAGE',
                    sessionId,
                    message: savedMessage
                });
            }
        }
        catch (error) {
            console.error('Message Error:', error);
        }
    });
    // Typing Indicators
    socket.on('typing', ({ sessionId, isTyping }) => {
        // Broadcast to the session room (User <-> Admin)
        // User is in 'sessionId', Admin joins 'sessionId' when focused or listens via other means?
        // In my plan, Admin joins specific session room when selected.
        socket.to(sessionId).emit('typing_status', { sessionId, isTyping });
    });
    socket.on('disconnect', () => {
        console.log(`❌ Socket Disconnected: ${socket.id}`);
        if (adminSockets.has(socket.id)) {
            adminSockets.delete(socket.id);
            if (adminSockets.size === 0) {
                // Last admin left
                io.emit('admin_status', { online: false });
            }
        }
        if (userSessions.has(socket.id)) {
            const sessionId = userSessions.get(socket.id);
            if (sessionId) {
                io.to('admin_room').emit('user_status', { sessionId, online: false });
            }
            userSessions.delete(socket.id);
        }
    });
});
function triggerAdminVerification(token) {
    try {
        if (!process.env.JWT_SECRET)
            return false;
        jwt.verify(token, process.env.JWT_SECRET);
        return true;
    }
    catch {
        return false;
    }
}
app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/voucher', voucherRoutes);
app.use('/api', transactionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
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
    // 2. Check Configurations
    const isMock = process.env.MOCK_MODE === 'true';
    if (isMock) {
        console.log('✅ Game Provider: MOCK MODE (Safe for Dev)');
    }
    else {
        console.log(`⚠️  Game Provider: ${PROVIDER} (REAL API - Careful!)`);
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
    // Use httpServer instead of app.listen
    httpServer.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT} (with Socket.IO)`);
    });
};
startServer();
//# sourceMappingURL=index.js.map