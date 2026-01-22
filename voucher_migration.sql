-- CreateEnum
CREATE TYPE "VoucherType" AS ENUM ('FIXED', 'PERCENTAGE');

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
CREATE UNIQUE INDEX "vouchers_code_key" ON "vouchers"("code");

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "transactions" ADD COLUMN "voucherCode" TEXT;

-- Seed Initial Voucher
INSERT INTO "vouchers" ("id", "code", "type", "amount", "minPurchase", "stock", "expiresAt", "updatedAt") VALUES
('uv_1', 'DISKON10', 'PERCENTAGE', 10, 50000, 100, '2025-12-31 23:59:59', CURRENT_TIMESTAMP),
('uv_2', 'HEMAT5000', 'FIXED', 5000, 20000, 50, '2025-12-31 23:59:59', CURRENT_TIMESTAMP);
