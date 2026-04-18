import { UserRepository } from '@/domain/repositories/UserRepository'
import { User } from '@/domain/entities/User'
import { supabaseAdmin } from '../supabase/server'

export class SupabaseUserRepository implements UserRepository {
  async save(user: User): Promise<void> {
    const { error } = await supabaseAdmin.from('users').insert({
      id: user.id,
      email: user.email,
      name: user.name,
      password_hash: user.passwordHash,
      outlet_id: user.outletId,
      role: user.role,
      created_at: user.createdAt?.toISOString(),
      whatsapp_number: user.whatsappNumber,
    })

    if (error) {
      throw new Error(`Failed to save user: ${error.message}`)
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !data) {
      return null
    }

    return new User(
      data.id,
      data.email,
      data.name,
      data.password_hash,
      data.outlet_id || undefined,
      data.role || undefined,
      data.created_at ? new Date(data.created_at) : undefined,
      data.whatsapp_number || undefined
    )
  }

  async findById(id: string): Promise<User | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return null
    }

    return new User(
      data.id,
      data.email,
      data.name,
      data.password_hash,
      data.outlet_id || undefined,
      data.role || undefined,
      data.created_at ? new Date(data.created_at) : undefined,
      data.whatsapp_number || undefined
    )
  }

  async update(user: User): Promise<void> {
    const { error } = await supabaseAdmin
      .from('users')
      .update({
        email: user.email,
        name: user.name,
        password_hash: user.passwordHash,
        outlet_id: user.outletId,
        role: user.role,
      })
      .eq('id', user.id)

    if (error) {
      throw new Error(`Failed to update user: ${error.message}`)
    }
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabaseAdmin.from('users').delete().eq('id', id)

    if (error) {
      throw new Error(`Failed to delete user: ${error.message}`)
    }
  }
}
