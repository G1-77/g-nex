# GNEX Milestones — Phase Progress Tracker

> Living document tracking every GNEX phase from kickoff to production.
> **Last updated:** 2026-08-22

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
---

## Phase 7 — Trading Ecosystem (Quick Trade · Spot Pro · FTT scaffold)

**Status:** ✅ Implemented (code + migration validated; migration push pending CI)

### Delivered
- **Security hardening:** `execute_trade`/`close_position` and all legacy
  financial RPCs revoked from `public`/`anon`/`authenticated` (service-role only);
  `audit_logs.metadata` column added so admin audit writes persist; conditional-order
  engine RPCs (`place_order`, `cancel_order`, `process_conditional_orders`) are
  SECURITY DEFINER, service-role-only, with internal ownership/authz checks.
- **Conditional orders:** limit / stop-market / stop-limit / take-profit on Spot.
  Real balance reservations (KES for buys, units for sells), trigger-side sanity
  rules, expiry with reservation release, SKIP LOCKED concurrency safety,
  auto-liquidation of crossed margin positions, notification triggers on fills.
- **Server-authoritative config layer** (`lib/market/trading-config.ts`):
  trading master switch, per-product switches, min/max trade USD, max leverage,
  tradable symbols from the `assets` table — enforced in market/quote/close/
  place/cancel/engine routes. Admin UI toggles + limits added to system settings.
- **Price integrity:** removed the random gold price fallback (stale real price
  or explicit failure only); chart mock candle generator deleted — XAU now has a
  real OHLC feed (`fetchGoldOHLC`); staleness guard (`lib/market/freshness.ts`,
  90s ceiling) blocks execution when provenance is missing/expired;
  `lastUpdatedAt` provenance stamped through the ticker pipeline.
- **Fee control restored:** engine reads `trading_fee_pct` (the key the admin UI
  writes) — previously dead due to key mismatch.
- **New surfaces:** `/trade` hub, `/trade/quick` (one-tap execution),
  `/trade/spot` (full terminal: pair selector, chart, Market/Limit/Stop/TP form,
  open-orders cancel, order history with realized PnL); nav updated (Feed ·
  Markets · Trade · Wallet). FTT card present but disabled ("Soon").
- **Engine heartbeat:** `POST /api/orders/engine` resolves authoritative prices
  server-side and processes resting orders; clients tick every 8s while trading
  surfaces are open.

### Key Files
`supabase/migrations/20260822000000_trading_ecosystem.sql`, `lib/market/trading-config.ts`,
`lib/market/freshness.ts`, `lib/market/gold.ts`, `lib/market/ohlc.ts`, `lib/market/execution.ts`,
`app/api/orders/{place,cancel,engine}/route.ts`, `components/trade/{QuickTradePanel,SpotTerminal}.tsx`,
`app/(main)/trade/**`, `lib/react-query/queries/orders.queries.ts`,
`lib/supabase/market.types.ts`, `app/admin/system/settings/page.tsx`

### Verification
- Migration executed statement-by-statement against the remote DB inside a
  rolled-back transaction: 12 ALTER / 7 CREATE / 4 REVOKE / 3 GRANT / seed INSERT — zero errors.
- `tsc --noEmit` ✅ · `eslint` (new code) ✅ 0 errors · `next build` ✅ all routes compile.

---

## Phase 8 — Trading UX + Market Data Correction & Stabilization

**Status:** ✅ Implemented, migrations applied to remote, end-to-end verified

### Issues Found → Root Causes
1. **Fees wrong (0.5% trading / 2% withdrawal):** `platform_settings` was never
   seeded, so silent fallback defaults applied; fee semantics were split between
   whole-percent (`p_fee_percent`) and fraction conventions across RPCs, routes
   and UI. Withdraw page even hardcoded "Processing fee · 2%".
2. **"Price feed delayed" froze XAU/USDT permanently:** `isPriceStale` compared
   provider event-time against the device clock (skew-sensitive), and gold's
   >90s upstream cadence exceeded a crypto-tuned single ceiling.
3. **Browser-side provider pipeline:** pages called CoinGecko/xaus directly
   (`next:{revalidate}` inert client-side) — rate-limit/CORS exposure; six
   duplicated symbol maps; asset page hardcoded `KES_TO_USD_RATE = 130`.
4. **Charts destroyed/recreated on every 60s refetch**, no persistent current-price
   marker, `fitContent()` zoom-outs hid live movement.
5. **Quick Trade SELL ignored holdings** — could attempt to sell unheld assets;
   server errors surfaced raw with no pre-validation or reason line.
6. **Engine fills didn't refresh the UI:** invalidation used bare
   `['wallet']/['holdings']/['orders']` keys that matched nothing (real channels
   are `marketKeys.*` = `['market', channel, userId]`).
7. **Timeframes missing in Spot Terminal:** local list stripped to
   `1H/4H/1D/1W`; CoinGecko free OHLC is too coarse for real 1m–15m candles.
8. **Withdrawals broken for every user (production bug found by smoke test):**
   `withdrawal_requests` RLS had SELECT-only policies — no INSERT policy
   (deposits got the equivalent fix in `20260819080443`, withdrawals never did),
   so `POST /api/withdrawals` always failed RLS with "new row violates
   row-level security policy".
9. **Buttons showed default cursor:** Tailwind v4 removed the UA
   `button { cursor: pointer }` rule.
10. **Crash risk on non-HTTPS origins:** `crypto.randomUUID()` throws on
    insecure contexts, silently killing trade submission.

### Fixes
- Fees unified as **fractions end-to-end** (`trading_fee_pct=0.02`,
  `withdrawal_fee_rate=0.03` force-seeded; RPCs recreated with `p_fee_rate`;
  routes/hooks/UI read one source; admin settings validated 0–0.2 with clear labels).
- Server-authoritative pricing: new `GET /api/market/prices` and
  `GET /api/market/ohlc` wrap the existing services; browsers never contact
  providers; shared FX everywhere (hardcoded rate deleted).
- Honest freshness model: provenance-based (`lastUpdatedAt` + `receivedAt`,
  optimistic min-age), per-source ceilings (WS 90s / REST baseline 120s / gold
  300s); LIVE/DELAYED/UNAVAILABLE pills; execution still pauses only on
  delayed/unavailable.
- Charts created once per mount and mutated in place (`setData`/`update`),
  persistent current-price line via `createPriceLine`, `autoSize`, real Binance
  klines for crypto 1m–1M; gold honestly restricted to 1D/1W/1M (xaus serves
  daily bars only); USDT removed from the WS overlay (no honest USD pair).
- Quick Trade repaired: BUY/SELL bounds vs balance/holdings, MIN/25/50/75/MAX
  chips, quote tracking (5s stale / 8s poll), disabled-button reason lines,
  UUID fallback, engine-tick keys fixed, Spot Terminal timeframes restored via
  shared `TimeframeSelector`; global pointer cursor restored.

### Database Changes
- `20260822100000_fee_fraction_semantics.sql`: settings seed + recreate
  `execute_trade`/`place_order`/`process_conditional_orders`/`close_position`
  with fraction fees (DROP+CREATE — Postgres forbids renaming a parameter via
  CREATE OR REPLACE). Legacy dormant fee RPCs intentionally left untouched.
- `20260822110000_withdrawal_insert_policy.sql`: INSERT policy for
  `withdrawal_requests` (owner-bound, statuses pending/approved only).
- Both pushed to remote and recorded in migration history.

### Verification (executed live against remote)
- `tsc --noEmit` ✅ · ESLint ✅ · production build compiles ✅ (build-worker
  type-check segfaults under local memory pressure; standalone tsc is the same check)
- `GET /api/platform/config` → `{tradingFeeRate:0.02, withdrawalFeeRate:0.03}` ✅
- Quote $50 BTC → fee $1.00 (**exactly 2%**); BUY executed with
  fee_kes 129.44 = 2% of gross; SELL net = gross − 2% ✅
- Limit order reserved funds incl. fee; cancel released them ✅ · engine tick OK ✅
- Withdrawal request persisted with fee_kes 30 = **3% of KES 1000**, auto-approved ✅
- OHLC endpoints return real Binance klines (1m/4H) and gold daily; XAU intraday
  honestly rejected 400 ✅
- Settings rows confirmed remotely: `trading_fee_pct=0.02`, `withdrawal_fee_rate=0.03` ✅

### Key Files
`supabase/migrations/202608221{00000,10000}_*.sql`, `lib/market/{execution,freshness,ohlc,price-service,binance-realtime}.ts`,
`app/api/market/{prices,ohlc}/route.ts`, `app/api/platform/config/route.ts`,
`app/api/orders/*`, `lib/react-query/market/{queries.prices,queries.config}.ts`, `lib/hooks/useNow.ts`,
`components/trade/{QuickTradePanel,SpotTerminal}.tsx`, `components/market/{TradingViewChart,TimeframeSelector}.tsx`,
`app/(main)/markets/[symbol]/page.tsx`, `app/(main)/wallet/withdraw/page.tsx`, `app/globals.css`

### Known Follow-ups
- Visual/manual QA of chart interactions + narrow viewports recommended.

---

## Phase 9 — Theme System + Withdrawal Approval Boundary

**Status:** ✅ Implemented, lint + typecheck clean — migration deployment not verified in this session

### Delivered
- **Theme system (Light / Dark / System)**: `ThemeProvider` with `useSyncExternalStore` for zero-hydration-mismatch SSR; preference persisted in `localStorage` (`gnex-theme`); OS `prefers-color-scheme` live re-resolution; inline no-flash script in `app/layout.tsx` applies `dark`/`light` classes to `<html>`; `globals.css` light palette (Slate scale inverted); 20+ UI components updated across feed, admin, profile, market, wallet, layout
- **Withdrawal approval boundary rework**: ALL KES withdrawals now enter `pending` for admin review — auto-approval removed entirely
- **Atomic service-role RPC `request_withdrawal`**: FOR UPDATE wallet lock → idempotent replay check (idempotency keys prevent double-reservation) → fee/provider/cap validation → balance→locked reservation → insert request + pending ledger entry + audit trail
- **Migrations**:
  - `20260822120000_approval_request_fk.sql` — FK for approval requests
  - `20260822130000_withdrawal_approval_boundary.sql` — core RPC + boundary logic
  - `20260822140000_withdrawal_notifications.sql` — lifecycle trigger (requested/approved/processing/sent/rejected/failed/cancelled); `create_notification` execute re-granted to `service_role`
  - `20260822150000_fix_request_withdrawal.sql` — fixes: `record` vs jsonb unwrapping (`#>> '{}'` for bare scalars), cost-basis holdings valuation, debit-before-upsert ordering bug
- **API routes rewritten**: `POST /api/withdrawals` uses `computeWithdrawalAvailability` pre-validation + service-role RPC execution; structured response with `grossKes`/`netKes`/`feeKes`
- **Admin routes updated**: `app/api/admin/approvals/route.ts`, `app/api/admin/finance/withdrawals/route.ts`, `app/admin/finance/withdrawals/page.tsx` aligned with pending-only flow

### Key Files
`components/providers/ThemeProvider.tsx`, `app/layout.tsx`, `app/globals.css`, `app/api/withdrawals/route.ts`, `lib/market/funding.ts`, `lib/admin/executors.ts`, `app/api/admin/approvals/route.ts`, `supabase/migrations/202608221{2,3,4,5}0000_*.sql`, 20+ theme-aware components

### Verification
- `tsc --noEmit` ✅ Clean
- ESLint on new/edited code ✅ 0 errors (2 pre-existing `any` errors in `VerifiedPositioning.tsx` from earlier commit remain)
- Migration syntax validated locally; remote deployment status not checked in this session
