import { PrismaClient } from '@prisma/client';
import { sendMessage } from '../services/whatsapp.service.js';
import dotenv from 'dotenv';
dotenv.config();
const prisma = new PrismaClient();
const debugTransaction = async (userId) => {
    console.log("🔍 --- DIAGNOSTIC START ---");
    console.log(`Checking User ID: ${userId}`);
    // 1. Check DB Connection & User
    try {
        const u = await prisma.$queryRaw `SELECT id, name, email, "phoneNumber" FROM "users" WHERE id = ${userId} LIMIT 1`;
        console.log("DB Result:", u);
        if (u.length === 0) {
            console.error("❌ User not found in DB!");
            return;
        }
        const user = u[0];
        console.log(`Found User: ${user.name}`);
        console.log(`Phone Number in DB: '${user.phoneNumber}'`); // Quote to see if empty string or null
        if (!user.phoneNumber) {
            console.error("❌ Phone Number is NULL or Empty! WhatsApp cannot be sent.");
            console.log("💡 SOLUTION: Update this user's phone number in DB.");
            return;
        }
        // 2. Try Sending WA
        console.log(`Attempting to send WA to: ${user.phoneNumber}`);
        const result = await sendMessage(user.phoneNumber, "*DIAGNOSTIC TEST* 🔍\nIf you receive this, logical flow is correct.");
        console.log("WA Result:", result);
    }
    catch (e) {
        console.error("❌ DB/System Error:", e.message);
    }
    finally {
        console.log("🏁 --- DIAGNOSTIC END ---");
    }
};
// Usage: npx tsx src/scripts/debug-trx.ts <USER_ID>
const targetId = process.argv[2];
if (!targetId) {
    console.log("Usage: npx tsx src/scripts/debug-trx.ts <USER_ID>");
    // Default to the user ID the user showed in logs
    // 2ddf76c1... was in previous logs, but in the specific error case: 
    // "Auth: 2cd7ff34-a308-457e-b89d-5d136ed580ea"
    console.log("Defaulting to ID from your logs: 2cd7ff34-a308-457e-b89d-5d136ed580ea");
    debugTransaction('2cd7ff34-a308-457e-b89d-5d136ed580ea');
}
else {
    debugTransaction(targetId);
}
//# sourceMappingURL=debug-trx.js.map