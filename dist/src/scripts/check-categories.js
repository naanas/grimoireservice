import { prisma } from '../lib/prisma.js';
async function main() {
    console.log("Checking Categories...");
    const cats = await prisma.category.findMany({
        where: { isActive: true },
        select: { id: true, name: true, slug: true, brand: true }
    });
    console.table(cats);
}
main();
//# sourceMappingURL=check-categories.js.map