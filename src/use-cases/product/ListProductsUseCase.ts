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
}
