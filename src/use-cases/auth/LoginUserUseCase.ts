import bcrypt from 'bcryptjs'
import { UserRepository } from '@/domain/repositories/UserRepository'
import { AppError } from '@/shared/exceptions/AppError'
import { signJWT } from '@/lib/jwt'
import { createSession } from '@/lib/redis-upstash'

export interface LoginUserInput {
  email: string
  password: string
}

export interface LoginUserOutput {
  token: string
  user: {
    id: string
    email: string
    name: string
    outletId?: string
    role?: string
  }
}

export class LoginUserUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(input: LoginUserInput): Promise<LoginUserOutput> {
    // Find user by email
    const user = await this.userRepository.findByEmail(input.email.toLowerCase())
    if (!user) {
      throw new AppError('Invalid email or password', 401)
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash)
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401)
    }

    // Create JWT token (7 days expiry)
    const token = signJWT({
      userId: user.id,
      email: user.email,
      name: user.name,
      outletId: user.outletId,
      role: user.role,
    })

    // Create session in Redis (7 days TTL)
    await createSession(user.id, {
      email: user.email,
      name: user.name,
      outletId: user.outletId,
      role: user.role,
    })

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        outletId: user.outletId,
        role: user.role,
      },
    }
  }
}
