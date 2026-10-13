# MASTER_THEME.md — DerivX (TradeMO) Design Bible

> Single source of truth for **every** trading page (H-*, A-*, D-*) and investor page (I-*).
> Any class used in a `.tsx` file must exist in this document. No hex/rgb in components —
> tokens only (`var(--dx-*)`). No new fonts, no new libraries, no ad-hoc styles.

---

## §1 Color tokens (`src/styles/tokens.scss`)

Dark trading-floor palette, Bootstrap 5.3 `data-bs-theme="dark"` native.

| Token | Use |
| --- | --- |
| `--dx-bg` | app background (deep navy-black) |
| `--dx-bg-2` | inset / sunken panels |
| `--dx-surface` | card + panel surface |
| `--dx-surface-2` | raised surface (dialogs, drawers, popovers) |
| `--dx-surface-3` | hover surface / table stripe |
| `--dx-border` | 1px hairline borders |
| `--dx-border-strong` | focus + active borders |
| `--dx-text` | primary text |
| `--dx-text-dim` | secondary text |
| `--dx-muted` | labels, meta, helper text |
| `--dx-accent` | brand teal (primary actions, live state) |
| `--dx-accent-2` | indigo-blue (secondary actions, links) |
| `--dx-accent-soft` | accent tint fills (chips, bars) |
| `--dx-up` | long / win / profit (**risk-low**) |
| `--dx-down` | short / loss (**risk-high**) |
| `--dx-warn` | pending, margin call, elevated risk |
| `--dx-info` | neutral information, sync state |
| `--dx-risk-low` `--dx-risk-med` `--dx-risk-high` | risk scale used by `.dx-risk-*` |
| `--dx-glow` | focus ring / live glow |

Semantic rule: **green = money in, red = money out, amber = waiting, blue = information.**
Never use raw color words inside components.

## §2 Typography

| Class | Spec |
| --- | --- |
| `.dx-eyebrow` | 11px, uppercase, `letter-spacing:.14em`, muted, optional accent bar |
| `.dx-h-hero` | clamp(2.25rem, 5vw, 3.75rem), 700, tight tracking |
| `.dx-h-section` | clamp(1.5rem, 2.6vw, 2.1rem), 650 |
| `.dx-h-card` | 1.05rem, 600 |
| `.dx-lead` | 1.06rem, `--dx-text-dim`, max 62ch |
| `.font-display` | numeric/display face — **mandatory** for money, prices, stakes, payout %, contract counts, chart figures, timers. Tabular figures enabled. |
| `.dx-mono-num` | same stacking with `font-variant-numeric: tabular-nums` for table cells |

System font stacks only (no webfonts added by this project):
`--dx-font-ui` = system-ui stack; `--dx-font-display` = system monospace stack (SF Mono / Cascadia / Roboto Mono fallback) so every number aligns in columns.

## §3 Space, radius, elevation, motion

- Spacing scale `--dx-sp-1..8` (4,8,12,16,20,24,32,48px). Use `g-3/g-4`, `py-4` etc. for layout.
- Radii: `--dx-r-sm 8px`, `--dx-r 12px`, `--dx-r-lg 16px`, `--dx-r-xl 22px`, `--dx-r-pill 999px`.
- Elevation: `--dx-shadow-1` (resting card), `--dx-shadow-2` (hover lift), `--dx-shadow-3` (dialog/drawer).
- Motion: `--dx-t-fast 120ms`, `--dx-t 200ms`, `--dx-t-slow 320ms`, easing `cubic-bezier(.22,.61,.36,1)`.
- All motion is disabled under `prefers-reduced-motion: reduce` (see §11).

## §4 Layout contract

- One `.container` (max 1320px) per page; generous vertical rhythm: `.dx-section` = 56px/72px block padding.
- KPI rows: `col-12 → col-sm-6 → col-lg-3`. Card grids: `row-cols-1 → row-cols-sm-2 → row-cols-lg-3/4`.
- Side panels are drawers (`<Drawer/>`) below `lg`; above `lg` a page may inline them.
- Tables: `.dx-table-wrap > .dx-table`; below `md` the table collapses to stacked cards using `data-label` attributes (`.dx-table-stack`).
- Touch targets ≥ 44px; sticky mobile action bars use `.dx-sticky-bar`.
- Tested at 360px / 768px / 1280px.

## §5 Cards (`.dx-card` family)

`.dx-card` = surface, 1px border, `--dx-r-lg`, `--dx-shadow-1`, hover lift to `--dx-shadow-2`.
Variants: `.dx-card-pad`, `.dx-card-head`, `.dx-card-title`, `.dx-card-sub`, `.dx-card-actions`,
`.dx-card-flush` (table inside card), `.dx-card-accent` (top accent bar), `.dx-card-live` (teal border glow).

**Anti-crowd rule**: a stat/KPI card carries **max 1 metric + 1 trend + 1 action**.
Secondary detail (breakdowns, history, per-symbol splits) lives in a `<Drawer/>` or `<Dialog/>` opened by
the card's action. Never squeeze a mini-table into a small card.

## §6 Tables (`.dx-table`)

`.dx-table-wrap` (overflow + border + radius) → `.dx-table`:
sticky header (`.dx-table-sticky`), zebra rows, hover row highlight, numeric cells right-aligned with `.dx-td-num`
+ `.font-display`, row actions in the last column (`.dx-td-actions`).
Sortable header button: `.dx-th-sort` (+ `.is-sorted-asc/.is-sorted-desc` arrows).
Density: `.dx-table-sm`. Footer: `<Pagination>` (page size 5/10/25) in `.dx-pager`.
Every table on a page is sortable + searchable + filterable + paginated and has ≥10 mock rows.

## §7 Forms & filters

`.dx-field` → `.dx-label` (+ `.dx-req`) → `.dx-input` / `.dx-select` / `.dx-textarea` / `.dx-input-group`;
validation states `.is-invalid` + `.dx-error`, helper `.dx-help`.
Toggles `.dx-switch`, quick amounts `.dx-quick-btns`, sliders `.dx-range`.
Filters: `.dx-filter-bar` + `.dx-filter-chip` (`.is-active`), search `.dx-search`.
Wizards: `<Stepper/>` + `.dx-wizard` grid; destructive actions always go through `<Dialog variant="danger">`.

## §8 Status & risk chips

`.dx-chip` (pill, 11px, tabular figures) with semantic modifiers:
`.dx-chip-up` `.dx-chip-down` `.dx-chip-warn` `.dx-chip-info` `.dx-chip-muted` `.dx-chip-accent`.
Risk scale: `.dx-risk-low` `.dx-risk-med` `.dx-risk-high` — used on position/bot/portfolio rows
and anywhere a `risk: "low" | "medium" | "high"` value is rendered.
`.dx-dot` static status dot; `.dx-pulse` animated live dot (only on truly live elements).

## §9 Live-data widgets

- `.dx-pulse` — animated ring dot; live feeds, running bots, open positions.
- `.dx-flash-up` / `.dx-flash-down` — 700ms row/cell flash applied by `<PriceFlash/>` on tick direction.
- `.dx-tick-arrow` — flips direction with the tick; `.dx-spin` — sync/spinner only.
- `<StatCard>` count-up on mount + `trend` arrow; `<Sparkline>` inline SVG curve (no chart lib).
- Ticker strip `.dx-ticker` / `.dx-ticker-item` — CSS marquee, pauses on hover + reduced motion.

## §10 Overlays

- `<Dialog>` → `.dx-overlay` + `.dx-dialog` (`.dx-dialog-sm|-md|-lg|-xl|-full`), head/body/foot, ESC + backdrop close, focus trap, scroll lock.
- `<Drawer>` → `.dx-drawer-start|.dx-drawer-end`, row-detail panels, logs, document preview.
- `<Dropdown>` → `.dx-dd` + `.dx-dd-menu` + `.dx-dd-item` + `.dx-dd-divider`; real menu items only.
- `<Toasts/>` → `.dx-toast-wrap` + `.dx-toast`; **≤4 distinct triggers per page**, fired only after a completed action.
- `<Tabs/>` (`.dx-tabs`) for section switching, `<MiniTabs/>` (`.dx-minitabs`) for period switching (1D/1W/1M/All, Ticks/1m/1h).

## §11 Accessibility & motion

Focus-visible ring `--dx-glow` on every interactive element; `aria-*` on dialogs/drawers/tabs/toasts;
keyboard: ESC closes overlays, Enter submits, arrow keys move tabs; skip-link at top of marketing pages;
`prefers-reduced-motion: reduce` kills pulse/spin/marquee/reveal/count-up (values render final state immediately).

## §12 Page-scoped CSS convention

- Shared: `src/styles/tokens.scss` (tokens + `.dx-*` primitives, bundled once in `__root`).
- Page-scoped: `src/styles/pages/*.scss`, imported **only** by its own route module so the CSS ships in that
  route's chunk (injected on enter, removed on leave). Every rule nested under the page root class
  (`.page-home { … }`), tokens only, never shared.
- Mapping: `.page-home` → H-1 `/`, `.page-features` → H-2, `.page-pricing` → H-3, `.page-auth-*` → A-*,
  `.page-dashboard` → D-1, `.page-markets` → D-2, `.page-trade` → D-3, `.page-bots` → D-4, `.page-bot-new` → D-5,
  `.page-scripts` → D-6, `.page-automation` → D-7, `.page-portfolio` → D-8, `.page-social` → D-9,
  `.page-analytics` → D-10, `.page-connections` → D-11, `.page-settings` → D-12, `.page-bot-detail` → D-13,
  `.page-backtest` → D-14; `.page-i-hub … .page-i-settings` → I-1…I-12.
- If a class is genuinely missing it is appended **here first** (documented in the §13 changelog) then added to
  `tokens.scss` (or the page-scoped file if the look is unique to that page). Last resort only.

## §13 Class index & changelog

Class inventory is defined in `src/styles/tokens.scss` (grep `^\.dx-` there). Additions:

| Date | Class | Reason | Scope |
| --- | --- | --- | --- |
| 2026-10-13 | `.dx-ticker`, `.dx-ticker-item` | H-1 live symbol strip (marquee pauses on hover/reduced-motion) | shared (§9) |
| 2026-10-13 | `.dx-hero`, `.dx-hero-glow`, `.dx-grid-bg` | H-1 hero background art (radial glow + grid wash) | `.page-home` |
| 2026-10-13 | `.dx-terminal`, `.dx-terminal-line` | H-1 script-engine / demo console mock terminal | `.page-home` |
| 2026-10-13 | `.dx-quote`, `.dx-avatar`, `.dx-avatar-stack` | H-1 testimonial cards + leaderboard preview | shared |
| 2026-10-13 | `.dx-meter`, `.dx-meter-bar` | H-1 feature/plan/backtest capability meters | shared |
| 2026-10-13 | `.dx-card-inset-value` | single emphasised value inside an inset card (wizard receipts, KV blocks) | shared (§5) |
| 2026-10-13 | `.dx-step-*`, `.dx-tabs`, `.dx-minitabs`, `.dx-dd-*` | overlay + wizard primitive styling | shared (§10) |

---

### Component reuse rule

`src/components/ui/primitives.tsx` owns every shared primitive:
`Dialog, Drawer, Stepper, Tabs, MiniTabs, Dropdown, Toggle, Pagination, PriceFlash, StatCard, Sparkline,
Chip, EmptyState, Reveal, Toasts/useToast, Progress, Avatar, CopyButton, CodeBlock, Meter, SectionHead`.
Pages compose them; pages never re-implement them.

## §14 Build, tooling & route wiring (2026-10-13)

**Stack pins** (installed and verified together): Vite 8.3.4 · React 19.3.0 · `@tanstack/react-start` 1.169.1 ·
`@tanstack/react-router` 1.170.44 · `@tanstack/router-plugin` 1.168.45 (pulled in by Start) ·
Bootstrap 5.3 (CSS only, dark mode via `data-bs-theme="dark"`) · Sass 1.105 · lucide-react · TypeScript 5.9.

**Scripts**: `npm run dev` (Vite dev server on `0.0.0.0:5173`) · `npm run build` · `npm run preview` ·
`npm run typecheck` · `npm run smoke`.

**Route tree**: `src/routeTree.gen.ts` is owned by the TanStack Start plugin — it is written on dev-server start
and whenever routes are added/removed, including a type-only footer that registers the router with Start
(`declare module '@tanstack/react-start'`). Never run the standalone router CLI (`tsr generate`) here: it emits the
file **without that footer**, so the plugin then rewrites the file and every reload churns the module graph.
Never hand-edit the file either.

**`vite.config.ts` requirements**
1. `tanstackStart()` must be declared **before** `@vitejs/plugin-react` — the router plugin asserts this order in
   `configResolved` and throws at startup otherwise.
2. `server.allowedHosts: true` + `server.hmr.clientPort = 443 / protocol "wss"` — the sandbox serves the dev
   server through a per-session `*.e2b.app` preview host; without it Vite returns 403 "Blocked request".

**Route-file rule (dev-server bug workaround — read before adding a route)**

`vite.config.ts` passes `autoCodeSplitting: false` to `tanstackRouter()`, and no route module may contain the
literal `createFileRoute(` / `createRootRoute(` text. Both are required for the dev server to work:

- `tanstackStart()` already registers its own env-scoped router code splitters (client + server).
- The router plugin's splitter matches a route file with the regex `/\bcreateFileRoute\s*\(/` and re-emits its
  Vite HMR scaffolding (a module-scope `const hot = import.meta.hot`). Under Vite 8 that transform runs twice on
  the module, so the second pass collides with the first pass's declaration: the dev server answers
  **`500 Duplicate declaration "hot"`** for `/src/routes/*.tsx`. The stylesheet and the page chunk then never
  load in the browser — the shipped HTML looks fine (curl returns 200) but the client bundle is dead.

Fix applied in this repo:

1. Route files import the factory under a local name — `import { createFileRoute as routeFactory }` /
   `createRootRoute as rootFactory` — so the splitter's code filter no longer matches them
   (`src/routes/index.tsx`, `src/routes/home.tsx`, `src/routes/__root.tsx`). The route id/path still come from the
   file name through `routeTree.gen.ts`; nothing else changes.
2. Page components stay **static imports** referenced directly by the route factory call
   (`component: LandingPage`). `lazyRouteComponent(() => import("..."))` was tried and reverted: the dev SSR
   stream does not await the lazily imported chunk and served a ~3 kB skeleton instead of the rendered page.
   The landing chunk therefore ships inside the entry bundle (`dist/client/assets/index-*.js`); the page-scoped
   CSS still loads through its own route import.
Consequence: route files fall back to a full page reload for HMR (they no longer take part in the router's
route-level hot accept). Edit-and-reload still works; dev server restarts are not needed.

**Page-scoped CSS**: a page's `src/styles/pages/*.scss` is imported only by its own route module; the rules are
nested under the page root class (§12 mapping). Shell chrome (`.dx-nav*`, `.dx-footer*`, `.dx-app-shell`,
`.dx-auth-shell`) lives in `global.scss`; both `global.scss` and page sheets `@use "./tokens"`.

**Live-widget robustness contract (shared primitives)**

- `useInView(once?, fallbackMs = 1600)` — Reveal/CountUp must **never** leave content hidden. If
  `IntersectionObserver` is missing, throws, or never reports (clipped or zero-height containers, a scaled
  preview iframe, reduced-motion browsers), the fallback timer flips the flag. Sections always become visible.
- `CountUp` — renders the **final value in SSR and on the first paint** and rolls up from 0 only once it is
  scrolled into view on the client. Never render `0` for a stat the server can compute (`0 ms`, `0 traders`
  in the HTML source is treated as a bug), and never let the animation be the only path to the real number.
- Live simulators in `src/lib/live.ts` seed from static data so SSR markup and hydration agree; they only start
  changing state after mount (never in a render body).

**In-repo smoke harness** (`npm run smoke`, needs the dev server running)

`tools/smoke/` builds `entry.tsx` with plain Vite, hydrates the landing page into a jsdom document pre-filled
with the SSR markup, compares the SSR markup with the first client paint (hydration check), drives every primary
control, then fuzzes each overlay (up to 14 inner controls per overlay). It fails the run on any console error,
uncaught error, thrown click handler or missing control. Output: `tools/smoke/out/` (git-ignored).

**Verification protocol used for H-1** (repeat after every page):
`npm run typecheck && npm run build` → curl the dev server for `/` and `/home`
(expect 200 + hero copy, and **no `0` in place of a stat value**) → `npm run smoke` (expect 0 console errors and
0 click errors) → grep the source for `lorem|TODO|coming soon|console.log` → grep `.tsx` for raw
hex/rgb values → confirm every `<Link to>` exists in `routeTree.gen.ts` → confirm every `dx-*` class used in a
component exists in `src/styles/**.scss`.
