-- Tambah role 'super_admin' ke sistem
-- Role ini untuk operator platform (bukan tenant/warung owner)
-- Set via script: node scripts/set-super-admin.js

-- Jika ada CHECK constraint pada kolom role, extend dulu
-- (Di Supabase biasanya role adalah TEXT tanpa constraint)
-- Migration ini hanya dokumentasi + index untuk lookup cepat

CREATE INDEX IF NOT EXISTS idx_users_role
  ON users (role);
