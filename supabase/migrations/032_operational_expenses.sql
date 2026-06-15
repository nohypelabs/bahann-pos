-- Operational Expenses (Pengeluaran Operasional Harian)
-- Kasir records daily expenses, admin can void

CREATE TABLE IF NOT EXISTS operational_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN (
    'listrik', 'air', 'gaji', 'belanja_bahan', 'perbaikan',
    'transport', 'sewa', 'lainnya'
  )),
  description TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  receipt_url TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_voided BOOLEAN DEFAULT false,
  voided_by UUID REFERENCES users(id),
  voided_at TIMESTAMPTZ,
  void_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_expenses_outlet_date ON operational_expenses(outlet_id, expense_date DESC);
CREATE INDEX idx_expenses_user_date ON operational_expenses(user_id, expense_date DESC);
CREATE INDEX idx_expenses_date ON operational_expenses(expense_date DESC);
CREATE INDEX idx_expenses_category ON operational_expenses(category);
CREATE INDEX idx_expenses_created ON operational_expenses(created_at DESC);

-- Enable RLS
ALTER TABLE operational_expenses ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view/insert expenses for their tenant's outlets
CREATE POLICY expenses_select ON operational_expenses
  FOR SELECT
  USING (
    outlet_id IN (
      SELECT o.id FROM outlets o
      WHERE o.owner_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

CREATE POLICY expenses_insert ON operational_expenses
  FOR INSERT
  WITH CHECK (
    outlet_id IN (
      SELECT o.id FROM outlets o
      WHERE o.owner_id = auth.uid()
    )
    OR user_id IN (
      SELECT u.id FROM users u
      JOIN outlets o ON u.outlet_id = o.id
      WHERE o.owner_id = auth.uid()
    )
  );

CREATE POLICY expenses_update ON operational_expenses
  FOR UPDATE
  USING (
    outlet_id IN (
      SELECT o.id FROM outlets o
      WHERE o.owner_id = auth.uid()
    )
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_expenses_updated_at
  BEFORE UPDATE ON operational_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_expenses_updated_at();

-- RPC: Daily summary by category
CREATE OR REPLACE FUNCTION get_daily_expense_summary(
  p_outlet_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  category TEXT,
  total NUMERIC,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    oe.category,
    SUM(oe.amount) as total,
    COUNT(*) as count
  FROM operational_expenses oe
  WHERE oe.outlet_id = p_outlet_id
    AND oe.expense_date = p_date
    AND oe.is_voided = false
  GROUP BY oe.category
  ORDER BY total DESC;
END;
$$ LANGUAGE plpgsql;
