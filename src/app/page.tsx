'use client'

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { AnimatePresence, MotionConfig, motion, useScroll, useTransform } from 'framer-motion'
import { Check, CheckCircle2, Mail, Menu, MessageCircle, Minus, Plus, X } from 'lucide-react'
import { LANDING as L, type Plan } from '@/components/landing/content'
import { SUPPORT_WHATSAPP_DISPLAY, supportWhatsAppLink } from '@/lib/contact'
import { landingFont } from '@/components/landing/fonts'
import { trpc } from '@/lib/trpc/client'
import { friendlyError } from '@/lib/errors/friendlyError'

// Measured type scale: display 65 px / 1.06 / -0.02em, lead 21 px bold, body 17.5 px / 1.6,
// labels 13 px bold upper case. Gutters 54 px (34 px in the dark bands) at desktop width.
const H2 = 'text-[40px] font-bold leading-[1.06] tracking-[-0.02em] md:text-[65px]'
const H3 = 'text-[21px] font-bold leading-[1.25] tracking-[-0.025em]'
const BODY = 'text-[17.5px] leading-[1.6]'
const LABEL = 'text-[13px] font-bold uppercase tracking-[0.04em]'
const GUTTER = 'px-5 md:px-[54px]'

/**
 * Image slot. Without `src` it shows a 1920×1080 placeholder with its size, to be swapped for a
 * real photo later (put it in /public/landing/ and pass `src`).
 */
function Picture({ src, alt, label, className = '', tone = 'light' }: { src?: string; alt: string; label: string; className?: string; tone?: 'light' | 'grey' | 'dark' }) {
  if (src) return <img src={src} alt={alt} width={1920} height={1080} className={`h-full w-full object-cover ${className}`} />
  const tones = {
    light: 'bg-[#E4E8E6] text-[#5F6B67] [--grid:rgba(7,17,11,0.06)]',
    grey: 'bg-[#DADDDC] text-[#5F6B67] [--grid:rgba(7,17,11,0.07)]',
    dark: 'bg-[#13211E] text-white/45 [--grid:rgba(255,255,255,0.05)]',
  }[tone]
  return (
    <div role="img" aria-label={alt} className={`relative flex h-full w-full items-center justify-center overflow-hidden ${tones} ${className}`}>
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(var(--grid)_1px,transparent_1px),linear-gradient(90deg,var(--grid)_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div className="relative text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em]">{label}</p>
        <p className="mt-1 text-xs opacity-80">1920 × 1080</p>
      </div>
    </div>
  )
}

/** Fades a block up once it scrolls into view. */
function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  )
}

type PillTone = 'dark' | 'light' | 'text'
function Pill({ href, children, tone = 'dark', external = false, big = false }: { href: string; children: ReactNode; tone?: PillTone; external?: boolean; big?: boolean }) {
  const cls = {
    dark: 'rounded-full bg-[#041C15] text-white hover:bg-[#0F5F56]',
    light: 'rounded-full bg-white text-[#07110B] hover:bg-[#E3F1EE]',
    text: 'text-[#07110B] hover:opacity-70',
  }[tone]
  const size = tone === 'text' ? 'py-3' : big ? 'px-10 py-4 text-[15px]' : 'px-7 py-3'
  const className = `inline-flex items-center gap-2 ${LABEL} tracking-[0.02em] transition ${size} ${cls}`
  return external
    ? <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>
    : <Link href={href} className={className}>{children}</Link>
}

// ─── 1. Header ─────────────────────────────────────────────────────────────────
function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    let last = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 8)
      // Out of the way while reading down, back as soon as the reader scrolls up.
      setHidden(y > 240 && y > last)
      last = y
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const links = [
    { href: '#fitur', label: L.nav.features },
    { href: '#cara-kerja', label: L.nav.how },
    { href: '#harga', label: L.nav.pricing },
    { href: '#faq', label: L.nav.faq },
  ]
  return (
    <header className={`fixed inset-x-0 top-0 z-50 backdrop-blur-[12px] backdrop-saturate-150 transition-[background-color,transform] duration-300 ${
      scrolled || open ? 'bg-[#F3F5F4]/[0.92]' : 'bg-[#F3F5F4]/40'
    } ${hidden && !open ? '-translate-y-full' : 'translate-y-0'}`}>
      <div className="flex h-[84px] items-center justify-between px-5 md:h-[105px] md:px-[54px] md:pt-[21px]">
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="" className="h-8 w-8" />
          <span className="text-[26px] font-bold tracking-[-0.02em] text-[#07110B]">Laku POS</span>
        </Link>
        <nav className="hidden items-center gap-10 lg:flex">
          {links.map((l) => <a key={l.href} href={l.href} className={`${LABEL} text-[#07110B] hover:opacity-70`}>{l.label}</a>)}
        </nav>
        <div className="hidden items-center gap-6 lg:flex">
          <Pill href="#kontak">{L.nav.contact}</Pill>
          <Link href="/login" className={`${LABEL} text-[#07110B] hover:opacity-70`}>{L.nav.login}</Link>
        </div>
        <button className="p-2 text-[#07110B] lg:hidden" onClick={() => setOpen(!open)} aria-label={open ? 'Tutup menu' : 'Buka menu'} aria-expanded={open}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }} className="overflow-hidden lg:hidden">
            <div className="flex flex-col gap-1 px-5 pb-6">
              {links.map((l) => <a key={l.href} href={l.href} onClick={() => setOpen(false)} className={`py-3 ${LABEL} text-[#07110B]`}>{l.label}</a>)}
              <div className="mt-3 flex items-center gap-6">
                <Pill href="#kontak">{L.nav.contact}</Pill>
                <Link href="/login" className={`${LABEL} text-[#07110B]`}>{L.nav.login}</Link>
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}

// ─── 2. Hero ───────────────────────────────────────────────────────────────────
function Hero() {
  const letters = 'LAKU POS'.split('')
  return (
    <section className="relative overflow-hidden pt-[105px]">
      <h1 aria-label="Laku POS" className="mt-[70px] flex justify-center overflow-hidden px-[34px] text-[13.5vw] font-bold leading-[0.94] tracking-[-0.022em] text-[#07110B]">
        {letters.map((ch, i) => (
          <motion.span key={i} aria-hidden initial={{ y: '105%' }} animate={{ y: 0 }}
            transition={{ duration: 0.9, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }} className="inline-block">
            {ch === ' ' ? ' ' : ch}
          </motion.span>
        ))}
      </h1>
      <div className="relative mt-16 grid items-center gap-10 pb-16 md:mt-20 lg:grid-cols-[minmax(0,480px)_1fr] lg:gap-0 lg:pb-0">
        <Reveal delay={0.3} className="px-5 md:pl-[34px] lg:pr-0">
          <h2 className="text-[32px] font-bold leading-[1.15] tracking-[-0.03em] text-[#07110B]">{L.hero.title}</h2>
          <p className="mt-5 text-[18px] leading-[1.55] text-[#07110B]">{L.hero.body}</p>
          <div className="mt-8 flex flex-wrap items-center gap-7">
            <Pill href="/register">{L.hero.primary}</Pill>
            <Pill href="#cara-kerja" tone="text">{L.hero.secondary}</Pill>
          </div>
        </Reveal>
        <Reveal delay={0.4} className="aspect-[16/9] lg:aspect-auto lg:h-[440px]">
          <Picture alt="Ilustrasi bengkel dan kasir Laku POS" label="Ilustrasi hero" />
        </Reveal>
      </div>
    </section>
  )
}

// ─── 3. The problem, who it is for ─────────────────────────────────────────────
function Problem() {
  const row = (label: string, items: string[]) => (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#07110B]">{label}</p>
      <div className="mt-4 flex flex-wrap items-center gap-x-7 gap-y-3">
        {items.map((x) => <span key={x} className="text-[17px] font-bold tracking-[-0.02em] text-[#07110B]/85">{x}</span>)}
      </div>
    </div>
  )
  return (
    <section className={`${GUTTER} py-20 md:py-[91px]`}>
      <Reveal><h2 className={`${H2} max-w-[680px] text-[#07110B]`}>{L.problem.title}</h2></Reveal>
      <div className="mt-14 grid gap-12 lg:grid-cols-2 lg:gap-20">
        <Reveal className={`max-w-[536px] space-y-6 ${BODY} text-[#07110B]`}>
          <p>{L.problem.p1}</p>
          <p>{L.problem.p2}</p>
        </Reveal>
        <Reveal delay={0.1} className="space-y-10 lg:pl-[82px]">
          {row(L.problem.builtFor, L.problem.builtForItems)}
          {row(L.problem.worksWith, L.problem.worksWithItems)}
        </Reveal>
      </div>
    </section>
  )
}

// ─── 4. Full-width photo ───────────────────────────────────────────────────────
function WidePhoto() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const scale = useTransform(scrollYProgress, [0, 1], [1.1, 1])
  return (
    <div ref={ref} className="relative h-[60vw] max-h-[787px] min-h-[300px] overflow-hidden">
      <motion.div style={{ scale }} className="absolute inset-0 grayscale">
        <Picture alt="Bengkel motor yang memakai Laku POS" label="Foto lebar" tone="grey" />
      </motion.div>
    </div>
  )
}

// ─── 5. What sets it apart ─────────────────────────────────────────────────────
function Why() {
  return (
    <section id="fitur" className={`scroll-mt-24 ${GUTTER} pb-[70px] pt-[100px]`}>
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_560px] lg:gap-20">
        <div>
          <Reveal><h2 className={`${H2} max-w-[560px] text-[#07110B]`}>{L.why.title}</h2></Reveal>
          <Reveal delay={0.1} className="mt-12 aspect-[4/3] max-w-[560px]">
            <Picture alt="Ilustrasi alur kerja bengkel" label="Ilustrasi" />
          </Reveal>
        </div>
        <div className="space-y-10 lg:pt-1">
          {L.why.items.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.06}>
              <h3 className={`${H3} text-[#07110B]`}>{item.title}</h3>
              <p className={`mt-2.5 ${BODY} text-[#07110B]`}>{item.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── 6. Three steps ────────────────────────────────────────────────────────────
function Steps() {
  return (
    <section id="cara-kerja" className={`scroll-mt-24 ${GUTTER} pb-[25px]`}>
      <div className="grid gap-6 lg:grid-cols-3">
        {L.steps.map((s, i) => {
          const dark = i === 1
          return (
            <Reveal key={s.n} delay={i * 0.08}>
              <article className={`flex h-full min-h-[520px] flex-col overflow-hidden rounded-[22px] px-8 pt-10 md:min-h-[608px] md:px-12 md:pt-12 ${dark ? 'bg-[#0C1F1B] text-white' : 'bg-[#E7EAE9] text-[#07110B]'}`}>
                <span className="font-mono text-[15px] tracking-[0.02em]">{s.n}</span>
                <h3 className={`mt-6 ${H3}`}>{s.title}</h3>
                <p className={`mt-3 ${BODY} ${dark ? 'text-[#BCC2C0]' : ''}`}>{s.body}</p>
                <div className="mt-auto pb-8 pt-6">
                  <div className="aspect-[4/3.6] overflow-hidden rounded-[14px]">
                    <Picture alt={s.title} label={`Gambar ${s.n}`} tone={dark ? 'dark' : 'grey'} />
                  </div>
                </div>
              </article>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}

// ─── 7. Statement ──────────────────────────────────────────────────────────────
function Statement() {
  return (
    <section className="mt-12 bg-[#F1F1F1] pt-[110px]">
      <Reveal className="px-5 text-center md:px-[34px]">
        <h2 className={`${H2} text-[#07110B]`}>{L.statement.title}</h2>
        <p className="mx-auto mt-8 max-w-[900px] text-[22px] leading-[1.4] text-[#07110B] md:text-[30px]">{L.statement.body}</p>
      </Reveal>
      <Reveal delay={0.1} className="mt-16 aspect-[21/9] md:mt-24">
        <Picture alt="Ilustrasi besar Laku POS" label="Ilustrasi lebar" />
      </Reveal>
    </section>
  )
}

// ─── 8. Dark band with device ──────────────────────────────────────────────────
function Economics() {
  return (
    <section className="bg-[#F3F5F4] pt-[63px]">
      <div className="bg-[#0A1220] text-white">
        <div className="grid gap-10 px-5 pt-16 md:px-[34px] lg:grid-cols-2 lg:gap-x-16">
          <div>
            <Reveal><h2 className={`${H2} max-w-[600px]`}>{L.dark.title}</h2></Reveal>
            <Reveal delay={0.1}><p className={`mt-10 max-w-[520px] ${BODY} text-[#BCC2C0]`}>{L.dark.body}</p></Reveal>
          </div>
          <Reveal delay={0.15} className="flex flex-col items-start gap-6 lg:items-end lg:justify-end lg:text-right">
            <p className={`max-w-[430px] ${H3}`}>{L.dark.side}</p>
            <Pill href={supportWhatsAppLink('Halo, saya ingin tahu lebih lanjut tentang Laku POS.')} tone="light" external>{L.dark.cta}</Pill>
          </Reveal>
        </div>
        <Reveal delay={0.1} className="mx-auto mt-16 max-w-[806px] px-5">
          <div className="aspect-[806/414] overflow-hidden rounded-t-[18px]">
            <Picture alt="Laku POS di tablet kasir" label="Foto tablet kasir" tone="dark" />
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ─── 9. Platform ───────────────────────────────────────────────────────────────
function Platform() {
  return (
    <section className={`${GUTTER} py-20 md:py-[110px]`}>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_568px] lg:gap-20">
        <Reveal><h2 className={`${H2} max-w-[660px] text-[#07110B]`}>{L.platform.title}</h2></Reveal>
        <Reveal delay={0.1} className="lg:pt-3">
          <p className={`${BODY} max-w-[520px] text-[#07110B]`}>{L.platform.body}</p>
          <div className="mt-8 flex flex-wrap items-center gap-7">
            <Pill href="/register" tone="light">{L.platform.primary}</Pill>
            <Pill href="#harga" tone="text">{L.platform.secondary}</Pill>
          </div>
        </Reveal>
      </div>
      <div className="mt-16 grid gap-6 md:grid-cols-3">
        {L.platform.cards.map((c, i) => (
          <Reveal key={c.title} delay={i * 0.08}>
            <div className="aspect-[3/2] overflow-hidden rounded-[16px]">
              <Picture alt={c.title} label={`Foto ${i + 1}`} />
            </div>
            <h3 className={`mt-5 ${H3} text-[#07110B]`}>{c.title}</h3>
            <p className={`mt-2 ${BODY} text-[#565C59]`}>{c.body}</p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

// ─── 10. Ready today ───────────────────────────────────────────────────────────
function Ready() {
  return (
    <section className="bg-[#0A1220] text-white">
      <div className="grid items-center gap-12 border-t border-white/10 py-20 pl-5 md:py-[104px] md:pl-[34px] lg:grid-cols-[440px_1fr] lg:gap-12">
        <div className="pr-5 lg:pr-0">
          <Reveal><h2 className={H2}>{L.ready.title}</h2></Reveal>
          <Reveal delay={0.1}><p className={`mt-8 max-w-[420px] ${BODY} text-[#BCC2C0]`}>{L.ready.body}</p></Reveal>
          <Reveal delay={0.15} className="mt-9"><Pill href="#harga" tone="light" big>{L.ready.cta}</Pill></Reveal>
        </div>
        <Reveal delay={0.1} className="aspect-[918/485] overflow-hidden rounded-l-[16px]">
          <Picture alt="Dasbor Laku POS" label="Screenshot dasbor" tone="dark" />
        </Reveal>
      </div>
    </section>
  )
}

// ─── 11. Pricing and FAQ ───────────────────────────────────────────────────────
function PlanCard({ plan }: { plan: Plan }) {
  const dark = plan.highlight
  const href = plan.href ?? supportWhatsAppLink(plan.waMessage)
  const external = !plan.href
  return (
    <motion.article whileHover={{ y: -4 }} transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`relative flex h-full flex-col rounded-[22px] p-8 md:p-9 ${dark ? 'bg-[#0C1F1B] text-white shadow-[0_30px_60px_-30px_rgba(4,28,21,0.6)]' : 'border border-[#E6E8E7] bg-white text-[#07110B]'}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className={H3}>{plan.name}</h3>
        {plan.tag && (
          <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.06em] ${dark ? 'bg-[#F6C979] text-[#07110B]' : 'bg-[#E3F1EE] text-[#0F5F56]'}`}>
            {plan.tag}
          </span>
        )}
      </div>
      <p className={`mt-1.5 text-[15px] ${dark ? 'text-[#BCC2C0]' : 'text-[#565C59]'}`}>{plan.note}</p>

      <p className="mt-8 flex items-baseline gap-1.5">
        <span className="text-[44px] font-bold leading-none tracking-[-0.03em] tabular-nums">{plan.price}</span>
        {plan.period && <span className={`text-[15px] ${dark ? 'text-[#BCC2C0]' : 'text-[#565C59]'}`}>{plan.period}</span>}
      </p>

      <div className={`my-8 h-px ${dark ? 'bg-white/12' : 'bg-[#E6E8E7]'}`} />

      <ul className="flex-1 space-y-3.5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-3 text-[15.5px] leading-snug">
            <Check className={`mt-0.5 h-[18px] w-[18px] shrink-0 stroke-[2.25] ${dark ? 'text-[#F6C979]' : 'text-[#0F5F56]'}`} />
            {f}
          </li>
        ))}
      </ul>

      <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}
        className={`mt-10 inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-3.5 ${LABEL} tracking-[0.02em] transition-colors ${
          dark ? 'bg-white text-[#07110B] hover:bg-[#E3F1EE]' : 'bg-[#041C15] text-white hover:bg-[#0F5F56]'}`}>
        {plan.cta}
      </a>
    </motion.article>
  )
}

function Pricing() {
  const [mode, setMode] = useState<'sub' | 'once'>('sub')
  const plans = mode === 'sub' ? L.pricing.sub : L.pricing.once
  return (
    <section id="harga" className={`scroll-mt-24 ${GUTTER} pb-10 pt-24 md:pt-[150px]`}>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <Reveal>
          <h2 className={`${H2} text-[#07110B]`}>{L.pricing.title}</h2>
          <p className={`mt-6 max-w-[520px] ${BODY} text-[#565C59]`}>{L.pricing.body}</p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="inline-flex gap-1 rounded-full border border-[#E4EAE6] bg-white p-1" role="tablist">
            {(['sub', 'once'] as const).map((m) => (
              <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
                className={`relative rounded-full px-5 py-2.5 ${LABEL} transition-colors ${mode === m ? 'text-white' : 'text-[#565C59] hover:text-[#07110B]'}`}>
                {mode === m && <motion.span layoutId="plan-mode" className="absolute inset-0 rounded-full bg-[#041C15]" transition={{ duration: 0.25 }} />}
                <span className="relative">{m === 'sub' ? L.pricing.subscription : L.pricing.oneTime}</span>
              </button>
            ))}
          </div>
        </Reveal>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={mode} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`mt-14 grid items-stretch gap-6 ${plans.length === 4 ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-3'}`}>
          {plans.map((p) => <PlanCard key={p.name} plan={p} />)}
        </motion.div>
      </AnimatePresence>

      <Reveal className="mt-12 flex flex-col items-start justify-between gap-5 rounded-[22px] bg-[#E7EAE9] px-8 py-7 md:flex-row md:items-center">
        <p className={`${BODY} max-w-[680px] text-[#07110B]`}>{L.pricing.footnote}</p>
        <Pill href="#kontak">{L.pricing.contact}</Pill>
      </Reveal>
    </section>
  )
}

function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section id="faq" className={`scroll-mt-24 ${GUTTER} py-20 md:py-[110px]`}>
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
        <Reveal><h2 className={`${H2} max-w-[560px] text-[#07110B]`}>{L.faq.title}</h2></Reveal>
        <div className="border-t border-[#565C59]/40">
          {L.faq.items.map((item, i) => (
            <div key={item.q} className="border-b border-[#565C59]/40">
              <button className="flex w-full items-center justify-between gap-6 py-6 text-left" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                <span className={`${H3} text-[#07110B]`}>{item.q}</span>
                {open === i ? <Minus className="h-5 w-5 shrink-0" /> : <Plus className="h-5 w-5 shrink-0" />}
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                    <p className={`pb-6 pr-10 ${BODY} text-[#565C59]`}>{item.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── 12. Contact: saved for the team (superadmin → Pesan Masuk) ────────────────
const TOPIC_KEYS = ['general', 'workshop', 'shop', 'partner'] as const

function Contact() {
  const [tab, setTab] = useState(0)
  const [form, setForm] = useState({ name: '', phone: '', business: '', message: '', agree: false, website: '' })
  const [error, setError] = useState('')
  const send = trpc.contact.submit.useMutation()
  const field = 'w-full border-0 border-b border-[#565C59] bg-transparent pb-2 pt-1 text-[16px] text-[#07110B] outline-none placeholder:text-[#565C59] focus:border-[#07110B]'
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await send.mutateAsync({
        topic: TOPIC_KEYS[tab],
        name: form.name,
        phone: form.phone || undefined,
        businessName: form.business || undefined,
        message: form.message,
        website: form.website || undefined,
      })
    } catch (err) {
      setError(friendlyError(err, L.contact.failed))
    }
  }
  return (
    <section id="kontak" className={`scroll-mt-24 ${GUTTER} pb-[54px] pt-10`}>
      <Reveal><h2 className={`${H2} max-w-[680px] text-[#07110B]`}>{L.contact.title}</h2></Reveal>
      <div className="mt-14 grid gap-14 lg:grid-cols-2 lg:gap-20">
        <Reveal>
          <p className={`max-w-[440px] ${BODY} text-[#07110B]`}>{L.contact.body}</p>
          <ul className="mt-12 space-y-6 text-[15px] text-[#07110B]">
            <li className="flex gap-4">
              <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 stroke-[1.75]" />
              <a href={supportWhatsAppLink()} target="_blank" rel="noopener noreferrer" className="hover:underline">{L.contact.whatsapp} {SUPPORT_WHATSAPP_DISPLAY}</a>
            </li>
          </ul>
        </Reveal>
        <Reveal delay={0.1}>
          <AnimatePresence mode="wait">
            {send.isSuccess ? (
              <motion.div key="sent" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-[22px] bg-[#E7EAE9] p-8 md:p-12">
                <CheckCircle2 className="h-8 w-8 stroke-[1.75] text-[#0F5F56]" />
                <h3 className={`mt-5 ${H3} text-[#07110B]`}>{L.contact.sentTitle}</h3>
                <p className={`mt-2 ${BODY} text-[#565C59]`}>{L.contact.sentBody}</p>
                <div className="mt-8 flex flex-wrap items-center gap-7">
                  <Pill href={supportWhatsAppLink(`Halo, saya ${form.name}. Saya baru mengirim pesan lewat website Laku POS.`)} external>{L.contact.sentWhatsapp}</Pill>
                  <button onClick={() => { send.reset(); setForm({ name: '', phone: '', business: '', message: '', agree: false, website: '' }) }} className={`${LABEL} text-[#07110B] hover:opacity-70`}>{L.contact.sendAnother}</button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="form" exit={{ opacity: 0, y: -8 }}>
                <div className="inline-flex flex-wrap gap-1 rounded-full border border-[#E4EAE6] bg-white/70 p-0.5" role="tablist">
                  {L.contact.tabs.map((t, i) => (
                    <button key={t} type="button" role="tab" aria-selected={tab === i} onClick={() => setTab(i)}
                      className={`relative rounded-full px-4 py-1.5 ${LABEL} transition-colors ${tab === i ? 'text-white' : 'text-[#565C59] hover:text-[#07110B]'}`}>
                      {tab === i && <motion.span layoutId="contact-tab" className="absolute inset-0 rounded-full bg-[#041C15]" transition={{ duration: 0.25 }} />}
                      <span className="relative">{t}</span>
                    </button>
                  ))}
                </div>
                <form onSubmit={submit} className="mt-10 flex flex-col gap-10">
                  <input required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={L.contact.name} aria-label={L.contact.name} autoComplete="name" className={field} />
                  <input maxLength={30} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={L.contact.phone} aria-label={L.contact.phone} inputMode="tel" autoComplete="tel" className={field} />
                  <input maxLength={120} value={form.business} onChange={(e) => setForm({ ...form, business: e.target.value })} placeholder={L.contact.business} aria-label={L.contact.business} autoComplete="organization" className={field} />
                  <textarea required maxLength={2000} rows={1} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder={L.contact.message} aria-label={L.contact.message} className={`${field} resize-none`} />
                  {/* Honeypot: off-screen for people, filled in by bots */}
                  <input tabIndex={-1} autoComplete="off" aria-hidden value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="absolute left-[-9999px] h-0 w-0 opacity-0" name="website" />
                  <label className="flex items-center gap-3 text-[15px] text-[#07110B]">
                    <input type="checkbox" required checked={form.agree} onChange={(e) => setForm({ ...form, agree: e.target.checked })} className="h-[18px] w-[18px] rounded border-[#565C59] accent-[#041C15]" />
                    {L.contact.agree}
                  </label>
                  {error && <p role="alert" className="text-[15px] text-red-700">{error}</p>}
                  <button type="submit" disabled={send.isPending} className={`w-fit rounded-full bg-[#041C15] px-8 py-3.5 ${LABEL} tracking-[0.02em] text-white transition hover:bg-[#0F5F56] disabled:opacity-60`}>
                    {send.isPending ? L.contact.sending : L.contact.submit}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </Reveal>
      </div>
    </section>
  )
}

// ─── 13. Footer ────────────────────────────────────────────────────────────────
// Two halves on one baseline grid: wordmark over the icon row on the left; link columns over
// the copyright on the right, both starting at the same x so the text lines up.
function Footer() {
  const cols: { title: string; links: { href: string; label: string; external?: boolean }[] }[] = [
    { title: L.footer.company, links: [{ href: '#kontak', label: L.nav.contact }, { href: supportWhatsAppLink('Halo, saya butuh bantuan dengan Laku POS.'), label: 'WhatsApp', external: true }] },
    { title: L.footer.product, links: [{ href: '#fitur', label: L.nav.features }, { href: '#cara-kerja', label: L.nav.how }, { href: '#harga', label: L.nav.pricing }, { href: '#faq', label: L.nav.faq }] },
    { title: L.footer.account, links: [{ href: '/login', label: L.nav.login }, { href: '/register', label: 'Daftar gratis' }] },
  ]
  const social = [
    { href: supportWhatsAppLink(), label: 'WhatsApp Laku POS', icon: <MessageCircle className="h-[18px] w-[18px]" /> },
    { href: '#kontak', label: L.nav.contact, icon: <Mail className="h-[18px] w-[18px]" /> },
  ]
  return (
    <footer className="bg-[#041C15] px-5 pb-[52px] pt-20 text-white md:px-[38px]">
      <div className="grid gap-y-14 lg:grid-cols-2 lg:grid-rows-[auto_auto] lg:gap-y-[84px]">
        <span className="block whitespace-nowrap text-[17vw] font-bold leading-[0.78] tracking-[-0.05em] lg:text-[clamp(56px,8.6vw,124px)]">LAKU POS</span>

        <div className="grid grid-cols-2 gap-y-10 sm:grid-cols-[225px_225px_1fr] lg:pl-[83px] lg:pt-[14px]">
          {cols.map((c) => (
            <div key={c.title}>
              <p className="text-[16px] leading-6 text-white/75">{c.title}</p>
              <ul className="mt-[14px] space-y-4 leading-[19.5px]">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} target={l.external ? '_blank' : undefined} rel={l.external ? 'noopener noreferrer' : undefined}
                      className={`block ${LABEL} leading-[19.5px] text-white transition-opacity hover:opacity-70`}>{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-10 lg:self-start lg:pt-1">
          {social.map((x) => (
            <a key={x.label} href={x.href} target={x.href.startsWith('http') ? '_blank' : undefined} rel={x.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              aria-label={x.label} className="text-white/85 transition-opacity hover:opacity-70">{x.icon}</a>
          ))}
        </div>

        <div className="text-[15px] leading-7 text-white/75 lg:self-start lg:pl-[83px]">
          <p>&copy; {new Date().getFullYear()} Laku POS. {L.footer.rights}</p>
          <p>{L.footer.tagline}</p>
        </div>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className={`${landingFont.className} min-h-screen bg-[#F3F5F4] text-[#07110B] antialiased`}>
        <Header />
        <main>
          <Hero />
          <Problem />
          <WidePhoto />
          <Why />
          <Steps />
          <Statement />
          <Economics />
          <Platform />
          <Ready />
          <Pricing />
          <Faq />
          <Contact />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  )
}
