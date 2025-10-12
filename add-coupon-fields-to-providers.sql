-- Add coupon fields to providers table
-- Allows businesses to offer specific coupons to Bonita Forward users

-- 1. Add coupon_code field (e.g., "BONITA10", "COMMUNITY15")
ALTER TABLE providers 
ADD COLUMN IF NOT EXISTS coupon_code TEXT;

-- 2. Add coupon_discount field (e.g., "10% off", "$20 off", "Free consultation")
ALTER TABLE providers 
ADD COLUMN IF NOT EXISTS coupon_discount TEXT;

-- 3. Add coupon_description field (optional details about the coupon)
ALTER TABLE providers 
ADD COLUMN IF NOT EXISTS coupon_description TEXT;

-- 4. Add coupon_expires_at field (optional expiration date)
ALTER TABLE providers 
ADD COLUMN IF NOT EXISTS coupon_expires_at TIMESTAMPTZ;

-- 5. Create index for finding active coupons
CREATE INDEX IF NOT EXISTS idx_providers_active_coupons 
ON providers(coupon_code) 
WHERE coupon_code IS NOT NULL;

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'providers'
  AND column_name LIKE 'coupon%'
ORDER BY column_name;

