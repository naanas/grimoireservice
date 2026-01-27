
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding Categories from SQL...');

    // Path relative to this script: ../prisma/seed_categories.sql
    const sqlPath = path.join(__dirname, '../prisma/seed_categories.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Execute
    // Note: executeRawUnsafe allows multiple statements if enabled in connection string? 
    // Usually one statement per call or split.
    // Our SQL file is mostly comments and then ONE big Insert.
    // We should probably strip comments to be safe or just try.
    // Comments with -- are standard SQL.

    try {
        const result = await prisma.$executeRawUnsafe(sql);
        console.log(`✅ Seed executed. Effected rows: ${result}`);
    } catch (e) {
        console.error('❌ Seed Failed:', e);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
