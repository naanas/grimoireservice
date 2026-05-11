import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function fix() {
    try {
        console.log("🚀 Starting database fix via Raw SQL...");
        // Use executeRaw to add the column
        // We use IF NOT EXISTS logic (PostgreSQL 9.6+)
        await prisma.$executeRawUnsafe(`
            ALTER TABLE "transactions" 
            ADD COLUMN IF NOT EXISTS "paymentGateway" TEXT;
        `);
        console.log("✅ Column 'paymentGateway' added successfully (or already exists).");
        // Also check if we need to regenerate prisma client again just in case
        console.log("Checking if record can be fetched...");
        const trx = await prisma.transaction.findFirst();
        console.log("Fetch test success.");
    }
    catch (e) {
        console.error("❌ SQL FIX ERROR:", e.message);
    }
    finally {
        await prisma.$disconnect();
    }
}
fix();
//# sourceMappingURL=fix_db_sql.js.map