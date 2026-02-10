import { prisma } from '../lib/prisma.js';
async function main() {
    console.log("Fixing ML Brands...");
    // 1. Update all ML categories to have brand 'Mobile Legends'
    const res = await prisma.category.updateMany({
        where: {
            slug: { in: ['mobile-legends-a', 'mobile-legends-b'] }
        },
        data: {
            brand: 'Mobile Legends'
        }
    });
    console.log(`Updated ${res.count} categories.`);
}
main();
//# sourceMappingURL=fix-brands.js.map