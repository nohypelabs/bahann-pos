import {
  PromotionRepository, Promotion, PromotionWithCreator,
  CreatePromotionData, PromotionUsageStats,
} from '@/domain/repositories/PromotionRepository';

export interface ValidatePromotionInput {
  code: string;
  cartTotal: number;
  userId?: string;
}

export interface ValidatePromotionResult {
  valid: true;
  discountAmount: number;
  promoId: string;
  promoName: string;
  promoCode: string;
}

export class PromotionUseCase {
  constructor(private readonly promoRepo: PromotionRepository) {}

  async validate(input: ValidatePromotionInput, ownerId: string): Promise<ValidatePromotionResult> {
    const promo = await this.promoRepo.findByCodeAndOwner(input.code, ownerId);
    if (!promo) throw new Error('Invalid promotion code');

    const now = new Date();
    if (promo.start_date && new Date(promo.start_date) > now) {
      throw new Error('Promotion has not started yet');
    }
    if (promo.end_date && new Date(promo.end_date) < now) {
      throw new Error('Promotion has expired');
    }
    if (promo.max_uses && promo.uses_count >= promo.max_uses) {
      throw new Error('Promotion usage limit reached');
    }

    if (input.userId && promo.max_uses_per_customer) {
      const count = await this.promoRepo.countUsageByUser(promo.id, input.userId);
      if (count >= promo.max_uses_per_customer) {
        throw new Error('You have reached the usage limit for this promotion');
      }
    }

    if (promo.min_purchase && input.cartTotal < promo.min_purchase) {
      throw new Error(`Minimum purchase of ${promo.min_purchase} required`);
    }

    let discountAmount = 0;
    if (promo.type === 'fixed') {
      discountAmount = promo.discount_amount || 0;
    } else if (promo.type === 'percentage') {
      discountAmount = (input.cartTotal * (promo.discount_percentage || 0)) / 100;
      if (promo.max_discount && discountAmount > promo.max_discount) {
        discountAmount = promo.max_discount;
      }
    }

    if (discountAmount > input.cartTotal) {
      discountAmount = input.cartTotal;
    }

    return {
      valid: true,
      discountAmount,
      promoId: promo.id,
      promoName: promo.name,
      promoCode: promo.code,
    };
  }

  async recordUsage(data: { promotionId: string; transactionId: string; userId?: string; discountApplied: number }): Promise<void> {
    await this.promoRepo.incrementUses(data.promotionId);
    await this.promoRepo.recordUsage(data);
  }

  async create(data: CreatePromotionData): Promise<Promotion> {
    return this.promoRepo.create(data);
  }

  async update(id: string, data: { isActive?: boolean; endDate?: string; maxUses?: number }): Promise<Promotion> {
    return this.promoRepo.update(id, data);
  }

  async list(ownerId: string | null, filters?: { activeOnly?: boolean }): Promise<PromotionWithCreator[]> {
    return this.promoRepo.findByOwnerId(ownerId, filters);
  }

  async getById(id: string, ownerId: string | null): Promise<PromotionWithCreator> {
    const promo = await this.promoRepo.findById(id);
    if (!promo) throw new Error('Promotion not found');
    if (ownerId && promo.created_by !== ownerId) throw new Error('Promotion not found');
    return promo;
  }

  async getUsageStats(promotionId: string): Promise<PromotionUsageStats> {
    return this.promoRepo.getUsageStats(promotionId);
  }
}
