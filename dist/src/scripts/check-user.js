import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const checkUser = async () => {
    try {
        const email = 'asu@gmail.com';
        console.log(`Checking user: ${email}`);
        const u = await prisma.$queryRaw `SELECT id, name, email, "phoneNumber" FROM "users" WHERE email = ${email}`;
        console.log("Result:", u);
        if (u.length > 0 && !u[0].phoneNumber) {
            console.log("⚠️ Phone number is missing. Updating...");
            // Update logic if needed
            await prisma.$executeRaw `UPDATE "users" SET "phoneNumber" = '082131077460' WHERE email = ${email}`;
            console.log("✅ Updated phone number to 082131077460");
        }
    }
    catch (e) {
        console.error(e);
    }
};
checkUser();
//# sourceMappingURL=check-user.js.map