import bcrypt from 'bcryptjs'
import { UserRepository } from '@/domain/repositories/UserRepository'
import { User } from '@/domain/entities/User'
import { AppError } from '@/shared/exceptions/AppError'

export interface RegisterUserInput {
  id?: string
  email: string
  password: string
  name: string
  outletId?: string
  role?: string
  whatsappNumber: string
}

export interface RegisterUserOutput {
  userId: string
  email: string
  name: string
  whatsappNumber: string
}

export class RegisterUserUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    const normalizedEmail = input.email.toLowerCase()

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalizedEmail)) {
      throw new AppError('Invalid email format', 400)
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(normalizedEmail)
    if (existingUser) {
      throw new AppError('User with this email already exists', 409)
    }

    // Validate password strength (min 8 characters)
    if (input.password.length < 8) {
      throw new AppError('Password must be at least 8 characters long', 400)
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, 8)

    // Create user
    const user = User.create({
      id: input.id,
      email: normalizedEmail,
      name: input.name,
      passwordHash,
      outletId: input.outletId,
      role: input.role || 'user',
      tenantId: undefined,
      whatsappNumber: input.whatsappNumber,
    })
    const tenantScopedUser = User.create({
      id: user.id,
      email: user.email,
      name: user.name,
      passwordHash: user.passwordHash,
      outletId: user.outletId,
      role: user.role,
      tenantId: user.role === 'admin' ? user.id : user.tenantId,
      whatsappNumber: user.whatsappNumber,
    })

    // Save to database
    await this.userRepository.save(tenantScopedUser)

    return {
      userId: tenantScopedUser.id,
      email: tenantScopedUser.email,
      name: tenantScopedUser.name,
      whatsappNumber: tenantScopedUser.whatsappNumber!,
    }
  }
}
