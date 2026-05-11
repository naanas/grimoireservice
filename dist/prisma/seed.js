import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prisma = new PrismaClient();
async function main() {
    console.log('🌱 Starting Seed...');
    // 1. Seed Categories from SQL
    const sqlPath = path.join(__dirname, 'seed_categories.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    // Split by statement if needed, or executeRaw if it allows multiple
    // Prisma executeRaw usually allows multiple statements if the DB driver supports it.
    // However, safe bet is to split if simple, but let's try direct execution first.
    console.log('📦 Seeding Categories...');
    try {
        await prisma.$executeRawUnsafe(sql);
        console.log('✅ Categories Seeded');
    }
    catch (e) {
        console.error('❌ Failed to seed categories:', e);
    }
    // 2. Seed Admin User
    console.log('👤 Seeding Admin User...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);
    await prisma.user.upsert({
        where: { email: 'admin@gmail.com' },
        update: {},
        create: {
            email: 'admin@gmail.com',
            name: 'ADMIN',
            password: hashedPassword,
            role: 'ADMIN',
            phoneNumber: '081234567890',
            balance: 1000000 // Give some balance for testing
        }
    });
    console.log('✅ Admin User Seeded (admin@gmail.com / password123)');
    // 3. Seed Products (Dummy Data for Mobile Legends)
    console.log('💎 Seeding Products...');
    // Find ML Category
    const mlCategory = await prisma.category.findFirst({
        where: { slug: 'mobile-legends' }
    });
    if (mlCategory) {
        const products = [
            { name: '3 Diamonds (3 + 0 Bonus)', sku: 'ML-3', price: 1133 },
            { name: '5 Diamonds (5 + 0 Bonus)', sku: 'ML-5', price: 1611 },
            { name: '10 Diamonds (10 + 0 Bonus)', sku: 'ML-10', price: 3222 },
            { name: '14 Diamonds (13 + 1 Bonus)', sku: 'ML-14', price: 4028 },
            { name: '36 Diamonds (33 + 3 Bonus)', sku: 'ML-36', price: 11307 },
            { name: '875 Diamonds (758 + 117 Bonus)', sku: 'ML-875', price: 236000 }
        ];
        for (const p of products) {
            await prisma.product.upsert({
                where: { sku_code: p.sku },
                update: {},
                create: {
                    name: p.name,
                    sku_code: p.sku,
                    price_sell: p.price,
                    price_provider: p.price * 0.9, // 10% profit assumption
                    categoryId: mlCategory.id,
                    group: 'Top Up',
                    isActive: true
                }
            });
        }
        console.log('✅ Mobile Legends Products Seeded');
    }
    // 4. Seed Payment Config (Default to Tripay Sandbox)
    console.log('⚙️ Seeding System Config...');
    await prisma.systemConfig.upsert({
        where: { key: 'PAYMENT_GATEWAY' },
        update: {},
        create: { key: 'PAYMENT_GATEWAY', value: 'DUPAY' }
    });
    await prisma.systemConfig.upsert({
        where: { key: 'TRIPAY_MODE' },
        update: {},
        create: { key: 'TRIPAY_MODE', value: 'SANDBOX' }
    });
    console.log('✅ System Config Seeded');
    console.log('🎉 Seed Completed!');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map