-- 060: messages sent from the landing page contact form.
--
-- Written by the server (contact.submit, rate limited per IP) and read by the platform
-- superadmin on /admin/leads. Not tenant data: there is no tenant_id. RLS is on with no
-- policies and anon/authenticated have no grants, so only the service role can touch it.
--
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS public.contact_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic         TEXT NOT NULL CHECK (topic IN ('general', 'workshop', 'shop', 'partner')),
  name          TEXT NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 100),
  phone         TEXT CHECK (phone IS NULL OR length(phone) <= 30),
  business_name TEXT CHECK (business_name IS NULL OR length(business_name) <= 120),
  message       TEXT NOT NULL CHECK (length(btrim(message)) BETWEEN 1 AND 2000),
  status        TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed')),
  admin_note    TEXT CHECK (admin_note IS NULL OR length(admin_note) <= 1000),
  ip_address    TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  handled_at    TIMESTAMPTZ,
  handled_by    UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS contact_requests_status_created_idx
  ON public.contact_requests (status, created_at DESC);

ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contact_requests FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.contact_requests TO service_role;
