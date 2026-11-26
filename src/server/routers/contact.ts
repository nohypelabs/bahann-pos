import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, superAdminProcedure } from '../trpc'
import { supabaseAdmin } from '@/infra/supabase/server'
import { checkRateLimit, RateLimitPresets } from '@/lib/security/rateLimiter'

const TOPICS = ['general', 'workshop', 'shop', 'partner'] as const
const STATUSES = ['new', 'contacted', 'closed'] as const

function requestIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown'
  return req.headers.get('x-real-ip')?.trim() || 'unknown'
}

const optionalText = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : null))

/**
 * Messages from the landing page contact form. Anyone may send one (rate limited per IP,
 * with a hidden field that only bots fill in); only the platform superadmin reads them.
 */
export const contactRouter = router({
  submit: publicProcedure
    .input(z.object({
      topic: z.enum(TOPICS),
      name: z.string().trim().min(1).max(100),
      phone: optionalText(30),
      businessName: optionalText(120),
      message: z.string().trim().min(1).max(2000),
      /** Honeypot: hidden from people, so a value means a bot. */
      website: z.string().max(200).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Pretend success to bots so they do not retry with another field layout.
      if (input.website) return { ok: true }

      const ip = requestIp(ctx.req)
      const limit = await checkRateLimit(`contact:${ip}`, RateLimitPresets.CONTACT)
      if (!limit.allowed) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Terlalu banyak pesan terkirim. Coba lagi dalam 15 menit atau hubungi kami lewat WhatsApp.' })
      }

      const { error } = await supabaseAdmin.from('contact_requests').insert({
        topic: input.topic,
        name: input.name,
        phone: input.phone,
        business_name: input.businessName,
        message: input.message,
        ip_address: ip,
        user_agent: ctx.req.headers.get('user-agent')?.slice(0, 300) ?? null,
      })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Failed to save contact request: ${error.message}` })
      return { ok: true }
    }),

  list: superAdminProcedure
    .input(z.object({ status: z.enum(STATUSES).optional(), limit: z.number().int().min(1).max(500).default(200) }))
    .query(async ({ input }) => {
      let q = supabaseAdmin
        .from('contact_requests')
        .select('id, topic, name, phone, business_name, message, status, admin_note, created_at, handled_at')
        .order('created_at', { ascending: false })
        .limit(input.limit)
      if (input.status) q = q.eq('status', input.status)
      const [{ data, error }, counts] = await Promise.all([
        q,
        supabaseAdmin.from('contact_requests').select('status'),
      ])
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Failed to list contact requests: ${error.message}` })
      const byStatus = { new: 0, contacted: 0, closed: 0 } as Record<(typeof STATUSES)[number], number>
      for (const r of (counts.data ?? []) as { status: (typeof STATUSES)[number] }[]) byStatus[r.status] += 1
      return { rows: data ?? [], counts: byStatus }
    }),

  update: superAdminProcedure
    .input(z.object({ id: z.string().uuid(), status: z.enum(STATUSES), note: z.string().trim().max(1000).optional() }))
    .mutation(async ({ input, ctx }) => {
      const { error } = await supabaseAdmin
        .from('contact_requests')
        .update({
          status: input.status,
          ...(input.note !== undefined ? { admin_note: input.note || null } : {}),
          handled_at: input.status === 'new' ? null : new Date().toISOString(),
          handled_by: input.status === 'new' ? null : ctx.userId,
        })
        .eq('id', input.id)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Failed to update contact request: ${error.message}` })
      return { ok: true }
    }),
})
