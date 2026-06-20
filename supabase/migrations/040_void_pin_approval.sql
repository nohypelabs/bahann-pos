-- Migration 040: PIN-based approval for void/refund
-- Adds pin_code column to users for kepala toko PIN verification

-- 1. Add pin_code column (bcrypt hash, 4-6 digit PIN)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS pin_code_hash varchar(255);

COMMENT ON COLUMN public.users.pin_code_hash IS 'Bcrypt hash of 4-6 digit PIN for approval verification (kepala toko)';

-- 2. Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_users_pin_code_hash
ON public.users(pin_code_hash)
WHERE pin_code_hash IS NOT NULL;

-- 3. Add pin_verified_at to transaction_approvals for audit trail
ALTER TABLE public.transaction_approvals
ADD COLUMN IF NOT EXISTS pin_verified_at timestamp with time zone;

COMMENT ON COLUMN public.transaction_approvals.pin_verified_at IS 'Timestamp when PIN was verified during approval';
