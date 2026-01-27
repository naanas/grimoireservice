-- Seed Categories for VIP Reseller Integration
-- Uses ON CONFLICT to upsert based on Slug
-- Updated with Brand Grouping

INSERT INTO "categories" ("id", "name", "slug", "code", "brand", "image", "requiresZoneId", "requiresServerId", "profitMargin", "isActive", "updatedAt") VALUES

-- Mobile Legends Group
(gen_random_uuid(), 'Mobile Legends', 'mobile-legends', 'mobile-legends', 'Mobile Legends', 'https://upload.wikimedia.org/wikipedia/en/2/26/Mobile_Legends_Bang_Bang_logo.png', true, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Mobile Legends (Global)', 'mobile-legends-global', 'mobile-legends', 'Mobile Legends', 'https://upload.wikimedia.org/wikipedia/en/2/26/Mobile_Legends_Bang_Bang_logo.png', true, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Mobile Legends (Malaysia)', 'mobile-legends-malaysia', 'mobile-legends', 'Mobile Legends', 'https://upload.wikimedia.org/wikipedia/en/2/26/Mobile_Legends_Bang_Bang_logo.png', true, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Mobile Legends (Philippines)', 'mobile-legends-philippines', 'mobile-legends', 'Mobile Legends', 'https://upload.wikimedia.org/wikipedia/en/2/26/Mobile_Legends_Bang_Bang_logo.png', true, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Mobile Legends (Russia)', 'mobile-legends-russia', 'mobile-legends', 'Mobile Legends', 'https://upload.wikimedia.org/wikipedia/en/2/26/Mobile_Legends_Bang_Bang_logo.png', true, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Mobile Legends A', 'mobile-legends-a', 'mobile-legends', 'Mobile Legends', 'https://upload.wikimedia.org/wikipedia/en/2/26/Mobile_Legends_Bang_Bang_logo.png', true, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Mobile Legends Gift', 'mobile-legends-gift', 'mobile-legends', 'Mobile Legends', 'https://upload.wikimedia.org/wikipedia/en/2/26/Mobile_Legends_Bang_Bang_logo.png', true, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Mobile Legends B', 'mobile-legends-b', 'mobile-legends', 'Mobile Legends', 'https://upload.wikimedia.org/wikipedia/en/2/26/Mobile_Legends_Bang_Bang_logo.png', true, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Mobile Legends (Singapore)', 'mobile-legends-singapore', 'mobile-legends', 'Mobile Legends', 'https://upload.wikimedia.org/wikipedia/en/2/26/Mobile_Legends_Bang_Bang_logo.png', true, false, 5.0, true, NOW()),

-- Marvel Group
(gen_random_uuid(), 'Marvel Super War', 'marvel-super-war', 'marvel-super-war', 'Marvel', 'https://placehold.co/400?text=Marvel+Super+War', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Marvel Rivals', 'marvel-rivals', 'Marvel Rivals', 'Marvel', 'https://placehold.co/400?text=Marvel+Rivals', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Marvel Duel', 'marvel-duel', 'Marvel Duel', 'Marvel', 'https://placehold.co/400?text=Marvel+Duel', false, false, 5.0, true, NOW()),

-- Magic Chess Group
(gen_random_uuid(), 'Magic Chess: Go Go', 'magic-chess-go-go', 'Magic Chess: Go Go', 'Magic Chess', 'https://placehold.co/400?text=Magic+Chess', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Magic Chess: Go Go (Global)', 'magic-chess-go-go-global', 'Magic Chess: Go Go', 'Magic Chess', 'https://placehold.co/400?text=Magic+Chess+Global', false, false, 5.0, true, NOW()),

-- Clash Group
(gen_random_uuid(), 'Clash of Clans', 'clash-of-clans', 'Clash of Clans', 'Clash of Clans', 'https://upload.wikimedia.org/wikipedia/en/thumb/5/59/Clash_of_Clans_Logo.png/220px-Clash_of_Clans_Logo.png', true, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Clash Royale', 'clash-royale', 'Clash Royale', 'Clash Royale', 'https://upload.wikimedia.org/wikipedia/en/thumb/c/c1/Clash_Royale_logo.png/220px-Clash_Royale_logo.png', true, false, 5.0, true, NOW()),

-- King of Avalon (Deduping variations if likely same game)
(gen_random_uuid(), 'King of Avalon', 'king-of-avalon', 'King of Avalon', 'King of Avalon', 'https://placehold.co/400?text=King+of+Avalon', false, false, 5.0, true, NOW()),
-- Assuming "King Of Avalon" is just a case variant or duplicates. Skipping duplicate slug to avoid conflict error.

-- Tom and Jerry Group
(gen_random_uuid(), 'Tom and Jerry:chase', 'tom-and-jerry-chase', 'tom-and-jerry-chase', 'Tom and Jerry', 'https://placehold.co/400?text=Tom+and+Jerry', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Tom and Jerry Chase', 'tom-and-jerry-chase-var', 'Tom and Jerry Chase', 'Tom and Jerry', 'https://placehold.co/400?text=Tom+and+Jerry', false, false, 5.0, true, NOW()),

-- League of Legends Group
(gen_random_uuid(), 'League of Legends: Wild Rift', 'league-of-legends-wild-rift', 'league-of-legends-wild-rift', 'League of Legends', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/League_of_Legends_Wild_Rift_logo.svg/1200px-League_of_Legends_Wild_Rift_logo.svg.png', true, false, 5.0, true, NOW()),
(gen_random_uuid(), 'League of Legends', 'league-of-legends', 'League of Legends', 'League of Legends', 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/League_of_Legends_2019_vector.svg/1200px-League_of_Legends_2019_vector.svg.png', false, false, 5.0, true, NOW()),

-- Ragnarok Group
(gen_random_uuid(), 'Ragnarok M', 'ragnarok-m', 'Ragnarok M', 'Ragnarok', 'https://placehold.co/400?text=Ragnarok+M', true, true, 5.0, true, NOW()),
(gen_random_uuid(), 'Ragnarok M Eternal Love (SEA)', 'ragnarok-m-eternal-love-sea', 'Ragnarok M Eternal Love (SEA)', 'Ragnarok', 'https://placehold.co/400?text=Ragnarok+M+SEA', true, true, 5.0, true, NOW()),
(gen_random_uuid(), 'Ragnarok Origin', 'ragnarok-origin', 'Ragnarok Origin', 'Ragnarok', 'https://placehold.co/400?text=Ragnarok+Origin', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'RagnaroK X Next Generation', 'ragnarok-x-next-generation', 'RagnaroK X Next Generation', 'Ragnarok', 'https://placehold.co/400?text=Ragnarok+X', true, true, 5.0, true, NOW()),

-- Honkai Group
(gen_random_uuid(), 'Honkai Impact 3', 'honkai-impact-3', 'Honkai Impact 3', 'Honkai', 'https://upload.wikimedia.org/wikipedia/en/e/ee/Honkai-Impact-3rd-Logo.png', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Honkai Star Rail', 'honkai-star-rail', 'Honkai Star Rail', 'Honkai', 'https://upload.wikimedia.org/wikipedia/en/thumb/9/91/Honkai_Star_Rail_logo.png/600px-Honkai_Star_Rail_logo.png', true, true, 5.0, true, NOW()),

-- Roblox Group
(gen_random_uuid(), 'Roblox Via Login', 'roblox-via-login', 'Roblox Via Login', 'Roblox', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Roblox_Logo_2022.svg/1200px-Roblox_Logo_2022.svg.png', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Voucher Roblox', 'voucher-roblox', 'Voucher Roblox', 'Roblox', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Roblox_Logo_2022.svg/1200px-Roblox_Logo_2022.svg.png', false, false, 2.0, true, NOW()),

-- Valorant Group
(gen_random_uuid(), 'Valorant', 'valorant', 'Valorant', 'Valorant', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Valorant_logo_-_pink_color_version.svg/1200px-Valorant_logo_-_pink_color_version.svg.png', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Voucher Valorant', 'voucher-valorant', 'Voucher Valorant', 'Valorant', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Valorant_logo_-_pink_color_version.svg/1200px-Valorant_logo_-_pink_color_version.svg.png', false, false, 2.0, true, NOW()),

-- Point Blank Group
(gen_random_uuid(), 'Point Blank', 'point-blank', 'Point Blank', 'Point Blank', 'https://upload.wikimedia.org/wikipedia/commons/1/1d/Point_Blank_Logo.png', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Voucher PB Zepetto', 'voucher-pb-zepetto', 'Voucher PB Zepetto', 'Point Blank', 'https://placehold.co/400?text=PB+Zepetto', false, false, 2.0, true, NOW()),

-- Individual Games
(gen_random_uuid(), 'Metal Slug Awakening', 'metal-slug-awakening', 'Metal Slug Awakening', 'Metal Slug Awakening', 'https://placehold.co/400?text=Metal+Slug', true, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Genshin Impact', 'genshin-impact', 'Genshin Impact', 'Genshin Impact', 'https://upload.wikimedia.org/wikipedia/en/5/5d/Genshin_Impact_logo.svg', true, true, 3.0, true, NOW()),
(gen_random_uuid(), 'Arena of Valor', 'arena-of-valor', 'Arena of Valor', 'Arena of Valor', 'https://upload.wikimedia.org/wikipedia/en/thumb/0/07/Arena_of_Valor.png/220px-Arena_of_Valor.png', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Honor of Kings Global', 'honor-of-kings-global', 'Honor of Kings Global', 'Honor of Kings Global', 'https://upload.wikimedia.org/wikipedia/en/thumb/5/53/Honor_of_Kings_Logo.png/220px-Honor_of_Kings_Logo.png', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Auto Chess', 'auto-chess', 'Auto Chess', 'Auto Chess', 'https://placehold.co/400?text=Auto+Chess', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Brawl Stars', 'brawl-stars', 'Brawl Stars', 'Brawl Stars', 'https://upload.wikimedia.org/wikipedia/en/thumb/2/27/Brawl_Stars_logo.png/220px-Brawl_Stars_logo.png', true, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Lords Mobile', 'lords-mobile', 'Lords Mobile', 'Lords Mobile', 'https://placehold.co/400?text=Lords+Mobile', true, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Hago', 'hago', 'Hago', 'Hago', 'https://placehold.co/400?text=Hago', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'State of Survival: Zombie War', 'state-of-survival-zombie-war', 'State of Survival: Zombie War', 'State of Survival: Zombie War', 'https://placehold.co/400?text=State+of+Survival', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Age of Empires Mobile', 'age-of-empires-mobile', 'Age of Empires Mobile', 'Age of Empires Mobile', 'https://placehold.co/400?text=Age+of+Empires', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Castle Duels', 'castle-duels', 'Castle Duels', 'Castle Duels', 'https://placehold.co/400?text=Castle+Duels', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Dynasty Warriors: Overlords', 'dynasty-warriors-overlords', 'Dynasty Warriors: Overlords', 'Dynasty Warriors: Overlords', 'https://placehold.co/400?text=Dynasty+Warriors', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Conquer Online (Point Card)', 'conquer-online-point-card', 'Conquer Online (Point Card)', 'Conquer Online (Point Card)', 'https://placehold.co/400?text=Conquer+Online', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Astral Guardians: Cyber Fantasy', 'astral-guardians-cyber-fantasy', 'Astral Guardians: Cyber Fantasy', 'Astral Guardians: Cyber Fantasy', 'https://placehold.co/400?text=Astral+Guardians', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Higgs Domino', 'higgs-domino', 'Higgs Domino', 'Higgs Domino', 'https://placehold.co/400?text=Higgs+Domino', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Domino Gaple Boyaa Qiuqiu', 'domino-gaple-qiuqiu-boyaa', 'Domino Gaple Boyaa Qiuqiu', 'Domino Gaple Boyaa Qiuqiu', 'https://placehold.co/400?text=Domino+Gaple', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Ludo Club', 'ludo-club', 'Ludo Club', 'Ludo Club', 'https://placehold.co/400?text=Ludo+Club', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Zepeto', 'zepeto', 'Zepeto', 'Zepeto', 'https://placehold.co/400?text=Zepeto', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Growtopia', 'growtopia', 'Growtopia', 'Growtopia', 'https://placehold.co/400?text=Growtopia', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Eggy Party', 'eggy-party', 'Eggy Party', 'Eggy Party', 'https://placehold.co/400?text=Eggy+Party', true, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Identity V', 'identity-v', 'Identity V', 'Identity V', 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a2/Identity_V.jpg/220px-Identity_V.jpg', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Love and Deepspace', 'love-and-deepspace', 'Love and Deepspace', 'Love and Deepspace', 'https://placehold.co/400?text=Love+and+Deepspace', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Likee', 'likee', 'Likee', 'Likee', 'https://placehold.co/400?text=Likee', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Ace Racer', 'ace-racer', 'Ace Racer', 'Ace Racer', 'https://placehold.co/400?text=Ace+Racer', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Speed Drifters', 'speed-drifters', 'Speed Drifters', 'Speed Drifters', 'https://placehold.co/400?text=Speed+Drifters', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'AFK Journey', 'afk-journey', 'AFK Journey', 'AFK Journey', 'https://placehold.co/400?text=AFK+Journey', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Be The King', 'be-the-king', 'Be The King', 'Be The King', 'https://placehold.co/400?text=Be+The+King', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Football Master 2', 'football-master-2', 'Football Master 2', 'Football Master 2', 'https://placehold.co/400?text=Football+Master', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Zenless Zone Zero (ZZZ)', 'zenless-zone-zero', 'Zenless Zone Zero (ZZZ)', 'Zenless Zone Zero (ZZZ)', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Zenless_Zone_Zero_logo.svg/1200px-Zenless_Zone_Zero_logo.svg.png', true, true, 5.0, true, NOW()),
(gen_random_uuid(), 'Dragon Raja', 'dragon-raja', 'Dragon Raja', 'Dragon Raja', 'https://placehold.co/400?text=Dragon+Raja', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Dragonheir Silent Gods', 'dragonheir-silent-gods', 'Dragonheir Silent Gods', 'Dragonheir Silent Gods', 'https://placehold.co/400?text=Dragonheir', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'LifeAfter', 'lifeafter', 'LifeAfter', 'LifeAfter', 'https://placehold.co/400?text=LifeAfter', true, true, 5.0, true, NOW()),
(gen_random_uuid(), 'Light of Thel: New Era', 'light-of-thel-new-era', 'Light of Thel: New Era', 'Light of Thel: New Era', 'https://placehold.co/400?text=Light+of+Thel', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Watcher Of Realms', 'watcher-of-realms', 'Watcher Of Realms', 'Watcher Of Realms', 'https://placehold.co/400?text=Watcher+of+Realms', true, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Whiteout Survival', 'whiteout-survival', 'Whiteout Survival', 'Whiteout Survival', 'https://placehold.co/400?text=Whiteout+Survival', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Laplace M', 'laplace-m', 'Laplace M', 'Laplace M', 'https://placehold.co/400?text=Laplace+M', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'EA SPORTS FC Mobile', 'ea-sports-fc-mobile', 'EA SPORTS FC Mobile', 'EA SPORTS FC Mobile', 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/EA_Sports_FC_Mobile_logo.svg/1200px-EA_Sports_FC_Mobile_logo.svg.png', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'NBA Infinite (Europe)', 'nba-infinite-europe', 'NBA Infinite (Europe)', 'NBA Infinite', 'https://placehold.co/400?text=NBA+Infinite', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'One Punch Man', 'one-punch-man', 'One Punch Man', 'One Punch Man', 'https://placehold.co/400?text=One+Punch+Man', true, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Cocofun', 'cocofun', 'Cocofun', 'Cocofun', 'https://placehold.co/400?text=Cocofun', false, false, 5.0, true, NOW()),
(gen_random_uuid(), '8 Ball Pool', '8-ball-pool', '8 Ball Pool', '8 Ball Pool', 'https://placehold.co/400?text=8+Ball+Pool', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Bullet Angel', 'bullet-angel', 'Bullet Angel', 'Bullet Angel', 'https://placehold.co/400?text=Bullet+Angel', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'IndoPlay', 'indoplay', 'IndoPlay', 'IndoPlay', 'https://placehold.co/400?text=IndoPlay', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Garena Undawn', 'garena-undawn', 'Garena Undawn', 'Garena Undawn', 'https://placehold.co/400?text=Garena+Undawn', true, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Revelation Infinite Journey', 'revelation-infinite-journey', 'Revelation Infinite Journey', 'Revelation Infinite Journey', 'https://placehold.co/400?text=Revelation', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Infinite Borders', 'infinite-borders', 'Infinite Borders', 'Infinite Borders', 'https://placehold.co/400?text=Infinite+Borders', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Warp Plus', 'warp-plus', 'Warp Plus', 'Warp Plus', 'https://placehold.co/400?text=Warp+Plus', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Steam Wallet Code', 'steam-wallet-code', 'Steam Wallet Code', 'Steam', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Steam_icon_logo.svg/1200px-Steam_icon_logo.svg.png', false, false, 2.0, true, NOW()),
(gen_random_uuid(), 'Voucher Garena Shell', 'voucher-garena-shell', 'Voucher Garena Shell', 'Garena', 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d5/Garena_logo.svg/1200px-Garena_logo.svg.png', false, false, 2.0, true, NOW()),
(gen_random_uuid(), 'Voucher Megaxus', 'voucher-megaxus', 'Voucher Megaxus', 'Megaxus', 'https://placehold.co/400?text=Megaxus', false, false, 2.0, true, NOW()),
(gen_random_uuid(), 'Voucher Razer Gold', 'voucher-razer-gold', 'Voucher Razer Gold', 'Razer Gold', 'https://placehold.co/400?text=Razer+Gold', false, false, 2.0, true, NOW()),
(gen_random_uuid(), 'Voucher PSN', 'voucher-psn', 'Voucher PSN', 'PSN', 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/PlayStation_logo.svg/1200px-PlayStation_logo.svg.png', false, false, 2.0, true, NOW())

ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "code" = EXCLUDED."code",
  "brand" = EXCLUDED."brand",
  "image" = EXCLUDED."image",
  "requiresZoneId" = EXCLUDED."requiresZoneId",
  "requiresServerId" = EXCLUDED."requiresServerId",
  "profitMargin" = EXCLUDED."profitMargin",
  "updatedAt" = NOW();
