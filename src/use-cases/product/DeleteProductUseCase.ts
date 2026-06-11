import { type ProductRepository, type ProductRow } from '@/domain/repositories/ProductRepository';

export interface DeleteProductInput {
  id: string;
}

export class DeleteProductUseCase {
  constructor(private readonly productRepo: ProductRepository) {}

  async execute(input: DeleteProductInput): Promise<ProductRow> {
    const product = await this.productRepo.getById(input.id);
    if (!product) throw new Error('Product not found');

    const txCount = await this.productRepo.countTransactions(input.id);

    if (txCount > 0) {
      throw new Error(
        `Cannot delete "${product.name}" — it has ${txCount} transaction record(s). Products with sales history cannot be deleted.`,
      );
    }

    await this.productRepo.delete(input.id);
    return product;
  }
}
