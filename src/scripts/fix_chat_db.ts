import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("🚀 Adding sessionToken column to chat_sessions table...");
    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS "sessionToken" TEXT;`);
        console.log("✅ Column added successfully.");
    } catch (error) {
        console.error("❌ Error adding column:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
