-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PAID', 'PROCESSING', 'SUCCESS', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('GAME_TOPUP', 'DEPOSIT');

-- CreateEnum
CREATE TYPE "VoucherType" AS ENUM ('FIXED', 'PERCENTAGE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "password" TEXT,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requiresZoneId" BOOLEAN NOT NULL DEFAULT false,
    "requiresServerId" BOOLEAN NOT NULL DEFAULT false,
    "code" TEXT,
    "profitMargin" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "sku_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_provider" DOUBLE PRECISION NOT NULL,
    "price_sell" DOUBLE PRECISION NOT NULL,
    "categoryId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "invoice" TEXT NOT NULL,
    "userId" TEXT,
    "guestContact" TEXT,
    "productId" TEXT,
    "targetId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'TOPUP',
    "zoneId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "adminFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "voucherCode" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT NOT NULL,
    "paymentUrl" TEXT,
    "paymentTrxId" TEXT,
    "paymentChannel" TEXT,
    "paymentNo" TEXT,
    "providerTrxId" TEXT,
    "providerStatus" TEXT,
    "sn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "vouchers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "VoucherType" NOT NULL DEFAULT 'FIXED',
    "amount" DOUBLE PRECISION NOT NULL,
    "minPurchase" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxDiscount" DOUBLE PRECISION,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phoneNumber_key" ON "users"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "categories_code_key" ON "categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_code_key" ON "products"("sku_code");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_invoice_key" ON "transactions"("invoice");

-- CreateIndex
CREATE UNIQUE INDEX "vouchers_code_key" ON "vouchers"("code");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
