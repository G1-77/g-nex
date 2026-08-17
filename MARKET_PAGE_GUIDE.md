# GNEX Market Page — Quick Start Guide

## 🚀 Running the Application

### Development Server
```bash
pnpm dev
```

Navigate to: **http://localhost:3000/markets**

---

## 📋 Environment Variables Required

Create `.env.local` with:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: If using custom APIs
NEXT_PUBLIC_COINGECKO_API_KEY=your_api_key (optional for free tier)
```

---

## 🧪 Testing the Market Page

### 1. Stories Carousel
**What to test:**
- [ ] Auto-rotates every 4 seconds
- [ ] Hover pauses rotation (desktop)
- [ ] Tap pauses rotation (mobile)
- [ ] Progress dots show current position
- [ ] Click dot jumps to that asset
- [ ] Clicking card navigates to `/markets/{symbol}`

### 2. Watchlist Toggle
**What to test:**
- [ ] Star icon toggles on/off
- [ ] Requires authentication
- [ ] Changes persist after refresh
- [ ] Filter shows only watched assets
- [ ] Optimistic UI update (no lag)

### 3. Market Prices
**What to test:**
- [ ] Prices display in USD
- [ ] 24h change shows with color (green/red)
- [ ] Auto-refresh every 60 seconds
- [ ] Sparkline shows price trend
- [ ] Loading skeleton appears initially

### 4. Alpha Feed Preview
**What to test:**
- [ ] Shows posts from verified traders
- [ ] Only displays users with ROI >= 15%
- [ ] Shows asset symbols and signal types
- [ ] Engagement metrics (likes, comments) visible
- [ ] Clicking post navigates to trader profile
- [ ] Empty state displays if no posts

### 5. Market Movers
**What to test:**
- [ ] Top 3 gainers display
- [ ] Top 3 losers display
- [ ] Excludes USDT (stablecoin)
- [ ] Shows real CoinGecko prices
- [ ] Auto-refreshes every 60 seconds

### 6. Verified Positioning
**What to test:**
- [ ] Shows traders with open positions
- [ ] Displays Long/Short direction
- [ ] Shows primary asset allocation
- [ ] Allocation bar animates
- [ ] Links to trader profiles
- [ ] Empty state if no positions

### 7. Sentiment Strip
**What to test:**
- [ ] Shows bullish/bearish percentages
- [ ] Color-coded bars (green/red)
- [ ] Updates when prices change

### 8. Mobile Sticky Bar
**What to test (mobile only):**
- [ ] Fixed at bottom of screen
- [ ] Shows current asset context (BTC default)
- [ ] Buy button works
- [ ] Sell button works
- [ ] Deposit button shows alert
- [ ] Doesn't overlap content

### 9. Real-time Updates
**What to test:**
- [ ] Open two browser tabs
- [ ] Create a post in one tab
- [ ] Alpha feed updates in other tab
- [ ] Like a post in one tab
- [ ] Count updates in other tab

---

## 🐛 Troubleshooting

### Prices Not Loading
**Possible causes:**
- CoinGecko API rate limit hit
- Network connection issue
- Missing environment variables

**Check:**
```bash
# Browser console
Check for API errors in Network tab

# Terminal
Check for fetch errors in server logs
```

### Real-time Not Working
**Possible causes:**
- Supabase connection issue
- RLS policies blocking access
- User not authenticated

**Fix:**
```typescript
// Check Supabase connection
console.log(supabase.channel('test').subscribe())
```

### Watchlist Not Persisting
**Possible causes:**
- User not signed in
- RLS policy blocking writes
- Database constraint violation

**Check:**
```sql
-- In Supabase SQL Editor
SELECT * FROM user_watchlists WHERE user_id = 'your_user_id';
```

### TypeScript Errors
**Run type check:**
```bash
npx tsc --noEmit
```

**Common fixes:**
- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `pnpm install`
- Restart dev server

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Market Page                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐     ┌─────────────────┐             │
│  │ CoinGecko API│────▶│ useMarketPrices │             │
│  └──────────────┘     └────────┬────────┘             │
│                                 │                       │
│                                 ▼                       │
│                        ┌────────────────┐              │
│                        │ MarketTicker[] │              │
│                        └────────┬───────┘              │
│                                 │                       │
│         ┌───────────────────────┼───────────────┐     │
│         │                       │               │     │
│         ▼                       ▼               ▼     │
│  ┌─────────────┐      ┌──────────────┐  ┌──────────┐│
│  │  Stories    │      │ Data Grid    │  │Sentiment ││
│  │  Carousel   │      │              │  │  Strip   ││
│  └─────────────┘      └──────────────┘  └──────────┘│
│                                                       │
│  ┌──────────────────────────────────────────────┐   │
│  │            Supabase Real-time                 │   │
│  └────────────────┬─────────────────────────────┘   │
│                   │                                   │
│         ┌─────────┼──────────┐                       │
│         │         │          │                       │
│         ▼         ▼          ▼                       │
│  ┌──────────┐ ┌──────┐ ┌──────────┐                │
│  │  Alpha   │ │Market│ │Verified  │                │
│  │  Feed    │ │Movers│ │Positions │                │
│  └──────────┘ └──────┘ └──────────┘                │
│                                                       │
└───────────────────────────────────────────────────────┘
```

---

## 🔧 Component Architecture

### Page Structure
```
app/(main)/markets/page.tsx
├── MarketSidebar (desktop navigation)
├── Main Canvas
│   ├── StoriesCarousel
│   ├── MarketSentimentStrip
│   ├── MarketDataGrid
│   ├── MarketMovers
│   └── AlphaFeedPreview
└── Right Rail (desktop only)
    ├── VerifiedPositioning
    └── MarketInsightsRail (legacy)
```

### Data Hooks Used
```typescript
const { user } = useAuth()
const { data: watchlistSymbols } = useGetUserWatchlistQuery(user?.id)
const { data: liveTickers } = useMarketPrices(watchlistSymbols)
const toggleWatchlistMutation = useToggleWatchlistMutation()
useMarketRealtime(user?.id) // Real-time subscriptions
```

---

## 📱 Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 768px) {
  - Single column layout
  - Sticky bottom bar visible
  - Sidebar hidden
  - Right rail hidden
}

/* Tablet */
@media (min-width: 768px) and (max-width: 1024px) {
  - Two column layout
  - Sidebar visible
  - Right rail hidden
  - Bottom bar hidden
}

/* Desktop */
@media (min-width: 1024px) {
  - Three column layout
  - All sections visible
  - Bottom bar hidden
}

/* Large Desktop */
@media (min-width: 1280px) {
  - Right rail fully expanded
  - Optimal spacing
}
```

---

## 🎨 Customization Guide

### Change Auto-Rotation Speed
```typescript
// components/market/StoriesCarousel.tsx
const interval = setInterval(() => {
  setStartIndex((prev) => (prev + 1) % (totalCount - 2))
}, 4000) // Change this value (milliseconds)
```

### Change Refresh Intervals
```typescript
// lib/react-query/market/queries.prices.ts
staleTime: 1000 * 30,      // How long data is "fresh"
refetchInterval: 1000 * 60, // How often to auto-refresh
```

### Change ROI Threshold
```typescript
// components/market/AlphaFeedPreview.tsx
.gte('profiles.monthly_roi', 15) // Change minimum ROI %
```

### Change Number of Visible Items
```typescript
// AlphaFeedPreview
limit={5} // Change number of posts shown

// MarketMovers
.slice(0, 3) // Change top N gainers/losers

// VerifiedPositioning
.slice(0, 5) // Change number of traders shown
```

---

## 🚨 Common Errors & Solutions

### "Hydration mismatch"
**Cause:** Server-rendered HTML doesn't match client
**Fix:** Ensure all components use `'use client'` directive

### "Cannot read property 'symbol' of undefined"
**Cause:** Data hasn't loaded yet
**Fix:** Add loading checks:
```typescript
if (!data || data.length === 0) return <LoadingState />
```

### "Rate limit exceeded"
**Cause:** Too many CoinGecko API calls
**Fix:** Increase `refetchInterval` or upgrade API plan

### "RLS policy violation"
**Cause:** User doesn't have permission
**Fix:** Check Supabase RLS policies for the table

---

## 📈 Performance Monitoring

### Key Metrics to Track
- **Time to Interactive (TTI):** <3 seconds
- **First Contentful Paint (FCP):** <1 second
- **Largest Contentful Paint (LCP):** <2.5 seconds
- **API Response Time:** <500ms
- **Real-time Latency:** <1 second

### Tools
```bash
# Lighthouse audit
npm run build
npm run start
# Open Chrome DevTools → Lighthouse

# Bundle analyzer
npm install -D @next/bundle-analyzer
```

---

## 🎯 User Flows

### New User (Not Authenticated)
1. Lands on market page
2. Sees live prices and market data
3. Views alpha feed from verified traders
4. Clicks watchlist star → prompted to sign in
5. Clicks Buy/Sell → prompted to sign in

### Authenticated User
1. Lands on market page
2. Sees personalized watchlist state
3. Toggles watchlist stars (saves to DB)
4. Views alpha feed
5. Clicks Buy → navigates to execution page
6. Receives real-time updates

### Verified Trader
1. Creates post with trade tag
2. Post appears in alpha feed (real-time)
3. Position shows in verified positioning
4. ROI badge displays on profile
5. Followers see their activity

---

## 📝 Next Development Steps

### Immediate Tasks
1. Test on real user accounts
2. Gather user feedback
3. Monitor API rate limits
4. Check real-time subscription stability
5. Performance audit

### Phase 2 Preparation
1. Design execution panel UI
2. Plan order submission flow
3. Design position management
4. Plan notification system
5. Prepare KES deposit flow

---

## 🤝 Contributing

When adding new features:

1. **Follow existing patterns:**
   - Use `'use client'` for interactive components
   - Create query hooks in `lib/react-query/`
   - Keep types in `lib/supabase/types.ts`

2. **Maintain type safety:**
   - No `any` types
   - Proper TypeScript interfaces
   - Runtime validation where needed

3. **Performance first:**
   - Lazy load heavy components
   - Use React Query caching
   - Optimize images

4. **Test thoroughly:**
   - Manual testing on mobile
   - Check loading states
   - Verify error handling

---

**Questions?** Check `PHASE_1_COMPLETE.md` for full implementation details.