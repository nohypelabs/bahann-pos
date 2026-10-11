-- Product image URL (Cloudinary CDN). Used by the products form and POS grid
-- since commit 25166d4, which shipped without a migration.
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;

NOTIFY pgrst, 'reload schema';
