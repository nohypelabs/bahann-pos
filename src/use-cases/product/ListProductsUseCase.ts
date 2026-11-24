import { type ProductRepository, type ProductFilters, type ProductRow } from '@/domain/repositories/ProductRepository';

export interface ListProductsInput {
  filters?: ProductFilters;
  page?: number;
  limit?: number;
}

export interface ListProductsOutput {
  products: ProductRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** PostgREST returns at most 1000 rows per request (Supabase's default max_rows). */
const PAGE_SIZE = 1000;
const MAX_PAGES = 20;

export class ListProductsUseCase {
  constructor(private readonly productRepo: ProductRepository) {}

  async execute(input: ListProductsInput): Promise<ListProductsOutput> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 50;
    const { data, total } = await this.productRepo.list(input.filters ?? {}, page, limit);
    return {
      products: data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Every matching product, for screens that search and scan on the client (the
   * POS, stock recording). Fetched in pages so a catalogue past the row cap of one
   * request is still complete.
   */
  async executeAll(filters: ProductFilters = {}): Promise<ListProductsOutput> {
    const products: ProductRow[] = [];
    let total = 0;
    for (let page = 1; page <= MAX_PAGES; page++) {
      const { data, total: count } = await this.productRepo.list(filters, page, PAGE_SIZE);
      total = count;
      products.push(...data);
      if (data.length < PAGE_SIZE || products.length >= total) break;
    }
    return {
      products,
      pagination: { page: 1, limit: Math.max(products.length, 1), total, totalPages: 1 },
    };
  }
}
