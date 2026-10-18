Here's the complete document — copy everything below and save as `derivx-dashboard-outline.md`:

```markdown
# DerivX — Advanced Application Outline

## Trading Platform Connected to Deriv API Endpoints

> A third-party trading platform with Deriv OAuth, bot automation, scriptable strategies, social monitoring, and full market access — modeled after app.bmxbot.com integration patterns.

---

## TABLE OF CONTENTS

```
1.  PROJECT OVERVIEW & ARCHITECTURE
2.  DERIV API INTEGRATION MAP
3.  HOME PAGES (3)
4.  AUTH PAGES (8)
5.  OPERATOR DASHBOARD PAGES (15)
6.  INVESTOR DASHBOARD PAGES (12)
7.  SHARED COMPONENTS
8.  STATE MANAGEMENT
9.  DATABASE SCHEMA
10. AUTOMATION & BOT ENGINE
11. SCRIPT ENGINE
12. CROWDFUNDING POOL DATA MODEL
13. LIVE TRADE TRACKER ENGINE
14. WALLET & FINANCE ENGINE
15. PROFIT CALCULATION ENGINE
16. DEPLOYMENT & ENVIRONMENT
17. COMPLETE PAGE INDEX
18. IMPLEMENTATION PHASES
```

---

## 1. PROJECT OVERVIEW & ARCHITECTURE

### 1.1 Tech Stack

```
FRONTEND:
  Framework:       Next.js 14 (App Router)
  UI Library:      Bootstrap 5.3.x + Bootstrap Icons
  Custom CSS:      Per-page scoped stylesheets
  State:           Zustand (client) + React Query (server)
  Charts:          Lightweight Charts (TradingView) + Recharts
  Realtime:        WebSocket (Deriv API) + Socket.IO (internal)
  Forms:           React Hook Form + Zod
  Code Editor:     Monaco Editor (script editing)
  Animation:       Framer Motion + CSS keyframes + Animate.css
  Tables:          TanStack Table (sortable/filterable/paginated)

BACKEND:
  Runtime:         Node.js + Express
  Database:        PostgreSQL (Prisma ORM)
  Cache:           Redis (sessions, rate limits, pub/sub)
  Auth:            NextAuth.js (credentials) + Deriv OAuth2
  Queue:           BullMQ (bot jobs, trade execution)
  WebSocket:       ws (Deriv WebSocket API)
  Scripts:         VM2 / isolated-vm (sandboxed strategy scripts)

INFRASTRUCTURE:
  Hosting:         VPS or AWS ECS
  Container:       Docker + docker-compose
  CI/CD:           GitHub Actions
  Monitoring:      Prometheus + Grafana
  Logging:         Winston + Loki
```

### 1.2 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Next.js)                      │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────────┐  │
│  │ Home │  │ Auth │  │Oper  │  │Invst │  │ Scripts  │  │
│  └──────┘  └──────┘  └──────┘  └──────┘  └──────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS / WSS
┌──────────────────────▼──────────────────────────────────┐
│                  API GATEWAY (Express)                   │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────────┐ │
│  │ Auth Routes│  │ Trade Routes│  │ Pool/Pkg Routes  │ │
│  └────────────┘  └─────────────┘  └──────────────────┘ │
└────┬───────────────┬────────────────┬──────────────────┘
     │               │                │
┌────▼────┐  ┌───────▼───────┐  ┌────▼─────────────────┐
│PostgreSQL│  │Deriv WebSocket│  │  BullMQ + Bot Engine │
│(Users,  │  │API (trades,   │  │  (strategy runner,   │
│ Pools,  │  │ ticks, auth)  │  │   trade executor)    │
│ Pkgs)   │  │               │  │                      │
└─────────┘  └───────┬───────┘  └──────────┬───────────┘
                     │                      │
              ┌──────▼──────────────────────▼──┐
              │     DERIV API (api.deriv.com)   │
              │  WebSocket: wss://ws.derivws... │
              │  OAuth: https://oauth.deriv.com │
              └─────────────────────────────────┘
```

### 1.3 Key Architecture Principle

```
OPERATOR MODEL:
  I (operator) → connect MY Deriv account → run MY bots
  Investors → join packages → their funds pooled into my capital
  I trade the pooled capital → profits distributed per package plan

  OPERATOR DASH = my command center (solo trading + managing investors)
  INVESTOR DASH = what investors see (their packages, earnings, wallet)

  The operator dashboard IS the trading dashboard.
  There is no per-user trading on the operator side. I trade for everyone.
  Investors don't need Deriv accounts. They invest through me.
```

### 1.4 UI Framework & Styling System

```
BOOTSTRAP 5.3.x RESPONSIVE BASE:
  Grid:             container / row / col-* with sm-md-lg-xl-xxl
  Components:       card, table, modal, offcanvas, accordion,
                    toast, dropdown, nav-tabs, progress, badge
  Utilities:        spacing, flex, gap, d-none/d-*, rounded-4, shadow-*
  Dark mode:        data-bs-theme="dark" native 5.3 toggle
  No jQuery — Bootstrap JS via bundle import only

PAGE-SCOPED CUSTOM CSS:
  Convention:       one stylesheet per page/route
  Loading:          bundled with that route's chunk
  Namespacing:      .page-trade { … }  .page-packages { … }
  Layer order:      1) Bootstrap 5.3  2) shared tokens  3) page-scoped

ANIMATION SYSTEM:
  Page entrance:    fade + slide-up stagger (50-80ms per item)
  Micro-interact:   hover-lift + shadow on cards; spin/pulse on live icons
  Data motion:      number count-up on KPI cards; row flash green/red
  A11y:             honor prefers-reduced-motion
```

---

## 2. DERIV API INTEGRATION MAP

### 2.1 Deriv WebSocket API Endpoints

```
CONNECTION:
  URL: wss://ws.derivws.com/websockets/v3?app_id={APP_ID}
  App Registration: https://api.deriv.com/app-manager

AUTHENTICATION:
  oauth2.authorize     → Deriv OAuth flow (redirect-based)
  authorize            → Token-based auth after OAuth
  logout               → Disconnect session

MARKET DATA:
  active_symbols       → List all available trading symbols
  trading_times        → Market open/close schedules
  tick                 → Subscribe to real-time price ticks
  ticks_history        → Historical OHLC data
  proposal             → Get price proposal for a contract
  proposal_array       → Multiple proposals at once

TRADING:
  buy                  → Purchase a contract
  sell                 → Sell an open contract
  cancel               → Cancel a pending purchase

PORTFOLIO:
  balance              → Account balance
  statement            → Account statement/transactions
  profit_table         → Profit/loss history

ACCOUNT:
  account_settings     → Get/set account settings
  reality_check        → Reality check reminder

UTILITY:
  time                 → Server time
  ping                 → Keep-alive
  website_status       → Platform status
```

### 2.2 OAuth2 Flow Implementation

```
STEP 1: REGISTER APP
  → https://api.deriv.com/app-manager
  → Set redirect_uri, scopes, app_name

STEP 2: REDIRECT USER TO DERIV
  → GET https://oauth.deriv.com/en/authorize?
      app_id={APP_ID}&
      l={language}&
      redirect_uri={CALLBACK_URL}&
      state={CSRF_TOKEN}

STEP 3: USER AUTHORIZES ON DERIV
  → Deriv shows authorization screen
  → User approves or denies

STEP 4: DERIV REDIRECTS BACK
  → GET {CALLBACK_URL}?code={AUTH_CODE}&state={CSRF_TOKEN}

STEP 5: EXCHANGE CODE FOR TOKEN
  → WebSocket: { "authorize": "{AUTH_CODE}" }
  → Response: { "authorize": { "loginid": "...", "token": "...", ... } }

STEP 6: STORE TOKEN
  → Encrypt token → Store in users table → Link to Deriv account

STEP 7: RE-AUTHENTICATE (subsequent visits)
  → WebSocket: { "authorize": "{STORED_TOKEN}" }
  → Session established
```

### 2.3 Supported Deriv Markets & Contract Types

```
MARKETS:
  ├── Forex          (frxEURUSD, frxGBPUSD, ...)
  ├── Synthetics     (R_10, R_25, R_50, R_75, R_100, 1HZ10V, ...)
  ├── Commodities    (frxXAUUSD, frxXAGUSD)
  ├── Crypto         (cryBTCUSD, cryETHUSD)
  ├── Indices        (frxUSDKRW, ...)
  └── Stock Indices  (STOCK_INDICES)

CONTRACT TYPES:
  ├── Rise/Fall
  ├── Higher/Lower
  ├── Touch/No Touch
  ├── Ends Between/Outside
  ├── Stays Between/Goes Outside
  ├── Even/Odd (synthetics only)
  ├── Over/Under (synthetics only)
  ├── Lookback (High/Low/Close)
  ├── Digit Match/Differ/Over/Under/Even/Odd
  └── Accumulator (synthetics only)

DURATIONS:
  ├── Ticks        (1-10 ticks)
  ├── Seconds      (5-3600s)
  ├── Minutes      (1-60m)
  ├── Hours        (1-24h)
  └── Days         (1-365d)
```

---

## 3. HOME PAGES (3 PAGES)

---

### PAGE H-1: Landing Page (`/`)

```
PURPOSE:
  First impression. Convince traders and investors to sign up.
  Show platform value proposition for both audiences.

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  NAVBAR                                                  │
│  [Logo: DerivX]  [Features] [Pricing] [Login] [Sign Up] │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  HERO SECTION                                            │
│                                                          │
│  "Trade Smarter on Deriv"                               │
│  "Automate strategies. Pool capital. Distribute profits."│
│                                                          │
│  [🤖 Start Trading →]  [💎 Invest in Pools →]          │
│                                                          │
│  Live Ticker Strip: EUR/USD 1.0842 ▲ | R_10 4532.11 ▲  │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  TRUST BAR                                               │
│  "Powered by Deriv API" | "256-bit Encryption"          │
│  | "10,000+ traders" | "24/7 Automation"                │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  FEATURE CARDS (3)                                       │
│                                                          │
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │ 🤖 Bot Engine   │  │ 💎 Crowdfunding │              │
│  │ Schedule & run  │  │ Pool capital,   │              │
│  │ automated trades│  │ earn from bots  │              │
│  └─────────────────┘  └─────────────────┘              │
│  ┌─────────────────┐                                   │
│  │ 📜 Script Engine│                                   │
│  │ Write custom JS │                                   │
│  │ strategies      │                                   │
│  └─────────────────┘                                   │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  HOW IT WORKS                                            │
│  1. Connect Deriv  →  2. Set Packages  →               │
│  3. Schedule Trades  →  4. Distribute Profits           │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  CTA + FOOTER                                           │
└─────────────────────────────────────────────────────────┘
```

---

### PAGE H-2: Features Page (`/features`)

```
PURPOSE:
  Deep dive into every feature for both operators and investors.

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  PAGE HERO                                               │
│  Feature sections with screenshots/animation             │
│  1. Bot Engine & Scheduling                             │
│  2. Script Engine                                       │
│  3. Crowdfunding Pools & Packages                       │
│  4. AI Guardian Capital Protection                      │
│  5. Market Coverage (100+ instruments)                  │
│  COMPARISON TABLE                                       │
│  CTA + FOOTER                                           │
└─────────────────────────────────────────────────────────┘
```

---

### PAGE H-3: Pricing Page (`/pricing`)

```
PURPOSE:
  Tiered pricing for operators. Free tier to start.
  Pro tier for serious operators. Team for groups.

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  PRICING CARDS (3): Free / Pro ($29/mo) / Team ($79/mo) │
│  FEATURE MATRIX                                         │
│  FAQ SECTION                                            │
│  CTA + FOOTER                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 4. AUTH PAGES (8 PAGES)

---

### PAGE A-1: Sign Up (`/auth/signup`)

```
PURPOSE:
  Create DerivX account WITH role selection.
  User chooses: "Trade Myself (Operator)" or "Invest in Crowdfunding"

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  LEFT PANEL (branding)       │ RIGHT PANEL (form)       │
│                               │                          │
│  DerivX Logo                  │  "Create your account"   │
│  Illustration                 │                          │
│                               │  ┌────────────────────┐  │
│                               │  │ Full Name          │  │
│                               │  ├────────────────────┤  │
│                               │  │ Email              │  │
│                               │  ├────────────────────┤  │
│                               │  │ Password           │  │
│                               │  ├────────────────────┤  │
│                               │  │ Confirm Password   │  │
│                               │  └────────────────────┘  │
│                               │                          │
│                               │  ── Choose Your Path ──  │
│                               │                          │
│                               │  ┌──────────────────┐   │
│                               │  │  🤖 TRADE MYSELF │   │
│                               │  │  Connect to      │   │
│                               │  │  Deriv API. Run  │   │
│                               │  │  bots. Manage    │   │
│                               │  │  investors.      │   │
│                               │  │  → Operator Dash │   │
│                               │  └──────────────────┘   │
│                               │                          │
│                               │  ┌──────────────────┐   │
│                               │  │  💎 BECOME AN     │   │
│                               │  │  INVESTOR        │   │
│                               │  │  Join crowdfunding│   │
│                               │  │  pools. Earn from│   │
│                               │  │  pooled trading. │   │
│                               │  │  → Investor Dash │   │
│                               │  └──────────────────┘   │
│                               │                          │
│                               │  ☐ I agree to T&C       │
│                               │  [Create Account]        │
│                               │                          │
│                               │  Already have account?   │
│                               │  [Sign In →]             │
└───────────────────────────────┴──────────────────────────┘
```

#### Role Selection Schema

```
SCHEMA: signupSchema (extended)
  fullName:        z.string().min(2).max(100)
  email:           z.string().email()
  password:        z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/).regex(/[^a-zA-Z0-9]/)
  confirmPassword: z.string().refine(val => val === password)
  role:            z.enum(["operator", "investor"])
  termsAccepted:   z.literal(true)

ROLE ROUTING:
  role === "operator"  → onboarding → /dashboard (operator dash)
  role === "investor"  → onboarding → /investor (investor dash)

DUAL ACCESS:
  - Users CAN switch later in settings
  - Primary role determines default landing page
  - Role stored in users table: role "operator" | "investor" | "both"
```

---

### PAGE A-2: Sign In (`/auth/signin`)

```
PURPOSE:
  Sign in with awareness of user's role.
  Redirect to correct dashboard.

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  CENTERED CARD                                          │
│                                                          │
│  DerivX Logo                                            │
│  "Welcome back"                                         │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Email                                            │   │
│  ├──────────────────────────────────────────────────┤   │
│  │ Password                            [Show 👁]    │   │
│  ├──────────────────────────────────────────────────┤   │
│  │ ☐ Remember me          Forgot password?          │   │
│  ├──────────────────────────────────────────────────┤   │
│  │ [Sign In]                                        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ── or sign in with ──                                  │
│  [G] Google   [D] Deriv OAuth                            │
│                                                          │
│  AFTER SIGN IN — ROLE ROUTER:                           │
│  If user.role === "operator"   → /dashboard              │
│  If user.role === "investor"   → /investor               │
│  If user.role === "both"       → show dashboard picker   │
└─────────────────────────────────────────────────────────┘
```

---

### PAGE A-3: Investor Onboarding (`/auth/onboarding/investor`)

```
PURPOSE:
  First-time investor setup. How pools work, KYC, wallet setup.

STEPPER:
  Step 1: WELCOME — explain crowdfunding pools
  Step 2: HOW POOLS WORK — Pool → Trading → Profit Sharing → Payout
  Step 3: KYC / IDENTITY VERIFICATION — ID upload, selfie, proof of address
  Step 4: DONE — show available pools, link to investor dashboard
```

---

### PAGE A-4: Forgot Password (`/auth/forgot-password`)

```
PURPOSE: Request password reset email.
  Email input → Send Reset Link → Success message
```

---

### PAGE A-5: Reset Password (`/auth/reset-password`)

```
PURPOSE: Set new password using token from email.
  New Password + Confirm → Reset Password → Redirect to signin
```

---

### PAGE A-6: Email Verification (`/auth/verify-email`)

```
PURPOSE: Verify user's email address after signup.
  Pending state → Click link → Verified state → Redirect
```

---

### PAGE A-7: Two-Factor Authentication (`/auth/2fa`)

```
PURPOSE: 2FA verification step during sign-in (if enabled).
  6-digit code input → Verify → or Backup code → Access
```

---

### PAGE A-8: Deriv OAuth Callback (`/auth/deriv/callback`)

```
PURPOSE:
  Handle redirect from Deriv after user authorizes.
  Exchange code for token. Link Deriv account.

STATES:
  LOADING → Show progress steps (redirected → exchanging → connecting → linking)
  SUCCESS → Show account details, redirect to dashboard
  ERROR → Show error, try again button

FLOW:
  1. Extract code & state from URL params
  2. Validate state matches CSRF token
  3. Open WebSocket to Deriv API
  4. Send: { "authorize": "{code}" }
  5. Store encrypted token in deriv_connections table
  6. Redirect to /dashboard
```

---

## 5. OPERATOR DASHBOARD PAGES (15 PAGES)

---

### PAGE D-1: Command Center Overview (`/dashboard`)

```
PURPOSE:
  My primary hub. What I traded last, what's scheduled next,
  how many investors are active, total funds under management,
  profits earned and distributed.

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  SIDEBAR             │  TOP BAR                          │
│  ┌───────────────┐  │  [Deriv: 🟢 Connected] [🔔] [Me▼]│
│  │ ⚡ Command     │  ├──────────────────────────────────┤
│  │ 📅 Schedules  │  │                                   │
│  │ 🔄 Live Trades│  │  SECTION 1: OPERATOR KPI STRIP    │
│  │ 📊 Trade Log  │  │  ───────────────────────────────  │
│  │ 📦 Packages   │  │                                   │
│  │ 👥 Investors  │  │  ┌─────────┐┌─────────┐┌────────┐│
│  │ 💰 Funds     │  │  │Total    ││Active   ││Total   ││
│  │ 📤 Withdrawals│  │  │Capital  ││Investors││Profit  ││
│  │ 💬 Comms     │  │  │$156,000 ││38       ││+$18,240││
│  │ 📥 Deposits  │  │  │▲+$12k   ││▲ +3     ││+11.7%  ││
│  │ 📋 Logs      │  │  └─────────┘└─────────┘└────────┘│
│  │ 🎯 Markets   │  │                                   │
│  │ 🤖 Bots      │  │  ┌─────────┐┌─────────┐┌────────┐│
│  │ ⚙️ Settings  │  │  │Scheduled││Trades   ││Pending ││
│  └───────────────┘  │  │Today    ││Today    ││Payouts ││
│                      │  │8        ││47       ││4 ($720)││
│                      │  └─────────┘└─────────┘└────────┘│
│                      │                                   │
│                      │  SECTION 2: LAST 5 TRADES         │
│                      │  ───────────────────────────────  │
│                      │  ┌───────────────────────────────┐│
│                      │  │ #    Symbol  Type    P&L  Time ││
│                      │  │ 247  R_10   Rise5t +$35 14:23 ││
│                      │  │ 246  R_75   Even   +$28 14:21 ││
│                      │  │ 245  R_10   Rise5t -$35 14:18 ││
│                      │  │ 244  R_100  Odd    +$70 14:15 ││
│                      │  │ 243  R_10   Rise5t +$35 14:12 ││
│                      │  │ Session: +$133  |  Win: 4/5   ││
│                      │  └───────────────────────────────┘│
│                      │                                   │
│                      │  SECTION 3: UPCOMING SCHEDULED    │
│                      │  ───────────────────────────────  │
│                      │  📅 Next Scheduled Trades          │
│                      │  15:00  R_10  Martingale  $35    │
│                      │  15:30  R_75  Even/Odd   $35    │
│                      │  16:00  R_100 DCA        $70    │
│                      │  Next in: 23m 14s                  │
│                      │  [View Full Schedule]              │
│                      │                                   │
│                      │  SECTION 4: FUNDS & INVESTORS     │
│                      │  ───────────────────────────────  │
│                      │  ┌──────────────┬────────────────┐│
│                      │  │ FUNDS FLOW   │ INVESTOR WATCH  ││
│                      │  │ Capital:     │ Total: 38      ││
│                      │  │ $156,000     │ Active: 32     ││
│                      │  │ In trades:   │ New today: 3   ││
│                      │  │ $142,000     │ Top: User_8f2a ││
│                      │  │ Available:   │ $15,000 (5sl)  ││
│                      │  │ $14,000      │ Pending KYC: 2 ││
│                      │  └──────────────┴────────────────┘│
│                      │                                   │
│                      │  SECTION 5: PROFIT DISTRIBUTION    │
│                      │  ───────────────────────────────  │
│                      │  Pool P&L:    +$18,240            │
│                      │  My share:    +$3,648 (20%)       │
│                      │  Distributed: $11,675             │
│                      │  Pending:     $2,917              │
│                      │  ████████████░░░░ 80% distributed │
│                      │  [Distribute Pending]              │
│                      │                                   │
│                      │  SECTION 6: QUICK ACTIONS          │
│                      │  ───────────────────────────────  │
│                      │  [⚡ Execute Trade]  [📅 Schedule]│
│                      │  [📦 New Package]   [💬 Announce]│
│                      │  [📤 Process Payouts]             │
└──────────────────────┴───────────────────────────────────┘
```

#### Components Breakdown

```
CommandCenterPage/
  ├── SECTION 1: OperatorKPIStrip
  │     ├── totalCapital, activeInvestors, totalProfit, profitPercent
  │     ├── scheduledToday, tradesToday
  │     └── pendingPayouts: { count, totalAmount }
  │
  ├── SECTION 2: Last5Trades
  │     ├── trades: TradeRecord[] (tradeNumber, symbol, contractType, profit, timestamp, packageId)
  │     └── sessionSummary: { pnl, winCount, totalCount }
  │
  ├── SECTION 3: UpcomingScheduled
  │     ├── schedules: ScheduledTrade[] (executeAt, symbol, strategy, stake, packageIds)
  │     ├── nextIn: { minutes, seconds }
  │     └── onViewFullSchedule: () → /dashboard/schedules
  │
  ├── SECTION 4: FundsAndInvestors
  │     ├── FundsFlow: totalCapital, capitalInTrades, availableCapital, todayDeposits
  │     └── InvestorWatch: totalInvestors, activeInvestors, newToday, topInvestor, pendingKYC
  │
  ├── SECTION 5: ProfitDistribution
  │     ├── poolPnL, operatorShare, distributed, pending, distributionPercent
  │     └── onDistribute: () → batch distribute pending
  │
  └── SECTION 6: QuickActions
        ├── onExecuteTrade, onSchedule, onNewPackage, onAnnounce, onProcessPayouts
```

---

### PAGE D-2: Trade Scheduler (`/dashboard/schedules`)

```
PURPOSE:
  Schedule trades by date, time, market, strategy, amount.
  Trades serve specific packages. Calendar + list + timeline view.

5 SECTIONS:
  SECTION 1: CALENDAR VIEW
    - Month view with ● on days that have scheduled trades
    - Click day to expand and see trades for that day

  SECTION 2: TODAY'S SCHEDULE (timeline)
    - Horizontal timeline showing trade blocks through the day
    - Current time indicator
    - Each block: time, strategy, symbol, stake, trade count

  SECTION 3: SCHEDULED TRADE LIST (TanStack Table)
    - Columns: Time, Symbol, Strategy, Package, Stake, Count, Status
    - Actions per row: Edit, Skip, Run Now
    - Filterable by date, package, status

  SECTION 4: NEW SCHEDULE FORM
    - Schedule Name, Date, Start/End Time
    - Symbol, Strategy, Initial Stake, Max Trades
    - Assign to Packages (checkboxes with % allocation)
    - Recurrence: One-time, Daily, Weekdays, Custom cron
    - Risk Limits: Stop Loss, Take Profit, Max Drawdown, Cooldown
    - [Save Schedule] [Save & Run Now]

  SECTION 5: PACKAGE-TRADE MAPPING
    - Which packages are served by which schedules
    - Table: Package, Schedules, Capital, % Share
    - Capital auto-calculated from investor deposits per package
```

---

### PAGE D-3: Live Trading (`/dashboard/live`)

```
PURPOSE:
  Active trades running NOW. Real-time feed, no charts.
  Numbers streaming, adding to profits/losses live.

5 SECTIONS:
  SECTION 1: RUNNING TOTALS
    - Capital in market, Session P&L, Trades count (W/L)
    - Win Rate, Current Streak, AI Guardian status

  SECTION 2: LIVE TRADE FEED (newest first, streaming)
    - ✅ WIN / ❌ LOSS with symbol, type, stake, payout, P&L
    - Entry/exit spot, timestamp, package assignment
    - Green/red flash animation on new entries

  SECTION 3: LIVE TICK PRICES
    - All subscribed symbols with current price and direction
    - Update in real-time via WebSocket

  SECTION 4: ACTIVE BOTS
    - Each bot: status, symbol, trade count, win rate, P&L
    - [Pause All] [Stop All] [Restart All]

  SECTION 5: PER-PACKAGE LIVE P&L
    - Each package: capital, current P&L, ROI
    - P&L split proportional to each package's capital share
```

---

### PAGE D-4: Trade Log & Records (`/dashboard/trades`)

```
PURPOSE:
  Complete history of all trades I've executed.
  Filterable by date, package, market, result. Exportable.

5 SECTIONS:
  SECTION 1: SUMMARY CARDS
    - Total trades, Wins, Losses, Net P&L, Win Rate, Avg Win, Avg Loss, Best trade

  SECTION 2: TRADE TABLE (TanStack Table)
    - Columns: #, Date, Symbol, Type, Stake, Payout, P&L, Package
    - Paginated, sortable, filterable, column-resizable
    - Row click expands to show full execution details

  SECTION 3: DAILY AGGREGATION
    - Table: Date, Trades, Wins, Win %, P&L, Running Capital

  SECTION 4: PER-PACKAGE BREAKDOWN
    - Table: Package, Trades, Wins, P&L, ROI

  SECTION 5: TRADE EXECUTION DETAILS (expanded row)
    - Symbol, Contract, Duration, Entry/Exit spot
    - Buy/Sell price, Profit, Bot name, Schedule name
    - Package assignment, Deriv Contract ID, Executed at
```

---

### PAGE D-5: Package Manager (`/dashboard/packages`)

```
PURPOSE:
  Define and manage crowdfunding packages. Each package has
  different investment tiers, durations, expected returns,
  deadlines, and terms. This is where I set what investors buy.

5 SECTIONS:
  SECTION 1: ACTIVE PACKAGES
    - Card per package showing:
      Name, Min Investment, Max Slots/User, Duration, Expected ROI
      Target Capital, Filled % (progress bar), Investor count
      Trading period with countdown, Current P&L
      [View Details] [Edit] [View Investors]

  SECTION 2: COMPLETED PACKAGES
    - List of past packages with final ROI, profit, distribution status

  SECTION 3: NEW PACKAGE FORM (advanced)
    - Package Name & Code
    - Investment Terms: Min per Slot, Max Slots/User, Target/Max Capital
    - Timeline: Booking Opens/Closes, Trading Starts/Ends, Profit Sharing date
    - Expected Returns: Conservative/Expected/Optimistic ROI
    - Profit Split: Operator % / Investors %
    - Trading Config: Markets (checkboxes), Strategies (checkboxes), AI Guardian, Max Drawdown
    - Terms & Conditions: Upload PDF, auto-reinvest option, early exit penalty
    - [Save Draft] [Publish Package]

  SECTION 4: PACKAGE COMPARISON TABLE
    - Side-by-side: Min Slot, Duration, Exp ROI, Markets, Capital, Investors, Status

  SECTION 5: PACKAGE PERFORMANCE HISTORY
    - Historical results for similar package configs
    - Average/Best/Worst ROI across past packages
```

---

### PAGE D-6: Investors Management (`/dashboard/investors`)

```
PURPOSE:
  All investors who joined packages. Their investments,
  packages, KYC status, earnings, communications.

5 SECTIONS:
  SECTION 1: INVESTOR SUMMARY
    - Total, Active, Total Invested, Pending KYC, New Today, Avg Investment, Top Investor

  SECTION 2: INVESTOR TABLE (TanStack Table)
    - Columns: ID, Name, Packages, Invested, P&L, KYC, Actions
    - Actions: View Profile, Message, View Trades, Process Payout, Suspend

  SECTION 3: INVESTOR DETAIL (side panel or modal)
    - Name, Email, Phone, Joined date, KYC level
    - Packages with slots, investment, P&L per package
    - Total invested, total earnings, wallet balance
    - Recent activity log
    - [Message] [View Full Trades] [Force Payout]

  SECTION 4: INVESTORS BY PACKAGE
    - Per package: investor count, fill progress bar, top investors

  SECTION 5: KYC VERIFICATION QUEUE
    - Pending verifications with document viewer
    - View ID front/back + selfie
    - Approve / Reject (with reason)
```

---

### PAGE D-7: Analytics (`/dashboard/analytics`)

```
PURPOSE:
  Performance analytics factoring in investors, packages,
  different trade periods per package, and profit allocation.

5 SECTIONS:
  SECTION 1: OVERVIEW METRICS
    - Total P&L, Overall ROI, Profit Factor, Sharpe Ratio, Max Drawdown, Avg Trade Duration

  SECTION 2: PER-PACKAGE ANALYTICS
    - Each package card showing:
      Period with countdown, Capital, P&L, Trades, Win Rate
      Markets and strategies used
      Time elapsed progress bar
      Investor impact: count, avg investment, per-investor avg P&L
      Distributed so far

  SECTION 3: INVESTOR PERFORMANCE RANKING
    - Table: Rank, Investor, Invested, Earned, Avg ROI

  SECTION 4: MARKET & STRATEGY BREAKDOWN
    - By Market: Symbol, Trades, P&L, Win Rate
    - By Strategy: Strategy, Trades, P&L, Win Rate

  SECTION 5: REVENUE & DISTRIBUTION
    - Total Pool P&L, Operator Share %, Investor Share %
    - Distributed vs Pending amounts
    - Per-package breakdown of P&L → operator → investor split
```

---

### PAGE D-8: Funds & Capital (`/dashboard/funds`)

```
PURPOSE:
  All money flowing through the platform. Deposits received,
  capital deployed, available balance, fund allocation.

5 SECTIONS:
  SECTION 1: CAPITAL OVERVIEW
    - Total Capital Under Management
    - Deployed In Trades / Available / Pending Deposits
    - Deriv Account Balance / Escrow Account

  SECTION 2: DEPOSIT RECORDS
    - Table: Date, Investor, Amount, Method, Package, Status
    - Actions: Verify, Reject, Request More Info

  SECTION 3: CAPITAL ALLOCATION BY PACKAGE
    - Table: Package, Capital, % of Total, Status
    - [Rebalance Allocations] — adjust % splits

  SECTION 4: FUND FLOW TIMELINE
    - Chronological log of all money movements

  SECTION 5: RECONCILIATION & AUDIT
    - Total deposits vs Deriv balance vs payouts
    - Discrepancy detection
    - [Run Full Reconciliation] [Export Audit Report]
```

---

### PAGE D-9: Withdrawal Requests (`/dashboard/withdrawals`)

```
PURPOSE:
  Investor payout requests. Approve, reject, process, track.
  Queue management for batch processing.

5 SECTIONS:
  SECTION 1: PAYOUT QUEUE SUMMARY
    - Pending count/amount, Processing, Completed, Total Paid Out

  SECTION 2: PENDING REQUESTS (actionable)
    - Table: Date, Investor, Amount, Method, Reason, Actions
    - [✅ Approve] [❌ Reject] per row
    - Bulk: Approve Selected / Reject Selected

  SECTION 3: PROCESSING (in-flight payouts)
    - Transfers sent, awaiting confirmation
    - [Mark Complete] [Mark Failed] [Contact Investor]

  SECTION 4: COMPLETED PAYOUTS
    - Table: Date, Investor, Amount, Method, Fee, Reference

  SECTION 5: PAYOUT SETTINGS & RULES
    - Min/max payout, auto-approve threshold, batch processing schedule
    - Fee structure, default method, processing times
```

---

### PAGE D-10: Communications (`/dashboard/comms`)

```
PURPOSE:
  Messages to/from investors. Announcements, bulk notifications,
  individual messages, email templates.

5 SECTIONS:
  SECTION 1: RECENT MESSAGES
    - Inbox with unread/read/replied status
    - [Reply] [View Investor]

  SECTION 2: ANNOUNCEMENTS
    - Sent announcements with read count
    - [New Announcement] [Resend to unread]

  SECTION 3: COMPOSE MESSAGE
    - To: Individual / All / By Package
    - Rich text editor with variables: {name}, {package}, {investment}, {earnings}
    - Via: In-app / Email / Telegram / SMS
    - [Send] [Schedule for later] [Save as Template]

  SECTION 4: EMAIL TEMPLATES
    - Pre-built: Welcome, Package Confirmation, Trading Started,
      Earnings Update, Payout Processed, AI Guardian Alert, Package Completed
    - [Edit] [Preview] [Send Test] per template

  SECTION 5: NOTIFICATION LOG
    - Table: Date, Type, Sent To, Count, Channel
```

---

### PAGE D-11: Deposit Logs (`/dashboard/deposits`)

```
PURPOSE:
  Comprehensive deposit tracking. Every payment received,
  verification status, method details, reconciliation.

5 SECTIONS:
  SECTION 1: DEPOSIT SUMMARY
    - Total Received, Verified, Pending, Failed, Today, This Week, Avg Verification Time

  SECTION 2: DEPOSIT TABLE (TanStack Table)
    - Columns: ID, Investor, Amount, Method, Package, Status
    - Expandable rows with full payment details, reference, verification notes

  SECTION 3: VERIFICATION QUEUE
    - Pending deposits with [Verify] [Reject] [Request Proof]

  SECTION 4: METHOD BREAKDOWN
    - Table: Method, Count, Total, Avg Verification Time

  SECTION 5: FAILED & REFUNDED
    - Failed deposits with reason and retry option
    - Refunded deposits with confirmation
```

---

### PAGE D-12: Activity & Audit Logs (`/dashboard/logs`)

```
PURPOSE:
  Complete audit trail. Every action on the platform logged.
  Who did what, when, from where. Searchable, filterable.

5 SECTIONS:
  SECTION 1: LOG STREAM (newest first, real-time)
    - TRADE, DEPOSIT, SYSTEM, PAYOUT, AUTH, COMM events

  SECTION 2: CATEGORIZED LOGS (tabbed)
    - Trade Logs, Deposit Logs, Payout Logs, System Logs

  SECTION 3: INVESTOR ACTIVITY
    - Per-investor activity timeline

  SECTION 4: SYSTEM EVENTS
    - AI Guardian triggers, Reconciliation, Backups, Cron jobs, Webhook failures

  SECTION 5: EXPORT & COMPLIANCE
    - [Export All Logs CSV] [Generate Compliance Report] [Tax Report]
    - Retention policy, last archive date
```

---

### PAGE D-13: Markets & Symbols (`/dashboard/markets`)

```
PURPOSE:
  Browse available Deriv markets for scheduling trades.
  Symbol selection, market schedules, tick previews.

5 SECTIONS:
  SECTION 1: MARKET TABS & FILTER
    - Forex, Synthetics, Commodities, Crypto, Indices
    - Search and favorites filter

  SECTION 2: SYMBOL GRID
    - Cards with live price, direction, tick timing
    - Shows which packages use each symbol
    - [Schedule] button per symbol

  SECTION 3: MARKET SCHEDULE
    - Open/close times, countdown to close

  SECTION 4: PACKAGE MARKET ASSIGNMENT
    - Which markets are assigned to which packages
    - [Edit Assignments]

  SECTION 5: QUICK SCHEDULE FROM MARKET
    - Inline form: Strategy, Stake, Duration, Assign to Packages, Time
    - [Schedule Trade]
```

---

### PAGE D-14: Bot & Automation Config (`/dashboard/bots`)

```
PURPOSE:
  Configure the bots that execute my scheduled trades.
  These are MY operator bots that trade the pooled capital on Deriv.

5 SECTIONS:
  SECTION 1: BOT CARDS
    - Per bot: status, symbol, strategy, packages served, runtime, trades, win rate, P&L
    - [Pause] [Stop] [Config]

  SECTION 2: BOT CONFIG (expandable per bot)
    - Symbol, Contract, Stake settings, Strategy params
    - Package Capital Allocation (which packages, what %)
    - Risk Limits, AI Guardian settings

  SECTION 3: AI GUARDIAN STATUS
    - Global status, rules, recent triggers
    - [Edit Guardian Rules] [View Full Trigger History]

  SECTION 4: AUTOMATION RULES
    - Conditional rules: stop on drawdown, notify on trigger, auto-distribute
    - [+ New Rule]

  SECTION 5: OPERATOR NOTIFICATIONS
    - Real-time alerts for the operator
    - [Mark All Read] [Notification Settings]
```

---

### PAGE D-15: Settings (`/dashboard/settings`)

```
PURPOSE:
  Operator profile, Deriv connection, platform configuration,
  payout rules, notification preferences, security.

5 SECTIONS:
  SECTION 1: OPERATOR PROFILE
    - Name, Email, Role, Timezone

  SECTION 2: DERIV CONNECTION
    - Connected account details, balance
    - [Refresh Token] [Reconnect] [+ Add Second Account]

  SECTION 3: PLATFORM CONFIGURATION
    - Default package split (operator/investor %)
    - Default min investment, auto-verify deposits, auto-approve payouts
    - Batch payout time, earnings calc frequency, max investors per package

  SECTION 4: SECURITY
    - Change Password, 2FA, Session timeout, IP whitelist

  SECTION 5: NOTIFICATION CHANNELS
    - Email, Telegram, Push, Webhook
    - Alert toggles: AI Guardian, Large deposit, Payout request, Drawdown, New investor, KYC
```

---

## 6. INVESTOR DASHBOARD PAGES (12 PAGES)

---

### PAGE I-1: Investor Overview (`/investor`)

```
PURPOSE:
  Main hub for investors. Pool status, investment summary,
  active trades overview, earnings ticker, quick actions.

6 SECTIONS:
  SECTION 1: WelcomeEarnings
    - userName, investorSince, totalInvested, activePools, earnedThisMonth

  SECTION 2: ActivePoolStatus
    - Per active pool: status, goal/raised, user slots/investment/share
    - Trading time with countdown, current P&L, user share, ROI
    - [View Details] [Live Trades]

  SECTION 3: EarningsTicker
    - Per pool: profit, ROI, last updated
    - Auto-refresh every 3 minutes with countdown
    - [🔄 Refresh Now] button

  SECTION 4: UpcomingPools
    - Pools opening soon with dates, min per slot
    - [Book Slot] [Set Reminder]

  SECTION 5: RecentActivity
    - Trade wins/losses, deposits, pool status changes

  SECTION 6: QuickActions
    - [Book Slot] [View Earnings] [Request Payout] [Calculator]
```

---

### PAGE I-2: Crowdfunding Pools (`/investor/pools`)

```
PURPOSE:
  Browse all pools — past, current, and upcoming.
  Book slots, view pool details, track history.

5 SECTIONS:
  SECTION 1: ACTIVE/TRADING POOLS
    - Pool card with: goal/raised progress, your investment/share
    - Trading countdown, current P&L, your earnings, AI Guardian status

  SECTION 2: OPEN POOLS (accepting bookings)
    - Pool card with: opens/closes dates, countdown to close
    - Your booked slots, payment status, [+ Book More Slots]

  SECTION 3: UPCOMING POOLS
    - Future pools with dates, min per slot
    - [Set Reminder] [Pre-book Interest]

  SECTION 4: COMPLETED POOLS
    - Past pools with final P&L, your earnings, payout status

  SECTION 5: POOL ROADMAP
    - Visual timeline of all planned pools leading to token launch
```

---

### PAGE I-3: Pool Detail (`/investor/pools/:id`)

```
PURPOSE:
  Deep dive into a single pool from investor perspective.

5 SECTIONS:
  SECTION 1: POOL OVERVIEW
    - Goal, raised, slots, dates, countdown timer

  SECTION 2: YOUR INVESTMENT IN THIS POOL
    - Slots, investment, share %, token allocation
    - Live earnings with 3-min auto-refresh
    - Daily earnings breakdown

  SECTION 3: POOL PERFORMANCE (numbers only)
    - Total P&L, Win Rate, Total Trades, Max Drawdown, AI Guardian triggers, Avg Trade

  SECTION 4: AI GUARDIAN STATUS
    - Status, settings, recent triggers with details

  SECTION 5: POOL PARTICIPANTS (anonymized)
    - Total participants, slots filled, averages
    - Top participants by slots (anonymized)
```

---

### PAGE I-4: Pool Booking & Payment (`/investor/pools/:id/book`)

```
PURPOSE:
  Book slots in a pool, make payment, confirm booking.

5 SECTIONS:
  SECTION 1: POOL DETAILS
    - Status, closes countdown, min/max per slot, available slots

  SECTION 2: SELECT SLOTS
    - Number picker with calculated totals (amount + tokens)
    - Current bookings + after this booking summary

  SECTION 3: PAYMENT METHOD
    - Wallet Balance, Bank Transfer, Mobile Money, Card, Crypto
    - Method-specific form

  SECTION 4: PAYMENT DETAILS & CONFIRM
    - Order summary, bank transfer instructions (if applicable)
    - Terms checkboxes, [Confirm Booking]

  SECTION 5: PAYMENT STATUS TRACKER
    - Step progress: Created → Instructions → Received → Verified → Confirmed
    - 72-hour reservation window notice
```

---

### PAGE I-5: Live Trade Tracker (`/investor/live`)

```
PURPOSE:
  Real-time live trading feed. NO CHARTS.
  Just raw numbers, values, and trade results flowing in.

5 SECTIONS:
  SECTION 1: LIVE RUNNING TOTALS
    - Running Capital, Current P&L, Pool ROI, Your Share
    - Trades Executed, Wins, Losses, Win Rate, Last trade time

  SECTION 2: LIVE TRADE FEED (scrolling, newest first)
    - ✅ WIN / ❌ LOSS with symbol, type, stake, payout, P&L
    - Entry/exit spots, timestamp
    - Green/red flash on new entries

  SECTION 3: LIVE NUMBER TICKERS
    - All symbols with streaming prices and direction arrows
    - Tick timing shown

  SECTION 4: SESSION STATISTICS
    - Today's trades/wins/losses, P&L, best/worst trade, streaks

  SECTION 5: ACTIVE BOTS IN POOL
    - Bot name, symbol, trades, win rate, current stake, P&L
    - AI Guardian pause indicator
```

---

### PAGE I-6: My Investments (`/investor/investments`)

```
PURPOSE:
  Track all investments across all pools.

5 SECTIONS:
  SECTION 1: INVESTMENT SUMMARY
    - Total Invested, Active Investments, Total Earned, Completed Investments, Pending Payouts, Overall ROI

  SECTION 2: ACTIVE INVESTMENTS
    - Per pool: slots, investment, share, payment status/method
    - Current value, earnings, ROI, status, time remaining

  SECTION 3: COMPLETED INVESTMENTS
    - Past pools with final P&L, earnings, payout status

  SECTION 4: BOOKED SLOTS (upcoming pools)
    - Booked but not yet trading, payment pending/confirmed

  SECTION 5: INVESTMENT TIMELINE
    - Chronological history of all investment actions
```

---

### PAGE I-7: Wallet & Finances (`/investor/wallet`)

```
PURPOSE:
  Central wallet. Balance, deposit, request payout,
  transaction history, payment methods.

5 SECTIONS:
  SECTION 1: WALLET OVERVIEW
    - Available Balance, Locked In Pools, Pending Payout, Total Account Value
    - Lifetime deposits/earnings/withdrawals

  SECTION 2: DEPOSIT FUNDS
    - Amount input with quick buttons ($1k, $3k, $5k, $10k)
    - Payment method selection: Bank, Mobile Money, Card, Crypto, Stablecoins
    - Method-specific instructions and form
    - [Confirm Deposit]

  SECTION 3: REQUEST PAYOUT
    - Available for withdrawal, minimum, processing time
    - Amount input, withdrawal method selection
    - Fee display, [Request Payout]
    - Recent payouts list

  SECTION 4: TRANSACTION HISTORY
    - Filterable table: Date, Type, Amount, Method, Status
    - [Export CSV] [Export PDF]

  SECTION 5: SAVED PAYMENT METHODS
    - List of saved methods with default indicator
    - [Remove] [+ Add Payment Method]
```

---

### PAGE I-8: Investment Calculator (`/investor/calculator`)

```
PURPOSE:
  Calculate potential returns, ROI projections, fee calculator.

5 SECTIONS:
  SECTION 1: ROI CALCULATOR
    - Investment amount, slots, expected ROI, duration → projected earnings, total return, daily avg, effective APY

  SECTION 2: COMPOUND GROWTH CALCULATOR
    - Initial investment, per-pool ROI, number of pools → compound growth table

  SECTION 3: FEE CALCULATOR
    - Deposit fee, platform profit share %, payout fee
    - Net earnings after all fees

  SECTION 4: SCENARIO COMPARISON
    - Table comparing 1/2/3 slots at conservative/expected/optimistic ROI

  SECTION 5: HISTORICAL POOL PERFORMANCE
    - Past pool results for reference
    - Average/Best/Worst ROI disclaimer
```

---

### PAGE I-9: Notifications & Activity (`/investor/notifications`)

```
PURPOSE:
  All investor notifications and activity log.

5 SECTIONS:
  SECTION 1: UNREAD NOTIFICATIONS
  SECTION 2: TRADE ACTIVITY
  SECTION 3: POOL UPDATES
  SECTION 4: PAYMENT & PAYOUT ALERTS
  SECTION 5: SYSTEM & SECURITY
```

---

### PAGE I-10: Referrals & Rewards (`/investor/referrals`)

```
PURPOSE:
  Referral program, daily streaks, rewards, bonus tracking.

5 SECTIONS:
  SECTION 1: REFERRAL PROGRAM
    - Referral code/link, sharing buttons, reward structure, stats

  SECTION 2: DAILY STREAKS
    - Current/best streak, weekly calendar, tier rewards

  SECTION 3: AVAILABLE REWARDS
    - Claimable rewards with [Claim] buttons

  SECTION 4: REFERRAL LEADERBOARD

  SECTION 5: REWARD HISTORY
```

---

### PAGE I-11: Earnings & Reports (`/investor/earnings`)

```
PURPOSE:
  Detailed earnings breakdown, tax reporting, export.

5 SECTIONS:
  SECTION 1: EARNINGS OVERVIEW
    - Total earned, this month, avg per pool, best/worst pool, avg ROI

  SECTION 2: EARNINGS BY POOL
    - Per-pool breakdown with period detail

  SECTION 3: EARNINGS TIMELINE
    - Chronological with running total, [Export CSV/PDF]

  SECTION 4: TAX REPORT INFORMATION
    - Gross earnings/losses, net profit, [Download PDF]

  SECTION 5: PROFIT SHARING BREAKDOWN
    - How earnings are calculated (formula explanation)
    - Gross → platform cut → net → your share
```

---

### PAGE I-12: Investor Settings (`/investor/settings`)

```
PURPOSE:
  Profile, security, notification preferences, payout preferences, KYC.

5 SECTIONS:
  SECTION 1: PROFILE (with role switch option)
  SECTION 2: SECURITY (password, 2FA, sessions)
  SECTION 3: NOTIFICATION PREFERENCES (email, push, Telegram)
  SECTION 4: PAYOUT PREFERENCES (default method, auto-payout, auto-reinvest)
  SECTION 5: KYC / VERIFICATION STATUS (level, limits, documents)
```

---

## 7. SHARED COMPONENTS

```
LAYOUT:
  ├── Sidebar          — navigation, Deriv status, user info
  ├── TopBar           — search, notifications, user menu
  ├── PageWrapper      — consistent padding, max-width
  └── MobileNav        — bottom navigation for mobile

DATA DISPLAY:
  ├── StatCard         — value + label + trend indicator
  ├── DataTable        — TanStack Table wrapper (sort/filter/page)
  ├── ChartWrapper     — Recharts/LightweightCharts wrapper
  ├── LivePrice       — real-time price with direction arrow
  ├── PnLBadge        — green/red P&L display
  ├── StatusIndicator — 🟢🟡🔴 status dot + text
  ├── CountdownTimer  — live countdown (days, hours, minutes, seconds)
  ├── ProgressFillBar — percentage fill with label
  └── TimeAgo         — relative time display

TRADE-SPECIFIC:
  ├── SymbolSelector   — market/symbol dropdown with search
  ├── ContractTypeSelect — contract type dropdown
  ├── StakeInput       — stake with quick buttons
  ├── DurationInput    — ticks/seconds/minutes input
  └── TradeResult      — win/loss display with animation

PACKAGE-SPECIFIC:
  ├── PackageCard      — package summary for lists
  ├── PackageStatusBadge — open/trading/completed
  ├── InvestmentCard   — investor's investment in a package
  └── EarningsDisplay  — live earnings with auto-refresh

INVESTOR-SPECIFIC:
  ├── InvestorCard     — user profile card with stats
  ├── KYCStatusBadge  — verification level indicator
  ├── DepositStatusBadge — pending/verified/failed
  └── PayoutStatusBadge — pending/processing/completed

MODALS:
  ├── ConfirmModal     — "Are you sure?" with custom message
  ├── TradeModal       — quick trade placement
  ├── PackageBookingModal — slot booking flow
  ├── PayoutModal      — payout request form
  └── NotificationPopup — toast/notification system

FEEDBACK:
  ├── Toast            — success/error/warning/info
  ├── LoadingSpinner   — loading indicator
  ├── SkeletonCard     — content placeholder while loading
  └── EmptyState       — "No data yet" with CTA
```

---

## 8. STATE MANAGEMENT

### 8.1 Zustand Stores (Client State)

```
useAuthStore:
  ├── user: User | null
  ├── isAuthenticated: boolean
  ├── role: "operator" | "investor" | "both"
  ├── login, logout, refreshToken, updateUser

useDerivStore:
  ├── connections: DerivConnection[]
  ├── activeConnectionId: string | null
  ├── websockets: Map<connectionId, WebSocket>
  ├── balance, isConnected
  ├── connect, disconnect, subscribe, unsubscribe, send

useMarketStore:
  ├── symbols: Symbol[]
  ├── favorites: string[]
  ├── tickSubscriptions: Map<symbol, tickData>
  ├── activeSymbols, toggleFavorite, getSymbol

useBotStore:
  ├── bots: Bot[]
  ├── activeBots: Bot[]
  ├── fetchBots, startBot, pauseBot, stopBot, deleteBot

useTradeStore:
  ├── openContracts: Contract[]
  ├── recentTrades: Trade[]
  ├── proposals: Map<key, Proposal>
  ├── buy, sell, subscribeOpenContracts

usePackageStore:
  ├── packages: Package[]
  ├── activePackages: Package[]
  ├── fetchPackages, createPackage, updatePackage
  ├── getPackageInvestors, getPackagePerformance

useInvestorStore:
  ├── investors: Investor[]
  ├── fetchInvestors, getInvestorDetail
  ├── approveKYC, rejectKYC

useScheduleStore:
  ├── schedules: ScheduledTrade[]
  ├── todaySchedule: ScheduledTrade[]
  ├── fetchSchedules, createSchedule, updateSchedule, deleteSchedule

useFundsStore:
  ├── totalCapital, deployedCapital, availableCapital
  ├── deposits: Deposit[]
  ├── payouts: PayoutRequest[]
  ├── fetchDeposits, verifyDeposit, rejectDeposit
  ├── fetchPayouts, approvePayout, rejectPayout

useUIStore:
  ├── sidebarOpen, theme, notifications, activeModal
```

### 8.2 React Query Keys

```
QUERY KEYS:
  ["user"]                    → current user
  ["packages"]                → all packages
  ["packages", id]            → single package
  ["packages", id, "investors"] → package investors
  ["packages", id, "performance"] → package analytics
  ["investors"]               → all investors
  ["investors", id]           → single investor
  ["schedules"]               → trade schedules
  ["trades"]                  → trade log
  ["trades", "summary"]       → trade summary
  ["deposits"]                → deposit records
  ["payouts"]                 → payout requests
  ["funds", "overview"]       → funds overview
  ["analytics", period]       → analytics data
  ["logs", type]              → audit logs

MUTATIONS:
  useCreatePackage()          → POST /api/packages
  useUpdatePackage()          → PATCH /api/packages/:id
  useCreateSchedule()         → POST /api/schedules
  usePlaceTrade()             → Deriv buy via WebSocket
  useVerifyDeposit()          → POST /api/deposits/:id/verify
  useApprovePayout()          → POST /api/payouts/:id/approve
  useDistributeProfits()      → POST /api/packages/:id/distribute
```

---

## 9. DATABASE SCHEMA

### 9.1 Core Tables (Prisma)

```prisma
model User {
  id              String    @id @default(cuid())
  email           String    @unique
  emailVerified   Boolean   @default(false)
  passwordHash    String
  fullName        String
  username        String    @unique
  avatar          String?
  timezone        String    @default("UTC")
  role            String    @default("operator") // operator, investor, both
  
  // Security
  twoFactorEnabled Boolean  @default(false)
  twoFactorSecret  String?
  backupCodes      String?
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  lastLoginAt     DateTime?
  
  // Relations
  derivConnections  DerivConnection[]
  investments       Investment[]
  wallet            Wallet?
  kyc               KYCVerification?
  referralCode      String    @unique @default(cuid())
  referrals         Referral[]  @relation("Referrer")
  referredBy        Referral?   @relation("Referred")
  dailyStreak       DailyStreak?
  rewards           Reward[]
  paymentMethods    PaymentMethod[]
}

model DerivConnection {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  derivLoginId    String
  derivAppId      String
  encryptedToken  String
  currency        String
  balance         Float     @default(0)
  status          String    @default("active")
  permissions     String    @default("[]")
  lastActivityAt  DateTime?
  connectedAt     DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  bots            Bot[]
  @@unique([userId, derivLoginId])
}

// ──── PACKAGES ────

model Package {
  id                String    @id @default(cuid())
  code              String    @unique  // "PKG-01", "PKG-02"
  name              String    // "Basic Growth"
  description       String?
  status            String    @default("draft")
  // draft → open → closed → trading → profit_sharing → completed
  
  // Investment Terms
  slotPrice         Float     @default(3000)
  maxSlotsPerUser   Int       @default(20)
  targetCapital     Float
  maxCapital        Float?    // oversubscribe limit
  
  // Timeline
  bookingOpensAt    DateTime
  bookingClosesAt   DateTime
  tradingStartsAt   DateTime
  tradingEndsAt     DateTime
  profitShareDate   DateTime
  
  // Expected Returns
  conservativeROI  Float     @default(8)
  expectedROI      Float     @default(15)
  optimisticROI    Float     @default(25)
  
  // Profit Split
  operatorSharePercent Float  @default(20)
  investorSharePercent Float @default(80)
  
  // Trading Config
  markets           String    @default("[]")  // JSON: ["R_10", "R_75"]
  strategies        String    @default("[]")  // JSON: ["martingale", "even_odd"]
  aiGuardianEnabled Boolean   @default(true)
  aiGuardianConfig  String    @default("{}")
  maxDrawdown       Float     @default(5)
  
  // Token Allocation
  tokensPerSlot     Float     @default(30000)
  tokenName         String    @default("bmX")
  
  // Terms
  termsUrl          String?
  autoReinvestOption Boolean  @default(false)
  earlyExitPenalty  Float     @default(0)
  
  // Stats (updated in real-time)
  filledSlots       Int       @default(0)
  totalCapital      Float     @default(0)
  totalTrades       Int       @default(0)
  totalWins         Int       @default(0)
  totalLosses       Int       @default(0)
  currentPnL        Float     @default(0)
  maxDrawdownHit    Float     @default(0)
  peakCapital       Float     @default(0)
  aiGuardianTriggers Int      @default(0)
  distributedPnL    Float     @default(0)
  
  // Schedule assignments
  scheduleIds       String    @default("[]")  // JSON: schedule IDs
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  // Relations
  investments       Investment[]
  packageTrades     PackageTrade[]
  earningsLogs      PackageEarningsLog[]
  aiGuardianLogs    AIGuardianLog[]
}

// ──── INVESTMENTS ────

model Investment {
  id                String    @id @default(cuid())
  packageId         String
  package           Package   @relation(fields: [packageId], references: [id])
  userId            String
  user              User      @relation(fields: [userId], references: [id])
  
  slots             Int
  amount            Float
  tokenAllocation   Float
  sharePercent      Float
  
  paymentMethod     String
  paymentDetails    String?
  paymentStatus     String    @default("pending")
  // pending → submitted → received → verified → failed → refunded
  paymentReference  String?
  paidAt            DateTime?
  verifiedAt        DateTime?
  
  status            String    @default("booked")
  // booked → confirmed → active → completed → cancelled
  
  grossEarnings     Float     @default(0)
  netEarnings       Float     @default(0)
  currentPnL        Float     @default(0)
  currentROI        Float     @default(0)
  
  payoutStatus      String    @default("pending")
  payoutAmount      Float?
  payoutMethod      String?
  payoutRequestedAt DateTime?
  payoutCompletedAt DateTime?
  
  autoReinvest      Boolean   @default(false)
  reinvestPercent   Float     @default(0)
  
  bookedAt          DateTime  @default(now())
  confirmedAt       DateTime?
  completedAt       DateTime?
  cancelledAt       DateTime?
  cancelReason      String?
  
  @@unique([packageId, userId])
}

// ──── TRADES ────

model PackageTrade {
  id              String    @id @default(cuid())
  packageId       String
  package         Package   @relation(fields: [packageId], references: [id])
  derivContractId String?
  symbol          String
  contractType    String
  stake           Float
  duration        Int
  durationUnit    String
  entrySpot       Float?
  exitSpot        Float?
  buyPrice        Float?
  sellPrice       Float?
  payout          Float?
  profit          Float?
  isWin           Boolean?
  isSold          Boolean   @default(false)
  botId           String?
  botName         String?
  scheduleId      String?
  boughtAt        DateTime?
  soldAt          DateTime?
  createdAt       DateTime  @default(now())
  @@index([packageId, createdAt])
}

// ──── SCHEDULES ────

model TradeSchedule {
  id              String    @id @default(cuid())
  name            String
  date            DateTime
  startTime       String    // "09:00"
  endTime         String    // "12:00"
  symbol          String
  strategy        String
  initialStake    Float
  maxTrades       Int
  packageIds      String    @default("[]")  // JSON
  packageAllocation String  @default("{}")  // JSON: { pkgId: percent }
  recurrence      String    @default("one_time") // one_time, daily, weekdays, cron
  cronExpression  String?
  stopLoss        Float?
  takeProfit      Float?
  maxDrawdown     Float?
  cooldownAfter   Int       @default(3)
  cooldownDuration Int      @default(300)
  status          String    @default("active") // active, paused, completed, cancelled
  lastRunAt       DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

// ──── BOTS ────

model Bot {
  id              String    @id @default(cuid())
  connectionId    String
  connection      DerivConnection @relation(fields: [connectionId], references: [id])
  name            String
  symbol          String
  strategyType    String
  scriptId        String?
  status          String    @default("draft")
  contractType    String    @default("CALL")
  initialStake    Float     @default(0.35)
  currentStake    Float     @default(0.35)
  maxStake        Float     @default(100)
  duration        Int       @default(5)
  durationUnit    String    @default("t")
  strategyParams  String    @default("{}")
  takeProfit      Float?
  stopLoss        Float?
  maxDailyLoss    Float     @default(100)
  maxDailyTrades  Int       @default(500)
  cooldownLosses  Int       @default(3)
  cooldownDuration Int      @default(300)
  maxConcurrent   Int       @default(1)
  packageIds      String    @default("[]")
  packageAllocation String  @default("{}")
  totalTrades     Int       @default(0)
  totalWins       Int       @default(0)
  totalLosses     Int       @default(0)
  totalPnL        Float     @default(0)
  startedAt       DateTime?
  runtimeSeconds  Int       @default(0)
  jobId           String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

// ──── SCRIPTS ────

model Script {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  name            String
  code            String
  description     String?
  isTemplate      Boolean   @default(false)
  totalRuns       Int       @default(0)
  winRate         Float     @default(0)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  bots            Bot[]
}

// ──── EARNINGS LOGS ────

model PackageEarningsLog {
  id                  String    @id @default(cuid())
  packageId           String
  package             Package   @relation(fields: [packageId], references: [id])
  totalCapital        Float
  currentPnL          Float
  poolROI             Float
  investmentSnapshots String    // JSON
  timestamp           DateTime  @default(now())
  @@index([packageId, timestamp])
}

model AIGuardianLog {
  id              String    @id @default(cuid())
  packageId       String
  package         Package   @relation(fields: [packageId], references: [id])
  triggerType     String
  triggerDetails  String
  action          String
  botsAffected    String    @default("[]")
  resumedAt       DateTime?
  timestamp       DateTime  @default(now())
}

// ──── WALLET ────

model Wallet {
  id              String    @id @default(cuid())
  userId          String    @unique
  user            User      @relation(fields: [userId], references: [id])
  balance         Float     @default(0)
  lockedBalance   Float     @default(0)
  totalDeposited  Float     @default(0)
  totalWithdrawn  Float     @default(0)
  totalEarned     Float     @default(0)
  updatedAt       DateTime  @updatedAt
}

model WalletTransaction {
  id              String    @id @default(cuid())
  walletId        String
  wallet          Wallet    @relation(fields: [walletId], references: [id])
  userId          String
  type            String    // deposit, payout, earning, fee, refund, referral_bonus
  amount          Float
  balance         Float
  method          String
  methodDetails   String?
  reference       String?
  poolId          String?
  investmentId    String?
  status          String    @default("pending")
  description     String?
  createdAt       DateTime  @default(now())
  completedAt     DateTime?
  @@index([walletId, createdAt])
}

model PaymentMethod {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  type            String    // bank_account, mobile_money, card, crypto_wallet
  label           String
  isDefault       Boolean   @default(false)
  encryptedData   String
  isVerified      Boolean   @default(false)
  verifiedAt      DateTime?
  createdAt       DateTime  @default(now())
}

// ──── KYC ────

model KYCVerification {
  id                      String    @id @default(cuid())
  userId                  String    @unique
  user                    User      @relation(fields: [userId], references: [id])
  level                   Int       @default(1)
  emailVerified           Boolean   @default(false)
  phoneVerified           Boolean   @default(false)
  idDocType               String?
  idDocFrontUrl           String?
  idDocBackUrl            String?
  selfieUrl               String?
  proofOfAddressUrl       String?
  idVerifiedAt            DateTime?
  sourceOfFundsDeclaration String?
  enhancedDueDiligence    String?
  level3VerifiedAt        DateTime?
  reviewStatus            String    @default("pending")
  reviewerNotes           String?
  reviewedAt              DateTime?
  depositLimitPerTx       Float     @default(1000)
  depositLimitDaily       Float     @default(5000)
  depositLimitMonthly     Float     @default(50000)
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
}

// ──── REFERRALS & REWARDS ────

model Referral {
  id              String    @id @default(cuid())
  referrerId      String
  referrer        User      @relation("Referrer", fields: [referrerId], references: [id])
  referredId      String
  referred        User      @relation("Referred", fields: [referredId], references: [id])
  referralCode    String
  rewardAmount    Float?
  rewardStatus    String    @default("pending")
  createdAt       DateTime  @default(now())
  @@unique([referredId])
}

model DailyStreak {
  id              String    @id @default(cuid())
  userId          String    @unique
  user            User      @relation(fields: [userId], references: [id])
  currentStreak   Int       @default(0)
  bestStreak      Int       @default(0)
  lastClaimDate   DateTime?
  claimedDays     String    @default("[]")
}

model Reward {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  type            String    // referral, streak, early_bird, bonus
  amount          Float
  description     String
  status          String    @default("available")
  claimedAt       DateTime?
  creditedAt      DateTime?
  expiresAt       DateTime?
  relatedId       String?
  createdAt       DateTime  @default(now())
}

// ──── AUTOMATION ────

model AutomationRule {
  id              String    @id @default(cuid())
  userId          String
  name            String
  description     String?
  isEnabled       Boolean   @default(true)
  conditions      String    // JSON
  actions         String    // JSON
  schedule        String?
  lastTriggeredAt DateTime?
  triggerCount    Int       @default(0)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

// ──── AUDIT LOGS ────

model AuditLog {
  id              String    @id @default(cuid())
  userId          String?
  category        String    // trade, deposit, payout, system, auth, comm
  action          String
  details         String?
  ipAddress       String?
  userAgent       String?
  metadata        String?   // JSON
  createdAt       DateTime  @default(now())
  @@index([category, createdAt])
  @@index([userId, createdAt])
}
```

---

## 10. AUTOMATION & BOT ENGINE

### 10.1 Bot Execution Engine

```
BOT LIFECYCLE:
  1. START:
     - Validate bot config
     - Check Deriv connection
     - Create BullMQ job
     - Worker picks up job → Initialize VM → Subscribe to ticks
     - Update bot status → "running"

  2. TICK:
     - Receive tick from Deriv WebSocket
     - Execute script.onTick(tick) in sandboxed VM
     - If trade decision returned: check risk limits → place trade
     - Update stats

  3. TRADE RESULT:
     - Receive contract settlement from Deriv
     - Call script.onResult(result)
     - Update stats, check TP/SL
     - Log trade, emit real-time event

  4. PAUSE: Stop processing ticks, let current trade complete
  5. STOP: Unsubscribe, terminate VM, remove job
  6. ERROR: Log, auto-pause or stop, notify operator

RISK CHECKS (before every trade):
  1. Balance >= stake
  2. Stake <= maxStake
  3. Daily loss < maxDailyLoss
  4. Daily trades < maxDailyTrades
  5. Cooldown check
  6. Take profit / Stop loss check
  7. Concurrent trades check
  8. Market open check
```

### 10.2 AI Guardian

```
SETTINGS:
  - Max consecutive losses (odd/even): 8
  - Max consecutive losses (digits): 10
  - Max bulk runs: 1-2
  - Random market rotation: ON
  - Per-package drawdown limit: 5%

ON TRIGGER:
  1. Halt all active bot processes for affected package
  2. Send notification to operator (Telegram + in-app)
  3. Log trigger with details
  4. Wait cooldown period
  5. Resume bots (or wait for manual resume)
```

---

## 11. SCRIPT ENGINE

### 11.1 Sandbox API

```
AVAILABLE IN SANDBOX:
  onTick(tick): TradeDecision | null
  onResult(result): void
  onComplete(summary): void

CONTEXT:
  getLastResult(), getHistory(limit), getBalance()
  getOpenContracts(), log(message)

TECHNICAL INDICATORS:
  getTicks(limit), getSMA(period), getEMA(period)
  getRSI(period), getMACD(fast, slow, signal)
  getBollingerBands(period, stdDev), getStochastic(k, d)

TRADE DECISION:
  { contract, stake, duration, durationUnit, barrier?, basis? }

SECURITY:
  - VM2 sandbox, no filesystem/network/process access
  - Memory: 128MB, Timeout: 100ms per tick
  - Max 1 trade per tick
```

### 11.2 Preset Strategies

```
1. Martingale    — double stake on loss, reset on win
2. Oscar's Grind — increase only after win recovers loss
3. DCA/Average   — same stake, lower average entry
4. Fixed Stake   — consistent stake every trade
5. Anti-Marting  — increase on win, decrease on loss
6. Fibonacci     — stake follows Fibonacci on losses
```

---

## 12. CROWDFUNDING POOL DATA MODEL

```
POOL LIFECYCLE (per package):
  SCHEDULED → OPEN → CLOSED → TRADING → PROFIT_SHARING → COMPLETED

  SCHEDULED:  Package announced, dates set
  OPEN:       Accepting slot bookings and payments
  CLOSED:     No more bookings, preparing for trading
  TRADING:    Bots actively trading pooled capital
  PROFIT_SHARING: Calculating & distributing profits
  COMPLETED:  All payouts processed, package closed

COUNTDOWN TIMERS:
  - If OPEN:    countdown to close date
  - If TRADING:  countdown to trading end date
  - If PROFIT_SHARING: countdown to payout date

PROFIT CALCULATION:
  For each investor in a package:
    investorShare = investment.amount / package.totalCapital
    grossEarnings = package.currentPnL × investorShare
    platformCut = grossEarnings × (operatorSharePercent / 100)
    netEarnings = grossEarnings - platformCut
    currentROI = (netEarnings / investment.amount) × 100

  Auto-calculation every 3 minutes (or manual refresh)
```

---

## 13. LIVE TRADE TRACKER ENGINE

```
DATA FLOW:
  Deriv WebSocket → Trade Event → Process & Aggregate
  → Redis Pub/Sub → Socket.IO Broadcast → All investors in pool

INVESTOR SOCKET EVENTS:
  "investor:earnings_update"  → { packageId, pnl, roi, lastUpdated }
  "investor:pool_status"      → { packageId, status, timeLeft }
  "investor:trade_result"     → { packageId, trade, yourShareImpact }
  "investor:payout_status"    → { payoutId, status, amount }
  "investor:ai_guardian"      → { packageId, triggerType, action }

OPERATOR SOCKET EVENTS:
  "operator:trade_result"     → { trade, packageId }
  "operator:balance_update"   → { balance }
  "operator:bot_status"       → { botId, status }
  "operator:ai_guardian"      → { packageId, triggerType }
  "operator:deposit"          → { deposit }
  "operator:payout_request"   → { payout }

THROTTLING:
  - Trade results: batch per 10 seconds for investors
  - Running totals: update every 5 seconds
  - Earnings: every 3 minutes (or manual refresh)
  - AI Guardian: immediate
  - Pool status changes: immediate
```

---

## 14. WALLET & FINANCE ENGINE

```
DEPOSIT FLOW:
  1. Investor selects amount + payment method
  2. Create WalletTransaction (pending)
  3. Generate payment reference
  4. Show instructions
  5. Investor completes payment
  6. Webhook/manual verification
  7. Transaction → verified → completed
  8. Credit wallet, confirm investment

PAYOUT FLOW:
  1. Investor requests payout
  2. Check wallet balance >= amount
  3. Create WalletTransaction (payout)
  4. Lock amount from wallet
  5. Process via payment provider
  6. Transaction → completed
  7. Deduct from locked balance
  8. Notify investor

EARNING CREDITING (after profit sharing):
  1. Package status → profit_sharing
  2. Calculate final P&L per investment
  3. Credit wallet.balance for each investor
  4. Notify all investors
  5. Package → completed

PAYMENT METHODS:
  Bank Transfer: ACH, SEPA, SWIFT, Wire (1-3 days, $0 fee)
  Mobile Money: MTN, Vodafone, M-Pesa, Airtel (instant-30min, 1.5% fee)
  Card: Visa, Mastercard via Stripe (instant, 2.9%+$0.30)
  Crypto: BTC, ETH, USDT, USDC (15-60min, network fee only)
```

---

## 15. PROFIT CALCULATION ENGINE

```
REAL-TIME (every 3 minutes):
  For each package:
    1. Read package.currentPnL from bot engine
    2. For each investment in package:
       a. investorShare = investment.amount / package.totalCapital
       b. grossEarnings = package.currentPnL × investorShare
       c. platformCut = grossEarnings × (package.operatorSharePercent / 100)
       d. netEarnings = grossEarnings - platformCut
       e. currentROI = (netEarnings / investment.amount) × 100
       f. Update investment.currentPnL and investment.currentROI
    3. Create PackageEarningsLog snapshot
    4. Broadcast to all investors via Socket.IO

PER-PACKAGE P&L SPLIT:
  Package P&L is split proportional to capital allocation:
  PKG-01 (40% capital): gets 40% of total P&L
  PKG-02 (35% capital): gets 35% of total P&L
  PKG-03 (25% capital): gets 25% of total P&L

DISPLAY:
  - Investor sees NET earnings (after platform cut) by default
  - "View breakdown" link shows gross → platform cut → net
  - Operator sees both operator share AND investor distributions
```

---

## 16. DEPLOYMENT & ENVIRONMENT

### 16.1 Environment Variables

```
NODE_ENV=production
APP_URL=https://app.derivx.com
APP_PORT=3000

DATABASE_URL=postgresql://user:pass@host:5432/derivx
REDIS_URL=redis://host:6379

NEXTAUTH_SECRET=<random-32-chars>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

DERIV_APP_ID=<registered-app-id>
DERIV_OAUTH_URL=https://oauth.deriv.com
DERIV_WS_URL=wss://ws.derivws.com/websockets/v3
DERIV_CALLBACK_URL=https://app.derivx.com/api/auth/deriv/callback

TOKEN_ENCRYPTION_KEY=<aes-256-gcm-key>

SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
EMAIL_FROM=noreply@derivx.com

VAPID_PUBLIC_KEY=<key>
VAPID_PRIVATE_KEY=<key>

RATE_LIMIT_API_WINDOW=60000
RATE_LIMIT_API_MAX=100

BOT_MAX_CONCURRENT=10
BOT_VM_MEMORY_LIMIT_MB=128
BOT_VM_TIMEOUT_MS=100

EARNINGS_CALC_INTERVAL_MS=180000
DEFAULT_OPERATOR_SHARE_PERCENT=20
DEFAULT_INVESTOR_SHARE_PERCENT=80

SENTRY_DSN=<sentry-dsn>
```

### 16.2 API Route Map

```
AUTH:
  POST   /api/auth/register
  POST   /api/auth/login
  POST   /api/auth/logout
  POST   /api/auth/refresh
  POST   /api/auth/forgot-password
  POST   /api/auth/reset-password
  GET    /api/auth/verify-email
  POST   /api/auth/deriv/connect

DERIV:
  GET    /api/connections
  POST   /api/connections
  DELETE /api/connections/:id
  POST   /api/connections/:id/test

PACKAGES:
  GET    /api/packages
  POST   /api/packages
  GET    /api/packages/:id
  PATCH  /api/packages/:id
  DELETE /api/packages/:id
  GET    /api/packages/:id/investors
  GET    /api/packages/:id/performance
  POST   /api/packages/:id/distribute

INVESTMENTS:
  GET    /api/investments
  POST   /api/investments (book slot)
  GET    /api/investments/:id
  PATCH  /api/investments/:id
  DELETE /api/investments/:id (cancel)

INVESTORS:
  GET    /api/investors
  GET    /api/investors/:id
  PATCH  /api/investors/:id
  POST   /api/investors/:id/kyc-approve
  POST   /api/investors/:id/kyc-reject

SCHEDULES:
  GET    /api/schedules
  POST   /api/schedules
  PATCH  /api/schedules/:id
  DELETE /api/schedules/:id

TRADES:
  POST   /api/trades/buy
  POST   /api/trades/sell
  GET    /api/trades/history
  GET    /api/trades/summary

BOTS:
  GET    /api/bots
  POST   /api/bots
  GET    /api/bots/:id
  PATCH  /api/bots/:id
  POST   /api/bots/:id/start
  POST   /api/bots/:id/pause
  POST   /api/bots/:id/stop

SCRIPTS:
  GET    /api/scripts
  POST   /api/scripts
  GET    /api/scripts/:id
  PATCH  /api/scripts/:id
  DELETE /api/scripts/:id
  POST   /api/scripts/:id/validate

MARKETS:
  GET    /api/markets/active
  GET    /api/markets/schedule
  GET    /api/markets/ticks/:symbol

WALLET:
  GET    /api/wallet
  POST   /api/wallet/deposit
  POST   /api/wallet/payout
  GET    /api/wallet/transactions
  GET    /api/wallet/payment-methods
  POST   /api/wallet/payment-methods
  DELETE /api/wallet/payment-methods/:id

DEPOSITS:
  GET    /api/deposits
  POST   /api/deposits/:id/verify
  POST   /api/deposits/:id/reject

PAYOUTS:
  GET    /api/payouts
  POST   /api/payouts/:id/approve
  POST   /api/payouts/:id/reject
  POST   /api/payouts/:id/complete
  POST   /api/payouts/batch-process

ANALYTICS:
  GET    /api/analytics/overview
  GET    /api/analytics/by-package
  GET    /api/analytics/by-investor
  GET    /api/analytics/by-market

COMMUNICATIONS:
  GET    /api/comms/messages
  POST   /api/comms/messages
  GET    /api/comms/announcements
  POST   /api/comms/announcements
  GET    /api/comms/templates
  PATCH  /api/comms/templates/:id

LOGS:
  GET    /api/logs
  GET    /api/logs/audit
  POST   /api/logs/export

AUTOMATION:
  GET    /api/automation/rules
  POST   /api/automation/rules
  PATCH  /api/automation/rules/:id
  DELETE /api/automation/rules/:id

USER:
  GET    /api/user/profile
  PATCH  /api/user/profile
  PATCH  /api/user/password
  POST   /api/user/2fa/enable
  DELETE /api/user/2fa
  GET    /api/user/settings
  PATCH  /api/user/settings
```

---

## 17. COMPLETE PAGE INDEX

```
HOME PAGES (3):
  H-1  /                              Landing
  H-2  /features                      Features
  H-3  /pricing                       Pricing

AUTH PAGES (8):
  A-1  /auth/signup                   Sign Up (role: operator/investor)
  A-2  /auth/signin                   Sign In (role routing)
  A-3  /auth/onboarding/investor      Investor Onboarding (4 steps)
  A-4  /auth/forgot-password          Forgot Password
  A-5  /auth/reset-password           Reset Password
  A-6  /auth/verify-email             Email Verification
  A-7  /auth/2fa                      Two-Factor Auth
  A-8  /auth/deriv/callback           Deriv OAuth Callback

OPERATOR DASHBOARD (15):
  D-1   /dashboard                    Command Center
  D-2   /dashboard/schedules          Trade Scheduler
  D-3   /dashboard/live               Live Trading
  D-4   /dashboard/trades             Trade Log & Records
  D-5   /dashboard/packages           Package Manager
  D-6   /dashboard/investors          Investors Management
  D-7   /dashboard/analytics          Analytics
  D-8   /dashboard/funds              Funds & Capital
  D-9   /dashboard/withdrawals        Withdrawal Requests
  D-10  /dashboard/comms              Communications
  D-11  /dashboard/deposits           Deposit Logs
  D-12  /dashboard/logs               Activity & Audit Logs
  D-13  /dashboard/markets            Markets & Symbols
  D-14  /dashboard/bots               Bot & Automation Config
  D-15  /dashboard/settings           Settings

INVESTOR DASHBOARD (12):
  I-1   /investor                     Overview
  I-2   /investor/pools               Pools Browser
  I-3   /investor/pools/:id           Pool Detail
  I-4   /investor/pools/:id/book      Book Slots & Payment
  I-5   /investor/live                Live Trade Tracker
  I-6   /investor/investments         My Investments
  I-7   /investor/wallet              Wallet & Finances
  I-8   /investor/calculator          Investment Calculator
  I-9   /investor/notifications       Notifications & Activity
  I-10  /investor/referrals           Referrals & Rewards
  I-11  /investor/earnings            Earnings & Reports
  I-12  /investor/settings            Settings

TOTAL: 38 PAGES
```

---

## 18. IMPLEMENTATION PHASES

```
PHASE 1 — MVP (Weeks 1-4):
  ✓ Landing page (H-1)
  ✓ Auth with role selection (A-1, A-2, A-8)
  ✓ Investor onboarding (A-3)
  ✓ Command center (D-1) — basic KPIs
  ✓ Package manager (D-5) — create/list packages
  ✓ Markets browser (D-13)
  ✓ Deriv WebSocket connection
  ✓ Basic buy/sell

PHASE 2 — Scheduling & Trading (Weeks 5-8):
  ✓ Trade scheduler (D-2)
  ✓ Live trading (D-3)
  ✓ Bot config (D-14)
  ✓ Bot execution engine (BullMQ + VM2)
  ✓ Preset strategies
  ✓ AI Guardian
  ✓ Trade log (D-4)

PHASE 3 — Investors & Packages (Weeks 9-12):
  ✓ Investor overview (I-1)
  ✓ Pool browser (I-2)
  ✓ Pool detail (I-3)
  ✓ Slot booking (I-4)
  ✓ Investors management (D-6)
  ✓ Live trade tracker (I-5)
  ✓ My investments (I-6)

PHASE 4 — Funds & Payouts (Weeks 13-15):
  ✓ Wallet & finances (I-7)
  ✓ Funds & capital (D-8)
  ✓ Deposit logs (D-11)
  ✓ Withdrawal requests (D-9)
  ✓ Payment method integration
  ✓ KYC flow
  ✓ Earnings auto-calculation engine

PHASE 5 — Analytics & Comms (Weeks 16-18):
  ✓ Analytics (D-7)
  ✓ Investor earnings (I-11)
  ✓ Investment calculator (I-8)
  ✓ Communications (D-10)
  ✓ Notifications (I-9)
  ✓ Referrals (I-10)

PHASE 6 — Polish & Scale (Weeks 19+):
  ✓ Activity & audit logs (D-12)
  ✓ All settings pages (D-15, I-12)
  ✓ Email templates & automation
  ✓ Telegram bot integration
  ✓ Push notifications
  ✓ Tax reports
  ✓ Mobile responsive
  ✓ Multi-currency support
  ✓ Load testing
  ✓ Public API
```

---

*End of document.*
```