CREATE TABLE public._migrations (
  id integer NOT NULL DEFAULT nextval('_migrations_id_seq'::regclass),
  filename text NOT NULL,
  applied_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email varchar(255) NOT NULL,
  action varchar(50) NOT NULL,
  entity_type varchar(50) NOT NULL,
  entity_id uuid,
  changes jsonb,
  metadata jsonb,
  ip_address varchar(45),
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  tenant_id uuid NOT NULL,
  outlet_id uuid,
  device_id uuid,
  shift_id uuid,
  actor_role_key text,
  actor_user_id uuid
);
CREATE TABLE public.bank_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bank_name varchar(100) NOT NULL,
  bank_code varchar(20),
  account_number varchar(50) NOT NULL,
  account_name varchar(255) NOT NULL,
  branch varchar(255),
  swift_code varchar(20),
  logo_url text,
  is_primary boolean DEFAULT false,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  tenant_id uuid
);
CREATE TABLE public.billing_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL DEFAULT 0,
  note text,
  is_trial boolean NOT NULL DEFAULT false,
  changed_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  tenant_id uuid
);
CREATE TABLE public.business_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_type business_type NOT NULL DEFAULT 'RETAIL'::business_type,
  enabled_modules jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  tenant_id uuid
);
CREATE TABLE public.cash_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  outlet_id uuid,
  opened_by uuid,
  opened_at timestamp with time zone NOT NULL,
  opening_cash numeric(15,2) NOT NULL,
  closed_by uuid,
  closed_at timestamp with time zone,
  closing_cash numeric(15,2),
  expected_cash numeric(15,2),
  actual_cash numeric(15,2),
  difference numeric(15,2),
  total_sales numeric(15,2),
  total_transactions integer,
  cash_sales numeric(15,2),
  card_sales numeric(15,2),
  transfer_sales numeric(15,2),
  ewallet_sales numeric(15,2),
  total_discount numeric(15,2),
  notes text,
  status varchar(20) DEFAULT 'open'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  tenant_id uuid NOT NULL
);
CREATE TABLE public.daily_sales (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid,
  outlet_id uuid,
  sale_date date NOT NULL,
  quantity_sold integer NOT NULL DEFAULT 0,
  revenue numeric(12,2) DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  tenant_id uuid NOT NULL
);
CREATE TABLE public.daily_stock (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid,
  outlet_id uuid,
  stock_date date NOT NULL,
  stock_awal integer,
  stock_in integer DEFAULT 0,
  stock_out integer DEFAULT 0,
  stock_akhir integer,
  created_at timestamp with time zone DEFAULT now(),
  tenant_id uuid NOT NULL
);
CREATE TABLE public.operational_expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  outlet_id uuid NOT NULL,
  user_id uuid NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  amount numeric(15,2) NOT NULL,
  receipt_url text,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  is_voided boolean DEFAULT false,
  voided_by uuid,
  voided_at timestamp with time zone,
  void_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  tenant_id uuid NOT NULL
);
CREATE TABLE public.outlet_group_members (
  outlet_group_id uuid NOT NULL,
  outlet_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE public.outlet_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE public.outlets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  owner_id uuid,
  tenant_id uuid NOT NULL
);
CREATE TABLE public.password_reset_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.payment_confirmations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  payment_id uuid,
  action varchar(50) NOT NULL,
  performed_by uuid,
  reason text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  tenant_id uuid
);
CREATE TABLE public.payment_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code varchar(50) NOT NULL,
  name varchar(100) NOT NULL,
  type varchar(50) NOT NULL,
  is_active boolean DEFAULT true,
  requires_confirmation boolean DEFAULT false,
  icon varchar(50),
  instructions text,
  account_details jsonb,
  fee_amount numeric(10,2) DEFAULT 0,
  fee_percentage numeric(5,2) DEFAULT 0,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.payment_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan varchar(20) NOT NULL,
  amount integer NOT NULL DEFAULT 0,
  payment_method varchar(30) NOT NULL DEFAULT 'bank_transfer'::character varying,
  proof_url text,
  status varchar(20) NOT NULL DEFAULT 'pending'::character varying,
  admin_note text,
  reviewed_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  crypto_amount numeric(20,6),
  crypto_token varchar(10),
  crypto_tx_hash text,
  unique_amount integer,
  tenant_id uuid
);
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  transaction_id uuid,
  payment_method_id uuid,
  amount numeric(15,2) NOT NULL,
  fee numeric(10,2) DEFAULT 0,
  reference_number varchar(100),
  payment_proof_url text,
  qris_content text,
  status varchar(50) DEFAULT 'pending'::character varying,
  confirmed_by uuid,
  confirmed_at timestamp with time zone,
  confirmation_notes text,
  customer_name varchar(255),
  customer_phone varchar(20),
  customer_email varchar(255),
  wa_message_id varchar(100),
  wa_status varchar(50),
  wa_sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  expired_at timestamp with time zone,
  tenant_id uuid
);
CREATE TABLE public.permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key text NOT NULL,
  description text,
  module text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE public.platform_settings (
  key varchar(100) NOT NULL,
  value text NOT NULL DEFAULT ''::text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);
CREATE TABLE public.pos_devices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  outlet_id uuid NOT NULL,
  name text NOT NULL,
  device_code text NOT NULL,
  status text NOT NULL DEFAULT 'active'::text,
  last_seen_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sku text NOT NULL,
  name text NOT NULL,
  category text,
  price numeric(10,2),
  created_at timestamp with time zone DEFAULT now(),
  reorder_point integer DEFAULT 10,
  reorder_quantity integer DEFAULT 20,
  lead_time_days integer DEFAULT 3,
  owner_id uuid,
  barcode text,
  item_type item_type NOT NULL DEFAULT 'PRODUCT'::item_type,
  stock_behavior stock_behavior NOT NULL DEFAULT 'TRACKED'::stock_behavior,
  pricing_model pricing_model NOT NULL DEFAULT 'FIXED'::pricing_model,
  pricing_tiers jsonb,
  duration_minutes integer,
  tenant_id uuid NOT NULL
);
CREATE TABLE public.promotions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code varchar(50) NOT NULL,
  name varchar(255) NOT NULL,
  description text,
  type varchar(50) NOT NULL,
  discount_amount numeric(15,2),
  discount_percentage numeric(5,2),
  min_purchase numeric(15,2),
  max_discount numeric(15,2),
  applicable_products ARRAY,
  applicable_categories ARRAY,
  buy_quantity integer,
  get_quantity integer,
  get_product_id uuid,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  is_active boolean DEFAULT true,
  max_uses integer,
  uses_count integer DEFAULT 0,
  max_uses_per_customer integer,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  tenant_id uuid
);
CREATE TABLE public.qris_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  merchant_name varchar(100) NOT NULL,
  merchant_city varchar(100) NOT NULL,
  merchant_id varchar(50) NOT NULL,
  merchant_category_code varchar(4) DEFAULT '5812'::character varying,
  postal_code varchar(10),
  country_code varchar(2) DEFAULT 'ID'::character varying,
  currency_code varchar(3) DEFAULT 'IDR'::character varying,
  tip_indicator varchar(2) DEFAULT '01'::character varying,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  tenant_id uuid
);
CREATE TABLE public.refresh_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token_hash varchar(255) NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  used_at timestamp with time zone,
  revoked_at timestamp with time zone,
  device_info jsonb,
  ip_address varchar(45)
);
CREATE TABLE public.role_permissions (
  role_id uuid NOT NULL,
  permission_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE public.roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid,
  key text NOT NULL,
  name text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE public.shifts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  outlet_id uuid NOT NULL,
  device_id uuid,
  cashier_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'open'::text,
  opening_cash numeric(14,2) NOT NULL DEFAULT 0,
  cash_sales numeric(14,2) NOT NULL DEFAULT 0,
  cash_refunds numeric(14,2) NOT NULL DEFAULT 0,
  cash_in numeric(14,2) NOT NULL DEFAULT 0,
  cash_out numeric(14,2) NOT NULL DEFAULT 0,
  expected_cash numeric(14,2),
  actual_cash numeric(14,2),
  cash_difference numeric(14,2),
  cashier_note text,
  manager_note text,
  opened_at timestamp with time zone NOT NULL DEFAULT now(),
  closed_at timestamp with time zone,
  submitted_at timestamp with time zone,
  approved_by uuid,
  approved_at timestamp with time zone
);
CREATE TABLE public.stock_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid,
  outlet_id uuid,
  alert_type varchar(50) NOT NULL,
  current_stock integer NOT NULL,
  reorder_point integer NOT NULL,
  is_acknowledged boolean DEFAULT false,
  acknowledged_by uuid,
  acknowledged_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  tenant_id uuid
);
CREATE TABLE public.stock_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  outlet_id uuid NOT NULL,
  user_id uuid NOT NULL,
  movement_type text NOT NULL,
  quantity integer NOT NULL,
  previous_stock integer NOT NULL,
  new_stock integer NOT NULL,
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  tenant_id uuid NOT NULL,
  reference_type text,
  reference_id uuid,
  notes text
);
CREATE TABLE public.tenants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text,
  status text NOT NULL DEFAULT 'active'::text,
  plan text NOT NULL DEFAULT 'free'::text,
  owner_user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE public.transaction_approvals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  outlet_id uuid NOT NULL,
  transaction_id uuid,
  shift_id uuid,
  action_type text NOT NULL,
  requested_by uuid NOT NULL,
  approved_by uuid,
  status text NOT NULL DEFAULT 'pending'::text,
  reason text NOT NULL,
  amount numeric(14,2),
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  decided_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE public.transaction_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  transaction_id uuid,
  product_id uuid,
  product_name varchar(255) NOT NULL,
  product_sku varchar(100),
  quantity integer NOT NULL,
  unit_price numeric(15,2) NOT NULL,
  line_total numeric(15,2) NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  tenant_id uuid NOT NULL
);
CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  transaction_id varchar(50) NOT NULL,
  outlet_id uuid,
  cashier_id uuid,
  status varchar(20) NOT NULL DEFAULT 'completed'::character varying,
  subtotal numeric(15,2) NOT NULL,
  discount_amount numeric(15,2) DEFAULT 0,
  tax_amount numeric(15,2) DEFAULT 0,
  total_amount numeric(15,2) NOT NULL,
  payment_method varchar(50) NOT NULL,
  amount_paid numeric(15,2) NOT NULL,
  change_amount numeric(15,2) DEFAULT 0,
  void_reason text,
  voided_by uuid,
  voided_at timestamp with time zone,
  refund_reason text,
  refunded_by uuid,
  refunded_at timestamp with time zone,
  refund_amount numeric(15,2),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  tenant_id uuid NOT NULL,
  device_id uuid,
  shift_id uuid
);
CREATE TABLE public.user_role_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role_id uuid NOT NULL,
  scope_type text NOT NULL,
  outlet_id uuid,
  outlet_group_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email varchar(255) NOT NULL,
  name varchar(255) NOT NULL,
  password_hash varchar(255) NOT NULL,
  outlet_id uuid,
  role varchar(50) DEFAULT 'user'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  permissions jsonb DEFAULT '{}'::jsonb,
  plan varchar(20) NOT NULL DEFAULT 'free'::character varying,
  whatsapp_number varchar(20),
  is_trial boolean NOT NULL DEFAULT false,
  trial_ends_at timestamp with time zone,
  email_verified_at timestamp with time zone,
  email_verify_token varchar(128),
  is_suspended boolean NOT NULL DEFAULT false,
  tenant_id uuid NOT NULL
);
CREATE TABLE public.wa_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  type varchar(50) NOT NULL,
  content text NOT NULL,
  variables jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  tenant_id uuid
);
