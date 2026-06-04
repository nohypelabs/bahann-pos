import { SupabaseDailySaleRepository } from './repositories/SupabaseDailySaleRepository';
import { SupabaseDailyStockRepository } from './repositories/SupabaseDailyStockRepository';
import { SupabaseBusinessProfileRepository } from './repositories/SupabaseBusinessProfileRepository';
import { RecordDailySaleUseCase } from '@/use-cases/sale/RecordDailySaleUseCase';
import { RecordDailyStockUseCase } from '@/use-cases/stock/RecordDailyStockUseCase';
import { StockService } from '@/domain/services/StockService';
import { PricingService } from '@/domain/services/PricingService';

// Dependency Injection Container
export const container = {
  saleUseCase: () => {
    const repo = new SupabaseDailySaleRepository();
    return new RecordDailySaleUseCase(repo);
  },
  stockUseCase: () => {
    const repo = new SupabaseDailyStockRepository();
    return new RecordDailyStockUseCase(repo);
  },
  businessProfileRepo: () => new SupabaseBusinessProfileRepository(),
  stockService: () => StockService,
  pricingService: () => PricingService,
};
