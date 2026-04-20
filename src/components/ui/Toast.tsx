'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  showToast: (message: string, type?: ToastType, duration?: number) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

/**
 * Toast Provider Component
 * Manages toast notifications state
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration: number = 3000) => {
      const id = `toast-${Date.now()}-${Math.random()}`
      const newToast: Toast = { id, message, type, duration }

      setToasts((prev) => [...prev, newToast])

      // Auto remove after duration
      if (duration > 0) {
        setTimeout(() => {
          removeToast(id)
        }, duration)
      }
    },
    [removeToast]
  )

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

/**
 * useToast Hook
 * Provides toast notification functions
 */
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

/**
 * Toast Container Component
 * Renders all active toasts
 */
function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: Toast[]
  removeToast: (id: string) => void
}) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 left-4 sm:left-auto z-50 space-y-3 sm:max-w-md">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

/**
 * Individual Toast Item Component
 */
function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const styles = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-900',
      icon: '✅',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-900',
      icon: '❌',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-900',
      icon: '⚠️',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-900',
      icon: 'ℹ️',
    },
  }

  const style = styles[toast.type]

  return (
    <div
      className={`
        ${style.bg} ${style.border} ${style.text}
        border-2 rounded-xl shadow-xl
        animate-slide-in-right
        flex items-center gap-3
        w-full sm:min-w-[300px] sm:max-w-md
        p-4
      `}
      role="alert"
    >
      <span className="text-base md:text-2xl flex-shrink-0">{style.icon}</span>
      <p className="flex-1 font-semibold text-mobile-sm">{toast.message}</p>
      <button
        onClick={onClose}
        className={`
          ${style.text} hover:opacity-70
          transition-opacity font-bold
          flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center
          -mr-2
        `}
        aria-label="Close"
      >
        <span className="text-base md:text-2xl">×</span>
      </button>
    </div>
  )
}
