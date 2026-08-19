# GNEX Milestones — Phase Progress Tracker

> Living document tracking every GNEX phase from kickoff to production.
> **Last updated:** 2026-08-19

---

## Phase Status Legend

| Icon | Meaning |
|------|---------|
| ✅ | Complete + verified (tsc/eslint/build clean, migration pushed) |
| 🟡 | Built but not yet deployed / pending final verification |
| 🔵 | In progress |
| ⬜ | Not started |

---

## Phase 1 — Market System

**Status:** ✅ Complete — see `PHASE_1_COMPLETE.md`

### Delivered
- Stories-style asset carousel (auto-rotate, tap-pause, progress dots)
- Market overview page — responsive 3-column layout
- Watchlist cards with live prices (CoinGecko + Gold API)
- Sentiment indicators, alpha feed preview, verified positioning, market movers
- Sticky mobile buy/sell bar + bottom navigation
- Real-time Supabase subscriptions for social updates

### Key Files
`components/market/`, `lib/market/`, `lib/react-query/market/`

---

## Phase 2 — Wallet System (Deposits, Withdrawals & Locks)

**Status:** 🟡 Built, lint + typecheck clean — migration not yet deployed

### Delivered
- M-Pesa PayBill deposit flow (unique per-user `BillRefNumber` account)
- Airtel send-to-number flow
- Provisional instant credit + silent 10% reserve
- 70% withdrawal cap + auto-approval gate
- Voluntary lock card (24h unlock cooling-off)
- Deposit duplicate guard (15-min window)
- Admin-ready contracts (reversal/confirmation/approval) — UI deferred to Phase 4

### Key Files
`app/(main)/wallet/`, `app/api/wallet/`, `components/wallet/`, `lib/market/wallet-utils.ts`,
`lib/constants/wallet.ts`, `lib/hooks/useDemoSimulation.ts`,
`supabase/migrations/20260819120000_wallet_accounts_reserve_locks.sql`

---

## Phase 3 — Community & Social Feed

**Status:** ✅ Complete

### Delivered
- Feed list, create-post modal/card, post interactions
- Comment drawer, likes, follows (with follower counts), share engine
- Trade tags (setups) with asset symbols + signal types
- Infinite scroll pagination, optimistic updates via React Query
- Verified badge + ROI indicators on feed cards
- Reputation badge surfaced on feed cards + profile header

### Key Files
`components/feed/`, `lib/react-query/mutations/feed.mutations.ts`,
`lib/react-query/queries/feed.queries.ts`

---

## Phase 4 — Finance Admin

**Status:** ✅ Complete + verified

### Delivered
- Admin center foundation: role-based access (super_admin / admin / support / editor)
- `admin_permissions` catalog — 17 permission codes seeded
- Deposit management — confirm / reject via `admin_confirm_deposit` / `admin_reject_deposit` RPCs
- Withdrawal management — process / reject via `admin_process_withdrawal` / `admin_reject_withdrawal` RPCs
- Unified `admin_transactions_view` (deposits + withdrawals + ledger, username/asset embedded)
- Order management (market / limit / stop-limit, open / filled / partial / cancelled)
- Status CHECK-constraint fixes aligned with the app's status machines

### Key Files
`app/admin/finance/`, `app/api/admin/finance/`,
`supabase/migrations/20260819200000_admin_centre.sql`

---

## Phase 5 — Platform Administration

**Status:** ✅ Complete + verified

### Delivered
- User administration (search, active/verified flags, demo funding)
- Community moderation — reports queue + resolution
- Editorial picks (curated posts on the feed)
- Role management UI (grant/revoke roles, customize permissions per role)
- Platform settings (`platform_settings` table) — fees, limits, payment providers, asset support
  - `trading_fee_pct`, `max_withdraw_pct`, `withdrawal_fee_rate`, `deposit_min_kes`,
    `deposit_max_kes`, `maintenance_mode`, `payment_providers`, `supported_assets`
- Maintenance mode (gate enforced in `proxy.ts` middleware)
- Audit log viewer (append-only select policy)
- Settings wired into live code paths (deposits, withdrawals, market orders, funding)

### Key Files
`app/admin/`, `app/api/admin/`, `lib/admin/`, `app/maintenance/`, `proxy.ts`

---

## Phase 6 — Creator + Trader Reputation

**Status:** ✅ Complete + verified

### Delivered
- `trader_reputation` table (decoupled from `admin_roles`)
- Reputation engine — `compute_trader_reputation(uuid)` + `recompute_all_reputations()`
- Status tiers: new_trader → active_trader → community_analyst → verified_trader → top_trader
- `ReputationBadge` component surfaced on profile headers + feed post cards
- Reputation hydrated into the feed query (per-author)
- Admin recalc route + audit trail

### Key Files
`components/reputation/`, `lib/admin/reputation.ts`, `app/api/admin/reputation/`,
`lib/react-query/queries/feed.queries.ts`, `components/profile/ProfileHeader.tsx`

---

## Infrastructure & Verification

| Item | Status |
|------|--------|
| DB migration `20260819200000_admin_centre.sql` | ✅ Pushed to remote |
| `trader_reputation` populated (4 profiles scored) | ✅ Verified |
| `admin_permissions` seeded (17 rows) | ✅ Verified |
| `tsc --noEmit` | ✅ Clean |
| `eslint` (new/edited code) | ✅ 0 errors |
| `next build` | ✅ Compiled successfully |
| CI: `.github/workflows/db-push.yml` + `npm run db:push` | ✅ In place |

---

## Next Steps (Open Items)

- [ ] Deploy Phase 2 wallet migrations to remote
- [ ] Live-data QA of admin pages against real deposits/withdrawals/orders
- [ ] Reputation badge on remaining setup cards / top-trader widgets
- [ ] Reputation recompute schedule (cron / trigger on trade close)

---

**Built with:** Next.js 16, React 19, TypeScript 5, Tailwind 4, Supabase, React Query 5