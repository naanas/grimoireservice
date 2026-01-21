import axios from 'axios';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const API_URL = 'http://localhost:4000/api';
async function testWebhookSecurity() {
    console.log("🛡️  STARTING WEBHOOK SECURITY TEST...");
    // 1. Create a Dummy Transaction in DB (Directly)
    // We need a valid ID in our DB to simulate a real payment waiting to happen.
    console.log("\n1️⃣  Creating Dummy Pending Transaction in DB...");
    const dummyTrx = await prisma.transaction.create({
        data: {
            invoice: `TEST-SEC-${Date.now()}`,
            amount: 50000,
            status: 'PENDING',
            paymentMethod: 'TEST_QRIS',
            type: 'GAME_TOPUP'
        }
    });
    console.log(`   ✅ Created Trx ID: ${dummyTrx.id}`);
    // 2. Scenario A: FAKE ID Attack
    // Attacker tries to send a success callback with a random ID to guess valid transactions
    console.log("\n2️⃣  Scenario A: Attacker sends FAKE ID (Random UUID)...");
    try {
        await axios.post(`${API_URL}/callback/ipaymu`, {
            reference_id: 'random-uuid-Wait-This-Is-Fake',
            status: 'berhasil',
            sid: 'fake-session',
            amount: 50000
        });
        console.log("   ❌ FAILED: Server accepted a fake ID!");
    }
    catch (error) {
        if (error.response && error.response.status === 404) {
            console.log("   ✅ SUCCESS: Server rejected fake ID (404 Not Found).");
        }
        else {
            console.log(`   ❓ Unexpected Error: ${error.message}`);
        }
    }
    // 3. Scenario B: VALID Callback (Simulate Real Ipaymu)
    console.log(`\n3️⃣  Scenario B: Ipaymu sends VALID Callback for ID ${dummyTrx.id}...`);
    try {
        const response = await axios.post(`${API_URL}/callback/ipaymu`, {
            reference_id: dummyTrx.id,
            status: 'berhasil',
            sid: 'valid-session-123',
            amount: 50000
        });
        if (response.data.success) {
            console.log("   ✅ SUCCESS: Server processed valid callback.");
        }
    }
    catch (error) {
        console.log(`   ❌ FAILED: ${error.message}`);
    }
    // 4. Scenario C: REPLAY Attack
    // Attacker (or Ipaymu retry) sends the SAME success callback again.
    // Ensure we don't process it twice (e.g. double balance add if it was a deposit).
    console.log("\n4️⃣  Scenario C: Replay Attack (Sending same callback again)...");
    try {
        const response = await axios.post(`${API_URL}/callback/ipaymu`, {
            reference_id: dummyTrx.id,
            status: 'berhasil',
            sid: 'valid-session-123',
            amount: 50000
        });
        // My code returns { success: true, message: 'Already paid' } for replays
        if (response.data.message === 'Already paid') {
            console.log("   ✅ SUCCESS: Server detected Replay/Duplicate ('Already paid').");
        }
        else {
            console.log("   ⚠️  WARNING: Server accepted it again? (Check logic).", response.data);
        }
    }
    catch (error) {
        console.log(`   ❌ FAILED: ${error.message}`);
    }
    // Cleanup
    console.log("\n🧹 Cleaning up...");
    await prisma.transaction.delete({ where: { id: dummyTrx.id } });
    console.log("✅ Cleanup done.");
}
testWebhookSecurity();
//# sourceMappingURL=test-webhook-security.js.map