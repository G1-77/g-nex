# GNEX Wallet System — Phase 2 (Deposits, Withdrawals & Locks)

**Status:** Built, lint + typecheck clean (not yet deployed)
**Build Approach:** Provisional-instant-credit + silent 10% reserve + 70% withdrawal cap + voluntary locks
**Related Design Docs:** `tradingviewimages/gnex_wallet_flow_visual.html`, `tradingviewimages/gnex_wallet_audit_alignment.html`

---

## 🎯 Phase 2 Objectives — BUILT

### Core Deliverables
- ✅ **M-Pesa PayBill deposit flow** with a unique, permanent per-user account number (Daraja `BillRefNumber`)
- ✅ **Airtel send-to-number flow** (unchanged, number-based)
- ✅ **Provisional instant credit** — balance reflects the moment the user taps "I've sent the money"
- ✅ **Silent 10% reserve** — deducted from every deposit, shown only as a neutral "Reserve" line
- ✅ **70% withdrawal cap** — users can never withdraw more than 70% of their account
- ✅ **Auto-approval gate** — withdrawals within the cap + registered phone are approved instantly
- ✅ **Voluntary lock card** — user-initiated locks with a 24-hour unlock cooling-off
- ✅ **Deposit duplicate guard** (15-min window)
- ✅ **Admin-ready contracts** — reversal/confirmation + approval wired for the future admin panel (UI deferred)
- ✅ **Realtime admin alert** — new deposits push to admins via Supabase Realtime (in-app only)

---

## 🔑 Key Product Decisions (confirmed)

| Decision | Choice |
|----------|--------|
| Deposit target | M-Pesa **PayBill** + per-user **account number** (not a shared till number) |
| Account number | Defaults to normalized phone (`07XXXXXXXX`); fallback `GN` + 8 digits; user pays from **any** line as long as they enter their account number |
| Airtel | Send-to-number `0733 000 000` (unchanged) |
| Instant credit | **Provisional** — credited on "I've sent", held `pending_verification` until admin verifies |
| Reversal | **Admin-only** — no auto-reversal job |
| Reserve | 10% of every deposit, **silent in flow**, visible as "Reserve" line, excluded from account total & 70% cap |
| Withdrawal approval | Auto-approve iff amount ≤ 70% cap AND phone matches profile; else admin review |
| Voluntary lock | Unlock request → 24h cooling-off → lazy release back to balance |
| Admin alert | In-app Realtime only (SMS/email deferred) |

---

## 🗄️ Database Changes

### Migration: `supabase/migrations/20260819120000_wallet_accounts_reserve_locks.sql` (NOT YET PUSHED)

- `profiles.deposit_account_number` — unique per-user M-Pesa account number (+ partial unique index)
- `user_wallets.locked_kes` — voluntary-lock balance
- `user_wallets.reserve_kes` — silent 10% reserve balance
- `deposit_requests.payment_channel` (`paybill`/`send_to_number`), `account_number`, `expected_amount`, `mpesa_reference`
- `withdrawal_requests.approved_by` (`'auto'` or admin id), `approved_at`, `paid_at`, `fee_kes` (2% charge)
- New table **`fund_locks`** — `id, user_id, amount_kes, status (locked|unlock_pending|released|cancelled), created_at, unlock_available_at, released_at`
- RLS: user can read their own `fund_locks`; admins get SELECT on `deposit_requests`/`withdrawal_requests` (joins `admin_roles`)
- Realtime: `deposit_requests` published + replica identity full (drives admin alerts)

### Existing migrations untouched
`user_holdings`, `deposit_requests` RLS migrations kept as-is. All wallet/deposit/withdrawal tables live in remote Supabase (project `juaijgiihnzdvqbqkojx`) — apply via `supabase db push`.

---

## 📦 New / Updated Files

### New
- `lib/constants/wallet.ts` — single source of truth for all wallet config
  - `MPESA_PAYBILL_NUMBER` (`'000000'` placeholder), `AIRTEL_PAYIN_NUMBER`, `RESERVE_RATE: 0.1`, `MAX_WITHDRAW_PCT: 0.7`, `LOCK_UNLOCK_HOURS: 24`, `DEPOSIT_DUPLICATE_WINDOW_MS` (15 min), `QUICK_DEPOSIT_AMOUNTS`, `WITHDRAWAL_FEE_RATE: 0.02` (flat 2%, no min/max) via `withdrawalFee()`
- `lib/hooks/useDemoSimulation.ts` — demo-mode poller that advances pending deposits/withdrawals live
- `components/wallet/DemoSendModal.tsx` — simulated STK-push send confirmation (demo only)
- `lib/market/funding.ts` — server-side wallet logic
  - `roundKes`, `normalizeDepositAccountNumber`, `generateFallbackAccountNumber`
  - `ensureDepositAccountNumber(serviceClient, userId)` — create-on-first-use
  - `creditDepositBalance(serviceClient, userId, amountKes)` — atomic 90/10 split
  - `computeWithdrawalAvailability(supabase, userId)` — 70% cap = `0.7 × (cash + locked + holdings)`, excludes reserve
  - `evaluateWithdrawalApproval(supabase, userId, amountKes, phone)` — auto-approve decision
- `app/api/wallet/deposit-account/route.ts` — GET the user's permanent account number
- `app/api/wallet/locks/route.ts` — POST `lock` / `unlock` / `release` (service-role writes)
- `app/api/wallet/demo/simulate/route.ts` — **demo mode only** (403 otherwise): advances the user's rows ~6s after creation, deposits `pending_verification → confirmed` and withdrawals `pending/approved → paid`, exactly like the future admin panel
- `components/wallet/LockCard.tsx` — lock/unlock UI with active-lock list + countdown

### Updated
- `app/api/deposits/route.ts` — ensures account number, duplicate guard, insert `pending_verification` row, then `creditDepositBalance` (90/10)
- `app/api/withdrawals/route.ts` — KES path now runs the 70% cap + auto-approval gate + computes the 2% fee and persists `fee_kes`; asset `lock_funds` path unchanged
- `app/api/wallet/demo-fund/route.ts` — demo credits apply the same 90/10 reserve split
- `lib/supabase/market.types.ts` — `UserWalletState.lockedKes/reserveKes`, `FundLock`, `FundingRequest.paymentChannel/accountNumber`
- `lib/market/wallet-utils.ts` — status labels/tones for `pending_verification`, `approved`, `paid`, `reversed`
- `lib/react-query/market/keys.ts` + `queries.market.ts` — wallet row/request/profile field mappings; `PortfolioSummary.totalKes = cash + locked + holdings` (reserve excluded); new hooks `useDepositAccountNumberQuery`, `useGetFundLocksQuery`, `useLockFundsMutation`, `useUnlockFundsMutation`, `useReleaseUnlocksMutation`
- `components/wallet/WalletBalanceCard.tsx` — Cash / Locked / Reserve breakdown row
- `app/(main)/wallet/page.tsx` — wires summary + LockCard + lazy release-on-mount
- `app/(main)/wallet/deposit/page.tsx` — PayBill + account-number flow, amber "deposit under review" timeline
- `app/(main)/wallet/withdraw/page.tsx` — 70% cap messaging, available/cap summary, live 2% fee breakdown, approval note, green "paid" state
- `app/(main)/wallet/deposit/page.tsx` — PayBill + account-number flow, demo send popup, live amber→green verification timeline

---

## 🔄 Flow Summary

### Deposit (M-Pesa)
```
User opens Deposit → sees PayBill {WALLET_CONFIG.MPESA_PAYBILL_NUMBER} + their account number
→ sends via M-Pesa (any line) → taps "I've sent the money"
→ POST /api/deposits
   1. duplicate guard (same user/amount/account within 15 min → 409)
   2. ensure deposit_account_number
   3. insert deposit_requests row (status=pending_verification, payment_channel=paybill, account_number)
   4. creditDepositBalance → +90% balance_kes, +10% reserve_kes  (atomic, service role)
→ UI shows amber "Deposit under review" timeline (provisionally credited)
→ Realtime push notifies admins → admin verifies → status confirmed (admin UI: future)
```

### Withdrawal (KES)
```
User opens Withdraw → sees available = min(70% × account, cash − pendingOut − unverified)
→ enters amount + phone → POST /api/withdrawals
   1. fee = withdrawalFee(amount) = 2% flat (no min/max); amount must exceed fee
   2. evaluateWithdrawalApproval → auto-approved if amount ≤ 70% cap AND phone matches profile
   3. insert withdrawal_requests (fee_kes persisted, approved_by='auto' if approved)
→ payout (B2C) is manual/admin — deferred
```

### Investor demo mode (`NEXT_PUBLIC_DEMO_MODE=true`)
```
Deposit: "Simulate sending via M-Pesa" → STK-push popup (spinner → green "Sent") → auto-submits
→ provisional credit → timeline shows amber "Verifying" for ~6s
→ poller (every 4s) hits /api/wallet/demo/simulate → deposit flips to confirmed → timeline turns GREEN
Withdraw: request created → ~6s later simulator marks it paid → success screen flips to green "Paid"
The simulator is 403 (inert) unless the env flag is set — safe in production.
```

### Voluntary Lock
```
Lock: amount ≤ balance − pendingOut − unverified → move balance→locked, insert fund_locks(locked)
Unlock: mark locked rows unlock_pending + unlock_available_at = now + 24h
Release (lazy, on wallet mount): due unlock_pending rows → locked→balance, status=released
```

### Silent Reserve
Deposits (real + demo) credit 90/10. Reserve is invisible in the flow, shown as a muted "Reserve" line on the wallet card, excluded from `totalKes` and the 70% cap. Sweep/withdrawal of reserve is admin-controlled — deferred.

---

## 🔐 Security

- Wallet/ledger writes go through **service-role clients** in API routes; user-scoped RLS is read-only from the browser
- Lock server-side cap re-validated via `computeWithdrawalAvailability`
- Duplicate-guard prevents double-crediting the same "I've sent" claim
- Auto-approval only when phone matches the registered profile number
- Reversal is **admin-only** (no user-facing reverse endpoint)

---

## ✅ Verification

- `npx tsc --noEmit` — clean
- `npx eslint` — 0 errors (3 pre-existing `<img>` warnings in HoldingsList/WalletBalanceCard)
- Migration not yet applied to remote; no manual E2E run yet

---

## 🚧 Deferred / Out of Scope (Future)

1. Admin panel UI (confirm/reverse deposits, approve withdrawals, reserve sweep)
2. Daraja C2B / STK push integration (replace placeholder PayBill number)
3. B2C payouts for `approved` withdrawals
4. SMS/email notifications + notification bell
5. Fake performance chart removal + broken sell-flow fix + trade history (existing audit gaps)

---

## 🧪 Manual Test Checklist

- [ ] `supabase db push` applies the migration cleanly
- [ ] Deposit page shows PayBill + my account number (auto-created, stable across reloads)
- [ ] "I've sent" credits 90% to balance, 10% to reserve (verify in DB)
- [ ] Second identical "I've sent" within 15 min → 409
- [ ] Wallet card shows Cash / Locked / Reserve; total excludes Reserve
- [ ] Lock funds → balance drops, Locked rises; Unlock → countdown; wallet reload after 24h → released
- [ ] Withdraw > 70% of account rejected; within cap + own phone → instant `approved`
- [ ] Wrong-phone withdrawal lands `pending` for admin
- [ ] Admin (in `admin_roles`) sees new deposit via Realtime

---

**Built with:** Next.js 16, React 19, TypeScript, Tailwind 4, Supabase, React Query 5

**Zero funded. Zero compromise. 100% execution.**
