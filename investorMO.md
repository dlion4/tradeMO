# DerivX — Investor & Crowdfunding Module Outline

## Admin-Side First — Investor / Trader Pool Management

> Companion file to `tradeMO.md`. This module adds an investor-facing admin layer that lets the platform operator run crowdfunding-style trading pools: pool trade plans, schedules, paid-in capital tracking, investor roster, payouts/distributions, analytics, documents, communications, and portal settings. The pages below are designed to ship as a **frontend-first admin console** with mock data and no backend integration required for the initial pass. Each page is wired to a typed mock JSON shape so that swapping the mock for real API calls later is a one-line change.

---

## TABLE OF CONTENTS

```
1.  MODULE OVERVIEW & ARCHITECTURE (admin-side first)
    (1.6 = UI/STYLING & MOTION SYSTEM: Bootstrap 5.3 + TanStack + page-scoped CSS)
2.  SHARED DATA MODELS (mock JSON shapes)
3.  INVESTOR PAGES (12)
       I-1   /investors                  Investor Dashboard Hub
       I-2   /investors/pools             Pool Trade Plans
       I-3   /investors/pools/new         Create Pool Plan
       I-4   /investors/pools/:id         Pool Detail / Live Monitor
       I-5   /investors/schedules         Trade Schedule Manager
       I-6   /investors/funds             Funds / Paid-In Finances
       I-7   /investors/investors         Investor Directory
       I-8   /investors/payouts           Payout Manager
       I-9   /investors/analytics         Investor Analytics
       I-10  /investors/documents         Documents & Compliance
       I-11  /investors/communications   Communications
       I-12  /investors/settings          Investor Portal Settings
4.  ROUTE MAP & SIDEBAR NAV
5.  MOCK DATA STORE (single source of truth)
6.  MIGRATION PATH: Mock -> Real Backend
```

---

## 1. MODULE OVERVIEW & ARCHITECTURE

### 1.1 Purpose

The Investor Module is the **admin-side crowdfunding console** for DerivX. It enables the platform operator to:

- **Pool capital** from multiple investors into a single trading pool bound to one or more Deriv trading bots.
- **Schedule** trading windows (when the pool is active), payout windows (when distributions happen), and blackout periods (holidays, market closures).
- **Track paid-in finances**: capital commitments, capital calls, paid-in vs committed capital, NAV per investor.
- **Manage investors**: KYC status, AUM, contact info, tax forms.
- **Run payouts**: distribution queue with waterfall logic (preferred return, GP catch-up, carried interest).
- **Report**: investor-level performance, attribution, fee schedules, document delivery.

### 1.2 Admin-Side First Principle

The first release of this module ships with **no backend integration**. All data lives in a typed mock store on the client. This lets the operator validate the UX, data shapes, and admin workflows before committing to a backend build. The migration path to a real backend is documented in section 6.

### 1.3 Tech Stack (inherits from tradeMO.md)

```
FRONTEND:
  TanStack Start (React 19) + TanStack Router (file-based, type-safe routes)
  Bootstrap 5.3.x (latest) + Bootstrap Icons — responsive base
  Per-page scoped custom CSS (one stylesheet per route, never shared across pages)
  Zustand (client state) + TanStack Query (mock queries for now)
  Recharts + Lightweight Charts (pool P&L curves)
  React Hook Form + Zod (investor + pool forms)
  date-fns + tz (schedules, payouts)
  React-PDF (document previews)
  Animation: CSS keyframes + Animate.css (entrance/stagger); animated SVG
  + Lottie icons for live data, loading and empty states

ADMIN THEME:
  Sidebar: persistent, collapsible; offcanvas below lg (Bootstrap)
  Topbar: admin user menu, env badge ("Mock Data"), dark-mode toggle
  Density: comfortable (more whitespace than trader UI)
  Color: investor module uses a distinct accent (deep indigo) to
         visually separate from trader dashboard (emerald)
  Cards: rounded-4, soft shadow, hover-lift, staggered entrance
```

### 1.4 Route Group

```
src/routes/ (TanStack Router — file-based, type-safe)
  _investors/                       -> pathless layout route
    route.tsx                       -> InvestorLayout (sidebar + topbar)
    index.tsx                       -> I-1  Investor Dashboard Hub
    pools/
      index.tsx                     -> I-2  Pool Trade Plans
      new.tsx                       -> I-3  Create Pool Plan
      $id.tsx                       -> I-4  Pool Detail / Live Monitor
    schedules.tsx                   -> I-5  Trade Schedule Manager
    funds.tsx                       -> I-6  Funds / Paid-In Finances
    investors.tsx                   -> I-7  Investor Directory
    payouts.tsx                     -> I-8  Payout Manager
    analytics.tsx                   -> I-9  Investor Analytics
    documents.tsx                   -> I-10 Documents & Compliance
    communications.tsx              -> I-11 Communications
    settings.tsx                    -> I-12 Investor Portal Settings

src/styles/pages/ (PAGE-SCOPED CSS — imported ONLY by its own route,
code-split with that route's chunk, injected on enter / removed on leave,
every rule namespaced under the page root class so nothing leaks to
other pages)
    _investors-hub.scss             -> I-1   .page-i-hub
    _investors-pools.scss           -> I-2   .page-i-pools
    _investors-pool-new.scss        -> I-3   .page-i-pool-new
    _investors-pool-detail.scss     -> I-4   .page-i-pool-detail
    _investors-schedules.scss       -> I-5   .page-i-schedules
    _investors-funds.scss           -> I-6   .page-i-funds
    _investors-directory.scss       -> I-7   .page-i-directory
    _investors-payouts.scss         -> I-8   .page-i-payouts
    _investors-analytics.scss       -> I-9   .page-i-analytics
    _investors-documents.scss       -> I-10  .page-i-documents
    _investors-communications.scss  -> I-11  .page-i-communications
    _investors-settings.scss        -> I-12  .page-i-settings
```

### 1.5 Sidebar Navigation

```
INVESTOR MODULE SIDEBAR:
  [📊 Dashboard]              -> /investors
  [💼 Pool Trade Plans]       -> /investors/pools
  [⏰ Schedules]              -> /investors/schedules
  [💰 Funds / Paid-In]        -> /investors/funds
  [👥 Investors]              -> /investors/investors
  [💸 Payouts]               -> /investors/payouts
  [📈 Analytics]              -> /investors/analytics
  [📄 Documents]              -> /investors/documents
  [✉️ Communications]         -> /investors/communications
  [⚙️ Settings]               -> /investors/settings

  ─────────────────────────
  [🔁 Switch to Trader UI]    -> /dashboard
  [🟡 MOCK DATA badge]        -> top-right indicator
```

### 1.6 UI, STYLING & MOTION SYSTEM (Bootstrap 5.3 + TanStack)

> Investor-module styling contract. Every page I-1..I-12 is built on the
> latest Bootstrap 5.3.x responsive base plus its OWN scoped stylesheet
> (mapped 1-to-1 in section 1.4). Conventions only — no code yet.

```
BOOTSTRAP 5.3.x RESPONSIVE BASE (all 12 pages):
  Grid:      KPI rows col-12 → sm-6 → lg-3; row-cols-* card grids; g-3/g-4
  Sidebar:   fixed on lg+ / offcanvas (-start) below lg, with backdrop
  Tables:    table-responsive; tables become stacked cards below md
  Modals:    responsive modals + offcanvas drawers (payout detail, KYC review)
  Utilities: d-*, flex-*, gap-*, ratio (charts), rounded-4, shadow-sm/hover-lg
  Dark mode: data-bs-theme="dark" native 5.3 toggle in topbar

INVESTOR VISUAL THEME (deep indigo accent):
  Tokens:    --inv-accent (indigo), --inv-accent-soft (indigo tint),
             emerald for NAV-up, rose for NAV-down
  Cards:     surface, 16px radius, soft shadow, 1px border; hover:
             translateY(-3px) + shadow-lg (200ms CSS transition)
  Sections:  each section wrapped in a .card with a .card-header eyebrow
             label (uppercase, letter-spaced, indigo accent bar)

ANIMATION & ANIMATED ICONS (every page):
  Entrance:  staggered fade + slide-up on KPI cards and sections (60ms)
  Count-up:  AUM / NAV / payout numbers animate on mount
  Live:      pulse-dot on active pools; spin icon on refresh; shimmer on
             mock-data skeletons; NAV arrow flip + row flash on updates
  Icons:     Bootstrap Icons + animated SVG set (spin/pulse/bounce/draw);
             Lottie for empty states and payout success celebrations
  Charts:    draw-in animation on pool P&L curve mount
  A11y:      prefers-reduced-motion disables all of the above

PAGE-SCOPED CSS RULE (never shared):
  Each page imports only its own file (see 1.4 mapping). Any look unique
  to one page — e.g. waterfall bars on I-8, timeline chrome on I-5,
  schedule calendar skin on I-5 — lives ONLY in that page's stylesheet,
  never in shared tokens and never visible on other pages.
```

---

## 2. SHARED DATA MODELS (Mock JSON Shapes)

These shapes are the contract between the mock store and every page. When a real backend lands, only the fetch layer changes.

```typescript
// Mock data store: /lib/investors/mock-store.ts

type Currency = "USD" | "EUR" | "GBP" | "BTC";
type PoolStatus = "draft" | "fundraising" | "active" | "paused" | "closed" | "liquidated";
type InvestorStatus = "prospect" | "kyc_pending" | "kyc_verified" | "active" | "suspended" | "exited";
type PayoutStatus = "draft" | "approved" | "processing" | "paid" | "failed" | "reversed";
type ScheduleType = "trade_window" | "payout_window" | "blackout" | "capital_call";

interface Investor {
  id: string;                    // "inv_001"
  legalName: string;            // "Jane Doe"
  displayName: string;          // "Jane D."
  email: string;
  phone?: string;
  type: "individual" | "entity";  // LP vs fund-of-funds
  accreditationStatus: "verified" | "pending" | "expired" | "rejected";
  kycStatus: "verified" | "pending" | "missing";
  taxForm: "W-9" | "W-8BEN" | "W-8BEN-E" | "missing";
  committedCapital: number;      // total pledged across all pools
  paidInCapital: number;         // actually contributed
  nav: number;                   // net asset value (current)
  unrealizedPnL: number;
  realizedPnL: number;
  carriedInterestPaid: number;
  managementFeesPaid: number;
  joinedAt: string;              // ISO date
  tags: string[];                // ["vip", "early_backer"]
  pools: string[];               // pool IDs
  avatarColor: string;           // for initials avatar
}

interface PoolPlan {
  id: string;                    // "pool_001"
  name: string;                  // "Q1 2026 Volatility Pool"
  description: string;
  status: PoolStatus;
  strategy: "martingale" | "dca" | "scalping" | "swing" | "custom";
  symbol: string;                // Deriv symbol, e.g. "R_10"
  botId?: string;                // linked DerivX bot
  targetReturnPct: number;       // e.g. 12 (annualized)
  hurdleRatePct: number;        // preferred return, e.g. 8
  carriedInterestPct: number;    // GP share, e.g. 20
  managementFeePct: number;     // annual, e.g. 2
  durationMonths: number;        // pool lifetime
  fundraisingStart: string;
  fundraisingEnd: string;
  tradingStart: string;
  tradingEnd: string;
  minCommitment: number;
  maxCommitment: number;
  totalCommitted: number;
  totalPaidIn: number;
  totalCalled: number;
  totalDistributed: number;
  nav: number;
  realizedPnL: number;
  unrealizedPnL: number;
  investorCount: number;
  feeStructure: FeeStructure;
  waterfall: WaterfallConfig;
  schedule: ScheduleEntry[];
  documents: string[];           // doc IDs
  createdAt: string;
  updatedAt: string;
}

interface FeeStructure {
  managementFeePct: number;      // 2.0
  managementFeeFreq: "monthly" | "quarterly" | "annual";
  carriedInterestPct: number;    // 20
  hurdleRatePct: number;         // 8 (preferred return)
  catchUpPct: number;            // 100 (GP catch-up after hurdle)
  highWaterMark: boolean;        // fees only on new gains
  feePaymentMethod: "in_advance" | "in_arrears";
}

interface WaterfallConfig {
  type: "european" | "american";
  tiers: WaterfallTier[];
}

interface WaterfallTier {
  name: string;                  // "Preferred Return"
  lpSharePct: number;             // 100
  gpSharePct: number;             // 0
  thresholdPct: number;           // 0 to 8
  cumulative: boolean;
}

interface ScheduleEntry {
  id: string;
  poolId: string;
  type: ScheduleType;
  title: string;                 // "Daily trade window"
  startAt: string;                // ISO datetime
  endAt: string;
  recurrence: "once" | "daily" | "weekly" | "monthly" | "custom_cron";
  cronExpr?: string;             // for custom
  notes?: string;
}

interface CapitalCall {
  id: string;
  poolId: string;
  investorId: string;
  amount: number;
  currency: Currency;
  dueDate: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  sentAt?: string;
  paidAt?: string;
  method: "wire" | "ach" | "crypto" | "manual";
  reference?: string;
}

interface Payout {
  id: string;
  poolId: string;
  investorId: string;
  type: "distribution" | "return_of_capital" | "carry" | "fee" | "tax";
  amount: number;
  currency: Currency;
  status: PayoutStatus;
  scheduledFor: string;
  processedAt?: string;
  method: "wire" | "ach" | "crypto" | "manual";
  waterfallStep: string;         // "preferred_return" | "gp_catchup" | "carry"
  taxWithheld: number;
  netAmount: number;
  transactionId?: string;
  createdAt: string;
}

interface InvestorDocument {
  id: string;
  investorId?: string;           // optional, if pool-level
  poolId?: string;
  type: "subscription_agreement" | "kyc_id" | "kyc_address" | "tax_form"
      | "quarterly_report" | "capital_call_notice" | "distribution_notice"
      | "audited_statements" | "marketing_deck" | "other";
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedBy: string;
  status: "draft" | "pending_review" | "approved" | "rejected" | "expired";
  sharedWithInvestor: boolean;
  eSigned: boolean;
  expiresAt?: string;
  url: string;                   // mock: /mock/docs/{id}.pdf
}

interface Communication {
  id: string;
  type: "email" | "sms" | "in_app" | "push";
  channel: "broadcast" | "pool" | "individual";
  subject: string;
  body: string;
  recipients: string[];          // investor IDs, or ["all"]
  poolId?: string;
  sentAt?: string;
  scheduledFor?: string;
  status: "draft" | "scheduled" | "sending" | "sent" | "failed";
  openRate?: number;
  clickRate?: number;
  templateId?: string;
  createdAt: string;
}

interface AdminSettings {
  defaultFeeStructure: FeeStructure;
  defaultWaterfall: WaterfallConfig;
  minCommitmentGlobal: number;
  maxCommitmentGlobal: number;
  currenciesSupported: Currency[];
  taxWithholdingRules: TaxRule[];
  adminUsers: AdminUser[];
  brandColor: string;
  supportEmail: string;
  legalEntityName: string;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "investor_manager" | "ops" | "compliance" | "viewer";
  permissions: string[];
  lastActiveAt: string;
}

interface TaxRule {
  countryCode: string;           // "US", "GB"
  formRequired: "W-9" | "W-8BEN" | "W-8BEN-E";
  defaultWithholdingPct: number;
  treatyReductionPct?: number;
}
```

### 2.1 Mock Data Volumes (for initial admin demo)

```
INVESTORS:        24 records (mix of individuals + entities)
POOL PLANS:       6 records (1 draft, 1 fundraising, 2 active, 1 paused, 1 closed)
CAPITAL CALLS:    18 records (mix of paid/pending/overdue)
PAYOUTS:          32 records (mix of paid/processing/scheduled/failed)
SCHEDULES:        14 entries (trade windows, payout windows, blackouts)
DOCUMENTS:        47 records (subscription agreements, KYC, reports, notices)
COMMUNICATIONS:   12 records (broadcasts, pool-specific, individual)
```

---


## 3. INVESTOR PAGES (12)

Each page below has **5+ sections** (same enrichment pattern as tradeMO.md):
Purpose, Layout, Components Breakdown, Data Flow, Advanced Features,
Edge Cases & Error Handling, Performance Considerations, Testing Strategy,
Accessibility & UX Enhancements.

STYLE & MOTION RULE (applies to every page I-1..I-12): each page uses the
Bootstrap 5.3 responsive base from 1.6, ships its OWN page-scoped stylesheet
(loaded only by that route, never shared with other pages), and includes
entrance + micro-interaction animations, animated icons for live data, and
responsive styled cards/sections that restack on mobile.

---

### PAGE I-1: Investor Dashboard Hub (`/investors`)

```
PURPOSE:
  Top-level command center for the investor module operator.
  Shows total AUM across all pools, capital deployment status,
  active pools, recent payouts, pending capital calls, and
  investor activity. Designed for a 5-second status glance.

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  TOPBAR: [Mock Data badge] [Search] [Bell] [Admin ▼]   │
├──────────┬──────────────────────────────────────────────┤
│ SIDEBAR  │  WELCOME, {adminName}                        │
│          │  Last login: 2 hours ago · Role: Super Admin  │
│ (see     │                                              │
│  1.5)    │  ┌─────────────────────────────────────────┐ │
│          │  │  KPI CARDS (4)                          │ │
│          │  │  ┌──────┐┌──────┐┌──────┐┌──────┐    │ │
│          │  │  │AUM   ││Active││Pend. ││This  │    │ │
│          │  │  │$4.2M ││Pools ││Calls ││Month │    │ │
│          │  │  │+12%  ││ 4    ││ $250K││ +$42K│    │ │
│          │  │  └──────┘└──────┘└──────┘└──────┘    │ │
│          │  └─────────────────────────────────────────┘ │
│          │                                              │
│          │  ┌────────────────┬─────────────────────┐   │
│          │  │ POOL SUMMARY   │  PENDING ACTIONS    │   │
│          │  │                │                      │   │
│          │  │ Q1 2026 Vol    │  • 3 capital calls   │   │
│          │  │ $1.2M · 8 inv. │    overdue ($180K)   │   │
│          │  │ ↑ +4.2% NAV    │  • 2 payouts failed │   │
│          │  │                │    (retry queue)     │   │
│          │  │ Q4 2025 FX     │  • 5 KYC docs        │   │
│          │  │ $890K · 12 inv.│    pending review    │   │
│          │  │ ↑ +2.8% NAV    │  • 1 pool closing    │   │
│          │  │                │    tomorrow          │   │
│          │  │ [View all →]   │                      │   │
│          │  └────────────────┴─────────────────────┘   │
│          │                                              │
│          │  ┌────────────────┬─────────────────────┐   │
│          │  │ AUM TREND      │  RECENT PAYOUTS     │   │
│          │  │ (line chart)   │  (table)             │   │
│          │  │ 12 months      │  Pool  | Inv | $    │   │
│          │  │                │  Q1Vol | J.D | $4.2K│   │
│          │  │                │  Q4FX  | R.M | $1.8K│   │
│          │  └────────────────┴─────────────────────┘   │
└──────────┴──────────────────────────────────────────────┘
```

#### Components Breakdown

```
InvestorDashboardPage/
  ├── WelcomeHeader
  │     ├── adminName: string
  │     ├── lastLogin: Date
  │     └── role: AdminRole
  │
  ├── KpiCards (4)
  │     ├── AumCard
  │     │     ├── totalAum: number
  │     │     ├── changePct: number
  │     │     ├── trend: "up" | "down"
  │     │     └── sparkline: { x: string, y: number }[]
  │     ├── ActivePoolsCard
  │     │     ├── count: number
  │     │     ├── fundraisingCount: number
  │     │     └── closingSoonCount: number
  │     ├── PendingCallsCard
  │     │     ├── totalAmount: number
  │     │     ├── overdueCount: number
  │     │     └── dueThisWeek: number
  │     └── MonthPnlCard
  │           ├── realizedPnL: number
  │           ├── unrealizedPnL: number
  │           └── feesCollected: number
  │
  ├── PoolSummaryPanel
  │     ├── pools: PoolPlan[] (top 4 by AUM)
  │     └── onViewAll: () -> /investors/pools
  │
  ├── PendingActionsPanel
  │     ├── overdueCalls: CapitalCall[]
  │     ├── failedPayouts: Payout[]
  │     ├── pendingKycDocs: InvestorDocument[]
  │     └── closingPools: PoolPlan[]
  │
  ├── AumTrendChart
  │     ├── data: { month: string, aum: number }[] (12 months)
  │     └── chartType: "area" (Recharts)
  │
  └── RecentPayoutsTable
        ├── payouts: Payout[] (last 5)
        ├── columns: pool, investor, amount, status, date
        └── onViewAll: () -> /investors/payouts
```

#### Data Flow

```
ON MOUNT (mock):
  1. Read all investors from mock store
  2. Sum committedCapital, paidInCapital, nav -> AUM
  3. Filter pools by status=active -> ActivePoolsCard
  4. Filter capital calls by status=overdue -> PendingCallsCard
  5. Filter payouts by status=failed -> PendingActionsPanel
  6. Aggregate payouts this month -> MonthPnlCard
  7. Build AUM trend from historical snapshots (mock array)

PERIODIC REFRESH (mock):
  - Re-aggregate every 30s (simulating "live" updates)
  - In real backend: WebSocket events for payout/call status changes

PENDING ACTIONS CLICK:
  - Click overdue call -> /investors/funds?filter=overdue
  - Click failed payout -> /investors/payouts?filter=failed
  - Click KYC doc -> /investors/documents?filter=pending_review
```

#### Advanced Features

```
1. ROLE-AWARE DASHBOARD
   - Super Admin sees everything (all pools, all investors)
   - Investor Manager sees only assigned pools
   - Compliance sees only KYC + document panels
   - Viewer sees KPIs + charts, no action buttons

2. CUSTOMIZABLE WIDGET GRID
   - Drag-and-drop widgets (react-grid-layout)
   - Add/remove widgets from gallery
   - Save layout per user

3. PENDING ACTIONS SMART PRIORITIZATION
   - Sort by severity (overdue call > failed payout > KYC pending)
   - "Snooze" action for non-urgent items
   - Auto-escalation: if action pending > 7 days, flag red

4. DAILY DIGEST EMAIL
   - Auto-send daily summary at 09:00 admin TZ
   - Includes: today's calls due, payouts scheduled, expiring docs
   - Configurable per admin user

5. POOL HEALTH SCORES
   - 0-100 score per pool: NAV trend, investor count, fee collection
   - Color-coded badges
   - Click -> pool detail page

6. RECENT ACTIVITY TIMELINE
   - Sidebar/section showing last 20 admin actions
   - "Jane D. committed $50K to Q1 Vol Pool" (1h ago)
   - "Capital call #CC-023 paid by R. Mwangi" (3h ago)

7. QUICK ACTION SHORTCUTS
   - "+ New Pool" button in header
   - "Send Capital Call" dropdown
   - "Schedule Payout" dropdown
```

#### Edge Cases & Error Handling

```
SCENARIO                              ACTION
─────────────────────────────────────────────────────────────────
No pools created yet                  Show onboarding empty state:
                                      "Create your first pool plan"
                                      CTA -> /investors/pools/new

No investors onboarded                Show "Invite first investor" CTA
                                      Don't render KPI cards (all 0s)

AUM trend data missing (new install)  Show "Trend builds over time"
                                      Don't render broken chart

Pending action references deleted     Auto-hide stale entries
entity (cascade delete missed)        Log warning to console

Role has no pools assigned            Show "No pools assigned to you
                                      yet. Contact super admin."

Mock store fails to load              Show error boundary with retry
                                      "Failed to load investor data"
```

#### Performance Considerations

```
- Memoize all KPI calculations (useMemo)
- Pool summary: top 4 by AUM (already cached in mock)
- AUM trend: pre-aggregated daily in mock store
- Pending actions: < 50 items, no virtualization needed
- Lazy-load AumTrendChart (Recharts is heavy)
- TanStack Query: staleTime 30s (mock data doesn't change often)
```

#### Testing Strategy

```
UNIT TESTS:
  - KPI calculations: AUM = sum(investor.nav)
  - Pending actions filter logic
  - Role-based widget visibility
  - Empty state rendering

INTEGRATION:
  - Mount with mock store -> assert KPIs populated
  - Click pending action -> assert navigation with filter
  - Switch admin role -> assert widgets hide/show

E2E:
  - Land on /investors -> see 4 KPI cards + pool summary
  - Click "View all" pools -> navigate to /investors/pools
  - Refresh page -> data persists (mock in localStorage)
```

#### Accessibility & UX Enhancements

```
- KPI cards: role="region" + aria-label="Total AUM 4.2 million dollars"
- Trend arrows: include text "up 12 percent" not just color
- Pending actions: list with proper role="list"
- Quick actions: keyboard accessible dropdowns
- Status badges: text + icon, not color alone
- Reduced motion: disable chart animations
- High contrast mode for KPI cards
```

---

### PAGE I-2: Pool Trade Plans (`/investors/pools`)

```
PURPOSE:
  Browse, filter, and manage all pool trade plans.
  Each pool is a crowdfunding-style vehicle that aggregates
  investor capital into a single Deriv trading strategy.

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  "Pool Trade Plans"            [+ New Pool Plan]        │
│  [All] [Draft] [Fundraising] [Active] [Paused] [Closed]│
│  [🔍 Search...]  [Strategy ▼]  [Symbol ▼]  [Export]    │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  POOL CARDS GRID                                        │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 🟢 Q1 2026 Volatility Pool                      │   │
│  │ Strategy: Martingale | Symbol: R_10             │   │
│  │ Status: Active · 8 investors                     │   │
│  │ Committed: $1.2M | Paid-in: $1.05M              │   │
│  │ NAV: $1.09M  ↑ +4.2%                            │   │
│  │ Target: 12% | Hurdle: 8% | Carry: 20%            │   │
│  │ Trading: Jan 1 - Mar 31, 2026                    │   │
│  │ [Open] [Edit] [Pause] [Close]                    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 🟡 Q2 2026 FX Pool                              │   │
│  │ Strategy: DCA | Symbol: frxEURUSD              │   │
│  │ Status: Fundraising · 5 investors               │   │
│  │ Committed: $480K (target $1.0M)                 │   │
│  │ Target: 10% | Hurdle: 6% | Carry: 15%           │   │
│  │ Fundraising ends: Apr 15, 2026                   │   │
│  │ [Open] [Edit] [Send Invites] [Cancel]            │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ ⚪ Q3 2025 Crypto Pool (Closed)                  │   │
│  │ Final NAV: $780K | Return: +8.2%                 │   │
│  │ Distributed: $845K | Investors: 11               │   │
│  │ [View Final Report]                              │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  POOL STATISTICS                                        │
│  Total Committed: $3.8M | Total NAV: $3.92M            │
│  Avg Target Return: 11.4% | Avg Carry: 18%             │
│  Active Investors: 24                                   │
└─────────────────────────────────────────────────────────┘
```

#### Components Breakdown

```
PoolsPage/
  ├── PoolsHeader
  │     ├── totalCount: number
  │     ├── onCreateNew: () -> /investors/pools/new
  │     └── exportAction: () -> CSV download
  │
  ├── PoolsFilter
  │     ├── status: PoolStatus[] (multi-select)
  │     ├── strategy: Strategy[] (multi-select)
  │     ├── symbol: string[] (multi-select)
  │     ├── searchQuery: string
  │     └── sortBy: "name" | "committed" | "nav" | "return" | "recent"
  │
  ├── PoolCard[] (grid)
  │     ├── id, name, status, strategy, symbol
  │     ├── committed, paidIn, nav, returnPct
  │     ├── targetReturn, hurdle, carry, mgmtFee
  │     ├── tradingStart, tradingEnd
  │     ├── investorCount
  │     ├── actions:
  │     │     ├── open: () -> /investors/pools/{id}
  │     │     ├── edit: () -> /investors/pools/{id}/edit
  │     │     ├── pause/resume: () -> PATCH /api/pools/{id}/status
  │     │     ├── close: () -> POST /api/pools/{id}/close
  │     │     ├── sendInvites: () -> /investors/communications?pool={id}
  │     │     └── cancel: () -> DELETE /api/pools/{id} (draft only)
  │     └── healthScore: number (0-100)
  │
  └── PoolsStatistics
        ├── totalCommitted: number
        ├── totalNav: number
        ├── avgTargetReturn: number
        ├── avgCarry: number
        └── activeInvestorCount: number

DATA SOURCE (mock):
  - mockStore.pools (6 records)
  - Filtered client-side
  - In real backend: GET /api/pools with query params
```

#### Data Flow

```
ON MOUNT:
  1. Load all pools from mock store
  2. Apply default filter: status != "draft" (hidden unless toggled)
  3. Sort by updatedAt desc
  4. Render pool cards in grid

FILTER CHANGES:
  - Update URL query params (shareable)
  - Re-filter client-side
  - Persist filter to localStorage for session continuity

ACTIONS:
  - Pause pool: update status in mock, show toast, re-render
  - Close pool: confirmation modal -> final report generation
  - Send invites: navigate to /investors/communications?pool={id}
```

#### Advanced Features

```
1. POOL COMPARISON VIEW
   - Select 2-4 pools -> side-by-side comparison
   - Compare: returns, fees, investor count, NAV trend
   - Identify which strategy is outperforming

2. POOL TEMPLATES
   - Save pool config as template (without investors)
   - "Quick create" from template (90% fields pre-filled)
   - Templates gallery with descriptions

3. FUNDRAISING DASHBOARD PER POOL
   - Mini progress bar on card: committed / target
   - Days remaining in fundraising window
   - Top contributors preview (3 avatars + "+N more")

4. POOL LIFECYCLE TIMELINE
   - Visual timeline on card hover/expand:
     Draft -> Fundraising -> Active -> Closing -> Closed
   - Current stage highlighted
   - Next milestone + ETA

5. BULK ACTIONS
   - Select multiple pools via checkboxes
   - Bulk pause / close / export
   - Bulk send communications

6. POOL CLONING
   - "Duplicate" action: clone config without investors
   - Useful for quarterly pool rotation

7. POOL TAGS & CATEGORIES
   - Tag pools: "Volatility", "Forex", "Crypto", "Income", "Growth"
   - Filter by tag in sidebar
   - Color-coded tags

8. SAVED VIEWS
   - Save current filter as named view
   - Quick switch between views
   - Share view URL with team
```

#### Edge Cases & Error Handling

```
SCENARIO                              ACTION
─────────────────────────────────────────────────────────────────
No pools exist                         Show empty state:
                                      "No pool plans yet. Create your
                                       first pool to start fundraising."
                                      + CTA button

Pool with 0 investors                  Show "No investors yet" badge
                                      Disable "Send Invites" until
                                      pool has at least 1 prospect

Pool closing failed (open trades)      Block close action
                                      Show "Close open positions first"
                                      with link to bot detail

Fundraising target exceeded            Show "Oversubscribed" badge
                                      Auto-cap additional commitments
                                      (configurable)

Pool duration ending soon (< 7 days)  Show "Closing soon" warning
                                      Suggest renewal/extension action

Investor count drops to 0 mid-pool     Don't auto-close (capital locked)
                                      Show warning + suggest wind-down
```

#### Performance Considerations

```
- Grid: paginate (12 per page) or infinite scroll
- PoolCard: React.memo with custom comparator (id, status, nav)
- Filter: debounced (200ms)
- Statistics: precompute on data change (useMemo)
- Health score: cached in mock, recomputed on pool update
- Lazy-load PoolComparison modal
```

#### Testing Strategy

```
UNIT TESTS:
  - Filter logic: status, strategy, symbol combinations
  - Sort comparators
  - Health score formula
  - Empty state rendering
  - Pool card actions call correct handlers

INTEGRATION:
  - Load pools -> assert grid populated
  - Filter by status=active -> assert only active pools shown
  - Click "New Pool" -> navigate to /investors/pools/new
  - Pause pool -> assert status updates

E2E:
  - Browse pools, filter by Active, open first pool detail
  - Test bulk pause on 3 pools
  - Test pool cloning (duplicate, edit name, save)
```

#### Accessibility & UX Enhancements

```
- Cards: role="article" + descriptive aria-label
- Status badges: text + color (Active/Fundraising/Closed)
- Filter chips: keyboard navigable, removable via Backspace
- Bulk select: shift+click for range
- Sort dropdown: announces sort change to screen readers
- Empty state: clear CTA with icon
- Reduced motion: disable card hover animations
```

---

### PAGE I-3: Create Pool Plan (`/investors/pools/new`)

```
PURPOSE:
  Multi-step wizard to create a new pool trade plan.
  Configures: basic info, strategy, funding terms (commitments,
  fees, waterfall), schedule, risk limits, and final review.

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  "Create Pool Plan"                                     │
│  ① Basic ━② Strategy ━③ Funding ━④ Schedule ━⑤ Risk ━⑥ Review │
│  ●━━━━━○━━━━━━━━━○━━━━━━━━━○━━━━━━━━━○━━━━━━━━━○        │
└─────────────────────────────────────────────────────────┘

STEP 1: BASIC INFO
┌─────────────────────────────────────────────────────────┐
│  Pool Name: [Q2 2026 Forex Pool          ]             │
│  Description: [Optional short summary    ]             │
│  Category: [Forex ▼]  Tags: [+ Add]                    │
│  Symbol: [frxEURUSD ▼]                                  │
│  Linked Bot: [DCA Bot ▼] (optional, can link later)   │
│                                          [Next →]       │
└─────────────────────────────────────────────────────────┘

STEP 2: STRATEGY
┌─────────────────────────────────────────────────────────┐
│  Choose Strategy:                                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐     │
│  │Marting. │ │  DCA    │ │Scalping │ │ Swing   │     │
│  │Aggress. │ │Stable   │ │Fast    │ │Trend    │     │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘     │
│  ┌─────────┐                                       │
│  │ Custom  │  -> links to /dashboard/scripts       │
│  └─────────┘                                       │
│                                                          │
│  Risk Profile: [Conservative ▼]                        │
│  Target Annual Return: [10] %                           │
│  Max Drawdown Tolerance: [15] %                         │
│                                          [← Back] [→]   │
└─────────────────────────────────────────────────────────┘

STEP 3: FUNDING TERMS
┌─────────────────────────────────────────────────────────┐
│  Commitment Window:                                     │
│  Fundraising Start: [Apr 1, 2026]                       │
│  Fundraising End:   [Apr 30, 2026]                      │
│                                                          │
│  Per-Investor Limits:                                   │
│  Min Commitment: [$10,000]                              │
│  Max Commitment: [$500,000]                             │
│  Target Pool Size: [$1,000,000]                         │
│  Hard Cap:        [$1,500,000]                          │
│                                                          │
│  Fee Structure:                                         │
│  Management Fee: [2.0] % [quarterly ▼]                  │
│  Carried Interest: [20] %                               │
│  Hurdle Rate (Preferred Return): [8] %                  │
│  GP Catch-up: [100] %                                   │
│  ☑ High Water Mark                                      │
│  Fee Payment: [In Advance ▼]                            │
│                                                          │
│  Waterfall: [European ▼] (whole-of-fund vs deal-by-deal)│
│                                          [← Back] [→]   │
└─────────────────────────────────────────────────────────┘

STEP 4: SCHEDULE
┌─────────────────────────────────────────────────────────┐
│  Trading Window:                                        │
│  Trading Start: [May 1, 2026 09:00 UTC]                 │
│  Trading End:   [Jul 31, 2026 17:00 UTC]                │
│                                                          │
│  Daily Trade Windows:                                    │
│  ☑ Mon-Fri 09:00-17:00 UTC                              │
│  ☐ Sat 10:00-14:00 UTC                                  │
│  ☐ Sun closed                                           │
│                                                          │
│  Payout Schedule:                                       │
│  ☑ Monthly distribution (1st of month)                  │
│  ☐ Quarterly distribution                               │
│  ☐ End-of-pool only                                     │
│                                                          │
│  Blackout Periods:                                      │
│  [+ Add blackout] (e.g. holidays, FOMC days)            │
│                                          [← Back] [→]   │
└─────────────────────────────────────────────────────────┘

STEP 5: RISK LIMITS
┌─────────────────────────────────────────────────────────┐
│  Pool-Level Risk Limits:                                │
│  Max Pool Drawdown: [10] % -> auto-pause if exceeded    │
│  Max Daily Loss:    [$50,000]                          │
│  Max Open Positions: [5]                                │
│  Max Stake Per Trade: [$25,000]                         │
│                                                          │
│  Auto-Actions:                                          │
│  ☑ Pause bot if drawdown > 10%                          │
│  ☑ Notify all investors on > 5% drawdown                │
│  ☑ Stop pool if total loss reaches 15%                 │
│                                                          │
│  Investor Protections:                                  │
│  ☑ KYC required before commitment                       │
│  ☑ Accreditation required for > $100K                  │
│  ☑ Lock-up period: [90] days                            │
│                                          [← Back] [→]   │
└─────────────────────────────────────────────────────────┘

STEP 6: REVIEW & CREATE
┌─────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────┐   │
│  │ Pool: Q2 2026 Forex Pool                         │   │
│  │ Strategy: DCA on frxEURUSD                       │   │
│  │ Fundraising: Apr 1 - Apr 30, 2026                │   │
│  │ Trading: May 1 - Jul 31, 2026                    │   │
│  │ Target: $1.0M (cap $1.5M) | Min inv: $10K        │   │
│  │ Fees: 2% mgmt | 20% carry | 8% hurdle             │   │
│  │ Waterfall: European, 100% catch-up                │   │
│  │ Risk: 10% max DD, $50K daily loss, 90d lockup    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  □ Save as draft                                        │
│  □ Save as template for reuse                           │
│  □ Open fundraising immediately after save             │
│                                                          │
│  [← Back]  [Save Draft]  [Save & Open Fundraising]    │
└─────────────────────────────────────────────────────────┘
```

#### Components Breakdown

```
CreatePoolPage/
  ├── Stepper (6 steps)
  │     ├── currentStep: number
  │     ├── completed: Set<number>
  │     └── onJump: (step) -> validate previous steps
  │
  ├── Step1_BasicInfo
  │     ├── name, description, category, tags
  │     ├── symbol: from Deriv active_symbols (mock list)
  │     └── botId: optional, from /dashboard/bots
  │
  ├── Step2_Strategy
  │     ├── strategy: StrategyPreset[]
  │     ├── riskProfile: "conservative" | "balanced" | "aggressive"
  │     ├── targetReturnPct, maxDrawdownPct
  │     └── customScriptLink: () -> /dashboard/scripts/new
  │
  ├── Step3_FundingTerms
  │     ├── fundraisingStart, fundraisingEnd
  │     ├── minCommitment, maxCommitment
  │     ├── targetSize, hardCap
  │     ├── feeStructure: FeeStructure
  │     └── waterfall: WaterfallConfig
  │
  ├── Step4_Schedule
  │     ├── tradingStart, tradingEnd
  │     ├── dailyWindows: DayWindow[]
  │     ├── payoutSchedule: PayoutConfig
  │     └── blackouts: ScheduleEntry[]
  │
  ├── Step5_RiskLimits
  │     ├── maxPoolDrawdown, maxDailyLoss
  │     ├── maxOpenPositions, maxStakePerTrade
  │     ├── autoActions: AutoAction[]
  │     └── investorProtections: Protection[]
  │
  └── Step6_Review
        ├── summary: PoolPlan (all steps combined)
        ├── saveOptions: SaveOptions
        ├── onSaveDraft: () -> POST /api/pools (status=draft)
        └── onSaveAndOpen: () -> POST /api/pools (status=fundraising)

VALIDATION:
  - Step 1: name required, symbol required
  - Step 2: target return > 0, max DD > 0
  - Step 3: minCommitment < maxCommitment, targetSize <= hardCap
  - Step 4: tradingEnd > tradingStart, payout schedule valid
  - Step 5: all risk limits > 0
  - Step 6: confirm checkbox required

PRESET STRATEGIES (mapped from tradeMO.md bot strategies):
  - Martingale: aggressive, target 20%+, max DD 25%
  - DCA: balanced, target 10%, max DD 12%
  - Scalping: aggressive, target 15%, max DD 8%
  - Swing: balanced, target 12%, max DD 15%
  - Custom: link to script editor
```

#### Data Flow

```
ON MOUNT:
  - Check for draft in localStorage (resume)
  - If URL has ?template={id}, prefill from template

STEP NAVIGATION:
  - Forward: validate current step, save to draft
  - Backward: always allowed (preserve data)
  - Jump: only allowed to completed steps

AUTO-SAVE:
  - Every 30s, save draft to localStorage + mock store
  - Show "Draft saved" toast

SUBMIT:
  - Save Draft: status=draft, redirect to /investors/pools
  - Save & Open: status=fundraising, redirect to /investors/pools/{id}
```

#### Advanced Features

```
1. AI POOL CONFIGURATOR
   - "I want a low-risk forex pool targeting 8% annually"
   - AI fills: strategy (DCA), risk profile (conservative),
     target return (8%), fees (1.5% mgmt, 15% carry, 6% hurdle)
   - User reviews and edits

2. FEE STRUCTURE TEMPLATES
   - "2-and-20" (industry standard)
   - "1.5-and-15" (competitive)
   - "3-and-30" (premium high-touch)
   - "0-and-25 with hurdle" (no mgmt fee, performance-only)
   - Apply with one click, customize after

3. LIVE FEE IMPACT SIMULATOR
   - Input expected gross return
   - Shows waterfall: LP net return, GP carry, mgmt fee impact
   - Compare 2 fee structures side-by-side

4. INVESTOR INVITE PREVIEW
   - On Step 6, see preview of investor invite email
   - Personalized merge fields
   - Send test email to self

5. COMPLIANCE CHECKLIST
   - Per jurisdiction: required disclosures, accredited investor rules
   - Auto-detect from investor locales (later)
   - Block publish until checklist complete

6. POOL DUPLICATION
   - "Duplicate from existing pool" at top
   - Copies all config, sets status=draft
   - Useful for quarterly rotation

7. SCHEDULE CONFLICT DETECTION
   - Warn if pool overlaps with admin's other pools
   - Warn if pool's trading window conflicts with bot's existing schedule
   - Suggest alternative windows

8. AUTOMATIC DOCUMENT GENERATION
   - On Save: auto-generate subscription agreement template
   - Pre-filled with pool terms
   - Sends to /investors/documents for review
```

#### Edge Cases & Error Handling

```
SCENARIO                              ACTION
─────────────────────────────────────────────────────────────────
Symbol becomes unavailable (Deriv API)  Show warning, suggest alt
Bot gets deleted mid-creation          Clear botId, show notice
Target size > hard cap                  Block Next button
                                       Show "Target must be <= cap"

Fundraising end before start           Inline validation error
                                       "End date must be after start"

Min commitment > max commitment         Inline error on both fields

Schedule conflict with same admin      Show warning, allow override
                                       (admin may have capacity)

Draft auto-save fails (storage full)   Fallback to in-memory
                                       Show "Save failed, please
                                       download JSON backup"

User navigates away mid-wizard         Confirm modal:
                                       "You have unsaved changes.
                                        Save as draft first?"

Submit fails (network in real backend) Show retry button
                                       Preserve all form state
                                       Don't lose data

Lock-up period > pool duration         Validation error
                                       "Lock-up cannot exceed pool
                                        lifetime (90 days vs 60 days)"
```

#### Performance Considerations

```
- Stepper: lazy-load each step (don't render all 6)
- Fee simulator: compute on input change (debounced 300ms)
- Form validation: debounced + on blur
- Symbol dropdown: virtualized if > 100 symbols
- Auto-save: debounced 30s, IndexedDB for large drafts
- AI configurator: streaming response
```

#### Testing Strategy

```
UNIT TESTS:
  - Stepper navigation: forward/back preserves state
  - Form validation per step (positive + negative)
  - Fee structure template application
  - Waterfall configuration serialization
  - Schedule conflict detection

INTEGRATION:
  - Save draft -> reload -> assert state restored
  - Save & Open -> assert pool appears in list with status=fundraising
  - Duplicate pool -> assert new pool created with copied config

E2E:
  - Full flow: Basic -> Strategy -> Funding -> Schedule -> Risk -> Review -> Save
  - Test AI configurator: type description -> assert fields populated
  - Test fee simulator: change carry -> assert LP return updates
```

#### Accessibility & UX Enhancements

```
- Stepper: role="navigation" + aria-current="step"
- Form fields: associated labels, aria-describedby for errors
- Strategy cards: keyboard selectable (arrow keys + Enter)
- Calendar picker: keyboard navigable, aria-live for date changes
- Toggle switches: role="switch" + aria-checked
- Review step: read aloud summary (Web Speech API)
- High-contrast form errors
- Auto-focus first field per step on entry
```

---

### PAGE I-4: Pool Detail / Live Monitor (`/investors/pools/:id`)

```
PURPOSE:
  Single-pool command center. Shows pool status, investors,
  capital deployed, P&L curve, linked bot's live activity,
  schedule, documents, and actions (pause/close/call capital).

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  ◄ Back to Pools                                        │
│  🟢 Q1 2026 Volatility Pool        [⏸ Pause] [⋮ More]  │
│  Strategy: Martingale | R_10 | Active since Jan 1, 2026│
│  Trading ends in: 23 days 14 hours                      │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  POOL STATS (6 cards)                                   │
│  ┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐    │
│  │NAV   ││Paid-In││Committed││Realized││Unreal.││Invest.│  │
│  │$1.09M││$1.05M││$1.20M ││+$45K ││+$5K  ││ 8    │  │
│  │+4.2% ││      ││       ││      ││      ││      │  │
│  └──────┘└──────┘└──────┘└──────┘└──────┘└──────┘    │
└─────────────────────────────────────────────────────────┘
┌──────────────────────────────┬──────────────────────────┐
│  P&L CURVE (real-time)       │  CAPITAL SUMMARY         │
│                              │                          │
│  ┌────────────────────────┐ │  Committed:    $1,200,000│
│  │  Equity curve          │ │  Called:       $1,050,000│
│  │  Overlaid with bot     │ │  Paid-in:      $1,050,000│
│  │  activity markers      │ │  Uncalled:     $150,000  │
│  │                        │ │  Distributed:  $42,000   │
│  └────────────────────────┘ │  NAV:          $1,090,000│
│                              │  Total Return:  +3.81%   │
│  [1D] [1W] [1M] [All]       │  IRR:          14.2%     │
└──────────────────────────────┴──────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  INVESTORS IN THIS POOL (table)                         │
│  ┌────────┬──────────┬─────────┬─────────┬────────┐     │
│  │Name    │Committed │Paid-In  │NAV      │P&L     │     │
│  ├────────┼──────────┼─────────┼─────────┼────────┤     │
│  │Jane D. │$200,000  │$180,000 │$187,200 │+$7,200 │     │
│  │Acme LLC│$300,000  │$270,000 │$281,000 │+$11,000│     │
│  │R. Mwang│$150,000  │$135,000 │$140,400 │+$5,400 │     │
│  │...5 more...                                    │     │
│  └────────┴──────────┴─────────┴─────────┴────────┘     │
│  [+ Invite Investor]  [Send Capital Call]               │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  LINKED BOT ACTIVITY (live)                             │
│  Bot: Martingale Bot | 🟢 Running | 2h 14m runtime    │
│  Last trade: 3 min ago | R_10 Rise | +$0.35             │
│  [View Bot Detail →]                                    │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  SCHEDULE                                               │
│  Today: Trading window 09:00-17:00 UTC (3h 24m left)   │
│  Next payout: Apr 1, 2026 (monthly distribution)       │
│  Blackout: Mar 28 (Good Friday) - no trading           │
│  [View Full Schedule →]                                 │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  DOCUMENTS (5)                                          │
│  • Subscription Agreement template (approved)           │
│  • Q1 2026 Investor Report (draft)                     │
│  • Fee Disclosure (approved)                           │
│  • Strategy Description (approved)                     │
│  • Risk Factors (approved)                             │
│  [View All Documents →]                                 │
└─────────────────────────────────────────────────────────┘
```

#### Components Breakdown

```
PoolDetailPage/
  ├── PoolHeader
  │     ├── name, status, strategy, symbol
  │     ├── activeSince, tradingEndsAt
  │     └── actions: pause, close, edit, callCapital
  │
  ├── PoolStatsGrid (6 cards)
  │     ├── nav, paidIn, committed, realizedPnL, unrealizedPnL
  │     └── investorCount
  │
  ├── PnLChartPanel
  │     ├── chart: AreaChart (equity curve over time)
  │     ├── timeframe: "1D" | "1W" | "1M" | "All"
  │     ├── botActivityMarkers: trade dots overlaid
  │     └── comparison: optional overlay vs benchmark
  │
  ├── CapitalSummaryPanel
  │     ├── committed, called, paidIn, uncalled
  │     ├── distributed, nav
  │     ├── totalReturnPct, irr (internal rate of return)
  │     └── moic (multiple on invested capital)
  │
  ├── InvestorsTable
  │     ├── investors: PoolInvestor[] (investor + their pool-specific data)
  │     ├── columns: name, committed, paidIn, nav, pnl, pnlPct
  │     ├── sortBy: any column
  │     ├── filterBy: tags, kycStatus
  │     └── actions:
  │           ├── inviteInvestor: () -> /investors/communications?pool={id}
  │           └── sendCapitalCall: () -> modal
  │
  ├── LinkedBotActivity
  │     ├── botId, name, status
  │     ├── lastTrade: { type, symbol, pnl, timeAgo }
  │     ├── runtime, totalTrades, winRate
  │     └── onViewBot: () -> /dashboard/bots/{botId}
  │
  ├── SchedulePanel
  │     ├── todayWindow: { start, end, timeLeft }
  │     ├── nextPayout: { date, amount (estimated) }
  │     ├── nextBlackout: { date, reason }
  │     └── onViewFull: () -> /investors/schedules?pool={id}
  │
  └── DocumentsPanel
        ├── documents: InvestorDocument[] (pool-level)
        ├── counts by status
        └── onViewAll: () -> /investors/documents?pool={id}

DATA SOURCE (mock):
  - mockStore.pools.find(p => p.id === params.id)
  - Related investors: mockStore.investors.filter(i => i.pools.includes(id))
  - Related schedule: mockStore.schedules.filter(s => s.poolId === id)
  - Related docs: mockStore.documents.filter(d => d.poolId === id)
  - Bot: linked via pool.botId -> /dashboard/bots/{botId}
```

#### Data Flow

```
ON MOUNT:
  1. Load pool by ID from mock store
  2. If not found -> 404 page with "Back to Pools"
  3. Load related investors, schedules, documents
  4. Load linked bot summary (mock: from /dashboard/bots mock)
  5. Set up "live" polling simulation (every 10s, updates NAV
     by tiny random amount to simulate live trading)

REAL-TIME UPDATES (mock):
  - NAV jitter every 10s (+/- 0.05%)
  - Bot activity: every 30s, add a fake trade entry
  - Status changes: poll every 60s

ACTIONS:
  - Pause pool: confirm modal -> update status -> toast
  - Close pool: stepper wizard (finalize NAV, distribute, report)
  - Call capital: open CapitalCallModal -> create call(s)
  - Invite investor: navigate to communications with pre-filled pool
```

#### Advanced Features

```
1. POOL WATERFALL SIMULATOR
   - Input hypothetical exit NAV
   - Shows step-by-step waterfall:
     LP receives: preferred return -> catch-up -> carry split
   - Per-investor breakdown of distributions
   - "What-if" slider for exit NAV

2. LIVE INVESTOR ALLOCATION VIEW
   - Pie chart: each investor's % of pool
   - Hover: investor details, paid-in vs committed
   - Click: drill into investor profile

3. CAPITAL DEPLOYMENT GAUGE
   - Visual: % of paid-in capital actually deployed in trades
   - Vs idle (waiting in pool wallet)
   - Track deployment efficiency

4. POOL HEALTH ALERTS
   - Real-time alerts:
     "Drawdown approaching limit (8.5% of 10%)"
     "2 investors haven't completed KYC"
     "Bot error rate elevated (last 1h)"
   - Actionable: click to navigate to resolution

5. INVESTOR COMMITMENT PROGRESS
   - For each investor: committed vs paid-in vs called
   - Visual progress bars
   - Identify slow-payers / over-committed

6. POOL COMPARISON SIDEBAR
   - Compare this pool vs sibling pools (same strategy, prior quarter)
   - Performance attribution

7. AUDIT TRAIL
   - Chronological log of all admin actions on this pool
   - Who/when/what changed
   - Filterable, exportable

8. ONE-CLICK DISTRIBUTIONS
   - "Distribute Now" button: instantly distribute current realized P&L
   - Auto-calculates per-investor share
   - Sends to Payout Manager queue

9. POOL RENEWAL FLOW
   - When tradingEnd approaches: show "Renew" prompt
   - Pre-fills new pool plan with current settings
   - Option to roll over investors automatically
```

#### Edge Cases & Error Handling

```
SCENARIO                              ACTION
─────────────────────────────────────────────────────────────────
Pool ID not found                     Show 404 with "Back to Pools"
                                      Suggest similar pool names

Pool has 0 investors                   Show "No investors yet" panel
                                      Prominent "Invite" CTA

Bot not linked                         Show "Link a bot" prompt
                                      Button -> /dashboard/bots (select)

Bot crashes                            Show "Bot error" banner
                                      Suggest pause pool + view bot logs

Drawdown exceeds limit                 Auto-pause pool
                                      Send critical alert to admin
                                      Notify all investors (template)

NAV calculation error (rounding)      Show "Recalculating..." badge
                                      Don't update UI with stale data

Investor in pool gets suspended        Show "Suspended" badge on row
                                      Block new commitments from them
                                      Allow existing capital to wind down

Payout fails for 1 investor            Continue with others
                                      Mark failed payout for retry
                                      Don't block pool operations
```

#### Performance Considerations

```
- P&L chart: cache historical points, append-only updates
- Investors table: paginate if > 20 investors
- Live updates: batch every 5s (don't re-render on every jitter)
- Audit trail: lazy-load older entries on scroll
- Waterfall simulator: compute in Web Worker
- Linked bot data: fetched once, cached for 60s
```

#### Testing Strategy

```
UNIT TESTS:
  - Pool stats calculations: NAV, return %, IRR
  - Investor table sorting + filtering
  - Capital summary math: committed - called = uncalled
  - Waterfall simulator with known inputs

INTEGRATION:
  - Load pool by ID -> assert all panels populate
  - Pause pool -> assert status updates + toast
  - Call capital -> assert calls created in mock store

E2E:
  - Open pool detail -> see stats, chart, investors, schedule
  - Click "Send Capital Call" -> modal -> submit -> calls appear
  - Click "View Bot Detail" -> navigate to /dashboard/bots/:id
```

#### Accessibility & UX Enhancements

```
- Stats cards: aria-label with full description
- Chart: text alternative "Equity grew from $1.05M to $1.09M over 90 days"
- Table: proper scope, sortable headers, keyboard nav
- Action buttons: large tap targets, keyboard accessible
- Live updates: aria-live="polite" on stats, "assertive" on alerts
- Status badges: text + color (Active/Paused/Closed)
- Reduced motion: disable chart animations
```

---

### PAGE I-5: Trade Schedule Manager (`/investors/schedules`)

```
PURPOSE:
  Manage trading windows, payout windows, blackout periods, and
  capital call schedules across all pools. Calendar-first view.

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  "Trade Schedule Manager"      [+ New Schedule Entry]   │
│  [Calendar] [List] [Gantt]  Filter: [All Pools ▼]       │
│  [All Types ▼] [This Month ▼]                           │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  CALENDAR VIEW (month)                                  │
│                                                          │
│  ◄ March 2026 ►                Today: Mar 14             │
│  ┌────┬────┬────┬────┬────┬────┬────┐                  │
│  │Mon │Tue │Wed │Thu │Fri │Sat │Sun │                  │
│  ├────┼────┼────┼────┼────┼────┼────┤                  │
│  │ 1  │ 2  │ 3  │ 4  │ 5  │ 6  │ 7  │                  │
│  │TW  │TW  │TW  │TW  │TW  │    │    │                  │
│  │Q1V │Q1V │Q1V │Q1V │Q1V │    │    │                  │
│  ├────┼────┼────┼────┼────┼────┼────┤                  │
│  │ 8  │ 9  │ 10 │ 11 │ 12 │ 13 │ 14 │                  │
│  │TW  │TW  │TW  │TW  │TW  │    │    │                  │
│  │CC! │    │    │PW  │    │    │    │                  │
│  ├────┼────┼────┼────┼────┼────┼────┤                  │
│  │ 15 │ 16 │ 17 │ 18 │ 19 │ 20 │ 21 │                  │
│  │TW  │TW  │TW  │TW  │TW  │BO  │BO  │                  │
│  │    │    │    │    │    │Q1V │Q1V │                  │
│  ├────┼────┼────┼────┼────┼────┼────┤                  │
│  │ 22 │ 23 │ 24 │ 25 │ 26 │ 27 │ 28 │                  │
│  │TW  │TW  │TW  │TW  │TW  │BO  │BO  │                  │
│  │    │    │    │    │    │Q1V │Q1V │                  │
│  ├────┼────┼────┼────┼────┼────┼────┤                  │
│  │ 29 │ 30 │ 31 │    │    │    │    │                  │
│  │TW  │TW  │TW  │    │    │    │    │                  │
│  │PW  │    │    │    │    │    │    │                  │
│  └────┴────┴────┴────┴────┴────┴────┘                  │
│                                                          │
│  Legend:                                                 │
│  TW = Trade Window   PW = Payout Window                  │
│  CC = Capital Call   BO = Blackout                       │
│  Color-coded by pool                                    │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  UPCOMING SCHEDULED EVENTS (next 7 days)               │
│  Mar 15  09:00  TW  Q1 Vol Pool  Trading window opens   │
│  Mar 15  17:00  TW  Q1 Vol Pool  Trading window closes  │
│  Mar 18  09:00  PW  Q1 Vol Pool  Monthly payout ($4.2K) │
│  Mar 20  00:00  BO  Q1 Vol Pool  Good Friday (no trade) │
│  Mar 20  00:00  BO  Q4 FX Pool   Good Friday (no trade) │
└─────────────────────────────────────────────────────────┘
```

#### Components Breakdown

```
SchedulesPage/
  ├── SchedulesHeader
  │     ├── viewMode: "calendar" | "list" | "gantt"
  │     └── onNewEntry: () -> ScheduleEntryModal
  │
  ├── SchedulesFilter
  │     ├── poolId: string | "all"
  │     ├── type: ScheduleType[] (multi-select)
  │     └── dateRange: "this_week" | "this_month" | "custom"
  │
  ├── CalendarView
  │     ├── month: Date (current view)
  │     ├── entries: ScheduleEntry[] (filtered for month)
  │     ├── cellClick: (date) -> show day detail modal
  │     ├── entryClick: (entry) -> edit modal
  │     ├── dragToMove: (entry, newDate) -> update
  │     └── colorCoding: by poolId (consistent palette)
  │
  ├── ListView
  │     ├── entries: sorted by startAt
  │     ├── groupBy: "day" | "pool" | "type"
  │     └── export: CSV / iCal
  │
  ├── GanttView
  │     ├── pools as rows
  │     ├── time as x-axis (zoomable)
  │     └── bars: trade windows, payouts, blackouts
  │
  ├── UpcomingEventsPanel
  │     ├── entries: next 7 days
  │     ├── sortBy: startAt
  │     └── actions: skip / snooze / edit
  │
  └── ScheduleEntryModal
        ├── poolId, type, title
        ├── startAt, endAt
        ├── recurrence: "once" | "daily" | "weekly" | "monthly" | "cron"
        ├── cronExpr (optional, advanced)
        └── notes

RECURRENCE ENGINE:
  - daily: every day at same time
  - weekly: same day-of-week + time
  - monthly: same day-of-month + time
  - custom_cron: parse with cron-parser lib
  - blackout: blocks any trade window underneath
  - precedence: blackout > trade_window > payout_window
```

#### Data Flow

```
ON MOUNT:
  1. Load all schedule entries from mock store
  2. Apply default filter: this month, all pools, all types
  3. Render calendar view (default)
  4. Compute upcoming events for sidebar

VIEW CHANGES:
  - Calendar -> List -> Gantt: preserve filter state
  - Month navigation: prev/next/today buttons
  - Click entry -> edit modal
  - Drag entry to new date -> confirm -> update

ENTRY CRUD:
  - Create: modal -> validate -> add to store
  - Edit: click entry -> modal pre-filled
  - Delete: confirm -> remove from store
  - Bulk: select multiple -> bulk delete/move

CONFLICT DETECTION:
  - New entry overlaps existing -> warn (allow override)
  - Blackout covers trade window -> warn (entry still created)
  - Two pools trading same symbol same time -> info (allowed)
```

#### Advanced Features

```
1. SMART CONFLICT RESOLUTION
   - When blackout overlaps trade window:
     auto-pause affected bot during blackout
     auto-resume after blackout ends
   - Visual: strikethrough on paused windows

2. POOL-SPECIFIC CALENDAR VIEW
   - Filter to single pool -> see only that pool's schedule
   - Useful for investor calls: "Here's what's happening this month"

3. INVESTOR-FACING CALENDAR (READ-ONLY)
   - Public iCal feed per pool
   - Investors subscribe to their calendar app
   - URL: /investors/pools/{id}/calendar.ics

4. AUTOMATED PAYOUT TRIGGERS
   - Payout window entries auto-create payout records
   - Pre-distribution notification to investors
   - Auto-execute on scheduled date (with admin approval)

5. TIMEZONE-AWARE DISPLAY
   - Admin sees in their TZ (set in profile)
   - Each entry stored in UTC
   - Tooltip: "10:00 UTC = 13:00 EAT (your time)"

6. RECURRING ENTRY EDIT OPTIONS
   - "Edit this occurrence only"
   - "Edit this and all future"
   - "Edit entire series"
   - Standard calendar UX

7. CAPITAL CALL SCHEDULING
   - Schedule future capital calls
   - Auto-send notices on schedule
   - Track expected cash flow

8. EXPORT OPTIONS
   - iCal (per pool or all)
   - CSV (list view)
   - PDF (monthly summary report)
   - JSON (full backup)
```

#### Edge Cases & Error Handling

```
SCENARIO                              ACTION
─────────────────────────────────────────────────────────────────
No schedule entries yet                Show onboarding:
                                      "Create your first schedule entry"
                                      + templates for common patterns

Entry spans multiple days              Render as multi-day bar in calendar
                                      List view: shows duration

Cron expression invalid               Inline validation
                                      Show examples + link to docs

Pool deleted, entry still exists      Mark entry as "orphaned"
                                      Offer to delete or reassign

Daylight saving transition            Store in UTC, display in local
                                      Show DST notice on affected entries

Conflicts: payout during blackout      Block creation
                                      "Payouts cannot occur during blackout"

Recurring entry count > 1000          Show count only, don't render all
                                      "Occurs 1,247 times"
                                      Lazy-render visible month only
```

#### Performance Considerations

```
- Calendar: render only visible month (28-31 cells)
- Entries: filter by month before render
- Gantt: virtualize rows if > 20 pools
- List: infinite scroll, paginate 50 per chunk
- Recurrence: compute lazily, cache results
- iCal export: server-side generation (don't block UI)
```

#### Testing Strategy

```
UNIT TESTS:
  - Recurrence engine: daily, weekly, monthly, cron patterns
  - Conflict detection: overlap, blackout precedence
  - Timezone conversion correctness
  - Filter logic

INTEGRATION:
  - Create entry -> assert appears in calendar
  - Drag entry to new date -> assert moved
  - Delete entry -> assert removed

E2E:
  - Switch calendar/list/gantt views -> assert data consistent
  - Create recurring entry -> assert future occurrences shown
  - Export iCal -> download -> assert contents
```

#### Accessibility & UX Enhancements

```
- Calendar: arrow-key navigation between days
- Entries: keyboard accessible (Enter to edit)
- Color: never sole indicator (use icons TW/PW/CC/BO)
- Filter chips: keyboard navigable
- iCal feed URL: copy button with aria-live confirmation
- High-contrast mode for calendar
- Reduced motion: disable drag animations
```

---

### PAGE I-6: Funds / Paid-In Finances (`/investors/funds`)

```
PURPOSE:
  Track all capital flows: commitments, capital calls,
  paid-in capital, NAV, distributions. Fund accounting view.

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  "Funds & Paid-In Finances"                             │
│  [Overview] [Capital Calls] [Distributions] [NAV History]│
│  Date Range: [Last 90 days ▼]    [Export Statement]    │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  OVERVIEW TAB                                           │
│                                                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │Total Commit. │ │Total Paid-In │ │Total Distrib.│   │
│  │$3,800,000    │ │$3,150,000    │ │$845,000      │   │
│  │across 6 pools│ │82.9% of comm.│ │26.8% of paid │   │
│  └──────────────┘ └──────────────┘ └──────────────┘   │
│                                                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │Total NAV     │ │Uncalled Cap. │ │Realized P&L   │   │
│  │$3,420,000    │ │$650,000      │ │+$420,000      │   │
│  │+8.6% gross   │ │17.1% of comm.│ │13.3% of paid │   │
│  └──────────────┘ └──────────────┘ └──────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ CAPITAL FLOW WATERFALL (chart)                  │   │
│  │                                                  │   │
│  │ $3.8M ─┬─ $3.15M ─┬─ $3.42M ─┬─ $845K ── $2.58M│   │
│  │  Comm.  │ Paid-in   │ +P&L     │ Distrib.  NAV  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ PER-POOL CAPITAL TABLE                          │   │
│  │ Pool       | Committed | Paid-In | NAV    | Ret │   │
│  │ Q1 2026 Vol| $1.20M    | $1.05M  | $1.09M |+4.2%│   │
│  │ Q4 2025 FX | $0.89M    | $0.89M  | $0.92M |+3.4%│   │
│  │ Q3 2025 Crp | $0.78M    | $0.78M  | $0.78M |+0.2%│   │
│  │ ...                                              │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  CAPITAL CALLS TAB                                      │
│  [Draft] [Sent] [Paid] [Overdue] [+ New Call]          │
│  ┌────┬──────────┬────────┬──────┬────────┬─────────┐  │
│  │ ID │ Pool     │ Inv.    │Amount│DueDate │ Status  │  │
│  ├────┼──────────┼────────┼──────┼────────┼─────────┤  │
│  │001 │Q1 Vol    │Jane D.  │$20K  │Mar 20  │Sent     │  │
│  │002 │Q1 Vol    │Acme LLC │$30K  │Mar 20  │Paid ✓   │  │
│  │003 │Q4 FX     │R. Mwang │$15K  │Mar 10  │OVERDUE  │  │
│  │... │          │         │      │        │         │  │
│  └────┴──────────┴────────┴──────┴────────┴─────────┘  │
│  [+ Bulk Send] [+ Send Reminders]                       │
└─────────────────────────────────────────────────────────┘
```

#### Components Breakdown

```
FundsPage/
  ├── FundsHeader
  │     ├── activeTab: "overview" | "calls" | "distributions" | "nav_history"
  │     └── dateRange: DateRange
  │
  ├── OverviewTab
  │     ├── KpiCards (6)
  │     │     ├── totalCommitted, totalPaidIn, totalDistributed
  │     │     ├── totalNav, uncalledCapital, realizedPnL
  │     ├── CapitalFlowWaterfall (chart)
  │     │     ├── stages: committed -> paid-in -> +P&L -> distributed -> NAV
  │     │     └── chartType: "waterfall" (custom Recharts)
  │     └── PerPoolCapitalTable
  │           ├── columns: pool, committed, paidIn, nav, returnPct, irr
  │           └── sortBy: any column
  │
  ├── CapitalCallsTab
  │     ├── callsTable: CapitalCall[]
  │     ├── filterByStatus: "draft" | "sent" | "paid" | "overdue"
  │     ├── actions:
  │     │     ├── newCall: () -> CapitalCallModal
  │     │     ├── bulkSend: () -> send all drafts
  │     │     ├── sendReminders: () -> overdue + 3+ days
  │     │     ├── markPaid: (callId) -> mark as paid manually
  │     │     └── cancel: (callId) -> cancel + reason
  │     └── summary: total pending, overdue, due this week
  │
  ├── DistributionsTab
  │     ├── distributionsTable: Payout[] where type="distribution"
  │     ├── groupBy: "pool" | "investor" | "month"
  │     └── actions: schedule, approve, process, reverse
  │
  └── NavHistoryTab
        ├── chart: AreaChart (NAV over time, per pool)
        ├── toggle: per-pool lines or stacked
        └── export: CSV of daily NAV snapshots

CAPITAL CALL MODAL:
  ├── poolId: select (active pools only)
  ├── investorId: select (investors in pool) OR "all"
  ├── amount: per-investor or total split
  ├── dueDate: date picker
  ├── method: wire / ach / crypto / manual
  ├── notes: optional
  └── actions: save draft, send immediately, schedule for later

WATERFALL CHART:
  - Visualizes capital flow from commitment -> NAV
  - Each bar shows change (+/-) from previous stage
  - Hover: detailed breakdown
  - Filter: by date range, by pool
```

#### Data Flow

```
ON MOUNT:
  1. Load all pools, investors, calls, payouts from mock store
  2. Aggregate to overview KPIs
  3. Render waterfall chart from aggregations
  4. Default tab: Overview

TAB SWITCH:
  - Lazy-load tab content
  - Preserve filter state across tabs

CAPITAL CALL LIFECYCLE:
  Draft -> Sent -> Paid (or Overdue if past dueDate)
  - Draft: created but not sent, editable
  - Sent: investor notified, awaiting payment
  - Paid: payment recorded (manual or auto)
  - Overdue: past dueDate, send reminder

REMINDER LOGIC:
  - 3 days before due: reminder email (configurable)
  - On due date: final reminder
  - 1 day overdue: escalation email + admin notification
  - 7 days overdue: mark investor as "slow payer" flag
```

#### Advanced Features

```
1. AUTOMATED CAPITAL CALL SCHEDULING
   - Define call schedule per pool at creation:
     e.g. "Call 25% on day 1, 25% on day 30, 50% on day 60"
   - Auto-generate draft calls
   - Admin approves before sending

2. CAPITAL CALL IMPORT (CSV)
   - Bulk import calls from spreadsheet
   - Useful for migrating from existing fund admin
   - Validation + preview before commit

3. PAYMENT RECONCILIATION
   - Upload bank statement CSV
   - Auto-match payments to calls (fuzzy match on amount + date)
   - Flag unmatched payments for review

4. FEE ACCRUAL TRACKING
   - Per pool: accrued mgmt fees (daily)
   - Per investor: accrued carry (on realized gains)
   - Quarterly fee statements auto-generated

5. NAV RECONCILIATION
   - Compare pool NAV (sum of investor NAVs) vs wallet balance
   - Flag discrepancies > $100
   - Audit trail of all NAV adjustments

6. INVESTOR CAPITAL LEDGER (per investor)
   - Click investor -> see full capital history
   - All calls, payments, distributions, fees
   - Export as PDF statement

7. CASH FLOW PROJECTIONS
   - Next 30/60/90 days: expected calls in, distributions out
   - Liquidity forecast: will pool have cash for next distribution?

8. MULTI-CURRENCY SUPPORT
   - Pool in USD, investor commits in EUR
   - FX rate tracking + conversion
   - Hedging cost attribution
```

#### Edge Cases & Error Handling

```
SCENARIO                              ACTION
─────────────────────────────────────────────────────────────────
Call amount > investor's uncalled      Block creation
                                       "Amount exceeds investor's
                                        remaining commitment of $X"

Investor pays less than called          Partial payment
                                       Update paidInCapital
                                       Show "Underpaid by $X"

Investor pays more than called          Mark as paid + credit balance
                                       Apply to next call automatically

Payment received after call cancelled   Flag for manual review
                                       Refund or apply to next call

NAV calculation diverges from wallet    Show "Discrepancy" badge
                                       Block distributions until resolved

FX rate unavailable (weekend)          Use last known + warning
                                       Don't auto-update NAV

Bulk send fails mid-way                Rollback all
                                       Or commit sent + show partial log
```

#### Performance Considerations

```
- Aggregations: precompute on data change (useMemo)
- Capital calls table: paginate (50 per page)
- Waterfall chart: < 100 data points, no perf issue
- NAV history: cache daily snapshots
- Reconciliation: Web Worker for fuzzy matching
- Export: stream to CSV (don't load all in memory)
```

#### Testing Strategy

```
UNIT TESTS:
  - KPI calculations (committed vs paid-in vs distributed)
  - Capital call lifecycle state machine
  - Waterfall chart math (each stage correct delta)
  - Reminder schedule logic

INTEGRATION:
  - Create capital call -> send -> mark paid -> assert investor.paidInCapital updates
  - Bulk send -> assert all sent + notifications queued
  - Payment reconciliation -> upload CSV -> assert matches

E2E:
  - Open funds page -> see overview KPIs + waterfall
  - Create capital call -> send -> investor pays -> mark paid
  - Export statement -> download -> assert contents
```

#### Accessibility & UX Enhancements

```
- KPI cards: aria-label with full description
- Waterfall chart: text alternative + data table toggle
- Tables: sortable headers, proper scope, keyboard nav
- Status badges: text + color (Draft/Sent/Paid/Overdue)
- Filter chips: keyboard removable
- Action buttons: large tap targets
- Modal: focus trap, Escape to close, restore focus on close
```

---

### PAGE I-7: Investor Directory (`/investors/investors`)

```
PURPOSE:
  Manage all investors (LPs). Roster, KYC status, AUM,
  contact info, pool memberships, and lifecycle management.

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  "Investors"                       [+ Invite Investor]   │
│  [All] [Active] [KYC Pending] [Suspended] [Exited]     │
│  [🔍 Search...] [Type ▼] [Tag ▼] [Export CSV]          │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  STATS BAR                                              │
│  Total: 24 | Active: 18 | Pending KYC: 4 | Suspended: 2│
│  Total AUM: $4.2M | Avg per Investor: $175K            │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  INVESTORS TABLE (or card grid toggle)                  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │[●] Jane Doe              [View] [Edit] [⋯]        │ │
│  │    Individual · KYC ✓ · Verified                  │ │
│  │    Committed: $500K | Paid-in: $450K | NAV: $487K │ │
│  │    Pools: Q1 Vol, Q4 FX, Q3 Crypto                 │ │
│  │    Tags: vip, early_backer                         │ │
│  │    Joined: Jan 15, 2024                            │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │[●] Acme Capital LLC      [View] [Edit] [⋯]        │ │
│  │    Entity · KYC ✓ · Verified                       │ │
│  │    Committed: $1.2M | Paid-in: $1.0M | NAV: $1.1M │ │
│  │    Pools: Q1 Vol, Q3 Crypto                        │ │
│  │    Tags: vip, fund_of_funds                        │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │[●] Robert Mwangi        [View] [Edit] [⋯]        │ │
│  │    Individual · KYC ⏳ · Pending Review            │ │
│  │    Committed: $150K | Paid-in: $135K | NAV: $140K │ │
│  │    Pools: Q1 Vol, Q4 FX                            │ │
│  │    ⚠ KYC docs pending review                       │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

#### Components Breakdown

```
InvestorsPage/
  ├── InvestorsHeader
  │     ├── totalCount, activeCount, pendingCount
  │     └── onInvite: () -> InviteInvestorModal
  │
  ├── InvestorsFilter
  │     ├── status: InvestorStatus[]
  │     ├── type: "individual" | "entity"
  │     ├── tags: string[] (multi-select)
  │     ├── searchQuery: string (name, email, ID)
  │     └── sortBy: "name" | "committed" | "nav" | "joinedAt"
  │
  ├── StatsBar
  │     ├── total, active, pendingKyc, suspended, exited
  │     ├── totalAum, avgPerInvestor
  │     └── topTags (most common tags)
  │
  ├── ViewToggle: "table" | "cards"
  │
  ├── InvestorTable (alt: cards)
  │     ├── investors: Investor[]
  │     ├── columns: name, type, kyc, accreditation,
  │                 committed, paidIn, nav, pools, tags, joinedAt
  │     ├── rowClick: () -> /investors/investors/{id} (profile)
  │     └── bulkActions: tag, email, export
  │
  └── InviteInvestorModal
        ├── email, name (pre-filled)
        ├── inviteType: "join_pool" | "general"
        ├── poolId: (if join_pool)
        ├── message: personal note
        ├── sendCopy: checkbox
        └── onSend: () -> create prospect + send email

INVESTOR PROFILE PAGE (/investors/investors/:id):
  - Sub-route, full profile view
  - Sections: overview, pools, capital history, documents,
    communications, KYC, tax, notes
```

#### Data Flow

```
ON MOUNT:
  1. Load all investors from mock store
  2. Apply default filter: status != "exited"
  3. Sort by committedCapital desc
  4. Render cards/table

SEARCH:
  - Debounced (300ms)
  - Searches: legalName, displayName, email, id
  - Highlights match in results

BULK ACTIONS:
  - Tag: assign/remove tags
  - Email: navigate to communications with pre-selected recipients
  - Export: CSV of selected (or all if none selected)

INVITE FLOW:
  - Modal -> create "prospect" investor
  - Send invite email (mock: log to console)
  - Prospect converts to "active" on first commitment
```

#### Advanced Features

```
1. INVESTOR PROFILE PAGES (deep view)
   - Public-facing summary (admin sees all)
   - Capital timeline: all commitments, calls, distributions
   - Pool memberships: with P&L per pool
   - Document library: all their docs
   - Communication history: all emails sent
   - Notes: admin-only internal notes
   - KYC tab: status, docs, expiry, reminders

2. INVESTOR SEGMENTATION
   - Auto-segment by AUM tiers:
     Tier 1: > $500K (VIP)
     Tier 2: $100K - $500K
     Tier 3: < $100K
   - Per-segment: different comms templates, fee tiers

3. KYC WORKFLOW
   - Status: missing -> pending -> verified -> expired
   - Auto-reminders 30 days before expiry
   - Bulk re-verify: send batch to KYC provider (mock)
   - Block new commitments if KYC expired

4. ACCREDITATION VERIFICATION
   - Income > $200K/yr or net worth > $1M (US)
   - Document upload + admin review
   - Auto-expire after 3 years (configurable)

5. INVESTOR LIFECYCLE TRACKING
   - Prospect -> Active -> Suspended -> Exited
   - Each transition logged with reason
   - Re-activation flow for exited investors

6. CONTACT PREFERENCES
   - Per investor: email, sms, push, in-app
   - Quiet hours (their TZ)
   - Unsubscribe per category (capital calls, payouts, marketing)

7. INVESTOR SELF-SERVICE PORTAL (read-only mock)
   - Each investor gets a magic link
   - Sees: their commitments, NAV, distributions, documents
   - Read-only, can update contact info
```

#### Edge Cases & Error Handling

```
SCENARIO                              ACTION
─────────────────────────────────────────────────────────────────
Investor with 0 commitments            Show "No commitments yet"
                                      CTA: invite to pool

Investor email bounces                 Mark email as invalid
                                      Show warning, suggest update
                                      Block future emails to that address

Duplicate investor (same email)        Detect on create
                                      Suggest merge or use existing

KYC expired mid-pool                   Don't block existing capital
                                      Block new commitments
                                      Send reminder

Investor requests data deletion (GDPR) Special flow:
                                      - Export their data (JSON)
                                      - Anonymize PII fields
                                      - Keep financial records (legal)
                                      - Mark as "anonymized"

Investor tags conflict (admin vs AI)   Admin tags always win
                                      AI suggestions go to "suggested" section
```

#### Performance Considerations

```
- Table: paginate (25 per page) or virtualize
- Cards: lazy-load avatars (initials as placeholder)
- Search: index by name + email (Map)
- Filter: debounced + memoized
- Export: stream to CSV
- Profile page: lazy-load tabs
```

#### Testing Strategy

```
UNIT TESTS:
  - Filter logic (status, type, tags, search)
  - Sort comparators
  - Segmentation rules (AUM tiers)
  - KYC workflow state machine

INTEGRATION:
  - Invite investor -> assert prospect created
  - Verify KYC -> assert status updates
  - Tag investor -> assert tag persists

E2E:
  - Browse investors, filter by Active, search "Jane"
  - Open investor profile -> see all sections
  - Invite new investor -> email sent (mock)
```

#### Accessibility & UX Enhancements

```
- Investor cards: role="article" + descriptive aria-label
- Table: sortable headers, keyboard nav, proper scope
- Avatars: alt text "Jane Doe avatar"
- Status badges: text + color (Verified/Pending/Suspended)
- Bulk select: shift+click for range
- Empty state: clear CTA "Invite your first investor"
- Modal: focus trap, restore focus on close
```

---

### PAGE I-8: Payout Manager (`/investors/payouts`)

```
PURPOSE:
  Manage all investor payouts: distributions, return of capital,
  carried interest, management fees, tax withholdings.
  Includes waterfall execution and payment status tracking.

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  "Payout Manager"                  [+ Schedule Payout]  │
│  [Queue] [History] [Waterfall] [Templates]             │
│  Filter: [Pool ▼] [Type ▼] [Status ▼] [Date ▼]       │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  QUEUE TAB (pending + processing)                       │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 💸 Distribution · Q1 Vol Pool · Jane Doe        │   │
│  │ Amount: $4,200 | Tax withheld: $840 | Net: $3,360│   │
│  │ Method: Wire · Scheduled: Mar 31, 2026           │   │
│  │ Waterfall step: Preferred Return (8% hurdle)    │   │
│  │ Status: ⏳ Scheduled                             │   │
│  │ [Approve] [Edit] [Cancel] [View Details]       │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 💸 Distribution · Q1 Vol Pool · Acme LLC        │   │
│  │ Amount: $6,300 | Tax withheld: $0 | Net: $6,300  │   │
│  │ Method: ACH · Scheduled: Mar 31, 2026            │   │
│  │ Waterfall step: GP Catch-up (100%)              │   │
│  │ Status: ⏳ Scheduled                             │   │
│  │ [Approve] [Edit] [Cancel] [View Details]       │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  [+ Bulk Approve All] [+ Bulk Process]                  │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  STATS BAR                                              │
│  Queue: 8 payouts | Total: $32,400 | Scheduled: Mar 31 │
│  Failed (last 30d): 2 | Avg processing time: 1.2 days   │
└─────────────────────────────────────────────────────────┘
```

#### Components Breakdown

```
PayoutsPage/
  ├── PayoutsHeader
  │     ├── activeTab: "queue" | "history" | "waterfall" | "templates"
  │     └── onSchedulePayout: () -> SchedulePayoutModal
  │
  ├── PayoutsFilter
  │     ├── poolId, type, status, dateRange
  │     └── searchQuery: investor name or payout ID
  │
  ├── QueueTab
  │     ├── payouts: Payout[] (status: scheduled, processing, failed)
  │     ├── bulkActions: approveAll, processAll, exportQueue
  │     └── per-payout actions: approve, edit, cancel, viewDetails
  │
  ├── HistoryTab
  │     ├── payouts: Payout[] (status: paid, reversed)
  │     ├── groupBy: "pool" | "investor" | "month"
  │     ├── summary: total paid, avg payout, count
  │     └── export: CSV / PDF statement
  │
  ├── WaterfallTab
  │     ├── selectPool: dropdown
  │     ├── inputExitNav: number (hypothetical exit NAV)
  │     ├── waterfallSteps: WaterfallStep[] (computed)
  │     │     ├── preferredReturn: $X (LP gets 100% until 8% hurdle)
  │     │     ├── gpCatchUp: $Y (GP gets 100% until catch-up met)
  │     │     └── carrySplit: $Z (80/20 LP/GP)
  │     ├── perInvestorBreakdown: table
  │     └── chart: stacked bar showing each tier
  │
  └── TemplatesTab
        ├── templates: PayoutTemplate[]
        ├── useTemplate: () -> pre-fill SchedulePayoutModal
        └── createTemplate: from existing payout

SCHEDULE PAYOUT MODAL:
  ├── poolId: select active pool
  ├── investorId: select (or "all eligible")
  ├── type: "distribution" | "return_of_capital" | "carry" | "fee"
  ├── amount: total or per-investor
  ├── method: wire / ach / crypto / manual
  ├── scheduledFor: date picker
  ├── taxWithholdingPct: auto-calculated, editable
  ├── waterfallStep: auto-detected based on type + pool
  ├── notes: optional
  └── actions: save draft, schedule, send immediately

WATERFALL EXECUTION:
  For a given pool exit:
  1. Return LP capital (paid-in returned 100%)
  2. Preferred return (LP gets 100% until 8% hurdle met)
  3. GP catch-up (GP gets 100% until 20% carry ratio restored)
  4. 80/20 split (LP gets 80%, GP gets 20% of remaining profits)
```

#### Data Flow

```
ON MOUNT:
  1. Load all payouts from mock store
  2. Default tab: Queue (pending payouts)
  3. Compute stats: total queued, scheduled date, failed count

PAYOUT LIFECYCLE:
  Draft -> Scheduled -> Processing -> Paid (or Failed -> Reversed)
  - Draft: created, not scheduled
  - Scheduled: queued for future date
  - Processing: payment initiated, awaiting confirmation
  - Paid: confirmation received
  - Failed: payment rejected by processor/bank
  - Reversed: paid then reversed (chargeback, error)

APPROVAL FLOW:
  - Single approver: admin clicks Approve -> moves to Processing
  - Multi-approver (configurable): requires 2 admins
  - Bulk approve: all in queue (with confirmation modal)

WATERFALL COMPUTATION:
  - Triggered on Pool close or manual "Run waterfall"
  - Inputs: pool paid-in, realized P&L, fee structure
  - Outputs: per-investor payout amounts by tier
  - Creates Payout records (status: scheduled) for each
```

#### Advanced Features

```
1. AUTOMATED DISTRIBUTION SCHEDULING
   - Per pool: define distribution frequency (monthly/quarterly)
   - Auto-create scheduled payouts on schedule
   - Admin approves before processing

2. TAX WITHHOLDING ENGINE
   - Per investor: country -> treaty rate -> withholding %
   - Auto-deduct from distribution
   - Remit to tax authority (manual step, with reminder)
   - Generate tax forms (1099, 1042-S)

3. PAYMENT METHOD PREFERENCES
   - Per investor: preferred method (wire/ACH/crypto)
   - Per pool: allowed methods
   - Auto-route based on preferences

4. RECONCILIATION
   - Upload bank confirmations
   - Auto-match to scheduled payouts
   - Mark as Paid when matched
   - Flag unmatched for review

5. BATCH PROCESSING
   - Group payouts by method (all wires in one batch)
   - Bulk file generation for bank upload
   - Status tracking per batch

6. REVERSAL HANDLING
   - Mark paid payout as reversed
   - Auto-create corrective entry
   - Notify investor + admin
   - Audit trail preserved

7. PAYOUT ANALYTICS
   - Per pool: total distributed, avg payout size, time-to-pay
   - Per investor: lifetime distributions, frequency
   - Per method: success rate, cost, speed

8. INVESTOR PAYOUT NOTIFICATIONS
   - Auto-email on payout: amount, method, expected arrival
   - Tax form attached (annual)
   - Distribution notice PDF (auto-generated)

9. CARRY CALCULATION
   - Per GP (if multiple)
   - Per LP (if they have carry rights, rare)
   - Clawback tracking: if cumulative carry > final entitlement
   - Clawback return at pool close

10. FEE PAYMENTS
    - Separate from distributions
    - Monthly/quarterly based on pool config
    - Auto-deduct from investor capital account
    - Generate fee invoices
```

#### Edge Cases & Error Handling

```
SCENARIO                              ACTION
─────────────────────────────────────────────────────────────────
Payout amount > available NAV          Block creation
                                       "Insufficient NAV for payout"

Tax form missing for investor          Block payout (or warn)
                                       "Tax form required for $X+ payout"

Bank account invalid (wire returned)  Mark payout as Failed
                                       Add to retry queue
                                       Notify investor to update

Investor in blacklist (sanctions)      Block payout
                                       Flag for compliance review
                                       Don't release funds

Currency conversion fails              Use last known rate + warning
                                       Allow admin override
                                       Log discrepancy

Waterfall produces negative LP return  Skip carry entirely
                                       LP gets all available capital
                                       GP gets $0 carry

Bulk approve includes failed           Don't approve failed
                                       Show "X of Y approved" toast

Investor overpaid (payout > entitled) Reverse excess
                                       Create corrective payout (negative)
                                       Notify investor
```

#### Performance Considerations

```
- Queue: paginate (20 per page), filter client-side
- History: virtualize (potentially thousands of records)
- Waterfall computation: Web Worker (complex math)
- Reconciliation: Web Worker for fuzzy matching
- Batch file generation: server-side (when backend exists)
- Export: stream CSV
```

#### Testing Strategy

```
UNIT TESTS:
  - Waterfall math: known inputs -> expected per-tier amounts
  - Tax withholding: per country + treaty
  - Payout lifecycle state machine
  - Filter + sort logic
  - Bulk action targeting

INTEGRATION:
  - Schedule payout -> assert appears in queue
  - Approve payout -> assert status -> Processing
  - Reconcile payment -> assert marked Paid
  - Reverse payout -> assert corrective entry created

E2E:
  - Open payouts -> see queue -> approve one -> mark paid
  - Run waterfall on pool -> see per-investor breakdown
  - Bulk approve all -> assert count
```

#### Accessibility & UX Enhancements

```
- Payout cards: role="article" + descriptive aria-label
- Status badges: text + color (Scheduled/Processing/Paid/Failed)
- Action buttons: large tap targets, keyboard accessible
- Waterfall chart: text alternative + data table toggle
- Bulk select: shift+click for range
- Confirmation modals: clear warnings for irreversible actions
- Tax withheld: clearly labeled with explanation tooltip
```

---

### PAGE I-9: Investor Analytics (`/investors/analytics`)

```
PURPOSE:
  Performance analytics across all pools and investors.
  Returns, attribution, fees collected, ROI breakdowns,
  and benchmark comparisons.

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  "Investor Analytics"                                   │
│  [Overview] [By Pool] [By Investor] [Fees] [Risk]       │
│  Date Range: [Last 90 days ▼]   [Custom range]         │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  OVERVIEW TAB                                           │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │Gross IRR │ │Net IRR   │ │MOIC      │ │DPI       │  │
│  │ 14.2%    │ │ 11.8%    │ │ 1.13x    │ │ 0.27     │  │
│  │ ▲ +2.1pp │ │ ▲ +1.8pp │ │ ▲ +0.04x │ │ ▲ +0.05  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ AUM GROWTH (area chart)                          │   │
│  │ $4.2M┤                                  ╭──     │   │
│  │ $3.5M┤                          ╭──────╯        │   │
│  │ $2.8M┤              ╭──────────╯                │   │
│  │ $2.0M┤─────────────╯                            │   │
│  │      └─Jan──Feb──Mar──Apr──May──Jun--          │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌────────────────────┬─────────────────────────────┐   │
│  │ POOL PERFORMANCE   │  INVESTOR CONCENTRATION     │   │
│  │ (bar chart)        │  (pie chart)                │   │
│  │ Q1 Vol: +4.2%      │  Acme LLC: 28%              │   │
│  │ Q4 FX:  +3.4%      │  Jane D: 12%                │   │
│  │ Q3 Crp: +0.2%      │  R.Mwangi: 7%               │   │
│  │                    │  Others: 53%                │   │
│  └────────────────────┴─────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ KEY METRICS:                                     │   │
│  │ • Total Fees Collected: $84,500 (90 days)        │   │
│  │ • Carry Earned (GP): $24,800                      │   │
│  │ • Avg Investor Return: 8.6% (net)                 │   │
│  │ • Best Performer: Q1 Vol Pool (+4.2%)            │   │
│  │ • Worst Performer: Q3 Crypto (+0.2%)             │   │
│  │ • Capital Deployment Rate: 82.9%                  │   │
│  │ • Distribution Rate: 26.8% of paid-in            │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

#### Components Breakdown

```
AnalyticsPage/
  ├── DateRangeSelector
  │     ├── preset: "30d" | "90d" | "ytd" | "1y" | "all" | "custom"
  │     └── customRange: { from, to }
  │
  ├── OverviewTab
  │     ├── KpiCards (4): grossIRR, netIRR, moic, dpi
  │     ├── AumGrowthChart (AreaChart)
  │     ├── PoolPerformanceChart (BarChart)
  │     ├── InvestorConcentrationChart (PieChart)
  │     └── KeyMetricsList
  │
  ├── ByPoolTab
  │     ├── table: pool, committed, paidIn, nav, grossReturn,
  │             netReturn, irr, moic, carry, fees, distributionRate
  │     ├── comparisonChart: MultiLineChart (NAV over time per pool)
  │     └── attributionChart: stacked bar (each pool's contribution to total P&L)
  │
  ├── ByInvestorTab
  │     ├── table: investor, committed, paidIn, nav, grossReturn,
  │             netReturn, irr, feesPaid, carryPaid, distributions
  │     ├── topPerformers: top 5 by IRR
  │     ├── bottomPerformers: bottom 5 by IRR
  │     └── concentrationAnalysis: HHI (Herfindahl-Hirschman Index)
  │
  ├── FeesTab
  │     ├── feesCollected: by type (mgmt, carry, other)
  │     ├── feesByPool: bar chart
  │     ├── feesByMonth: line chart
  │     ├── feeCollectionRate: % of accrued vs collected
  │     └── forecastedFees: next 90 days based on current NAV
  │
  └── RiskTab
        ├── drawdownByPool: max drawdown per pool
        ├── sharpeRatio: per pool (if computable)
        ├── varChart: Value at Risk by pool
        ├── stressTest: hypothetical scenarios (market crash 2008, COVID 2020)
        └── concentrationRisk: top 10 investors % of AUM

METRICS DEFINITIONS:
  - Gross IRR: internal rate of return before fees
  - Net IRR: IRR after fees (mgmt + carry)
  - MOIC: Multiple on Invested Capital (NAV / paid-in)
  - DPI: Distributions to Paid-In capital
  - RVPI: Residual Value to Paid-In (NAV / paid-in)
  - TVPI: Total Value to Paid-In (DPI + RVPI)
```

#### Data Flow

```
ON MOUNT:
  1. Load all pools, investors, payouts, capital calls
  2. Compute aggregate metrics (useMemo)
  3. Default tab: Overview, default range: last 90 days

DATE RANGE CHANGE:
  - Re-aggregate based on filtered data
  - Update URL params (shareable)

PERIODIC REFRESH (mock):
  - Re-compute every 60s (simulating live NAV updates)
  - In real backend: subscribe to NAV updates
```

#### Advanced Features

```
1. CUSTOM DASHBOARD BUILDER
   - Drag-and-drop widgets (same pattern as tradeMO analytics)
   - Save layouts per admin user
   - Share layouts with team

2. INVESTOR-LEVEL PERFORMANCE VIEWS
   - Click any investor -> drill into their performance
   - Per-pool breakdown for that investor
   - Lifetime IRR, distributions, fees paid

3. BENCHMARK COMPARISON
   - Compare vs:
     - S&P 500 index
     - Hedge fund index (HFRI)
     - Other DerivX pools (anonymized aggregate)
   - Overlay returns chart

4. ATTRIBUTION ANALYSIS
   - Which pool contributed most to total AUM growth?
   - Which investor segment (VIP vs retail)?
   - Time period attribution (month-over-month)

5. FEE FORECASTING
   - Project next-quarter fees based on:
     - Current NAV
     - Fee structure
     - Historical carry rates
   - Cash flow planning for GP

6. SCENARIO MODELING
   - "What if Q1 Vol returns 15%?"
   - "What if 2 investors withdraw?"
   - Inputs + outputs in modal

7. EXPORTABLE REPORTS
   - LP quarterly report (auto-generated PDF)
   - Includes all key metrics, charts, narratives
   - White-label with admin's branding
   - Schedule recurring generation

8. ALERTING ON METRICS
   - "Alert if pool IRR drops below 0%"
   - "Alert if investor concentration > 30%"
   - Email + in-app notifications

9. CARRY FORECAST
   - Projected carry if pool closed today
   - Per GP (if multiple GPs)
   - Comparison vs hurdle rate
```

#### Edge Cases & Error Handling

```
SCENARIO                              ACTION
─────────────────────────────────────────────────────────────────
No pools with data                     Show "No data yet" empty state
                                      Don't render empty charts

IRR not computable (no cash flows)    Show "N/A"
                                      Explain: "Requires at least 1
                                      capital call + 1 distribution"

Date range returns 0 trades            Show "No activity in this period"
                                      Suggest wider range

Metric calculation error (divide by 0) Show "N/A" + log to Sentry
                                      Don't crash UI

PDF export fails                       Retry 3x
                                      Show fallback: CSV export

Custom dashboard save fails            Preserve layout in localStorage
                                      Retry with backoff

Investor concentration > 40%           Show warning banner
                                      Suggest diversification
```

#### Performance Considerations

```
- Aggregations: precompute daily, store in analytics_summary
- Charts: use Recharts for < 1000 points, else canvas (uPlot)
- IRR calculation: Newton's method (fast, converges)
- Date range: prevent > 1 year without confirmation
- PDF export: server-side (when backend exists)
- Web Worker for heavy metric calculations
```

#### Testing Strategy

```
UNIT TESTS:
  - IRR calculation: known cash flows -> expected IRR
  - MOIC, DPI, TVPI math
  - Fee forecast logic
  - Attribution math
  - Filter + date range

INTEGRATION:
  - Load analytics -> assert KPIs populated
  - Change date range -> assert re-aggregation
  - Schedule PDF report -> assert email sent

E2E:
  - Open analytics -> see overview KPIs + charts
  - Switch to By Pool tab -> see table
  - Export quarterly report PDF
```

#### Accessibility & UX Enhancements

```
- All charts: text alternative + data table toggle
- KPI cards: aria-label with full description
- Date picker: keyboard navigable calendar
- Tables: sortable headers, proper scope
- Color palette: colorblind-safe (viridis)
- Reduced motion: disable chart animations
- Number formatting: locale-aware
```

---

### PAGE I-10: Documents & Compliance (`/investors/documents`)

```
PURPOSE:
  Manage all documents: subscription agreements, KYC docs,
  quarterly reports, capital call notices, distribution notices,
  audited statements, marketing decks.

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  "Documents & Compliance"            [+ Upload Document]│
│  [All] [Pending Review] [Approved] [Rejected] [Expired]│
│  [🔍 Search...] [Type ▼] [Pool ▼] [Investor ▼]        │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  STATS BAR                                              │
│  Total: 47 | Pending: 5 | Approved: 38 | Rejected: 2  │
│  Expiring soon: 3 (within 30 days)                     │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  DOCUMENTS TABLE                                        │
│  ┌────┬──────────────┬────────────┬──────┬──────┬─────┐│
│  │Type│Filename      │Linked To   │Size  │Status│Action││
│  ├────┼──────────────┼────────────┼──────┼──────┼─────┤│
│  │SA  │Q1_Vol_Sub... │Q1 Vol Pool │240KB │✓App. │View ││
│  │KYC │JaneD_ID.jpg  │Jane Doe    │1.2MB │⏳Rev. │Review││
│  │QR  │Q1_Vol_Q4.pdf │Q1 Vol Pool │890KB │Draft │Edit ││
│  │CCN │CC_001_notice │Jane Doe    │45KB  │✓App. │View ││
│  │... │              │            │      │      │     ││
│  └────┴──────────────┴────────────┴──────┴──────┴─────┘│
│  [+ Bulk Approve] [+ Bulk Share] [+ Export Index]     │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  COMPLIANCE CHECKLIST                                   │
│  Per pool:                                              │
│  Q1 Vol Pool:                                           │
│    ✓ Subscription agreements (8/8)                     │
│    ✓ KYC docs (8/8)                                     │
│    ✓ Tax forms (7/8) - 1 missing                        │
│    ✓ Risk disclosure (8/8)                              │
│    ✓ Fee disclosure (8/8)                              │
│    ⚠ Quarterly report (overdue)                        │
│  Q4 FX Pool:                                            │
│    ✓ All requirements met                              │
└─────────────────────────────────────────────────────────┘
```

#### Components Breakdown

```
DocumentsPage/
  ├── DocumentsHeader
  │     ├── totalCount, pendingCount, expiringCount
  │     └── onUpload: () -> UploadDocumentModal
  │
  ├── DocumentsFilter
  │     ├── status: "draft" | "pending_review" | "approved" | "rejected" | "expired"
  │     ├── type: InvestorDocumentType[]
  │     ├── poolId, investorId
  │     ├── searchQuery: filename, ID
  │     └── sortBy: "uploadedAt" | "filename" | "size" | "expiresAt"
  │
  ├── StatsBar
  │     ├── total, pending, approved, rejected, expired
  │     └── expiringSoon: count of docs expiring within 30 days
  │
  ├── DocumentsTable
  │     ├── documents: InvestorDocument[]
  │     ├── columns: type, filename, linkedTo, size, status, expiresAt, actions
  │     ├── bulkActions: approve, share, export, delete
  │     └── per-doc actions:
  │           ├── view: () -> document preview modal (PDF/IMG)
  │           ├── review: () -> review modal (approve/reject with notes)
  │           ├── edit: () -> edit metadata
  │           ├── share: () -> share with investor
  │           ├── download: () -> download file
  │           ├── delete: () -> confirm + remove
  │           └── reassign: () -> change linked entity
  │
  ├── ComplianceChecklist
  │     ├── perPool: per-pool requirements checklist
  │     ├── perInvestor: per-investor KYC requirements
  │     └── missingDocs: list of missing required docs
  │
  └── UploadDocumentModal
        ├── file: drag-drop or browse
        ├── type: select from enum
        ├── linkedTo: pool / investor / both
        ├── expiresAt: optional date
        ├── sharedWithInvestor: boolean
        ├── eSigned: boolean
        └── notes: optional

DOCUMENT TYPES:
  - subscription_agreement (SA)
  - kyc_id (government ID)
  - kyc_address (proof of address)
  - tax_form (W-9, W-8BEN, etc.)
  - quarterly_report (QR)
  - capital_call_notice (CCN)
  - distribution_notice (DN)
  - audited_statements (AS)
  - marketing_deck (MD)
  - other
```

#### Data Flow

```
ON MOUNT:
  1. Load all documents from mock store
  2. Default filter: all statuses
  3. Render table + compliance checklist
  4. Compute expiring-soon count

UPLOAD:
  - Drag-drop file or click to browse
  - Auto-detect type from filename (e.g. "W-9" -> tax_form)
  - Validate size (< 10MB), mimeType (PDF, JPG, PNG)
  - Upload (mock: instant, real backend: S3 presigned URL)
  - Set status = "pending_review"

REVIEW FLOW:
  - Click Review -> modal with preview
  - Approve: status -> "approved", notify linked investor
  - Reject: status -> "rejected", require reason + notes
  - Re-review allowed (audit trail)

COMPLIANCE CHECKLIST:
  - Per pool: required doc types per investor
  - Cross-reference with documents table
  - Highlight missing docs in red
  - Suggest batch upload if many missing

SHARING:
  - Toggle sharedWithInvestor
  - If true: visible in investor's self-service portal
  - Email notification sent on share
```

#### Advanced Features

```
1. E-SIGNATURE INTEGRATION
   - Send subscription agreement for e-signature (DocuSign mock)
   - Track signature status (sent, viewed, signed)
   - Auto-file signed PDF when complete

2. DOCUMENT VERSIONING
   - Each upload creates version 1
   - Re-upload with same name -> version 2
   - All versions retained, only latest visible by default
   - Diff view between versions (for text-based docs)

3. TEMPLATES LIBRARY
   - Subscription agreement template (per jurisdiction)
   - Capital call notice template
   - Distribution notice template
   - Generate from pool data (auto-fill merge fields)

4. AUTO-GENERATED DOCUMENTS
   - Capital call notice: auto-created on call creation
   - Distribution notice: auto-created on payout
   - Quarterly report: auto-drafted at quarter end
   - Pre-filled with pool + investor data

5. OCR + CLASSIFICATION
   - On upload: OCR the document (mock)
   - Auto-classify type (KYC, tax, report)
   - Auto-extract: investor name, date, amount
   - Suggest linked entity

6. EXPIRY MANAGEMENT
   - KYC docs: expire after 1 year (configurable)
   - Tax forms: expire annually
   - Auto-reminders 30 days before expiry
   - Block new commitments if required docs expired

7. AUDIT TRAIL
   - Every document action logged:
     uploaded, viewed, downloaded, shared, approved, rejected
   - Per-user attribution
   - Exportable for compliance reviews

8. BULK OPERATIONS
   - Bulk approve (with mass review)
   - Bulk share with investors
   - Bulk reassign to different pool/investor
   - Bulk export as ZIP

9. COMPLIANCE REPORTS
   - Monthly compliance summary
   - Per-pool readiness score
   - Audit-ready exports (PDF + CSV)
```

#### Edge Cases & Error Handling

```
SCENARIO                              ACTION
─────────────────────────────────────────────────────────────────
File upload fails (network)            Retry 3x
                                       Preserve file selection
                                       Show "Upload failed, retry?"

File too large (> 10MB)                Reject with size limit notice
                                       Suggest compression

Unsupported file type                  Reject with allowed types list
                                       (PDF, JPG, PNG, DOCX)

Document linked to deleted entity      Mark as "orphaned"
                                       Suggest reassign or delete

KYC doc expired during active pool     Block new commitments
                                       Send reminder to investor
                                       Allow existing capital to continue

E-signature fails                       Don't mark doc as signed
                                       Retry link generation
                                       Notify admin

Compliance checklist incomplete        Block pool status change
                                       (e.g. can't go from draft to fundraising)
                                       Show missing requirements

PDF preview fails (corrupt file)       Show "Preview unavailable"
                                       Offer download instead
```

#### Performance Considerations

```
- Table: paginate (50 per page), filter client-side
- PDF preview: lazy-load (react-pdf) only on view
- File upload: chunk large files (when real backend exists)
- Compliance checklist: memoize computation
- Audit trail: lazy-load older entries
- Bulk operations: stream (don't block UI)
```

#### Testing Strategy

```
UNIT TESTS:
  - Filter logic (status, type, pool, investor)
  - Sort comparators
  - Compliance checklist calculation
  - Expiry detection logic

INTEGRATION:
  - Upload document -> assert appears in table
  - Review (approve) -> assert status updates + investor notified
  - Delete document -> assert removed + audit trail entry

E2E:
  - Upload a PDF -> see in table -> review -> approve -> share with investor
  - Check compliance checklist for missing docs
  - Bulk approve 5 pending docs
```

#### Accessibility & UX Enhancements

```
- Table: sortable headers, proper scope, keyboard nav
- File upload: drag-drop + keyboard accessible (label wraps input)
- Status badges: text + color (Approved/Pending/Rejected)
- Document preview modal: keyboard navigable, focus trap
- Bulk select: shift+click for range
- Empty state: clear CTA "Upload your first document"
- Reduced motion: disable transitions
```

---

### PAGE I-11: Communications (`/investors/communications`)

```
PURPOSE:
  Send and track all investor communications: email, SMS,
  in-app messages, push notifications. Templates, scheduling,
  and engagement analytics.

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  "Communications"                  [+ New Communication]│
│  [Sent] [Scheduled] [Drafts] [Templates] [Analytics]   │
│  Filter: [Channel ▼] [Audience ▼] [Date ▼]            │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  SENT TAB                                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │ ✉️ Q1 Vol Pool - March Update                   │   │
│  │ To: 8 investors in Q1 Vol Pool                   │   │
│  │ Sent: Mar 14, 2026 09:00                         │   │
│  │ Opens: 6/8 (75%) | Clicks: 3/8 (38%)            │   │
│  │ [View] [Duplicate] [Resend] [Analytics]          │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ ✉️ Capital Call Notice - CC-001                 │   │
│  │ To: Jane Doe (jane@example.com)                  │   │
│  │ Sent: Mar 12, 2026 14:30                         │   │
│  │ Opens: 2/2 (100%) | Clicks: 1/2 (50%)           │   │
│  │ [View] [Duplicate] [Resend] [Analytics]          │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  NEW COMMUNICATION MODAL                                │
│  Channel: [Email ▼]                                     │
│  Audience: [Broadcast ▼] -> All / Pool / Individual     │
│  Recipients: [All 24 investors ▼] or [Select...]      │
│  Subject: [March 2026 Pool Update          ]           │
│  Body: [Rich text editor with merge fields]            │
│    Available merge: {{investor_name}}, {{pool_name}},  │
│    {{committed_amount}}, {{nav}}, {{payout_amount}}    │
│  Attachments: [+ Add] (documents from library)         │
│  Schedule: [Send now ▼] or [Schedule for: ___]        │
│  Template: [Save as template □]                         │
│  [Cancel] [Save Draft] [Send]                          │
└─────────────────────────────────────────────────────────┘
```

#### Components Breakdown

```
CommunicationsPage/
  ├── CommsHeader
  │     ├── activeTab: "sent" | "scheduled" | "drafts" | "templates" | "analytics"
  │     └── onNewCommunication: () -> NewCommunicationModal
  │
  ├── CommsFilter
  │     ├── channel: "email" | "sms" | "in_app" | "push"
  │     ├── audience: "broadcast" | "pool" | "individual"
  │     ├── dateRange
  │     └── searchQuery: subject, body
  │
  ├── SentTab
  │     ├── communications: Communication[] (status: sent)
  │     ├── per-comm actions: view, duplicate, resend, analytics
  │     └── summary: total sent, avg open rate, avg click rate
  │
  ├── ScheduledTab
  │     ├── communications: Communication[] (status: scheduled)
  │     ├── upcomingCount: scheduled for next 7 days
  │     └── actions: edit, cancel, send now
  │
  ├── DraftsTab
  │     ├── communications: Communication[] (status: draft)
  │     └── actions: edit, send, delete
  │
  ├── TemplatesTab
  │     ├── templates: CommsTemplate[]
  │     ├── categories: "capital_call" | "distribution" | "quarterly" | "kyc_reminder" | "welcome"
  │     └── actions: use, edit, duplicate, delete
  │
  ├── AnalyticsTab
  │     ├── deliveryRate: % successfully delivered
  │     ├── openRate: % opened (email only)
  │     ├── clickRate: % clicked link in email
  │     ├── unsubscribeRate
  │     ├── perChannel comparison
  │     └── trend over time
  │
  └── NewCommunicationModal
        ├── channel: select
        ├── audience: broadcast / pool / individual
        ├── recipients: multi-select (filtered by audience)
        ├── subject: text input
        ├── body: rich text editor (TipTap)
        ├── mergeFields: dropdown to insert
        ├── attachments: from documents library
        ├── schedule: send now / schedule for later
        ├── saveAsTemplate: boolean
        └── actions: save draft, send, schedule

MERGE FIELDS:
  - {{investor_name}}: legalName
  - {{pool_name}}: pool.name
  - {{committed_amount}}: investor.committedCapital
  - {{paid_in_amount}}: investor.paidInCapital
  - {{nav}}: investor.nav
  - {{payout_amount}}: (if distribution context)
  - {{call_amount}}: (if capital call context)
  - {{call_due_date}}: (if capital call context)
  - {{admin_name}}: current admin user
  - {{support_email}}: from settings

TEMPLATE LIBRARY (pre-built):
  1. Welcome email (new investor)
  2. Capital call notice
  3. Distribution notice
  4. Quarterly update
  5. KYC expiry reminder
  6. Pool closing notice
  7. Pool renewal invitation
  8. Tax form request
  9. Compliance reminder
  10. General announcement
```

#### Data Flow

```
ON MOUNT:
  1. Load all communications from mock store
  2. Default tab: Sent (last 30 days)
  3. Compute summary stats (open rate, click rate)

NEW COMMUNICATION FLOW:
  1. Open modal
  2. Select channel + audience
  3. Recipients auto-populate based on audience
  4. Optionally select template (pre-fills subject + body)
  5. Edit body, insert merge fields
  6. Preview with sample investor data
  7. Send now / schedule / save draft

SENDING (mock):
  - Create Communication record (status: sent or scheduled)
  - "Send" to each recipient (mock: log to console)
  - Update investor's communication history
  - Track opens/clicks (mock: simulate 60% open, 25% click)

ANALYTICS UPDATE:
  - On open: beacon fires (mock: random 60% probability)
  - On click: link wrapped with tracking
  - Real-time updates to analytics dashboard
```

#### Advanced Features

```
1. RICH TEXT EMAIL EDITOR
   - WYSIWYG editor (TipTap)
   - Merge fields dropdown
   - Inline images (from documents library)
   - Tables, lists, formatting
   - Dark/light preview
   - Mobile preview

2. MULTI-CHANNEL ORCHESTRATION
   - One message across email + SMS + in-app
   - Channel fallback: if email bounces, send SMS
   - Per-investor channel preferences respected

3. AUDIENCE SEGMENTATION
   - "All VIP investors" (tag-based)
   - "Investors in Q1 Vol Pool with KYC pending"
   - "Investors who haven't logged in for 30 days"
   - Custom query builder

4. A/B TESTING
   - Two subject lines, send to 20% each
   - Winner auto-sent to remaining 60%
   - Statistical significance reported

5. DRIP CAMPAIGNS
   - Sequence: Welcome -> Day 3: Pool intro -> Day 7: KYC reminder
   - Per-investor progression tracked
   - Pause/resume per investor

6. EVENT-TRIGGERED AUTOMATIONS
   - Capital call created -> auto-send call notice
   - Payout processed -> auto-send distribution notice
   - KYC expiring in 30 days -> auto-send reminder
   - Pool closing in 7 days -> auto-send closing notice

7. ENGAGEMENT SCORING
   - Per investor: open rate, click rate, response rate
   - Identify disengaged investors (open rate < 20%)
   - Suggest re-engagement campaign

8. UNSUBSCRIBE MANAGEMENT
   - Per-channel unsubscribe
   - Per-category unsubscribe (capital calls always sent)
   - Compliance with CAN-SPAM, GDPR

9. SCHEDULE OPTIMIZATION
   - "Best time to send" suggestion per investor
   - Based on historical open patterns
   - Auto-schedule for optimal time

10. TRANSLATIONS
    - Per-investor locale
    - Auto-translate templates (mock: not implemented)
    - Manual translation upload
```

#### Edge Cases & Error Handling

```
SCENARIO                              ACTION
─────────────────────────────────────────────────────────────────
Email bounces (invalid address)       Mark as bounced
                                      Notify admin
                                      Don't retry (manual fix)

Recipient unsubscribed                 Skip send
                                      Log in audit trail
                                      Don't count in delivery rate

Attachment too large (> 10MB)          Reject with notice
                                      Suggest cloud link instead

Scheduled send time in past            Send immediately
                                      Or prompt for new time

Merge field references deleted entity  Show "[N/A]" in email
                                      Log warning

Template deleted while draft uses it    Keep draft content
                                      Mark as "orphaned template"

Bulk send to 1000+ recipients          Queue (don't block UI)
                                      Show progress bar
                                      Allow cancel mid-send

Analytics tracking fails               Don't block email send
                                      Log to Sentry
                                      Continue showing partial data
```

#### Performance Considerations

```
- Sent tab: paginate (20 per page), filter client-side
- Rich text editor: lazy-load (TipTap is heavy)
- Recipients multi-select: virtualize if > 100
- Bulk send: async queue (when real backend exists)
- Analytics: pre-aggregate daily
- Templates: cache in localStorage
```

#### Testing Strategy

```
UNIT TESTS:
  - Merge field replacement
  - Audience filtering logic
  - Template variable injection
  - Filter + sort
  - Analytics calculations

INTEGRATION:
  - Create communication -> send -> assert appears in Sent
  - Schedule communication -> wait -> assert sent
  - Template usage -> assert pre-fills correctly

E2E:
  - Open comms -> new email -> select audience -> send -> see in Sent
  - Use template -> edit body -> send
  - View analytics for past email
```

#### Accessibility & UX Enhancements

```
- Modal: focus trap, restore focus on close, Escape to close
- Rich text editor: keyboard accessible (TipTap supports this)
- Merge field dropdown: searchable, keyboard nav
- Recipients multi-select: clear selection list, keyboard nav
- Status badges: text + color (Sent/Scheduled/Draft)
- Empty state: clear CTA "Send your first communication"
- Reduced motion: disable modal transitions
```

---

### PAGE I-12: Investor Portal Settings (`/investors/settings`)

```
PURPOSE:
  Configure the investor module: default fee structures,
  waterfall templates, tax rules, admin users, branding,
  support contact, and global limits.

LAYOUT:
┌─────────────────────────────────────────────────────────┐
│  "Investor Portal Settings"                             │
│  [General] [Fees & Waterfall] [Tax] [Admin Users]       │
│  [Branding] [Limits] [Integrations] [Audit Log]        │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  GENERAL TAB                                            │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Legal Entity Name: [DerivX Capital LLC     ]    │   │
│  │ Support Email: [investors@derivx.com       ]    │   │
│  │ Support Phone: [+1-555-0123               ]     │   │
│  │ Default Timezone: [America/New_York ▼]          │   │
│  │ Default Currency: [USD ▼]                       │   │
│  │ Supported Currencies: [USD] [EUR] [GBP] [+]    │   │
│  │ Module Status: [🟢 Active ▼] (active/paused)    │   │
│  │                                                  │   │
│  │ [Save Changes]                                   │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  FEES & WATERFALL TAB                                   │
│  Default Fee Structure (applied to new pools):         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Management Fee: [2.0] % [quarterly ▼]            │   │
│  │ Carried Interest: [20] %                         │   │
│  │ Hurdle Rate: [8] %                              │   │
│  │ GP Catch-up: [100] %                            │   │
│  │ ☑ High Water Mark                                │   │
│  │ Fee Payment: [In Advance ▼]                     │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  Default Waterfall:                                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Type: [European ▼]                               │   │
│  │ Tiers:                                            │   │
│  │  1. Preferred Return (LP 100%) - hurdle 8%      │   │
│  │  2. GP Catch-up (GP 100%) - to 20% carry ratio   │   │
│  │  3. 80/20 split (LP 80%, GP 20%)                 │   │
│  │ [+ Add Tier]                                     │   │
│  └──────────────────────────────────────────────────┘   │
│  [Save Defaults]                                        │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  ADMIN USERS TAB                                        │
│  ┌────┬─────────────┬────────────┬──────────┬──────┐  │
│  │Name│Email         │Role        │Last Active│Action│  │
│  ├────┼─────────────┼────────────┼──────────┼──────┤  │
│  │You │admin@...     │Super Admin │Now        │Edit  │  │
│  │Jane│jane@...      │Inv. Manager│2h ago     │Edit  │  │
│  │Bob │bob@...       │Compliance  │1d ago     │Edit  │  │
│  └────┴─────────────┴────────────┴──────────┴──────┘  │
│  [+ Invite Admin]                                       │
└─────────────────────────────────────────────────────────┘
```

#### Components Breakdown

```
SettingsPage/
  ├── SettingsTabs
  │     ├── "general" | "fees_waterfall" | "tax" | "admin_users"
  │     ├── "branding" | "limits" | "integrations" | "audit_log"
  │
  ├── GeneralTab
  │     ├── legalEntityName, supportEmail, supportPhone
  │     ├── defaultTimezone, defaultCurrency
  │     ├── supportedCurrencies: Currency[]
  │     ├── moduleStatus: "active" | "paused"
  │     └── onSave: () -> update adminSettings
  │
  ├── FeesWaterfallTab
  │     ├── defaultFeeStructure: FeeStructure
  │     │     ├── managementFeePct, managementFeeFreq
  │     │     ├── carriedInterestPct, hurdleRatePct
  │     │     ├── catchUpPct, highWaterMark, feePaymentMethod
  │     ├── defaultWaterfall: WaterfallConfig
  │     │     ├── type: "european" | "american"
  │     │     └── tiers: WaterfallTier[] (editable)
  │     └── onSaveDefaults
  │
  ├── TaxTab
  │     ├── taxRules: TaxRule[] (per country)
  │     │     ├── countryCode, formRequired
  │     │     ├── defaultWithholdingPct, treatyReductionPct
  │     ├── addRule, editRule, deleteRule
  │     └── bulk import (CSV of country -> rate)
  │
  ├── AdminUsersTab
  │     ├── adminUsers: AdminUser[]
  │     ├── roles: "super_admin" | "investor_manager" | "ops" | "compliance" | "viewer"
  │     ├── permissions per role (configurable)
  │     ├── inviteAdmin: email + role -> send invite
  │     ├── editRole, revokeAccess, deactivate
  │     └── lastActiveAt tracking
  │
  ├── BrandingTab
  │     ├── brandColor: color picker
  │     ├── logo upload (mock)
  │     ├── emailTemplateBranding (header image, footer)
  │     ├── portalDomain: (e.g. investors.derivx.com)
  │     └── whiteLabelMode: boolean
  │
  ├── LimitsTab
  │     ├── minCommitmentGlobal, maxCommitmentGlobal
  │     ├── maxInvestorsPerPool, maxPoolsPerInvestor
  │     ├── maxPayoutPerDay, maxCapitalCallAmount
  │     └── rateLimits: API calls per admin per hour
  │
  ├── IntegrationsTab
  │     ├── KYC provider (mock: "Persona", "Sumsub")
  │     ├── E-signature (mock: "DocuSign")
  │     ├── Payment processor (mock: "Stripe", "Wise")
  │     ├── Accounting (mock: "QuickBooks")
  │     ├── Email provider (mock: "SendGrid", "Postmark")
  │     └── per integration: status, last sync, settings
  │
  └── AuditLogTab
        ├── all admin actions
        ├── filter by user, action type, date
        ├── exportable
        └── retention policy (e.g. 7 years)

ROLE PERMISSIONS MATRIX:
  Super Admin:    all permissions
  Investor Mgr:   view/edit investors, pools, comms (no settings)
  Ops:            view all, edit payouts, capital calls (no settings)
  Compliance:     view all, edit KYC/docs only (no financial edits)
  Viewer:         view all, edit nothing

DEFAULT PERMISSIONS (per role, editable):
  - investors.view, investors.edit, investors.invite
  - pools.view, pools.edit, pools.create, pools.close
  - funds.view, funds.edit, capitalCalls.send
  - payouts.view, payouts.approve, payouts.process
  - documents.view, documents.review, documents.upload
  - comms.view, comms.send, comms.templates
  - settings.view, settings.edit
  - audit_log.view
```

#### Data Flow

```
ON MOUNT:
  1. Load adminSettings from mock store
  2. Default tab: General
  3. Render form pre-filled with current settings

SAVE FLOW:
  - Per tab: save changes -> validate -> update mock store
  - Show "Settings saved" toast
  - Audit log entry: "Updated {tab} settings"

ADMIN USER LIFECYCLE:
  Invite -> Pending -> Active -> Suspended -> Deactivated
  - Invite: email sent with magic link
  - Pending: invite sent, not yet accepted
  - Active: logged in at least once
  - Suspended: temporarily disabled (admin action)
  - Deactivated: permanently disabled (audit retained)

ROLE CHANGE:
  - Super admin only
  - Requires confirmation (especially downgrade from super_admin)
  - Audit log entry
  - Email notification to affected user

INTEGRATION TOGGLES:
  - Toggle on/off per integration
  - Test connection button
  - Sync now (manual trigger)
  - Auto-sync schedule (configurable)
```

#### Advanced Features

```
1. ROLE-BASED ACCESS CONTROL (RBAC)
   - Fine-grained permissions per role
   - Custom roles (create new roles with specific permissions)
   - Per-pool access (manager A only sees Pool X, Y)

2. FEATURE FLAGS
   - Toggle features on/off per environment
   - "Investor self-service portal": beta / GA
   - "Multi-currency": enabled / disabled
   - "AI pool configurator": enabled / disabled

3. ENVIRONMENT BADGE
   - Mock Data: yellow badge in topbar
   - Staging: blue badge
   - Production: green badge
   - Prevents accidental prod actions in mock

4. BACKUP & RESTORE
   - Export all settings as JSON
   - Import from JSON (with validation)
   - Version history of settings changes
   - Rollback to previous version

5. MULTI-TENANCY (future)
   - Multiple fund managers on one install
   - Per-tenant settings, branding, users
   - Tenant isolation

6. COMPLIANCE MODE
   - Toggle: "SOC 2 mode" enforces stricter rules
     - 2FA required for all admins
     - Audit log retention: 7 years
     - No bulk delete (soft delete only)
     - Password rotation: 90 days

7. EMAIL TEMPLATES EDITOR
   - Edit default email templates per type
   - Merge field picker
   - HTML + plain text versions
   - Test send to self

8. WEBHOOK CONFIGURATION
   - Outgoing webhooks for events:
     - investor.created
     - capital_call.paid
     - payout.processed
     - pool.closed
   - URL + secret + event selection
   - Test webhook button

9. SSO CONFIGURATION
   - SAML 2.0 integration (mock)
   - Google Workspace SSO
   - Microsoft 365 SSO
   - Per-admin enforcement

10. DATA RESIDENCY
    - Choose data region (US, EU, APAC)
    - Per-tenant in multi-tenant mode
    - Compliance with GDPR (EU), CCPA (CA)
```

#### Edge Cases & Error Handling

```
SCENARIO                              ACTION
─────────────────────────────────────────────────────────────────
Last super_admin tries to deactivate   Block action
themselves                            "Cannot deactivate last super admin"

Settings save fails (network)         Retry with backoff
                                      Preserve form state
                                      Show "Save failed, retry?" toast

Role change affects own account       Require 2FA confirmation
                                      Apply on next login

Integration test fails                Show specific error
                                      (e.g. "Invalid API key")
                                      Don't save settings

Audit log exceeds retention           Auto-archive (don't delete)
                                      Compress old entries

Currency list removes used currency   Block removal
                                      "Currency in use by 3 pools"

Module paused                         Block all investor actions
                                      Show banner: "Module paused by admin"
                                      Allow settings changes (to resume)
```

#### Performance Considerations

```
- Settings: cache in localStorage for instant load
- Audit log: paginate (100 per page), lazy-load older
- Admin users: small list, no perf issue
- Form validation: debounced (300ms)
- Auto-save: per tab, debounced 1s
```

#### Testing Strategy

```
UNIT TESTS:
  - Form validation per tab
  - Role permissions matrix
  - Tax rule calculations
  - Waterfall tier validation

INTEGRATION:
  - Save settings -> reload -> assert persisted
  - Invite admin -> assert invite sent (mock email)
  - Change role -> assert permissions update

E2E:
  - Update general settings -> save -> assert applied
  - Edit default fee structure -> create new pool -> assert defaults applied
  - View audit log -> filter by user -> assert correct entries
```

#### Accessibility & UX Enhancements

```
- All forms: proper labels, aria-describedby for errors
- Tabs: WAI-ARIA tabs pattern, arrow key navigation
- Color picker: keyboard accessible, text input alternative
- Role dropdown: searchable, keyboard nav
- Toggle switches: role="switch" + aria-checked
- Save buttons: disabled state when no changes
- Confirmation modals for destructive actions
- High-contrast mode for forms
```

---
## 4. ROUTE MAP & SIDEBAR NAV

```
APP ROUTER STRUCTURE:
  /investors/                     -> I-1  Dashboard Hub
  /investors/pools                -> I-2  Pool Trade Plans
  /investors/pools/new            -> I-3  Create Pool Plan
  /investors/pools/[id]           -> I-4  Pool Detail / Live Monitor
  /investors/pools/[id]/edit      -> (alias to I-3 with prefill)
  /investors/schedules            -> I-5  Trade Schedule Manager
  /investors/funds                -> I-6  Funds / Paid-In Finances
  /investors/investors            -> I-7  Investor Directory
  /investors/investors/[id]       -> Investor Profile (deep view)
  /investors/payouts              -> I-8  Payout Manager
  /investors/analytics            -> I-9  Investor Analytics
  /investors/documents            -> I-10 Documents & Compliance
  /investors/communications       -> I-11 Communications
  /investors/settings             -> I-12 Investor Portal Settings

SIDEBAR (persisted, collapsible):
  [Dashboard]        /investors
  [Pool Plans]       /investors/pools
  [Schedules]        /investors/schedules
  [Funds / Paid-In]  /investors/funds
  [Investors]        /investors/investors
  [Payouts]          /investors/payouts
  [Analytics]        /investors/analytics
  [Documents]        /investors/documents
  [Communications]  /investors/communications
  [Settings]         /investors/settings
  ─────────────────
  [Switch to Trader] /dashboard

TOPBAR:
  [Mock Data badge]  [Search]  [Bell]  [Admin User ▼]
```

---

## 5. MOCK DATA STORE (Single Source of Truth)

```
LOCATION: /lib/investors/mock-store.ts

STRUCTURE:
  - investors: Investor[]        (24 records)
  - pools: PoolPlan[]           (6 records)
  - schedules: ScheduleEntry[]  (14 records)
  - capitalCalls: CapitalCall[] (18 records)
  - payouts: Payout[]           (32 records)
  - documents: InvestorDocument[] (47 records)
  - communications: Communication[] (12 records)
  - adminSettings: AdminSettings (1 record)
  - auditLog: AuditEntry[]      (grows over time)

FEATURES:
  - localStorage persistence (survives page refresh)
  - Reset to defaults button
  - Seed function for demo data
  - TypeScript-typed (see section 2 for interfaces)
  - Synchronous reads (no async for mock)
  - Optional artificial delay (simulate network latency)

USAGE:
  import { mockStore } from "@/lib/investors/mock-store";
  const pools = mockStore.pools.list();
  const pool = mockStore.pools.get("pool_001");
  mockStore.pools.update("pool_001", { status: "paused" });

REACT QUERY INTEGRATION:
  - Wraps mockStore in query functions
  - Same API shape as real backend will have
  - Switch from mockStore.pools.list() to fetch("/api/pools")
    is the only change required

RESET:
  - "Reset mock data" button in settings (I-12)
  - Clears localStorage, reseeds from defaults
  - Confirms before reset (destructive)
```

---

## 6. MIGRATION PATH: Mock -> Real Backend

```
PHASE 1 (current): Mock data only
  - All reads/writes to mockStore
  - localStorage persistence
  - No network calls
  - Validate UX, data shapes, workflows

PHASE 2: API shim
  - Create /api/investors/* TanStack Start server function routes
  - Routes read/write to mockStore initially
  - UI switches from direct mockStore calls to fetch("/api/investors/...")
  - Same data, just goes through HTTP layer
  - Validates API contract before DB build

PHASE 3: Database
  - Replace mockStore with Prisma queries
  - PostgreSQL tables matching interfaces in section 2
  - Migrations preserve mock data as seed
  - WebSocket for real-time updates (pool NAV, payout status)

PHASE 4: External integrations
  - KYC provider (Persona/Sumsub)
  - E-signature (DocuSign)
  - Payment processor (Stripe/Wise)
  - Email provider (SendGrid)
  - Accounting (QuickBooks)
  - Replaces mock integration stubs in I-12

PHASE 5: Production features
  - Multi-tenancy
  - SSO
  - Audit log compliance (SOC 2)
  - Data residency
  - White-label
  - Investor self-service portal (real)

DEVELOPMENT ORDER RECOMMENDATION:
  1. Build all 12 pages with mock data (validate UX)
  2. Add API shim (validate contract)
  3. Build DB schema (Prisma)
  4. Migrate one entity at a time (investors first, then pools, etc.)
  5. Add integrations as needed
  6. Production hardening last
```

---

## COMPLETE PAGE INDEX (INVESTOR MODULE)

```
INVESTOR MODULE PAGES (12):
  I-1   /investors                  Investor Dashboard Hub
  I-2   /investors/pools             Pool Trade Plans
  I-3   /investors/pools/new         Create Pool Plan
  I-4   /investors/pools/:id         Pool Detail / Live Monitor
  I-5   /investors/schedules         Trade Schedule Manager
  I-6   /investors/funds             Funds / Paid-In Finances
  I-7   /investors/investors         Investor Directory
  I-8   /investors/payouts           Payout Manager
  I-9   /investors/analytics         Investor Analytics
  I-10  /investors/documents         Documents & Compliance
  I-11  /investors/communications   Communications
  I-12  /investors/settings          Investor Portal Settings

TOTAL: 12 PAGES (each with 8 sections: 4 base + 5 advanced)

ADVANCED SECTIONS PER PAGE (consistent with tradeMO.md pattern):
  - Advanced Features
  - Edge Cases & Error Handling
  - Performance Considerations
  - Testing Strategy
  - Accessibility & UX Enhancements

COVERAGE:
  ✓ Pool trade plans (I-2, I-3, I-4)
  ✓ Schedules (I-5, plus per-pool schedule in I-4)
  ✓ Funds / paid-in finances (I-6, plus capital summary in I-4)
  ✓ Investors (I-7, plus investor tables in I-4 and I-6)
  ✓ Payouts (I-8, plus distribution notices in I-11)
  ✓ Analytics (I-9)
  ✓ Documents & compliance (I-10)
  ✓ Communications (I-11)
  ✓ Settings (I-12)
  ✓ Admin-side first (mock data, no backend required — see section 6)
```

---

This investor module outline is the companion to `tradeMO.md`. Both files together describe the full DerivX platform: a trading dashboard (tradeMO.md, 14 pages with 8 sections each) plus an investor/crowdfunding admin module (this file, 12 pages with 8 sections each). Start by building the 12 investor pages against the mock data store described in section 5 — once the admin workflows and data shapes are validated, follow the migration path in section 6 to land a real backend.
