import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() {
    console.log('🌱 Starting Seed...');
    // 1. Create Admin User
    const adminEmail = 'admin@topup.com';
    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await prisma.user.create({
            data: {
                name: 'Super Admin',
                email: adminEmail,
                password: hashedPassword,
                role: 'ADMIN',
                phoneNumber: '081234567890'
            }
        });
        console.log('✅ Admin created: admin@topup.com / admin123');
    }
    else {
        console.log('ℹ️  Admin already exists');
    }
    // 2. Create Banners
    const banners = await prisma.banner.count();
    if (banners === 0) {
        await prisma.banner.createMany({
            data: [
                {
                    title: 'Mobile Legends Promo',
                    imageUrl: 'https://cdn.example.com/banner-ml.jpg', // Placeholder
                    isActive: true
                },
                {
                    title: 'PUBG Mobile Season Pass',
                    imageUrl: 'https://cdn.example.com/banner-pubg.jpg', // Placeholder
                    isActive: true
                }
            ]
        });
        console.log('✅ Banners created');
    }
    // 3. Create Categories
    const categories = await prisma.category.count();
    if (categories === 0) {
        await prisma.category.createMany({
            data: [
                { name: 'Mobile Legends', slug: 'mobile-legends', image: 'https://cdn.example.com/icon-ml.png', isActive: true },
                { name: 'PUBG Mobile', slug: 'pubg-mobile', image: 'https://cdn.example.com/icon-pubg.png', isActive: true },
                { name: 'Free Fire', slug: 'free-fire', image: 'https://cdn.example.com/icon-ff.png', isActive: true },
                { name: 'Valorant', slug: 'valorant', image: 'https://cdn.example.com/icon-val.png', isActive: true },
            ]
        });
        console.log('✅ Categories created');
    }
    console.log('🏁 Seed completed!');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed_content.js.map