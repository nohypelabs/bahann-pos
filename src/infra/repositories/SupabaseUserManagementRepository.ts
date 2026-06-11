import {
  UserManagementRepository, UserRecord, BillingRecord,
} from '@/domain/repositories/UserManagementRepository';
import { supabaseAdmin } from '../supabase/server';

export class SupabaseUserManagementRepository implements UserManagementRepository {
  async findByOutletIds(outletIds: string[], ownerId: string): Promise<UserRecord[]> {
    let query = supabaseAdmin
      .from('users')
      .select('id, email, name, role, outlet_id, permissions, created_at')
      .order('created_at', { ascending: false });

    if (outletIds.length > 0) {
      query = query.or(`id.eq.${ownerId},outlet_id.in.(${outletIds.join(',')})`);
    } else {
      query = query.eq('id', ownerId);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch users: ${error.message}`);
    return (data as UserRecord[]) ?? [];
  }

  async findById(id: string): Promise<UserRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role, outlet_id, permissions, created_at')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data as UserRecord;
  }

  async getPlan(userId: string): Promise<string> {
    const { data } = await supabaseAdmin
      .from('users')
      .select('plan')
      .eq('id', userId)
      .single();

    return data?.plan ?? 'free';
  }

  async countByRoleAndOutletIds(role: string, outletIds: string[]): Promise<number> {
    const { count } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'estimated', head: true })
      .eq('role', role)
      .in('outlet_id', outletIds);

    return count ?? 0;
  }

  async updatePermissions(userId: string, permissions: Record<string, unknown>): Promise<void> {
    const { error } = await supabaseAdmin
      .from('users')
      .update({ permissions })
      .eq('id', userId);

    if (error) throw new Error(`Failed to update permissions: ${error.message}`);
  }

  async getPermissions(userId: string): Promise<{ permissions: Record<string, unknown>; role: string }> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('permissions, role')
      .eq('id', userId)
      .single();

    if (error) throw new Error(`User not found`);
    return { permissions: data.permissions ?? {}, role: data.role };
  }

  async updateRole(userId: string, role: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('users')
      .update({ role })
      .eq('id', userId);

    if (error) throw new Error(`Failed to update role: ${error.message}`);
  }

  async listAdmins(): Promise<UserRecord[]> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role, plan, created_at, outlet_id')
      .eq('role', 'admin')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data as UserRecord[]) ?? [];
  }

  async updatePlan(userId: string, plan: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('users')
      .update({ plan, is_trial: false })
      .eq('id', userId);

    if (error) throw new Error(error.message);
  }

  async insertBillingRecord(data: {
    userId: string;
    plan: string;
    previousPlan: string;
    amount: number;
    note?: string;
    isTrial: boolean;
    changedBy: string;
  }): Promise<void> {
    await supabaseAdmin.from('billing_history').insert({
      user_id: data.userId,
      plan: data.plan,
      previous_plan: data.previousPlan,
      amount: data.amount,
      note: data.note ?? null,
      is_trial: data.isTrial,
      changed_by: data.changedBy,
    });
  }

  async getBillingHistory(userId: string): Promise<BillingRecord[]> {
    const { data, error } = await supabaseAdmin
      .from('billing_history')
      .select('id, plan, previous_plan, amount, note, is_trial, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);
    return (data as BillingRecord[]) ?? [];
  }

  async createCashier(data: {
    email: string;
    name: string;
    passwordHash: string;
    whatsappNumber: string;
    outletId: string;
  }): Promise<UserRecord> {
    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert({
        email: data.email.toLowerCase(),
        name: data.name,
        password_hash: data.passwordHash,
        whatsapp_number: data.whatsappNumber,
        role: 'user',
        outlet_id: data.outletId,
      })
      .select('id, email, name, role, outlet_id, permissions, created_at')
      .single();

    if (error) throw new Error(`Gagal membuat akun kasir: ${error.message}`);
    return newUser as UserRecord;
  }

  async emailExists(email: string): Promise<boolean> {
    const { data } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    return !!data;
  }
}
