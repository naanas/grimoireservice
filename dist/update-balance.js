import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    try {
        const user = await prisma.user.update({
            where: { email: 'tester@mail.com' },
            data: { balance: 1000000 }
        });
        console.log(`✅ Balance Updated for ${user.email}: ${user.balance}`);
    }
    catch (e) {
        console.error(e);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
//# sourceMappingURL=update-balance.js.map