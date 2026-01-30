import { Role } from '@prisma/client';
export declare const ChatService: {
    createSession(data: {
        userId?: string;
        guestName?: string;
        guestEmail?: string;
    }): Promise<{
        user: {
            name: string | null;
            email: string;
            role: import(".prisma/client").$Enums.Role;
        } | null;
        messages: {
            id: string;
            createdAt: Date;
            sessionId: string;
            sender: import(".prisma/client").$Enums.Role;
            content: string;
            isRead: boolean;
        }[];
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        guestName: string | null;
        guestEmail: string | null;
    }>;
    findActiveSessionByUser(userId: string): Promise<({
        user: {
            name: string | null;
            email: string;
            role: import(".prisma/client").$Enums.Role;
        } | null;
        messages: {
            id: string;
            createdAt: Date;
            sessionId: string;
            sender: import(".prisma/client").$Enums.Role;
            content: string;
            isRead: boolean;
        }[];
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        guestName: string | null;
        guestEmail: string | null;
    }) | null>;
    findActiveSessionByGuest(email: string): Promise<({
        messages: {
            id: string;
            createdAt: Date;
            sessionId: string;
            sender: import(".prisma/client").$Enums.Role;
            content: string;
            isRead: boolean;
        }[];
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        guestName: string | null;
        guestEmail: string | null;
    }) | null>;
    getSession(sessionId: string): Promise<({
        user: {
            name: string | null;
            email: string;
            role: import(".prisma/client").$Enums.Role;
        } | null;
        messages: {
            id: string;
            createdAt: Date;
            sessionId: string;
            sender: import(".prisma/client").$Enums.Role;
            content: string;
            isRead: boolean;
        }[];
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        guestName: string | null;
        guestEmail: string | null;
    }) | null>;
    addMessage(sessionId: string, sender: Role, content: string): Promise<{
        id: string;
        createdAt: Date;
        sessionId: string;
        sender: import(".prisma/client").$Enums.Role;
        content: string;
        isRead: boolean;
    }>;
    closeSession(sessionId: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        guestName: string | null;
        guestEmail: string | null;
    }>;
    getActiveSessions(): Promise<({
        user: {
            name: string | null;
            email: string;
        } | null;
        messages: {
            id: string;
            createdAt: Date;
            sessionId: string;
            sender: import(".prisma/client").$Enums.Role;
            content: string;
            isRead: boolean;
        }[];
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        guestName: string | null;
        guestEmail: string | null;
    })[]>;
    markMessagesAsRead(sessionId: string, role: Role): Promise<import(".prisma/client").Prisma.BatchPayload>;
};
//# sourceMappingURL=chat.service.d.ts.map