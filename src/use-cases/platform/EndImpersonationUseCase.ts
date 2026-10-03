import { AppError } from '@/shared/exceptions/AppError';
import type {
  ImpersonationRepository,
  ImpersonationHistoryEntry,
  ListImpersonationParams,
} from '@/domain/repositories/ImpersonationRepository';

export interface EndImpersonationCommand {
  sessionId: string;
  endedBy: string;
  endReason?: string;
}

export class EndImpersonationUseCase {
  constructor(private readonly repo: ImpersonationRepository) {}

  async execute(command: EndImpersonationCommand): Promise<void> {
    const session = await this.repo.findById(command.sessionId);
    if (!session) {
      throw new AppError('Impersonation session not found', 404);
    }

    // Already closed: treat as success so the exit control always works, even if
    // it is clicked twice or the session expired on its own.
    if (session.endedAt) return;

    await this.repo.end(command.sessionId, command.endedBy, command.endReason);
  }

  /**
   * Closes every open session for a superadmin. Used on logout so a session can
   * never silently resume on the next sign-in from the same browser.
   */
  async endAllFor(impersonatorId: string, endedBy: string, endReason?: string): Promise<number> {
    return this.repo.endAllForImpersonator(impersonatorId, endedBy, endReason);
  }
}

export class ListImpersonationHistoryUseCase {
  constructor(private readonly repo: ImpersonationRepository) {}

  async execute(params: ListImpersonationParams): Promise<{
    sessions: ImpersonationHistoryEntry[];
    total: number;
  }> {
    return this.repo.listHistory(params);
  }
}
