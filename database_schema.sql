-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUMs
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PAID', 'PROCESSING', 'SUCCESS', 'FAILED', 'EXPIRED');

-- Create Users Table
CREATE TABLE "users" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4(),
    "email" TEXT NOT NULL,
    "password" TEXT,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Create Unique Index for Email
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- Create Categories Table
CREATE TABLE "categories" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- Create Unique Index for Slug
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- Create Products Table
CREATE TABLE "products" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4(),
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

-- Create Unique Index for SKU Code
CREATE UNIQUE INDEX "products_sku_code_key" ON "products"("sku_code");

-- Create Transactions Table
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4(),
    "invoice" TEXT NOT NULL,
    "userId" TEXT,
    "guestContact" TEXT,
    "productId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetNickname" TEXT,   -- Disimpan hasil validasi nickname (audit check)
    "zoneId" TEXT,
    "sn" TEXT,               -- Serial Number / Bukti Topup dari Provider
    "amount" DOUBLE PRECISION NOT NULL, -- Harga Jual ke User
    "purchasePrice" DOUBLE PRECISION NOT NULL DEFAULT 0, -- Harga Beli dari Provider (saat transaksi terjadi)
    "adminFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT NOT NULL,
    "paymentUrl" TEXT,
    "paymentTrxId" TEXT,
    "providerTrxId" TEXT,
    "providerStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- Create Unique Index for Invoice
CREATE UNIQUE INDEX "transactions_invoice_key" ON "transactions"("invoice");

-- Add Foreign Keys
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
