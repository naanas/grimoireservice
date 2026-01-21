import { sendMessage } from '../services/whatsapp.service.js';

const main = async () => {
    const target = process.argv[2];
    if (!target) {
        console.error("Usage: tsx src/scripts/test-wa.ts <phone_number>");
        process.exit(1);
    }

    console.log(`Sending test message to ${target}...`);
    const result = await sendMessage(target, "*TEST MESSAGE* from Grimoire Backend 🩸\n\nIni adalah pesan tes integrasi WhatsApp.");
    console.log("Result:", result);
};

main();
