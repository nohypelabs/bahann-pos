-- Migration: Modular POS — Multi-Business Type Architecture
-- Adds support for different business types (FNB, RETAIL, SERVICE, HYBRID)
-- and item types (PRODUCT, MENU, SERVICE, PACKAGE) with configurable stock behavior and pricing models.

-- ============================================================
-- 1. Create PostgreSQL enum types
-- ============================================================

CREATE TYPE business_type AS ENUM ('FNB', 'RETAIL', 'SERVICE', 'HYBRID');
CREATE TYPE item_type AS ENUM ('PRODUCT', 'MENU', 'SERVICE', 'PACKAGE');
CREATE TYPE stock_behavior AS ENUM ('TRACKED', 'UNTRACKED', 'CONSUMED');
CREATE TYPE pricing_model AS ENUM ('FIXED', 'TIERED', 'TIME_BASED');

-- ============================================================
-- 2. Business profiles table
-- ============================================================

CREATE TABLE IF NOT EXISTS business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_type business_type NOT NULL DEFAULT 'RETAIL',
  enabled_modules JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- ============================================================
-- 3. Add modular columns to products table
-- ============================================================

-- All defaults match existing behavior: PRODUCT + TRACKED + FIXED
-- Existing data is unaffected — backward compatible
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS item_type item_type NOT NULL DEFAULT 'PRODUCT',
  ADD COLUMN IF NOT EXISTS stock_behavior stock_behavior NOT NULL DEFAULT 'TRACKED',
  ADD COLUMN IF NOT EXISTS pricing_model pricing_model NOT NULL DEFAULT 'FIXED',
  ADD COLUMN IF NOT EXISTS pricing_tiers JSONB,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- ============================================================
-- 4. Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_products_item_type ON products(item_type);
CREATE INDEX IF NOT EXISTS idx_products_stock_behavior ON products(stock_behavior);
CREATE INDEX IF NOT EXISTS idx_business_profiles_user ON business_profiles(user_id);

-- ============================================================
-- 5. RLS for business_profiles
-- ============================================================

ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (same pattern as other tables)
-- No anon policies = anon key blocked

-- ============================================================
-- 6. Backfill existing admin users with RETAIL business profile
-- ============================================================

DO $$
DECLARE
  admin_rec RECORD;
BEGIN
  FOR admin_rec IN SELECT id FROM users WHERE role = 'admin' LOOP
    INSERT INTO business_profiles (user_id, business_type, enabled_modules)
    VALUES (admin_rec.id, 'RETAIL', '["inventory"]'::jsonb)
    ON CONFLICT (user_id) DO NOTHING;
  END LOOP;
END $$;
