import bcrypt from 'bcryptjs'
import { UserRepository } from '@/domain/repositories/UserRepository'
import { AppError } from '@/shared/exceptions/AppError'
import { signJWT } from '@/lib/jwt'

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
    tenantId?: string
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

    const isSelfRegisteredOwner = user.role === 'admin' && user.tenantId === user.id
    if (isSelfRegisteredOwner) {
      const verificationStatus = await this.userRepository.getEmailVerificationStatus(user.id)
      if (!verificationStatus.verified) {
        throw new AppError('Email belum diverifikasi. Cek inbox Anda sebelum login.', 403)
      }
    }

    // Create JWT token (30 min expiry — use refresh token for renewal)
    const token = signJWT({
      userId: user.id,
      email: user.email,
      name: user.name,
      outletId: user.outletId,
      role: user.role,
      tenantId: user.tenantId,
    })

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        outletId: user.outletId,
        role: user.role,
        tenantId: user.tenantId,
      },
    }
  }
}
