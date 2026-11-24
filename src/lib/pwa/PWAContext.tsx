'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { BeforeInstallPromptEvent } from '@/types'
import { logger } from '@/lib/logger'

interface PWAContextValue {
  canInstall: boolean
  isInstalled: boolean
  install: () => Promise<void>
}

const PWAContext = createContext<PWAContextValue>({
  canInstall: false,
  isInstalled: false,
  install: async () => {},
})

export function PWAProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const register = () => navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => logger.success('SW registered', { scope: reg?.scope }))
        .catch((err) => logger.error('SW registration failed', err))
      // The effect usually runs after the load event has fired; waiting for it
      // then would never register the worker, and pages would not work offline.
      if (document.readyState === 'complete') void register()
      else window.addEventListener('load', () => void register(), { once: true })
    }

    const handlePrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    const handleInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
      logger.success('PWA installed')
    }

    window.addEventListener('beforeinstallprompt', handlePrompt)
    window.addEventListener('appinstalled', handleInstalled)

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const install = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    logger.info('PWA install outcome', { outcome })
    setDeferredPrompt(null)
  }

  return (
    <PWAContext.Provider value={{ canInstall: !!deferredPrompt, isInstalled, install }}>
      {children}
    </PWAContext.Provider>
  )
}

export function usePWA() {
  return useContext(PWAContext)
}
