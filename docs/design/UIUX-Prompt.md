# GNEX Structural Shift UI/UX Prompt — Mobile-First Social Trading Platform

> Source: `UI/UIUX Prompt.odt` (verbatim text extraction).
> This document is the authoritative design brief for the GNEX 2.0 refactor.
> Companion analysis: `gnex2-audit.md`.

---

GNEX Structural Shift UI/UX Prompt: Mobile-First Social Trading Platform
You are redesigning the existing GNEX application.
This is not a greenfield rebuild. GNEX already has a good technical foundation, an established visual identity, working financial functionality, navigation patterns, trading infrastructure, wallet functionality, and social components.
The objective is to make a structural shift in the product experience, not to throw away the existing application.
The new direction is:
GNEX = a professional trading platform where market discovery, trader discovery, social discussion, analysis, and execution exist in one coherent ecosystem.
Preserve what is already strong.
Refactor what is structurally weak.
Add missing functionality where the product genuinely requires it.
Do not redesign components merely for visual novelty.
1. PRODUCT PHILOSOPHY
GNEX should not feel like:
an exchange with a social feed attached.
It should also not feel like:
a social network with trading functionality attached.
The intended experience is:
a social trading platform with a serious financial execution environment underneath it.
The user journey should naturally become:
Discover markets
↓
Discover traders
↓
See what traders are saying
↓
Create / consume market discussion
↓
Observe trading activity
↓
Evaluate sentiment
↓
Execute a trade
↓
Track results
↓
Participate again
This loop should influence the entire information architecture.
2. IMPORTANT PRODUCT DECISION
Do not make Portfolio the first thing users see.
The primary homepage is not a portfolio dashboard.
The user should first encounter:
Social participation
Market discussion
Trader discovery
Market context
Trading opportunities
Portfolio remains important, but it is supporting information on Home and a primary destination through the Portfolio/Wallet experience.
This distinction is intentional.
3. PRESERVE THE GNEX VISUAL IDENTITY
The existing GNEX visual identity should remain.
Preserve:
Dark/slate dominant theme
GNEX branding
Existing typography
Amber/gold treatment for gold assets
Cyan/emerald treatment for crypto and positive market movement
Existing top navigation
Existing semantic color system
Existing visual language wherever it is already successful
The redesign should feel like:
GNEX 2.0
not:
a completely different application wearing the GNEX name.
Do not introduce a generic SaaS dashboard aesthetic.
Avoid excessive:
Gradients
Glassmorphism
Huge cards
Decorative animation
Bright white surfaces
Heavy outlines
Unnecessary rounded containers
The product should feel financially serious.
4. VISUAL SEPARATION: MOVE AWAY FROM SOLID BORDERS
One of the major visual problems to correct is the current reliance on solid border lines to separate sections.
Do not use:
──────────────
solid border
──────────────
as the primary method of defining every component.
Instead use:
Subtle elevation
Soft shadows
Surface contrast
Background tone differences
Spacing
Grouping
Controlled radius
The visual language should suggest that components occupy different surfaces without drawing a hard line around everything.
Think:
surface → elevation → spacing → hierarchy
rather than:
box → border → box → border
This is especially important for:
Feed posts
Comments
Homepage sections
Market cards
Trader cards
However, this does not mean removing every border.
Borders remain appropriate for:
Input fields
Form controls
Trading controls
Focus states
Tables
Important separators where usability requires them
Use borders functionally, not decoratively.
5. DESKTOP INFORMATION ARCHITECTURE
Desktop should maintain a strong three-column structure.
┌───────────────────────────────────────────────────────────────────────────┐
│ GNEX TOP NAVIGATION │
├─────────────────┬───────────────────────────────────┬─────────────────────┤
│ LEFT SIDEBAR │ PRIMARY HOME CONTENT │ RIGHT SIDEBAR │
│ │ │ │
│ Home │ Create Post │ Market Pulse │
│ Markets │ Discover Traders │ Trending Assets │
│ Trade │ Trading Activity │ Sentiment │
│ Wallet │ Market Opportunities │ Top Traders │
│ │ Quick Trade / FTT │ Activity │
│ Feed │ Portfolio access │ │
│ Traders │ │ │
│ Leaderboard │ │ │
│ Watchlist │ │ │
│ Saved │ │ │
└─────────────────┴───────────────────────────────────┴─────────────────────┘
The center column is the user's primary workspace.
The left sidebar is navigation.
The right sidebar provides contextual intelligence.
Do not make the three columns visually equal.
The center should have the strongest hierarchy.
6. TOP NAVIGATION
Preserve the existing GNEX top navigation.
Add or refine the global search experience where appropriate.
Search should not be hidden inside a secondary page.
The user should be able to search from the top navigation for relevant GNEX entities such as:
Users
Traders
Assets
Markets
Posts
Potentially hashtags/topics if already supported
The search interface should be contextual rather than becoming a massive full-page search system.
Use autocomplete where appropriate.
Examples:
Search GNEX

BTC
Bitcoin discussions
@tradername
Gold
Trading opportunities
Search becomes especially important because the platform is moving toward stronger trader and content discovery.
7. LEFT SIDEBAR
The left sidebar should remain a permanent desktop navigation system.
Structure it around the actual product:Core
Home
Markets
Trade
WalletCommunity
Feed
Traders
LeaderboardPersonal
Watchlist
Saved
Price Alerts
ProfileUtility
Settings
Help
Do not call the section "Social".
Use:
Feed
This is clearer and aligns with the product's actual content destination.
8. MOBILE LEFT SIDEBAR
Preserve the current mobile navigation pattern.
The mobile application already uses the hamburger menu with three horizontal lines to access the left sidebar.
Keep it.
Do not replace it with a radically different drawer concept.
On mobile:
Hamburger opens the sidebar
Sidebar overlays the current page
Sidebar contains secondary destinations
User can close it without losing their context
It should not permanently consume horizontal screen space
The bottom navigation should be reserved for the five most important destinations.
9. MOBILE BOTTOM NAVIGATION
Use:
Home | Markets | Trade | Feed | Wallet
Use Feed, not Social.
The bottom navigation should represent the core application loop.
Trade can receive slightly stronger visual emphasis because execution is the primary financial action.
Do not add Portfolio as a sixth bottom-navigation item.
Do not overcrowd the mobile navigation.
Portfolio remains accessible through Wallet and its existing dedicated route/workflow.
10. PRIMARY HOMEPAGE OBJECTIVE
The homepage should be a market and social discovery surface.
The user should not initially feel like they opened an accounting dashboard.
The primary questions the homepage should answer are:
What are people talking about?
Who should I follow?
What is happening in the market?
What assets deserve attention?
What are traders doing?
What could I trade right now?
That is the homepage's purpose.
11. HOMEPAGE CONTENT HIERARCHY
Recommended primary hierarchy:
GNEX HEADER / SEARCH

CREATE POST

TRADER DISCOVERY

TRADING ACTIVITY

MARKET / ASSET OPPORTUNITIES

QUICK TRADE / FTT

MARKET SENTIMENT

ADDITIONAL DISCOVERY

LOW-PRIORITY PORTFOLIO ACCESS

FEED TRANSITION
This is an intentional departure from a traditional exchange dashboard.
Create Post comes first.
Trading Activity comes after Create Post.
Portfolio is deliberately low in the hierarchy.
The full Feed is a dedicated destination rather than the entire homepage.
12. CREATE POST
Create Post should be one of the first elements users encounter on Home.
Use the existing Create Post modal where possible.
The homepage composer should communicate:
What's happening in the market?
or similar market-specific language.
Possible structure:
What's happening in the market?

[ Create a Post ]
The user should be able to quickly publish:
Market analysis
Trade ideas
Asset commentary
Questions
Observations
Educational content
The composer should feel like a natural part of GNEX rather than a generic social-media imitation.
13. TRADER DISCOVERY SHOULD APPEAR EARLY
The homepage should help the user answer:
Who should I follow?
This is a crucial part of the new GNEX direction.
Create a compact trader-discovery section after Create Post.
Possible categories:
Suggested Traders
Rising Traders
Popular Analysts
Most Followed
Active Traders
Trader cards should display, where data is available:
Avatar
Username
Short bio
Trading style
Follower count
Performance metrics
Follow button
Do not fabricate financial performance.
Only display performance statistics backed by real GNEX data.
Where the backend does not yet calculate a metric, either implement the necessary logic or omit the metric.
14. TRADING ACTIVITY
Trading Activity should appear after Create Post and trader discovery.
This is not the same thing as the full Feed.
It is a compact real-time market activity layer.
Examples:
Alex opened a BTC position

Jane bought Gold

Mike closed an ETH position

Sarah published a BTC analysis
Activity should provide context without overwhelming the homepage.
Where privacy and system rules allow, activity can show:
Asset
Action
Timestamp
User
Direction
Relevant market context
Do not reveal information that the platform does not intentionally expose.
Do not expose private order details.
15. MARKET OPPORTUNITIES
Introduce an area for identifying assets worth investigating.
Possible signals:
Biggest movers
High volume
Trending
Most discussed
High sentiment imbalance
Unusual activity
Rapid price movement
This section should connect market data with social activity.
For example:
BTC

$104,250
+2.18%

1.8K discussions

Bullish
68%
The purpose is not to issue financial advice.
The purpose is to give the trader concise decision-support information.
16. MARKET SENTIMENT
Market sentiment should become a first-class piece of the GNEX experience.
For relevant assets, display an understandable sentiment indicator.
Example:
BTC Sentiment

Bullish 68%
Neutral 18%
Bearish 14%
or where a binary visual is more suitable:
BTC

Bullish
68%

Bearish
32%
The system must make it clear what the percentage represents.
Do not label a metric "68% bullish" unless GNEX actually has a defined methodology for calculating that result.
If the platform currently lacks sentiment infrastructure, implement a backend sentiment aggregation model based on real platform data.
Possible inputs:
Post sentiment
Likes
Comments
Trader activity
Buy/Sell activity where legitimately available
Asset mentions
Engagement
Market movement
The methodology must be deterministic, documented in code, and designed so that it can be improved later.
Do not manufacture sentiment numbers for visual effect.
This signal should be treated as decision-support, not a promise of future price movement.
17. QUICK TRADE / FTT
Quick Trade / FTT should remain a highly visible execution entry point, but it should not dominate the homepage above social discovery.
Its purpose is:
see → decide → execute quickly
The component should support:
Asset selector
Buy
Sell
Market order
Amount
Estimated quantity
Available balance
Trading fee
Estimated total
Confirmation
Execution feedback
Example:
Quick Trade

BTC / USDT

$104,250
+2.18%

[ Mini Chart ]

BUY SELL

Amount
[____________]

Estimated Quantity
0.023 BTC

Fee
$4.52

[ Buy BTC ]
18. QUICK TRADE CHART PREVIEW
This is a required feature.
The Quick Trade / FTT component must include a chart preview on:
desktop and mobile.
On desktop, hovering over the asset/trading area should reveal or emphasize a compact chart preview.
The preview may show:
Price movement
Small time range
Current price
24h change
It should be lightweight and visually subordinate to the primary trading interaction.
Do not turn it into the full TradingView chart.
19. MOBILE QUICK TRADE CHART
Mobile does not have hover.
Therefore use a touch equivalent.
Recommended options:
Always-visible compact mini chart
Tap-to-expand chart
Tap asset row to reveal chart
Do not remove the chart on mobile.
The user should receive the same decision-support concept through touch interaction.
20. QUICK TRADE SHOULD NOT BECOME A FULL TRADING TERMINAL
The homepage trading component must stay compact.
Do not place:
Full order book
Multiple advanced indicators
Large depth charts
Multiple order-type panels
Full trade history
inside the homepage Quick Trade component.
Those belong on the Trading page.
The distinction must remain clear:
Home = fast execution
Trade = professional analysis and execution
21. FULL TRADING PAGE
The dedicated Trading page should feel like a premium professional trading terminal.
This is one area where the visual language should intentionally become denser and more technical.
The trading interface should communicate:
Precision
Speed
Professionalism
Confidence
Financial seriousness
Do not make the Trading page resemble the social feed.
It should feel like a high-end trading environment.
22. PROFESSIONAL TRADING TERMINAL STRUCTURE
Desktop should prioritize:
Market Header

Chart Order Entry

BUY / SELL
Market / Limit /
Stop-Limit
Price
Amount
Fee
Total

Order Book Recent Trades

Open Orders Order History
The chart should dominate the main workspace.
The order-entry panel should have exceptional hierarchy because it is where a financial action occurs.
Financial numbers should align properly.
Controls should be compact.
Spacing should be deliberate.
Avoid excessive decorative surfaces.
23. TRADING TERMINAL VISUAL LANGUAGE
The trading terminal should not simply be a larger collection of rounded cards.
Use structured panels.
Use subtle elevation and surface differentiation.
Use clear typography.
Use precise numerical alignment.
Separate Buy and Sell clearly.
Show available balance prominently.
Show fees before execution.
Show estimated total before confirmation.
Trading should feel intentional.
24. FULL FEED MUST BE A DEDICATED PAGE
This is an important structural distinction.
The homepage should show social discovery and selected content previews, but the full Feed should live on its own dedicated route.
Example:
Home
Markets
Trade
Feed
Wallet
The Feed page should be the deeper social environment.
It can contain:
Full chronological feed
Recommended posts
Following feed
Market discussions
Comments
Reactions
Shared content
Asset-tagged discussions
Do not simply make Home equal to Feed.
Home is a discovery/decision surface.
Feed is the dedicated social environment.
25. HOME FEED PREVIEW
Home can show selected posts or a limited social preview.
The purpose is to:
Show the platform is active
Help users discover people
Surface market discussions
Encourage exploration
But the homepage should stop short of becoming an endless full feed.
This distinction is important.
Otherwise Home and Feed become redundant.
26. BOTTOM-OF-HOMEPAGE FEED TRANSITION
At the bottom of the primary homepage, after the user has reached the end of the homepage content, provide a clear transition:
You've reached the end of Home.

Want to see more market conversations?

[ Explore Feed ]
On mobile:
The interaction should be designed so that continuing upward/swiping naturally leads into the Feed experience.
Conceptually:
HOME
↓
End of homepage
↓
"See more in Feed"
↓
Swipe upward
↓
FEED
The transition should feel like a deliberate continuation rather than a random redirect.
Do not make the user repeatedly tap through unnecessary screens.
On desktop:
Present a clear choice.
For example:
You've reached the end of Home.

[ Open Feed ]
The user chooses whether to continue.
Do not automatically redirect desktop users without an intentional interaction.
27. POST CARD DESIGN
Post cards should use the new subtle elevation language.
Do not rely on hard borders.
A post should feel like a surface floating slightly above the page.
Use:
Soft shadow
Surface contrast
Spacing
Subtle radius
Posts should contain:
Avatar
Username
Timestamp
Follow state
Content
Asset context
Market information where applicable
Interaction controls
The design should be familiar enough that users immediately know how to interact with it.
28. FACEBOOK-STYLE COMMENT PRESENTATION
The comment interaction should directly emulate familiar Facebook-style hierarchy.
Example:
Avatar John Mwangi
BTC may be entering a breakout.

Like Reply 15m


Avatar Jane
I agree, especially above resistance.

Like Reply 9m
Comments should use:
Compact avatars
Strong username hierarchy
Conversational spacing
Clear replies
Like/unlike states
Reply controls
Timestamps
Comment counts
Avoid making comments look like independent dashboard cards.
They should feel like conversations attached to the post.
29. POST EXPANSION
When a user selects a post, open an expanded post experience.
The interaction should be familiar to users of mainstream social platforms.
The expanded view should reveal:
Full post
Full media
Asset information
Market context
Author profile
Reactions
Comments
Replies
Timestamp
Related trading information where applicable
Possible implementation:
Desktop:
Modal, drawer, or dedicated route depending on existing architecture.
Mobile:
Full-screen or near-full-screen post view.
The user should retain context and be able to return cleanly to the feed/home position.
30. POST INTERACTIONS
Every supported post should provide:
Like
Unlike
Comment
Share
Save
Report
Use optimistic interaction where appropriate.
Do not reload the entire feed for a simple like.
The user should immediately see:
Like state
Save state
Comment count
Share confirmation
Report confirmation
All states must synchronize with the backend.
31. BACKEND LOGIC
Where required functionality is not currently implemented, do not stop at UI mockups.
Add the necessary backend logic where it is reasonable and consistent with the existing architecture.
Potential backend work includes:
Persistent likes
Unlike functionality
Saved posts
Report workflow
Comment interactions
Follow/unfollow
Trader discovery queries
Market sentiment aggregation
Trading activity feeds
Search
Realtime activity
Notification records
Unread notification state
Use the existing Supabase architecture.
Do not create disconnected mock data if the real system can support the feature.
32. SOCIAL DATA MODEL
Where missing, introduce the required database logic for the social experience.
Potential entities include:
Post
Post like
Post save
Comment
Comment like
Follow
Report
Activity
Notification
Sentiment record or calculated sentiment view
Respect existing GNEX schema and naming conventions.
Do not duplicate tables if equivalent functionality already exists.
33. MARKET SENTIMENT BACKEND
If sentiment does not currently exist, design it as a real backend-derived feature.
For each supported asset, calculate a sentiment distribution.
Example:
Asset: BTC

Bullish: 68
Neutral: 18
Bearish: 14
The calculation should use a transparent methodology.
Do not simply generate random percentages.
Possible architecture:
Posts
Comments
Market activity
Trading activity
Asset mentions
↓
Sentiment classification
↓
Aggregation
↓
Asset sentiment score
↓
UI
The classification system can initially be rule-based or model-assisted depending on the existing architecture.
The implementation should be replaceable later without redesigning the frontend.
34. SEARCH
Search should become a global discovery tool.
The top navigation should provide a search field/icon.
Search should be capable of finding relevant GNEX entities:
Search

Bitcoin
BTC
Gold
@TraderName
Posts about ETH
Popular traders
Use debounced querying.
Avoid excessive backend requests.
Use appropriate database indexes.
Search should work on mobile as well as desktop.
35. NOTIFICATIONS AND WARNINGS
Do not use browser-native:
alert()
confirm()
prompt()
for normal GNEX workflows.
Replace them with proper in-app interaction components.
Use:Toast notifications
For:
Successful like
Post saved
Order submitted
Profile updated
Wallet action completedConfirmation dialogs
For:
Withdrawal confirmation
Order cancellation
Report submission
Potentially irreversible actionsInline validation
For:
Insufficient balance
Invalid amount
Invalid market
Missing fieldsBanners
For:
Maintenance
Market interruptions
Connection problems
Important platform notices
The implementation should use freely available/open-source approaches or lightweight custom Tailwind components.
Do not introduce shadcn/ui, Radix, MUI, or another heavyweight component system.
36. NOTIFICATIONS
The notification system should eventually support relevant events such as:
Someone followed you
Someone liked your post
Someone commented
Someone replied
Someone mentioned you
Your order executed
Your withdrawal requires action
Price alert triggered
Platform announcement
Use Supabase Realtime where appropriate.
The top navigation should show unread notification state.
The mobile experience should expose notification access without overwhelming the navigation.
37. TRADER DISCOVERY LOGIC
The "Who should I follow?" section should eventually become intelligent rather than static.
Suggestions can consider:
Similar followed assets
Trading interests
Engagement
Trader activity
Market categories
Existing follows
Popularity
Recent activity
Avoid recommending the same users repeatedly.
Do not create fake recommendation logic.
Start simple and deterministic, then improve later.
38. MOBILE HOMEPAGE
The mobile homepage should be intentionally designed as a vertical experience.
Recommended conceptual structure:
GNEX Header
Search / Notifications

Create Post

Suggested Traders

Trading Activity

Market Opportunities

Quick Trade / FTT

Market Sentiment

Additional discovery

Portfolio access

End of Home
"Explore Feed"

Swipe / tap into Feed
This is not a strict pixel-level arrangement.
The hierarchy is the important part.
39. MOBILE SEARCH
Search must remain accessible on mobile.
Do not force users to open the hamburger menu just to search markets or traders.
A compact search button/icon can live in the top header.
Tapping it can expand into the full search experience.
40. MOBILE TRADING TERMINAL
The mobile Trading page should not attempt to squeeze the desktop terminal into a phone.
Use:
Asset / Price

Mini chart / Advanced chart

Buy | Sell

Order Entry

Order Book

Recent Trades

Open Orders

History
Use tabs, drawers, expandable sections, or sticky controls where appropriate.
The execution controls must remain easy to reach.
41. MOBILE QUICK TRADE
Quick Trade should be optimized for thumb interaction.
Controls should have adequate touch targets.
The user should not need tiny buttons.
The flow should be:
Asset

Price
Chart preview

Buy / Sell

Amount

Available balance

Fee

Estimated total

Confirm
Do not overload the component.
42. MOBILE FEED
The Feed page should feel like a native financial-social experience.
Posts should be vertically organized.
Comments should use the conversational model.
Post expansion should feel immediate.
Likes should update instantly.
Save and report should be accessible.
The user should be able to move between Home and Feed without losing context.
43. PORTFOLIO
Do not remove Portfolio.
Do not make it the first homepage section.
Do not turn Home into a portfolio dashboard.
Portfolio should remain a dedicated financial workspace for:
Holdings
Balance
P/L
Asset allocation
Transaction history
Trading history
Performance
A compact entry point may appear near the lower portion of Home.
The user should also access the relevant portfolio information from Wallet and Trade workflows.
44. DESIGN THE SYSTEM AS ONE PRODUCT
Do not design:
Home
Feed
Markets
Trading
Wallet
Portfolio
as isolated pages.
They should share:
Typography
Semantic colors
Spacing
Interaction patterns
Shadows
Surface treatment
Button hierarchy
Responsive behavior
Notification system
Search behavior
The product should feel like one application.
45. DATA AND REALTIME BEHAVIOR
Where existing infrastructure supports it, use realtime behavior for:
Trading activity
Notifications
Likes
Comments
Market data
Order status
Sentiment updates where appropriate
Do not create unnecessary polling if Supabase Realtime or existing data services can handle the requirement.
Use loading states and graceful degradation when realtime data is unavailable.
46. ERROR AND EMPTY STATES
Do not leave users with blank areas.
Create meaningful states for:
No posts
No traders
No search results
No notifications
No market data
No trading activity
No sentiment data
Network failure
Market unavailable
For example:
No trader activity yet.

Discover traders to start building your Feed.
Use empty states to guide the user rather than simply displaying "No data."
47. PROFESSIONAL FINANCIAL UX
Financial data must always be clear.
Display:
Price
Change
Currency
Amount
Fee
Total
Available balance
Order state
Sentiment
Timestamp
with proper hierarchy.
Avoid ambiguous labels.
Do not hide transaction-critical information inside decorative UI.
48. DO NOT OVERDESIGN THE HOMEPAGE
There is an important tension here.
The homepage should contain enough information to feel alive, but it should not become a wall of widgets.
Prioritize:
Create Post
Trader discovery
Trading activity
Market opportunities
Quick Trade
Sentiment
Then allow the user to continue to Feed.
Do not place every possible GNEX feature on Home.
The homepage is an entry point, not a data dump.
49. DESKTOP FEED TRANSITION
At the bottom of Home, show a deliberate continuation point.
Example:
You've reached the end of Home.

Explore the wider GNEX Feed.

[ View Feed ]
Desktop users choose when to continue.
Do not automatically redirect.
50. MOBILE FEED TRANSITION
On mobile, the end of Home should feel like a transition into the Feed.
Example:
You've reached the end of Home.

Continue to Feed

↑ Swipe up to explore more
The interaction should make moving into Feed feel natural.
Where technically appropriate, use a route transition or gesture-aware interaction.
Do not create a confusing gesture that conflicts with browser behavior.
A simple, explicit CTA should remain available as a fallback.
51. IMPLEMENTATION STRATEGY
Before modifying anything, inspect the existing GNEX application.
Identify:
Existing layout
Existing top navigation
Existing sidebar
Existing mobile hamburger
Existing bottom navigation
Existing homepage
Existing Feed
Existing Create Post modal
Existing post cards
Existing comments
Existing trading UI
Existing charts
Existing wallet
Existing portfolio
Existing Supabase tables
Existing RLS
Existing realtime subscriptions
Existing notification logic
Reuse good components.
Refactor weak components.
Do not duplicate functionality.
52. IMPLEMENTATION ORDER
Implement in this order:Phase 1: Structural shell
Desktop three-column architecture.
Existing top navigation.
Desktop left sidebar.
Mobile hamburger sidebar.
Mobile bottom navigation:
Home | Markets | Trade | Feed | Wallet
Responsive foundations.Phase 2: Homepage hierarchy
Create Post first.
Trader discovery.
Trading Activity.
Market opportunities.
Quick Trade / FTT.
Sentiment.
Lower-priority portfolio access.
Home end transition to Feed.Phase 3: Social interaction
Post cards.
Subtle elevation.
Facebook-style comments.
Expanded post.
Like/unlike.
Save/unsave.
Share.
Report.
Follow/unfollow.Phase 4: Trading experience
Quick Trade.
Chart preview.
Desktop hover behavior.
Mobile touch behavior.
Premium Trading terminal.Phase 5: Intelligence
Search.
Trader recommendations.
Market sentiment.
Trending assets.
Trading activity.
Realtime updates.Phase 6: Application feedback
Toast system.
Confirmation dialogs.
Inline validation.
Notification center.
Replace browser-native dialogues.Phase 7: Hardening
Responsive testing.
Accessibility.
Loading states.
Empty states.
Error states.
Performance.
Backend integrity.
53. DO NOT BREAK EXISTING FINANCIAL FUNCTIONALITY
The UI redesign must not break:
Authentication
Supabase integration
Wallet
Deposits
Withdrawals
Ledger
Orders
Transactions
Trading logic
Admin approval workflows
RLS
Realtime functionality
Existing API routes
Do not rewrite working financial infrastructure simply because the UI structure changed.
Where new UI requires backend functionality that does not exist, implement it carefully within the current architecture.
54. QUALITY BAR
Before considering the redesign complete, verify:
Desktop maintains the three-column structure.
Mobile remains genuinely mobile-first.
The existing hamburger sidebar remains functional.
The existing GNEX top navigation remains recognizable.
Search is accessible.
Create Post is one of the first homepage interactions.
Trader discovery happens early.
Trading Activity comes after Create Post.
The homepage does not open with Portfolio Snapshot.
Quick Trade / FTT includes a chart preview on desktop and mobile.
Desktop hover interaction works.
Mobile touch interaction works.
Market sentiment displays only from a real methodology.
The full Feed is a dedicated page.
Home contains a controlled Feed preview rather than becoming the full Feed.
The end of Home provides a deliberate transition into Feed.
Desktop gives the user explicit control over entering Feed.
Mobile provides a natural continuation/swipe interaction with an explicit fallback CTA.
Post cards use subtle elevation instead of heavy solid borders.
Comments feel familiar and conversational.
Post expansion reveals additional information.
Like/unlike works.
Share works.
Save/unsave works.
Report works.
Trading terminal feels premium and professional.
Native browser alerts are replaced with proper application UI.
Existing financial backend functionality remains intact.
No fake financial or performance data has been introduced.
No unnecessary component library has been added.
55. FINAL DESIGN INTENT
The final GNEX product should feel like this:
A user opens Home.
They immediately see the market conversation.
They can publish something themselves.
They can discover traders worth following.
They see what is happening in the market.
They see meaningful activity.
They can understand whether market sentiment is leaning bullish, neutral, or bearish.
They can open Quick Trade and see a chart before executing.
They can go deeper into the professional Trading terminal when they need analysis.
They can enter Feed when they want the full social experience.
They can manage their wallet and portfolio without Home becoming an accounting dashboard.
The product should continuously connect:
people → markets → ideas → sentiment → trading → portfolio → community
That is the structural shift GNEX needs.
Preserve the existing foundation.
Preserve the GNEX visual identity.
Use subtle elevation instead of heavy border-driven layouts.
Make the homepage a discovery and decision surface.
Make Feed the dedicated social environment.
Make Trading the professional execution environment.
Make mobile a first-class experience, not a compressed desktop version.
Where backend functionality is missing, build the necessary supporting logic rather than leaving the interface as a simulation.
The final result should feel like a cohesive professional social-trading exchange, not a collection of redesigned pages.
