-- Seed Categories for VIP Reseller Integration
-- Uses ON CONFLICT to upsert based on Slug

INSERT INTO "categories" ("id", "name", "slug", "code", "image", "requiresZoneId", "requiresServerId", "profitMargin", "isActive", "updatedAt") VALUES
-- Mobile Legends
(gen_random_uuid(), 'Mobile Legends', 'mobile-legends', 'Mobile Legends', '', true, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Mobile Legends (Global)', 'mobile-legends-global', 'Mobile Legends (Global)', '', true, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Mobile Legends (Malaysia)', 'mobile-legends-malaysia', 'Mobile Legends (Malaysia)', '', true, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Mobile Legends (Philippines)', 'mobile-legends-philippines', 'Mobile Legends (Philippines)', '', true, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Mobile Legends (Singapore)', 'mobile-legends-singapore', 'Mobile Legends (Singapore)', '', true, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Mobile Legends (Brazil)', 'mobile-legends-brazil', 'Mobile Legends (Brazil)', '', true, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Mobile Legends (Russia)', 'mobile-legends-russia', 'Mobile Legends (Russia)', '', true, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Mobile Legends A', 'mobile-legends-a', 'Mobile Legends A', '', true, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Mobile Legends B', 'mobile-legends-b', 'Mobile Legends B', '', true, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Mobile Legends Gift', 'mobile-legends-gift', 'Mobile Legends Gift', '', true, false, 5.0, true, NOW()),

-- Free Fire
(gen_random_uuid(), 'Free Fire', 'free-fire', 'Free Fire', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Free Fire Max', 'free-fire-max', 'Free Fire Max', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Free Fire Global', 'free-fire-global', 'Free Fire Global', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Free Fire Max Global', 'free-fire-max-global', 'Free Fire Max Global', '', false, false, 5.0, true, NOW()),

-- PUBG & FPS
(gen_random_uuid(), 'PUBG Mobile (GLOBAL)', 'pubg-mobile-global', 'PUBG Mobile (GLOBAL)', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'PUBG Mobile (ID)', 'pubg-mobile-id', 'PUBG Mobile (ID)', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'PUBG : New State Mobile', 'pubg-new-state-mobile', 'PUBG : New State Mobile', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Call of Duty Mobile (Indonesia)', 'call-of-duty-mobile-indonesia', 'Call of Duty Mobile (Indonesia)', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Call of Duty MOBILE', 'call-of-duty-mobile', 'Call of Duty MOBILE', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Valorant', 'valorant', 'Valorant', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Point Blank', 'point-blank', 'Point Blank', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Blood Strike', 'blood-strike', 'Blood Strike', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Arena Breakout', 'arena-breakout', 'Arena Breakout', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Arena Breakout: Infinite (PC)', 'arena-breakout-infinite-pc', 'Arena Breakout: Infinite (PC)', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Delta Force', 'delta-force', 'Delta Force', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Farlight 84', 'farlight-84', 'Farlight 84', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Sausage Man', 'sausage-man', 'Sausage Man', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Super Sus', 'super-sus', 'Super Sus', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Metal Slug Awakening', 'metal-slug-awakening', 'Metal Slug Awakening', '', true, false, 5.0, true, NOW()), -- Zone usually needed? Assumed true for safe measure or check API

-- RPG / Open World
(gen_random_uuid(), 'Genshin Impact', 'genshin-impact', 'Genshin Impact', '', true, true, 3.0, true, NOW()), -- Server ID/Region needed
(gen_random_uuid(), 'Honkai Impact 3', 'honkai-impact-3', 'Honkai Impact 3', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Honkai Star Rail', 'honkai-star-rail', 'Honkai Star Rail', '', true, true, 3.0, true, NOW()),
(gen_random_uuid(), 'Zenless Zone Zero (ZZZ)', 'zenless-zone-zero', 'Zenless Zone Zero (ZZZ)', '', true, true, 5.0, true, NOW()),
(gen_random_uuid(), 'Ragnarok M', 'ragnarok-m-eternal-love-big-cat-coin', 'Ragnarok M', '', true, true, 5.0, true, NOW()), -- Often requires Server/Zone
(gen_random_uuid(), 'Ragnarok M Eternal Love (SEA)', 'ragnarok-m-eternal-love-sea', 'Ragnarok M Eternal Love (SEA)', '', true, true, 5.0, true, NOW()),
(gen_random_uuid(), 'Ragnarok Origin', 'ragnarok-origin', 'Ragnarok Origin', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'RagnaroK X Next Generation', 'ragnarok-x-next-generation', 'RagnaroK X Next Generation', '', true, true, 5.0, true, NOW()),
(gen_random_uuid(), 'Dragon Raja', 'dragon-raja', 'Dragon Raja', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Dragonheir Silent Gods', 'dragonheir-silent-gods', 'Dragonheir Silent Gods', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'LifeAfter', 'lifeafter', 'LifeAfter', '', true, true, 5.0, true, NOW()),
(gen_random_uuid(), 'Light of Thel: New Era', 'light-of-thel-new-era', 'Light of Thel: New Era', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Astral Guardians: Cyber Fantasy', 'astral-guardians-cyber-fantasy', 'Astral Guardians: Cyber Fantasy', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Watcher Of Realms', 'watcher-of-realms', 'Watcher Of Realms', '', true, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Whiteout Survival', 'whiteout-survival', 'Whiteout Survival', '', false, false, 5.0, true, NOW()),

-- MOBA / Strategy
(gen_random_uuid(), 'League of Legends: Wild Rift', 'league-of-legends-wild-rift', 'League of Legends: Wild Rift', '', true, false, 5.0, true, NOW()), -- ID#TAG usually
(gen_random_uuid(), 'League of Legends', 'league-of-legends', 'League of Legends', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Arena of Valor', 'arena-of-valor', 'Arena of Valor', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Honor of Kings Global', 'honor-of-kings-global', 'Honor of Kings Global', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Marvel Super War', 'marvel-super-war', 'Marvel Super War', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Marvel Rivals', 'marvel-rivals', 'Marvel Rivals', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Marvel Duel', 'marvel-duel', 'Marvel Duel', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Auto Chess', 'auto-chess', 'Auto Chess', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Magic Chess: Go Go', 'magic-chess-go-go', 'Magic Chess: Go Go', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Magic Chess: Go Go (Global)', 'magic-chess-go-go-global', 'Magic Chess: Go Go (Global)', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Clash of Clans', 'clash-of-clans', 'Clash of Clans', '', true, false, 5.0, true, NOW()), -- Tag
(gen_random_uuid(), 'Clash Royale', 'clash-royale', 'Clash Royale', '', true, false, 5.0, true, NOW()), -- Tag
(gen_random_uuid(), 'Brawl Stars', 'brawl-stars', 'Brawl Stars', '', true, false, 5.0, true, NOW()), -- Tag
(gen_random_uuid(), 'Lords Mobile', 'lords-mobile', 'Lords Mobile', '', true, false, 5.0, true, NOW()), -- IGG ID
(gen_random_uuid(), 'State of Survival: Zombie War', 'state-of-survival-zombie-war', 'State of Survival: Zombie War', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Age of Empires Mobile', 'age-of-empires-mobile', 'Age of Empires Mobile', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Castle Duels', 'castle-duels', 'Castle Duels', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'King of Avalon', 'king-of-avalon', 'King of Avalon', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'King Of Avalon', 'king-of-avalon-duplicate', 'King Of Avalon', '', false, false, 5.0, true, NOW()), -- Duplicate in source list?
(gen_random_uuid(), 'Dynasty Warriors: Overlords', 'dynasty-warriors-overlords', 'Dynasty Warriors: Overlords', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Conquer Online (Point Card)', 'conquer-online-point-card', 'Conquer Online (Point Card)', '', false, false, 5.0, true, NOW()),

-- Casual / Others
(gen_random_uuid(), 'Higgs Domino', 'higgs-domino', 'Higgs Domino', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Domino Gaple Boyaa Qiuqiu', 'domino-gaple-qiuqiu-boyaa', 'Domino Gaple Boyaa Qiuqiu', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Hago', 'hago', 'Hago', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Ludo Club', 'ludo-club', 'Ludo Club', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Zepeto', 'zepeto', 'Zepeto', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Roblox Via Login', 'roblox-via-login', 'Roblox Via Login', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Growtopia', 'growtopia', 'Growtopia', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Eggy Party', 'eggy-party', 'Eggy Party', '', true, false, 5.0, true, NOW()), -- Zone?
(gen_random_uuid(), 'Identity V', 'identity-v', 'Identity V', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Love and Deepspace', 'love-and-deepspace', 'Love and Deepspace', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Likee', 'likee', 'Likee', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Ace Racer', 'ace-racer', 'Ace Racer', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Speed Drifters', 'speed-drifters', 'Speed Drifters', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'AFK Journey', 'afk-journey', 'AFK Journey', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Be The King', 'be-the-king', 'Be The King', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Football Master 2', 'football-master-2', 'Football Master 2', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'EA SPORTS FC Mobile', 'ea-sports-fc-mobile', 'EA SPORTS FC Mobile', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'NBA Infinite (Europe)', 'nba-infinite-europe', 'NBA Infinite (Europe)', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'One Punch Man', 'one-punch-man', 'One Punch Man', '', true, false, 5.0, true, NOW()), -- Zone?
(gen_random_uuid(), 'Laplace M', 'laplace-m', 'Laplace M', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Tom and Jerry:chase', 'tom-and-jerry-chase', 'Tom and Jerry:chase', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Tom and Jerry Chase', 'tom-and-jerry-chase-duplicate', 'Tom and Jerry Chase', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Cocofun', 'cocofun', 'Cocofun', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), '8 Ball Pool', '8-ball-pool', '8 Ball Pool', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Bullet Angel', 'bullet-angel', 'Bullet Angel', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'IndoPlay', 'indoplay', 'IndoPlay', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Garena Undawn', 'garena-undawn', 'Garena Undawn', '', true, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Revelation Infinite Journey', 'revelation-infinite-journey', 'Revelation Infinite Journey', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Infinite Borders', 'infinite-borders', 'Infinite Borders', '', false, false, 5.0, true, NOW()),
(gen_random_uuid(), 'Warp Plus', 'warp-plus', 'Warp Plus', '', false, false, 5.0, true, NOW()),

-- Vouchers
(gen_random_uuid(), 'Steam Wallet Code', 'steam-wallet-code', 'Steam Wallet Code', '', false, false, 2.0, true, NOW()),
(gen_random_uuid(), 'Voucher Garena Shell', 'voucher-garena-shell', 'Voucher Garena Shell', '', false, false, 2.0, true, NOW()),
(gen_random_uuid(), 'Voucher Megaxus', 'voucher-megaxus', 'Voucher Megaxus', '', false, false, 2.0, true, NOW()),
(gen_random_uuid(), 'Voucher PB Zepetto', 'voucher-pb-zepetto', 'Voucher PB Zepetto', '', false, false, 2.0, true, NOW()),
(gen_random_uuid(), 'Voucher PSN', 'voucher-psn', 'Voucher PSN', '', false, false, 2.0, true, NOW()),
(gen_random_uuid(), 'Voucher Razer Gold', 'voucher-razer-gold', 'Voucher Razer Gold', '', false, false, 2.0, true, NOW()),
(gen_random_uuid(), 'Voucher Roblox', 'voucher-roblox', 'Voucher Roblox', '', false, false, 2.0, true, NOW()),
(gen_random_uuid(), 'Voucher Valorant', 'voucher-valorant', 'Voucher Valorant', '', false, false, 2.0, true, NOW())

ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "code" = EXCLUDED."code",
  "requiresZoneId" = EXCLUDED."requiresZoneId",
  "requiresServerId" = EXCLUDED."requiresServerId",
  "profitMargin" = EXCLUDED."profitMargin",
  "updatedAt" = NOW();
