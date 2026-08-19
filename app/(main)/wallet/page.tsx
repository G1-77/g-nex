'use client'

import { useEffect, useMemo } from 'react'
import WalletBalanceCard, { type AllocationSlice } from '@/components/wallet/WalletBalanceCard'
import HoldingsList, { type HoldingRowData } from '@/components/wallet/HoldingsList'
import LockCard from '@/components/wallet/LockCard'
import { useAuth } from '@/components/providers/AuthProvider'
import { useMarketPrices } from '@/lib/react-query/market/queries.prices'
import {
  useGetUserHoldingsQuery,
  usePortfolioSummary,
  useDemoFundMutation,
  useGetFundLocksQuery,
  useGetUserRequestsQuery,
  useLockFundsMutation,
  useUnlockFundsMutation,
  useReleaseUnlocksMutation,
} from '@/lib/react-query/market/queries.market'
import { MARKET_ASSETS_LIST } from '@/lib/constants/market-assets'
import { allocationColor } from '@/lib/market/wallet-utils'
import { DEMO_MODE } from '@/lib/constants/wallet'
import { useDemoSimulation } from '@/lib/hooks/useDemoSimulation'

export default function WalletPage() {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const { data: holdings = [], isLoading: holdingsLoading } = useGetUserHoldingsQuery(userId)
  const { data: tickers = [] } = useMarketPrices()
  const {
    balanceKes,
    lockedKes,
    reserveKes,
    holdingsValueKes,
    totalKes,
    totalUsd,
    growthPct,
    usdKes,
  } = usePortfolioSummary(userId)
  const demoFund = useDemoFundMutation()
  const { data: locks = [] } = useGetFundLocksQuery(userId)
  const { data: requests = [] } = useGetUserRequestsQuery(userId)
  const lockFunds = useLockFundsMutation()
  const unlockFunds = useUnlockFundsMutation()
  const releaseUnlocks = useReleaseUnlocksMutation()

  // Demo mode: keep balances/lifecycle live as deposits confirm and payouts land.
  const hasPendingDemoItems = requests.some(
    (r) => r.status.toLowerCase() === 'pending_verification' || r.status.toLowerCase() === 'pending'
  )
  useDemoSimulation(userId, hasPendingDemoItems)

  // Lazy release of any unlock requests whose 24h cooling-off has elapsed.
  useEffect(() => {
    if (!userId) return
    releaseUnlocks.mutate({ userId })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const bySymbol = useMemo(
    () => new Map(tickers.map((t) => [t.symbol, t])),
    [tickers]
  )

  const allocation = useMemo<AllocationSlice[]>(
    () =>
      MARKET_ASSETS_LIST.map((asset) => {
        const ticker = bySymbol.get(asset.symbol)
        const holding = holdings.find((h) => h.assetSymbol === asset.symbol)
        const valueKes = (holding?.units ?? 0) * (ticker?.priceUsd ?? 0) * usdKes
        return {
          symbol: asset.symbol,
          name: asset.name,
          logo: asset.logo,
          valueKes,
          pct: holdingsValueKes > 0 ? (valueKes / holdingsValueKes) * 100 : 0,
          color: allocationColor(asset.symbol),
        }
      }),
    [holdings, bySymbol, usdKes, holdingsValueKes]
  )

  const holdingRows = useMemo<HoldingRowData[]>(
    () =>
      MARKET_ASSETS_LIST.map((asset) => {
        const ticker = bySymbol.get(asset.symbol)
        const holding = holdings.find((h) => h.assetSymbol === asset.symbol)
        return {
          symbol: asset.symbol,
          name: asset.name,
          logo: asset.logo,
          units: holding?.units ?? 0,
          valueKes: (holding?.units ?? 0) * (ticker?.priceUsd ?? 0) * usdKes,
          change24h: ticker?.change24h ?? 0,
        }
      }).sort((a, b) => b.valueKes - a.valueKes),
    [holdings, bySymbol, usdKes]
  )

  const handleDemoFund = () => {
    if (!userId || demoFund.isPending) return
    demoFund.mutate({ userId })
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <header className="mb-5">
        <h1 className="text-xl font-black tracking-tight text-slate-100">Wallet</h1>
        <p className="mt-0.5 text-xs text-slate-500">
          Your savings · {balanceKes > 0 ? `KES ${balanceKes.toLocaleString('en-KE')} cash` : 'no cash yet'} ·
          held in KES
        </p>
      </header>

      {DEMO_MODE && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3.5 py-2.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F6C453" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-[11px] text-amber-400/90">
            Demo mode — verification and payouts are simulated automatically.
          </p>
        </div>
      )}

      <WalletBalanceCard
        totalKes={totalKes}
        totalUsd={totalUsd}
        cashKes={balanceKes}
        lockedKes={lockedKes}
        reserveKes={reserveKes}
        growthPct={growthPct}
        usdKes={usdKes}
        allocation={allocation}
        demoFunding={demoFund.isPending}
        onDemoFund={handleDemoFund}
      />

      <LockCard
        lockedKes={lockedKes}
        availableKes={balanceKes}
        locks={locks}
        locking={lockFunds.isPending}
        unlocking={unlockFunds.isPending}
        onLock={(amount) => userId && lockFunds.mutate({ userId, amount })}
        onUnlock={() => userId && unlockFunds.mutate({ userId })}
      />

      <div className="mt-4">
        <HoldingsList rows={holdingRows} loading={holdingsLoading} />
      </div>
    </div>
  )
}