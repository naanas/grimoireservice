import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
    log: [
        {
            emit: 'event',
            level: 'query',
        },
        {
            emit: 'stdout',
            level: 'error',
        },
        {
            emit: 'stdout',
            level: 'warn',
        },
    ],
});

// Attach Logger
if (!globalForPrisma.prisma) {
    (prisma as any).$on('query', (e: any) => {
        console.log('────────────────────────────────────────────────────────');
        console.log(`💎 [PRISMA] ${e.duration}ms`);
        console.log(`🔎 Query : ${e.query}`);
        console.log(`📂 Params: ${e.params}`);
        console.log('────────────────────────────────────────────────────────');
    });
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
