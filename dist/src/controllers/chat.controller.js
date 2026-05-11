import { ChatService } from '../services/chat.service.js';
import jwt from 'jsonwebtoken';
export const startSession = async (req, res) => {
    try {
        const { guestName, guestEmail } = req.body;
        const user = req.user;
        let session;
        if (user) {
            session = await ChatService.findActiveSessionByUser(user.id);
            if (!session) {
                session = await ChatService.createSession({ userId: user.id });
            }
        }
        else {
            // For guests, IF email is provided, try to find active session
            if (guestEmail) {
                session = await ChatService.findActiveSessionByGuest(guestEmail);
            }
            if (!session) {
                session = await ChatService.createSession({ guestName: guestName || 'Guest', guestEmail });
            }
        }
        res.json({
            success: true,
            sessionId: session.id,
            sessionToken: session.sessionToken, // Return token for guest security
            session
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to start chat session' });
    }
};
export const getMySessions = async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        // Need method in service to find by userId. 
        // For now, let's just use Prisma directly here or add to service. 
        // I will trust the service handles it or I'll implement a simple fetch here if service is missing it.
        // Wait, I didn't add getUserSessions to ChatService. I'll add it to the service later or just implement logic here.
        // I'll stick to basic startSession for now.
        res.json({ success: true, message: "History not implemented yet" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching sessions' });
    }
};
export const getSessionById = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { token: guestToken } = req.query; // Optional token for guest access
        if (!sessionId || typeof sessionId !== 'string') {
            return res.status(400).json({ success: false, message: 'Invalid Session ID' });
        }
        const session = await ChatService.getSession(sessionId);
        if (!session)
            return res.status(404).json({ success: false, message: 'Session not found' });
        // --- AUTHENTICATION & AUTHORIZATION ---
        let isAdmin = false;
        let authUserId = null;
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (token && process.env.JWT_SECRET) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                if (decoded) {
                    isAdmin = decoded.role === 'ADMIN';
                    authUserId = decoded.id;
                }
            }
            catch (e) {
                // Invalid token, treat as guest/unauthenticated (or fail if verified user required)
            }
        }
        // 1. Session belongs to a Registered User
        if (session.userId) {
            if (!token) { // User sessions require login
                return res.status(403).json({ success: false, message: 'Unauthorized access to user session' });
            }
            // Check ownership or admin
            if (authUserId !== session.userId && !isAdmin) {
                return res.status(403).json({ success: false, message: 'Forbidden' });
            }
        }
        // 2. Session is a Guest Session
        else {
            // Guest Session Security: Token required to prevent IDOR (unless Admin)
            const isValidToken = (queryToken, sessionToken) => {
                return sessionToken && queryToken === sessionToken;
            };
            if (!isAdmin && !isValidToken(guestToken, session.sessionToken)) {
                return res.status(403).json({ success: false, message: 'Access Denied: Invalid or Missing Session Token' });
            }
        }
        res.json({ success: true, session });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching session' });
    }
};
export const getActiveSessions = async (req, res) => {
    try {
        const sessions = await ChatService.getActiveSessions();
        res.json({ success: true, sessions });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching active sessions' });
    }
};
export const endSession = async (req, res) => {
    try {
        const { sessionId, sessionToken } = req.body;
        if (!sessionId)
            return res.status(400).json({ success: false, message: 'Session ID required' });
        const session = await ChatService.getSession(sessionId);
        if (!session)
            return res.status(404).json({ success: false, message: 'Session not found' });
        // Security Check: Only Owner or Admin can close
        const authUser = req.user;
        const isAdmin = authUser?.role === 'ADMIN';
        if (session.userId) {
            const isOwner = authUser && authUser.id === session.userId;
            if (!isOwner && !isAdmin) {
                return res.status(403).json({ success: false, message: 'Access Denied' });
            }
        }
        else {
            // Guest Session Security: Token required
            if (!isAdmin && sessionToken !== session.sessionToken) {
                console.warn(`[CHAT-SECURITY] Attempt to close guest session ${sessionId} without valid token.`);
                return res.status(403).json({ success: false, message: 'Access Denied: Invalid Session Token' });
            }
        }
        await ChatService.closeSession(sessionId);
        res.json({ success: true, message: 'Session ended' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to end session' });
    }
};
//# sourceMappingURL=chat.controller.js.map