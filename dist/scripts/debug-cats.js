import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const categories = await prisma.category.findMany({
        include: { _count: { select: { products: true } } }
    });
    console.log("Categories:");
    categories.forEach(c => {
        console.log(`- [${c.id}] ${c.name} (Code: ${c.code}) -> Products: ${c._count.products}`);
    });
}
main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
//# sourceMappingURL=debug-cats.js.map