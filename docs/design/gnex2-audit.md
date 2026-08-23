# GNEX 2.0 Deep Audit — Codebase vs UIUX Brief

> Audit performed 2026-08-23 before any refactor work, per brief §51 ("Before modifying anything, inspect the existing GNEX application").
> Brief: `docs/design/UIUX-Prompt.md` (55 numbered points). Classification per item: **PRESERVE** (working, keep) · **REFACTOR** (exists but weak) · **BUILD** (missing) · **RISK** (must not break / needs care).
> Line references are to commit `3c17dc7`.

---

## 1. Shell & Navigation (brief §5–9, §38–39)

| Area | Current state | Verdict |
|---|---|---|
| Root layout | `app/(main)/layout.tsx` renders only `Topnav` + `<main>` + `Bottomnav` (24 lines). No desktop left sidebar anywhere in the layout. | **BUILD** sidebar; **REFRACTOR** layout into 3-column shell |
| Three-column structure | Exists only on homepage inside `app/(main)/page.tsx`: left aside = Explore links + `MarketsWatchWidget`, center = `FeedList`, right aside = `TopTradersWidget`, `TopMoversWidget`, `TopStories`. Columns are per-page, not shell-level. | **REFRACTOR** — move structural columns to layout level |
| Topnav | `components/layout/Topnav.tsx` — center links Feed `/`, Markets `/markets`, Trade `/trade`; right: portfolio pill → `/wallet` (KES total + growth badge, :110–133), mobile search button (**no-op**), messages button (no-op), bell button (**no-op**, not linked), `AvatarDropdown`. | **PRESERVE** structure; **BUILD** search + notifications wiring |
| Hamburger drawer | `Topnav.tsx` hamburger opens `components/layout/MobileMenuDrawer.tsx` (framer-motion slide-in overlay) containing Explore links + market widgets. "Saved Strategies" and "GNEX Academy" items are dead (`href:null`). | **PRESERVE** pattern (brief §8 mandates keeping it); **REFRACTOR** contents to mirror new sidebar |
| Bottom nav | `components/layout/Bottomnav.tsx` — 4 items: Feed→`/`, Markets, Trade, Wallet (+ floating `MarketTradeBar` on `/markets`). Brief §9 requires **Home \| Markets \| Trade \| Feed \| Wallet** with Trade emphasized. | **REFACTOR** |
| Network boundary | Root `proxy.ts` (Next 16 convention): auth redirect, maintenance gate (`platform_settings.maintenance_mode` + staff check), admin role filter for `/admin/*`. | **PRESERVE** — restored this session after bad `app/middleware.ts` move |

## 2. Homepage & Feed (§2, §10–11, §24–26)

- `app/(main)/page.tsx`: TickerStrip → grid [Explore+Watchlist | **FeedList (full infinite feed)** | TopTraders+TopMovers+TopStories].
- **No `/feed` route exists** — the full feed IS the homepage, violating §24/§25.
- Homepage does **not** open with Portfolio (✓ §2 satisfied today, must stay that way through redesign).
- Missing entirely: Create Post first position, Trader Discovery section, Trading Activity layer, Market Opportunities, Quick Trade embed, Sentiment block, end-of-Home Feed transition.
- Verdict: **REFACTOR** homepage into discovery surface (Phase C); **BUILD** dedicated `/feed`.

## 3. Social Components (§12, §27–30)

| Component | State | Verdict |
|---|---|---|
| Create Post | `CreatePostCard.tsx` trigger + `CreatePostModal.tsx` composer (tags, signal type, media upload to `post-media` bucket); insert via `create_post_with_tags` RPC. | **PRESERVE** modal, reposition on Home |
| Post card | `FeedPostCard.tsx` — author/follow header, content, media, asset signal card w/ live sparkline + Buy/Sell/Chart CTAs, like/comment/share row, edit/delete menu. Already uses elevation tokens (Phases 10–13 work). | **PRESERVE**, light polish only |
| Comments | `CommentDrawer.tsx` — bottom-sheet overlay, flat chronological list, **no replies/threading, no comment likes**, not Facebook-style inline (§28). | **REFACTOR** → conversational inline thread w/ replies |
| Expanded post | Does not exist (§29). | **BUILD** (route or near-full-screen view) |
| Like/unlike | Working, optimistic; writes `likes` table + notification row (`feed.mutations.ts:162–206`). | **PRESERVE** |
| Share | Working via `POST /api/posts/[id]` bumping `shares_count` + notification. | **PRESERVE** |
| Save/bookmark | Missing entirely — no table, no mutation, no UI. Dead "Saved Strategies" links. | **BUILD** (`saved_posts` + RLS + mutations + UI) |
| Report | `reports` table + admin queue exist (`app/admin/community/reports/page.tsx`) but **no client-side report path**. | **BUILD** report dialog wired to existing table |
| Follow/unfollow | Working (`follow.mutations.ts:18–47`), follower counts, `FollowersPopup`. Comment/follow notifications rely on remote triggers not in repo. | **PRESERVE**; verify remote triggers during Phase D |

## 4. Trading Surfaces (§17–23, §40–41)

- `QuickTradePanel.tsx`: price + staleness badge + quote + execute; bounds validation, fraction chips, disabled-reason lines (Phase 8 work). **No chart preview** (§18/§19 required). Route `/trade/quick`.
- `SpotTerminal.tsx` at `/trade/spot`: pair selector, `TradingViewChart`, Market/Limit/Stop/TP form, open orders cancel, history w/ realized PnL. Solid foundation for premium terminal pass (§21–23).
- Mobile terminal exists responsively but not as tabbed/drawer mobile-native layout (§40).
- Verdict: QuickTrade chart preview **BUILD**; terminal density pass **REFACTOR**.

## 5. Charts & Market Data

- `TradingViewChart.tsx` is the only lightweight-charts consumer (asset detail page :211–216, SpotTerminal :290–295); data from server-proxied `GET /api/market/ohlc` (real Binance klines, XAU daily) + live tick folding. Single authoritative price source: `useMarketPrices()` → `/api/market/prices` (Phase 8/13 verified).
- `PerformanceArea.tsx` custom SVG in wallet. No other chart libs.
- Verdict: **PRESERVE** all of it — Quick Trade mini-chart will reuse OHLC infra, not introduce new providers.

## 6. Wallet & Portfolio (§43)

- `/wallet` dashboard: `WalletBalanceCard` (embeds PerformanceArea), `HoldingsList`, `LockCard`, `OpenPositionsCard`; realtime invalidation via `useRealtimeFinance(userId)`.
- Sub-flows: `/wallet/deposit` (M-Pesa/Airtel), `/wallet/withdraw` (pending-review boundary, fee display), `/wallet/history` (merged deposits/withdrawals/trades).
- Portfolio pill in Topnav shows KES total + growth %.
- Verdict: **PRESERVE** untouched (§53); only add a low-priority compact entry point on Home.

## 7. Data Layer (§31–33)

### Migrations
18 tracked migrations cover financial/admin domains fully. **Social tables are untracked**: `posts`, `comments`, `likes`, `follows`, `trade_tags`, `profiles` policies pre-exist remotely with no repo SQL (except owner UPDATE/DELETE on posts/trade_tags from `20260819200000_admin_centre.sql:253–278`). RLS posture for these is unknown remotely — must be captured before schema additions (Phase D migration will also snapshot missing SELECT/INSERT policies).

### Columns actually used by code (inferred schema)
- posts: `id, user_id, content, media_url, likes_count, comments_count, shares_count, assetSymbols, signalType, created_at, updated_at` (camelCase tag columns)
- comments: `id, post_id, user_id, content, created_at`
- likes: `id, post_id, user_id`
- follows: `id, follower_id, following_id`
- trade_tags: `post_id, asset_symbol, signal_type, price, change, direction, created_at`
- notifications (tracked): `id, recipient_id, notifier_id, notification_type, metadata_json, is_read, created_at`

### Gaps / defects found
1. **RISK — security:** `GET /api/notifications` has no recipient filter (`app/api/notifications/route.ts:9–13`) AND tracked RLS select policy is `using (true)` (`20260820100000_brokerage_baseline.sql:1281–1283`) → any authenticated user can read everyone's notifications. Fix in Phase F (route scoping + RLS tighten).
2. **RISK:** `types/Notifications.ts:23–31` declares `user_id/type/message/data` — none exist except id/is_read/created_at; `app/notifications/page.tsx:18` renders nonexistent `message`.
3. **RISK:** cross-user reads conflict with tracked RLS — `SentimentBar.tsx:14–29` reads all users' `user_positions`/`trade_tags`; `VerifiedPositioning.tsx:23–43` joins positions↔profiles across users. Tracked policy is owner-scoped (`baseline:1265–1267`), so either untracked broader policies exist remotely or widgets silently return nothing. Needs deliberate public-read design (views/RPCs), not accidental policy drift.
4. Realtime publication membership tracked only for financial tables + deposit_requests; channels on `posts`/`likes`/`notifications` may never fire remotely (`useFeedRealtime.ts:17`, `useNotifications.ts:12`, `useMarketRealtime.ts:39–69`). Migration needed.
5. `saved_posts`, sentiment storage, activity feed: don't exist. Search: zero `.ilike(`/`.textSearch(` usage; no FTS/trigram index; username lookups exact-match only.
6. `price_alerts` table tracked but referenced nowhere (future §36 hook).

## 8. Notification System (§35–36)

Insert sources present: client like (`feed.mutations.ts:201–206`), share (service-role), approval outcomes, DB triggers for deposits/order fills/all withdrawal transitions (`create_notification()` primitive). Bell component exists (`components/notifications/Notifications.tsx`, emoji + unread badge + realtime hook) but **is imported nowhere**; Topnav bell is a dead button; `/notifications` page sits outside `(main)` group, unstyled, renders broken field. Unread-state API exists (`POST /api/notifications/read`, no ownership check at route level).
Verdict: **BUILD** center (panel/page), wire bell, fix types + scoping; **PRESERVE** trigger-based inserts.

## 9. UX Feedback Debt (§35)

~49 native `alert()/confirm()/prompt(` call sites across 21 files: feed components (`FeedPostCard.tsx` ×5, `comments.queries.ts`, `follow.mutations.ts`, `feed.mutations.ts`), market (`MarketTradeBar.tsx`, `queries.market.ts` ×6, markets `[symbol]/page.tsx`), auth pages, all admin pages + `useAdminQuery.ts`/`rowActions.tsx`/`EditRowModal.tsx`.
No toast/dialog primitives anywhere; modals hand-rolled per feature. Brief bans shadcn/Radix/MUI → **BUILD** lightweight custom ToastProvider + ConfirmDialog (Tailwind, semantic tokens).

## 10. Intelligence (§34, §37, §15–16)

- Trader discovery: `TopTradersWidget` queries `profiles where monthly_roi > 0 order by monthly_roi, roi_realized_kes limit 5` (`traders.queries.ts:24–30`); same query duplicated inline in leaderboard page. Deterministic base exists → extend for suggestions (exclude followed, activity/recency signals).
- Sentiment: only `SentimentBar.tsx` client-side math (open Long/Short ratio + 7d trade_tags direction). Methodology undocumented, data-access fragile (risk #3). → **BUILD** backend aggregation (RPC/view over trade_tags + positions + engagement), documented + replaceable, consumed by asset page + Home sentiment block.
- Market opportunities: pieces exist (`TopMoversWidget`, discussions counts derivable from trade_tags/posts) → **BUILD** composed opportunities query.
- Trading activity: nothing global; profile-scoped `ActivitiesView` only. Sources: `user_positions` lifecycle + `orders` fills + published analyses (`trade_tags`). Privacy rule (§14): only intentionally-public events; build RPC exposing minimal fields (username/avatar/symbol/action/direction/timestamp).

## 11. §53 Financial Regression Register (do-not-break list)

Auth/proxy guard · Supabase clients (`lib/supabase/*`) · wallet pages + deposit/withdraw flows + approval boundary RPCs · ledger/transactions · orders + conditional-order engine heartbeat (`/api/orders/engine`) · trading config + fee fractions · admin finance/approvals workflows · RLS on all financial tables · existing realtime finance subscriptions · platform settings pipeline. Any Phase touching adjacent code runs this checklist before push.

## 12. Phase Mapping (execution order per brief §52)

| Phase | Scope | Key audit inputs |
|---|---|---|
| B — Structural shell | Sidebar + 3-column layout shell, BottomNav 5-item, drawer mirror, `/feed` route, Home becomes discovery surface skeleton | §1, §2 |
| C — Homepage hierarchy | Composer-first, trader discovery, activity feed (+RPC), opportunities, QuickTrade embed + chart preview, sentiment backend, portfolio-low, Feed transition | §4, §5, §7(3,5), §10 |
| D — Social interaction | FB-style inline comments + replies, expanded post, saved_posts, report wiring, social-table policy snapshot migration | §3, §7(2,5) |
| E — Trading experience | QuickTrade hover/touch chart variants, Spot terminal premium pass | §4, §5 |
| F — Intelligence | Search API + indexes + Topnav wiring, notifications fixes (scoping bug, types, bell, unread), realtime publication migration | §7(1,4,5), §8 |
| G — App feedback | Toast + confirm system; replace ~49 native dialog sites | §9 |
| H — Hardening | Responsive QA 375→1280, empty/error states, a11y, §11 checklist regression run | §11 |

## 13. Decisions Locked

1. Root `proxy.ts` convention retained (restored `3c17dc7`; `app/middleware.ts` deleted — Next build ignores non-root middleware files).
2. No heavy component libraries (brief §35); custom Tailwind primitives only.
3. No fabricated metrics anywhere; every number traceable to a real query (§13/§16/§33).
4. Social-table schema changes ship WITH snapshot migrations documenting current remote shape (closes audit gap §7).
