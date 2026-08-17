# GNEX Market Page — Deployment Checklist

## ✅ Pre-Deployment Verification

### Code Quality
- [x] TypeScript errors resolved (0 errors)
- [x] ESLint warnings reviewed
- [ ] Code reviewed by team member
- [x] No console.log statements in production code
- [x] No commented-out code blocks
- [x] All TODOs addressed or documented

### Type Safety
- [x] 0% `any` usage maintained
- [x] All components properly typed
- [x] Props interfaces exported
- [x] Database types up-to-date

### Performance
- [ ] Lighthouse score >90
- [ ] Bundle size analyzed
- [ ] Images optimized
- [ ] Lazy loading implemented where needed
- [x] React Query caching configured
- [x] API rate limits respected

### Security
- [x] Environment variables configured
- [x] API keys not exposed in client code
- [x] Supabase RLS policies active
- [x] User input sanitized
- [ ] CSP headers configured
- [ ] CORS policies reviewed

### Data & APIs
- [x] Supabase connection tested
- [x] CoinGecko API integration working
- [ ] Gold API source verified
- [x] Real-time subscriptions tested
- [ ] Database indexes optimized
- [ ] API error handling implemented

### Mobile Experience
- [ ] Tested on iOS Safari
- [ ] Tested on Android Chrome
- [ ] Touch events working
- [ ] Bottom bar doesn't overlap content
- [ ] Horizontal scrolling prevented
- [ ] Font sizes readable

### Cross-Browser
- [ ] Chrome tested
- [ ] Firefox tested
- [ ] Safari tested
- [ ] Edge tested

### Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader tested
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators visible
- [ ] Alt text on images

---

## 🗄️ Database Readiness

### Tables Required
- [x] `profiles` (user data)
- [x] `posts` (alpha feed content)
- [x] `trade_tags` (signal types)
- [x] `user_positions` (trader allocations)
- [x] `user_watchlists` (asset tracking)
- [x] `likes` (engagement)
- [x] `comments` (engagement)
- [x] `user_wallets` (KES balances)

### Indexes Needed
```sql
-- Add these if not present
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_profiles_monthly_roi ON profiles(monthly_roi DESC);
CREATE INDEX idx_user_positions_status ON user_positions(status);
CREATE INDEX idx_user_watchlists_user_asset ON user_watchlists(user_id, asset_symbol);
```

### RLS Policies Verified
- [x] Public read on posts
- [x] Authenticated write on posts
- [x] User-scoped watchlists
- [x] User-scoped wallets
- [x] User-scoped positions

### Data Seeding
- [ ] Create test verified traders
- [ ] Create sample posts with trade tags
- [ ] Create sample positions
- [ ] Test with empty states

---

## 🔧 Environment Configuration

### Required Variables
```bash
# Production .env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=https://gnex.com

# Optional
NEXT_PUBLIC_COINGECKO_API_KEY=
ANALYTICS_ID=
SENTRY_DSN=
```

### Vercel Configuration
```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key"
  }
}
```

---

## 🧪 Testing Checklist

### Functional Tests
- [ ] User can view market page without auth
- [ ] Watchlist requires authentication
- [ ] Prices update automatically
- [ ] Real-time updates work
- [ ] Navigation works correctly
- [ ] Error states display properly
- [ ] Loading states display properly
- [ ] Empty states display properly

### Edge Cases
- [ ] API rate limit handling
- [ ] Network offline behavior
- [ ] Supabase disconnection
- [ ] Invalid user session
- [ ] No verified traders in DB
- [ ] No posts in DB
- [ ] Very long usernames
- [ ] Very long post content

### Performance Tests
- [ ] Page load <3 seconds
- [ ] API response <500ms
- [ ] No memory leaks
- [ ] Scroll performance smooth
- [ ] Real-time latency <1 second

---

## 📊 Monitoring Setup

### Error Tracking
```typescript
// Install Sentry (optional)
npm install @sentry/nextjs

// Configure in next.config.ts
import { withSentryConfig } from '@sentry/nextjs'
```

### Analytics
```typescript
// Install PostHog or similar
npm install posthog-js

// Track key events:
// - Market page view
// - Watchlist toggle
// - Buy/Sell click
// - Alpha feed engagement
```

### Uptime Monitoring
- [ ] Set up status page
- [ ] Configure alerts for API failures
- [ ] Monitor Supabase connection
- [ ] Track CoinGecko API status

---

## 🚀 Deployment Steps

### 1. Pre-Deploy
```bash
# Clean build
rm -rf .next
pnpm install

# Type check
npx tsc --noEmit

# Lint
pnpm lint

# Build
pnpm build

# Test build locally
pnpm start
```

### 2. Deploy to Staging
```bash
# Push to staging branch
git checkout staging
git merge main
git push origin staging

# Vercel auto-deploys
# Or manually: vercel --prod
```

### 3. Staging Tests
- [ ] Smoke test all features
- [ ] Check real-time updates
- [ ] Verify API connections
- [ ] Test authentication flow
- [ ] Check mobile responsiveness

### 4. Deploy to Production
```bash
# Tag release
git tag -a v1.0.0-market-phase1 -m "Market page Phase 1 complete"
git push origin v1.0.0-market-phase1

# Deploy to production
git checkout main
git merge staging
git push origin main
```

### 5. Post-Deploy Verification
- [ ] Visit production URL
- [ ] Check all features working
- [ ] Monitor error tracking
- [ ] Check analytics events
- [ ] Verify database connections
- [ ] Test real-time subscriptions

---

## 🔄 Rollback Plan

### If Issues Arise

1. **Minor Issues (UI bugs)**
   - Hot-fix in new branch
   - Deploy patch immediately
   - Monitor metrics

2. **Major Issues (API failures)**
   ```bash
   # Revert to previous deployment
   git revert HEAD
   git push origin main
   ```

3. **Critical Issues (data corruption)**
   - Revert deployment immediately
   - Restore database from backup
   - Investigate root cause
   - Fix and re-deploy

---

## 📈 Success Metrics

### Day 1 Targets
- [ ] >100 page views
- [ ] <5% error rate
- [ ] <3s average load time
- [ ] >80% mobile traffic
- [ ] 0 critical bugs

### Week 1 Targets
- [ ] >1000 page views
- [ ] >50 watchlist additions
- [ ] >20 alpha feed engagements
- [ ] <2% error rate
- [ ] Positive user feedback

### Monitor These
- Page load time
- API response time
- Error rate
- User engagement
- Bounce rate
- Mobile vs desktop traffic
- Browser distribution
- Real-time connection stability

---

## 🐛 Known Issues & Workarounds

### CoinGecko Rate Limits
**Issue:** Free tier limited to 10-30 calls/minute
**Workaround:** 60-second refresh interval
**Future Fix:** Upgrade to Pro or switch to Binance API

### Sentiment Calculation
**Issue:** Simplified algorithm, not true community sentiment
**Workaround:** Based on price momentum
**Future Fix:** Aggregate from trade_tags and positions

### Watcher Count
**Issue:** Mock data, not real tracking
**Workaround:** Random numbers for now
**Future Fix:** Create asset_watchers table

---

## 📞 Support & Escalation

### If Things Go Wrong

1. **Check Status**
   - Supabase status page
   - CoinGecko status page
   - Vercel status page

2. **Review Logs**
   - Vercel function logs
   - Supabase real-time logs
   - Browser console errors

3. **Contact**
   - Supabase support (if DB issues)
   - Vercel support (if deployment issues)
   - Team lead (if critical bug)

---

## 🎉 Go/No-Go Decision

### ✅ Ready to Deploy If:
- All critical tests passing
- No TypeScript errors
- APIs responding correctly
- Real-time subscriptions working
- Mobile experience tested
- Rollback plan in place
- Team available for monitoring

### ❌ Hold Deployment If:
- TypeScript errors present
- Critical features broken
- APIs unreliable
- Performance issues
- Security concerns
- Missing environment variables

---

## 📋 Post-Launch Tasks

### Immediate (Day 1)
- [ ] Monitor error rates
- [ ] Watch real-time connections
- [ ] Check API rate limits
- [ ] Gather user feedback
- [ ] Document any issues

### Short-term (Week 1)
- [ ] Analyze user behavior
- [ ] Identify pain points
- [ ] Plan improvements
- [ ] Address bug reports
- [ ] Optimize performance

### Medium-term (Month 1)
- [ ] A/B test variations
- [ ] Implement user suggestions
- [ ] Prepare Phase 2 features
- [ ] Scale infrastructure if needed
- [ ] Review analytics data

---

**Deployment Date:** _________________

**Deployed By:** _________________

**Sign-off:** _________________

---

**Status:** 🟡 READY FOR FINAL REVIEW

**Blocking Issues:** None

**Next Action:** Complete remaining manual tests, then deploy to staging.