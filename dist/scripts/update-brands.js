import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const GAME_GROUPS = {
    'Mobile Legends': [
        'Mobile Legends', 'Mobile Legends (Global)', 'Mobile Legends (Malaysia)',
        'Mobile Legends (Philippines)', 'Mobile Legends (Russia)', 'Mobile Legends A',
        'Mobile Legends Gift', 'Mobile Legends B', 'Mobile Legends (Singapore)'
    ],
    'Marvel': ['Marvel Super War', 'Marvel Rivals', 'Marvel Duel'],
    'Magic Chess': ['Magic Chess: Go Go', 'Magic Chess: Go Go (Global)'],
    'Ragnarok': ['Ragnarok M', 'Ragnarok M Eternal Love (SEA)', 'Ragnarok Origin', 'RagnaroK X Next Generation'],
    'Tom and Jerry': ['Tom and Jerry:chase', 'Tom and Jerry Chase'],
    'League of Legends': ['League of Legends', 'League of Legends: Wild Rift'],
    'PUBG': ['PUBG Mobile', 'PUBG Mobile (Global)', 'PUBG Mobile Lite'],
    'Free Fire': ['Free Fire', 'Free Fire Max'],
    'Genshin Impact': ['Genshin Impact'],
    'Clash of Clans': ['Clash of Clans', 'Clash Royale'], // User grouped? Let's check user list. User had them separate in list but adjacent. Let's keep distinct unless user explicitly asked to group them.
    // Actually user asked: "jika ada yang sama itu merupakan satu game yang sama tapi beda server"
    // So "Clash of Clans" and "Clash Royale" are DIFFERENT games. Keep distinct.
    // "LifeAfter"
    // "Dragon Raja"
    // "Honkai" - Honkai Impact 3, Honkai Star Rail. Different games.
    // "Zenless Zone Zero"
    // "Valorant"
};
// Fallback logic for unmapped
function guessBrand(name) {
    if (name.toLowerCase().startsWith('mobile legends'))
        return 'Mobile Legends';
    if (name.toLowerCase().includes('ragnarok'))
        return 'Ragnarok';
    if (name.toLowerCase().includes('marvel'))
        return 'Marvel';
    if (name.toLowerCase().includes('magic chess'))
        return 'Magic Chess';
    if (name.toLowerCase().includes('tom and jerry'))
        return 'Tom and Jerry';
    return name; // Default to self as brand
}
async function main() {
    console.log('🔄 Mapping Brands...');
    const categories = await prisma.category.findMany();
    for (const cat of categories) {
        let brand = cat.name;
        // 1. Explicit Dictionary Check
        for (const [groupName, members] of Object.entries(GAME_GROUPS)) {
            if (members.map(m => m.toLowerCase()).includes(cat.name.toLowerCase()) ||
                members.some(m => cat.name.toLowerCase().includes(m.toLowerCase()))) {
                // Be careful with substring. "Mobile Legends" is substring of "Mobile Legends B"
                if (cat.name.toLowerCase().includes('mobile legends')) {
                    brand = 'Mobile Legends';
                    break;
                }
                if (cat.name.toLowerCase().includes('ragnarok')) {
                    brand = 'Ragnarok';
                    break;
                }
                if (cat.name.toLowerCase().includes('marvel')) {
                    brand = 'Marvel';
                    break;
                }
            }
        }
        // 2. Specific Overrides from User List Logic
        if (cat.name.includes('Mobile Legends'))
            brand = 'Mobile Legends';
        if (cat.name.includes('Ragnarok'))
            brand = 'Ragnarok';
        if (cat.name.includes('Marvel'))
            brand = 'Marvel';
        if (cat.name.includes('Magic Chess'))
            brand = 'Magic Chess';
        if (cat.name.toLowerCase().includes('tom and jerry'))
            brand = 'Tom and Jerry';
        if (cat.name.includes('League of Legends'))
            brand = 'League of Legends';
        // Save
        await prisma.category.update({
            where: { id: cat.id },
            data: { brand }
        });
        console.log(`Updated ${cat.name} -> Brand: ${brand}`);
    }
    console.log('✅ Brand Mapping Complete');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=update-brands.js.map