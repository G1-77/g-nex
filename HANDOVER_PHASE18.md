# HANDOVER — Phase 18: GNEX Home Experience (Homepage Refactor)

> Written 2026-08-24 at end of session. For the next agent picking up the homepage work.
> Source brief for this phase: `UI/UI prompt 2.odt` (converted text was at
> `/tmp/opencode/ui-prompt/UI prompt 2.txt` — may be gone after reboot; re-convert with
> `libreoffice --headless --convert-to txt` if needed).
> Commit shipped so far: `73a8ac2` "Phase 18: GNEX Home Experience…" on `origin/main`.

---

## 1. Where the refactor stands

The Home page (`app/(main)/page.tsx`) has been fully rebuilt to the mobile-first,
trading-first IA from the brief:

```
TickerStrip
├─ Search row (mobile only, sm:hidden — Topnav already shows search sm+)
├─ 1. HomeWalletSnapshot      (KES total, ≈USD, growth, Add Funds)
├─ 2. TopTradersToFollow      (useTopTraders(10), follow/unfollow live)
├─ 3. PromotionCarousel       (admin-managed, /api/promotions)
├─ 4. QuickActionCards        (Deposit + Favourite Asset w/ sparkline rotation)
├─ 5. HomeMarketSnapshot      (All/Crypto/Gold/Watchlist tabs, USD+KES rows)
├─ 6. DiscoverTransition      ("Continue to Discover" → /feed)
└─ aside (desktop): TopTradersWidget · TopMoversWidget · MarketsWatchWidget · TopStories
```

Shell renamed Feed→Discover in `Bottomnav.tsx`, `Topnav.tsx`, `lib/navigation.ts`
(href stays `/feed`). `/prediction` exists as an honest placeholder page.

Asset universe expanded with DOGE/TRUMP/USDC/ACE across the whole central
architecture: `lib/supabase/types.ts` (ASSET_SYMBOLS), `lib/constants/market-assets.ts`,
`lib/market/execution.ts` (SYMBOL_COINGECKO_ID + TRADABLE_SYMBOLS),
`lib/market/binance-realtime.ts` + `lib/market/ohlc.ts` (WS pairs dogeusdt/trumpusdt/aceusdt;
USDC intentionally REST-baseline like USDT — usdcusdt is a different instrument),
`lib/market/wallet-utils.ts` colors, `public/icons/{doge,trump,usdc,ace}.svg`,
admin settings validator/chips (`lib/admin/settings.ts`, `app/api/admin/settings/route.ts`,
`app/admin/system/settings/page.tsx`).

**Database is LIVE**: migration `20260824120000_home_experience_promotions_assets.sql`
was pushed successfully (promotions table RLS-on/service-role-only, assets seed,
user_holdings CHECK widened, Prediction seed campaign). The push also applied the two
previously-pending Phase 17 migrations.

## 2. What is verified

| Check | Result |
|---|---|
| `tsc --noEmit` | ✅ clean project-wide |
| ESLint on all touched paths | ✅ 0 errors / 0 warnings |
| Migration deploy | ✅ applied to remote DB |
| `next build` | ⚠️ **UNCONFIRMED** — see §4 |
| Browser smoke test of new Home | ❌ not done |

## 3. Key design decisions (do not undo casually)

- **No fabricated data anywhere.** Wallet numbers come only from `usePortfolioSummary`;
  trader rail from `useTopTraders`; prices from the shared `useMarketPrices` cache.
- **Follower counts are never shown** on the trader rail — no `followers_count` column
  exists in any migration; ROI ("30D performance") is the emphasis instead.
- **Promotions eligibility is server-side** (enabled + start_at/end_at window) in
  `GET /api/promotions`. The client never decides visibility. Carousel failure renders
  nothing — it must never block wallet/markets/social content.
- **promotions table is service-role-only** (RLS on, zero policies by design). Admin CRUD
  goes through `/api/admin/promotions` with `content.manage` permission + audit logging.
  Ordering uses a single mechanism: `display_order` (lower first).
- **Carousel index handling uses derived clamps** (`safeIndex = min(index, count-1)`),
  NOT state-reset effects — the codebase's react-hooks rules forbid setState-in-effect
  and we fixed two violations this way. Keep that pattern.
- **Market snapshot excludes USDT/USDC stablecoins** from All/Crypto tabs (stablecoins
  aren't market-movement rows); Gold tab filters `symbol === 'XAU'`.
- **Favourite asset card falls back to BTC** when watchlist is empty (supported universe
  asset, clearly labeled "Star assets to feature here").
- **`home.queries.ts` left untouched** even though its consumers were deleted — its hooks
  (useSentimentOverview, useMarketOpportunities, etc.) are now dead code and are the top
  candidate for removal in a cleanup pass IF grep confirms nothing else imports them.
- Old Phase 17 RPCs (`get_market_opportunities`, `get_sentiment_overview`,
  `get_market_activity`) still exist in the DB — harmless, but tied to the dead file above.

## 4. IMMEDIATE next steps (in order)

1. **Confirm the production build passes.**
   ```bash
   cd "/home/ghost/The Hub Project/g-nex"
   NODE_OPTIONS="--max-old-space-size=3072" NEXT_TELEMETRY_DISABLED=1 \
     node node_modules/next/dist/bin/next build
   ```
   Context: two attempts were OOM-killed (host had <2GB free while desktop apps ran);
   a final attempt was still compiling when this session ended. If it fails with real
   errors, fix them; if OOM again, close memory-heavy apps or build with `--max-old-space-size=2048`.
   A passing build should be recorded in MILESTONES.md Phase 18 Verification, flipping
   status 🟡 → ✅.

2. **Smoke-test the Home route in a browser** (`npm run dev`, open `/`):
   - signed out: sign-in wallet card, traders rail without follow buttons state errors
   - signed in: wallet KES value, follow toggle works and survives refetch
     (validates the `followerKeys.all` invalidation fix)
   - promotion carousel shows Prediction seed card; CTA lands on `/prediction`
     (destination_type=product, product_id='prediction' → `/prediction`)
   - market snapshot tabs filter correctly; KES line hidden if FX rate hasn't loaded
   - favourite card: empty watchlist → BTC fallback copy; star something in /markets → rotates
   - mobile viewport (<640px): search row visible once (Topnav hides its own below sm)

3. **Verify promotions APIs against the live DB**:
   - `curl http://localhost:3000/api/promotions` → seed campaign JSON (window is open-ended)
   - admin page `/admin/community/promotions` needs a super_admin or `content.manage`
     holder: create/edit/toggle/delete one throwaway campaign and confirm audit entries.

4. **Cleanup pass (optional but recommended)**: delete `lib/react-query/home.queries.ts`
   if truly orphaned (grep imports first); consider dropping the Phase 17 opportunity/
   sentiment RPCs in a later migration once confirmed unused.

5. **Designer polish backlog** (not blockers): the four new SVG icons are functional
   placeholders; promotion image_url/icon_url support exists but no storage upload UI —
   admins paste URLs (Supabase Storage public URLs or /public paths).

## 5. Environment gotchas (this machine)

- **`npx`/`node` on PATH are broken snap wrappers** (`snap-confine capability` error).
  Use `/snap/node/current/bin/node` directly, e.g.
  `/snap/node/current/bin/node node_modules/typescript/bin/tsc --noEmit`.
- **supabase CLI** binary lives at `~/.supabase/bin/supabase` (not in node_modules despite
  the package.json devDep). DB password is `SUPABASE_DB_PASSWORD` in `.env`:
  `set -a && . ./.env && set +a && ~/.supabase/bin/supabase db push --password "$SUPABASE_DB_PASSWORD" --yes`
- **Builds need ~3GB heap cap** and a quiet machine; run backgrounded with output to a log
  and poll — foreground runs hit the shell timeout first.
- Two explore subagents failed early this session with provider network errors; direct
  tooling worked fine throughout.

## 6. File map (Phase 18)

Created:
- `components/home/HomeWalletSnapshot.tsx`, `QuickActionCards.tsx`,
  `HomeMarketSnapshot.tsx`, `DiscoverTransition.tsx`, `PromotionCarousel.tsx`,
  `TopTradersToFollow.tsx`
- `app/(main)/prediction/page.tsx`
- `app/api/promotions/route.ts`, `app/api/admin/promotions/route.ts`
- `lib/react-query/promotions.queries.ts` (query + PRODUCT_ROUTES registry + watchlist views helper)
- `app/admin/community/promotions/page.tsx`
- `supabase/migrations/20260824120000_home_experience_promotions_assets.sql` (deployed)

Modified:
- `app/(main)/page.tsx` (full rebuild), `components/layout/{Topnav,Bottomnav}.tsx`,
  `lib/navigation.ts`, `components/admin/status.tsx` (nav entry),
  `components/providers` untouched — permissions via existing `useAuth()`
- Asset files listed in §1; follow fix in
  `lib/react-query/queries/followers.queries.ts` (+`useFollowingIdsQuery`) and
  `lib/react-query/mutations/follow.mutations.ts` (+`followerKeys.all` invalidation)

Deleted:
- `components/home/{HomeComposer,TradingActivityFeed,MarketOpportunities,
  SentimentOverview,PortfolioAccessCard,FeedTransition,TraderDiscoverySection}.tsx`

## 7. What was deliberately NOT done (scope boundaries)

- No changes to Wallet, Markets, Trade, Feed pages, trading engine, ledger, auth.
- Desktop aside widgets untouched (still the Phase 16 set).
- No realtime subscription for promotions (polling-free single fetch per mount; content
  freshness comes from React Query staleTime — acceptable for marketing content).
- Quick Trade inline panel slot from Phase 16 brief was dropped in this redesign per
  UI prompt 2's IA (no placeholder kept) — flag to product if they expected it.
