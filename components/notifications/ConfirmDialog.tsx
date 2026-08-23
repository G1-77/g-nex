// components/notifications/ConfirmDialog.tsx
// Confirmation dialog system (brief §35) — replaces browser-native confirm()

'use client'

import { useState, useCallback, createContext, useContext, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary' | 'warning'
  onConfirm: () => void | Promise<void>
  onCancel?: () => void
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => void
  isOpen: boolean
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context
}

function ConfirmDialogContent({
  options,
  onClose
}: {
  options: ConfirmOptions
  onClose: () => void
}) {
  const { title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'danger', onConfirm, onCancel } = options
  const [loading, setLoading] = useState(false)

  const variantStyles: Record<string, { confirm: string; icon: string }> = {
    danger: {
      confirm: 'gnex-btn-danger',
      icon: 'text-danger'
    },
    primary: {
      confirm: 'gnex-btn-primary',
      icon: 'text-brand'
    },
    warning: {
      confirm: 'gnex-btn gnex-btn-warning',
      icon: 'text-warning'
    }
  }

  const styles = variantStyles[variant] ?? variantStyles.danger

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
    } finally {
      setLoading(false)
      onClose()
    }
  }

  const handleCancel = () => {
    onCancel?.()
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="gnex-overlay w-full max-w-md pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 id="confirm-title" className="text-lg font-bold text-text-primary">
            {title}
          </h2>
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-hover hover:text-text-primary transition-colors disabled:opacity-40"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-body text-text-secondary">{message}</p>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="gnex-btn gnex-btn-secondary"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={styles.confirm}
          >
            {loading ? 'Confirming...' : confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)

  const confirm = useCallback((newOptions: ConfirmOptions) => {
    setOptions(newOptions)
  }, [])

  const handleClose = useCallback(() => {
    setOptions(null)
  }, [])

  return (
    <ConfirmContext.Provider value={{ confirm, isOpen: !!options }}>
      {children}
      <AnimatePresence>
        {options && <ConfirmDialogContent options={options} onClose={handleClose} />}
      </AnimatePresence>
    </ConfirmContext.Provider>
  )
}

// Convenience hook for common patterns
export function useConfirmDialog() {
  const { confirm } = useConfirm()

  const confirmDanger = useCallback((title: string, message: string, onConfirm: () => void | Promise<void>, confirmLabel = 'Delete') => {
    confirm({ title, message, confirmLabel, variant: 'danger', onConfirm })
  }, [confirm])

  const confirmAction = useCallback((title: string, message: string, onConfirm: () => void | Promise<void>, confirmLabel = 'Confirm') => {
    confirm({ title, message, confirmLabel, variant: 'primary', onConfirm })
  }, [confirm])

  const confirmWarning = useCallback((title: string, message: string, onConfirm: () => void | Promise<void>, confirmLabel = 'Proceed') => {
    confirm({ title, message, confirmLabel, variant: 'warning', onConfirm })
  }, [confirm])

  return { confirm, confirmDanger, confirmAction, confirmWarning }
}