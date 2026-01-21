-- 1. Insert Categories
INSERT INTO categories (id, name, slug, image, "isActive", "updatedAt") VALUES
('cat_1', 'Mobile Legends', 'mobile-legends', 'https://cdn.iconscout.com/icon/free/png-256/free-mobile-legends-logo-icon-download-in-svg-png-gif-file-formats--ml-game-video-brands-and-logos-pack-icons-2673891.png', true, NOW()),
('cat_2', 'Free Fire', 'free-fire', 'https://logodownload.org/wp-content/uploads/2020/09/free-fire-logo-2.png', true, NOW()),
('cat_3', 'PUBG Mobile', 'pubg-mobile', 'https://upload.wikimedia.org/wikipedia/en/thumb/8/87/PUBG_Mobile_Logo.png/220px-PUBG_Mobile_Logo.png', true, NOW()),
('cat_4', 'Genshin Impact', 'genshin-impact', 'https://upload.wikimedia.org/wikipedia/en/thumb/5/5d/Genshin_Impact_logo.svg/1200px-Genshin_Impact_logo.svg.png', true, NOW());

-- 2. Insert Products (Matching Mock IDs 1, 2, 3, 4)
INSERT INTO products (id, sku_code, name, price_provider, price_sell, "categoryId", "isActive", "updatedAt") VALUES
('1', 'ML-5', '5 Diamonds', 1000, 1500, 'cat_1', true, NOW()),
('2', 'ML-10', '10 Diamonds', 2000, 3000, 'cat_1', true, NOW()),
('3', 'ML-50', '50 Diamonds', 12000, 14000, 'cat_1', true, NOW()),
('4', 'FF-100', '100 Diamonds', 13000, 15000, 'cat_2', true, NOW());
