import { Product } from '../entities/Product';

export interface ProductFilters {
  search?: string;
  category?: string;
  itemType?: string;
  stockBehavior?: string;
  ownerId?: string;
}

export interface BulkResult {
  inserted: number;
  skipped: string[];
}

export interface CreateProductData {
  sku: string;
  barcode?: string | null;
  name: string;
  category?: string | null;
  price?: number | null;
  ownerId: string;
  itemType: string;
  stockBehavior: string;
  pricingModel: string;
  pricingTiers?: string | null;
  durationMinutes?: number | null;
}

export interface UpdateProductData {
  sku?: string;
  barcode?: string | null;
  name?: string;
  category?: string | null;
  price?: number | null;
  itemType?: string;
  stockBehavior?: string;
  pricingModel?: string;
  pricingTiers?: string | null;
  durationMinutes?: number | null;
}

export interface ProductRow {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  category: string | null;
  price: number | null;
  owner_id: string | null;
  item_type: string;
  stock_behavior: string;
  pricing_model: string;
  pricing_tiers: unknown;
  duration_minutes: number | null;
  created_at?: string;
  [key: string]: unknown;
}

export interface ProductRepository {
  getBySKU(sku: string): Promise<Product | null>;
  listAll(): Promise<Product[]>;
  getById(id: string, ownerId?: string): Promise<ProductRow | null>;
  list(filters: ProductFilters, page: number, limit: number): Promise<{ data: ProductRow[]; total: number }>;
  create(data: CreateProductData): Promise<ProductRow>;
  update(id: string, data: UpdateProductData): Promise<ProductRow>;
  delete(id: string): Promise<void>;
  bulkUpsert(products: CreateProductData[]): Promise<BulkResult>;
  getCategories(ownerId?: string): Promise<string[]>;
  batchUpdateCategory(productIds: string[], category: string | null): Promise<number>;
  batchDelete(productIds: string[]): Promise<void>;
  getByIds(ids: string[]): Promise<ProductRow[]>;
  countTransactions(productId: string): Promise<number>;
  countTransactionsByProducts(productIds: string[]): Promise<Map<string, number>>;
}
