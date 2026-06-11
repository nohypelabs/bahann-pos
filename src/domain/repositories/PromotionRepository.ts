export interface Promotion {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: string;
  discount_amount: number | null;
  discount_percentage: number | null;
  min_purchase: number | null;
  max_discount: number | null;
  start_date: string | null;
  end_date: string | null;
  max_uses: number | null;
  max_uses_per_customer: number | null;
  uses_count: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export interface PromotionWithCreator extends Promotion {
  created_by_user: { id: string; name: string } | null;
}

export interface CreatePromotionData {
  code: string;
  name: string;
  description?: string;
  type: string;
  discountAmount?: number;
  discountPercentage?: number;
  minPurchase?: number;
  maxDiscount?: number;
  startDate?: string;
  endDate?: string;
  maxUses?: number;
  maxUsesPerCustomer?: number;
  createdBy: string;
}

export interface PromotionUsageStats {
  usage: Array<{
    id: string;
    promotion_id: string;
    transaction_id: string;
    user_id: string | null;
    discount_applied: number;
    created_at: string;
    transactions: { total_amount: number; created_at: string } | null;
  }>;
  totalUses: number;
  totalDiscount: number;
  totalRevenue: number;
}

export interface PromotionRepository {
  findByCodeAndOwner(code: string, ownerId: string): Promise<Promotion | null>;
  findByOwnerId(ownerId: string | null, filters?: { activeOnly?: boolean }): Promise<PromotionWithCreator[]>;
  findById(id: string): Promise<PromotionWithCreator | null>;
  create(data: CreatePromotionData): Promise<Promotion>;
  update(id: string, data: { isActive?: boolean; endDate?: string; maxUses?: number }): Promise<Promotion>;
  incrementUses(id: string): Promise<void>;
  countUsageByUser(promotionId: string, userId: string): Promise<number>;
  recordUsage(data: { promotionId: string; transactionId: string; userId?: string; discountApplied: number }): Promise<void>;
  getUsageStats(promotionId: string): Promise<PromotionUsageStats>;
}
