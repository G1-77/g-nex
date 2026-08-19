'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { DEMO_MODE } from '@/lib/constants/wallet'
import { marketKeys } from '@/lib/react-query/market/keys'

// Demo mode only: polls the simulate endpoint so pending deposits/withdrawals
// advance to confirmed/paid live on screen, exactly like an admin would.
// Inert when NEXT_PUBLIC_DEMO_MODE is not set.
export function useDemoSimulation(userId: string | null, enabled: boolean) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!DEMO_MODE || !userId || !enabled) return

    let cancelled = false

    const poll = async () => {
      try {
        const res = await fetch('/api/wallet/demo/simulate')
        if (res.ok) {
          const body = await res.json()
          if (body.depositsConfirmed > 0 || body.withdrawalsPaid > 0) {
            queryClient.invalidateQueries({ queryKey: marketKeys.wallet(userId), exact: false })
            queryClient.invalidateQueries({ queryKey: marketKeys.requests(userId), exact: false })
          }
        }
      } catch {
        // transient — ignore, next tick retries
      }
    }

    poll()
    const interval = setInterval(() => {
      if (!cancelled) poll()
    }, 4000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, enabled, DEMO_MODE])
}
