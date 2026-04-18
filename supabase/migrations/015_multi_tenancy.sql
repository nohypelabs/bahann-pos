-- Migration: Multi-tenancy isolation
-- Add owner_id to outlets and products so each tenant's data is isolated

ALTER TABLE outlets
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Assign existing outlets and products to the first admin user
DO $$
DECLARE
  first_admin_id UUID;
BEGIN
  SELECT id INTO first_admin_id FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1;
  IF first_admin_id IS NOT NULL THEN
    UPDATE outlets SET owner_id = first_admin_id WHERE owner_id IS NULL;
    UPDATE products SET owner_id = first_admin_id WHERE owner_id IS NULL;
  END IF;
END $$;
