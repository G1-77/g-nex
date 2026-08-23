// components/notifications/Toast.tsx
// Toast notification system (brief §35) — replaces browser-native alert()

'use client'

import { useState, useCallback, createContext, useContext, ReactNode } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export type ToastTone = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  tone: ToastTone
  message: string
  duration?: number
}

interface ToastContextValue {
  toasts: Toast[]
  showToast: (tone: ToastTone, message: string, duration?: number) => string
  dismissToast: (id: string) => void
  success: (message: string, duration?: number) => string
  error: (message: string, duration?: number) => string
  warning: (message: string, duration?: number) => string
  info: (message: string, duration?: number) => string
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

const TONE_CONFIG: Record<ToastTone, { icon: React.ReactNode; className: string }> = {
  success: {
    icon: <CheckCircle className="h-5 w-5 shrink-0" />,
    className: 'bg-success-bg text-success border-success-border'
  },
  error: {
    icon: <AlertCircle className="h-5 w-5 shrink-0" />,
    className: 'bg-danger-bg text-danger border-danger-border'
  },
  warning: {
    icon: <AlertCircle className="h-5 w-5 shrink-0" />,
    className: 'bg-warning-bg text-warning border-warning-border'
  },
  info: {
    icon: <Info className="h-5 w-5 shrink-0" />,
    className: 'bg-crypto-bg text-crypto border-crypto-border'
  }
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const { icon, className } = TONE_CONFIG[toast.tone]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'flex items-start gap-3 rounded-xl border px-4 py-3.5 shadow-elevated',
        className,
        'gnex-card-elevated min-w-[280px] max-w-[420px]'
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-body-sm font-medium">{toast.message}</p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 p-1 rounded-lg hover:bg-black/10 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4 opacity-60 hover:opacity-100" />
      </button>
    </motion.div>
  )
}

export function ToastContainer() {
  const { toasts, dismissToast } = useToast()

  return (
    <AnimatePresence>
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none md:bottom-6 md:right-6">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onDismiss={dismissToast} />
          </div>
        ))}
      </div>
    </AnimatePresence>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((tone: ToastTone, message: string, duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    setToasts((prev) => [...prev, { id, tone, message, duration }])

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, duration)
    }
    return id
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const helpers = {
    success: (message: string, duration?: number) => showToast('success', message, duration),
    error: (message: string, duration?: number) => showToast('error', message, duration),
    warning: (message: string, duration?: number) => showToast('warning', message, duration),
    info: (message: string, duration?: number) => showToast('info', message, duration)
  }

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast, ...helpers }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}