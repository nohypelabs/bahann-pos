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
}

export class StartImpersonationUseCase {
  constructor(private readonly repo: ImpersonationRepository) {}

  async execute(command: StartImpersonationCommand): Promise<StartImpersonationResult> {
    const reason = command.reason?.trim();
    if (!reason) {
      throw new AppError('Impersonation reason is required', 400);
    }

    const now = command.now ?? new Date();

    // One session at a time keeps the audit trail unambiguous and makes nested
    // impersonation impossible.
    const existing = await this.repo.findActiveByImpersonator(command.impersonatorId, now.toISOString());
    if (existing) {
      throw new AppError(
        'An impersonation session is already active. Exit it before starting another.',
        409,
      );
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

    return { session, target };
  }
}
