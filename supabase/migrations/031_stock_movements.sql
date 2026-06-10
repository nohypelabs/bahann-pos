-- Stock Movements Audit Trail
-- Records every stock change with user attribution

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'ADJUSTMENT', 'RETURN', 'DAMAGED')),
  quantity INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id, created_at DESC);
CREATE INDEX idx_stock_movements_outlet ON stock_movements(outlet_id, created_at DESC);
CREATE INDEX idx_stock_movements_user ON stock_movements(user_id);
CREATE INDEX idx_stock_movements_created ON stock_movements(created_at DESC);

-- Enable RLS
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view movements for their tenant's products
CREATE POLICY stock_movements_select ON stock_movements
  FOR SELECT
  USING (
    outlet_id IN (
      SELECT id FROM outlets WHERE owner_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- RLS: Authenticated users can insert movements
CREATE POLICY stock_movements_insert ON stock_movements
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
