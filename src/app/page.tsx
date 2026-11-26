'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { AnimatePresence, MotionConfig, motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, Check, Menu, MessageCircle, Minus, Plus, X } from 'lucide-react'
import { LANDING as L, type Plan } from '@/components/landing/content'
import { supportWhatsAppLink } from '@/lib/contact'
import { landingFont } from '@/components/landing/fonts'

const INK = '#07110B'

/**
 * Image slot. Without `src` it shows a 1920×1080 placeholder with its size, to be swapped for a
 * real photo later (put it in /public/landing/ and pass `src`).
 */
function Picture({ src, alt, label, className = '', dark = false }: { src?: string; alt: string; label: string; className?: string; dark?: boolean }) {
  if (src) return <img src={src} alt={alt} width={1920} height={1080} className={`h-full w-full object-cover ${className}`} />
  return (
    <div role="img" aria-label={alt}
      className={`relative flex h-full w-full items-center justify-center overflow-hidden ${dark ? 'bg-[#0E2A26] text-white/50' : 'bg-[#E3E8E6] text-[#5F6B67]'} ${className}`}>
      <div aria-hidden className={`absolute inset-0 ${dark ? 'bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)]' : 'bg-[linear-gradient(rgba(11,26,23,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(11,26,23,0.06)_1px,transparent_1px)]'} bg-[size:48px_48px]`} />
      <div className="relative text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em]">{label}</p>
        <p className="mt-1 text-xs opacity-80">1920 × 1080</p>
      </div>
    </div>
  )
}

/** Fades a block up once it scrolls into view. */
function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  )
}

function Pill({ href, children, tone = 'dark', external = false }: { href: string; children: ReactNode; tone?: 'dark' | 'light' | 'outline'; external?: boolean }) {
  const cls = {
    dark: 'bg-[#07110B] text-white hover:bg-[#0F5F56]',
    light: 'bg-white text-[#07110B] hover:bg-[#E3F1EE]',
    outline: 'border border-[#07110B]/25 text-[#07110B] hover:border-[#07110B]',
  }[tone]
  const className = `inline-flex items-center gap-2 rounded-full px-7 py-3 text-[13px] font-bold uppercase tracking-[0.02em] transition-colors ${cls}`
  return external
    ? <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>
    : <Link href={href} className={className}>{children}</Link>
}

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
    { href: '#harga', label: L.nav.pricing },
    { href: '#faq', label: L.nav.faq },
  ]
  return (
    <header className={`fixed inset-x-0 top-0 z-50 border-b backdrop-blur-[12px] backdrop-saturate-150 transition-[background-color,border-color,transform] duration-300 ${
      scrolled || open ? 'border-[#07110B]/[0.06] bg-[#F3F5F4]/[0.82]' : 'border-transparent bg-[#F3F5F4]/40'
    } ${hidden && !open ? '-translate-y-full' : 'translate-y-0'}`}>
      <div className="mx-auto flex h-[84px] max-w-[1400px] items-center justify-between px-5 md:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="" className="h-8 w-8" />
          <span className="text-lg font-bold tracking-tight text-[#07110B]">Laku POS</span>
        </Link>
        <nav className="hidden items-center gap-10 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-[13px] font-bold uppercase tracking-[0.04em] text-[#07110B] hover:text-[#0F5F56]">{l.label}</a>
          ))}
        </nav>
        <div className="hidden items-center gap-6 md:flex">
          <Link href="/login" className="text-[13px] font-bold uppercase tracking-[0.04em] text-[#07110B] hover:text-[#0F5F56]">{L.nav.login}</Link>
          <Pill href="/register">{L.nav.register}</Pill>
        </div>
        <button className="p-2 text-[#07110B] md:hidden" onClick={() => setOpen(!open)} aria-label={open ? 'Tutup menu' : 'Buka menu'} aria-expanded={open}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }} className="overflow-hidden border-t border-[#07110B]/10 md:hidden">
            <div className="flex flex-col gap-1 px-5 py-4">
              {links.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="py-2.5 text-[15px] font-bold uppercase tracking-[0.04em] text-[#07110B]">{l.label}</a>
              ))}
              <div className="mt-3 flex gap-3">
                <Pill href="/login" tone="outline">{L.nav.login}</Pill>
                <Pill href="/register">{L.nav.register}</Pill>
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}

function Hero() {
  const word = 'LAKU POS'
  return (
    <section className="relative overflow-hidden px-5 pb-16 pt-32 md:px-8 md:pb-24 md:pt-36">
      <div className="mx-auto max-w-[1400px]">
        <h1 aria-label="Laku POS" className="flex justify-center overflow-hidden whitespace-nowrap text-[13.5vw] font-bold leading-[0.94] tracking-[-0.022em] text-[#07110B]">
          {word.split('').map((ch, i) => (
            <motion.span key={i} aria-hidden initial={{ y: '105%' }} animate={{ y: 0 }}
              transition={{ duration: 0.8, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }} className="inline-block">
              {ch === ' ' ? ' ' : ch}
            </motion.span>
          ))}
        </h1>

        <div className="mt-14 grid items-center gap-10 md:mt-20 lg:grid-cols-[1fr_1.35fr] lg:gap-16">
          <Reveal>
            <h2 className="max-w-md text-3xl font-bold leading-[1.1] tracking-tight text-[#07110B] md:text-[40px]">{L.hero.title}</h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-[#565C59] md:text-lg">{L.hero.body}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Pill href="/register">{L.hero.primary} <ArrowRight className="h-4 w-4" /></Pill>
              <Pill href="#fitur" tone="outline">{L.hero.secondary}</Pill>
            </div>
          </Reveal>
          <Reveal delay={0.15} className="aspect-video overflow-hidden rounded-[18px]">
            <Picture alt="Ilustrasi kasir dan bengkel Laku POS" label="Gambar hero" />
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/** Full-width photo that zooms out slightly as it scrolls past. */
function WidePhoto() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const scale = useTransform(scrollYProgress, [0, 1], [1.12, 1])
  return (
    <div ref={ref} className="relative h-[56vw] max-h-[820px] min-h-[320px] overflow-hidden">
      <motion.div style={{ scale }} className="absolute inset-0">
        <Picture alt="Kasir bengkel melayani pelanggan" label="Foto lebar" dark />
      </motion.div>
    </div>
  )
}

function Why() {
  return (
    <section className="px-5 py-20 md:px-8 md:py-32">
      <div className="mx-auto grid max-w-[1400px] gap-12 lg:grid-cols-2 lg:gap-20">
        <Reveal>
          <h2 className="max-w-xl text-[44px] font-bold leading-[1.06] tracking-[-0.02em] text-[#07110B] md:text-[65px]">{L.why.title}</h2>
        </Reveal>
        <div className="divide-y divide-[#07110B]/12">
          {L.why.items.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.06} className="py-7 first:pt-0">
              <h3 className="text-[21px] font-bold tracking-[-0.025em] text-[#07110B]">{item.title}</h3>
              <p className="mt-2 max-w-[68ch] text-[15px] leading-[1.6] text-[#565C59]">{item.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function DarkBand() {
  return (
    <section className="bg-[#041C15] px-5 py-20 text-white md:px-8 md:py-32">
      <div className="mx-auto max-w-[1400px]">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-end">
          <Reveal>
            <h2 className="max-w-2xl text-[44px] font-bold leading-[1.06] tracking-[-0.02em] md:text-[65px]">{L.dark.title}</h2>
            <p className="mt-8 max-w-lg text-base leading-relaxed text-white/70 md:text-lg">{L.dark.body}</p>
          </Reveal>
          <Reveal delay={0.1} className="flex flex-col items-start gap-6 lg:items-end lg:text-right">
            <p className="max-w-md text-xl font-bold leading-snug">{L.dark.side}</p>
            <Pill href={supportWhatsAppLink(L.cta.waMessage)} tone="light" external>{L.dark.cta}</Pill>
          </Reveal>
        </div>
        <Reveal delay={0.1} className="mt-16 overflow-hidden rounded-[18px] border border-white/10 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.8)] md:mt-24">
          <div className="aspect-video">
            <Picture alt="Tampilan dasbor Laku POS" label="Screenshot dasbor" dark />
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function Features() {
  return (
    <section id="fitur" className="scroll-mt-24 px-5 py-20 md:px-8 md:py-32">
      <div className="mx-auto max-w-[1400px]">
        <Reveal>
          <h2 className="text-[44px] font-bold leading-[1.06] tracking-[-0.02em] text-[#07110B] md:text-[65px]">{L.features.title}</h2>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 md:mt-16">
          {L.features.items.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.07}>
              <article className="flex h-full flex-col rounded-[16px] border border-[#E6E8E7] bg-white px-7 pb-8 pt-7 transition-shadow hover:border-[#CDD3D0]">
                <span className="w-fit rounded-md bg-[#E3F1EE] px-2 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-[#0F5F56]">{f.tag}</span>
                <h3 className="mt-5 text-xl font-bold leading-snug tracking-tight text-[#07110B]">{f.title}</h3>
                <p className="mt-3 flex-1 text-[15px] leading-relaxed text-[#565C59]">{f.body}</p>
                <Link href="/register" className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-[0.04em] text-[#07110B] hover:text-[#0F5F56]">
                  {L.features.more} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function PlanCard({ plan }: { plan: Plan }) {
  const dark = plan.highlight
  const href = plan.href ?? supportWhatsAppLink(plan.waMessage)
  return (
    <div className={`flex h-full flex-col rounded-[18px] p-7 ${dark ? 'bg-[#041C15] text-white' : 'border border-[#E6E8E7] bg-white text-[#07110B]'}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-bold">{plan.name}</h3>
        {plan.tag && <span className={`rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-[0.06em] ${dark ? 'bg-white/10 text-[#F6C979]' : 'bg-[#E3F1EE] text-[#0F5F56]'}`}>{plan.tag}</span>}
      </div>
      <p className={`mt-1 text-sm ${dark ? 'text-white/60' : 'text-[#5F6B67]'}`}>{plan.note}</p>
      <p className="mt-6 text-4xl font-bold tracking-tight tabular-nums">
        {plan.price}<span className={`ml-1 text-base font-medium ${dark ? 'text-white/60' : 'text-[#5F6B67]'}`}>{plan.period}</span>
      </p>
      <ul className="mt-6 flex-1 space-y-2.5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-[15px]">
            <Check className={`mt-0.5 h-4 w-4 shrink-0 ${dark ? 'text-[#F6C979]' : 'text-[#0F5F56]'}`} /> {f}
          </li>
        ))}
      </ul>
      <a href={href} target={plan.href ? undefined : '_blank'} rel={plan.href ? undefined : 'noopener noreferrer'}
        className={`mt-8 inline-flex justify-center rounded-full px-6 py-3 text-[13px] font-bold uppercase tracking-[0.04em] transition-colors ${dark ? 'bg-white text-[#07110B] hover:bg-[#E3F1EE]' : 'bg-[#07110B] text-white hover:bg-[#0F5F56]'}`}>
        {plan.cta}
      </a>
    </div>
  )
}

function Pricing() {
  const [mode, setMode] = useState<'sub' | 'once'>('sub')
  const plans = mode === 'sub' ? L.pricing.sub : L.pricing.once
  return (
    <section id="harga" className="scroll-mt-24 bg-[#E9EEEC] px-5 py-20 md:px-8 md:py-32">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <Reveal>
            <h2 className="text-[44px] font-bold leading-[1.06] tracking-[-0.02em] text-[#07110B] md:text-[65px]">{L.pricing.title}</h2>
            <p className="mt-5 text-lg text-[#565C59]">{L.pricing.body}</p>
          </Reveal>
          <div className="relative flex w-fit rounded-full bg-white p-1" role="tablist">
            {(['sub', 'once'] as const).map((m) => (
              <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
                className={`relative rounded-full px-5 py-2.5 text-[13px] font-bold uppercase tracking-[0.04em] transition-colors ${mode === m ? 'text-white' : 'text-[#07110B]'}`}>
                {mode === m && <motion.span layoutId="plan-mode" className="absolute inset-0 rounded-full bg-[#07110B]" transition={{ duration: 0.25 }} />}
                <span className="relative">{m === 'sub' ? L.pricing.subscription : L.pricing.oneTime}</span>
              </button>
            ))}
          </div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={mode} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}
            className={`mt-12 grid gap-4 md:mt-16 ${plans.length === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'}`}>
            {plans.map((p) => <PlanCard key={p.name} plan={p} />)}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}

function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section id="faq" className="scroll-mt-24 px-5 py-20 md:px-8 md:py-32">
      <div className="mx-auto grid max-w-[1400px] gap-12 lg:grid-cols-2 lg:gap-20">
        <Reveal>
          <h2 className="text-[44px] font-bold leading-[1.06] tracking-[-0.02em] text-[#07110B] md:text-[65px]">{L.faq.title}</h2>
        </Reveal>
        <div className="divide-y divide-[#07110B]/12 border-y border-[#07110B]/12">
          {L.faq.items.map((item, i) => (
            <div key={item.q}>
              <button className="flex w-full items-center justify-between gap-6 py-6 text-left" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                <span className="text-lg font-bold tracking-tight text-[#07110B]">{item.q}</span>
                {open === i ? <Minus className="h-5 w-5 shrink-0 text-[#07110B]" /> : <Plus className="h-5 w-5 shrink-0 text-[#07110B]" />}
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }} className="overflow-hidden pr-10 text-base leading-relaxed text-[#565C59]">
                    <span className="block pb-6">{item.a}</span>
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ClosingCta() {
  return (
    <section className="px-5 pb-20 md:px-8 md:pb-32">
      <Reveal className="mx-auto max-w-[1400px] overflow-hidden rounded-[24px] bg-[#0F5F56] px-6 py-16 text-white md:px-16 md:py-24">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="max-w-2xl text-[44px] font-bold leading-[1.06] tracking-[-0.02em] md:text-[65px]">{L.cta.title}</h2>
            <p className="mt-5 text-lg text-white/75">{L.cta.body}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Pill href="/register" tone="light">{L.cta.primary} <ArrowRight className="h-4 w-4" /></Pill>
            <a href={supportWhatsAppLink(L.cta.waMessage)} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/40 px-6 py-3 text-[13px] font-bold uppercase tracking-[0.04em] text-white transition-colors hover:border-white">
              <MessageCircle className="h-4 w-4" /> {L.cta.secondary}
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-[#07110B]/10 px-5 py-12 md:px-8">
      <div className="mx-auto grid max-w-[1400px] gap-10 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="" className="h-7 w-7" />
            <span className="text-base font-bold text-[#07110B]">Laku POS</span>
          </div>
          <p className="mt-3 max-w-sm text-sm text-[#5F6B67]">{L.footer.tagline}</p>
        </div>
        <div>
          <p className="text-[13px] font-bold uppercase tracking-[0.04em] text-[#07110B]">{L.footer.product}</p>
          <ul className="mt-4 space-y-2 text-sm text-[#565C59]">
            <li><a href="#fitur" className="hover:text-[#07110B]">{L.nav.features}</a></li>
            <li><a href="#harga" className="hover:text-[#07110B]">{L.nav.pricing}</a></li>
            <li><a href="#faq" className="hover:text-[#07110B]">{L.nav.faq}</a></li>
          </ul>
        </div>
        <div>
          <p className="text-[13px] font-bold uppercase tracking-[0.04em] text-[#07110B]">{L.footer.company}</p>
          <ul className="mt-4 space-y-2 text-sm text-[#565C59]">
            <li><Link href="/login" className="hover:text-[#07110B]">{L.nav.login}</Link></li>
            <li><Link href="/register" className="hover:text-[#07110B]">{L.nav.register}</Link></li>
            <li><a href={supportWhatsAppLink('Halo, saya butuh bantuan dengan Laku POS.')} target="_blank" rel="noopener noreferrer" className="hover:text-[#07110B]">{L.footer.contact}</a></li>
          </ul>
        </div>
      </div>
      <p className="mx-auto mt-10 max-w-[1400px] text-xs text-[#7A8682]">&copy; {new Date().getFullYear()} Laku POS. {L.footer.rights}</p>
    </footer>
  )
}

export default function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className={`${landingFont.className} min-h-screen bg-[#F3F5F4] antialiased`} style={{ color: INK }}>
        <Header />
        <main>
          <Hero />
          <WidePhoto />
          <Why />
          <DarkBand />
          <Features />
          <Pricing />
          <Faq />
          <ClosingCta />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  )
}
