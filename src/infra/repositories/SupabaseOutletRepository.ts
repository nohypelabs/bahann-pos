import { OutletRepository, OutletRecord, OutletListParams } from '@/domain/repositories/OutletRepository';
import { supabaseAdmin } from '../supabase/server';

export class SupabaseOutletRepository implements OutletRepository {
  async findByOwnerId(ownerId: string, params?: OutletListParams): Promise<{ outlets: OutletRecord[]; total: number }> {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 50;
    const offset = (page - 1) * limit;

    let countQuery = supabaseAdmin
      .from('outlets')
      .select('*', { count: 'estimated', head: true })
      .eq('owner_id', ownerId);

    let dataQuery = supabaseAdmin
      .from('outlets')
      .select('*')
      .eq('owner_id', ownerId)
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    if (params?.search) {
      const searchFilter = `name.ilike.%${params.search}%,address.ilike.%${params.search}%`;
      countQuery = countQuery.or(searchFilter);
      dataQuery = dataQuery.or(searchFilter);
    }

    const [{ count, error: countError }, { data, error: dataError }] = await Promise.all([
      countQuery,
      dataQuery,
    ]);

    if (countError) throw new Error(`Failed to count outlets: ${countError.message}`);
    if (dataError) throw new Error(`Failed to fetch outlets: ${dataError.message}`);

    return { outlets: (data as OutletRecord[]) ?? [], total: count ?? 0 };
  }

  async findById(id: string): Promise<OutletRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('outlets')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data as OutletRecord;
  }

  async findByIdAndOwner(id: string, ownerId: string): Promise<OutletRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('outlets')
      .select('*')
      .eq('id', id)
      .eq('owner_id', ownerId)
      .single();

    if (error || !data) return null;
    return data as OutletRecord;
  }

  async findIdsByOwnerId(ownerId: string): Promise<string[]> {
    const { data } = await supabaseAdmin
      .from('outlets')
      .select('id')
      .eq('owner_id', ownerId);

    return data?.map(o => o.id) ?? [];
  }

  async create(data: { name: string; ownerId: string }): Promise<OutletRecord> {
    const { data: outlet, error } = await supabaseAdmin
      .from('outlets')
      .insert({ name: data.name, owner_id: data.ownerId })
      .select()
      .single();

    if (error) throw new Error(`Failed to create outlet: ${error.message}`);
    return outlet as OutletRecord;
  }

  async update(id: string, data: { name: string }): Promise<OutletRecord> {
    const { data: outlet, error } = await supabaseAdmin
      .from('outlets')
      .update({ name: data.name })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update outlet: ${error.message}`);
    return outlet as OutletRecord;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('outlets')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete outlet: ${error.message}`);
  }

  async countByOwnerId(ownerId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from('outlets')
      .select('*', { count: 'estimated', head: true })
      .eq('owner_id', ownerId);

    if (error) throw new Error(`Failed to count outlets: ${error.message}`);
    return count ?? 0;
  }
}
