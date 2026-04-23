-- Add deeplink persistence for ewallet checkout flows.
ALTER TABLE "transactions"
ADD COLUMN IF NOT EXISTS "paymentDeeplink" TEXT;
