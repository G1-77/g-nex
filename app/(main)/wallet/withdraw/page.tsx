'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import {
  useCreateWithdrawalMutation,
  useGetUserProfileQuery,
  useGetUserRequestsQuery,
  usePortfolioSummary,
} from '@/lib/react-query/market/queries.market'
import { formatKes } from '@/lib/market/wallet-utils'
import { WALLET_CONFIG, withdrawalFee, DEMO_MODE } from '@/lib/constants/wallet'
import { useDemoSimulation } from '@/lib/hooks/useDemoSimulation'

export default function WithdrawPage() {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const { balanceKes, totalKes } = usePortfolioSummary(userId)
  const { data: requests = [] } = useGetUserRequestsQuery(userId)
  const { data: profile } = useGetUserProfileQuery(userId)
  const createWithdrawal = useCreateWithdrawalMutation()

  const [amount, setAmount] = useState('')
  const [provider, setProvider] = useState<'M-Pesa' | 'Airtel Money'>(profile?.mobileMoneyProvider === 'Airtel' ? 'Airtel Money' : 'M-Pesa')
  const [phone, setPhone] = useState(profile?.mobileMoneyNumber ?? '')
  const [submitted, setSubmitted] = useState(false)

  useDemoSimulation(userId, submitted)

  const latestWithdrawal = requests.find((r) => r.kind === 'withdrawal')
  const paid = latestWithdrawal?.status.toLowerCase() === 'paid'

  const capLimit = useMemo(() => totalKes * WALLET_CONFIG.MAX_WITHDRAW_PCT, [totalKes])

  const reserved = useMemo(() => {
    const pendingOut = requests
      .filter(
        (r) =>
          r.kind === 'withdrawal' &&
          (r.status.toLowerCase() === 'pending' ||
            r.status.toLowerCase() === 'approved' ||
            r.status.toLowerCase() === 'processing')
      )
      .reduce((acc, r) => acc + r.amountKes, 0)
    const unverified = requests
      .filter((r) => r.kind === 'deposit' && r.status.toLowerCase() === 'pending_verification')
      .reduce((acc, r) => acc + r.amountKes, 0)
    return { pendingOut, unverified }
  }, [requests])

  const available = Math.max(
    0,
    Math.min(capLimit, balanceKes - reserved.pendingOut - reserved.unverified)
  )
  const amountNum = Number(amount)
  const fee = withdrawalFee(amountNum)
  const valid = amountNum > fee && amountNum <= available && phone.trim().length > 0
  const receive = Math.max(0, amountNum - fee)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !valid) return
    createWithdrawal.mutate(
      { userId, amount: amountNum, phone: phone.trim(), provider },
      {
        onSuccess: () => setSubmitted(true),
      }
    )
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-5">
        <Link href="/wallet" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to wallet
        </Link>

        <div className="mt-6 rounded-xl border border-[#8DFF45]/20 bg-[#8DFF45]/5 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#8DFF45]/10">
            <Check className="h-7 w-7 text-[#8DFF45]" />
          </div>
          <h1 className="mt-4 text-xl font-black text-[#8DFF45]">
            {paid ? 'Withdrawal paid' : 'Withdrawal request sent'}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            KES {formatKes(amountNum)} to <span className="font-mono font-bold text-slate-200">{phone}</span> via{' '}
            <span className="font-semibold">{provider}</span>.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {paid
              ? 'The amount has been sent to your mobile money.'
              : 'The amount is reserved now and pays out after approval — usually within the hour.'}
          </p>
          <Link
            href="/wallet/history"
            className="mt-6 inline-block rounded-xl border border-slate-800 bg-slate-900/40 px-5 py-2.5 text-xs font-bold text-slate-200 transition-colors hover:bg-slate-900"
          >
            View in history
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <Link href="/wallet" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to wallet
      </Link>

      <h1 className="mt-4 text-xl font-black tracking-tight text-slate-100">Withdraw</h1>

      {DEMO_MODE && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3.5 py-2.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F6C453" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-[11px] text-amber-400/90">
            Demo mode — payouts are simulated and happen automatically.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 rounded-xl border border-slate-900/60 bg-slate-900/20 p-5">
        {/* AVAILABLE + 70% CAP */}
        <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 px-3.5 py-2.5">
          <div className="flex items-baseline justify-between">
            <p className="text-[11px] font-semibold text-slate-400">Available to withdraw</p>
            <p className="font-mono text-xs font-bold text-[#8DFF45]">KES {formatKes(available)}</p>
          </div>
          <p className="mt-0.5 text-[10px] text-slate-500">
            Up to 70% of your account (KES {formatKes(capLimit)}) · investment platform
          </p>
          {reserved.pendingOut > 0 && (
            <p className="mt-0.5 text-[10px] text-slate-500">
              {formatKes(reserved.pendingOut)} reserved in pending withdrawals
            </p>
          )}
          {reserved.unverified > 0 && (
            <p className="mt-0.5 text-[10px] text-slate-500">
              {formatKes(reserved.unverified)} pending verification — not withdrawable yet
            </p>
          )}
        </div>

        {/* AMOUNT */}
        <label className="mt-4 block">
          <span className="text-[11px] font-semibold text-slate-300">Amount (KES)</span>
          <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-3 focus-within:border-yellow-600/40">
            <span className="font-mono text-sm font-bold text-slate-500">KES</span>
            <input
              type="number"
              inputMode="decimal"
              min={1}
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-transparent font-mono text-lg font-black text-slate-100 outline-none placeholder:text-slate-700"
            />
            <button
              type="button"
              onClick={() => setAmount(String(available))}
              className="rounded-full border border-slate-800 px-2.5 py-1 font-mono text-[10px] font-bold text-slate-400 transition-colors hover:border-yellow-600/40 hover:text-yellow-600"
            >
              MAX
            </button>
          </div>
          {amountNum > available && (
            <p className="mt-1 text-[10px] font-semibold text-[#FF5A5A]">
              Amount exceeds your available balance (70% cap)
            </p>
          )}
        </label>

        {/* PROVIDER + NUMBER */}
        <p className="mt-5 text-[11px] font-semibold text-slate-300">Withdraw to</p>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {(['M-Pesa', 'Airtel Money'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setProvider(p)}
              className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors ${
                provider === p
                  ? 'border-yellow-600 bg-yellow-600/10 text-yellow-600'
                  : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <label className="mt-4 block">
          <span className="text-[11px] font-semibold text-slate-300">Your {provider} number</span>
          <input
            type="tel"
            inputMode="tel"
            placeholder="07XX XXX XXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-3 font-mono text-sm text-slate-100 outline-none placeholder:text-slate-700 focus:border-yellow-600/40"
          />
        </label>

        {/* APPROVAL NOTE */}
        <p className="mt-3 text-[10px] text-slate-500">
          Requests under the 70% cap with your registered phone are approved automatically; anything
          unusual goes to manual review.
        </p>

        {/* FEE SUMMARY */}
        {amountNum > 0 && (
          <div className="mt-5 rounded-xl border border-slate-800/80 bg-slate-950/40 p-3.5 font-mono text-[11px]">
            <div className="flex justify-between text-slate-400">
              <span>You withdraw</span>
              <span className="text-slate-200">KES {formatKes(amountNum)}</span>
            </div>
            <div className="mt-1 flex justify-between text-slate-500">
              <span>Processing fee · 2%</span>
              <span>KES {formatKes(fee)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-slate-800/80 pt-2 font-bold text-slate-200">
              <span>You receive</span>
              <span>KES {formatKes(receive)}</span>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={!valid || createWithdrawal.isPending}
          className="mt-6 w-full rounded-xl bg-yellow-600 px-4 py-3.5 text-sm font-bold text-slate-950 transition-colors hover:bg-yellow-500 disabled:opacity-50"
        >
          {createWithdrawal.isPending ? 'Submitting…' : `Withdraw KES ${amountNum > 0 ? formatKes(amountNum) : '—'}`}
        </button>
      </form>
    </div>
  )
}