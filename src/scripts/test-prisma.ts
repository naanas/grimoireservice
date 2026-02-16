import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Checking Prisma Client fields...");

    // 1. Check if we can start a transaction/query intended to use the new fields
    // We won't actually execute it to avoid messing up DB, just check if types allow it in a way helpful for debugging? 
    // actually, runtime JS doesn't care about types. We need to check if the DB column exists.

    try {
        // Try to find a user and select the new fields
        const user = await prisma.user.findFirst({
            select: {
                id: true,
                email: true,
                isVerified: true, // This will throw if column doesn't exist in DB
                verificationToken: true
            }
        });

        console.log("✅ Success! The database query with 'isVerified' executed without error.");
        if (user) {
            console.log("Found user:", user);
        } else {
            console.log("No user found, but query structure is valid.");
        }

        // Explicitly check dmmf to see if the client knows about the field
        // @ts-ignore
        const dmmf = prisma._baseDmmf || prisma._dmmf;
        if (dmmf) {
            const userModel = dmmf.modelMap?.User || dmmf.datamodel?.models?.find((m: any) => m.name === 'User');
            if (userModel) {
                const hasVerified = userModel.fields.some((f: any) => f.name === 'isVerified');
                console.log(`Client Model 'User' has 'isVerified': ${hasVerified ? 'YES ✅' : 'NO ❌'}`);
            }
        }

    } catch (e) {
        console.error("❌ Error querying database:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
