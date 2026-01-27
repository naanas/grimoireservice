import { PrismaClient } from '@prisma/client';
const globalForPrisma = global;
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
    prisma.$on('query', (e) => {
        console.log('────────────────────────────────────────────────────────');
        console.log(`💎 [PRISMA] ${e.duration}ms`);
        console.log(`🔎 Query : ${e.query}`);
        console.log(`📂 Params: ${e.params}`);
        console.log('────────────────────────────────────────────────────────');
    });
}
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = prisma;
//# sourceMappingURL=prisma.js.map