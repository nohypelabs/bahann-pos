import { AppError } from '@/shared/exceptions/AppError';
import type {
  ImpersonationRepository,
  ImpersonationSessionRow,
  TenantAdminTarget,
} from '@/domain/repositories/ImpersonationRepository';

/** How long a support session stays valid. Not extendable automatically. */
export const IMPERSONATION_TTL_MINUTES = 60;

export interface StartImpersonationCommand {
  impersonatorId: string;
  tenantId: string;
  reason: string;
  ipAddress?: string;
  userAgent?: string;
  /** Injectable for deterministic tests. */
  now?: Date;
}

export interface StartImpersonationResult {
  session: ImpersonationSessionRow;
  target: TenantAdminTarget;
  /** True when a stale open session had to be closed to start this one. */
  superseded: boolean;
}

export class StartImpersonationUseCase {
  constructor(private readonly repo: ImpersonationRepository) {}

  async execute(command: StartImpersonationCommand): Promise<StartImpersonationResult> {
    const reason = command.reason?.trim();
    if (!reason) {
      throw new AppError('Impersonation reason is required', 400);
    }

    const now = command.now ?? new Date();

    // A leftover open session can only ever be stale: an actively impersonating
    // superadmin cannot reach this use case at all, because superAdminProcedure
    // refuses impersonated sessions. Refusing with 409 therefore deadlocks the
    // operator whenever the overlay cookie is gone — a cleared browser, another
    // device, or a session created out-of-band — because the UI reads "not
    // impersonating" from the cookie while the row is still open. Supersede it
    // instead so the way out is always forward; both sessions stay in the trail.
    const existing = await this.repo.findActiveByImpersonator(command.impersonatorId, now.toISOString());
    if (existing) {
      await this.repo.endAllForImpersonator(command.impersonatorId, command.impersonatorId, 'superseded');
    }

    const target = await this.repo.findTenantAdmin(command.tenantId);
    if (!target) {
      throw new AppError('This tenant has no active admin account to impersonate', 404);
    }

    const expiresAt = new Date(now.getTime() + IMPERSONATION_TTL_MINUTES * 60 * 1000);

    const session = await this.repo.create({
      impersonatorId: command.impersonatorId,
      tenantId: target.tenantId,
      targetUserId: target.userId,
      reason,
      expiresAt: expiresAt.toISOString(),
      ipAddress: command.ipAddress,
      userAgent: command.userAgent,
    });

    return { session, target, superseded: existing !== null };
  }
}
