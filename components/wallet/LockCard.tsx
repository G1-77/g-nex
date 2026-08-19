'use client'

import { useState } from 'react'
import { Lock, Unlock } from 'lucide-react'
import { formatKes } from '@/lib/market/wallet-utils'
import type { FundLock } from '@/lib/supabase/market.types'

interface LockCardProps {
  lockedKes: number
  availableKes: number
  locks: FundLock[]
  locking: boolean
  unlocking: boolean
  onLock: (amount: number) => void
  onUnlock: () => void
}

export default function LockCard({
  lockedKes,
  availableKes,
  locks,
  locking,
  unlocking,
  onLock,
  onUnlock,
}: LockCardProps) {
  const [amount, setAmount] = useState('')
  const amountNum = Number(amount)
  const valid = amountNum > 0 && amountNum <= Math.max(0, availableKes)

  const hasPendingUnlock = locks.some((l) => l.status === 'unlock_pending')
  const activeLocks = locks.filter((l) => l.status === 'locked' || l.status === 'unlock_pending')

  return (
    <section className="mt-4 rounded-xl border border-slate-900/60 bg-slate-900/20 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
          Locked funds
        </p>
        <span className="font-mono text-xs font-bold text-amber-400">KES {formatKes(lockedKes)}</span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Lock cash to keep it out of reach — unlocking takes{' '}
        <span className="font-semibold text-slate-300">24 hours</span>.
      </p>

      <div className="mt-4 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5 focus-within:border-yellow-600/40">
          <span className="font-mono text-xs font-bold text-slate-500">KES</span>
          <input
            type="number"
            inputMode="decimal"
            min={1}
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-transparent font-mono text-sm font-bold text-slate-100 outline-none placeholder:text-slate-700"
          />
        </div>
        <button
          type="button"
          disabled={!valid || locking}
          onClick={() => {
            onLock(amountNum)
            setAmount('')
          }}
          className="flex items-center gap-1.5 rounded-xl bg-yellow-600 px-4 py-2.5 text-xs font-bold text-slate-950 transition-colors hover:bg-yellow-500 disabled:opacity-50"
        >
          <Lock className="h-3.5 w-3.5" />
          {locking ? 'Locking…' : 'Lock'}
        </button>
      </div>

      <button
        type="button"
        disabled={lockedKes <= 0 || hasPendingUnlock || unlocking}
        onClick={onUnlock}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/5 px-4 py-2.5 text-xs font-bold text-amber-400 transition-colors hover:bg-amber-400/10 disabled:opacity-40"
      >
        <Unlock className="h-3.5 w-3.5" />
        {hasPendingUnlock
          ? 'Unlock requested — releasing within 24h'
          : unlocking
            ? 'Requesting…'
            : `Unlock KES ${formatKes(lockedKes)}`}
      </button>

      {activeLocks.length > 0 && (
        <ul className="mt-4 space-y-2">
          {activeLocks.map((lock) => (
            <li
              key={lock.id}
              className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-950/40 px-3.5 py-2.5"
            >
              <div>
                <p className="font-mono text-xs font-bold text-slate-200">
                  KES {formatKes(lock.amountKes)}
                </p>
                <p className="text-[10px] text-slate-500">
                  {lock.status === 'unlock_pending' && lock.unlockAvailableAt
                    ? `Unlocks ${new Date(lock.unlockAvailableAt).toLocaleString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`
                    : `Locked ${new Date(lock.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      })}`}
                </p>
              </div>
              <span
                className={`rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide ${
                  lock.status === 'unlock_pending'
                    ? 'border-amber-400/20 bg-amber-400/5 text-amber-400'
                    : 'border-slate-700 bg-slate-800/40 text-slate-400'
                }`}
              >
                {lock.status === 'unlock_pending' ? 'Unlocking' : 'Locked'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}