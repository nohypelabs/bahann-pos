'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { MotionConfig, motion } from 'framer-motion'
import { BarChart3, MessageCircle, ScanBarcode, Wrench } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { supportWhatsAppLink } from '@/lib/contact'

// The login and sign-up pages share this frame. Phones get a plain white page (lg:hidden parts);
// from lg up the form sits on a glass card over a Laku teal backdrop, next to a dark panel about
// the product. /setup uses the same backdrop and card.

/** Pill field: light on phones, dark translucent on the desktop glass. */
export const authFieldClass = `w-full rounded-lg border px-5 py-3 text-sm outline-none transition
  border-[#E4E6E7] bg-white text-[#17201D] placeholder:text-[#9AA19B]
  focus:border-[#0F5F56] focus:ring-4 focus:ring-[#0F5F56]/10
  lg:border-white/15 lg:bg-black/25 lg:text-white lg:placeholder:text-white/45
  lg:focus:border-[#F2B55A]/70 lg:focus:ring-[#F2B55A]/15`

export const authLabelClass = 'block text-sm font-medium text-[#2F3A35] lg:text-white/80'

export const authPrimaryButtonClass = `w-full rounded-lg bg-[#0F5F56] py-3.5 text-sm font-semibold text-white transition
  hover:bg-[#0C4D46] disabled:cursor-not-allowed disabled:opacity-60
  lg:bg-gradient-to-r lg:from-[#F6C979] lg:to-[#E9A23B] lg:text-[#17201D]
  lg:shadow-[0_10px_30px_-10px_rgba(233,162,59,0.7)] lg:hover:brightness-105`

export const authSecondaryButtonClass = `w-full rounded-lg border py-3.5 text-sm font-semibold transition
  border-[#E4E6E7] bg-white text-[#17201D] hover:bg-[#F8F9F9]
  lg:border-white/20 lg:bg-white/5 lg:text-white lg:hover:bg-white/10`

export const authLinkClass = 'font-semibold text-[#0F5F56] hover:underline lg:text-[#F6C979]'

/** Masuk | Daftar switch shown on phones. */
export function AuthTabs({ active }: { active: 'login' | 'register' }) {
  const { t } = useLanguage()
  const tab = (key: 'login' | 'register', href: string, label: string) => key === active
    ? <span role="tab" aria-selected className="rounded-md bg-[#0F5F56] py-2.5 text-center text-sm font-semibold text-white shadow-sm">{label}</span>
    : <Link role="tab" aria-selected={false} href={href} className="rounded-md py-2.5 text-center text-sm font-semibold text-[#5F675F] hover:text-[#17201D]">{label}</Link>
  return (
    <div className="mb-6 grid grid-cols-2 rounded-lg bg-[#F3F4F4] p-1 lg:hidden" role="tablist">
      {tab('login', '/login', t('login.tabLogin'))}
      {tab('register', '/register', t('login.tabRegister'))}
    </div>
  )
}

export function AuthHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
      <img src="/logo.svg" alt="Laku POS" className="mb-6 h-10 w-10 lg:hidden" />
      {/* The glass card is dark from lg up: the white mark keeps its contrast there. */}
      <img src="/logo-light.svg" alt="Laku POS" className="mb-10 hidden h-10 w-10 lg:block" />
      <h1 className="text-[26px] font-bold tracking-tight text-[#17201D] lg:text-4xl lg:text-white">{title}</h1>
      <p className="mt-1.5 text-sm text-[#5F675F] lg:text-base lg:text-white/70">{subtitle}</p>
    </div>
  )
}

function ProductPanel() {
  const { t } = useLanguage()
  const features = [
    { icon: <Wrench />, title: t('login.hero.f1'), body: t('login.hero.f1Body') },
    { icon: <ScanBarcode />, title: t('login.hero.f2'), body: t('login.hero.f2Body') },
    { icon: <BarChart3 />, title: t('login.hero.f3'), body: t('login.hero.f3Body') },
  ]
  return (
    <div className="relative hidden min-h-[600px] flex-col overflow-hidden rounded-2xl bg-[#04201D]/85 p-10 text-white lg:flex">
      <div aria-hidden className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-[#1E9E8A] opacity-40 blur-[90px]" />
      <svg aria-hidden viewBox="0 0 200 200" className="absolute -right-6 bottom-24 h-64 w-64 text-[#5FB3A6]/50">
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * Math.PI) / 6
          return <line key={i} x1="100" y1="100" x2={100 + Math.cos(a) * 95} y2={100 + Math.sin(a) * 95} stroke="currentColor" strokeWidth="1.2" />
        })}
        <circle cx="100" cy="100" r="4" fill="currentColor" />
      </svg>

      <h2 className="relative max-w-sm text-[34px] font-bold leading-tight tracking-tight">{t('login.hero.title')}</h2>
      <p className="relative mt-3 max-w-sm text-sm text-white/65">{t('login.hero.body')}</p>

      <ul className="relative mt-8 space-y-5">
        {features.map((f) => (
          <li key={f.title} className="flex gap-3.5">
            <span className="mt-0.5 shrink-0 text-[#F6C979] [&>svg]:h-5 [&>svg]:w-5 [&>svg]:stroke-[1.75]">{f.icon}</span>
            <div>
              <p className="text-sm font-semibold">{f.title}</p>
              <p className="text-sm text-white/60">{f.body}</p>
            </div>
          </li>
        ))}
      </ul>

      {/* A small preview of the dashboard, as the picture for this panel */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.25, ease: 'easeOut' }}
        className="relative mt-auto ml-auto w-72 rounded-xl border border-white/40 bg-white/90 p-5 text-[#17201D] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6)] backdrop-blur-xl"
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-[#5F675F]">{t('login.hero.revenueToday')}</p>
          <span className="text-[11px] text-[#8A9188]">{t('login.hero.sample')}</span>
        </div>
        <p className="mt-1 text-2xl font-bold tabular-nums">Rp 1.250.000</p>
        <p className="mt-1 text-xs text-[#5F675F]">
          <span className="mr-1 font-semibold text-[#0F5F56]">+12%</span>
          {t('login.hero.vsYesterday')}
        </p>
        <div className="mt-4 flex h-14 items-end gap-1.5">
          {[38, 52, 30, 64, 48, 80, 100].map((h, i) => (
            <motion.span key={i} className={`flex-1 rounded-[4px] ${i === 6 ? 'bg-[#0F5F56]' : 'bg-[#BFE3DA]'}`}
              initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ duration: 0.5, delay: 0.4 + i * 0.04, ease: 'easeOut' }} />
          ))}
        </div>
      </motion.div>
    </div>
  )
}

const SUPPORT_WHATSAPP = supportWhatsAppLink('Halo, saya butuh bantuan dengan Laku POS.')

function AuthFooter() {
  const { t } = useLanguage()
  const links = [
    { href: '/#fitur', label: t('auth.footer.features') },
    { href: '/#harga', label: t('auth.footer.pricing') },
    { href: '/#faq', label: t('auth.footer.faq') },
  ]
  return (
    <footer className="relative mx-auto mt-10 flex w-full max-w-6xl flex-col items-center gap-3 text-xs text-[#8A9188] sm:flex-row sm:justify-between lg:mt-6 lg:text-white/50">
      <p className="text-center sm:text-left">
        &copy; {new Date().getFullYear()} Laku POS · {t('auth.footer.tagline')}
      </p>
      <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="hover:text-[#17201D] lg:hover:text-white">{l.label}</Link>
        ))}
        <a href={SUPPORT_WHATSAPP} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-[#0F5F56] hover:underline lg:text-[#F6C979]">
          <MessageCircle className="h-3.5 w-3.5" /> {t('auth.footer.contact')}
        </a>
      </nav>
    </footer>
  )
}

/** Behind the auth card: a faint grid on phones, soft brand-coloured light from lg up.
 * Goes inside a `relative overflow-hidden` page whose background is white, lg:#062925. */
export function AuthBackdrop() {
  return (
    <>
      {/* Phone: a faint grid behind the heading */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[linear-gradient(#EEF0F0_1px,transparent_1px),linear-gradient(90deg,#EEF0F0_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:linear-gradient(to_bottom,black,transparent)] lg:hidden" />

      {/* Desktop: soft light in brand colours behind the glass */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
        <div className="absolute -left-40 -top-40 h-[560px] w-[560px] rounded-full bg-[#1E9E8A] opacity-50 blur-[120px]" />
        <div className="absolute -right-32 top-10 h-[520px] w-[520px] rounded-full bg-[#E9A23B] opacity-35 blur-[130px]" />
        <div className="absolute bottom-[-220px] left-1/3 h-[520px] w-[620px] rounded-full bg-[#0F5F56] opacity-70 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>
    </>
  )
}

/** `footer` adds copyright, product links and a WhatsApp contact under the card (login only; sign-up is too tall). */
export function AuthShell({ children, footer = false }: { children: ReactNode; footer?: boolean }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative flex min-h-screen flex-col overflow-hidden bg-white px-5 py-10 lg:bg-[#062925] lg:p-8">
        <AuthBackdrop />

        <div className="relative flex flex-1 items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="relative w-full max-w-md lg:grid lg:max-w-6xl lg:grid-cols-2 lg:gap-8 lg:rounded-2xl lg:border lg:border-white/15 lg:bg-white/[0.07] lg:p-8 lg:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)] lg:backdrop-blur-2xl xl:p-10"
        >
          <div className="flex flex-col justify-center lg:px-8 lg:py-6">{children}</div>
          <ProductPanel />
        </motion.div>
        </div>

        {footer && <AuthFooter />}
      </div>
    </MotionConfig>
  )
}
