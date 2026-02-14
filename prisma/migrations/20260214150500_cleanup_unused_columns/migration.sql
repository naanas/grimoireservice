-- Drop unused columns
ALTER TABLE "transactions" 
DROP COLUMN IF EXISTS "admin_fee",
DROP COLUMN IF EXISTS "created_at",
DROP COLUMN IF EXISTS "payment_channel",
DROP COLUMN IF EXISTS "payment_method",
DROP COLUMN IF EXISTS "payment_no",
DROP COLUMN IF EXISTS "payment_trx_id",
DROP COLUMN IF EXISTS "payment_url",
DROP COLUMN IF EXISTS "provider_status",
DROP COLUMN IF EXISTS "provider_trx_id",
DROP COLUMN IF EXISTS "updated_at",
DROP COLUMN IF EXISTS "user_id";
