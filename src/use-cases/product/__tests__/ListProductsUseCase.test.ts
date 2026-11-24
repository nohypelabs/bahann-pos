import { ListProductsUseCase } from '@/use-cases/product/ListProductsUseCase';

const rows = (n: number, from = 0) => Array.from({ length: n }, (_, i) => ({ id: `p${from + i}` }));

describe('ListProductsUseCase.executeAll', () => {
  it('pages past the 1000-row cap until the whole catalogue is loaded', async () => {
    const list = jest.fn()
      .mockResolvedValueOnce({ data: rows(1000), total: 2300 })
      .mockResolvedValueOnce({ data: rows(1000, 1000), total: 2300 })
      .mockResolvedValueOnce({ data: rows(300, 2000), total: 2300 });
    const useCase = new ListProductsUseCase({ list } as never);

    const result = await useCase.executeAll({ tenantId: 't1' });

    expect(list).toHaveBeenCalledTimes(3);
    expect(list).toHaveBeenNthCalledWith(3, { tenantId: 't1' }, 3, 1000);
    expect(result.products).toHaveLength(2300);
    expect(result.pagination.total).toBe(2300);
  });

  it('makes one request for a small catalogue', async () => {
    const list = jest.fn().mockResolvedValue({ data: rows(900), total: 900 });
    const useCase = new ListProductsUseCase({ list } as never);

    expect((await useCase.executeAll()).products).toHaveLength(900);
    expect(list).toHaveBeenCalledTimes(1);
  });
});
