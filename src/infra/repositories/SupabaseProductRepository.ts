import { supabaseAdmin as supabase } from '../supabase/server';
import {
  type ProductRepository,
  type ProductFilters,
  type CreateProductData,
  type UpdateProductData,
  type ProductRow,
  type BulkResult,
} from '@/domain/repositories/ProductRepository';
import { Product } from '@/domain/entities/Product';
import type { ItemType } from '@/domain/catalog/value-objects/item-type';
import type { StockBehavior } from '@/domain/catalog/value-objects/stock-behavior';
import type { PricingModel } from '@/domain/catalog/value-objects/pricing-model';

export class SupabaseProductRepository implements ProductRepository {
  async getBySKU(sku: string, tenantId?: string): Promise<Product | null> {
    let query = supabase
      .from('products')
      .select('*')
      .eq('sku', sku);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query.single();

    if (error || !data) return null;

    return {
      id: data.id,
      sku: data.sku,
      barcode: data.barcode ?? undefined,
      name: data.name,
      category: data.category ?? undefined,
      price: data.price ?? undefined,
      createdAt: data.created_at ? new Date(data.created_at) : new Date(),
      itemType: data.item_type as ItemType,
      stockBehavior: data.stock_behavior as StockBehavior,
      pricingModel: data.pricing_model as PricingModel,
      pricingTiers: data.pricing_tiers ? JSON.parse(data.pricing_tiers as string) : undefined,
      durationMinutes: data.duration_minutes ?? undefined,
      imageUrl: data.image_url ?? undefined,
      image_url: data.image_url ?? undefined,
    };
  }

  async listAll(tenantId?: string): Promise<Product[]> {
    let query = supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to fetch products: ${error.message}`);

    return (data || []).map((row) => ({
      id: row.id,
      sku: row.sku,
      barcode: row.barcode ?? undefined,
      name: row.name,
      category: row.category ?? undefined,
      price: row.price ?? undefined,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      itemType: row.item_type as ItemType,
      stockBehavior: row.stock_behavior as StockBehavior,
      pricingModel: row.pricing_model as PricingModel,
      pricingTiers: row.pricing_tiers ? JSON.parse(row.pricing_tiers as string) : undefined,
      durationMinutes: row.duration_minutes ?? undefined,
      imageUrl: row.image_url ?? undefined,
      image_url: row.image_url ?? undefined,
    }));
  }

  async getById(id: string, tenantId?: string): Promise<ProductRow | null> {
    let query = supabase
      .from('products')
      .select('*')
      .eq('id', id);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query.single();

    if (error || !data) return null;
    return data as unknown as ProductRow;
  }

  async list(
    filters: ProductFilters,
    page: number,
    limit: number,
  ): Promise<{ data: ProductRow[]; total: number }> {
    const offset = (page - 1) * limit;

    let countQuery = supabase
      .from('products')
      .select('*', { count: 'estimated', head: true });

    let dataQuery = supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    if (filters.tenantId) {
      countQuery = countQuery.eq('tenant_id', filters.tenantId);
      dataQuery = dataQuery.eq('tenant_id', filters.tenantId);
    } else if (filters.ownerId) {
      countQuery = countQuery.eq('owner_id', filters.ownerId);
      dataQuery = dataQuery.eq('owner_id', filters.ownerId);
    }

    if (filters.search) {
      const searchFilter = `name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%,barcode.ilike.%${filters.search}%`;
      countQuery = countQuery.or(searchFilter);
      dataQuery = dataQuery.or(searchFilter);
    }

    if (filters.category) {
      countQuery = countQuery.eq('category', filters.category);
      dataQuery = dataQuery.eq('category', filters.category);
    }

    if (filters.itemType) {
      countQuery = countQuery.eq('item_type', filters.itemType);
      dataQuery = dataQuery.eq('item_type', filters.itemType);
    }

    if (filters.stockBehavior) {
      countQuery = countQuery.eq('stock_behavior', filters.stockBehavior);
      dataQuery = dataQuery.eq('stock_behavior', filters.stockBehavior);
    }

    const [{ count, error: countError }, { data, error: dataError }] = await Promise.all([
      countQuery,
      dataQuery,
    ]);

    if (countError) throw new Error(`Failed to count products: ${countError.message}`);
    if (dataError) throw new Error(`Failed to fetch products: ${dataError.message}`);

    return {
      data: (data || []) as unknown as ProductRow[],
      total: count || 0,
    };
  }

  async create(data: CreateProductData): Promise<ProductRow> {
    const { data: result, error } = await supabase
      .from('products')
      .insert({
        sku: data.sku,
        barcode: data.barcode || null,
        name: data.name,
        category: data.category || null,
        price: data.price || null,
        owner_id: data.ownerId,
        tenant_id: data.tenantId,
        item_type: data.itemType,
        stock_behavior: data.stockBehavior,
        pricing_model: data.pricingModel,
        pricing_tiers: data.pricingTiers || null,
        duration_minutes: data.durationMinutes || null,
        image_url: data.imageUrl ?? data.image_url ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create product: ${error.message}`);
    return result as unknown as ProductRow;
  }

  async update(id: string, data: UpdateProductData): Promise<ProductRow> {
    const updatePayload: Record<string, unknown> = {};

    if (data.sku !== undefined) updatePayload.sku = data.sku;
    if (data.barcode !== undefined) updatePayload.barcode = data.barcode || null;
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.category !== undefined) updatePayload.category = data.category || null;
    if (data.price !== undefined) updatePayload.price = data.price || null;
    if (data.itemType !== undefined) updatePayload.item_type = data.itemType;
    if (data.stockBehavior !== undefined) updatePayload.stock_behavior = data.stockBehavior;
    if (data.pricingModel !== undefined) updatePayload.pricing_model = data.pricingModel;
    if (data.pricingTiers !== undefined) updatePayload.pricing_tiers = data.pricingTiers || null;
    if (data.durationMinutes !== undefined) updatePayload.duration_minutes = data.durationMinutes || null;
    if (data.imageUrl !== undefined || data.image_url !== undefined) {
      updatePayload.image_url = data.imageUrl ?? data.image_url ?? null;
    }

    const { data: result, error } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update product: ${error.message}`);
    return result as unknown as ProductRow;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete product: ${error.message}`);
  }

  async bulkUpsert(products: CreateProductData[]): Promise<BulkResult> {
    const rows = products.map((p) => ({
      sku: p.sku,
      barcode: p.barcode || null,
      name: p.name,
      category: p.category || null,
      price: p.price || null,
      owner_id: p.ownerId,
      tenant_id: p.tenantId,
      item_type: p.itemType,
      stock_behavior: p.stockBehavior,
      pricing_model: p.pricingModel,
      pricing_tiers: p.pricingTiers || null,
      duration_minutes: p.durationMinutes || null,
    }));

    const CHUNK = 100;
    let inserted = 0;
    const skipped: string[] = [];

    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const { data, error } = await supabase
        .from('products')
        .upsert(chunk, { onConflict: 'sku,owner_id', ignoreDuplicates: false })
        .select('id');

      if (error) {
        chunk.forEach((r) => skipped.push(r.sku));
      } else {
        inserted += data?.length ?? 0;
      }
    }

    return { inserted, skipped };
  }

  async getCategories(tenantId?: string): Promise<string[]> {
    let query = supabase
      .from('products')
      .select('category')
      .not('category', 'is', null);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to fetch categories: ${error.message}`);

    return [...new Set((data || []).map((p) => p.category).filter(Boolean))] as string[];
  }

  async batchUpdateCategory(productIds: string[], category: string | null): Promise<number> {
    const { error } = await supabase
      .from('products')
      .update({ category: category || null })
      .in('id', productIds);

    if (error) throw new Error(`Failed to batch update: ${error.message}`);
    return productIds.length;
  }

  async batchDelete(productIds: string[]): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .in('id', productIds);

    if (error) throw new Error(`Failed to batch delete: ${error.message}`);
  }

  async getByIds(ids: string[], tenantId?: string): Promise<ProductRow[]> {
    let query = supabase
      .from('products')
      .select('*')
      .in('id', ids);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to fetch products: ${error.message}`);
    return (data || []) as unknown as ProductRow[];
  }

  async countTransactions(productId: string): Promise<number> {
    const { count, error } = await supabase
      .from('transaction_items')
      .select('*', { count: 'estimated', head: true })
      .eq('product_id', productId);

    if (error) throw new Error(`Failed to count transactions: ${error.message}`);
    return count || 0;
  }

  async countTransactionsByProducts(productIds: string[]): Promise<Map<string, number>> {
    const { data, error } = await supabase
      .from('transaction_items')
      .select('product_id')
      .in('product_id', productIds);

    if (error) throw new Error(`Failed to count transactions: ${error.message}`);

    const counts = new Map<string, number>();
    for (const row of data || []) {
      const pid = row.product_id as string;
      counts.set(pid, (counts.get(pid) || 0) + 1);
    }
    return counts;
  }
}
