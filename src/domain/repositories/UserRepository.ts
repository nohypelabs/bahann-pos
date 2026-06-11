import { User } from '../entities/User'

export interface UserSummary {
  id: string
  email: string
  name: string
  outletId: string | null
  role: string | null
  createdAt: string
}

export interface UserRepository {
  save(user: User): Promise<void>
  findByEmail(email: string): Promise<User | null>
  findById(id: string): Promise<User | null>
  update(user: User): Promise<void>
  delete(id: string): Promise<void>
  updateProfileFields(id: string, fields: { name?: string; whatsappNumber?: string }): Promise<void>
  updatePassword(id: string, passwordHash: string): Promise<void>
  getPlan(userId: string): Promise<string>
  findByVerifyToken(token: string): Promise<{ id: string; email: string; name: string; emailVerifiedAt: string | null; plan: string } | null>
  activateTrial(userId: string): Promise<void>
  insertBillingHistory(data: { userId: string; plan: string; previousPlan: string; amount: number; note: string; isTrial: boolean; changedBy?: string }): Promise<void>
  activatePlan(userId: string, plan: string): Promise<void>
  updateVerifyToken(userId: string, token: string): Promise<void>
  getEmailVerificationStatus(userId: string): Promise<{ verified: boolean; plan: string }>
  updateRegistrationDetails(userId: string, outletId: string, verifyToken: string): Promise<void>
  getSuspensionStatus(userId: string): Promise<{ isSuspended: boolean; outletId: string | null; role: string | null }>
  isOwnerSuspended(outletId: string): Promise<boolean>
  findAll(params: { page: number; limit: number; search?: string }): Promise<{ users: UserSummary[]; total: number }>
}
