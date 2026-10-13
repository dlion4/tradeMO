# TradeMO / DerivX

Front-end for **DerivX** — an automation, bot-builder, script-engine and copy-trading workspace built on top of
the public Deriv WebSocket API. This repository is a **pure front-end**: no backend, no live API calls. Every
dataset is realistic mock data shaped like the real Deriv payloads (`active_symbols`, `tick`, `proposal`,
`buy`, `portfolio`, `profit_table`, `statement`) so a back end can be dropped in later without touching the UI.

Blueprint files: [`tradeMO.md`](./tradeMO.md) (product/engineering brief) and [`investorMO.md`](./investorMO.md).
Design bible: [`docs/MASTER_THEME.md`](./docs/MASTER_THEME.md).

## Stack

| Layer | Choice |
| --- | --- |
| Framework | React 19 + TypeScript 5.9 + Vite 8 |
| App/routing | TanStack Start 1.169 (SSR) + TanStack Router 1.170 (file-based routes, typed links) |
| Styling | Bootstrap 5.3 grid/utilities (CSS only, `data-bs-theme="dark"`) + `src/styles/tokens.scss` design tokens + `.dx-*` component classes |
| Icons | lucide-react |
| Charts | inline SVG widgets in `src/components/ui/charts.tsx` (no chart library) |

## Commands

```bash
npm install
npm run dev              # Vite dev server on 0.0.0.0:5173
npm run generate-routes  # regenerate src/routeTree.gen.ts (TanStack router CLI)
npm run typecheck        # tsc --noEmit
npm run build            # client + SSR production build
npm run preview
```

`vite.config.ts` notes: `tanstackStart()` must precede `@vitejs/plugin-react`, and `server.allowedHosts` is
opened up so the sandboxed preview host can proxy the dev server. See `docs/MASTER_THEME.md` §14.

## Repository layout

```
src/
  router.tsx                 # createRouter() entry required by TanStack Start
  routes/__root.tsx          # document shell, global CSS layers, ToastProvider
  routes/index.tsx           # "/"     → H-1 landing page
  routes/home.tsx            # "/home" → same page (route named in the build config)
  data/market.ts             # 20 Deriv symbols, 11 contract types, duration rules, formatters, tick + proposal engines
  data/trading.ts            # accounts, positions, trades, bots, scripts, traders, testimonials, plans, FAQs,
                             # API endpoints, legal docs, presets, backtests, activity feed, community, tour
  lib/live.ts                # client-only tick / equity / P&L simulators (SSR-safe, reduced-motion aware)
  components/ui/             # shared primitives, table engine, SVG charts (never re-implemented per page)
  components/marketing/      # H-group shell (nav/mobile menu/footer) + landing sections + overlays
  components/shell|auth|investors/  # shell scaffolding for the D-, A- and I-groups
  styles/tokens.scss         # tokens + every shared `.dx-*` class
  styles/global.scss         # base + shell chrome
  styles/pages/home.scss     # page-scoped rules for `.page-home` (imported by the landing route only)
```

## H-1 — Landing page (`/` and `/home`)

Sections shipped, in blueprint order: navbar (+ mobile menu) · hero with live 6-symbol ticker ·
trust bar · three feature cards · live preview ("See it in action") · how it works (4 steps) · markets
coverage table · social proof (counter, testimonials, leaderboard preview) · final CTA · footer with legal,
socials, sitemap and the "Not affiliated with Deriv" notice.

Interactivity (all front-end, all real state — no dead buttons): 4-step onboarding wizard, 5-step OAuth2
connection wizard, sign-in dialog with 2FA step and password-reset flow, connection manager with revoke
confirmation, 5-slide product tour, demo console (trade ticket → proposal → confirm → buying → receipt, bot
fleet with start/pause/stop confirmations and log drawer, portfolio with early-close drawer, analytics with
equity curve, social tab with copy-trade wizard and kill switch), strategy-preset library, backtest runner,
pricing + checkout wizard, leaderboard with trader drawer, instrument drawer, API status drawer, feature/step
detail dialogs, FAQ, API docs, about, changelog, community, contact, testimonial drawer, sitemap and four
legal documents.

Toasts are limited to four meaningful triggers (newsletter subscribe, connection established, account ready,
contract bought); everything else surfaces as visible state (status-band chips, deployed bot rows in the
console fleet, activated tier badge, submitted form receipts).

Data volume per dataset (mock, no lorem ipsum): 20 symbols · 11 contract types · 16 trades · 12 positions ·
12 bots · 12 scripts · 14 traders · 12 testimonials · 12 FAQs · 12 API endpoints · 12 backtests · 10 presets.
