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
    <section className="gnex-card p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-caption uppercase tracking-widest text-text-muted">
          Locked funds
        </p>
        <span className="font-mono text-body-sm font-bold text-warning">KES {formatKes(lockedKes)}</span>
      </div>
      <p className="mt-1 text-body-sm text-text-muted">
        Lock cash to keep it out of reach — unlocking takes{' '}
        <span className="font-semibold text-text-secondary">24 hours</span>.
      </p>

      <div className="mt-4 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-surface/40 px-3.5 py-2.5 focus-within:border-brand/40">
          <span className="font-mono text-caption font-bold text-text-muted">KES</span>
          <input
            type="number"
            inputMode="decimal"
            min={1}
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-transparent font-mono text-body font-bold text-text-primary outline-none placeholder:text-text-muted gnex-input-mono"
          />
        </div>
        <button
          type="button"
          disabled={!valid || locking}
          onClick={() => {
            onLock(amountNum)
            setAmount('')
          }}
          className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-caption font-bold text-text-inverse transition-colors hover:bg-brand/90 disabled:opacity-50 gnex-touch-target"
        >
          <Lock className="h-3.5 w-3.5" />
          {locking ? 'Locking…' : 'Lock'}
        </button>
      </div>

      <button
        type="button"
        disabled={lockedKes <= 0 || hasPendingUnlock || unlocking}
        onClick={onUnlock}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-warning-border bg-warning-bg px-4 py-2.5 text-caption font-bold text-warning transition-colors hover:bg-warning-bg/20 disabled:opacity-40 gnex-touch-target"
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
              className="flex items-center justify-between rounded-lg border border-border bg-surface/40 px-3.5 py-2.5"
            >
              <div>
                <p className="font-mono text-body-sm font-bold text-text-primary">
                  KES {formatKes(lock.amountKes)}
                </p>
                <p className="text-caption text-text-muted">
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
                className={`rounded-full border px-2 py-0.5 font-mono text-caption font-bold uppercase tracking-wide ${
                  lock.status === 'unlock_pending'
                    ? 'border-warning-border bg-warning-bg text-warning'
                    : 'border-border bg-surface/40 text-text-muted'
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