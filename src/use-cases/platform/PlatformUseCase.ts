import { TRPCError } from '@trpc/server';
import type {
  PlatformRepository,
  GlobalStats,
  TenantListParams,
  TenantSummary,
  TenantDetail,
  GrowthEntry,
} from '@/domain/repositories/PlatformRepository';
import { normalizeImageUpload } from '@/lib/security/imageUpload';

const ALLOWED_SETTINGS_KEYS = [
  'solana_wallet_address', 'solana_rpc_url',
  'bank_name', 'bank_account', 'bank_holder',
  'support_wa', 'qris_image_url',
];

export class PlatformUseCase {
  constructor(private readonly repo: PlatformRepository) {}

  async getGlobalStats(): Promise<GlobalStats> {
    return this.repo.getGlobalStats();
  }

  async listTenants(params: TenantListParams): Promise<{ tenants: TenantSummary[]; total: number }> {
    return this.repo.listTenants(params);
  }

  async getTenantDetail(tenantId: string): Promise<TenantDetail> {
    return this.repo.getTenantDetail(tenantId);
  }

  async suspendTenant(tenantId: string, suspend: boolean): Promise<void> {
    return this.repo.suspendTenant(tenantId, suspend);
  }

  async getGrowthChart(days: number): Promise<GrowthEntry[]> {
    return this.repo.getGrowthChart(days);
  }

  async getSettings(): Promise<Record<string, string>> {
    return this.repo.getSettings();
  }

  async updateSettings(input: Record<string, string>, updatedBy: string): Promise<void> {
    const entries = Object.entries(input)
      .filter(([k]) => ALLOWED_SETTINGS_KEYS.includes(k))
      .map(([key, value]) => ({ key, value, updatedBy }));

    if (entries.length === 0) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'No valid settings to update' });
    }

    return this.repo.updateSettings(entries);
  }

  async uploadQris(base64: string, _fileName: string, userId: string): Promise<string> {
    const qrisImage = normalizeImageUpload(base64, {
      label: 'Gambar QRIS',
      maxBytes: 2 * 1024 * 1024,
    });

    return this.repo.uploadQris(qrisImage, userId);
  }
}
