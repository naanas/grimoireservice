import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
const prisma = new PrismaClient();
async function main() {
    const sqlPath = path.resolve(__dirname, '../../prisma/seed_categories.sql');
    console.log(`Loading SQL from: ${sqlPath}`);
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    // Split by statement if needed, but executeRawUnsafe handles multiple statements if supported by driver
    // Postgres driver usually supports it if passed as one string? Or safer to use $queryRaw? 
    // $executeRawUnsafe can run multiple statements in some drivers.
    // Let's try executing.
    try {
        const count = await prisma.$executeRawUnsafe(sql);
        console.log(`✅ Seed executed successfully. Result: ${count}`);
    }
    catch (e) {
        console.error('❌ Errors executing seed:', e);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
//# sourceMappingURL=run-seed.js.map