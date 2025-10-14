-- Add coupon fields to the 'providers' table
-- These fields enable businesses to display exclusive coupons to customers

ALTER TABLE public.providers
ADD COLUMN IF NOT EXISTS coupon_code TEXT,
ADD COLUMN IF NOT EXISTS coupon_discount TEXT,
ADD COLUMN IF NOT EXISTS coupon_description TEXT,
ADD COLUMN IF NOT EXISTS coupon_expires_at TIMESTAMPTZ;

-- Add comments for clarity
COMMENT ON COLUMN public.providers.coupon_code IS 'The coupon code that customers can use (e.g., "SAVE20", "WELCOME10")';
COMMENT ON COLUMN public.providers.coupon_discount IS 'The discount description shown to customers (e.g., "20% Off", "Free Consultation")';
COMMENT ON COLUMN public.providers.coupon_description IS 'Additional details about the coupon offer';
COMMENT ON COLUMN public.providers.coupon_expires_at IS 'When the coupon expires (optional)';

-- Add indexes for performance (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_providers_coupon_code ON public.providers(coupon_code) WHERE coupon_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_providers_coupon_expires ON public.providers(coupon_expires_at) WHERE coupon_expires_at IS NOT NULL;