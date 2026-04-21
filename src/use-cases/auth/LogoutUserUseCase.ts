import { deleteSession } from '@/lib/redis-upstash'

export interface LogoutUserInput {
  userId: string
}

export class LogoutUserUseCase {
  async execute(input: LogoutUserInput): Promise<void> {
    // Delete session from Redis
    await deleteSession(input.userId)
  }
}
