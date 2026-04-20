'use client'

import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function AboutPage() {
  const { t } = useLanguage()

  const features = [
    {
      category: `📊 ${t('about.features.dashboard')}`,
      items: [
        t('about.features.dashboard.item1'),
        t('about.features.dashboard.item2'),
        t('about.features.dashboard.item3'),
        t('about.features.dashboard.item4'),
        t('about.features.dashboard.item5'),
        t('about.features.dashboard.item6'),
      ],
    },
    {
      category: `📦 ${t('about.features.warehouseMgmt')}`,
      items: [
        t('about.features.warehouseMgmt.item1'),
        t('about.features.warehouseMgmt.item2'),
        t('about.features.warehouseMgmt.item3'),
        t('about.features.warehouseMgmt.item4'),
        t('about.features.warehouseMgmt.item5'),
        t('about.features.warehouseMgmt.item6'),
      ],
    },
    {
      category: `🛒 ${t('about.features.pos')}`,
      items: [
        t('about.features.pos.item1'),
        t('about.features.pos.item2'),
        t('about.features.pos.item3'),
        t('about.features.pos.item4'),
        t('about.features.pos.item5'),
        t('about.features.pos.item6'),
      ],
    },
    {
      category: `📈 ${t('about.features.reports')}`,
      items: [
        t('about.features.reports.item1'),
        t('about.features.reports.item2'),
        t('about.features.reports.item3'),
        t('about.features.reports.item4'),
        t('about.features.reports.item5'),
        t('about.features.reports.item6'),
      ],
    },
    {
      category: `🏷️ ${t('about.features.master')}`,
      items: [
        t('about.features.master.item1'),
        t('about.features.master.item2'),
        t('about.features.master.item3'),
        t('about.features.master.item4'),
      ],
    },
    {
      category: `👤 ${t('about.features.userMgmt')}`,
      items: [
        t('about.features.userMgmt.item1'),
        t('about.features.userMgmt.item2'),
        t('about.features.userMgmt.item3'),
        t('about.features.userMgmt.item4'),
        t('about.features.userMgmt.item5'),
      ],
    },
    {
      category: `📱 ${t('about.features.pwa')}`,
      items: [
        t('about.features.pwa.item1'),
        t('about.features.pwa.item2'),
        t('about.features.pwa.item3'),
        t('about.features.pwa.item4'),
      ],
    },
  ]

  const techStack = [
    {
      category: t('about.technology.frontend'),
      icon: '🎨',
      technologies: [
        { name: 'Next.js 16.0.7', description: 'React framework with App Router & Turbopack' },
        { name: 'React 19.2', description: 'UI library with React Compiler enabled' },
        { name: 'TypeScript 5.9', description: 'Type-safe JavaScript' },
        { name: 'Tailwind CSS 4.1', description: 'Utility-first CSS framework (CSS-first config)' },
        { name: 'Recharts 3.4', description: 'Composable charting library' },
        { name: 'Nivo 0.99', description: 'Rich data visualisation (dashboard)' },
      ],
    },
    {
      category: t('about.technology.backend'),
      icon: '⚙️',
      technologies: [
        { name: 'tRPC 11.7', description: 'End-to-end typesafe APIs' },
        { name: 'Supabase 2.x', description: 'PostgreSQL database with RLS' },
        { name: 'Zod 4.1', description: 'TypeScript-first schema validation' },
        { name: 'Resend', description: 'Transactional email (welcome, verification)' },
        { name: 'Puppeteer 24', description: 'PDF receipt & report generation' },
        { name: 'xlsx 0.18', description: 'Excel/CSV bulk product import' },
      ],
    },
    {
      category: t('about.technology.auth'),
      icon: '🔐',
      technologies: [
        { name: 'JWT (jsonwebtoken)', description: 'Stateless auth with 7-day sessions' },
        { name: 'bcryptjs 3', description: 'Password hashing' },
        { name: 'ioredis / Upstash', description: 'Session store (local / production)' },
        { name: 'Rate Limiter', description: 'Login 5/15 min · API 100/min' },
      ],
    },
    {
      category: 'State & Data Fetching',
      icon: '📡',
      technologies: [
        { name: 'TanStack Query 5.9', description: 'Async state management' },
        { name: 'tRPC React Query', description: 'Type-safe data fetching' },
        { name: 'Superjson 2', description: 'JSON serialisation with type support' },
      ],
    },
    {
      category: 'Offline & PWA',
      icon: '📱',
      technologies: [
        { name: 'Dexie 4.2', description: 'IndexedDB wrapper for offline storage' },
        { name: 'SyncManager', description: 'Auto-sync every 30 s when online' },
        { name: 'Service Worker', description: 'Asset caching & PWA install' },
        { name: 'html5-qrcode', description: 'Camera & USB barcode scanning' },
      ],
    },
    {
      category: 'Monitoring & Testing',
      icon: '🔭',
      technologies: [
        { name: 'Sentry 10.25', description: 'Error tracking & performance' },
        { name: 'Jest 30', description: 'Unit & integration tests' },
        { name: 'Playwright 1.56', description: 'End-to-end tests' },
      ],
    },
    {
      category: 'Architecture',
      icon: '🏗️',
      technologies: [
        { name: 'Domain-Driven Design', description: 'Clean architecture pattern' },
        { name: 'Repository Pattern', description: 'Data access abstraction' },
        { name: 'Use Cases', description: 'Business logic separation' },
        { name: 'Dependency Injection', description: 'Loose coupling via container.ts' },
      ],
    },
  ]

  const stack = [
    { label: 'Framework', value: 'Next.js 16.0.7', color: 'bg-gray-900 dark:bg-gray-600' },
    { label: 'Language', value: 'TypeScript 5.9.3', color: 'bg-blue-600' },
    { label: t('about.technology.database'), value: 'PostgreSQL (Supabase)', color: 'bg-green-600' },
    { label: 'API', value: 'tRPC 11 + React Query v5', color: 'bg-blue-500' },
    { label: 'Styling', value: 'Tailwind CSS 4.1', color: 'bg-cyan-600' },
    { label: t('about.technology.auth'), value: 'JWT + ioredis / Upstash', color: 'bg-red-600' },
    { label: 'Charts', value: 'Recharts 3.4 + Nivo 0.99', color: 'bg-purple-600' },
    { label: 'Offline', value: 'Dexie 4.2 + Service Worker', color: 'bg-orange-600' },
    { label: 'Email', value: 'Resend', color: 'bg-pink-600' },
    { label: 'Monitoring', value: 'Sentry 10.25', color: 'bg-indigo-600' },
    { label: 'Export', value: 'Puppeteer + xlsx', color: 'bg-teal-600' },
    { label: t('about.technology.deployment'), value: 'Vercel', color: 'bg-gray-900 dark:bg-gray-600' },
  ]

  const credits = [
    'Next.js', 'React', 'TypeScript', 'Tailwind CSS',
    'tRPC', 'Supabase', 'TanStack Query', 'Recharts',
    'Nivo', 'Dexie', 'Sentry', 'Puppeteer',
    'Zod', 'Resend', 'ioredis', 'Vercel',
  ]

  return (
    <div className="space-y-4 md:space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-3">Laku POS</h1>
        <p className="text-sm md:text-xl text-gray-600 dark:text-gray-400 mb-3">{t('about.subtitle')}</p>
        <div className="flex items-center justify-center gap-3 text-sm flex-wrap">
          <span className="px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-full font-semibold">
            v1.0.0
          </span>
          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded-full font-semibold">
            {t('about.badge.productionReady')}
          </span>
          <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 rounded-full font-semibold">
            {t('about.badge.openSource')}
          </span>
        </div>
      </div>

      {/* Features Breakdown */}
      <Card variant="elevated" padding="sm">
        <CardHeader>
          <CardTitle>✨ {t('about.featuresOverview')}</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="text-gray-600 dark:text-gray-400 mb-3 md:mb-6">
            {t('about.featuresDesc')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {features.map((feature, index) => (
              <div key={index} className="space-y-2">
                <h3 className="text-sm md:text-base font-bold text-gray-900 dark:text-gray-100">{feature.category}</h3>
                <ul className="space-y-1.5">
                  {feature.items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Technology Stack */}
      <Card variant="elevated" padding="sm">
        <CardHeader>
          <CardTitle>🛠️ {t('about.techStack')}</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="space-y-4 md:space-y-6">
            {techStack.map((category, index) => (
              <div key={index}>
                <h3 className="text-sm md:text-base font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <span>{category.icon}</span>
                  {category.category}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
                  {category.technologies.map((tech, idx) => (
                    <div key={idx} className="p-2.5 md:p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 transition-colors">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{tech.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{tech.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Stack Summary */}
      <Card variant="default" padding="sm">
        <CardHeader>
          <CardTitle>📚 {t('about.stackSummary')}</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
            {stack.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-2.5 md:p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">{item.label}</span>
                <span className={`px-3 py-1 ${item.color} text-white text-xs font-semibold rounded-full`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Developer Profile */}
      <Card variant="elevated" padding="sm">
        <CardHeader>
          <CardTitle>👨‍💻 {t('about.developerProfile')}</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-center md:items-start">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl md:text-4xl font-bold shadow-lg flex-shrink-0">
              AG
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-base md:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Laku POS</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('about.developer.fullTitle')}</p>
              <div className="space-y-2">
                {[
                  { icon: '📧', href: 'mailto:agdscid@gmail.com', label: 'agdscid@gmail.com', color: 'text-blue-600 dark:text-blue-400' },
                  { icon: '📱', href: 'https://wa.me/6287874415491', label: '+62 878-7441-5491', color: 'text-emerald-600 dark:text-emerald-400' },
                  { icon: '💻', href: 'https://github.com/agds-alt', label: 'github.com/agds-alt', color: 'text-gray-900 dark:text-gray-100' },
                ].map((contact) => (
                  <div key={contact.label} className="flex items-center justify-center md:justify-start gap-3 p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <span>{contact.icon}</span>
                    <a href={contact.href} target="_blank" rel="noopener noreferrer" className={`${contact.color} hover:underline font-semibold text-sm`}>
                      {contact.label}
                    </a>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-3 justify-center md:justify-start">
                <a href="https://wa.me/6287874415491" target="_blank" rel="noopener noreferrer">
                  <Button variant="primary">💬 WhatsApp</Button>
                </a>
                <a href="https://github.com/agds-alt" target="_blank" rel="noopener noreferrer">
                  <Button variant="secondary">🌟 GitHub</Button>
                </a>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Project Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
        <Card variant="default" padding="sm">
          <CardHeader>
            <CardTitle>📜 {t('about.license.title')}</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {t('about.license.text1')}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('about.license.text2')}
              </p>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-900 dark:text-blue-300 font-mono">
                  Copyright © {new Date().getFullYear()} Laku POS. {t('about.footer.copyright')}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card variant="default" padding="sm">
          <CardHeader>
            <CardTitle>🚀 {t('about.versionInfo')}</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {[
                { label: t('about.version.label'), value: '1.0.0' },
                { label: t('about.releaseDate'), value: t('about.version.releaseValue') },
                { label: t('about.version.lastUpdated'), value: new Date().toLocaleDateString('id-ID') },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{row.label}</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{row.value}</span>
                </div>
              ))}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('about.version.status')}</span>
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-full text-xs font-semibold">
                  {t('about.version.productionReady')}
                </span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Credits */}
      <Card variant="elevated" padding="sm">
        <CardHeader>
          <CardTitle>🙏 {t('about.credits.title')}</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {t('about.credits.thanks')}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {credits.map((tech) => (
                <div key={tech} className="p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center border border-gray-200 dark:border-gray-600">
                  <p className="font-semibold text-gray-900 dark:text-gray-100 text-xs md:text-sm">{tech}</p>
                </div>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Contributing */}
      <Card variant="default" padding="sm">
        <CardHeader>
          <CardTitle>🤝 {t('about.contributing.title')}</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {t('about.contributing.desc')}
            </p>
            <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300 list-disc list-inside ml-2">
              <li>{t('about.contributing.item1')}</li>
              <li>{t('about.contributing.item2')}</li>
              <li>{t('about.contributing.item3')}</li>
              <li>{t('about.contributing.item4')}</li>
            </ul>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border-2 border-blue-200 dark:border-blue-800">
              <p className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-2">{t('about.contributing.getStarted')}</p>
              <code className="block p-3 bg-white dark:bg-gray-900 rounded text-xs font-mono text-gray-800 dark:text-gray-200">
                git clone https://github.com/agds-alt/bahann-pos.git<br />
                cd bahann-pos<br />
                pnpm install<br />
                pnpm dev
              </code>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Support */}
      <Card variant="elevated" padding="sm">
        <CardHeader>
          <CardTitle>💬 {t('about.support.title')}</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="text-center space-y-3">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {t('about.support.text1')}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('about.support.text2')}
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <a href="https://wa.me/6287874415491" target="_blank" rel="noopener noreferrer">
                <Button variant="primary" size="lg">💬 WhatsApp: +62 878-7441-5491</Button>
              </a>
              <a href="mailto:agdscid@gmail.com">
                <Button variant="secondary" size="lg">📧 Email: agdscid@gmail.com</Button>
              </a>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Footer */}
      <div className="text-center py-4 md:py-8 border-t-2 border-gray-200 dark:border-gray-700">
        <p className="text-gray-600 dark:text-gray-400 mb-1 text-sm">
          {t('about.footer.builtWith')} <strong className="text-gray-900 dark:text-gray-100">Laku POS</strong>
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500">
          © {new Date().getFullYear()} Laku POS. {t('about.footer.copyright')}
        </p>
      </div>
    </div>
  )
}
