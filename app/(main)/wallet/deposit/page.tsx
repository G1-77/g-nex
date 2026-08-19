'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Copy, Landmark, Smartphone } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import {
  useCreateDepositMutation,
  useDepositAccountNumberQuery,
  useGetUserProfileQuery,
  useGetUserRequestsQuery,
} from '@/lib/react-query/market/queries.market'
import { formatKes } from '@/lib/market/wallet-utils'
import { WALLET_CONFIG, QUICK_DEPOSIT_AMOUNTS, DEMO_MODE } from '@/lib/constants/wallet'
import { useDemoSimulation } from '@/lib/hooks/useDemoSimulation'
import DemoSendModal from '@/components/wallet/DemoSendModal'

type Provider = 'M-Pesa' | 'Airtel Money'

function CopyRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value.replace(/\s/g, ''))
    } catch {
      // clipboard unavailable — fall back to selection
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-800/80 bg-slate-950/40 px-3.5 py-2.5">
      <div>
        <p className="text-[11px] font-semibold text-slate-300">{label}</p>
        <p className="font-mono text-xs text-slate-500">{value}</p>
        {hint && <p className="text-[10px] text-slate-600">{hint}</p>}
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center gap-1.5 rounded-full border border-slate-800 px-2.5 py-1 text-[10px] font-bold text-slate-400 transition-colors hover:border-yellow-600/40 hover:text-yellow-600"
      >
        {copied ? <Check className="h-3 w-3 text-[#8DFF45]" /> : <Copy className="h-3 w-3" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

function TimelineStep({
  title,
  detail,
  state,
}: {
  title: string
  detail: string
  state: 'done' | 'active' | 'pending'
}) {
  const done = state === 'done'
  const active = state === 'active'
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-6 w-6 items-center justify-center rounded-full ${
          done ? 'bg-[#8DFF45]/10' : active ? 'bg-amber-400/10' : 'bg-slate-800'
        }`}
      >
        {done ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8DFF45" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : active ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F6C453" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
        )}
      </div>
      <div className="flex-1">
        <p className={`text-xs font-semibold ${done ? 'text-[#8DFF45]' : active ? 'text-amber-400' : 'text-slate-400'}`}>
          {title}
        </p>
        <p className="text-[10px] text-slate-500">{detail}</p>
      </div>
    </div>
  )
}

export default function DepositPage() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const { data: profile } = useGetUserProfileQuery(userId)
  const { data: accountNumber } = useDepositAccountNumberQuery(userId)
  const createDeposit = useCreateDepositMutation()
  const { data: requests = [] } = useGetUserRequestsQuery(userId)

  const [amount, setAmount] = useState('')
  const [provider, setProvider] = useState<Provider>('M-Pesa')
  const [phone, setPhone] = useState(profile?.mobileMoneyNumber ?? '')
  const [submitted, setSubmitted] = useState(false)
  const [demoOpen, setDemoOpen] = useState(false)

  useDemoSimulation(userId, submitted)

  const amountNum = Number(amount)
  const paybill = provider === 'M-Pesa'

  const latestDeposit = requests.find((r) => r.kind === 'deposit')
  const confirmed = latestDeposit?.status.toLowerCase() === 'confirmed'

  const submitDeposit = () => {
    if (!userId || !amountNum || amountNum <= 0) return
    if (!paybill && !phone.trim()) return
    createDeposit.mutate(
      {
        userId,
        amount: amountNum,
        phone: phone.trim(),
        provider,
        reference: profile?.username ?? user?.email ?? 'wallet',
        paymentChannel: paybill ? 'paybill' : 'send_to_number',
        accountNumber: paybill ? (accountNumber ?? undefined) : undefined,
      },
      {
        onSuccess: () => setSubmitted(true),
      }
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (DEMO_MODE && amountNum > 0) {
      // Play the simulated send, then submit on completion.
      setDemoOpen(true)
      return
    }
    submitDeposit()
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-5">
        <Link href="/wallet" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to wallet
        </Link>

        <div
          className={`mt-6 rounded-xl border p-8 text-center ${
            confirmed ? 'border-[#8DFF45]/20 bg-[#8DFF45]/5' : 'border-amber-400/20 bg-amber-400/5'
          }`}
        >
          <div
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
              confirmed ? 'bg-[#8DFF45]/10' : 'bg-amber-400/10'
            }`}
          >
            {confirmed ? (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#8DFF45" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F6C453" strokeWidth="1.8">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            )}
          </div>
          <h1 className={`mt-4 text-xl font-black ${confirmed ? 'text-[#8DFF45]' : 'text-slate-100'}`}>
            {confirmed ? 'Deposit confirmed' : 'Deposit under review'}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            <span className="font-mono font-bold text-slate-200">KES {formatKes(amountNum)}</span> via{' '}
            <span className="font-semibold">{provider}</span>{' '}
            {confirmed ? 'is now permanently credited to your wallet.' : 'is being verified.'}
          </p>
          {!confirmed && (
            <p className="mt-1 text-xs text-amber-400/90">
              Your balance was credited provisionally — it becomes permanent as soon as we confirm your payment.
            </p>
          )}

          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-left">
            <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">What happens next</p>
            <div className="mt-3 space-y-3">
              <TimelineStep
                title="Request submitted"
                detail="Provisionally credited · just now"
                state="done"
              />
              <TimelineStep
                title="Verifying payment"
                detail={confirmed ? 'Payment matched to your account' : `We confirm on your ${provider} statement`}
                state={confirmed ? 'done' : 'active'}
              />
              <TimelineStep
                title="Permanently credited"
                detail="Funds are yours to trade"
                state={confirmed ? 'done' : 'pending'}
              />
            </div>
          </div>

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

      <h1 className="mt-4 text-xl font-black tracking-tight text-slate-100">Deposit</h1>
      <p className="mt-0.5 text-xs text-slate-500">Send money to GNex and we credit your wallet instantly.</p>

      {DEMO_MODE && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3.5 py-2.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F6C453" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-[11px] text-amber-400/90">
            Demo mode — sending is simulated and verification is automatic.
          </p>
        </div>
      )}

      {/* PROVIDER */}
      <div className="mt-5 grid grid-cols-2 gap-2">
        {(['M-Pesa', 'Airtel Money'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setProvider(p)}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors ${
              provider === p
                ? 'border-yellow-600 bg-yellow-600/10 text-yellow-600'
                : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-200'
            }`}
          >
            {p === 'M-Pesa' ? <Smartphone className="h-3.5 w-3.5" /> : <Landmark className="h-3.5 w-3.5" />}
            {p}
          </button>
        ))}
      </div>

      {/* SEND TO */}
      <section className="mt-4 rounded-xl border border-slate-900/60 bg-slate-900/20 p-5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">1 · Send money to GNex</p>
        <p className="mt-1.5 text-xs text-slate-400">
          {paybill
            ? 'Pay with M-Pesa PayBill. You can pay from any Safaricom line — just use your account number below.'
            : 'Use your mobile money app to send to the number below. Use your registered phone number when sending so we can verify it quickly.'}
        </p>

        <div className="mt-3 space-y-2.5">
          {paybill ? (
            <>
              <CopyRow label="PayBill · Business number" value={WALLET_CONFIG.MPESA_PAYBILL_NUMBER} />
              <CopyRow
                label="Account number · Yours"
                value={accountNumber ?? 'Loading…'}
                hint="This is your permanent GNex account number — always the same"
              />
            </>
          ) : (
            <CopyRow label="Airtel Money · Send to" value={WALLET_CONFIG.AIRTEL_PAYIN_NUMBER} />
          )}
        </div>
      </section>

      {/* REQUEST CREDIT */}
      <form onSubmit={handleSubmit} className="mt-4 rounded-xl border border-slate-900/60 bg-slate-900/20 p-5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">2 · Tell us you&apos;ve sent it</p>

        {/* AMOUNT */}
        <label className="mt-4 block">
          <span className="text-[11px] font-semibold text-slate-300">Amount sent (KES)</span>
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
          </div>
        </label>

        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_DEPOSIT_AMOUNTS.map((quick) => (
            <button
              key={quick}
              type="button"
              onClick={() => setAmount(String(quick))}
              className={`rounded-full border px-3 py-1.5 font-mono text-[11px] font-bold transition-colors ${
                amountNum === quick
                  ? 'border-yellow-600 bg-yellow-600/10 text-yellow-600'
                  : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-200'
              }`}
            >
              {quick.toLocaleString('en-KE')}
            </button>
          ))}
        </div>

        {/* YOUR NUMBER (secondary signal for M-Pesa, required for Airtel) */}
        <label className="mt-5 block">
          <span className="text-[11px] font-semibold text-slate-300">
            {paybill ? 'Your phone number (optional)' : `Your ${provider} number you'll send from`}
          </span>
          <input
            type="tel"
            inputMode="tel"
            placeholder="07XX XXX XXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-3 font-mono text-sm text-slate-100 outline-none placeholder:text-slate-700 focus:border-yellow-600/40"
          />
        </label>

        <p className="mt-3 text-[10px] text-slate-500">
          {paybill
            ? `We match your payment to your account number (${accountNumber ?? '…'}) — adding your phone helps us verify faster.`
            : 'We verify the transfer against your phone number.'}
        </p>

        <button
          type="submit"
          disabled={
            !amountNum ||
            amountNum <= 0 ||
            (!paybill && !phone.trim()) ||
            createDeposit.isPending
          }
          className="mt-6 w-full rounded-xl bg-yellow-600 px-4 py-3.5 text-sm font-bold text-slate-950 transition-colors hover:bg-yellow-500 disabled:opacity-50"
        >
          {createDeposit.isPending
            ? 'Submitting…'
            : DEMO_MODE
              ? `Simulate sending via ${provider}`
              : "I've sent the money"}
        </button>
      </form>

      <DemoSendModal open={demoOpen} amount={amountNum} provider={provider} onComplete={() => submitDeposit()} />
    </div>
  )
}