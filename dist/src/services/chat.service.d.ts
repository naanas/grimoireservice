import { Role } from '@prisma/client';
export declare const ChatService: {
    createSession(data: {
        userId?: string;
        guestName?: string;
        guestEmail?: string;
    }): Promise<{
        user: {
            email: string;
            name: string | null;
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
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        userId: string | null;
        guestName: string | null;
        guestEmail: string | null;
        sessionToken: string | null;
    }>;
    findActiveSessionByUser(userId: string): Promise<({
        user: {
            email: string;
            name: string | null;
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
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        userId: string | null;
        guestName: string | null;
        guestEmail: string | null;
        sessionToken: string | null;
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
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        userId: string | null;
        guestName: string | null;
        guestEmail: string | null;
        sessionToken: string | null;
    }) | null>;
    getSession(sessionId: string): Promise<({
        user: {
            email: string;
            name: string | null;
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
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        userId: string | null;
        guestName: string | null;
        guestEmail: string | null;
        sessionToken: string | null;
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
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        userId: string | null;
        guestName: string | null;
        guestEmail: string | null;
        sessionToken: string | null;
    }>;
    getActiveSessions(): Promise<({
        user: {
            email: string;
            name: string | null;
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
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        userId: string | null;
        guestName: string | null;
        guestEmail: string | null;
        sessionToken: string | null;
    })[]>;
    markMessagesAsRead(sessionId: string, role: Role): Promise<import(".prisma/client").Prisma.BatchPayload>;
};
//# sourceMappingURL=chat.service.d.ts.map