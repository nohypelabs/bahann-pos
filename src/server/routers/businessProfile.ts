import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, adminProcedure } from '../trpc';
import { SupabaseBusinessProfileRepository } from '@/infra/repositories/SupabaseBusinessProfileRepository';
import { BusinessProfile, BUSINESS_TYPE_DEFAULTS } from '@/domain/entities/BusinessProfile';
import { BusinessType, BUSINESS_TYPES } from '@/domain/catalog/value-objects/business-type';
import { StockBehavior } from '@/domain/catalog/value-objects/stock-behavior';
import { AppError } from '@/shared/exceptions/AppError';
import { createAuditLog } from '@/lib/audit';

const profileRepo = new SupabaseBusinessProfileRepository();

export const businessProfileRouter = router({
  /**
   * Get current user's business profile
   */
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.session?.tenantId;
    if (tenantId) {
      return await profileRepo.findByTenantId(tenantId);
    }
    return await profileRepo.findByUserId(ctx.userId);
  }),

  /**
   * Setup business profile (first-time only)
   * Creates profile with defaults based on selected business type.
   */
  setup: adminProcedure
    .input(
      z.object({
        businessType: z.enum(BUSINESS_TYPES as [string, ...string[]]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.session?.tenantId;
      // Check if profile already exists
      const existing = tenantId
        ? await profileRepo.findByTenantId(tenantId)
        : await profileRepo.findByUserId(ctx.userId);

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A business profile already exists. Use update to change it.',
        });
      }

      const profile = BusinessProfile.createDefaults(
        ctx.userId,
        input.businessType as BusinessType,
        tenantId || undefined,
      );

      await profileRepo.save(profile);

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'CREATE',
        entityType: 'business_profile',
        entityId: profile.id,
        changes: {
          businessType: profile.businessType,
          enabledModules: profile.enabledModules,
        },
        metadata: { businessType: profile.businessType },
      });

      return profile;
    }),

  /**
   * Update business type (admin only)
   * Re-computes default modules based on new type.
   */
  update: adminProcedure
    .input(
      z.object({
        businessType: z.enum(BUSINESS_TYPES as [string, ...string[]]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.session?.tenantId;
      const existing = tenantId
        ? await profileRepo.findByTenantId(tenantId)
        : await profileRepo.findByUserId(ctx.userId);

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Business profile not found. Complete the setup first.',
        });
      }

      // Changing the type replaces the module set, so refuse a change that would
      // leave the tenant's own data contradicting the new type — tracked products
      // under a business type that does not track stock — rather than silently
      // orphaning them behind a validation rule that now forbids the combination.
      const nextDefaults = BUSINESS_TYPE_DEFAULTS[input.businessType as BusinessType];

      if (nextDefaults.defaultStockBehavior !== StockBehavior.TRACKED) {
        const { supabaseAdmin } = await import('@/infra/supabase/server');
        const { count, error: countError } = await supabaseAdmin
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId!)
          .eq('stock_behavior', StockBehavior.TRACKED);

        if (countError) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: countError.message });
        }

        if ((count ?? 0) > 0) {
          throw new AppError(
            `${count} product(s) still track stock. Set them to untracked before switching to a business type that does not track stock.`,
            409,
          );
        }
      }

      const newProfile = BusinessProfile.createDefaults(
        ctx.userId,
        input.businessType as BusinessType,
        tenantId || undefined,
      );
      // Preserve the original ID and keep tenantId
      const updated = new BusinessProfile(
        existing.id,
        ctx.userId,
        newProfile.businessType,
        newProfile.enabledModules,
        existing.createdAt,
        existing.tenantId || tenantId || undefined,
      );

      await profileRepo.update(updated);

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'UPDATE',
        entityType: 'business_profile',
        entityId: existing.id,
        changes: {
          before: { businessType: existing.businessType },
          after: { businessType: updated.businessType },
        },
        metadata: { action: 'update_business_type' },
      });

      return updated;
    }),
});
