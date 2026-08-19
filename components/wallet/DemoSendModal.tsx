'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { formatKes } from '@/lib/market/wallet-utils'

interface DemoSendModalProps {
  open: boolean
  amount: number
  provider: 'M-Pesa' | 'Airtel Money'
  onComplete: () => void
}

function SendStage({ amount, provider, onComplete }: Omit<DemoSendModalProps, 'open'>) {
  const [stage, setStage] = useState<'waiting' | 'sent'>('waiting')
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  })

  useEffect(() => {
    const t1 = setTimeout(() => setStage('sent'), 900)
    const t2 = setTimeout(() => onCompleteRef.current(), 2200)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  return (
    <motion.div
      initial={{ y: 40, scale: 0.96 }}
      animate={{ y: 0, scale: 1 }}
      exit={{ y: 40, scale: 0.96 }}
      className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center shadow-2xl"
    >
      {stage === 'waiting' ? (
        <>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-slate-700">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-600 border-t-yellow-600" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-100">
            {provider === 'M-Pesa' ? 'Waiting for your PIN' : `Sending via ${provider}`}
          </h2>
          <p className="mt-1 font-mono text-sm text-slate-400">
            KES {formatKes(amount)} · GNex Pay
          </p>
          <p className="mt-3 text-[11px] text-slate-600">
            Enter your PIN on your phone to confirm — simulated for this demo
          </p>
        </>
      ) : (
        <>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#8DFF45]/10">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8DFF45" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="mt-4 text-lg font-bold text-[#8DFF45]">Sent to GNex</h2>
          <p className="mt-1 font-mono text-sm text-slate-300">
            KES {formatKes(amount)} · {provider}
          </p>
          <p className="mt-3 text-[11px] text-slate-500">
            Now confirm in the app and your wallet is credited instantly
          </p>
        </>
      )}
    </motion.div>
  )
}

// Demo-only: simulates the mobile-money send confirmation (STK-push style) so
// investors see the full "user sends money → taps 'I've sent'" journey.
export default function DemoSendModal({ open, amount, provider, onComplete }: DemoSendModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-4 backdrop-blur-sm sm:items-center"
        >
          <SendStage amount={amount} provider={provider} onComplete={onComplete} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}