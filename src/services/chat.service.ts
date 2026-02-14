import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

export const ChatService = {
    async createSession(data: { userId?: string, guestName?: string, guestEmail?: string }) {
        const crypto = await import('crypto');
        const sessionToken = data.userId ? null : crypto.randomBytes(32).toString('hex');

        return await prisma.chatSession.create({
            data: {
                userId: data.userId ?? null,
                guestName: data.guestName ?? null,
                guestEmail: data.guestEmail ?? null,
                sessionToken: sessionToken,
                isActive: true
            } as any,
            include: {
                messages: true,
                user: {
                    select: { name: true, email: true, role: true }
                }
            }
        });
    },

    async findActiveSessionByUser(userId: string) {
        const session = await prisma.chatSession.findFirst({
            where: {
                userId,
                isActive: true
            },
            include: {
                messages: true,
                user: {
                    select: { name: true, email: true, role: true }
                }
            }
        });

        const EXPIRY_MS = 5 * 60 * 1000; // 5 Minutes

        // Expiration Logic
        if (session) {
            const expiryTime = new Date(Date.now() - EXPIRY_MS);
            if (session.updatedAt < expiryTime) {
                // Expire it
                await prisma.chatSession.update({
                    where: { id: session.id },
                    data: { isActive: false }
                });
                return null;
            }
        }

        return session;
    },

    async findActiveSessionByGuest(email: string) {
        const session = await prisma.chatSession.findFirst({
            where: {
                guestEmail: email,
                isActive: true
            },
            include: {
                messages: true
            }
        });

        const EXPIRY_MS = 5 * 60 * 1000; // 5 Minutes

        // Expiration Logic
        if (session) {
            const expiryTime = new Date(Date.now() - EXPIRY_MS);
            if (session.updatedAt < expiryTime) {
                await prisma.chatSession.update({
                    where: { id: session.id },
                    data: { isActive: false }
                });
                return null;
            }
        }

        return session;
    },

    async getSession(sessionId: string) {
        const session = await prisma.chatSession.findUnique({
            where: { id: sessionId },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' }
                },
                user: {
                    select: { name: true, email: true, role: true }
                }
            }
        });

        const EXPIRY_MS = 5 * 60 * 1000; // 5 Minutes

        // Lazy Expiry Check on Retrieval
        if (session && session.isActive) {
            const expiryTime = new Date(Date.now() - EXPIRY_MS);
            if (session.updatedAt < expiryTime) {
                // If it's expired, we update it to inactive and return the updated version (or null if we want to hide it completely?)
                // Returning it as inactive allows the frontend to see it's closed.
                const updated = await prisma.chatSession.update({
                    where: { id: sessionId },
                    data: { isActive: false }
                });
                return { ...session, isActive: false };
            }
        }

        return session;
    },

    async addMessage(sessionId: string, sender: Role, content: string) {
        // Update session's updatedAt timestamp to keep it alive
        await prisma.chatSession.update({
            where: { id: sessionId },
            data: { updatedAt: new Date() }
        });

        return await prisma.chatMessage.create({
            data: {
                sessionId,
                sender,
                content
            }
        });
    },

    async closeSession(sessionId: string) {
        return await prisma.chatSession.update({
            where: { id: sessionId },
            data: { isActive: false }
        });
    },

    async getActiveSessions() {
        return await prisma.chatSession.findMany({
            where: { isActive: true },
            include: {
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                },
                user: {
                    select: { name: true, email: true }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });
    },

    async markMessagesAsRead(sessionId: string, role: Role) {
        // If USER reads, mark ADMIN messages as read
        // If ADMIN reads, mark USER messages as read
        const senderToMark = role === 'USER' ? 'ADMIN' : 'USER';

        return await prisma.chatMessage.updateMany({
            where: {
                sessionId,
                sender: senderToMark,
                isRead: false
            },
            data: { isRead: true }
        });
    }
};
