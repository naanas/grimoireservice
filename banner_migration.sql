-- CreateTable
CREATE TABLE "banners" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "imageUrl" TEXT NOT NULL,
    "linkUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- Seed Initial Data (Optional but helpful for testing)
INSERT INTO "banners" ("id", "title", "imageUrl", "isActive", "updatedAt") VALUES 
('banner_1', 'Grimoire Launch', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2670&auto=format&fit=crop', true, CURRENT_TIMESTAMP),
('banner_2', 'MLBB Promo', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=2565&auto=format&fit=crop', true, CURRENT_TIMESTAMP);
