import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, adminProcedure } from '../trpc';
import { SupabaseBusinessProfileRepository } from '@/infra/repositories/SupabaseBusinessProfileRepository';
import { BusinessProfile } from '@/domain/entities/BusinessProfile';
import { BusinessType, BUSINESS_TYPES } from '@/domain/catalog/value-objects/business-type';
import { DomainException } from '@/domain/errors/DomainException';
import { createAuditLog } from '@/lib/audit';

const profileRepo = new SupabaseBusinessProfileRepository();

export const businessProfileRouter = router({
  /**
   * Get current user's business profile
   */
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    const profile = await profileRepo.findByUserId(ctx.userId);
    return profile;
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
      // Check if profile already exists
      const existing = await profileRepo.findByUserId(ctx.userId);
      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Profil bisnis sudah ada. Gunakan update untuk mengubah.',
        });
      }

      const profile = BusinessProfile.createDefaults(
        ctx.userId,
        input.businessType as BusinessType,
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
      const existing = await profileRepo.findByUserId(ctx.userId);
      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Profil bisnis tidak ditemukan. Lakukan setup terlebih dahulu.',
        });
      }

      const newProfile = BusinessProfile.createDefaults(
        ctx.userId,
        input.businessType as BusinessType,
      );
      // Preserve the original ID
      const updated = new BusinessProfile(
        existing.id,
        ctx.userId,
        newProfile.businessType,
        newProfile.enabledModules,
        existing.createdAt,
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
