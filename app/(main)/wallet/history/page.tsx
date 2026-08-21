'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowDownLeft, ArrowUpRight, TrendingUp, TrendingDown } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { useGetUserRequestsQuery } from '@/lib/react-query/market/queries.market'
import { useGetUserTransactionsQuery } from '@/lib/react-query/queries/orders.queries'
import { useRealtimeFinance } from '@/lib/react-query/market/useRealtimeFinance'
import { formatKes, formatUnits, statusLabel, statusTone } from '@/lib/market/wallet-utils'
import type { AssetSymbol } from '@/lib/supabase/types'

type Filter = 'All' | 'Deposits' | 'Withdrawals' | 'Trades'

const FILTERS: Filter[] = ['All', 'Deposits', 'Withdrawals', 'Trades']

const TONE_STYLES = {
  amber: 'border-amber-400/20 bg-amber-400/5 text-amber-400',
  green: 'border-[#8DFF45]/20 bg-[#8DFF45]/5 text-[#8DFF45]',
  red: 'border-rose-400/20 bg-rose-400/5 text-rose-400',
  slate: 'border-slate-700 bg-slate-800/40 text-slate-400',
} as const

type ActivityItem =
  | {
      kind: 'deposit' | 'withdrawal'
      id: string
      amountKes: number
      provider: string | null
      mobileNumber: string | null
      status: string
      createdAt: string
    }
  | {
      kind: 'trade'
      id: string
      side: 'buy' | 'sell'
      symbol: AssetSymbol
      quantity: number
      amountKes: number
      priceAtTime: number | null
      status: string
      createdAt: string
    }

function TradeRow({ item }: { item: Extract<ActivityItem, { kind: 'trade' }> }) {
  const buy = item.side === 'buy'
  return (
    <li className="flex items-center gap-3 rounded-xl border border-slate-900/60 bg-slate-900/20 p-4">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
          buy ? 'border-[#8DFF45]/20 bg-[#8DFF45]/5' : 'border-rose-400/20 bg-rose-400/5'
        }`}
      >
        {buy ? <TrendingUp className="h-4 w-4 text-[#8DFF45]" /> : <TrendingDown className="h-4 w-4 text-rose-400" />}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-slate-200">
          {buy ? `Bought` : `Sold`} {item.symbol}
          <span className="text-slate-500"> · {formatUnits(item.symbol, item.quantity)}</span>
        </p>
        <p className="text-[10px] text-slate-500">
          {new Date(item.createdAt).toLocaleString('en-GB', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
          {item.priceAtTime ? ` · @ $${item.priceAtTime.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : ''}
        </p>
      </div>

      <div className="text-right">
        <p className={`font-mono text-[13px] font-bold ${buy ? 'text-[#8DFF45]' : 'text-rose-400'}`}>
          {buy ? '−' : '+'}KES {formatKes(item.amountKes)}
        </p>
        <span className="mt-1 inline-block rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide text-emerald-400/80 border-emerald-500/20 bg-emerald-500/5">
          {item.status}
        </span>
      </div>
    </li>
  )
}

function RequestRow({ item }: { item: Extract<ActivityItem, { kind: 'deposit' | 'withdrawal' }> }) {
  const deposit = item.kind === 'deposit'
  const tone = statusTone(item.status)
  return (
    <li className="flex items-center gap-3 rounded-xl border border-slate-900/60 bg-slate-900/20 p-4">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
          deposit ? 'border-[#8DFF45]/20 bg-[#8DFF45]/5' : 'border-amber-400/20 bg-amber-400/5'
        }`}
      >
        {deposit ? (
          <ArrowDownLeft className="h-4 w-4 text-[#8DFF45]" />
        ) : (
          <ArrowUpRight className="h-4 w-4 text-amber-400" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-slate-200">
          {deposit ? 'Deposit' : 'Withdrawal'}
          {item.provider && item.provider.toUpperCase() !== 'DEMO' && (
            <span className="text-slate-500"> · {item.provider}</span>
          )}
          {item.provider && item.provider.toUpperCase() === 'DEMO' && (
            <span className="text-slate-500"> · Demo credit</span>
          )}
        </p>
        <p className="text-[10px] text-slate-500">
          {new Date(item.createdAt).toLocaleString('en-GB', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
          {item.mobileNumber && item.mobileNumber !== 'DEMO' ? ` · ${item.mobileNumber}` : ''}
        </p>
      </div>

      <div className="text-right">
        <p className={`font-mono text-[13px] font-bold ${deposit ? 'text-[#8DFF45]' : 'text-amber-400'}`}>
          {deposit ? '+' : '−'}KES {formatKes(item.amountKes)}
        </p>
        <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide ${TONE_STYLES[tone]}`}>
          {statusLabel(item.status)}
        </span>
      </div>
    </li>
  )
}

export default function HistoryPage() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const { data: requests = [], isLoading } = useGetUserRequestsQuery(userId)
  const { data: transactions = [] } = useGetUserTransactionsQuery(userId)
  const [filter, setFilter] = useState<Filter>('All')

  useRealtimeFinance(userId)

  const activity = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [
      ...requests.map<ActivityItem>((r) => ({
        kind: r.kind,
        id: r.id,
        amountKes: r.amountKes,
        provider: r.provider,
        mobileNumber: r.mobileNumber,
        status: r.status,
        createdAt: r.createdAt,
      })),
      ...transactions.flatMap<ActivityItem>((t) => {
        if (t.type !== 'buy' && t.type !== 'sell') return []
        if (t.assetSymbol === null) return []
        return [
          {
            kind: 'trade' as const,
            id: t.id,
            side: t.type,
            symbol: t.assetSymbol,
            quantity: t.amount,
            amountKes: t.amountKes ?? t.amount,
            priceAtTime: t.priceAtTime,
            status: t.status,
            createdAt: t.createdAt,
          },
        ]
      }),
    ]
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [requests, transactions])

  const filtered = activity.filter((item) => {
    if (filter === 'Deposits') return item.kind === 'deposit'
    if (filter === 'Withdrawals') return item.kind === 'withdrawal'
    if (filter === 'Trades') return item.kind === 'trade'
    return true
  })

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <Link href="/wallet" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200">
        ← Back to wallet
      </Link>

      <h1 className="mt-4 text-xl font-black tracking-tight text-slate-100">History</h1>

      {/* FILTER PILLS */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[11px] font-bold transition-colors ${
              filter === f
                ? 'border-yellow-600 bg-yellow-600/10 text-yellow-600'
                : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* LIST */}
      <div className="mt-4">
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-slate-900/40" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/20 p-8 text-center">
            {filter === 'Trades' ? (
              <>
                <p className="text-sm text-slate-400">No trades yet.</p>
                <p className="mt-1 text-xs text-slate-500">
                  Buy or sell from an asset page and your trades will show up here.
                </p>
                <Link
                  href="/markets"
                  className="mt-4 inline-block rounded-xl border border-yellow-600/30 bg-yellow-600/10 px-4 py-2.5 text-xs font-bold text-yellow-600 transition-colors hover:bg-yellow-600/20"
                >
                  Browse markets
                </Link>
              </>
            ) : filter === 'All' && activity.length === 0 ? (
              <>
                <p className="text-sm text-slate-400">No activity yet.</p>
                <p className="mt-1 text-xs text-slate-500">Make your first deposit to get started.</p>
                <Link
                  href="/wallet/deposit"
                  className="mt-4 inline-block rounded-xl bg-yellow-600 px-4 py-2.5 text-xs font-bold text-slate-950 transition-colors hover:bg-yellow-500"
                >
                  Deposit
                </Link>
              </>
            ) : (
              <p className="text-sm text-slate-500">Nothing in this filter yet.</p>
            )}
          </div>
        ) : (
          <ul className="space-y-2.5">
            {filtered.map((item) =>
              item.kind === 'trade' ? (
                <TradeRow key={item.id} item={item} />
              ) : (
                <RequestRow key={`${item.kind}-${item.id}`} item={item} />
              )
            )}
          </ul>
        )}
      </div>
    </div>
  )
}