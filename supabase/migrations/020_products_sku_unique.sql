-- Unique constraint on (sku, owner_id) required for bulk import upsert
-- Products with no SKU are excluded (NULL is not considered a duplicate)
ALTER TABLE products
  ADD CONSTRAINT products_sku_owner_id_unique UNIQUE (sku, owner_id);
