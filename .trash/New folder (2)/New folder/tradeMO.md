# DerivX — Advanced Application Outline

## Trading Platform Connected to Deriv API Endpoints

> A third-party trading platform with Deriv OAuth, bot automation, scriptable strategies, social monitoring, and full market access — modeled after app.bmxbot.com integration patterns.

---

## TABLE OF CONTENTS

```
1.  PROJECT OVERVIEW & ARCHITECTURE
2.  DERIV API INTEGRATION MAP
3.  HOME PAGES (3)
4.  AUTH PAGES (7)
5.  DASHBOARD PAGES (14 — each page has 8 sections: 3 base + 5 advanced)
6.  SHARED COMPONENTS
7.  STATE MANAGEMENT
8.  DATABASE SCHEMA
9.  AUTOMATION & BOT ENGINE
10. SCRIPT ENGINE
11. SOCIAL / USER MONITORING
12. DEPLOYMENT & ENVIRONMENT

COMPANION FILE: investorMO.md
  - Investor / Crowdfunding Admin Module (12 pages)
  - Covers: pool trade plans, schedules, funds / paid-in finances,
    investors, payouts, analytics, documents, communications, settings
  - Admin-side first (mock data, no backend integration required)
  - See "INVESTOR MODULE PAGES" in COMPLETE PAGE INDEX below
```

---

## 1. PROJECT OVERVIEW & ARCHITECTURE

### 1.1 Tech Stack

```
FRONTEND:
  Framework:       Next.js 14 (App Router)
  UI Library:      Tailwind CSS + shadcn/ui
  State:           Zustand (client) + React Query (server)
  Charts:          Lightweight Charts (TradingView) + Recharts
  Realtime:        WebSocket (Deriv API) + Socket.IO (internal)
  Forms:           React Hook Form + Zod
  Code Editor:     Monaco Editor (script editing)
  Animation:       Framer Motion

BACKEND:
  Runtime:         Node.js + Express (or Next.js API routes)
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
│  │ Home │  │ Auth │  │Dash  │  │ Bots │  │ Scripts  │  │
│  └──────┘  └──────┘  └──────┘  └──────┘  └──────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS / WSS
┌──────────────────────▼──────────────────────────────────┐
│                  API GATEWAY (Express)                   │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────────┐ │
│  │ Auth Routes│  │ Trade Routes│  │ Bot Job Routes   │ │
│  └────────────┘  └─────────────┘  └──────────────────┘ │
└────┬───────────────┬────────────────┬──────────────────┘
     │               │                │
┌────▼────┐  ┌───────▼───────┐  ┌────▼─────────────────┐
│PostgreSQL│  │Deriv WebSocket│  │  BullMQ + Bot Engine │
│(Users,  │  │API (trades,   │  │  (strategy runner,   │
│ Bots,   │  │ ticks, auth)  │  │   trade executor)    │
│ Scripts)│  │               │  │                      │
└─────────┘  └───────┬───────┘  └──────────┬───────────┘
                     │                      │
              ┌──────▼──────────────────────▼──┐
              │     DERIV API (api.deriv.com)   │
              │  WebSocket: wss://ws.derivws... │
              │  OAuth: https://oauth.deriv.com │
              └─────────────────────────────────┘
```

### 1.3 Deriv API Connection Pattern (BMX-Style)

```
BMX BOT FLOW (app.bmxbot.com):
1. User clicks "Connect to Deriv"
2. Redirected to Deriv OAuth authorization page
3. User logs into Deriv and authorizes the app
4. Deriv redirects back with authorization code
5. Backend exchanges code for access token
6. Token stored securely (encrypted in DB)
7. WebSocket connection opened to Deriv API using token
8. All subsequent API calls use this authenticated WebSocket

OUR IMPLEMENTATION:
- Deriv App ID: registered at api.deriv.com
- OAuth Scope: read, trade, payments, admin
- WebSocket endpoint: wss://ws.derivws.com/websockets/v3?app_id={APP_ID}
- Authorization: authorize token via WebSocket after OAuth
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
  self_exclusion       → Self-exclusion limits
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
  First impression. Convince traders to sign up and connect
  their Deriv account. Show platform value proposition.

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  NAVBAR                                                  │
│  [Logo: DerivX]  [Features] [Pricing] [Community] [Login]│
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  HERO SECTION                                            │
│                                                          │
│  "Trade Smarter on Deriv"                               │
│  "Automate strategies. Build bots. Monitor the crowd."   │
│                                                          │
│  [Connect to Deriv →]  [Watch Demo ▶]                   │
│                                                          │
│  Live Ticker Strip: EUR/USD 1.0842 ▲ | BTC/USD 67,432 ▼│
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  TRUST BAR                                               │
│  "Powered by Deriv API" | "256-bit Encryption"          │
│  | "10,000+ traders" | "24/7 Automation"                │
└─────────────────────────────────────────────────────────┘
┌──────────────────────┬──────────────────────────────────┐
│  FEATURE CARDS (3)    │                                  │
│                       │                                  │
│  ┌─────────────────┐  │  ┌─────────────────┐            │
│  │ 🤖 Bot Builder  │  │  │ 📜 Script Engine │            │
│  │ Set up automated │  │  │ Write custom     │            │
│  │ trading bots     │  │  │ JS strategies    │            │
│  └─────────────────┘  │  └─────────────────┘            │
│                       │                                  │
│  ┌─────────────────┐  │                                  │
│  │ 👥 Social Trade │  │                                  │
│  │ Monitor & follow │  │                                  │
│  │ other traders    │  │                                  │
│  └─────────────────┘  │                                  │
└──────────────────────┴──────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  LIVE PREVIEW SECTION                                    │
│  "See it in action"                                     │
│  [Embedded demo dashboard screenshot/animation]          │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  HOW IT WORKS (4 Steps)                                 │
│                                                          │
│  1. Connect Deriv  →  2. Choose Strategy  →             │
│  3. Configure Bot  →  4. Let It Trade                   │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  SOCIAL PROOF                                            │
│  "Trusted by X traders" | Testimonial cards             │
│  | Leaderboard preview (top 5 traders)                  │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  CTA SECTION                                             │
│  "Ready to automate your trading?"                      │
│  [Get Started Free →]                                   │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  FOOTER                                                  │
│  Links | Socials | Legal | "Not affiliated with Deriv"  │
└─────────────────────────────────────────────────────────┘
```

#### Components Breakdown

```
HeroSection/
  ├── headline: string
  ├── subheadline: string
  ├── ctaButton: Button (→ /auth/signup)
  ├── demoButton: Button (→ opens modal)
  └── liveTicker: TickerStrip
        ├── data: Deriv tick WebSocket (unauth, public)
        ├── symbols: string[] (top 6 pairs)
        └── animation: scroll left

FeatureCards/
  ├── cards: FeatureCard[]
  │     ├── icon: LucideIcon
  │     ├── title: string
  │     ├── description: string
  │     └── link: string
  └── animation: stagger-in on scroll

HowItWorks/
  ├── steps: Step[]
  │     ├── number: number
  │     ├── title: string
  │     ├── description: string
  │     └── icon: LucideIcon
  └── connector: animated line between steps

LivePreview/
  ├── type: video | iframe | animation
  └── source: dashboard demo recording

SocialProof/
  ├── testimonials: Testimonial[]
  ├── leaderboard: LeaderboardEntry[] (from API)
  └── totalUsers: number

CTASection/
  ├── headline: string
  └── button: Button (→ /auth/signup)
```

---

### PAGE H-2: Features Page (`/features`)

```
PURPOSE:
  Deep dive into every feature. Technical enough for 
  experienced traders, accessible for beginners.

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  NAVBAR (same)                                           │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  PAGE HERO                                               │
│  "Everything You Need to Trade on Autopilot"            │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  FEATURE SECTION 1: Bot Engine                           │
│  ┌────────────────────┬──────────────────────────────┐  │
│  │  Description       │  Screenshot / Animation       │  │
│  │  • Pre-built bots  │  [Bot config UI demo]        │  │
│  │  • Custom params   │                              │  │
│  │  • Multi-market    │                              │  │
│  │  • Backtesting     │                              │  │
│  └────────────────────┴──────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  FEATURE SECTION 2: Script Engine                        │
│  ┌────────────────────┬──────────────────────────────┐  │
│  │  Screenshot        │  Description                  │  │
│  │  [Monaco Editor    │  • Write in JavaScript        │  │
│  │   with strategy    │  • Access tick data           │  │
│  │   code]           │  • Sandboxed execution        │  │
│  │                   │  • Template library            │  │
│  └────────────────────┴──────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  FEATURE SECTION 3: Social Trading                       │
│  • Follow traders  • Copy trades  • Leaderboards        │
│  • Activity feed   • Performance charts                 │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  FEATURE SECTION 4: Automation                           │
│  • Scheduled bots   • Conditional triggers              │
│  • Risk management  • Notification rules                │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  FEATURE SECTION 5: Market Coverage                      │
│  • All Deriv markets  • 100+ instruments                │
│  • Synthetics 24/7   • Real-time pricing               │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  COMPARISON TABLE                                       │
│  DerivX vs Deriv Native vs BMX Bot vs Other Bots       │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  CTA + FOOTER                                           │
└─────────────────────────────────────────────────────────┘
```

#### Components Breakdown

```
FeatureSection/
  ├── id: string
  ├── title: string
  ├── subtitle: string
  ├── features: BulletPoint[]
  ├── visual: ReactNode (screenshot/video/animation)
  ├── layout: "left-right" | "right-left" | "full-width"
  └── animation: slide-in on scroll

ComparisonTable/
  ├── columns: Platform[] ["DerivX", "Deriv", "BMX Bot", "Other"]
  ├── rows: ComparisonRow[]
  │     ├── feature: string
  │     └── values: (boolean | string | "partial")[]
  └── highlight: "DerivX" column

FeatureList/
  ├── features: DetailedFeature[]
  │     ├── icon: LucideIcon
  │     ├── title: string
  │     ├── description: string
  │     ├── technicalDetails: string
  │     └── badge?: "New" | "Beta" | "Pro"
  └── layout: "grid" | "list"
```

---

### PAGE H-3: Pricing Page (`/pricing`)

```
PURPOSE:
  Tiered pricing. Free tier to get started.
  Pro tier for serious traders. Team for groups.

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  NAVBAR                                                  │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  PAGE HERO                                               │
│  "Simple Pricing. Powerful Trading."                    │
│  [Monthly | Yearly toggle]                              │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  PRICING CARDS (3)                                       │
│                                                          │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  FREE    │  │  PRO ($29/mo)│  │  TEAM ($79/mo│      │
│  │          │  │  ★ POPULAR   │  │              │      │
│  │ 2 bots   │  │ 10 bots      │  │ Unlimited    │      │
│  │ 3 scripts│  │ Unlimited    │  │ Unlimited    │      │
│  │ Basic    │  │ Advanced     │  │ Advanced+    │      │
│  │ markets  │  │ markets      │  │ markets      │      │
│  │ 5 follow │  │ 50 follow    │  │ Unlimited    │      │
│  │ No copy  │  │ Copy trade   │  │ Copy trade   │      │
│  │          │  │ Backtesting  │  │ Team sharing │      │
│  │ [Start]  │  │ [Upgrade]    │  │ [Contact]    │      │
│  └──────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  FEATURE MATRIX (detailed comparison)                    │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  FAQ SECTION                                             │
│  • Do I need a Deriv account?                           │
│  • Is my money safe?                                    │
│  • Can I cancel anytime?                                │
│  • What markets are supported?                          │
│  • How does copy trading work?                          │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  CTA + FOOTER                                           │
└─────────────────────────────────────────────────────────┘
```

#### Components Breakdown

```
PricingCard/
  ├── tier: "free" | "pro" | "team"
  ├── price: { monthly: number, yearly: number }
  ├── features: PricingFeature[]
  │     ├── text: string
  │     ├── included: boolean
  │     └── badge?: string
  ├── popular: boolean
  └── cta: Button → /auth/signup?tier={tier}

PricingToggle/
  ├── period: "monthly" | "yearly"
  ├── discount: string (e.g. "Save 20%")
  └── onToggle: callback

FeatureMatrix/
  ├── categories: MatrixCategory[]
  │     ├── name: string
  │     └── rows: MatrixRow[]
  │           ├── feature: string
  │           └── values: Record<tier, boolean | string>
  └── tiers: string[]

FAQSection/
  ├── items: FAQItem[]
  │     ├── question: string
  │     └── answer: string
  └── layout: "accordion"
```

---

## 4. AUTH PAGES (7 PAGES)

---

### PAGE A-1: Sign Up (`/auth/signup`)

```
PURPOSE:
  Create DerivX account. Email + password.
  Deriv connection happens AFTER account creation.

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  LEFT PANEL (branding)          │ RIGHT PANEL (form)    │
│                                 │                        │
│  DerivX Logo                    │  "Create your account" │
│  Illustration/animation         │                        │
│  "Join 10,000+ automated       │  ┌──────────────────┐  │
│   traders on Deriv"            │  │ Full Name        │  │
│                                 │  ├──────────────────┤  │
│                                 │  │ Email            │  │
│                                 │  ├──────────────────┤  │
│                                 │  │ Password         │  │
│                                 │  ├──────────────────┤  │
│                                 │  │ Confirm Password │  │
│                                 │  ├──────────────────┤  │
│                                 │  │ ☐ I agree to T&C │  │
│                                 │  ├──────────────────┤  │
│                                 │  │ [Create Account] │  │
│                                 │  └──────────────────┘  │
│                                 │                        │
│                                 │  ── or continue with ──│
│                                 │                        │
│                                 │  [G] Google  [D] Deriv│
│                                 │                        │
│                                 │  Already have account? │
│                                 │  [Sign In →]           │
└─────────────────────────────────┴────────────────────────┘
```

#### Form Fields & Validation

```
SCHEMA: signupSchema
  fullName:    z.string().min(2).max(100)
  email:       z.string().email()
  password:    z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/).regex(/[^a-zA-Z0-9]/)
  confirmPassword: z.string().refine(val => val === password)
  termsAccepted: z.literal(true)

API ENDPOINT: POST /api/auth/register
  REQUEST:
    { fullName, email, password }
  RESPONSE:
    { user: { id, email, fullName }, token, refreshToken }
  SIDE EFFECTS:
    - Hash password (bcrypt, 12 rounds)
    - Create user record in PostgreSQL
    - Send verification email
    - Create default settings record
    - Create free-tier subscription

STATE:
  - loading: boolean
  - error: string | null
  - step: "form" | "verify-email-sent"
```

---

### PAGE A-2: Sign In (`/auth/signin`)

```
PURPOSE:
  Authenticate existing DerivX user.
  NOT Deriv login — that's OAuth redirect.

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
│                                                          │
│  [G] Google                                             │
│  [D] Sign in with Deriv (OAuth)                         │
│                                                          │
│  Don't have an account? [Sign Up →]                     │
└─────────────────────────────────────────────────────────┘
```

#### Form Fields & Validation

```
SCHEMA: signinSchema
  email:       z.string().email()
  password:    z.string().min(1)
  rememberMe:  z.boolean().default(false)

API ENDPOINT: POST /api/auth/login
  REQUEST:
    { email, password }
  RESPONSE:
    { user, token, refreshToken, hasDerivConnection: boolean }
  SIDE EFFECTS:
    - Verify password hash
    - Generate JWT (15min access, 7day refresh)
    - Store refresh token in Redis
    - If rememberMe: extended refresh token (30 days)
    - Log login event

DERIV OAUTH BUTTON:
  onClick → window.location.href = 
    `https://oauth.deriv.com/en/authorize?app_id=${APP_ID}&redirect_uri=${CALLBACK}/auth/deriv/callback&state=${csrfState}`
```

---

### PAGE A-3: Deriv OAuth Callback (`/auth/deriv/callback`)

```
PURPOSE:
  Handle redirect from Deriv after user authorizes.
  Exchange code for token. Link Deriv account.

LAYOUT (states):
┌─────────────────────────────────────────────────────────┐
│  STATE: LOADING                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │            ⟳ Connecting to Deriv...              │   │
│  │                                                   │   │
│  │  [Animated spinner + progress steps]             │   │
│  │  ☑ Redirected from Deriv                         │   │
│  │  ⟳ Exchanging authorization code...              │   │
│  │  ○ Establishing WebSocket connection...           │   │
│  │  ○ Fetching account details...                    │   │
│  │  ○ Linking to your DerivX account...             │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  STATE: SUCCESS                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  ✅ Deriv Account Connected!                     │   │
│  │                                                   │   │
│  │  Account: CR1234567                              │   │
│  │  Balance: $1,000.00 (USD)                        │   │
│  │  Currency: USD                                    │   │
│  │                                                   │   │
│  │  [Go to Dashboard →]                             │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  STATE: ERROR                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  ❌ Connection Failed                            │   │
│  │                                                   │   │
│  │  "Authorization was denied or expired"           │   │
│  │                                                   │   │
│  │  [Try Again]  [Contact Support]                  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

#### Implementation Details

```
FLOW:
  1. Extract code & state from URL params
  2. Validate state matches CSRF token from session
  3. Open WebSocket to Deriv API
  4. Send: { "authorize": "{code}" }
  5. Receive: { "authorize": { loginid, balance, currency, ... } }
  6. Store encrypted token in deriv_connections table
  7. Fetch active_symbols to cache available markets
  8. Fetch balance for display
  9. Redirect to /dashboard

API ENDPOINT: POST /api/auth/deriv/connect
  REQUEST:
    { code: string, state: string }
  RESPONSE:
    { 
      connection: { id, derivLoginId, currency, balance },
      isNewConnection: boolean 
    }
  SIDE EFFECTS:
    - Validate CSRF state
    - WebSocket authorize with code
    - Encrypt and store token (AES-256-GCM)
    - Create deriv_connections record
    - Create default bot_settings if none exist
    - Emit WebSocket event to user's active sessions

SECURITY:
  - CSRF state validation (prevent CSRF attacks)
  - Token encrypted before DB storage
  - Token never sent to client
  - PKCE flow if supported
```

---

### PAGE A-4: Forgot Password (`/auth/forgot-password`)

```
PURPOSE:
  Request password reset email.

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  CENTERED CARD                                          │
│                                                          │
│  🔒 "Reset your password"                               │
│  "Enter your email and we'll send you a reset link"     │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Email                                            │   │
│  ├──────────────────────────────────────────────────┤   │
│  │ [Send Reset Link]                                │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  Remember your password? [Sign In →]                    │
│                                                          │
│  SUCCESS STATE:                                         │
│  ✅ "Reset link sent! Check your email."               │
│  "Didn't receive it? [Resend]"                          │
└─────────────────────────────────────────────────────────┘
```

#### Implementation

```
SCHEMA: forgotPasswordSchema
  email: z.string().email()

API ENDPOINT: POST /api/auth/forgot-password
  SIDE EFFECTS:
    - Find user by email
    - Generate reset token (crypto.randomBytes(32))
    - Store hashed token in password_resets table (expires 1hr)
    - Send email via SendGrid/Resend with link:
      /auth/reset-password?token={token}
    - Always return success (prevent email enumeration)
```

---

### PAGE A-5: Reset Password (`/auth/reset-password`)

```
PURPOSE:
  Set new password using token from email.

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  CENTERED CARD                                          │
│                                                          │
│  "Set new password"                                     │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ New Password                         [Show 👁]   │   │
│  ├──────────────────────────────────────────────────┤   │
│  │ Confirm New Password                 [Show 👁]   │   │
│  ├──────────────────────────────────────────────────┤   │
│  │ [Reset Password]                                 │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  VALID STATE:                                           │
│  ✅ Passwords match                                     │
│  ✅ Minimum 8 characters                                │
│  ✅ Contains uppercase + number + special               │
│                                                          │
│  INVALID/EXPIRED TOKEN STATE:                           │
│  ❌ "This link has expired. Request a new one."         │
└─────────────────────────────────────────────────────────┘
```

#### Implementation

```
SCHEMA: resetPasswordSchema
  token:       z.string()
  password:    z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/).regex(/[^a-zA-Z0-9]/)
  confirmPassword: z.string().refine(val => val === password)

API ENDPOINT: POST /api/auth/reset-password
  FLOW:
    1. Hash incoming token
    2. Find matching record in password_resets (not expired)
    3. Update user password hash
    4. Delete all reset tokens for this user
    5. Invalidate all existing sessions
    6. Return success → redirect to /auth/signin
```

---

### PAGE A-6: Email Verification (`/auth/verify-email`)

```
PURPOSE:
  Verify user's email address after signup.

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  STATE: PENDING (no token in URL)                       │
│  ┌──────────────────────────────────────────────────┐   │
│  │  📧 "Verify your email"                          │   │
│  │                                                   │   │
│  │  "We've sent a verification link to              │   │
│  │   user@example.com"                              │   │
│  │                                                   │   │
│  │  "Didn't get the email?"                         │   │
│  │  [Resend Verification Email]                     │   │
│  │                                                   │   │
│  │  [Skip for now →] (limited access)               │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  STATE: VERIFIED (valid token)                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  ✅ "Email verified!"                            │   │
│  │                                                   │   │
│  │  "Your account is ready. Connect your Deriv       │   │
│  │   account to start trading."                     │   │
│  │                                                   │   │
│  │  [Connect Deriv Account →]                       │   │
│  │  [Go to Dashboard]                               │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

#### Implementation

```
API ENDPOINT: GET /api/auth/verify-email?token={token}
  FLOW:
    1. Hash token, find in email_verifications table
    2. Check not expired (24hr window)
    3. Update user.emailVerified = true
    4. Delete verification token
    5. Return success

API ENDPOINT: POST /api/auth/resend-verification
  FLOW:
    1. Rate limit: 1 per minute
    2. Generate new token
    3. Send email
    4. Return success
```

---

### PAGE A-7: Two-Factor Authentication (`/auth/2fa`)

```
PURPOSE:
  2FA verification step during sign-in (if enabled).

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  CENTERED CARD                                          │
│                                                          │
│  🔐 "Two-Factor Authentication"                         │
│  "Enter the 6-digit code from your authenticator app"   │
│                                                          │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐     │
│  │  4  │ │  7  │ │  2  │ │  9  │ │  1  │ │  5  │     │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘     │
│                                                          │
│  [Verify]                                               │
│                                                          │
│  "Having trouble?"                                      │
│  [Use backup code]                                      │
│                                                          │
│  RECOVERY CODE STATE:                                   │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Backup code:                                     │   │
│  │ [________________]                               │   │
│  │ [Verify Backup Code]                             │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

#### Implementation

```
SETUP (in settings):
  - Generate TOTP secret (otpauth:// URI)
  - Show QR code for Google Authenticator / Authy
  - User verifies setup by entering first code
  - Generate and display 10 backup codes
  - Store: secret (encrypted), backupCodes (hashed), enabled=true

VERIFICATION:
  - Verify TOTP code (speakeasy.totp.verify)
  - Or verify backup code (mark as used)
  - Rate limit: 5 attempts per 5 minutes
  - On failure: increment attempt counter
  - On 10 failures: lock account temporarily
```

---

## 5. DASHBOARD PAGES (14 PAGES — each with 8 sections: PURPOSE/LAYOUT/Components/Data Flow + 5 ADVANCED sections: Advanced Features, Edge Cases & Error Handling, Performance Considerations, Testing Strategy, Accessibility & UX Enhancements)

---

### PAGE D-1: Dashboard Overview (`/dashboard`)

```
PURPOSE:
  Main hub. Account status, active bots, quick market view,
  recent activity, and social feed preview.

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  SIDEBAR          │  TOP BAR                              │
│  ┌──────────┐    │  [Search] [Notifications 🔔] [User▼] │
│  │ Dashboard │    ├──────────────────────────────────────┤
│  │ Markets   │    │                                       │
│  │ Bots      │    │  WELCOME BACK, {name}                │
│  │ Scripts   │    │  Last login: 2 hours ago             │
│  │ Portfolio │    │                                       │
│  │ Social    │    │  ┌─────────────────────────────────┐ │
│  │ Analytics │    │  │  ACCOUNT CARDS (3)              │ │
│  │ Automation│    │  │  ┌──────┐┌──────┐┌──────┐     │ │
│  │ Settings  │    │  │  │Bal   ││P&L   ││Win % │     │ │
│  └──────────┘    │  │  │$1,000││+$42  ││ 68%  │     │ │
│                   │  │  └──────┘└──────┘└──────┘     │ │
│                   │  └─────────────────────────────────┘ │
│                   │                                       │
│                   │  ┌────────────────┬─────────────────┐│
│                   │  │ ACTIVE BOTS    │  LIVE TICKS     ││
│                   │  │                │                  ││
│                   │  │ 🟢 Martingale  │  EUR/USD 1.0842 ││
│                   │  │   R_10  ▲+$3  │  GBP/USD 1.2631 ││
│                   │  │                │  R_100  4532.11  ││
│                   │  │ 🟢 DCA Bot    │  BTC/USD 67,432  ││
│                   │  │   frxEUR ▲+$1 │                  ││
│                   │  │                │  [See all →]     ││
│                   │  │ [+ New Bot]   │                  ││
│                   │  └────────────────┴─────────────────┘│
│                   │                                       │
│                   │  ┌────────────────┬─────────────────┐│
│                   │  │ QUICK TRADE    │  SOCIAL FEED    ││
│                   │  │                │                  ││
│                   │  │ Symbol: [___▼] │  👤 TraderX     ││
│                   │  │ Type: Rise ▼   │    Won +$15 R10 ││
│                   │  │ Stake: $1      │  👤 BotMaster    ││
│                   │  │ Duration: 5t   │    Started bot  ││
│                   │  │                │  👤 NewTrader    ││
│                   │  │ [Buy Rise]     │    Lost -$2 EUR ││
│                   │  │ [Buy Fall]     │                  ││
│                   │  └────────────────┴─────────────────┘│
└───────────────────┴───────────────────────────────────────┘
```

#### Components Breakdown

```
DashboardPage/
  ├── WelcomeBanner
  │     ├── userName: string
  │     ├── lastLogin: Date
  │     └── derivConnectionStatus: "connected" | "disconnected"
  │
  ├── AccountCards
  │     ├── BalanceCard
  │     │     ├── balance: number
  │     │     ├── currency: string
  │     │     └── derivAccountId: string
  │     ├── PnLCard
  │     │     ├── todayPnL: number
  │     │     ├── weekPnL: number
  │     │     └── trend: "up" | "down"
  │     └── WinRateCard
  │           ├── winRate: number
  │           ├── totalTrades: number
  │           └── period: "today" | "week" | "month"
  │
  ├── ActiveBotsWidget
  │     ├── bots: ActiveBot[]
  │     │     ├── id: string
  │     │     ├── name: string
  │     │     ├── status: "running" | "paused" | "error"
  │     │     ├── symbol: string
  │     │     ├── currentPnL: number
  │     │     └── runtime: number (seconds)
  │     └── onNewBot: () → /dashboard/bots/new
  │
  ├── LiveTicksWidget
  │     ├── ticks: Tick[]
  │     │     ├── symbol: string
  │     │     ├── price: number
  │     │     ├── direction: "up" | "down"
  │     │     └── timestamp: Date
  │     └── subscription: Deriv WebSocket tick subscription
  │
  ├── QuickTradeWidget
  │     ├── symbol: string (selected)
  │     ├── contractType: string
  │     ├── stake: number
  │     ├── duration: number
  │     ├── durationUnit: "t" | "s" | "m"
  │     ├── onBuy: (params) → Deriv buy API call
  │     └── requiresDerivConnection: boolean
  │
  └── SocialFeedWidget
        ├── activities: Activity[]
        │     ├── user: { name, avatar }
        │     ├── action: "trade_won" | "trade_lost" | "bot_started" | ...
        │     ├── details: string
        │     └── timestamp: Date
        └── limit: 5 (preview only)
```

#### Data Flow

```
ON MOUNT:
  1. Check Deriv connection status
  2. If connected: open WebSocket, subscribe to balance + ticks
  3. Fetch active bots from /api/bots?status=running
  4. Fetch today's trade summary from /api/trades/summary
  5. Fetch social feed from /api/social/feed?limit=5
  6. Set up real-time subscriptions

WEBSOCKET SUBSCRIPTIONS:
  - balance: { "balance": 1, "subscribe": 1 }
  - tick for each favorite symbol
  - bot status updates (internal Socket.IO)

PERIODIC REFRESH:
  - Trade summary: every 30s
  - Social feed: every 60s
  - Bot statuses: real-time via Socket.IO
```

#### Advanced Features

```
1. SMART GREETING & CONTEXTUAL WIDGETS
   - Time-aware greeting (morning/afternoon/evening) using user TZ
   - Adaptive widget ordering: most-used widgets surface to top (drag & drop saved)
   - "Focus Mode" toggle: collapses non-essential widgets when a bot is running

2. AI-DRIVEN DAILY INSIGHTS PANEL
   - Auto-generated summary: "Today's best performer: Martingale Bot (+$23.40)"
   - Suggested actions: "R_10 volatility is high — consider pausing scalper bot"
   - Powered by server-side LLM summarization of bot_logs + market state

3. MULTI-ACCOUNT DASHBOARD SWITCHER
   - Dropdown in top bar to switch between connected Deriv accounts
   - Each account has its own widget state, saved per accountId
   - Aggregate view: combined balance & P&L across all accounts

4. VOICE-OVERVIEW MODE (Accessibility)
   - One-click "Read my dashboard" button — Web Speech API
   - Reads out balance, P&L, active bots count, last trade result
   - Useful for visually impaired users

5. KEYBOARD SHORTCUTS
   - `g d` -> dashboard, `g m` -> markets, `g b` -> bots, `g p` -> portfolio
   - `?` -> show shortcuts help overlay
   - `/` -> focus global search
```

#### Edge Cases & Error Handling

```
SCENARIO                              ACTION
─────────────────────────────────────────────────────────────────
Deriv WS disconnects on mount         Show red banner "Reconnecting..."
                                      Retry with exponential backoff
                                      (1s, 2s, 4s, 8s, max 30s)
                                      Cache last-known balance with warning badge

No active Deriv connection            Blur widgets that need API access
                                      Show "Connect Deriv to enable" CTA

Active bot crashed mid-render         Bot card shows red error state with
                                      last error message + "View Logs" link

Social feed empty                     Show onboarding card:
                                      "Follow traders to populate your feed"

WebSocket tick rate > 50/s            Throttle UI updates to 5/s
                                      (drop intermediate ticks in UI layer)

User timezone not detected            Fallback to UTC, show notice in settings

QuickTrade while bot is running       Confirm modal:
                                      "A bot is currently trading this symbol.
                                       Manual trade may conflict. Continue?"

Balance returns null from API         Show "—" instead of $0
                                      Log to Sentry, don't crash UI

Session expired (401 on any API)      Redirect to /login?reason=expired
                                      Preserve intended destination in `next`
```

#### Performance Considerations

```
- Use React.memo on BotCard, MarketTick, ActivityItem to prevent re-renders
- Virtualize ActivityFeed (react-window) when > 100 items
- Debounce LiveTicks UI updates to 4 fps (visual smoothness vs accuracy)
- WebSocket message queue with requestAnimationFrame flushing
- Pre-fetch bot detail data on hover (link prefetch) for instant navigation
- Lazy-load Framer Motion animations below the fold
- Cache /api/trades/summary in React Query with 30s staleTime
- Use `useTransition` for non-urgent state updates (filter changes)
- Server-Sent Events instead of polling where possible
```

#### Testing Strategy

```
UNIT TESTS (Jest + React Testing Library):
  - WelcomeBanner renders correct greeting per hour
  - AccountCards handle null balance gracefully
  - ActiveBotsWidget filters by status correctly
  - QuickTradeWidget validates stake > 0 and <= maxStake

INTEGRATION TESTS:
  - Mount with mocked Deriv WS -> assert correct subscribe messages
  - Simulate tick stream -> assert UI updates
  - Simulate bot status change via Socket.IO -> assert card re-renders
  - OAuth flow -> mock callback -> assert dashboard loads

E2E TESTS (Playwright):
  - Login -> land on /dashboard -> see balance card populated
  - Click "New Bot" -> navigate to /dashboard/bots/new
  - Click trade in QuickTrade -> confirm modal -> execute
  - Test offline mode: disconnect network -> see reconnect banner

VISUAL REGRESSION (Percy/Chromatic):
  - Snapshot dashboard with 0 bots, 1 bot, 5 bots
  - Light + dark theme snapshots
  - Mobile (375px) + tablet (768px) + desktop (1440px)
```

#### Accessibility & UX Enhancements

```
ARIA:
  - role="region" + aria-label on each widget
  - aria-live="polite" on balance updates (announces changes)
  - aria-live="assertive" on critical alerts (bot error, drawdown)
  - role="status" on active bot count

KEYBOARD NAVIGATION:
  - All widgets focusable via Tab
  - Enter activates widget's primary action
  - Escape closes any open modal/dropdown

COLOR & CONTRAST:
  - All text meets WCAG AA (4.5:1) contrast ratio
  - P&L colors: green (#16a34a) and red (#dc2626) never sole indicator
    (also use up/down arrow glyphs + "Profit"/"Loss" text)
  - Dark theme: use oklch(0.15 0 0) bg, oklch(0.95 0 0) fg

RESPONSIVE:
  - Mobile: widgets stack vertically, sidebar collapses to hamburger
  - Tablet: 2-column grid, sidebar persistent
  - Desktop (>=1280px): 3-column hero grid

REDUCED MOTION:
  - Respect prefers-reduced-motion media query
  - Disable Framer Motion transitions, instant state changes
```


---

### PAGE D-2: Markets Browser (`/dashboard/markets`)

```
PURPOSE:
  Browse all Deriv markets and instruments.
  Select a symbol to trade or view details.

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  MARKET TABS                                            │
│  [Forex] [Synthetics] [Commodities] [Crypto] [Indices]  │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  SEARCH + FILTER                                        │
│  [🔍 Search symbol...]  [Volatility ▼] [Favorites ★]   │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  MARKET GRID                                            │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ EUR/USD     │  │ GBP/USD     │  │ USD/JPY     │     │
│  │ 1.0842 ▲    │  │ 1.2631 ▼    │  │ 149.32 ▲    │     │
│  │ +0.12%      │  │ -0.05%      │  │ +0.08%      │     │
│  │ [Trade] [★] │  │ [Trade] [★] │  │ [Trade] [★] │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ Volatility 10│  │ Volatility 25│  │ Volatility 75│   │
│  │ 4532.11 ▲   │  │ 3241.56 ▼   │  │ 1234.89 ▲   │     │
│  │ +0.34%      │  │ -0.12%      │  │ +0.56%      │     │
│  │ [Trade] [★] │  │ [Trade] [★] │  │ [Trade] [★] │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  MARKET SCHEDULE                                        │
│  "Forex markets close in 4h 23m"                       │
│  "Synthetics: Open 24/7"                               │
└─────────────────────────────────────────────────────────┘
```

#### Components Breakdown

```
MarketsPage/
  ├── MarketTabs
  │     ├── markets: Market[]
  │     │     ├── id: string
  │     │     ├── name: string
  │     │     ├── icon: LucideIcon
  │     │     └── isAlwaysOpen: boolean
  │     └── activeTab: string
  │
  ├── SearchFilter
  │     ├── searchQuery: string
  │     ├── volatilityFilter: "all" | "low" | "medium" | "high"
  │     └── showFavoritesOnly: boolean
  │
  ├── MarketGrid
  │     ├── symbols: Symbol[]
  │     │     ├── symbol: string
  │     │     ├── displayName: string
  │     │     ├── market: string
  │     │     ├── currentPrice: number
  │     │     ├── priceChange: number
  │     │     ├── priceChangePercent: number
  │     │     ├── isFavorite: boolean
  │     │     └── pipSize: number
  │     └── onTrade: (symbol) → /dashboard/trade?symbol={symbol}
  │
  └── MarketSchedule
        ├── schedules: MarketSchedule[]
        │     ├── market: string
        │     ├── isOpen: boolean
        │     ├── nextOpen: Date
        │     └── nextClose: Date
        └── updateFrequency: 60s

DATA SOURCE:
  - active_symbols API call on mount
  - trading_times API for schedules
  - tick subscriptions for real-time prices
  - Favorites stored in user_settings table
```

#### Advanced Features

```
1. SMART MARKET SCANNER
   - Heatmap view: color-code all symbols by % change (last 1h / 24h)
   - Volatility scanner: top 10 most volatile symbols right now
   - "Movers" tab: biggest gainers/losers in last 15 minutes
   - Configurable thresholds (e.g. "show only > 2% moves")

2. CUSTOM WATCHLISTS
   - Multiple named watchlists (e.g. "My Forex", "High Vol Synthetics")
   - Drag symbols between watchlists
   - Per-watchlist alert rules (price alert, % move alert)

3. MARKET DEPTH & SENTIMENT
   - For each symbol: show recent trade direction split (calls vs puts)
   - Aggregated from social feed: "X% of traders are bullish on R_10"
   - Sentiment timeline chart (last 24h)

4. ADVANCED FILTERING & SAVED VIEWS
   - Filter by: pip size, payout %, market hours, volatility band
   - Save current filter as named view (e.g. "Quick Scalp Set")
   - Share views with team via URL

5. ECONOMIC CALENDAR INTEGRATION
   - Inline calendar showing upcoming events affecting each market
   - "High impact" events flagged with red badge
   - Click event -> see affected symbols highlighted in grid

6. ONE-CLICK MULTI-ACCOUNT TRADE
   - Buy same contract across multiple Deriv accounts simultaneously
   - Distribute stake by configurable ratio
```

#### Edge Cases & Error Handling

```
SCENARIO                              ACTION
─────────────────────────────────────────────────────────────────
active_symbols API fails              Show cached symbols with warning badge
                                      "Last updated: 5 minutes ago"

Symbol delisted by Deriv              Grey out card with "Delisted" tooltip
                                      Prevent trade action
                                      Notify users who had it favorited

Market closed (forex weekend)         Show "Closed" pill + next open time
                                      Disable Trade button, show countdown

Tick subscription rate-limited        Switch to polling fallback (every 5s)
                                      Show "Live: degraded" indicator

Favorite symbol not in active list    Show in "Inactive Favorites" section
                                      with reactivation prompt

Search returns no matches             Show suggestions: "Did you mean R_10?"
                                      + "Browse all markets" link

User tries to trade restricted symbol Show modal: "This symbol requires
                                      account verification. Submit documents."
```

#### Performance Considerations

```
- Paginate symbol grid (50 per page) to avoid 1000+ DOM nodes
- Virtualize grid when scrolling (react-window FixedSizeGrid)
- Memoize MarketCard with React.memo + custom comparator
- Cache active_symbols in Redis (TTL 1h) — rarely changes
- Use Web Worker for heatmap color calculation (off main thread)
- Throttle tick updates to 2 fps per card
- Lazy-load EconomicCalendar component
- Use IntersectionObserver to only subscribe to ticks for visible cards
```

#### Testing Strategy

```
UNIT TESTS:
  - MarketTabs switches active class correctly
  - SearchFilter debounces input (300ms)
  - MarketGrid renders correct count of cards
  - Favorites toggle persists to localStorage

INTEGRATION:
  - Mock active_symbols response -> assert grid populated
  - Toggle favorite -> assert /api/favorites called
  - Click Trade -> assert navigation to /dashboard/trade?symbol=R_10

E2E:
  - Browse markets, search "R_10", click Trade -> trade page loads
  - Switch tab to Synthetics -> assert symbol list updates
  - Add to favorites -> refresh page -> favorite persists

ACCESSIBILITY:
  - Axe automated scan on each tab
  - Screen reader test: navigate grid with arrow keys
```

#### Accessibility & UX Enhancements

```
- Grid items: role="button" + aria-label="Trade EUR/USD, current price 1.0842, up 0.12%"
- Tablist follows WAI-ARIA tabs pattern (arrow keys to switch)
- Price changes announced via aria-live="polite" region
- Colorblind mode: use shapes (up/down/dot) + colors for direction
- Focus visible ring on all interactive elements
- "Skip to content" link at top of page
- Symbol search: autocomplete with keyboard navigation
```


---

### PAGE D-3: Trade Page (`/dashboard/trade`)

```
PURPOSE:
  Full trading interface for a selected symbol.
  Chart, order panel, and live contract monitoring.

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  SYMBOL SELECTOR  │  [EUR/USD ▼]  │  Price: 1.0842 ▲  │
└─────────────────────────────────────────────────────────┘
┌──────────────────────────────┬──────────────────────────┐
│  CHART AREA                  │  ORDER PANEL             │
│                              │                          │
│  [1m|5m|15m|1h|1d]          │  Contract Type:          │
│  [Candle ▼] [Indicators]    │  [Rise/Fall ▼]          │
│                              │                          │
│  ┌────────────────────────┐ │  ┌────────────────────┐ │
│  │                        │ │  │ Rise   │  Fall      │ │
│  │   TradingView          │ │  │ 1.0844 │  1.0840   │ │
│  │   Lightweight Chart    │ │  └────────────────────┘ │
│  │                        │ │                          │
│  │   (OHLC candles)       │ │  Duration:              │
│  │                        │ │  [5] [ticks ▼]          │
│  │                        │ │                          │
│  │                        │ │  Stake:                 │
│  └────────────────────────┘ │  [$1.00]                │
│                              │                          │
│                              │  ┌─ Potential Profit ──┐│
│                              │  │ Win:  +$1.95 (195%) ││
│                              │  │ Lose: -$1.00        ││
│                              │  └────────────────────┘│
│                              │                          │
│                              │  [🤖 Assign Bot ▼]     │
│                              │                          │
│                              │  [Buy Rise]  [Buy Fall] │
└──────────────────────────────┴──────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  OPEN CONTRACTS                                         │
│  ┌───────┬────────┬────────┬────────┬────────┬───────┐ │
│  │ ID    │ Type   │ Entry  │ Current│ P&L    │ Action│ │
│  ├───────┼────────┼────────┼────────┼────────┼───────┤ │
│  │ #1234 │ Rise   │ 1.0842 │ 1.0845 │ +$0.50 │ [Sell]│ │
│  │ #1235 │ Fall   │ 1.0840 │ 1.0838 │ +$0.30 │ [Sell]│ │
│  └───────┴────────┴────────┴────────┴────────┴───────┘ │
└─────────────────────────────────────────────────────────┘
```

#### Components Breakdown

```
TradePage/
  ├── SymbolSelector
  │     ├── symbols: Symbol[] (from active_symbols cache)
  │     ├── selected: string
  │     └── favorites: string[]
  │
  ├── ChartArea
  │     ├── chart: LightweightCharts instance
  │     ├── data: OHLC[] (from ticks_history)
  │     ├── timeframe: "1m" | "5m" | "15m" | "1h" | "1d"
  │     ├── chartType: "candle" | "line" | "bar"
  │     ├── indicators: Indicator[]
  │     │     ├── type: "SMA" | "EMA" | "RSI" | "MACD" | "BB"
  │     │     ├── params: Record<string, number>
  │     │     └── visible: boolean
  │     └── subscriptions: tick WebSocket
  │
  ├── OrderPanel
  │     ├── contractType: string
  │     ├── proposal: Proposal (from Deriv proposal API)
  │     │     ├── askPrice: number
  │     │     ├── payout: number
  │     │     └── spot: number
  │     ├── duration: number
  │     ├── durationUnit: "t" | "s" | "m" | "h" | "d"
  │     ├── stake: number
  │     ├── barrier?: number (for higher/lower, touch)
  │     ├── selectedBot?: string (assign to bot)
  │     ├── onBuy: (params) → buy API call
  │     └── proposalSubscription: real-time pricing
  │
  └── OpenContracts
        ├── contracts: Contract[]
        │     ├── contractId: string
        │     ├── type: string
        │     ├── entrySpot: number
        │     ├── currentSpot: number
        │     ├── pnl: number
        │     ├── isSold: boolean
        │     └── sellTime?: Date
        ├── onSell: (contractId) → sell API call
        └── subscription: proposal_open_contract stream

DERIV API CALLS:
  1. ticks_history: get historical OHLC
  2. tick: subscribe to real-time price
  3. proposal: subscribe to live pricing
  4. buy: execute trade
  5. proposal_open_contract: monitor open positions
  6. sell: close position early
```

#### Advanced Features

```
1. MULTI-LEGGED TRADE BUILDER
   - Build multi-contract positions (e.g. Rise + higher/lower combo)
   - Visualize combined P&L curve
   - Save as template for reuse

2. ONE-CLICK TRADING MODE
   - Pre-configure 4 quick-trade buttons (e.g. R_10 Rise $1 5t)
   - Hover over chart shows price; click buys instantly
   - Confirm modal optional (toggle in settings)

3. TRADING JOURNAL (INLINE)
   - After each trade closes, prompt for note + emotion tag
   - Auto-attach screenshot of chart at entry
   - Sync to /dashboard/analytics journal tab

4. SMART ORDER ROUTING
   - Auto-select best account (lowest utilization) for trade
   - Spread large stakes across multiple accounts to avoid limits
   - Failover to backup account if primary rejects

5. PRICE ALERTS & AUTO-EXECUTE
   - Set conditional orders: "Buy Rise if R_10 > 4540"
   - Up to 10 active alerts per symbol
   - Triggered alerts execute trade automatically

6. ADVANCED CHART FEATURES
   - Drawing tools (trendline, fib retracement, support/resistance)
   - Multi-timeframe view (e.g. 1m + 5m side-by-side)
   - Save chart layouts per symbol
   - Indicator templates (apply 3 indicators with one click)
```

#### Edge Cases & Error Handling

```
SCENARIO                              ACTION
─────────────────────────────────────────────────────────────────
Buy API returns error_code            Show specific error:
  - InvalidStake                       "Stake must be between $0.35 and $50,000"
  - MarketClosed                       "Market closed. Opens in 4h 23m"
  - InsufficientBalance                "Balance: $0.50. Required: $1.00"
  - RateLimitExceeded                  "Too many trades. Wait 30s."
  - ContractExpired                    "Proposal expired. Refreshing..."
                                      (auto-fetch new proposal)

Proposal subscription drops            Re-subscribe transparently
                                      Show "Pricing: reconnecting..." pill

Entry spot not received in 10s        Mark contract as "Pending"
                                      Show "Verifying entry..." badge
                                      Auto-resolve when spot arrives

Chart WS disconnects                   Pause chart, show "Paused" overlay
                                      Resume on reconnect (don't lose data)

User navigates away mid-trade          Confirm modal:
                                      "You have 1 open trade. Leaving will
                                       hide the monitor. Continue?"

Sell API fails                         Retry 3x with 1s backoff
                                      If still failing: show "Manual sell
                                      required" with retry button

Bot assigned to trade but bot is busy Queue trade in bot's pipeline
                                      Show "Queued for bot X" badge
```

#### Performance Considerations

```
- LightweightCharts uses canvas — keep < 5000 candles in viewport
- Use `setData` instead of `update` for batch candle updates
- Throttle proposal subscription updates to 2 fps (price flicker reduction)
- Debounce stake input (250ms) before fetching proposal
- Web Worker for indicator calculations (RSI, MACD) on historical data
- Lazy-load drawing tools (only when user clicks "draw" mode)
- Use `requestIdleCallback` for non-critical UI work
- Chart resize observer with debounce (100ms)
```

#### Testing Strategy

```
UNIT TESTS:
  - OrderPanel validates stake, duration, barrier constraints
  - SymbolSelector filters favorites correctly
  - ChartArea timeframe switch triggers correct ticks_history call
  - OpenContracts sell button calls sell API with contract_id

INTEGRATION:
  - Mock Deriv proposal stream -> assert OrderPanel updates
  - Buy flow -> mock success -> assert OpenContracts row appears
  - Sell flow -> mock success -> assert row removed
  - Bot assignment dropdown -> assert only running bots listed

E2E (paper trading mode):
  - Select EUR/USD -> set Rise 5 ticks $1 -> Buy -> contract closes -> P&L shown
  - Test partial fill scenario (rare but possible)
  - Test chart drawing tools persist across symbol switches

PERFORMANCE:
  - Lighthouse CI: < 2s LCP, < 100ms CLS
  - Chart render benchmark: 1000 candles in < 50ms
```

#### Accessibility & UX Enhancements

```
- Chart keyboard mode: arrow keys to move cursor, Enter for action
- Order form: full keyboard navigable, logical tab order
- Error messages: role="alert" + aria-live="assertive"
- OpenContracts table: sortable via keyboard (Enter on header)
- High-contrast theme for chart (white bg, black candles)
- Screen reader announces price changes every 5s (toggleable)
- Magnifier mode for chart (accessibility setting)
- "Reduce visual noise" toggle: hides animations, simplifies colors
```


---

### PAGE D-4: Bot Management (`/dashboard/bots`)

```
PURPOSE:
  List, manage, and create trading bots.
  Overview of all bots with status and performance.

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  BOTS HEADER                                            │
│  "Trading Bots"                    [+ Create New Bot]   │
│  [All] [Running 🟢] [Paused 🟡] [Stopped 🔴]           │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  BOT CARDS                                              │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 🟢 Martingale Bot                    [⏸] [⏹] [⚙]│   │
│  │ Symbol: R_10 (Volatility 10 Index)              │   │
│  │ Strategy: Martingale | Script: martingale_v2.js  │   │
│  │ Runtime: 2h 34m | Trades: 156 | Win Rate: 64%   │   │
│  │ P&L: +$23.40 ▲ | Current Stake: $0.35           │   │
│  │                                                  │   │
│  │ ┌──────────────────────────────────────────────┐ │   │
│  │ │ [Mini P&L chart - last 50 trades]            │ │   │
│  │ └──────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 🟡 DCA Bot                           [▶] [⏹] [⚙]│   │
│  │ Symbol: frxEURUSD | Strategy: DCA              │   │
│  │ Runtime: 0h 00m | Trades: 45 | Win Rate: 71%   │   │
│  │ P&L: +$12.80 ▲ | Status: Paused by user        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 🔴 Scalper Bot                        [▶] [🗑] [⚙]│   │
│  │ Symbol: cryBTCUSD | Last run: 2 days ago       │   │
│  │ Total Trades: 340 | Win Rate: 58%              │   │
│  │ P&L: -$8.20 ▼                                  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

#### Components Breakdown

```
BotsPage/
  ├── BotsHeader
  │     ├── totalCount: number
  │     ├── runningCount: number
  │     └── onCreateNew: () → /dashboard/bots/new
  │
  ├── BotsFilter
  │     ├── status: "all" | "running" | "paused" | "stopped"
  │     └── sortBy: "name" | "pnl" | "winRate" | "recent"
  │
  └── BotCard[]
        ├── id: string
        ├── name: string
        ├── status: "running" | "paused" | "stopped" | "error"
        ├── symbol: string
        ├── strategy: string
        ├── scriptId: string
        ├── runtime: number
        ├── totalTrades: number
        ├── winRate: number
        ├── pnl: number
        ├── currentStake: number
        ├── pnlChart: { x: number, y: number }[] (last 50 trades)
        ├── actions:
        │     ├── start: () → POST /api/bots/{id}/start
        │     ├── pause: () → POST /api/bots/{id}/pause
        │     ├── stop: () → POST /api/bots/{id}/stop
        │     ├── configure: () → /dashboard/bots/{id}/config
        │     └── delete: () → DELETE /api/bots/{id}
        └── realTimeUpdates: Socket.IO subscription
```

#### Advanced Features

```
1. BOT GROUPS & TAGS
   - Group bots by tag (e.g. "Scalping", "Long-term", "Test")
   - Bulk actions on group: pause all, stop all, delete all
   - Filter by tag in sidebar

2. BOT TEMPLATES LIBRARY
   - Save any bot config as template (without runtime data)
   - Share templates with team
   - "Fork" a public template from marketplace

3. BOT PERFORMANCE COMPARISON
   - Select 2-4 bots -> side-by-side comparison view
   - Overlay P&L curves, win rate trends, trade frequency
   - Identify which strategy is outperforming

4. BOT HEALTH SCORING
   - Auto-score each bot 0-100 based on:
     - Win rate vs benchmark
     - Drawdown depth
     - Trade frequency stability
     - Error rate
   - Red/yellow/green badges on cards
   - "Action needed" filter shows low-scoring bots

5. BOT CLONING & SCENARIO TESTING
   - Clone a bot with different parameters (A/B testing)
   - Run both in paper-trade mode, compare results
   - Promote winner to live

6. COLLABORATIVE BOT OWNERSHIP
   - Multiple users can co-own a bot
   - Role-based permissions (viewer / editor / admin)
   - Audit log of who changed what

7. BOT PAUSE/RESUME SCHEDULES
   - Per-bot schedule: "Pause weekdays 12:00-13:00 (lunch)"
   - Holiday calendar auto-pause
```

#### Edge Cases & Error Handling

```
SCENARIO                              ACTION
─────────────────────────────────────────────────────────────────
Bot status update missed (WS lag)     Show "Syncing..." badge for 5s
                                      Then force-refresh via REST API

Bot stuck in "starting" state > 30s   Mark as warning "Delayed start"
                                      Offer "Force start" / "Cancel" buttons

Bot errored repeatedly (5x in 1 min)  Auto-pause bot
                                      Send critical notification
                                      Show error trace on card

P&L chart data missing (new bot)      Show "No trades yet" placeholder
                                      Don't render empty chart

Delete bot with open trades           Confirm modal:
                                      "Bot has 2 open contracts. Stop bot
                                       (contracts will close) or wait?"

Bot assigned to delisted symbol       Disable start button
                                      Show "Symbol no longer available"
                                      Suggest replacement symbol

Concurrent edits (two users edit)     Optimistic UI + server-side conflict
                                      resolution: last-write-wins with
                                      notification to other user
```

#### Performance Considerations

```
- Render only visible bot cards (pagination 12 per page or virtualize)
- P&L mini-chart: SVG sparkline (not Recharts) for 50 data points
- Debounce filter changes (200ms)
- Cache bot list in React Query (staleTime 10s, refetchOnWindowFocus)
- Use `useTransition` for filter+sort operations
- WebSocket updates batched (5/s max per card)
- Lazy-load BotComparison modal
- Skeleton loaders for initial fetch
```

#### Testing Strategy

```
UNIT TESTS:
  - BotsFilter correctly filters by status and sort
  - BotCard actions call correct API endpoints
  - P&L sparkline renders correct trend direction
  - Health score calculation matches expected formula

INTEGRATION:
  - Create bot via API -> assert appears in list
  - Pause bot -> assert status changes via Socket.IO
  - Delete bot -> assert removed from list + confirmation

E2E:
  - Create new bot, start, wait for first trade, pause, stop, delete
  - Test bulk pause action on filtered set
  - Test bot template creation and reuse

LOAD TEST:
  - 100 bots in list -> assert page renders < 1s
  - 50 bots updating P&L simultaneously -> no UI freeze
```

#### Accessibility & UX Enhancements

```
- Bot cards: role="article" + aria-label with name + status
- Status badges: include text label, not just color (Active, Paused)
- Action buttons: aria-label="Pause bot Martingale Bot"
- Filter chips: keyboard navigable, deletable via Backspace
- Sort dropdown: announces current sort to screen readers
- Empty state: clear "Create your first bot" CTA with icon
- Tooltip on health score: explains how it's calculated
- Reduce motion: disable sparkline animation
```


---

### PAGE D-5: Bot Creator/Config (`/dashboard/bots/new` & `/dashboard/bots/:id/config`)

```
PURPOSE:
  Create new bot or edit existing bot configuration.
  Select strategy, market, parameters, risk management.

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  BOT CONFIGURATOR (Stepper)                              │
│                                                          │
│  ① Basic  ─── ② Strategy  ─── ③ Risk  ─── ④ Review    │
│  ●━━━━━━━━━○━━━━━━━━━━━━━○━━━━━━━━━━━○━━━━━━━━━━━━━   │
└─────────────────────────────────────────────────────────┘

STEP 1: BASIC INFO
┌─────────────────────────────────────────────────────────┐
│  Bot Name: [My Martingale Bot          ]                │
│  Description: [Optional description    ]                │
│  Market: [Synthetics ▼]                                │
│  Symbol: [Volatility 10 Index ▼]                       │
│  Account: [CR1234567 (USD) ▼]                          │
│                                          [Next →]       │
└─────────────────────────────────────────────────────────┘

STEP 2: STRATEGY SELECTION
┌─────────────────────────────────────────────────────────┐
│  Choose Strategy:                                       │
│                                                          │
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │ 📊 Martingale   │  │ 📈 DCA/Average  │              │
│  │ Double stake on │  │ Lower average   │              │
│  │ loss            │  │ entry price     │              │
│  └─────────────────┘  └─────────────────┘              │
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │ 🔄 Oscar's Grind│  │ 🎯 Fixed Stake  │              │
│  │ Grind strategy  │  │ Same stake each │              │
│  └─────────────────┘  └─────────────────┘              │
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │ 📜 Custom Script│  │ 🧠 AI Adaptive  │              │
│  │ Write your own  │  │ ML-based adjust │              │
│  └─────────────────┘  └─────────────────┘              │
│                                                          │
│  Or select existing script: [my_strategy.js ▼]          │
│                                          [← Back] [→]   │
└─────────────────────────────────────────────────────────┘

STEP 3: PARAMETERS & RISK MANAGEMENT
┌─────────────────────────────────────────────────────────┐
│  Trade Parameters:                                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Contract Type:  [Rise/Fall ▼]                    │   │
│  │ Initial Stake:  [$0.35       ]                   │   │
│  │ Max Stake:      [$100        ]                   │   │
│  │ Duration:       [5] [ticks ▼]                    │   │
│  │ Take Profit:    [$50         ]                   │   │
│  │ Stop Loss:      [$25         ]                   │   │
│  │ Max Concurrent: [1           ]                   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  Martingale Settings:                                   │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Multiplier:     [2.0         ]                   │   │
│  │ On Win:         [Reset to initial ▼]             │   │
│  │ On Loss:        [Multiply stake ▼]               │   │
│  │ Max Steps:      [5           ]                   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  Risk Limits:                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Max Daily Loss:  [$100        ]                  │   │
│  │ Max Daily Trades: [500        ]                  │   │
│  │ Cooldown After N Losses: [3 losses → 5min]      │   │
│  └──────────────────────────────────────────────────┘   │
│                                          [← Back] [→]   │
└─────────────────────────────────────────────────────────┘

STEP 4: REVIEW & START
┌─────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────┐   │
│  │ Bot: My Martingale Bot                           │   │
│  │ Symbol: R_10 (Volatility 10 Index)              │   │
│  │ Strategy: Martingale (2x multiplier)            │   │
│  │ Stake: $0.35 → max $100                        │   │
│  │ Take Profit: $50 | Stop Loss: $25              │   │
│  │ Duration: 5 ticks                               │   │
│  │ Risk: Max daily loss $100, 3-loss cooldown 5m  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  □ Run backtest before starting (recommended)           │
│  [Run Backtest]  → Shows quick P&L simulation           │
│                                                          │
│  [← Back]  [Save & Start 🟢]  [Save Draft]             │
└─────────────────────────────────────────────────────────┘
```

#### Components Breakdown

```
BotConfigurator/
  ├── stepper: StepperComponent
  │     ├── steps: Step[]
  │     ├── currentStep: number
  │     └── completed: Set<number>
  │
  ├── Step1_BasicInfo
  │     ├── name: string
  │     ├── description: string
  │     ├── market: string (from active_symbols)
  │     ├── symbol: string
  │     └── account: DerivAccount (from connections)
  │
  ├── Step2_StrategySelection
  │     ├── presetStrategies: Strategy[]
  │     │     ├── id: string
  │     │     ├── name: string
  │     │     ├── description: string
  │     │     ├── icon: string
  │     │     ├── category: "preset" | "custom" | "ai"
  │     │     ├── defaultParams: Record<string, any>
  │     │     └── riskLevel: "low" | "medium" | "high"
  │     ├── customScripts: Script[] (user's scripts)
  │     └── selectedStrategy: string
  │
  ├── Step3_ParametersRisk
  │     ├── tradeParams: TradeParams
  │     │     ├── contractType: string
  │     │     ├── initialStake: number
  │     │     ├── maxStake: number
  │     │     ├── duration: number
  │     │     ├── durationUnit: string
  │     │     ├── takeProfit: number
  │     │     ├── stopLoss: number
  │     │     └── maxConcurrent: number
  │     ├── strategyParams: Record<string, any> (dynamic)
  │     └── riskLimits: RiskLimits
  │           ├── maxDailyLoss: number
  │           ├── maxDailyTrades: number
  │           ├── cooldownAfterLosses: { count: number, duration: number }
  │           └── maxConsecutiveLosses: number
  │
  └── Step4_ReviewStart
        ├── summary: BotConfig (all steps combined)
        ├── backtestOption: boolean
        ├── backtestResult?: BacktestResult
        │     ├── totalTrades: number
        │     ├── winRate: number
        │     ├── totalPnL: number
        │     ├── maxDrawdown: number
        │     └── trades: SimulatedTrade[]
        ├── onStart: () → POST /api/bots (create + start)
        └── onSaveDraft: () → POST /api/bots (create, status=draft)

PRESET STRATEGIES:
  1. Martingale    — double stake on loss, reset on win
  2. Oscar's Grind — increase stake only after win streak
  3. DCA/Average   — same stake, lower average entry
  4. Fixed Stake   — consistent stake every trade
  5. Anti-Marting  — increase stake on win, decrease on loss
  6. Fibonacci     — stake follows Fibonacci sequence on losses
```

#### Advanced Features

```
1. AI STRATEGY ASSISTANT
   - Natural language -> strategy: "I want a bot that trades R_10 every 5 ticks
     and doubles stake on loss, max 5 steps"
   - AI generates config + script draft for review
   - User can edit before saving

2. STRATEGY MARKETPLACE IMPORT
   - Browse community strategies (with ratings, backtest results)
   - One-click import into bot creator
   - Auto-fills Step 2 and pre-populates Step 3 with sensible defaults

3. LIVE BACKTEST PREVIEW (STEP 4)
   - Run quick 30-day backtest inline before "Save & Start"
   - Show equity curve + key metrics in 5 seconds
   - "What-if" slider: change multiplier and re-run instantly

4. PARAMETER OPTIMIZER
   - "Optimize" button: grid search over parameter ranges
   - Finds best (multiplier, maxSteps, duration) combo for last 30 days
   - Shows top 5 parameter sets with their backtest metrics
   - User picks one or uses default

5. RISK SCENARIO SIMULATOR
   - Monte Carlo simulation: 1000 random trade sequences
   - Shows probability distribution of final balance
   - "Worst case 5%" / "Expected" / "Best case 5%" bands

6. STRATEGY TEMPLATES WITH VARIABLES
   - Templates support parameter injection
   - E.g. Martingale template exposes `multiplier`, `maxSteps`, `initialStake`
   - User edits via form, not code

7. DRAFT AUTO-SAVE & RESUME
   - Drafts auto-save every 30s to localStorage + server
   - Resume from any device
   - "Recent drafts" section on /dashboard/bots
```

#### Edge Cases & Error Handling

```
SCENARIO                              ACTION
─────────────────────────────────────────────────────────────────
User navigates back from Step 3       Preserve all entered data
                                      Show "Draft saved" toast

Symbol becomes unavailable mid-config Show warning on Step 1
                                      Offer "Choose similar symbol" suggestions

Strategy script has syntax error     Block Step 4 until resolved
                                      Show error line + suggestion

Backtest takes > 10s                  Show progress bar
                                      Allow "Skip backtest" with warning

Account disconnects during creation   Save as draft
                                      Show "Reconnect to start bot" notice

Parameter optimizer finds no winner  Suggest default params
                                      Explain why (e.g. "Insufficient data")

AI-generated script fails validation Show diff vs template
                                      Highlight what AI changed
                                      Require explicit approval
```

#### Performance Considerations

```
- Stepper component: lazy-load each step (don't render all 4)
- Strategy cards: precompute risk level badges
- Backtest runs in Web Worker (don't block UI)
- Parameter optimizer: stream results (show top-5 as found)
- Form validation: debounced (300ms) + on blur
- AI assistant: streaming response (token-by-token)
- Reduce bundle: Monaco Editor loaded only on /scripts
```

#### Testing Strategy

```
UNIT TESTS:
  - Stepper navigation: forward/back preserves state
  - Form validation rules per step
  - Risk calculation: max daily loss, cooldown trigger
  - Strategy parameter schema validation

INTEGRATION:
  - Save draft -> reload -> assert state restored
  - Run backtest -> assert result displayed
  - Start bot -> assert redirect to /dashboard/bots/:id

E2E:
  - Full flow: Basic Info -> Martingale -> $0.35 stake -> Backtest -> Start
  - Test AI assistant: type description -> assert config populated
  - Test parameter optimizer: run -> select top result -> start bot
```

#### Accessibility & UX Enhancements

```
- Stepper: role="navigation" + aria-current="step"
- Form fields: associated labels, error messages with aria-describedby
- Strategy cards: keyboard selectable (arrow keys + Enter)
- Backtest results: data table with proper scope/headers
- AI assistant: typing indicator + live region for streaming response
- Focus management: auto-focus first field of each step on entry
- "Review" step: read aloud summary via Web Speech API (optional)
- High-contrast form validation errors
```


---

### PAGE D-6: Script Editor (`/dashboard/scripts` & `/dashboard/scripts/:id`)

```
PURPOSE:
  Write, edit, test, and manage custom trading strategy 
  scripts in JavaScript. Sandboxed execution.

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  SCRIPTS LIST (when no script selected)                 │
│                                                          │
│  "Strategy Scripts"                    [+ New Script]   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 📜 martingale_v2.js          Last edited: 2h ago│   │
│  │ Used by: 2 bots | Runs: 1,234 | Win: 63%       │   │
│  │ [Edit] [Duplicate] [Delete]                     │   │
│  ├──────────────────────────────────────────────────┤   │
│  │ 📜 custom_rsi.js             Last edited: 1d ago│   │
│  │ Used by: 0 bots | Runs: 89 | Win: 58%          │   │
│  │ [Edit] [Duplicate] [Delete]                     │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  TEMPLATE LIBRARY:                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Martingale   │  │ RSI Strategy │  │ MACD Crossover│ │
│  │ [Use Template]│  │ [Use Template]│  │ [Use Template]│ │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘

SCRIPT EDITOR (when script selected):
┌─────────────────────────────────────────────────────────┐
│  martingale_v2.js  [💾 Save] [▶ Test] [📊 Backtest]   │
└─────────────────────────────────────────────────────────┘
┌──────────────────────────────┬──────────────────────────┐
│  MONACO EDITOR               │  SIDEBAR                │
│                              │                          │
│  1 │ // Martingale Strategy  │  📁 API Reference       │
│  2 │ // Custom parameters    │    ├── tick.price       │
│  3 │                        │    ├── tick.symbol       │
│  4 │ function onTick(tick) {│    ├── tick.epoch        │
│  5 │   const lastResult =   │    ├── balance           │
│  6 │     getLastResult();   │    ├── placeTrade()      │
│  7 │                        │    ├── getLastResult()    │
│  8 │   if (lastResult.win) {│    ├── getHistory()      │
│  9 │     stake = initStake;│    └── log()              │
│ 10 │   } else {             │                          │
│ 11 │     stake *= mult;    │  📁 Snippets              │
│ 12 │   }                    │    ├── Buy Rise/Fall     │
│ 13 │                        │    ├── Check RSI         │
│ 14 │   return {             │    ├── Check MA          │
│ 15 │     contract: 'RISE', │    └── Martingale Step    │
│ 16 │     stake: stake,     │                          │
│ 17 │     duration: 5,     │  📁 Variables             │
│ 18 │     durationUnit:'t' │    ├── initStake: 0.35   │
│ 19 │   };                  │    ├── multiplier: 2.0   │
│ 20 │ }                      │    └── maxSteps: 5       │
│ 21 │                        │                          │
│                              │  📁 Test Console        │
│                              │    > Running test...    │
│                              │    > Trade #1: RISE    │
│                              │    > Result: WIN +$0.35│
│                              │    > Trade #2: RISE    │
│                              │    > Result: LOSS -$0.35│
└──────────────────────────────┴──────────────────────────┘
```

#### Script Engine API Reference

```
AVAILABLE IN SANDBOX:

  onTick(tick: Tick): TradeDecision | null
    Called on every new tick. Return trade decision or null.

  onResult(result: TradeResult): void
    Called after each trade completes.

  onComplete(summary: SessionSummary): void
    Called when bot stops (take profit / stop loss hit).

CONTEXT FUNCTIONS:
  getLastResult(): TradeResult | null
  getHistory(limit: number): TradeResult[]
  getBalance(): number
  getOpenContracts(): Contract[]
  log(message: string): void

TRADE DECISION RETURN:
  {
    contract: 'CALL' | 'PUT' | 'DIGITOVER' | ...,
    stake: number,
    duration: number,
    durationUnit: 't' | 's' | 'm' | 'h' | 'd',
    barrier?: number,
    basis?: 'stake' | 'payout'
  }

TICK OBJECT:
  {
    price: number,
    symbol: string,
    epoch: number,
    pipSize: number
  }

TRADE RESULT:
  {
    win: boolean,
    profit: number,
    payout: number,
    buyPrice: number,
    sellPrice: number,
    contractType: string,
    entrySpot: number,
    exitSpot: number
  }

USER-DEFINED PARAMETERS:
  - Script can declare params with @param comments
  - These become editable fields in bot config
  - Example: /** @param {number} multiplier=2.0 Multiplier on loss */

SANDBOX SECURITY:
  - VM2 / isolated-vm for execution
  - No access to filesystem, network, process
  - Memory limit: 128MB
  - Execution timeout: 100ms per tick
  - Rate limit: max 1 trade per tick
```

#### Advanced Features

```
1. SCRIPT VERSION CONTROL
   - Git-like versioning: each save creates a commit
   - Diff viewer between versions
   - Rollback to any version
   - Branch + merge (advanced users)

2. SCRIPT TEMPLATES GALLERY
   - Categorized: trend following / mean reversion / scalping / hedging
   - "Fork" template -> edit -> save as new script
   - Community templates (with ratings + backtest benchmarks)

3. INLINE AI ASSISTANT
   - Type "//ai" -> describe what you want
   - AI suggests code snippet (Copilot-style)
   - Accept/reject suggestion
   - "Explain this function" right-click option

4. LIVE SCRIPT PROFILER
   - During test run: shows execution time per function
   - Hot spots highlighted in editor
   - Memory usage over time

5. SCRIPT DEPENDENCIES
   - Import other scripts as modules: `const ind = require('my_rsi.js')`
   - Versioned imports (lock to specific version)
   - Dependency graph visualization

6. DEBUGGER (BREAKPOINTS)
   - Set breakpoints in editor
   - Step through ticks (paused execution)
   - Inspect variables at each step
   - Conditional breakpoints (e.g. "stop if stake > $5")

7. TEST SUITE INTEGRATION
   - Write test cases in script: `// @test { scenario: '5 wins in a row' }`
   - Run all tests -> see pass/fail
   - CI: tests run on every script save
```

#### Edge Cases & Error Handling

```
SCENARIO                              ACTION
─────────────────────────────────────────────────────────────────
Script syntax error on save           Block save, show error gutter
                                      Red squiggly underlines
                                      Hover -> shows error message

Script timeout during test            Abort after 100ms/tick
                                      Show "Timeout at line N"
                                      Highlight infinite loop risk

Script uses forbidden API             Block save, show:
                                      "process.exit() is not allowed"
                                      List of forbidden APIs

Script imports missing module         Show "Module not found" error
                                      Offer to create stub

Script memory exceeds 128MB           Abort execution
                                      Show memory usage chart
                                      Suggest optimization

Bot currently using script            Warn on save: "3 bots use this script.
                                      Apply changes will reload them."
                                      Require explicit confirmation
```

#### Performance Considerations

```
- Monaco Editor: lazy-loaded, only on /scripts/:id
- Syntax highlighting: web worker (don't block main thread)
- Test run: sandboxed web worker (not main thread)
- Large scripts (> 1000 lines): enable virtualized scrolling
- Diff viewer: compute in worker
- AI assistant: streaming token response
- Auto-save: debounced 2s, save to IndexedDB
```

#### Testing Strategy

```
UNIT TESTS:
  - Script save -> assert version commit created
  - Rollback -> assert content reverts
  - Validation: forbidden APIs detected
  - Test runner executes sample script correctly

INTEGRATION:
  - Create script -> assign to bot -> start bot -> assert runs
  - Test breakpoint pauses execution at correct tick
  - Version diff -> assert correct changes shown

E2E:
  - Open editor -> type script -> save -> run test -> see results
  - Use AI assistant -> accept suggestion -> save
  - Rollback to previous version -> assert content reverted
```

#### Accessibility & UX Enhancements

```
- Monaco Editor: built-in screen reader support
- Keyboard shortcuts: documented in help overlay (? key)
- API reference sidebar: searchable, keyboard navigable
- Test console output: role="log" + aria-live
- High-contrast theme for editor
- "Reduce motion" disables cursor blink, smooth scroll
- Snippet insertion: keyboard accessible (Ctrl+Space)
```


---

### PAGE D-7: Automation Hub (`/dashboard/automation`)

```
PURPOSE:
  Central place for automation rules, scheduled tasks,
  conditional triggers, and notification rules.

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  "Automation Hub"                      [+ New Rule]     │
│  [Rules] [Schedules] [Triggers] [Notifications]         │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  AUTOMATION RULES                                       │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 🟢 Rule: "Stop all bots if balance drops 10%"  │   │
│  │ Condition: balance.change < -10%                │   │
│  │ Action: Stop all running bots                   │   │
│  │ Last triggered: 2 days ago                      │   │
│  │ [⏸ Pause] [Edit] [Delete]                       │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 🟢 Rule: "Start bot at market open"             │   │
│  │ Condition: market.forex.opens                   │   │
│  │ Action: Start "DCA Bot"                         │   │
│  │ Next trigger: Tomorrow 00:00 UTC                │   │
│  │ [⏸ Pause] [Edit] [Delete]                       │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 🟡 Rule: "Notify on 3 consecutive losses"       │   │
│  │ Condition: consecutiveLosses >= 3               │   │
│  │ Action: Send notification (email + push)        │   │
│  │ [▶ Enable] [Edit] [Delete]                      │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

SCHEDULES TAB:
┌─────────────────────────────────────────────────────────┐
│  SCHEDULED TASKS                                        │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ ⏰ Daily: Start Scalper Bot at 09:00 UTC        │   │
│  │ Stop at: 17:00 UTC                              │   │
│  │ Symbol: frxEURUSD                               │   │
│  │ Next run: Tomorrow 09:00 UTC                    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ ⏰ Weekly: Pause all bots on Saturday 00:00 UTC │   │
│  │ Resume: Monday 00:00 UTC                        │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

CREATE RULE MODAL:
┌─────────────────────────────────────────────────────────┐
│  New Automation Rule                                     │
│                                                          │
│  Name: [Stop on drawdown         ]                      │
│                                                          │
│  WHEN (Condition):                                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │ [balance ▼] [changes by ▼] [more than ▼] [-15%]│   │
│  │                                                  │   │
│  │ OR conditions:                                   │   │
│  │ [consecutiveLosses ▼] [equals ▼] [5           ] │   │
│  │ [+ Add condition]                               │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  THEN (Action):                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ [Stop bot ▼] [All bots ▼]                      │   │
│  │ [+ Add action]                                  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  [Cancel]  [Create Rule]                                │
└─────────────────────────────────────────────────────────┘
```

#### Automation Conditions & Actions

```
CONDITIONS:
  balance.change        → percentage or absolute change
  balance.below         → balance below threshold
  balance.above         → balance above threshold
  consecutiveLosses     → N losses in a row
  consecutiveWins       → N wins in a row
  trade.count           → total trades today
  trade.winRate         → win rate drops below X%
  market.opens          → market opens
  market.closes         → market closes
  time.ofDay            → specific time of day
  time.schedule         → cron schedule
  bot.profit            → bot reaches profit target
  bot.loss              → bot reaches loss limit
  price.above           → price above level
  price.below           → price below level

ACTIONS:
  bot.start             → start a specific bot
  bot.stop              → stop a specific bot
  bot.pause             → pause a specific bot
  bot.stopAll           → stop all running bots
  bot.pauseAll          → pause all running bots
  notification.email    → send email
  notification.push     → send push notification
  notification.webhook  → call webhook URL
  trade.closeAll        → close all open positions
  script.run            → execute a one-shot script
  log.message           → log message to activity

EVALUATION ENGINE:
  - Rules evaluated on every tick (debounced 1s)
  - Rules evaluated on every trade result
  - Rules evaluated on balance change
  - Rules evaluated on schedule (cron)
  - Action queue prevents concurrent execution
  - Failed actions retry 3 times with backoff
```

#### Advanced Features

```
1. VISUAL RULE BUILDER (FLOWCHART)
   - Drag-and-drop nodes: trigger -> condition -> action
   - Branch with "if/else" nodes
   - Multi-condition AND/OR logic
   - Export as JSON or share URL

2. RULE TEMPLATES LIBRARY
   - Pre-built rules for common scenarios:
     - "Stop all bots on 20% drawdown"
     - "Start scalper at market open, stop at close"
     - "Notify on 3 consecutive losses"
     - "Pause bot if win rate < 50% over 20 trades"
   - One-click install + customize

3. RULE CHAINING
   - Rule A's action can trigger Rule B
   - Visual chain diagram showing dependencies
   - Loop detection (prevent infinite chains)

4. DRY-RUN MODE
   - Test rule without executing actions
   - Shows "Would have triggered X times in last 7 days"
   - Logs what would have happened

5. RULE ANALYTICS
   - Per-rule: trigger count, last triggered, action success rate
   - Identify rules that never fire (delete candidates)
   - Identify rules that fire too often (tighten conditions)

6. CALENDAR VIEW
   - Visual calendar of scheduled tasks
   - Drag to reschedule
   - Conflict detection (two rules firing same time)

7. WEBHOOK INTEGRATIONS
   - Trigger external systems (Slack, Discord, Zapier)
   - Receive webhooks (e.g. TradingView alerts -> trigger rule)
```

#### Edge Cases & Error Handling

```
SCENARIO                              ACTION
─────────────────────────────────────────────────────────────────
Rule action fails (bot already stopped) Log + continue, don't retry
                                         Notify user (warning, not error)

Rule creates infinite loop              Loop detector kills after 5 cycles
                                         Disable rule, alert user

Two rules conflict (stop + start same bot) Last-write-wins + warning
                                         Suggest merging rules

Cron schedule missed (server down)       Catch-up mode: run once on restart
                                         Don't pile up missed runs

Rule references deleted bot              Auto-disable rule
                                         Show "Bot no longer exists" notice

Webhook delivery fails (3x)              Mark rule as degraded
                                         Pause future triggers
                                         Notify user
```

#### Performance Considerations

```
- Rule evaluation: debounced (1s) per rule type
- Bulk evaluate: process all rules in single pass per event
- Cron: use BullMQ scheduler, not setInterval
- Webhook calls: async queue with backpressure
- Rule analytics: precompute daily in batch job
- Calendar view: paginate by month
```

#### Testing Strategy

```
UNIT TESTS:
  - Rule evaluator: each condition type tested
  - Action executor: each action type tested
  - Loop detection: triggers on cyclic chain
  - Cron parser: handles all cron expressions

INTEGRATION:
  - Create rule -> trigger condition -> assert action executed
  - Schedule task -> wait -> assert fires
  - Webhook send -> mock endpoint -> assert payload correct

E2E:
  - Create "stop on drawdown" rule -> simulate drawdown -> bot stops
  - Dry-run -> shows hypothetical triggers
  - Calendar -> drag task -> assert rescheduled
```

#### Accessibility & UX Enhancements

```
- Visual rule builder: keyboard-accessible (tab between nodes)
- Rule list: sortable, filterable via keyboard
- Calendar: arrow-key navigation between days
- Status badges: include text (Active/Paused/Error)
- Action buttons: large tap targets
- Reduced motion: instant node transitions
- Drag-and-drop: keyboard alternative (cut/paste via menu)
```


---

### PAGE D-8: Portfolio / Positions (`/dashboard/portfolio`)

```
PURPOSE:
  View all open and closed positions.
  Account balance, trade history, profit table.

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  PORTFOLIO HEADER                                       │
│  Balance: $1,042.30  |  Today P&L: +$42.30 ▲          │
│  [Open Positions] [Trade History] [Profit Table]         │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  OPEN POSITIONS TAB                                     │
│  ┌──────┬────────┬────────┬──────┬──────┬──────┬─────┐ │
│  │ ID   │ Symbol │ Type   │Entry │Current│ P&L  │Act  │ │
│  ├──────┼────────┼────────┼──────┼──────┼──────┼─────┤ │
│  │#1234 │R_10   │Rise 5t│4532  │4535  │+$1.95│[Sell]│ │
│  │#1235 │EURUSD │Fall 1m│1.0842│1.0838│+$0.30│[Sell]│ │
│  │#1236 │BTCUSD │Rise 5m│67432 │67380 │-$0.80│[Sell]│ │
│  └──────┴────────┴────────┴──────┴──────┴──────┴─────┘ │
│                                                          │
│  Total Open: 3 | Total Investment: $3.15 | P&L: +$1.45 │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  TRADE HISTORY TAB                                      │
│  [Date ▼] [Symbol ▼] [Bot ▼] [Result ▼] [Export CSV]  │
│  ┌──────┬────────┬────────┬──────┬──────┬──────┬─────┐ │
│  │Date  │Symbol │ Type   │Stake │Payout│ P&L  │ Bot │ │
│  ├──────┼────────┼────────┼──────┼──────┼──────┼─────┤ │
│  │12:01 │R_10   │Rise 5t│$0.35 │$0.70 │+$0.35│Mart │ │
│  │12:00 │R_10   │Rise 5t│$0.35 │$0.00 │-$0.35│Mart │ │
│  │11:59 │R_10   │Rise 5t│$0.35 │$0.70 │+$0.35│Mart │ │
│  │...   │       │       │      │      │      │     │ │
│  └──────┴────────┴────────┴──────┴──────┴──────┴─────┘ │
│                                                          │
│  Pagination: [< 1 2 3 ... 156 >]                       │
└─────────────────────────────────────────────────────────┘
```

#### Components Breakdown

```
PortfolioPage/
  ├── PortfolioHeader
  │     ├── balance: number (real-time via WebSocket)
  │     ├── todayPnL: number
  │     └── currency: string
  │
  ├── OpenPositions
  │     ├── positions: Position[]
  │     │     ├── contractId: string
  │     │     ├── symbol: string
  │     │     ├── contractType: string
  │     │     ├── entrySpot: number
  │     │     ├── currentSpot: number
  │     │     ├── pnl: number
  │     │     ├── buyPrice: number
  │     │     └── isExpired: boolean
  │     ├── onSell: (contractId) → sell API
  │     └── subscription: proposal_open_contract stream
  │
  ├── TradeHistory
  │     ├── trades: Trade[]
  │     │     ├── date: Date
  │     │     ├── symbol: string
  │     │     ├── contractType: string
  │     │     ├── stake: number
  │     │     ├── payout: number
  │     │     ├── pnl: number
  │     │     └── botName?: string
  │     ├── filters: TradeFilters
  │     ├── pagination: Pagination
  │     └── onExport: () → CSV download
  │
  └── ProfitTable
        ├── data: ProfitEntry[] (from profit_table API)
        ├── dateRange: { from: Date, to: Date }
        └── summary: { totalProfit, totalLoss, netPnL }

DERIV API CALLS:
  - balance (subscribe): real-time balance updates
  - proposal_open_contract (subscribe): open position updates
  - statement: transaction history
  - profit_table: profit/loss history
```

#### Advanced Features

```
1. REALIZED vs UNREALIZED P&L BREAKDOWN
   - Separate columns for realized (closed trades) and unrealized (open)
   - Tax lot view: which trades contributed to realized P&L
   - Export as CSV for tax reporting

2. POSITION GROUPING
   - Group by: symbol, bot, strategy, day, week
   - Subtotals per group
   - Collapse/expand groups

3. ADVANCED FILTERS
   - Filter by: profit range, duration, win/loss, bot, symbol, date range
   - Save filter presets
   - Quick filter chips: "Winning trades", "Losses > $5", "Today"

4. RISK METRICS PANEL
   - Current exposure: total $ at risk across open positions
   - Correlation matrix: are open positions correlated?
   - VaR (Value at Risk): 95% confidence, 1-day horizon

5. TRADE EXPORT & API
   - Export to: CSV, JSON, Google Sheets (live sync)
   - Public read-only API key for portfolio tracking
   - Webhook on new closed trade

6. DIVIDEND / SWAP TRACKING (for forex positions)
   - Track overnight swap costs
   - Include in P&L calculations

7. TAX LOSS HARVESTING HELPER
   - Identify losing trades that can offset gains
   - Suggest optimal closing order
   - Generate tax report (region-aware)
```

#### Edge Cases & Error Handling

```
SCENARIO                              ACTION
─────────────────────────────────────────────────────────────────
Balance WS disconnects                 Show last-known + warning badge
                                       Don't show $0 (misleading)

Open contract expires (no sell)        Auto-move to Trade History
                                       Realize P&L

Sell API fails                         Retry 3x with backoff
                                       If still failing: keep in Open
                                       Show "Sell failed, retry?" button

Statement API pagination (1000s rows)  Infinite scroll, not pagination
                                       Lazy-load on scroll

Profit table returns empty             Show friendly empty state:
                                       "No trades in this period"

Multi-currency positions                Convert to user's base currency
                                       Show original + converted
                                       Exchange rate timestamp noted
```

#### Performance Considerations

```
- Table virtualization (react-window) for > 100 rows
- Column sorting: server-side for large datasets
- Filter debounced (300ms)
- Real-time updates batched (10/s max)
- Export: stream to file (don't load all in memory)
- Cache statement/profit_table in Redis (5 min TTL)
```

#### Testing Strategy

```
UNIT TESTS:
  - Filter logic for each filter type
  - Grouping subtotals calculation
  - Realized vs unrealized split
  - Export CSV format correctness

INTEGRATION:
  - Subscribe to open contracts -> assert UI updates
  - Sell position -> assert removed from open, added to history
  - Filter changes -> assert URL params update (shareable)

E2E:
  - Open trade -> see in Open Positions -> wait for expiry -> see in History
  - Export CSV -> download -> assert contents
  - Apply filter -> URL updates -> refresh -> filter persists
```

#### Accessibility & UX Enhancements

```
- Table: proper thead/tbody, scope="col" on headers
- Sortable headers: button + aria-sort attribute
- Filter chips: keyboard removable
- Inline sell buttons: aria-label="Sell contract #1234, current P&L +$0.50"
- Empty state: clear illustration + CTA
- Large numbers: locale-aware formatting (1,234.56 vs 1.234,56)
```


---

### PAGE D-9: Social / User Monitoring (`/dashboard/social`)

```
PURPOSE:
  Monitor other platform users. View their bots, 
  performance, and activity. Follow/copy traders.

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  "Social Trading"                                      │
│  [Leaderboard] [Following] [Activity Feed] [Copy Trade] │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  LEADERBOARD TAB                                       │
│                                                          │
│  [Today ▼] [This Week] [This Month] [All Time]         │
│                                                          │
│  ┌────┬──────────┬────────┬─────────┬──────┬─────────┐ │
│  │Rank│ Trader   │ Win %  │ Total P&L│Trades│ Action  │ │
│  ├────┼──────────┼────────┼─────────┼──────┼─────────┤ │
│  │ 🥇 │BotMaster │ 78%    │ +$1,234 │ 2.3k │[Follow] │ │
│  │ 🥈 │TradeKing │ 72%    │ +$890   │ 1.8k │[Follow] │ │
│  │ 🥉 │CryptoApe │ 69%    │ +$567   │ 956  │[Follow] │ │
│  │ 4  │FXWizard  │ 65%    │ +$345   │ 2.1k │[Follow] │ │
│  │ 5  │R10King   │ 63%    │ +$234   │ 4.5k │[Follow] │ │
│  │... │          │        │         │      │         │ │
│  └────┴──────────┴────────┴─────────┴──────┴─────────┘ │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  FOLLOWING TAB                                          │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 👤 BotMaster                     [Unfollow] [⚙]  │   │
│  │    Win: 78% | P&L: +$1,234 | Bots: 3 running   │   │
│  │    Last trade: R_10 Rise → WIN +$0.70 (2m ago)  │   │
│  │                                                  │   │
│  │    ┌────────────────────────────────────────┐    │   │
│  │    │ [P&L chart - last 30 days]             │    │   │
│  │    └────────────────────────────────────────┘    │   │
│  │                                                  │   │
│  │    Recent Activity:                              │   │
│  │    • Started "Martingale Bot" on R_10 (5m ago)  │   │
│  │    • Won trade on R_100: +$1.95 (12m ago)       │   │
│  │    • Stopped "Scalper Bot" (1h ago)             │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  ACTIVITY FEED TAB                                      │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 👤 BotMaster won +$1.95 on R_10 Rise (2m ago)  │   │
│  │ 👤 TradeKing started "DCA Bot" on EURUSD (5m)  │   │
│  │ 👤 CryptoApe lost -$0.35 on BTCUSD Fall (8m)  │   │
│  │ 👤 FXWizard won +$3.50 on R_75 Even (12m ago) │   │
│  │ ...                                              │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

#### Copy Trade Feature

```
COPY TRADE MODAL:
┌─────────────────────────────────────────────────────────┐
│  Copy Trade Settings for BotMaster                       │
│                                                          │
│  Copy Mode:                                             │
│  ○ Proportional  — Match their stake as % of balance    │
│  ○ Fixed Amount  — Use your own fixed stake             │
│  ○ Same Stake    — Copy exact stake amount              │
│                                                          │
│  Max Stake Per Trade: [$10.00     ]                     │
│  Max Daily Copy Trades: [20          ]                  │
│  Copy Only These Symbols: [All ▼] or [R_10, frxEURUSD] │
│  Copy Only These Bots: [All ▼] or [Martingale Bot]     │
│                                                          │
│  Risk Limits:                                           │
│  Max Daily Copy Loss: [$50          ]                   │
│  Stop Copying If Their Win Rate Below: [50%       ]     │
│                                                          │
│  [Cancel]  [Start Copying]                              │
└─────────────────────────────────────────────────────────┘
```

#### Components & Data Model

```
SocialPage/
  ├── Leaderboard
  │     ├── traders: TraderRanking[]
  │     │     ├── userId: string
  │     │     ├── username: string
  │     │     ├── avatar: string
  │     │     ├── winRate: number
  │     │     ├── totalPnL: number
  │     │     ├── totalTrades: number
  │     │     ├── isFollowing: boolean
  │     │     └── isPrivate: boolean
  │     ├── period: "today" | "week" | "month" | "all"
  │     └── onFollow: (userId) → POST /api/social/follow
  │
  ├── FollowingList
  │     ├── following: FollowedTrader[]
  │     │     ├── ...TraderRanking fields
  │     │     ├── activeBots: number
  │     │     ├── recentActivity: Activity[]
  │     │     ├── pnlChart: ChartData[]
  │     │     └── copySettings?: CopyTradeSettings
  │     └── onConfigureCopy: (userId) → CopyTradeModal
  │
  ├── ActivityFeed
  │     ├── activities: SocialActivity[]
  │     │     ├── userId: string
  │     │     ├── username: string
  │     │     ├── avatar: string
  │     │     ├── type: "trade_won" | "trade_lost" | "bot_started" | "bot_stopped"
  │     │     ├── details: string
  │     │     └── timestamp: Date
  │     └── realTime: Socket.IO subscription
  │
  └── CopyTradeModal
        ├── targetUserId: string
        ├── settings: CopyTradeSettings
        │     ├── mode: "proportional" | "fixed" | "same"
        │     ├── maxStakePerTrade: number
        │     ├── maxDailyCopyTrades: number
        │     ├── symbolFilter: string[]
        │     ├── botFilter: string[]
        │     ├── maxDailyCopyLoss: number
        │     └── minWinRateThreshold: number
        └── onStart: () → POST /api/social/copy-trade

PRIVACY:
  - Users can set profile to private
  - Private users: only show username, not trade details
  - Opt-in to leaderboard
  - Can hide specific bots from social view
  - GDPR: data deletion request

COPY TRADE ENGINE:
  - When followed user places a trade via bot
  - System checks copy trade settings for each follower
  - Applies filters (symbol, bot, limits)
  - Executes same trade on follower's Deriv account
  - Records copy trade linkage in DB
  - Real-time via Socket.IO between trader instances
```

#### Advanced Features

```
1. TRADER PROFILE PAGES
   - Public profile: bio, strategy description, verified track record
   - Performance: 7d/30d/90d/all-time returns
   - Trade history (if public): last 50 trades
   - "Ask me anything" Q&A section

2. COPY TRADE PERFORMANCE TRACKING
   - For each copied trader: track YOUR returns from copying them
   - Compare: if you'd copied trader X 30 days ago, you'd be +12%
   - Attribution: which of their bots contributed most to your gains

3. SOCIAL SIGNALS
   - "Trending traders" (most followed this week)
   - "Hot strategies" (most copied scripts)
   - "Rising stars" (new traders with strong early performance)

4. TRADER VERIFICATION SYSTEM
   - Verified track record (Deriv API confirmed)
   - KYC badge (identity verified)
   - "Pro" badge (meets performance criteria)
   - Prevents fake track records

5. PRIVATE TRADING GROUPS
   - Create invite-only groups
   - Share strategies within group
   - Group leaderboard
   - Group chat (real-time)

6. COPILOT CHAT
   - DM other traders (opt-in)
   - Share charts / trade ideas
   - Block / report spam

7. SOCIAL SENTIMENT INDEX
   - Aggregate all trader positions per symbol
   - "Bullish/Bearish sentiment: R_10 = 73% bullish"
   - Sentiment change alerts
```

#### Edge Cases & Error Handling

```
SCENARIO                              ACTION
─────────────────────────────────────────────────────────────────
Followed user deletes account          Remove from Following list
                                       Stop copy trades gracefully
                                       Notify user

Followed user goes private             Keep historical data
                                       Stop new copy trades
                                       Show "Trader is now private" notice

Copy trade fails (insufficient balance) Skip trade, notify user
                                       Pause copy trading if balance < threshold

Leaderboard manipulation detected      Flag user for review
                                       (e.g. wash trading patterns)
                                       Hide from leaderboard pending review

Trader blocks you                       Hide their profile from search
                                       Stop following if active

Inappropriate content in profile        Report button -> moderation queue
                                       Auto-hide pending review
```

#### Performance Considerations

```
- Leaderboard: precompute daily, cache in Redis (5 min TTL)
- Activity feed: paginate, infinite scroll
- Following list: lazy-load P&L charts (only visible ones)
- Copy trade execution: priority queue (must be fast)
- Real-time updates: Socket.IO room per user (only their follows)
- Trader profile: cache for 1 min
```

#### Testing Strategy

```
UNIT TESTS:
  - Leaderboard sorting + period filtering
  - Follow/unfollow state management
  - Copy trade settings validation
  - Privacy rules enforced

INTEGRATION:
  - Follow trader -> assert appears in Following
  - Trader places trade -> assert copy executes
  - Privacy toggle -> assert profile hides

E2E:
  - Browse leaderboard -> follow trader -> see in Following -> unfollow
  - Set up copy trade -> wait for leader trade -> assert copied
```

#### Accessibility & UX Enhancements

```
- Trader cards: role="article" + descriptive aria-label
- Leaderboard: proper table semantics with rank as row header
- Follow button: aria-pressed state
- Activity feed: role="feed" + aria-live="polite"
- Avatars: alt text with trader name
- Color: never sole indicator of win/loss (use up/down arrows too)
- Profile pages: keyboard navigable tabs
```


---

### PAGE D-10: Analytics / Performance (`/dashboard/analytics`)

```
PURPOSE:
  Detailed performance analytics.
  Charts, statistics, trade analysis.

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  "Performance Analytics"                                │
│  [Overview] [By Bot] [By Market] [By Strategy]          │
│  Date Range: [Last 7 days ▼]  [Custom range]           │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  OVERVIEW TAB                                           │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Total P&L    │  │ Win Rate     │  │ Avg Trade    │  │
│  │ +$142.30     │  │ 64.2%        │  │ +$0.28       │  │
│  │ ▲ +12% vs    │  │ ▲ +3% vs    │  │ ▲ +$0.05 vs  │  │
│  │ last period  │  │ last period  │  │ last period  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ P&L Over Time (area chart)                       │   │
│  │                                                  │   │
│  │  $150┤          ╭────╮                           │   │
│  │  $100┤    ╭────╯    ╰──╮                        │   │
│  │   $50┤ ╭─╯            ╰──╮                      │   │
│  │    $0┤─╯                  ╰──                   │   │
│  │   -$50┤                        ╰╮              │   │
│  │      └──┬──┬──┬──┬──┬──┬──┬──┬──┬──          │   │
│  │        Mon Tue Wed Thu Fri Sat Sun Mon Tue      │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌────────────────────┬─────────────────────────────┐   │
│  │ Win/Loss by Hour   │  Trade Distribution         │   │
│  │ (heatmap)          │  (by symbol pie chart)      │   │
│  └────────────────────┴─────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Key Metrics:                                     │   │
│  │ • Max Drawdown: -$32.40 (-3.2%)                 │   │
│  │ • Sharpe Ratio: 1.42                            │   │
│  │ • Profit Factor: 1.85                           │   │
│  │ • Avg Win: +$0.52 | Avg Loss: -$0.38           │   │
│  │ • Best Trade: +$12.40 | Worst: -$5.60          │   │
│  │ • Longest Win Streak: 12                        │   │
│  │ • Longest Loss Streak: 5                       │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

#### Components Breakdown

```
AnalyticsPage/
  ├── DateRangeSelector
  │     ├── preset: "today" | "7d" | "30d" | "90d" | "custom"
  │     └── customRange: { from: Date, to: Date }
  │
  ├── OverviewTab
  │     ├── summaryCards: SummaryCard[]
  │     ├── pnlChart: AreaChart
  │     ├── heatmap: HourDayHeatmap (win rate by hour)
  │     ├── distribution: PieChart (trades by symbol)
  │     └── keyMetrics: MetricRow[]
  │
  ├── ByBotTab
  │     ├── botPerformance: BotPerformance[]
  │     │     ├── botName: string
  │     │     ├── totalPnL: number
  │     │     ├── winRate: number
  │     │     ├── totalTrades: number
  │     │     ├── avgPnL: number
  │     │     └── pnlChart: LineChart
  │     └── comparisonChart: MultiLineChart
  │
  ├── ByMarketTab
  │     ├── marketPerformance: MarketPerformance[]
  │     └── symbolBreakdown: BarChart
  │
  └── ByStrategyTab
        ├── strategyPerformance: StrategyPerformance[]
        └── strategyComparison: RadarChart

DATA SOURCE:
  - profit_table API (Deriv)
  - Internal bot_logs table
  - Aggregated and cached in Redis
  - Refreshed on demand or every 5 minutes
```

#### Advanced Features

```
1. CUSTOM DASHBOARD BUILDER
   - Drag-and-drop widget builder
   - Choose from 20+ widget types
   - Save layouts per user
   - Share layouts with team

2. ADVANCED METRICS
   - Sharpe ratio, Sortino ratio, Calmar ratio
   - Maximum drawdown + recovery time
   - Profit factor, expectancy, R-multiple
   - Win/loss streak analysis
   - Trade duration distribution

3. ATTRIBUTION ANALYSIS
   - Which bot contributed most to P&L?
   - Which market/strategy was most profitable?
   - Time-of-day heatmap: when do you win most?
   - Day-of-week analysis

4. BENCHMARK COMPARISON
   - Compare your performance vs:
     - Buy & hold (if applicable)
     - Other platform users (anonymized)
     - Your past periods
   - Overlay equity curves

5. TRADE JOURNAL
   - Per-trade notes + emotion tags
   - Screenshot attachments
   - Search/filter journal
   - Insights: "Your best trades had emotion tag 'Calm'"

6. PREDICTIVE ANALYTICS
   - "Based on last 30 days, projected month-end P&L: +$120 +/- $40"
   - Confidence intervals
   - Trend analysis with warnings

7. EXPORTABLE REPORTS
   - Weekly/Monthly PDF reports
   - Custom date ranges
   - White-label option (for fund managers)
   - Schedule recurring email reports

8. ALERTING ON METRICS
   - "Notify me if Sharpe ratio drops below 1.0"
   - "Alert if drawdown exceeds 5%"
   - Email + push + webhook
```

#### Edge Cases & Error Handling

```
SCENARIO                              ACTION
─────────────────────────────────────────────────────────────────
No trades in selected period          Show "No data" empty states
                                      Don't render empty charts (misleading)

Metrics calculation error (divide by 0) Show "N/A" instead of Infinity
                                      Log to Sentry

Custom dashboard save fails           Retry with backoff
                                      Preserve layout in localStorage

PDF export fails (large dataset)      Chunk into multiple PDFs
                                      Or limit to top N entries
                                      Show progress bar

Date range > 1 year                    Warn: "May be slow"
                                      Offer to sample or aggregate
```

#### Performance Considerations

```
- Heavy aggregations: precompute daily, store in analytics_summary table
- Charts: use Recharts only for < 1000 points, else canvas (uPlot)
- Date range picker: prevent ranges > 90 days without confirmation
- Custom dashboard: lazy-load widgets
- PDF export: server-side rendering (puppeteer) in queue
- Web Worker for metric calculations
```

#### Testing Strategy

```
UNIT TESTS:
  - Each metric calculation tested with known inputs
  - Date range filtering correctness
  - Attribution math correctness
  - Custom dashboard save/load

INTEGRATION:
  - Fetch analytics -> assert correct data shape
  - Schedule PDF report -> assert email sent with attachment

E2E:
  - Select date range -> switch tabs -> export PDF -> verify download
  - Build custom dashboard -> save -> reload -> assert preserved
```

#### Accessibility & UX Enhancements

```
- All charts: text alternative (data table toggle)
- Color palette: colorblind-safe (viridis, cividis)
- Metric cards: aria-label with full description
- Date picker: keyboard navigable calendar
- Custom dashboard widgets: keyboard movable (drag handle)
- Number formatting: locale-aware
- Reduced motion: disable chart animations
```


---

### PAGE D-11: API Connections (`/dashboard/connections`)

```
PURPOSE:
  Manage Deriv account connections.
  Add/remove accounts, view connection status, token management.

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  "API Connections"                      [+ Connect Deriv]│
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  CONNECTED ACCOUNTS                                     │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ ✅ Deriv Account: CR1234567                      │   │
│  │    Currency: USD | Balance: $1,042.30            │   │
│  │    Connected: Jan 15, 2024                      │   │
│  │    Last activity: 2 minutes ago                  │   │
│  │    Status: 🟢 Active                             │   │
│  │                                                  │   │
│  │    Permissions: ✓ Read ✓ Trade ✓ Payments        │   │
│  │                                                  │   │
│  │    [Test Connection] [Refresh Token] [Disconnect] │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ ✅ Deriv Account: CR7654321                      │   │
│  │    Currency: EUR | Balance: €520.00              │   │
│  │    Connected: Feb 01, 2024                      │   │
│  │    Status: 🟡 Idle (no active bots)              │   │
│  │                                                  │   │
│  │    [Test Connection] [Refresh Token] [Disconnect] │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  CONNECTION LOG                                         │
│  ┌──────┬──────────────┬─────────┬────────────────────┐ │
│  │ Time │ Account      │ Event   │ Details            │ │
│  ├──────┼──────────────┼─────────┼────────────────────┤ │
│  │ 12:01│ CR1234567   │ Trade   │ Buy R_10 Rise $0.35│ │
│  │ 12:00│ CR1234567   │ Auth    │ Token refreshed    │ │
│  │ 11:30│ CR7654321   │ Connect │ WebSocket opened   │ │
│  └──────┴──────────────┴─────────┴────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

#### Components & Implementation

```
ConnectionsPage/
  ├── ConnectDerivButton
  │     └── onClick → Deriv OAuth redirect
  │
  ├── ConnectedAccount[]
  │     ├── derivLoginId: string
  │     ├── currency: string
  │     ├── balance: number
  │     ├── connectedAt: Date
  │     ├── lastActivity: Date
  │     ├── status: "active" | "idle" | "error" | "expired"
  │     ├── permissions: string[]
  │     ├── onTest: () → ping WebSocket
  │     ├── onRefresh: () → re-authorize via OAuth
  │     └── onDisconnect: () → DELETE /api/connections/{id}
  │
  └── ConnectionLog
        ├── logs: ConnectionLog[]
        │     ├── timestamp: Date
        │     ├── accountId: string
        │     ├── event: string
        │     └── details: string
        └── pagination

DERIV OAUTH SCOPES REQUESTED:
  - read:      Read account info, balance, transactions
  - trade:     Place trades, buy/sell contracts
  - payments:  Deposit/withdraw (optional, may skip)
  - admin:     Account settings (optional)

TOKEN MANAGEMENT:
  - Tokens encrypted with AES-256-GCM before storage
  - Encryption key from environment variable
  - Token refresh: redirect through OAuth again
  - Auto-detect expired tokens on WebSocket error
  - Prompt re-connection when token expires
```

#### Advanced Features

```
1. ACCOUNT GROUPING
   - Tag accounts: "Personal", "Fund A", "Test"
   - Filter by tag
   - Bulk actions on group

2. PERMISSION PRESETS
   - "Read-only" (read scope only)
   - "Trader" (read + trade)
   - "Full access" (read + trade + payments + admin)
   - Apply preset on connect or update existing

3. HEALTH MONITORING
   - Per-account: WS latency, API error rate, last successful call
   - Auto-disable account if 5 consecutive failures
   - Alert user via notification

4. USAGE STATISTICS
   - API calls per account (last 24h / 7d / 30d)
   - Rate limit usage (X / Y calls per minute)
   - Cost projection (if paid API tier)

5. ACCOUNT SWITCHER (GLOBAL)
   - Top bar dropdown to switch active account
   - All dashboard pages respect active account
   - Per-account UI state preserved

6. TOKEN ROTATION AUTOMATION
   - Auto-refresh tokens before expiry (24h before)
   - Failover: if refresh fails, alert + pause bots using that account
   - Audit log of all token rotations

7. MULTI-REGION SUPPORT
   - Connect to Deriv EU / Deriv International / Deriv ME
   - Region-aware routing
   - Compliance: don't mix regions (regulatory)
```

#### Edge Cases & Error Handling

```
SCENARIO                              ACTION
─────────────────────────────────────────────────────────────────
Token expired mid-session              Auto-attempt refresh
                                      If refresh fails: pause bots, alert user
                                      Show "Reconnect" CTA prominently

OAuth redirect fails                  Show error page with retry
                                      Don't leave user in limbo state

Account suspended by Deriv            Detect via API error
                                      Mark account as "Suspended"
                                      Stop all bots using account
                                      Don't auto-retry (manual action needed)

WS disconnects (network)              Auto-reconnect with backoff
                                      Buffer trades during disconnect
                                      On reconnect: sync missed events

Two users try same Deriv account      First-come-first-served
                                      Second user gets "Account in use" notice
                                      (unless team feature enabled)
```

#### Performance Considerations

```
- Connection log: paginate (50 per page)
- Health checks: every 30s (debounced)
- Token refresh: batch if multiple accounts expire same day
- WebSocket: share connection per account (not per bot)
```

#### Testing Strategy

```
UNIT TESTS:
  - Permission presets correctly map to scopes
  - Token rotation timing logic
  - Account status state machine

INTEGRATION:
  - Connect Deriv (mock OAuth) -> assert account appears
  - Disconnect -> assert bots paused + account removed
  - Token expiry -> assert refresh attempt

E2E:
  - Full OAuth flow (test Deriv account)
  - Switch active account -> assert dashboard updates
  - Health check failure -> assert account disabled
```

#### Accessibility & UX Enhancements

```
- Account cards: role="article" + status in aria-label
- Status badges: text + color (Active, Idle, Error)
- Connect button: large, descriptive label
- Permission checkboxes: properly grouped + labeled
- Token refresh action: keyboard accessible
```


---

### PAGE D-12: Settings / Profile (`/dashboard/settings`)

```
PURPOSE:
  User profile, security settings, preferences,
  notification settings, and 2FA setup.

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  "Settings"                                             │
│  [Profile] [Security] [Notifications] [Preferences]     │
│  [Danger Zone]                                          │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  PROFILE TAB                                            │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Avatar: [📷 Upload]                              │   │
│  │ Username: [BotMaster42    ]                      │   │
│  │ Email: user@example.com (✅ verified)            │   │
│  │ Timezone: [UTC ▼]                                │   │
│  │                                                  │   │
│  │ Social Profile:                                  │   │
│  │ ☐ Show on leaderboard                            │   │
│  │ ☐ Show trading activity                          │   │
│  │ ☐ Allow copy trading                             │   │
│  │                                                  │   │
│  │ [Save Changes]                                   │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  SECURITY TAB                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Change Password:                                 │   │
│  │ Current: [__________]                            │   │
│  │ New:     [__________]                            │   │
│  │ Confirm: [__________]                            │   │
│  │ [Update Password]                                │   │
│  ├──────────────────────────────────────────────────┤   │
│  │ Two-Factor Authentication:                       │   │
│  │ Status: ❌ Not enabled                           │   │
│  │ [Enable 2FA] → Shows QR code for authenticator   │   │
│  │                                                  │   │
│  │ Backup Codes: (generated on enable)              │   │
│  │ [View Backup Codes] [Regenerate]                 │   │
│  ├──────────────────────────────────────────────────┤   │
│  │ Active Sessions:                                 │   │
│  │ 🟢 Chrome / Windows / Current session            │   │
│  │ ⚪ Safari / iPhone / Last seen: 2h ago           │   │
│  │ [Revoke all other sessions]                      │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  NOTIFICATIONS TAB                                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Email Notifications:                             │   │
│  │ ☐ Trade completed                               │   │
│  │ ☐ Bot started/stopped                           │   │
│  │ ☐ Daily summary                                 │   │
│  │ ☐ Risk alert (drawdown, stop loss hit)           │   │
│  │ ☐ New follower                                  │   │
│  │                                                  │   │
│  │ Push Notifications:                              │   │
│  │ ☐ Trade completed                               │   │
│  │ ☐ Bot status change                             │   │
│  │ ☐ Risk alerts                                   │   │
│  │                                                  │   │
│  │ Webhook URL: [https://...]                       │   │
│  │ [Save]                                           │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  DANGER ZONE TAB                                        │
│  ┌──────────────────────────────────────────────────┐   │
│  │ ⚠️ Delete Account                                │   │
│  │ This will permanently delete your DerivX account.│   │
│  │ Your Deriv account will NOT be affected.         │   │
│  │ All bots will be stopped. All data deleted.      │   │
│  │ [Delete Account] → confirmation modal            │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

#### Advanced Features

```
1. PROFILE CUSTOMIZATION
   - Custom avatar (upload or generate from initials)
   - Bio + trading style description
   - Social links (Twitter, Discord, TradingView)
   - Verified trader badge (if eligible)

2. SECURITY DASHBOARD
   - Login history (last 30 days, with location/device)
   - Active sessions with revoke button
   - Password strength meter
   - 2FA backup codes (one-time view + regenerate)
   - API key management (for personal API access)

3. NOTIFICATION RULES BUILDER
   - Per-event-type: email / push / webhook / none
   - Quiet hours: don't notify between 22:00-08:00 (configurable)
   - Severity filter: only notify on errors, not info
   - Custom notification sounds

4. PREFERENCES SYNCHRONIZATION
   - Sync settings across devices (theme, timezone, formatting)
   - Export/import preferences as JSON
   - Reset to defaults button

5. BILLING & SUBSCRIPTION
   - Plan info (Free / Pro / Enterprise)
   - Usage this billing cycle
   - Payment method management
   - Invoice history download

6. DEVELOPER SETTINGS
   - API key generation
   - Webhook URL configuration
   - Rate limit display
   - Sandbox mode toggle (paper trading)

7. LOCALIZATION
   - Language selector (i18n)
   - Number/date format preference
   - Currency display preference
```

#### Edge Cases & Error Handling

```
SCENARIO                              ACTION
─────────────────────────────────────────────────────────────────
Password change fails (weak)          Show strength meter + requirements
                                      Don't submit until valid

2FA QR code fails to generate          Retry, fallback to manual key entry
                                      Log error

Avatar upload too large (> 2MB)        Client-side resize before upload
                                      Or reject with size limit notice

Email change                           Send verification to new email
                                      Old email stays until verified
                                      7-day grace period

Account deletion with active bots     Block deletion
                                      Show "Stop all bots first" notice
                                      Offer "Stop all + delete" shortcut

Session revocation on current device  Don't allow (self-lockout prevention)
                                      Or require 2FA confirmation
```

#### Performance Considerations

```
- Form auto-save: debounce 1s
- Avatar upload: client-side resize (max 512x512)
- Settings: cache in localStorage for instant load
- API keys: generate via Web Crypto API (don't send to server in plain)
```

#### Testing Strategy

```
UNIT TESTS:
  - Form validation per tab
  - 2FA flow: secret generation + verification
  - Notification rules engine
  - Preferences sync serialization

INTEGRATION:
  - Save settings -> reload -> assert persisted
  - Change password -> assert old password rejected
  - Enable 2FA -> assert backup codes generated

E2E:
  - Update profile -> assert saved + displayed
  - Enable 2FA -> logout -> login with 2FA code
  - Delete account -> confirmation -> assert deleted
```

#### Accessibility & UX Enhancements

```
- All forms: proper labels, error messages, aria-describedby
- Tabs: WAI-ARIA tabs pattern, arrow key navigation
- 2FA QR code: text alternative (manual key entry)
- Toggle switches: role="switch" + aria-checked
- Delete confirmation: typed-text confirmation ("type DELETE to confirm")
- Color: never sole indicator for status
- Reduced motion: disable tab transitions
```


---

### PAGE D-13: Bot Detail / Live Monitor (`/dashboard/bots/:id`)

```
PURPOSE:
  Real-time view of a single bot's operation.
  Live trades, performance chart, logs, and controls.

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  Martingale Bot                          [⏸] [⏹] [⚙]  │
│  R_10 (Volatility 10) | Running 2h 34m | 🟢 Active    │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  LIVE STATS                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ P&L      │ │ Win Rate │ │ Trades   │ │ Current  │  │
│  │ +$23.40  │ │ 64.1%    │ │ 156      │ │ Stake    │  │
│  │ ▲        │ │ ▲ +2.1%  │ │ last hour│ │ $0.35    │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└─────────────────────────────────────────────────────────┘
┌──────────────────────────────┬──────────────────────────┐
│  P&L CHART (real-time)       │  CURRENT TRADE           │
│                              │                          │
│  ┌────────────────────────┐ │  Type: Rise              │
│  │ Real-time equity curve │ │  Stake: $0.35            │
│  │ with each trade marked │ │  Entry: 4532.11          │
│  │ as win (green) or loss │ │  Current: 4535.22        │
│  │ (red) dot              │ │  Duration: 3/5 ticks     │
│  │                        │ │  Status: ⏳ In progress   │
│  └────────────────────────┘ │                          │
│                              │  [Sell Early]             │
└──────────────────────────────┴──────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  RECENT TRADES (live updating)                          │
│  ┌──────┬────────┬──────┬──────┬──────┬──────┬───────┐ │
│  │ #    │ Type   │Stake │Entry │Exit  │ P&L  │ Time  │ │
│  ├──────┼────────┼──────┼──────┼──────┼──────┼───────┤ │
│  │ 156  │ Rise   │$0.35 │4532  │4535  │+$0.35│ 12:01 │ │
│  │ 155  │ Rise   │$0.35 │4528  │4526  │-$0.35│ 12:00 │ │
│  │ 154  │ Rise   │$2.80 │4520  │4528  │+$2.80│ 11:59 │ │
│  └──────┴────────┴──────┴──────┴──────┴──────┴───────┘ │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  BOT LOG (scrollable)                                   │
│  [12:01:23] Trade #156: BUY RISE R_10 @ $0.35        │
│  [12:01:23] Entry spot: 4532.11                       │
│  [12:01:25] Tick 3/5: 4535.22 (above entry ✓)        │
│  [12:01:28] Result: WIN | Payout: $0.70 | Profit: $0.35│
│  [12:01:28] Strategy: Reset stake to initial ($0.35)   │
│  [12:01:28] Next trade: BUY RISE R_10 @ $0.35         │
│  [12:00:15] Trade #155: BUY RISE R_10 @ $0.35        │
│  [12:00:15] Entry spot: 4528.45                       │
│  [12:00:20] Result: LOSE | Profit: -$0.35             │
│  [12:00:20] Strategy: Multiply stake by 2.0 → $0.70   │
│  ...                                                    │
│                                                          │
│  [Download Full Log] [Clear Log]                        │
└─────────────────────────────────────────────────────────┘
```

#### Advanced Features

```
1. LIVE TRADE TIMELINE
   - Vertical timeline of current trade: tick 1/5 -> tick 2/5 -> ...
   - Each tick shows price + indicator values at that moment
   - Predictive: "If next tick > 4535: WIN; else: LOSE"

2. STRATEGY DECISION EXPLAINER
   - For each trade, show why bot decided:
     - "RSI(14) = 28 (< 30 oversold) -> BUY RISE"
     - "Last trade won -> reset stake to $0.35"
   - Hover on decision -> see script line that triggered it

3. INTERACTIVE P&L CHART
   - Zoom/pan on equity curve
   - Click any trade dot -> see trade details modal
   - Annotations: stop loss hit, take profit hit, cooldown started

4. BOT COMPARISON OVERLAY
   - Compare this bot's P&L against another bot or benchmark
   - Useful for A/B testing strategy variations

5. LIVE LOG STREAMING WITH FILTERS
   - Filter by level (INFO / WARN / ERROR)
   - Search by keyword
   - Auto-scroll toggle (pauses when user scrolls up)

6. STRATEGY PARAMETERS LIVE-EDIT
   - Edit multiplier / take profit / stop loss on running bot
   - Confirm modal: "Apply changes? Affects next trade only."
   - Audit log entry with old/new values

7. TRADE REPLAY MODE
   - Replay any past trade tick-by-tick
   - Useful for post-mortem on losing streaks

8. HEALTH DASHBOARD
   - Real-time metrics: CPU/memory of bot worker
   - WS latency, API call latency
   - Error rate trend
```

#### Edge Cases & Error Handling

```
SCENARIO                              ACTION
─────────────────────────────────────────────────────────────────
Bot stopped while viewing             Show "Bot stopped" banner
                                      Disable live controls
                                      Keep last-known state visible

WS disconnects                        Show "Live: paused" overlay
                                      Buffer updates, replay on reconnect
                                      Don't lose any trades

Trade result delayed > 30s            Show "Verifying result..."
                                      Don't update P&L until confirmed

Bot crashed                           Show error trace modal
                                      "Restart bot" button
                                      Auto-restart if configured

Log flood (> 100 entries/s)           Switch to sampled view
                                      Show "Showing 1 of 100 entries"
                                      Full log available via download

Chart data > 10,000 points            Downsample to 1-min candles
                                      Show "Zoom in for tick detail" hint
```

#### Performance Considerations

```
- Subscribe only to this bot's events (filter on client)
- Chart: append-only updates (don't redraw full series)
- Log: ring buffer of 1000 entries (older accessible via API)
- Use `useTransition` for log filtering
- Debounce strategy param edits (500ms) before applying
- Web Worker for log search (regex on 10k+ entries)
- Lazy-load trade replay component
```

#### Testing Strategy

```
UNIT TESTS:
  - Trade timeline renders correct tick count
  - Decision explainer parses script line correctly
  - Live log filter by level works
  - Parameter edit modal validates input

INTEGRATION:
  - Subscribe to bot events -> assert UI updates
  - Trigger error -> assert error modal appears
  - Edit running bot params -> assert API called + audit logged

E2E:
  - Open running bot detail -> watch 1 trade complete -> assert P&L updates
  - Pause bot from detail page -> assert status changes
  - Replay last trade -> assert timeline replays
```

#### Accessibility & UX Enhancements

```
- Live updates: aria-live="polite" on stats, "assertive" on errors
- Chart: text alternative "Equity curve from $1000 to $1042, 156 trades"
- Log: role="log" + aria-live="polite" for new entries
- Controls (pause/stop/config): large tap targets (min 44x44px)
- Keyboard shortcut: Space to pause/resume log auto-scroll
- Status changes announced to screen readers
- Reduced motion: disable chart animations, instant updates
```


---

### PAGE D-14: Backtest (`/dashboard/backtest`)

```
PURPOSE:
  Test strategies against historical data before
  committing real money.

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  "Backtest Strategy"                                    │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  CONFIGURATION                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Strategy/Script: [martingale_v2.js ▼]            │   │
│  │ Symbol: [R_10 (Volatility 10) ▼]                │   │
│  │ Date Range: [Jan 1] → [Mar 31, 2024]            │   │
│  │ Initial Balance: [$1,000        ]                │   │
│  │                                                  │   │
│  │ Strategy Parameters:                             │   │
│  │ Initial Stake: [$0.35]  Multiplier: [2.0]       │   │
│  │ Max Steps: [5]  Duration: [5 ticks]             │   │
│  │ Take Profit: [$50]  Stop Loss: [$25]            │   │
│  │                                                  │   │
│  │ [▶ Run Backtest]                                 │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  RESULTS (after running)                                │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Final    │ │ Win Rate │ │ Max      │ │ Total    │  │
│  │ Balance  │ │          │ │ Drawdown │ │ Trades   │  │
│  │ $1,142   │ │ 63.4%    │ │ -$32.40  │ │ 1,247    │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Equity Curve (line chart)                        │   │
│  │ $1142┤                          ╭────            │   │
│  │ $1000┤─────────────────────╮──╯                 │   │
│  │  $900┤                   ╰─╯                    │   │
│  │      └──Jan──Feb──Mar──Apr                     │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Distribution of trade P&L (histogram)            │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Monthly breakdown (table)                        │   │
│  │ Month  | Trades | Win% | P&L    | Max DD         │   │
│  │ Jan    | 412    | 62%  | +$42   | -$18           │   │
│  │ Feb    | 398    | 64%  | +$58   | -$22           │   │
│  │ Mar    | 437    | 64%  | +$42   | -$32           │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  [Export Results]  [Save as Preset]  [Start Live Bot]   │
└─────────────────────────────────────────────────────────┘
```

#### Backtest Engine Implementation

```
ENGINE:
  1. Fetch historical ticks from Deriv ticks_history API
  2. Load strategy script into sandboxed VM
  3. Simulate trading:
     - Feed each tick to onTick()
     - If trade decision returned, simulate buy
     - Track contract until "expiry" (based on ticks/duration)
     - Call onResult() with simulated result
     - Track balance, drawdown, statistics
  4. Continue until:
     - Take profit hit
     - Stop loss hit
     - Balance <= 0
     - All ticks consumed
  5. Calculate statistics and return results

PERFORMANCE:
  - Process ~10,000 ticks/second in sandbox
  - Maximum history: 10,000 ticks (configurable)
  - Results cached for 1 hour
  - Multiple backtests can run concurrently (queue)
```

#### Advanced Features

```
1. WALK-FORWARD ANALYSIS
   - Optimize parameters on training window, test on out-of-sample window
   - Rolling window: 30 days train, 7 days test
   - Shows true out-of-sample performance, not curve-fit

2. MONTE CARLO SIMULATION
   - Shuffle trade order 1000 times
   - Shows distribution of possible outcomes
   - "Worst 5% drawdown: -$85, expected: -$32"

3. PARAMETER OPTIMIZATION (GRID SEARCH)
   - Define ranges: multiplier [1.5-3.0 step 0.1], maxSteps [3-7]
   - Run all combinations
   - Show top 10 by Sharpe ratio
   - Heatmap of parameter space

4. MULTI-SYMBOL BACKTEST
   - Test same strategy across 10 symbols simultaneously
   - Aggregate results + per-symbol breakdown
   - Identify which symbols suit the strategy

5. COMPARISON MODE
   - Run 2-5 backtests side-by-side with different params
   - Diff equity curves
   - Statistical significance test

6. LIVE BACKTEST (PAPER TRADING)
   - Run strategy on live ticks without real money
   - Compare paper vs historical backtest results
   - Slippage simulation

7. BACKTEST TEMPLATES
   - Save backtest config as template
   - Quick rerun with new data
   - Share templates

8. DETAILED TRADE-BY-TRADE LOG
   - Export every simulated trade with entry/exit/P&L
   - Replay mode: step through trades tick-by-tick
   - Filter winning/losing trades
```

#### Edge Cases & Error Handling

```
SCENARIO                              ACTION
─────────────────────────────────────────────────────────────────
Historical data unavailable for symbol Show "Data unavailable"
                                      Suggest alternative symbols

Backtest takes > 60s                   Show progress + ETA
                                      Allow background mode (notify on done)

Strategy errors during backtest        Pause backtest, show error
                                      Resume after fix
                                      Don't lose partial results

Out-of-memory (large history)         Reduce tick granularity
                                      Or split into chunks
                                      Suggest cloud run for huge datasets

Parameter grid too large (> 1000)     Warn user, suggest coarser grid
                                      Or auto-parallelize via worker pool
```

#### Performance Considerations

```
- Sandbox: precompiled strategy function (cache compiled VM)
- Tick processing: 10k ticks/sec target
- Grid search: parallel via Web Workers (one per CPU core)
- Results: stream partial results to UI
- Cache historical ticks in IndexedDB (avoid re-fetch)
- Monte Carlo: parallel simulation
```

#### Testing Strategy

```
UNIT TESTS:
  - Backtest engine: known input -> expected output
  - Walk-forward windowing logic
  - Monte Carlo shuffle correctness
  - Parameter grid generation

INTEGRATION:
  - Run backtest -> assert results stored + retrievable
  - Background mode -> assert notification fires on completion

E2E:
  - Configure + run backtest -> see results -> export
  - Compare 2 backtests -> assert overlay chart
  - Monte Carlo -> assert distribution shown
```

#### Accessibility & UX Enhancements

```
- Progress bars: role="progressbar" with aria-valuenow
- Results table: sortable headers, proper scope
- Charts: text alternatives, data table view toggle
- Form inputs: labeled, validated, error messages announced
- Long-running ops: status updates via aria-live
- Keyboard: tab through config form, Enter to run
```


---

## 6. SHARED COMPONENTS

```
LAYOUT:
  ├── Sidebar          — navigation, user info, connection status
  ├── TopBar           — search, notifications, user menu
  ├── PageWrapper      — consistent padding, max-width
  └── MobileNav        — bottom navigation for mobile

DATA DISPLAY:
  ├── StatCard         — value + label + trend indicator
  ├── DataTable        — sortable, filterable, paginated
  ├── ChartWrapper     — Recharts/LightweightCharts wrapper
  ├── LivePrice       — real-time price with direction arrow
  ├── PnLBadge        — green/red P&L display
  ├── StatusIndicator — 🟢🟡🔴 status dot + text
  └── TimeAgo         — relative time display ("2m ago")

FORMS:
  ├── FormInput        — text input with label, error, icon
  ├── FormSelect       — dropdown with search
  ├── FormToggle       — switch toggle
  ├── FormSlider       — range slider (for stake, etc.)
  └── Stepper          — multi-step form progress

TRADE-SPECIFIC:
  ├── SymbolSelector   — market/symbol dropdown with search
  ├── ContractTypeSelect — contract type dropdown
  ├── StakeInput       — stake with quick buttons ($0.35, $1, $5...)
  ├── DurationInput    — ticks/seconds/minutes input
  ├── ProposalDisplay  — live buy price + potential profit
  └── TradeResult      — win/loss display with animation

BOT-SPECIFIC:
  ├── BotCard          — bot summary card for lists
  ├── BotStatusBadge   — running/paused/stopped
  ├── BotControls      — start/pause/stop/config buttons
  └── MiniPnlChart     — small inline P&L chart

SOCIAL:
  ├── TraderCard       — user profile card with stats
  ├── ActivityItem     — single activity feed item
  ├── LeaderboardTable — ranked table of traders
  └── CopyTradeBadge   — "copying" indicator

MODALS:
  ├── ConfirmModal     — "Are you sure?" with custom message
  ├── TradeModal       — quick trade placement
  ├── BotActionModal   — bot start/stop confirmation
  └── NotificationPopup — toast/notification system

FEEDBACK:
  ├── Toast            — success/error/warning/info
  ├── LoadingSpinner   — loading indicator
  ├── SkeletonCard     — content placeholder while loading
  └── EmptyState       — "No bots yet" with CTA
```

---

## 7. STATE MANAGEMENT

### 7.1 Zustand Stores (Client State)

```
useAuthStore:
  ├── user: User | null
  ├── isAuthenticated: boolean
  ├── isLoading: boolean
  ├── login: (credentials) => Promise<void>
  ├── logout: () => void
  ├── refreshToken: () => Promise<void>
  └── updateUser: (partial) => void

useDerivStore:
  ├── connections: DerivConnection[]
  ├── activeConnectionId: string | null
  ├── websockets: Map<connectionId, WebSocket>
  ├── balance: Map<connectionId, number>
  ├── isConnected: boolean
  ├── connect: (token) => void
  ├── disconnect: (connectionId) => void
  ├── subscribe: (params) => void
  ├── unsubscribe: (subscriptionId) => void
  └── send: (request) => Promise<response>

useMarketStore:
  ├── symbols: Symbol[]
  ├── favorites: string[]
  ├── tickSubscriptions: Map<symbol, tickData>
  ├── activeSymbols: () => Symbol[]
  ├── toggleFavorite: (symbol) => void
  └── getSymbol: (symbol) => Symbol | undefined

useBotStore:
  ├── bots: Bot[]
  ├── activeBots: Bot[]
  ├── isLoading: boolean
  ├── fetchBots: () => Promise<void>
  ├── startBot: (id) => Promise<void>
  ├── pauseBot: (id) => Promise<void>
  ├── stopBot: (id) => Promise<void>
  └── deleteBot: (id) => Promise<void>

useTradeStore:
  ├── openContracts: Contract[]
  ├── recentTrades: Trade[]
  ├── proposals: Map<key, Proposal>
  ├── buy: (params) => Promise<Contract>
  ├── sell: (contractId) => Promise<void>
  └── subscribeOpenContracts: () => void

useSocialStore:
  ├── following: FollowedTrader[]
  ├── leaderboard: TraderRanking[]
  ├── activityFeed: Activity[]
  ├── fetchLeaderboard: () => Promise<void>
  ├── follow: (userId) => Promise<void>
  ├── unfollow: (userId) => Promise<void>
  └── configureCopyTrade: (userId, settings) => Promise<void>

useUIStore:
  ├── sidebarOpen: boolean
  ├── theme: "light" | "dark"
  ├── notifications: Notification[]
  └── activeModal: string | null
```

### 7.2 React Query (Server State)

```
QUERY KEYS:
  ["user"]                    → current user
  ["bots"]                    → all bots
  ["bots", id]                → single bot
  ["bots", id, "trades"]      → bot trades
  ["bots", id, "logs"]        → bot logs
  ["scripts"]                 → all scripts
  ["scripts", id]             → single script
  ["connections"]             → Deriv connections
  ["portfolio", "open"]       → open positions
  ["portfolio", "history"]    → trade history
  ["social", "leaderboard"]   → leaderboard
  ["social", "following"]     → following list
  ["social", "feed"]          → activity feed
  ["analytics", period]       → analytics data
  ["automation", "rules"]     → automation rules

MUTATIONS:
  useCreateBot()              → POST /api/bots
  useUpdateBot()              → PATCH /api/bots/:id
  useStartBot()               → POST /api/bots/:id/start
  usePauseBot()               → POST /api/bots/:id/pause
  useStopBot()                → POST /api/bots/:id/stop
  useDeleteBot()              → DELETE /api/bots/:id
  useCreateScript()           → POST /api/scripts
  useUpdateScript()           → PATCH /api/scripts/:id
  usePlaceTrade()             → Deriv buy via WebSocket
  useSellContract()           → Deriv sell via WebSocket
  useConnectDeriv()           → POST /api/connections
  useFollowUser()             → POST /api/social/follow
  useCreateAutomationRule()   → POST /api/automation/rules
```

---

## 8. DATABASE SCHEMA

### 8.1 PostgreSQL Tables (Prisma)

```prisma
// ============ AUTH & USERS ============

model User {
  id              String    @id @default(cuid())
  email           String    @unique
  emailVerified   Boolean   @default(false)
  passwordHash    String
  fullName        String
  username        String    @unique
  avatar          String?
  timezone        String    @default("UTC")
  
  // Subscription
  subscriptionTier  String  @default("free") // free, pro, team
  subscriptionId   String?
  
  // Social
  isPublic         Boolean @default(true)
  showOnLeaderboard Boolean @default(true)
  allowCopyTrading Boolean @default(true)
  
  // Security
  twoFactorEnabled Boolean  @default(false)
  twoFactorSecret  String?  // encrypted
  backupCodes      String?  // JSON array, hashed
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  lastLoginAt     DateTime?
  
  // Relations
  derivConnections  DerivConnection[]
  bots             Bot[]
  scripts          Script[]
  automationRules  AutomationRule[]
  followers        Follow[]  @relation("Following")
  following        Follow[]  @relation("Followers")
  copyTradeSettings CopyTradeSetting[]
  notifications    Notification[]
  settings         UserSettings?
  sessions         Session[]
}

model Session {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  token       String   @unique
  refreshToken String @unique
  expiresAt   DateTime
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())
}

model UserSettings {
  id                      String  @id @default(cuid())
  userId                  String  @unique
  user                    User    @relation(fields: [userId], references: [id])
  
  // Notifications
  emailTradeCompleted     Boolean @default(true)
  emailBotStatus          Boolean @default(true)
  emailDailySummary       Boolean @default(false)
  emailRiskAlert          Boolean @default(true)
  pushTradeCompleted      Boolean @default(false)
  pushBotStatus           Boolean @default(true)
  pushRiskAlert           Boolean @default(true)
  webhookUrl              String?
  
  // Preferences
  defaultSymbol           String  @default("R_10")
  defaultStake           Float   @default(0.35)
  defaultDuration         Int     @default(5)
  defaultDurationUnit     String  @default("t")
  chartTheme              String  @default("dark")
  
  // Favorite symbols
  favoriteSymbols         String  @default("[]") // JSON array
}

// ============ DERIV CONNECTIONS ============

model DerivConnection {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  
  derivLoginId    String    // e.g. CR1234567
  derivAppId      String    // our registered app ID
  encryptedToken  String    // AES-256-GCM encrypted
  currency        String    // USD, EUR, etc.
  balance         Float     @default(0)
  
  status          String    @default("active") // active, expired, revoked
  permissions     String    @default("[]") // JSON: ["read","trade"]
  
  lastActivityAt  DateTime?
  connectedAt     DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  bots            Bot[]
  
  @@unique([userId, derivLoginId])
}

// ============ BOTS ============

model Bot {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  connectionId    String
  connection      DerivConnection @relation(fields: [connectionId], references: [id])
  
  name            String
  description     String?
  symbol          String    // e.g. R_10, frxEURUSD
  strategyType    String    // martingale, dca, oscar, fixed, custom, ai
  scriptId        String?   // if custom script
  script          Script?   @relation(fields: [scriptId], references: [id])
  
  // Status
  status          String    @default("draft") // draft, running, paused, stopped, error
  statusMessage   String?   // error message if status=error
  
  // Trade Parameters
  contractType    String    @default("CALL") // CALL, PUT, DIGITOVER, etc.
  initialStake    Float     @default(0.35)
  currentStake    Float     @default(0.35)
  maxStake       Float     @default(100)
  duration        Int       @default(5)
  durationUnit    String    @default("t") // t, s, m, h, d
  
  // Strategy Parameters (JSON - varies by strategy)
  strategyParams  String    @default("{}")
  // e.g. { "multiplier": 2.0, "onWin": "reset", "onLoss": "multiply", "maxSteps": 5 }
  
  // Risk Management
  takeProfit      Float?
  stopLoss        Float?
  maxDailyLoss    Float     @default(100)
  maxDailyTrades  Int       @default(500)
  cooldownLosses  Int       @default(3)
  cooldownDuration Int      @default(300) // seconds
  maxConcurrent   Int       @default(1)
  
  // Statistics (updated in real-time)
  totalTrades     Int       @default(0)
  totalWins       Int       @default(0)
  totalLosses     Int       @default(0)
  totalPnL        Float     @default(0)
  currentStreak   Int       @default(0) // positive=win, negative=loss
  dailyPnL        Float     @default(0)
  dailyTrades     Int       @default(0)
  dailyLosses     Int       @default(0)
  
  // Runtime
  startedAt       DateTime?
  runtimeSeconds  Int       @default(0)
  jobId           String?   // BullMQ job ID
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  trades          Trade[]
  logs            BotLog[]
}

// ============ SCRIPTS ============

model Script {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  
  name            String
  code            String    // JavaScript source code
  description     String?
  isTemplate      Boolean   @default(false)
  
  // Statistics
  totalRuns       Int       @default(0)
  winRate         Float     @default(0)
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  bots            Bot[]
}

// ============ TRADES ============

model Trade {
  id              String    @id @default(cuid())
  botId           String
  bot             Bot       @relation(fields: [botId], references: [id])
  userId          String
  
  // Deriv trade data
  derivContractId String?   // contract_id from Deriv
  symbol          String
  contractType    String
  stake           Float
  duration        Int
  durationUnit    String
  
  // Results
  entrySpot       Float?
  exitSpot        Float?
  buyPrice        Float?
  sellPrice       Float?
  payout          Float?
  profit          Float?
  isWin           Boolean?
  isSold          Boolean   @default(false)
  
  // Copy trade tracking
  copiedFromUserId String?
  copiedFromTradeId String?
  
  boughtAt        DateTime?
  soldAt          DateTime?
  createdAt       DateTime  @default(now())
}

// ============ BOT LOGS ============

model BotLog {
  id        String   @id @default(cuid())
  botId     String
  bot       Bot      @relation(fields: [botId], references: [id])
  level     String   @default("info") // info, warn, error, trade
  message   String
  data      String?  // JSON additional data
  timestamp DateTime @default(now())
  
  @@index([botId, timestamp])
}

// ============ AUTOMATION ============

model AutomationRule {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  
  name        String
  description String?
  isEnabled   Boolean  @default(true)
  
  // Conditions (JSON array)
  conditions  String   // [{ field: "balance.change", operator: "less_than", value: "-10%" }]
  // Operator: less_than, greater_than, equals, changes_by
  
  // Actions (JSON array)
  actions     String   // [{ type: "bot.stopAll", params: {} }]
  // Action types: bot.start, bot.stop, bot.pause, bot.stopAll,
  //   notification.email, notification.push, notification.webhook,
  //   trade.closeAll, script.run, log.message
  
  // Schedule (cron expression, optional)
  schedule    String?  // if set, rule is time-based
  
  lastTriggeredAt DateTime?
  triggerCount    Int      @default(0)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// ============ SOCIAL ============

model Follow {
  id            String   @id @default(cuid())
  followerId    String
  follower      User     @relation("Following", fields: [followerId], references: [id])
  followingId   String
  following     User     @relation("Followers", fields: [followingId], references: [id])
  
  createdAt     DateTime @default(now())
  
  @@unique([followerId, followingId])
}

model CopyTradeSetting {
  id                    String  @id @default(cuid())
  userId                String  // the copier
  user                  User    @relation(fields: [userId], references: [id])
  targetUserId          String  // the trader being copied
  
  mode                  String  @default("proportional") // proportional, fixed, same
  maxStakePerTrade      Float   @default(10)
  maxDailyCopyTrades    Int     @default(20)
  maxDailyCopyLoss      Float   @default(50)
  minWinRateThreshold   Float   @default(50)
  symbolFilter          String  @default("[]") // JSON: empty = all
  botFilter             String  @default("[]") // JSON: empty = all
  
  isEnabled             Boolean @default(true)
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  @@unique([userId, targetUserId])
}

// ============ NOTIFICATIONS ============

model Notification {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  
  type        String   // trade_won, trade_lost, bot_started, risk_alert, new_follower
  title       String
  message     String
  data        String?  // JSON
  isRead      Boolean  @default(false)
  
  createdAt   DateTime @default(now())
  
  @@index([userId, isRead, createdAt])
}
```

---

## 9. AUTOMATION & BOT ENGINE

### 9.1 Bot Execution Engine

```
ARCHITECTURE:
  ┌──────────────────────────────────────────────────┐
  │  Bot Engine (runs on server)                     │
  │                                                  │
  │  ┌────────────┐    ┌────────────────────────┐   │
  │  │ BullMQ     │    │  Worker Process        │   │
  │  │ Queue      │───▶│  - Loads script in VM  │   │
  │  │            │    │  - Subscribes to ticks │   │
  │  │            │    │  - Executes onTick()   │   │
  │  │            │    │  - Places trades       │   │
  │  │            │    │  - Handles results     │   │
  │  │            │    │  - Checks risk limits  │   │
  │  └────────────┘    └────────────────────────┘   │
  │                                                  │
  │  ┌────────────┐    ┌────────────────────────┐   │
  │  │ Redis      │    │  Pub/Sub               │   │
  │  │            │◀──▶│  - Bot status updates  │   │
  │  │            │    │  - Trade notifications │   │
  │  │            │    │  - Copy trade signals  │   │
  │  └────────────┘    └────────────────────────┘   │
  └──────────────────────────────────────────────────┘

BOT LIFECYCLE:
  1. START:
     - Validate bot config
     - Check Deriv connection is active
     - Create BullMQ job
     - Worker picks up job
     - Initialize VM with script
     - Subscribe to symbol ticks via Deriv WebSocket
     - Update bot status → "running"
     - Emit start event via Socket.IO

  2. TICK:
     - Receive tick from Deriv WebSocket
     - Check if previous trade completed → call onResult()
     - Execute script.onTick(tick) in VM
     - If trade decision returned:
       - Check risk limits (daily loss, max trades, cooldown)
       - If limits OK: place trade via Deriv buy API
       - If limits hit: stop bot, notify user
     - Update bot statistics in DB
     - Emit tick event for real-time dashboard

  3. TRADE RESULT:
     - Receive contract settlement from Deriv
     - Call script.onResult(result) in VM
     - Update bot stats (wins, losses, P&L, streak)
     - Check take profit / stop loss
     - If TP/SL hit: stop bot, call script.onComplete()
     - Log trade to bot_logs table
     - Emit trade event for real-time dashboard
     - If user has copy traders: emit copy trade signal

  4. PAUSE:
     - Stop processing new ticks
     - Let current trade complete
     - Keep WebSocket subscriptions active
     - Update status → "paused"

  5. STOP:
     - Unsubscribe from ticks
     - Close WebSocket subscriptions
     - Terminate VM
     - Remove BullMQ job
     - Close any open contracts (optional)
     - Update status → "stopped"
     - Emit stop event

  6. ERROR:
     - Log error to bot_logs
     - If recoverable: pause bot, retry after delay
     - If not recoverable: stop bot, notify user
     - Common errors:
       - WebSocket disconnected
       - Token expired
       - VM execution error
       - Insufficient balance
       - Rate limit hit
```

### 9.2 Risk Management Engine

```
CHECKS (before every trade):
  1. Balance check: stake <= balance
  2. Max stake: stake <= maxStake
  3. Daily loss limit: dailyPnL > -maxDailyLoss
  4. Daily trade limit: dailyTrades < maxDailyTrades
  5. Cooldown: if consecutiveLosses >= cooldownLosses
     → wait cooldownDuration seconds
  6. Take profit: totalPnL < takeProfit (if set)
  7. Stop loss: totalPnL > -stopLoss (if set)
  8. Concurrent trades: openContracts < maxConcurrent
  9. Market open: check trading_times if not synthetic

ACTIONS (when limit hit):
  - Stop bot gracefully
  - Send notification (email + push)
  - Log event
  - Update bot status with reason
  - Trigger automation rules (if any match)
```

---

## 10. SCRIPT ENGINE

### 10.1 Sandbox Implementation

```
ARCHITECTURE:
  ┌──────────────────────────────────────────────────┐
  │  Script Execution Pipeline                       │
  │                                                  │
  │  Source Code (JS)                                │
  │       │                                          │
  │       ▼                                          │
  │  ┌─────────────┐                                │
  │  │ Validator   │ Check syntax, forbidden calls  │
  │  └──────┬──────┘                                │
  │         ▼                                        │
  │  ┌─────────────┐                                │
  │  │ Compiler    │ Wrap in sandbox, inject API    │
  │  └──────┬──────┘                                │
  │         ▼                                        │
  │  ┌─────────────┐                                │
  │  │ VM2/ivm     │ Execute in isolated context    │
  │  └──────┬──────┘                                │
  │         ▼                                        │
  │  ┌─────────────┐                                │
  │  │ Result      │ Return trade decision or null  │
  │  └─────────────┘                                │
  └──────────────────────────────────────────────────┘
```

### 10.2 Sandbox API Injection

```
INJECTED GLOBALS (available inside script):

  // ──── Market Data ────
  tick.price          → current tick price (number)
  tick.symbol         → current symbol (string)
  tick.epoch          → tick timestamp (number)
  tick.pipSize        → pip/spot size for symbol

  // ──── Account Data ────
  balance             → current account balance (number)
  currency            → account currency (string)

  // ──── History ────
  getLastResult()     → last trade result or null
    returns: { win: boolean, profit: number, payout: number,
              buyPrice: number, sellPrice: number,
              contractType: string, entrySpot: number, exitSpot: number }

  getHistory(limit)   → array of last N trade results
    returns: TradeResult[]

  getOpenContracts()  → currently open positions
    returns: Contract[]

  // ──── Technical Indicators ────
  getTicks(limit)     → last N raw tick prices
    returns: number[]

  getSMA(period)      → Simple Moving Average
  getEMA(period)      → Exponential Moving Average
  getRSI(period)      → Relative Strength Index (default 14)
  getMACD(fast, slow, signal) → MACD line, signal, histogram
  getBollingerBands(period, stdDev) → upper, middle, lower
  getStochastic(kPeriod, dPeriod) → %K, %D

  // ──── Utility ────
  log(message)        → log to bot console (rate limited)
  sleep(ms)           → async wait (max 5000ms)
  storage.get(key)    → persistent key-value (per bot)
  storage.set(key, val) → set persistent value

  // ──── Constants ────
  CONTRACTS           → { CALL, PUT, DIGITOVER, DIGITUNDER,
                          DIGITMATCH, DIGITDIFF, DIGITEVEN,
                          DIGITODD, TOUCH, NOTOUCH,
                          HIGHER, LOWER, ... }
  DURATION_UNITS      → { TICK, SECOND, MINUTE, HOUR, DAY }
```

### 10.3 Script Templates

```
TEMPLATE 1: MARTINGALE
─────────────────────────────────────────────
/**
 * Martingale Strategy
 * @param {number} initialStake=0.35 Starting stake
 * @param {number} multiplier=2.0 Loss multiplier
 * @param {number} maxSteps=5 Max martingale steps
 */
function onTick(tick) {
  const last = getLastResult();
  
  if (!last || last.win) {
    storage.set('currentStep', 0);
    storage.set('currentStake', initialStake);
  } else {
    const step = Math.min(storage.get('currentStep') + 1, maxSteps);
    storage.set('currentStep', step);
    storage.set('currentStake', storage.get('currentStake') * multiplier);
  }
  
  return {
    contract: CONTRACTS.CALL,
    stake: storage.get('currentStake'),
    duration: 5,
    durationUnit: DURATION_UNITS.TICK
  };
}

function onResult(result) {
  log(`Trade ${result.win ? 'WON' : 'LOST'}: ${result.profit > 0 ? '+' : ''}$${result.profit.toFixed(2)}`);
}

TEMPLATE 2: RSI OVERSOLD/OVERBOUGHT
─────────────────────────────────────────────
/**
 * RSI Strategy
 * @param {number} rsiPeriod=14 RSI calculation period
 * @param {number} oversold=30 Oversold threshold
 * @param {number} overbought=70 Overbought threshold
 * @param {number} stake=0.35 Trade stake
 */
function onTick(tick) {
  const rsi = getRSI(rsiPeriod);
  
  if (rsi < oversold) {
    log(`RSI: ${rsi.toFixed(2)} — Oversold, buying RISE`);
    return {
      contract: CONTRACTS.CALL,
      stake: stake,
      duration: 5,
      durationUnit: DURATION_UNITS.TICK
    };
  }
  
  if (rsi > overbought) {
    log(`RSI: ${rsi.toFixed(2)} — Overbought, buying FALL`);
    return {
      contract: CONTRACTS.PUT,
      stake: stake,
      duration: 5,
      durationUnit: DURATION_UNITS.TICK
    };
  }
  
  return null; // No trade
}

TEMPLATE 3: OSCAR'S GRIND
─────────────────────────────────────────────
/**
 * Oscar's Grind Strategy
 * @param {number} initialStake=0.35 Base stake
 * @param {number} targetUnits=1 Profit units to achieve
 */
function onTick(tick) {
  const last = getLastResult();
  let cycleProfit = storage.get('cycleProfit') || 0;
  let currentStake = storage.get('currentStake') || initialStake;
  
  if (last) {
    cycleProfit += last.profit;
    
    if (cycleProfit >= targetUnits * initialStake) {
      cycleProfit = 0;
      currentStake = initialStake;
      log('Cycle complete! Resetting.');
    } else if (last.win) {
      // Keep same stake after win
    } else {
      // Increase stake only after a win recovers some loss
      currentStake = currentStake + initialStake;
    }
  }
  
  storage.set('cycleProfit', cycleProfit);
  storage.set('currentStake', currentStake);
  
  return {
    contract: CONTRACTS.CALL,
    stake: currentStake,
    duration: 5,
    durationUnit: DURATION_UNITS.TICK
  };
}

TEMPLATE 4: BOLLINGER BANDS BOUNCE
─────────────────────────────────────────────
/**
 * Bollinger Bands Strategy
 * @param {number} period=20 BB period
 * @param {number} stdDev=2 Standard deviations
 * @param {number} stake=0.35 Trade stake
 */
function onTick(tick) {
  const bb = getBollingerBands(period, stdDev);
  const price = tick.price;
  
  if (price <= bb.lower) {
    log(`Price touching lower band — buying RISE`);
    return {
      contract: CONTRACTS.CALL,
      stake: stake,
      duration: 3,
      durationUnit: DURATION_UNITS.TICK
    };
  }
  
  if (price >= bb.upper) {
    log(`Price touching upper band — buying FALL`);
    return {
      contract: CONTRACTS.PUT,
      stake: stake,
      duration: 3,
      durationUnit: DURATION_UNITS.TICK
    };
  }
  
  return null;
}

TEMPLATE 5: MACD CROSSOVER
─────────────────────────────────────────────
/**
 * MACD Crossover Strategy
 * @param {number} fast=12 Fast EMA period
 * @param {number} slow=26 Slow EMA period
 * @param {number} signal=9 Signal line period
 * @param {number} stake=0.35 Trade stake
 */
function onTick(tick) {
  const macd = getMACD(fast, slow, signal);
  const prevHistogram = storage.get('prevHistogram');
  
  storage.set('prevHistogram', macd.histogram);
  
  if (prevHistogram !== undefined) {
    // Bullish crossover: histogram crosses from negative to positive
    if (prevHistogram < 0 && macd.histogram > 0) {
      log('MACD bullish crossover — buying RISE');
      return {
        contract: CONTRACTS.CALL,
        stake: stake,
        duration: 10,
        durationUnit: DURATION_UNITS.TICK
      };
    }
    // Bearish crossover: histogram crosses from positive to negative
    if (prevHistogram > 0 && macd.histogram < 0) {
      log('MACD bearish crossover — buying FALL');
      return {
        contract: CONTRACTS.PUT,
        stake: stake,
        duration: 10,
        durationUnit: DURATION_UNITS.TICK
      };
    }
  }
  
  return null;
}
```

### 10.4 Script Validation & Security

```
VALIDATION (before saving):
  1. Syntax check: esprima.parse() or acorn
  2. Forbidden patterns:
     - require(), import, eval()
     - process, __dirname, __filename
     - fetch, XMLHttpRequest, WebSocket
     - setTimeout, setInterval (use sleep() instead)
     - Math.random with no seed (warn, not block)
  3. Size limit: max 50KB source code
  4. Complexity limit: max 500 AST nodes
  5. Must export or define onTick function
  6. onResult and onComplete are optional

EXECUTION SAFETY:
  - VM2 sandbox with separate v8 context
  - Memory limit: 128MB per script instance
  - CPU timeout: 100ms per onTick call
  - Infinite loop detection (opcount limit)
  - No access to Node.js APIs
  - No access to network
  - No access to filesystem
  - storage.get/set isolated per bot instance
  - Rate limit: max 1 trade decision per tick

ERROR HANDLING:
  - Syntax error: block save, show in editor
  - Runtime error: log to bot_logs, pause bot
  - Timeout error: skip tick, continue
  - Memory error: stop bot, notify user
  - 3 consecutive errors: auto-pause bot
```

---

## 11. SOCIAL / USER MONITORING

### 11.1 Activity Tracking

```
TRACKED EVENTS:
  trade_placed      → { userId, symbol, contractType, stake, botId }
  trade_won         → { userId, symbol, profit, botId }
  trade_lost        → { userId, symbol, loss, botId }
  bot_started       → { userId, botName, symbol, strategy }
  bot_stopped       → { userId, botName, reason, totalPnL }
  bot_paused        → { userId, botName, reason }
  user_followed     → { followerId, followingId }
  copy_trade_placed → { copierId, sourceUserId, symbol, stake }

PRIVACY CONTROLS (per user):
  isPublic: boolean               → profile visible to others
  showOnLeaderboard: boolean      → appear in rankings
  showTradingActivity: boolean    → trades visible in feed
  allowCopyTrading: boolean       → others can copy trades
  hiddenBots: string[]            → bot IDs hidden from social

EVENT FLOW:
  1. Event occurs (trade, bot action)
  2. Check user privacy settings
  3. If allowed: publish to Redis channel
  4. Socket.IO pushes to followers' feeds
  5. Store in activity_log table (24h TTL)
  6. Copy trade engine checks for copy signals
```

### 11.2 Leaderboard Calculation

```
RANKING CRITERIA:
  Primary:   totalPnL (descending)
  Secondary: winRate (if PnL tied)
  Tertiary:  totalTrades (minimum threshold)

FILTERS:
  Period:  today, this_week, this_month, all_time
  Market:  all, forex, synthetics, crypto, commodities
  Strategy: all, martingale, dca, custom, etc.

CALCULATION:
  - Cached in Redis, recalculated every 5 minutes
  - Uses trade aggregation query:
    SELECT 
      u.id, u.username, u.avatar,
      COUNT(t.id) as total_trades,
      SUM(CASE WHEN t.isWin THEN 1 ELSE 0 END) as wins,
      SUM(t.profit) as total_pnl
    FROM users u
    JOIN trades t ON t.userId = u.id
    WHERE u.showOnLeaderboard = true
      AND t.createdAt >= {periodStart}
    GROUP BY u.id
    HAVING COUNT(t.id) >= {minTrades}
    ORDER BY total_pnl DESC
    LIMIT 100

MINIMUM THRESHOLDS:
  - Today:       10 trades minimum
  - This Week:   50 trades minimum
  - This Month:  200 trades minimum
  - All Time:    500 trades minimum
```

### 11.3 Copy Trade Engine

```
FLOW:
  ┌──────────────────────────────────────────────────┐
  │  Source Trader places trade via bot              │
  │         │                                        │
  │         ▼                                        │
  │  ┌─────────────┐                                │
  │  │ Event       │ Trade placed event              │
  │  │ Publisher   │ with all details                │
  │  └──────┬──────┘                                │
  │         │                                        │
  │         ▼                                        │
  │  ┌─────────────┐                                │
  │  │ Copy Engine │ Find all active copy settings   │
  │  │             │ targeting this user              │
  │  └──────┬──────┘                                │
  │         │                                        │
  │         ▼                                        │
  │  ┌──────────────────────────────────────────┐   │
  │  │ For each copier:                          │   │
  │  │  1. Check copy settings (filters, limits)│   │
  │  │  2. Check copier's balance               │   │
  │  │  3. Calculate stake (proportional/fixed) │   │
  │  │  4. Place same trade on copier's account │   │
  │  │  5. Record copy trade linkage            │   │
  │  │  6. Notify copier                        │   │
  │  └──────────────────────────────────────────┘   │
  └──────────────────────────────────────────────────┘

STAKE CALCULATION:
  Proportional:  copierStake = (copierBalance / sourceBalance) * sourceStake
  Fixed:         copierStake = copier's fixed amount setting
  Same:          copierStake = sourceStake (exact copy)

SAFEGUARDS:
  - Max stake per trade limit
  - Max daily copy trades limit
  - Max daily copy loss limit
  - Min win rate threshold (stop copying if source drops below)
  - Symbol filter (only copy certain markets)
  - Bot filter (only copy certain bots)
  - Delay: configurable 0-5 second delay before copying
  - Manual approval mode: require copier to confirm each trade

FAILURE HANDLING:
  - If copier's Deriv connection down: skip, log error
  - If copier insufficient balance: skip, notify
  - If trade fails: log, don't retry (market moved)
  - If 5 consecutive failures: disable copy, notify copier
```

---

## 12. DEPLOYMENT & ENVIRONMENT

### 12.1 Environment Variables

```
# ──── Application ────
NODE_ENV=production
APP_URL=https://app.derivx.com
APP_NAME=DerivX
APP_PORT=3000

# ──── Database ────
DATABASE_URL=postgresql://user:pass@host:5432/derivx
REDIS_URL=redis://host:6379

# ──── Authentication ────
NEXTAUTH_SECRET=<random-32-chars>
NEXTAUTH_URL=https://app.derivx.com
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# ──── Deriv API ────
DERIV_APP_ID=<registered-app-id>
DERIV_OAUTH_URL=https://oauth.deriv.com
DERIV_WS_URL=wss://ws.derivws.com/websockets/v3
DERIV_CALLBACK_URL=https://app.derivx.com/api/auth/deriv/callback

# ──── Encryption ────
TOKEN_ENCRYPTION_KEY=<aes-256-gcm-key>
TOKEN_ENCRYPTION_IV=<initialization-vector>

# ──── Email ────
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<sendgrid-api-key>
EMAIL_FROM=noreply@derivx.com

# ──── Push Notifications ────
VAPID_PUBLIC_KEY=<key>
VAPID_PRIVATE_KEY=<key>
VAPID_SUBJECT=mailto:noreply@derivx.com

# ──── Rate Limiting ────
RATE_LIMIT_API_WINDOW=60000
RATE_LIMIT_API_MAX=100
RATE_LIMIT_TRADE_WINDOW=1000
RATE_LIMIT_TRADE_MAX=10

# ──── Bot Engine ────
BOT_MAX_CONCURRENT_PER_USER=5
BOT_VM_MEMORY_LIMIT_MB=128
BOT_VM_TIMEOUT_MS=100
BOT_TICK_DEBOUNCE_MS=50

# ──── Monitoring ────
SENTRY_DSN=<sentry-dsn>
LOG_LEVEL=info
PROMETHEUS_PORT=9090
```

### 12.2 Docker Compose

```
services:
  app:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    env_file: .env.production
    restart: always
    deploy:
      resources:
        limits:
          memory: 1G

  worker:
    build: .
    command: node dist/workers/bot-worker.js
    depends_on:
      - postgres
      - redis
    env_file: .env.production
    restart: always
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 2G

  postgres:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: derivx
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASS}

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data
    command: redis-server --appendonly yes

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app

volumes:
  pgdata:
  redisdata:
```

### 12.3 API Route Map

```
AUTH:
  POST   /api/auth/register          → Create account
  POST   /api/auth/login             → Sign in
  POST   /api/auth/logout            → Sign out
  POST   /api/auth/refresh           → Refresh JWT
  POST   /api/auth/forgot-password   → Request reset
  POST   /api/auth/reset-password    → Reset password
  GET    /api/auth/verify-email      → Verify email token
  POST   /api/auth/resend-verify     → Resend verification

DERIV CONNECTIONS:
  GET    /api/connections             → List connections
  POST   /api/connections             → Connect Deriv (OAuth callback)
  DELETE /api/connections/:id         → Disconnect
  POST   /api/connections/:id/test    → Test connection
  POST   /api/connections/:id/refresh → Refresh token

BOTS:
  GET    /api/bots                   → List bots (with filters)
  POST   /api/bots                   → Create bot
  GET    /api/bots/:id               → Get bot detail
  PATCH  /api/bots/:id               → Update bot config
  DELETE /api/bots/:id               → Delete bot
  POST   /api/bots/:id/start         → Start bot
  POST   /api/bots/:id/pause         → Pause bot
  POST   /api/bots/:id/stop          → Stop bot
  GET    /api/bots/:id/trades        → Bot trade history
  GET    /api/bots/:id/logs          → Bot logs
  GET    /api/bots/:id/stats         → Bot statistics

SCRIPTS:
  GET    /api/scripts                → List scripts
  POST   /api/scripts               → Create script
  GET    /api/scripts/:id           → Get script
  PATCH  /api/scripts/:id           → Update script
  DELETE /api/scripts/:id           → Delete script
  POST   /api/scripts/:id/validate  → Validate syntax
  POST   /api/scripts/:id/test      → Quick test run

TRADES:
  POST   /api/trades/buy            → Place trade (via Deriv)
  POST   /api/trades/sell           → Sell contract (via Deriv)
  GET    /api/trades/open           → Open positions
  GET    /api/trades/history        → Trade history
  GET    /api/trades/summary        → Trade summary/stats

MARKETS:
  GET    /api/markets/active        → Active symbols (cached)
  GET    /api/markets/schedule      → Trading times
  GET    /api/markets/ticks/:symbol → Tick history

PORTFOLIO:
  GET    /api/portfolio/balance     → Account balance
  GET    /api/portfolio/statement   → Account statement
  GET    /api/portfolio/profit      → Profit table

AUTOMATION:
  GET    /api/automation/rules      → List rules
  POST   /api/automation/rules      → Create rule
  PATCH  /api/automation/rules/:id  → Update rule
  DELETE /api/automation/rules/:id  → Delete rule
  POST   /api/automation/rules/:id/toggle → Enable/disable

SOCIAL:
  GET    /api/social/leaderboard    → Leaderboard
  GET    /api/social/following      → Following list
  POST   /api/social/follow/:userId → Follow user
  DELETE /api/social/follow/:userId → Unfollow user
  GET    /api/social/feed           → Activity feed
  GET    /api/social/profile/:id    → User public profile
  GET    /api/social/copy-settings  → List copy settings
  POST   /api/social/copy-settings  → Create/update copy setting
  DELETE /api/social/copy-settings/:id → Remove copy setting

ANALYTICS:
  GET    /api/analytics/overview    → Overview stats
  GET    /api/analytics/by-bot     → Per-bot breakdown
  GET    /api/analytics/by-market  → Per-market breakdown
  GET    /api/analytics/by-strategy→ Per-strategy breakdown

BACKTEST:
  POST   /api/backtest/run         → Run backtest
  GET    /api/backtest/:id/results → Get results
  GET    /api/backtest/:id/status  → Check status

USER:
  GET    /api/user/profile         → Current user
  PATCH  /api/user/profile         → Update profile
  PATCH  /api/user/password        → Change password
  POST   /api/user/2fa/enable      → Enable 2FA
  POST   /api/user/2fa/verify      → Verify 2FA setup
  DELETE /api/user/2fa             → Disable 2FA
  GET    /api/user/2fa/backup-codes→ Get backup codes
  GET    /api/user/settings        → Get settings
  PATCH  /api/user/settings        → Update settings
  GET    /api/user/sessions        → Active sessions
  DELETE /api/user/sessions/:id    → Revoke session
  DELETE /api/user/account         → Delete account

NOTIFICATIONS:
  GET    /api/notifications        → List notifications
  PATCH  /api/notifications/:id    → Mark as read
  POST   /api/notifications/read-all → Mark all read
  POST   /api/notifications/push/subscribe → Push subscription
```

### 12.4 WebSocket Event Map

```
DERIV WEBSOCKET (outbound → Deriv API):
  { "authorize": "<token>" }
  { "active_symbols": "brief", "product_type": "basic" }
  { "trading_times": "<date>" }
  { "tick": "<symbol>", "subscribe": 1 }
  { "ticks_history": "<symbol>", "count": 1000, "end": "latest", "style": "candles", "granularity": 60 }
  { "proposal": { "amount": 0.35, "basis": "stake", "contract_type": "CALL", "currency": "USD", "symbol": "R_10", "duration": 5, "duration_unit": "t" }, "subscribe": 1 }
  { "buy": "<proposal_id>", "price": 0.35 }
  { "sell": "<contract_id>", "price": <sell_price> }
  { "balance": 1, "subscribe": 1 }
  { "proposal_open_contract": 1, "subscribe": 1 }
  { "statement": { "limit": 50, "offset": 0 } }
  { "profit_table": { "limit": 50, "offset": 0, "description": 1, "sort": "ASC" } }
  { "forget": "<subscription_id>" }
  { "ping" }

DERIV WEBSOCKET (inbound ← Deriv API):
  { "authorize": { "loginid", "balance", "currency", "email", ... } }
  { "active_symbols": [{ "symbol", "display_name", "market", ... }] }
  { "tick": { "symbol", "quote", "epoch", "id" } }
  { "ohlc": { "open", "high", "low", "close", "epoch", ... } }
  { "proposal": { "ask_price", "payout", "spot", "id", ... } }
  { "buy": { "contract_id", "purchase_time", "balance_after", ... } }
  { "sell": { "balance_after", "sell_price", "profit", ... } }
  { "balance": { "balance", "currency", "id" } }
  { "proposal_open_contract": { "contract_id", "is_sold", "profit", ... } }

INTERNAL SOCKET.IO (server → client):
  "bot:status"         → { botId, status, message }
  "bot:trade"          → { botId, trade }
  "bot:tick"           → { botId, tick }
  "bot:log"            → { botId, level, message }
  "bot:pnl"            → { botId, pnl, totalTrades }
  "trade:result"       → { contractId, isWin, profit }
  "balance:update"     → { balance, currency }
  "social:activity"    → { userId, action, details }
  "notification:new"   → { notification }
  "automation:triggered" → { ruleId, ruleName }

INTERNAL SOCKET.IO (client → server):
  "bot:subscribe"      → { botId }        (watch bot updates)
  "bot:unsubscribe"    → { botId }
  "ticks:subscribe"    → { symbol[] }     (watch market prices)
  "ticks:unsubscribe"  → { symbol[] }
  "social:subscribe"   → { userId[] }     (watch user activity)
```

---

## COMPLETE PAGE INDEX

```
HOME PAGES (3):
  H-1  /                          Landing Page
  H-2  /features                  Features Deep Dive
  H-3  /pricing                   Pricing & Plans

AUTH PAGES (7):
  A-1  /auth/signup               Sign Up
  A-2  /auth/signin               Sign In
  A-3  /auth/deriv/callback       Deriv OAuth Callback
  A-4  /auth/forgot-password      Forgot Password
  A-5  /auth/reset-password       Reset Password
  A-6  /auth/verify-email         Email Verification
  A-7  /auth/2fa                  Two-Factor Auth

DASHBOARD PAGES (14 — each with 5+ sections):
  D-1   /dashboard                Overview Hub
       Sections: Purpose, Layout, Components, Data Flow,
                 Advanced Features, Edge Cases, Performance,
                 Testing, Accessibility (8 total)
  D-2   /dashboard/markets        Markets Browser
  D-3   /dashboard/trade          Trade Execution
  D-4   /dashboard/bots           Bot Management
  D-5   /dashboard/bots/new       Bot Creator (covers new + config)
  D-6   /dashboard/scripts        Script List & Editor (covers list + :id)
  D-7   /dashboard/automation     Automation Hub
  D-8   /dashboard/portfolio      Portfolio / Positions
  D-9   /dashboard/social         Social / User Monitoring
  D-10  /dashboard/analytics      Performance Analytics
  D-11  /dashboard/connections    API Connections
  D-12  /dashboard/settings       Settings / Profile
  D-13  /dashboard/bots/:id       Bot Detail / Live Monitor
  D-14  /dashboard/backtest       Backtest Runner

NOTE: All 14 pages enhanced with 5 additional advanced sections each
      (Advanced Features, Edge Cases & Error Handling, Performance
      Considerations, Testing Strategy, Accessibility & UX Enhancements).

INVESTOR MODULE PAGES (see investorMO.md, 12 pages):
  I-1   /investors                Investor Dashboard Hub
  I-2   /investors/pools          Pool Trade Plans
  I-3   /investors/pools/new      Create Pool Plan
  I-4   /investors/pools/:id      Pool Detail / Live Monitor
  I-5   /investors/schedules      Trade Schedule Manager
  I-6   /investors/funds          Funds / Paid-In Finances
  I-7   /investors/investors      Investor Directory
  I-8   /investors/payouts        Payout Manager
  I-9   /investors/analytics      Investor Analytics
  I-10  /investors/documents      Documents & Compliance
  I-11  /investors/communications Communications
  I-12  /investors/settings       Investor Portal Settings

TOTAL: 27 PAGES (Trading) + 12 PAGES (Investor Module) = 39 PAGES
```

---

## IMPLEMENTATION PRIORITY / PHASES

```
PHASE 1 — MVP (Weeks 1-4):
  ✓ Landing page (H-1)
  ✓ Auth: signup, signin, deriv callback (A-1, A-2, A-3)
  ✓ Dashboard overview (D-1)
  ✓ Markets browser (D-2)
  ✓ Trade page (D-3)
  ✓ API connections (D-15)
  ✓ Deriv WebSocket connection
  ✓ Basic buy/sell via WebSocket

PHASE 2 — Bots & Scripts (Weeks 5-8):
  ✓ Bot management (D-4)
  ✓ Bot creator (D-5)
  ✓ Bot detail/monitor (D-6)
  ✓ Script editor (D-8, D-9)
  ✓ Bot execution engine (BullMQ + VM2)
  ✓ Preset strategies (martingale, DCA, fixed)
  ✓ Risk management engine
  ✓ Portfolio page (D-11)

PHASE 3 — Automation & Analytics (Weeks 9-11):
  ✓ Automation hub (D-10)
  ✓ Analytics page (D-13)
  ✓ Backtest runner (D-14)
  ✓ Forgot/reset password (A-4, A-5)
  ✓ Email verification (A-6)
  ✓ 2FA (A-7)

PHASE 4 — Social & Polish (Weeks 12-14):
  ✓ Social trading (D-12)
  ✓ Copy trade engine
  ✓ Leaderboard
  ✓ Activity feed
  ✓ Features page (H-2)
  ✓ Pricing page (H-3)
  ✓ Settings page (D-16)
  ✓ Notification system
  ✓ Mobile responsive

PHASE 5 — Scale & Optimize (Weeks 15+):
  ✓ Load testing
  ✓ Multi-server bot workers
  ✓ Advanced script templates
  ✓ AI adaptive strategy
  ✓ Team features
  ✓ Public API for external integrations
  ✓ Mobile app (React Native)
```

---

This outline gives you the full blueprint — every page, every component, every API call, every database table, the complete Deriv WebSocket integration pattern (matching how BMX Bot connects), the bot execution engine, the sandboxed script engine, the copy trading system, and the deployment architecture. Start with Phase 1 and build incrementally.