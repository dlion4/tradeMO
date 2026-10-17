// =============================================================================
// FeatureSections.tsx — H-2 body sections (blueprint order):
// 1 Bot Engine · 2 Script Engine · 3 Social Trading · 4 Automation ·
// 5 Market Coverage · Comparison table. Every table is sortable, searchable,
// filterable and paginated; every row opens a drawer/dialog via the controller.
// =============================================================================
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bell,
  Bot as BotIcon,
  CalendarClock,
  Code2,
  Gauge,
  Play,
  Rocket,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import {
  Avatar,
  Chip,
  Dropdown,
  FilterChips,
  PriceFlash,
  Reveal,
  SearchInput,
  SectionHead,
  Sparkline,
  Tabs,
  Toggle,
} from "../../ui/primitives";
import { DataTable, useDataTable, type Column } from "../../ui/data-table";
import { BarSeries, LineChart } from "../../ui/charts";
import {
  ACTIVITY_FEED,
  AUTOMATION_RULES,
  BOTS,
  COMPARISON_ROWS,
  SCRIPTS,
  SCRIPT_TEMPLATES,
  TRADERS,
  equityCurve,
  type AutomationRule,
  type Bot,
  type ComparisonRow,
  type Script,
  type ScriptTemplate,
  type Trader,
} from "../../../data/trading";
import {
  CONTRACT_TYPES,
  MARKETS,
  MARKET_SYMBOLS,
  SYMBOL_MAP,
  fmtDur,
  fmtPrice,
  pct,
  pnl,
  timeAgo,
  usd,
  type Symbol,
} from "../../../data/market";
import { useLiveSeries, useTicks } from "../../../lib/live";
import type { FeaturesController } from "./types";
import { ComparisonCellView, botStatusChip, ruleKindLabel } from "./FeaturesDialogs";

// -----------------------------------------------------------------------------
// shared section shell bits
// -----------------------------------------------------------------------------
function BulletRow({ title, text, onClick, cta }: { title: string; text: string; onClick: () => void; cta: string }) {
  return (
    <button type="button" className="dx-list-row w-100 text-start" onClick={onClick}>
      <span className="dx-dot dx-dot-info mt-2" />
      <span className="flex-grow-1 min-w-0">
        <span className="d-block fw-semibold" style={{ fontSize: "0.88rem" }}>{title}</span>
        <span className="dx-help d-block">{text}</span>
      </span>
      <span className="dx-btn-link d-inline-flex align-items-center gap-1">{cta} <ArrowRight size={12} /></span>
    </button>
  );
}

// -----------------------------------------------------------------------------
// 1 · BOT ENGINE
// -----------------------------------------------------------------------------
export function BotEngineSection({
  c,
  bots,
  onToggleBot,
}: {
  c: FeaturesController;
  bots: Bot[];
  onToggleBot: (bot: Bot, next: Bot["status"]) => void;
}) {
  const [period, setPeriod] = useState("30d");
  const table = useDataTable<Bot>({
    rows: bots,
    searchKeys: (b) => [b.name, b.symbol, b.strategy, b.owner, b.loginId, b.status],
    sorters: {
      name: (b) => b.name, symbol: (b) => b.symbol, stake: (b) => b.stake,
      winRate: (b) => b.winRate, pnl: (b) => b.pnl, trades: (b) => b.trades, status: (b) => b.status,
    },
    filterKey: (b) => b.status,
    filterOptions: [
      { id: "running", label: "Running" }, { id: "paused", label: "Paused" },
      { id: "stopped", label: "Stopped" }, { id: "error", label: "Error" },
    ],
    initialPageSize: 5,
    initialSort: "pnl",
  });
  const running = bots.filter((b) => b.status === "running");
  const curve = equityCurve(30, period === "7d" ? 77 : 42, 900, period === "7d" ? 6 : 11);

  const columns: Column<Bot>[] = [
    {
      key: "name", header: "Bot",
      cell: (b) => (
        <span>
          <span className="d-block fw-semibold">{b.name}</span>
          <span className="dx-help d-block">{b.strategy} · {b.owner}</span>
        </span>
      ),
    },
    { key: "symbol", header: "Symbol", cell: (b) => <span className="font-display">{b.symbol}</span> },
    { key: "stake", header: "Stake", align: "end", cell: (b) => <span className="font-display">{usd(b.stake)}</span> },
    { key: "winRate", header: "Win", align: "end", cell: (b) => <span className="font-display">{pct(b.winRate, 1)}</span> },
    { key: "pnl", header: "P&L", align: "end", cell: (b) => <span className={b.pnl >= 0 ? "dx-up" : "dx-down"}>{pnl(b.pnl)}</span> },
    { key: "trades", header: "Trades", align: "end", hideOnMobile: true, cell: (b) => <span className="font-display">{b.trades.toLocaleString("en-US")}</span> },
    { key: "status", header: "Status", cell: (b) => botStatusChip(b.status) },
    {
      header: "Actions",
      cell: (b) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Dropdown
            label={`Actions for ${b.name}`}
            trigger={<span>Manage</span>}
            items={[
              { id: "detail", label: "Open bot detail", hint: "logs + trades", onSelect: () => c.openBotDetail(b) },
              { id: "backtest", label: "Backtest this bot", onSelect: () => c.openBacktests(b.id) },
              { id: "clone", label: "Clone into wizard", onSelect: () => c.openBotWizard(b.id) },
              { type: "divider" },
              b.status === "running"
                ? { id: "pause", label: "Pause bot", onSelect: () => onToggleBot(b, "paused") }
                : { id: "resume", label: "Resume bot", onSelect: () => onToggleBot(b, "running") },
              { id: "stop", label: "Stop bot…", danger: true, onSelect: () => c.openBotDetail(b) },
            ]}
          />
        </span>
      ),
    },
  ];

  return (
    <section className="dx-section" id="features-bot">
      <div className="container">
        <SectionHead
          eyebrow="Feature 01 · Bot Engine"
          title="Pre-built bots, your parameters, every Deriv market"
          lead="Start from one of ten presets or configure from scratch. The worker requests proposals, buys, reconnects and enforces your caps — you watch one auditable log."
          actions={
            <>
              <button type="button" className="dx-btn dx-btn-ghost" onClick={() => c.openBacktests()}>Run a backtest</button>
              <button type="button" className="dx-btn dx-btn-primary" onClick={() => c.openBotWizard()}>
                <Rocket size={14} /> Configure a bot
              </button>
            </>
          }
        />

        <div className="row g-4 align-items-start">
          <div className="col-12 col-lg-5">
            <Reveal>
              <div className="d-grid gap-2">
                <BulletRow title="Pre-built bots" text="Martingale, DCA, fixed-stake, accumulator and digit models — each with a backtest attached." cta="Browse presets" onClick={() => c.openPresets()} />
                <BulletRow title="Custom parameters" text="Stake, duration, recovery step, take-profit and stop-loss per bot, versioned in the audit log." cta="Open wizard" onClick={() => c.openBotWizard()} />
                <BulletRow title="Multi-market" text="Synthetics, forex, crypto, metals and OTC indices on one worker queue per account." cta="See markets" onClick={() => c.scrollTo("#features-markets")} />
                <BulletRow title="Backtesting" text="Two years of tick history with spread, slippage, Sharpe and max-drawdown reporting." cta="Backtest runner" onClick={() => c.openBacktests()} />
              </div>
            </Reveal>
          </div>
          <div className="col-12 col-lg-7">
            <Reveal delay={80}>
              <div className="dx-card dx-card-live">
                <div className="dx-card-head">
                  <div>
                    <h3 className="dx-card-title">Live fleet preview</h3>
                    <p className="dx-card-sub">{running.length} of {bots.length} demo bots running · simulated feed</p>
                  </div>
                  <span className="dx-pulse" aria-label="live" />
                </div>
                <div className="dx-card-body">
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                    <span className="dx-kpi-label mb-0">Fleet equity (demo accounts)</span>
                    <Tabs
                      tabs={[{ id: "7d", label: "7D" }, { id: "30d", label: "30D" }]}
                      active={period}
                      onChange={setPeriod}
                    />
                  </div>
                  <LineChart data={curve} height={150} ariaLabel="Bot fleet equity curve" yFormat={(v) => usd(v, 0)} xLabels={["start", "mid", "now"]} />
                  <div className="dx-list mt-3">
                    {running.slice(0, 3).map((b) => (
                      <button key={b.id} type="button" className="dx-list-row w-100 text-start" onClick={() => c.openBotDetail(b)}>
                        <span className="dx-pulse" aria-hidden="true" />
                        <span className="flex-grow-1 min-w-0">
                          <span className="d-block fw-semibold text-truncate" style={{ fontSize: "0.84rem" }}>{b.name}</span>
                          <span className="dx-help d-block font-display">{b.symbol} · {usd(b.stake)} · {fmtDur(b.duration, b.durationUnit)}</span>
                        </span>
                        <span className={`font-display fw-semibold ${b.pnl >= 0 ? "dx-up" : "dx-down"}`}>{pnl(b.pnl)}</span>
                      </button>
                    ))}
                  </div>
                  <button type="button" className="dx-btn dx-btn-ghost dx-btn-sm mt-3" onClick={() => c.openDemo("bots")}>
                    Open the full console <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </Reveal>
          </div>
        </div>

        <Reveal>
          <div className="dx-card dx-card-flush mt-4">
            <div className="dx-card-head">
              <div>
                <h3 className="dx-card-title">Bot fleet — all demo workers</h3>
                <p className="dx-card-sub">Sort, search and filter. Row opens the detail drawer; Manage holds every action.</p>
              </div>
              <Chip tone="muted"><span className="font-display">{table.total}</span>&nbsp;bots</Chip>
            </div>
            <div className="dx-card-body">
              <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
                <SearchInput value={table.query} onChange={table.setQuery} placeholder="Search bots, symbols, owners…" className="flex-grow-1" />
                <FilterChips options={table.filterOptions} value={table.filter} onChange={table.setFilter} />
              </div>
              <DataTable columns={columns} state={table} rowKey={(b) => b.id} onRowClick={(b) => c.openBotDetail(b)} ariaLabel="Bot fleet" />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// 2 · SCRIPT ENGINE
// -----------------------------------------------------------------------------
export function ScriptEngineSection({ c }: { c: FeaturesController }) {
  const [visualTab, setVisualTab] = useState("editor");
  const featured = SCRIPTS[0];
  const series = useLiveSeries(featured.symbol, 26, 2200);
  const table = useDataTable<Script>({
    rows: SCRIPTS,
    searchKeys: (s) => [s.name, s.symbol, s.language, s.status, s.author, ...s.tags],
    sorters: {
      name: (s) => s.name, symbol: (s) => s.symbol, runs: (s) => s.runs,
      winRate: (s) => s.winRate, pnl: (s) => s.pnl, lines: (s) => s.lines,
    },
    filterKey: (s) => s.status,
    filterOptions: [
      { id: "deployed", label: "Deployed" }, { id: "draft", label: "Draft" },
      { id: "error", label: "Error" }, { id: "archived", label: "Archived" },
    ],
    initialPageSize: 5,
    initialSort: "runs",
  });
  const [templateFilter, setTemplateFilter] = useState("all");
  const templates = SCRIPT_TEMPLATES.filter((t) => templateFilter === "all" || t.difficulty === templateFilter).slice(0, 6);

  const columns: Column<Script>[] = [
    {
      key: "name", header: "Script",
      cell: (s) => (
        <span>
          <span className="d-block fw-semibold">{s.name}</span>
          <span className="dx-help d-block">{s.language} · {s.author} · {s.tags.join(", ")}</span>
        </span>
      ),
    },
    { key: "symbol", header: "Symbol", cell: (s) => <span className="font-display">{s.symbol}</span> },
    { key: "runs", header: "Runs", align: "end", cell: (s) => <span className="font-display">{s.runs.toLocaleString("en-US")}</span> },
    { key: "winRate", header: "Win", align: "end", cell: (s) => <span className="font-display">{pct(s.winRate, 1)}</span> },
    { key: "pnl", header: "P&L", align: "end", cell: (s) => <span className={s.pnl >= 0 ? "dx-up" : "dx-down"}>{pnl(s.pnl)}</span> },
    {
      header: "Status",
      cell: (s) => (
        <Chip tone={s.status === "deployed" ? "up" : s.status === "error" ? "down" : s.status === "draft" ? "warn" : "muted"}>{s.status}</Chip>
      ),
    },
    {
      header: "Actions",
      cell: (s) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Dropdown
            label={`Actions for ${s.name}`}
            trigger={<span>Open</span>}
            items={[
              { id: "studio", label: "Open in script studio", hint: "editor + dry-run", onSelect: () => c.openScriptStudio(s) },
              { id: "backtest", label: "Backtest script", onSelect: () => c.openBacktests(s.id) },
              { id: "template", label: "Browse template library", onSelect: () => c.scrollTo("#features-templates") },
            ]}
          />
        </span>
      ),
    },
  ];

  return (
    <section className="dx-section" id="features-scripts">
      <div className="container">
        <SectionHead
          eyebrow="Feature 02 · Script Engine"
          title="Write JavaScript. We sandbox it, backtest it, run it."
          lead="A VM2-sandboxed runtime with tick and bar subscriptions, indicator helpers and risk assertions. No network, no filesystem — deterministic replay before a cent goes live."
          actions={
            <>
              <button type="button" className="dx-btn dx-btn-ghost" onClick={() => c.openApiDocs()}>API reference</button>
              <button type="button" className="dx-btn dx-btn-primary" onClick={() => c.openScriptStudio(featured)}>
                <Code2 size={14} /> Open script studio
              </button>
            </>
          }
        />

        <div className="row g-4 align-items-start">
          <div className="col-12 col-lg-7 order-2 order-lg-1">
            <Reveal>
              <div className="dx-card">
                <div className="dx-card-head">
                  <div>
                    <h3 className="dx-card-title">{featured.name}</h3>
                    <p className="dx-card-sub">{featured.symbol} · {featured.language} · deployed worker</p>
                  </div>
                  <Chip tone="up" pulse>{featured.status}</Chip>
                </div>
                <div className="dx-card-body">
                  <Tabs
                    tabs={[{ id: "editor", label: "Editor" }, { id: "chart", label: "Live ticks" }, { id: "runs", label: "Runs" }]}
                    active={visualTab}
                    onChange={setVisualTab}
                    className="mb-3"
                  />
                  {visualTab === "editor" ? (
                    <pre className="dx-code dx-scroll-y" style={{ maxHeight: 300 }}><code>{featured.code}</code></pre>
                  ) : null}
                  {visualTab === "chart" ? (
                    <div>
                      <Sparkline data={series} tone="accent" height={120} ariaLabel={`${featured.symbol} live tick series`} />
                      <div className="d-flex justify-content-between mt-2">
                        <span className="dx-help font-display">{featured.symbol} · live simulated ticks</span>
                        <span className="dx-help">last <span className="font-display">{fmtPrice(series[series.length - 1], SYMBOL_MAP[featured.symbol].pipSize)}</span></span>
                      </div>
                    </div>
                  ) : null}
                  {visualTab === "runs" ? (
                    <div className="row g-3">
                      {[
                        { k: "Total runs", v: `${featured.runs.toLocaleString("en-US")}` },
                        { k: "Win rate", v: pct(featured.winRate, 1) },
                        { k: "Net P&L", v: pnl(featured.pnl) },
                        { k: "Lines", v: `${featured.lines}` },
                      ].map((row) => (
                        <div className="col-6" key={row.k}>
                          <div className="dx-card-inset"><div className="dx-kpi-label">{row.k}</div><div className="font-display fw-semibold">{row.v}</div></div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="d-flex flex-wrap gap-2 mt-3">
                    <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => c.openScriptStudio(featured)}>
                      <Play size={13} /> Dry-run in studio
                    </button>
                    <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => c.openBacktests(featured.id)}>Backtest 2 years</button>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
          <div className="col-12 col-lg-5 order-1 order-lg-2">
            <Reveal delay={60}>
              <div className="d-grid gap-2">
                <BulletRow title="Write in JavaScript" text="Tick/bar handlers, SMA, RSI, z-score and digit helpers — a small, honest API surface." cta="API surface" onClick={c.openApiDocs} />
                <BulletRow title="Access tick data" text="Live streams plus two years of recorded ticks for deterministic backtests." cta="Run backtest" onClick={() => c.openBacktests()} />
                <BulletRow title="Sandboxed execution" text="VM2 isolate per script. A runaway loop is killed, never your account." cta="Open studio" onClick={() => c.openScriptStudio(featured)} />
                <BulletRow title="Template library" text="Twelve rated starters — martingale to multiplier — fork one and make it yours." cta="Browse templates" onClick={() => c.scrollTo("#features-templates")} />
              </div>
            </Reveal>
          </div>
        </div>

        <Reveal>
          <div className="dx-card dx-card-flush mt-4">
            <div className="dx-card-head">
              <div>
                <h3 className="dx-card-title">Deployed &amp; draft scripts</h3>
                <p className="dx-card-sub">Row opens the studio with code, dry-run output and run history.</p>
              </div>
              <Chip tone="muted"><span className="font-display">{table.total}</span>&nbsp;scripts</Chip>
            </div>
            <div className="dx-card-body">
              <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
                <SearchInput value={table.query} onChange={table.setQuery} placeholder="Search scripts, symbols, tags…" className="flex-grow-1" />
                <FilterChips options={table.filterOptions} value={table.filter} onChange={table.setFilter} />
              </div>
              <DataTable columns={columns} state={table} rowKey={(s) => s.id} onRowClick={(s) => c.openScriptStudio(s)} ariaLabel="Scripts" />
            </div>
          </div>
        </Reveal>

        <div id="features-templates" className="mt-4">
          <Reveal>
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
              <h3 className="dx-h-card mb-0">Template library — fork a rated starter</h3>
              <FilterChips
                options={[{ id: "beginner", label: "Beginner" }, { id: "intermediate", label: "Intermediate" }, { id: "advanced", label: "Advanced" }]}
                value={templateFilter}
                onChange={setTemplateFilter}
              />
            </div>
          </Reveal>
          <div className="row g-4 row-cols-1 row-cols-sm-2 row-cols-lg-3">
            {templates.map((t, i) => (
              <div className="col" key={t.id}>
                <Reveal delay={i * 60}>
                  <article className="dx-card dx-card-pad d-flex flex-column h-100">
                    <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                      <Chip tone="muted">{t.category}</Chip>
                      <span className="dx-help font-display">{t.rating} / 5 · {t.uses.toLocaleString("en-US")} uses</span>
                    </div>
                    <h4 className="dx-h-card">{t.name}</h4>
                    <p className="dx-help mt-2 flex-grow-1">{t.description}</p>
                    <div className="dx-help font-display mb-3">{t.symbol} · {t.difficulty} · {t.lines} lines</div>
                    <div className="d-flex gap-2 mt-auto">
                      <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost flex-grow-1" onClick={() => c.openTemplate(t)}>Preview</button>
                      <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => c.openScriptStudio(undefined, t)}>Use template</button>
                    </div>
                  </article>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// 3 · SOCIAL TRADING
// -----------------------------------------------------------------------------
export function SocialSection({ c }: { c: FeaturesController }) {
  const [period, setPeriod] = useState("month");
  const [chartTraderId, setChartTraderId] = useState(TRADERS[0].id);
  const [feedFilter, setFeedFilter] = useState("all");
  const factor = period === "week" ? 0.24 : period === "all" ? 1 : 1;
  const rows = useMemo(
    () =>
      TRADERS.map((t) => ({
        ...t,
        periodPnl: period === "all" ? t.pnlAllTime : Math.round(t.pnl30d * factor * 100) / 100,
      })),
    [period, factor],
  );
  type Row = (typeof rows)[number];
  const table = useDataTable<Row>({
    rows,
    searchKeys: (t) => [t.displayName, t.country, t.strategy, t.favouriteSymbol, t.loginId],
    sorters: {
      rank: (t) => t.rank, name: (t) => t.displayName, winRate: (t) => t.winRate,
      pnl: (t) => t.periodPnl, copies: (t) => t.copies, trades: (t) => t.trades30d,
    },
    filterKey: (t) => t.strategy,
    filterOptions: [
      { id: "dca", label: "DCA" }, { id: "digit", label: "Digits" }, { id: "scalping", label: "Scalping" },
      { id: "swing", label: "Swing" }, { id: "martingale", label: "Martingale" }, { id: "accumulator", label: "Accumulator" }, { id: "fixed", label: "Fixed" },
    ],
    initialPageSize: 5,
    initialSort: "rank",
    initialDir: "asc",
  });
  const chartTrader = TRADERS.find((t) => t.id === chartTraderId) ?? TRADERS[0];
  const feed = ACTIVITY_FEED.filter((a) => feedFilter === "all" || a.tone === feedFilter);

  const columns: Column<Row>[] = [
    { key: "rank", header: "#", align: "end", cell: (t) => <span className="font-display">{t.rank}</span> },
    {
      key: "name", header: "Trader",
      cell: (t) => (
        <span className="d-flex align-items-center gap-2">
          <Avatar name={t.displayName} tone="teal" />
          <span>
            <span className="d-block fw-semibold">{t.flag} {t.displayName}</span>
            <span className="dx-help d-block font-display">{t.loginId} · {t.country}</span>
          </span>
        </span>
      ),
    },
    { header: "Strategy", cell: (t) => <Chip tone="muted">{t.strategy}</Chip> },
    { key: "winRate", header: "Win", align: "end", cell: (t) => <span className="font-display">{pct(t.winRate, 1)}</span> },
    { key: "pnl", header: `P&L (${period})`, align: "end", cell: (t) => <span className={t.periodPnl >= 0 ? "dx-up" : "dx-down"}>{pnl(t.periodPnl)}</span> },
    { key: "copies", header: "Copiers", align: "end", hideOnMobile: true, cell: (t) => <span className="font-display">{t.copies}</span> },
    { header: "Risk", cell: (t) => <span className={`dx-risk-${t.risk === "medium" ? "med" : t.risk}`}>{t.risk}</span> },
    {
      header: "Actions",
      cell: (t) => (
        <span className="d-flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => c.openTrader(t)}>Profile</button>
          <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => c.openCopy(t)}>Copy</button>
        </span>
      ),
    },
  ];

  return (
    <section className="dx-section" id="features-social">
      <div className="container">
        <SectionHead
          eyebrow="Feature 03 · Social Trading"
          title="Follow traders. Copy what works. Keep the kill switch."
          lead="Verified statements, per-trader risk profiles and copy trading at your own stake ratio — with a hard loss cap and an independent close-all switch."
          actions={
            <>
              <button type="button" className="dx-btn dx-btn-ghost" onClick={() => c.openCommunity()}>Community channels</button>
              <button type="button" className="dx-btn dx-btn-primary" onClick={c.openLeaderboard}>
                <Users size={14} /> Full leaderboard
              </button>
            </>
          }
        />

        <div className="row g-4 align-items-start">
          <div className="col-12 col-lg-8">
            <Reveal>
              <div className="dx-card dx-card-flush">
                <div className="dx-card-head">
                  <div>
                    <h3 className="dx-card-title">Verified leaderboard</h3>
                    <p className="dx-card-sub">Statements reconciled against Deriv — never screenshots.</p>
                  </div>
                  <Tabs tabs={[{ id: "week", label: "7D" }, { id: "month", label: "30D" }, { id: "all", label: "All time" }]} active={period} onChange={setPeriod} />
                </div>
                <div className="dx-card-body">
                  <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
                    <SearchInput value={table.query} onChange={table.setQuery} placeholder="Search traders, countries, symbols…" className="flex-grow-1" />
                    <FilterChips options={table.filterOptions} value={table.filter} onChange={table.setFilter} />
                  </div>
                  <DataTable columns={columns} state={table} rowKey={(t) => t.id} onRowClick={(t) => c.openTrader(t)} ariaLabel="Leaderboard" />
                </div>
              </div>
            </Reveal>
          </div>

          <div className="col-12 col-lg-4 d-grid gap-4">
            <Reveal delay={60}>
              <div className="dx-card dx-card-pad">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                  <span className="dx-kpi-label mb-0">Performance chart</span>
                  <Dropdown
                    label="Chart trader"
                    trigger={<span>{chartTrader.displayName}</span>}
                    items={TRADERS.slice(0, 6).map((t) => ({
                      id: t.id, label: `${t.flag} ${t.displayName}`, hint: pnl(t.pnl30d), active: t.id === chartTraderId,
                      onSelect: () => setChartTraderId(t.id),
                    }))}
                  />
                </div>
                <LineChart data={equityCurve(28, chartTrader.rank * 977 + 13, 1200, 14 - chartTrader.rank)} height={140} ariaLabel={`${chartTrader.displayName} equity curve`} yFormat={(v) => usd(v, 0)} />
                <div className="dx-help mt-2">
                  {chartTrader.flag} {chartTrader.displayName} · {chartTrader.strategy} on <span className="font-display">{chartTrader.favouriteSymbol}</span> ·{" "}
                  <button type="button" className="dx-btn-link" onClick={() => c.openTrader(chartTrader)}>full profile</button>
                </div>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <div className="dx-card dx-card-pad">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                  <h3 className="dx-h-card mb-0">Activity feed</h3>
                  <FilterChips
                    options={[{ id: "up", label: "Wins" }, { id: "warn", label: "Risk" }, { id: "info", label: "Info" }]}
                    value={feedFilter}
                    onChange={setFeedFilter}
                  />
                </div>
                <div className="dx-list">
                  {feed.slice(0, 6).map((a) => (
                    <button key={a.id} type="button" className="dx-list-row w-100 text-start" onClick={() => c.openCommunity()}>
                      <span className={`dx-dot ${a.tone === "up" ? "dx-dot-up" : a.tone === "warn" ? "dx-dot-warn" : "dx-dot-info"}`} />
                      <span className="flex-grow-1 min-w-0">
                        <span className="d-block" style={{ fontSize: "0.82rem" }}><strong>{a.actor}</strong> {a.action} <span className="font-display">{a.target}</span></span>
                        <span className="dx-help d-block">{timeAgo(a.epoch)}</span>
                      </span>
                    </button>
                  ))}
                </div>
                <button type="button" className="dx-btn dx-btn-ghost dx-btn-sm mt-3" onClick={() => c.openCommunity()}>
                  Open community <ArrowRight size={13} />
                </button>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// 4 · AUTOMATION
// -----------------------------------------------------------------------------
export function AutomationSection({
  c,
  rules,
  onToggleRule,
}: {
  c: FeaturesController;
  rules: AutomationRule[];
  onToggleRule: (rule: AutomationRule) => void;
}) {
  const table = useDataTable<AutomationRule>({
    rows: rules,
    searchKeys: (r) => [r.name, r.kind, r.botName, r.symbol, r.trigger, r.action],
    sorters: {
      name: (r) => r.name, kind: (r) => r.kind, fires: (r) => r.fires30d, status: (r) => r.status,
    },
    filterKey: (r) => r.kind,
    filterOptions: [
      { id: "schedule", label: "Schedules" }, { id: "trigger", label: "Triggers" },
      { id: "risk", label: "Risk guards" }, { id: "notification", label: "Notifications" },
    ],
    initialPageSize: 5,
    initialSort: "fires",
  });

  const columns: Column<AutomationRule>[] = [
    {
      key: "name", header: "Rule",
      cell: (r) => (
        <span>
          <span className="d-block fw-semibold">{r.name}</span>
          <span className="dx-help d-block">{r.botName}</span>
        </span>
      ),
    },
    { key: "kind", header: "Type", cell: (r) => <Chip tone={r.kind === "risk" ? "warn" : r.kind === "notification" ? "info" : "accent"}>{ruleKindLabel(r.kind)}</Chip> },
    { header: "Trigger", cell: (r) => <span className="font-display" style={{ fontSize: "0.8rem" }}>{r.trigger}</span> },
    { key: "fires", header: "Fires 30d", align: "end", cell: (r) => <span className="font-display">{r.fires30d}</span> },
    { header: "Last fired", cell: (r) => <span className="dx-help">{timeAgo(r.lastFiredAt)}</span> },
    {
      header: "On",
      cell: (r) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Toggle checked={r.status === "enabled"} onChange={() => onToggleRule(r)} label={r.status === "enabled" ? "On" : "Off"} />
        </span>
      ),
    },
    {
      header: "Actions",
      cell: (r) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Dropdown
            label={`Actions for ${r.name}`}
            trigger={<span>Manage</span>}
            items={[
              { id: "detail", label: "Rule detail + history", onSelect: () => c.openRuleDetail(r) },
              { id: "edit", label: "Edit in wizard", onSelect: () => c.openRuleWizard(r.kind, r) },
              { id: "toggle", label: r.status === "enabled" ? "Pause rule" : "Enable rule", onSelect: () => onToggleRule(r) },
            ]}
          />
        </span>
      ),
    },
  ];

  const cards = [
    { icon: <CalendarClock size={16} />, title: "Scheduled bots", metric: `${rules.filter((r) => r.kind === "schedule").length} schedules`, text: "Session arms, weekly recalibrations, daily DCA legs.", cta: "New schedule", onClick: () => c.openRuleWizard("schedule") },
    { icon: <Zap size={16} />, title: "Conditional triggers", metric: `${rules.filter((r) => r.kind === "trigger").length} triggers`, text: "Range breaks, streaks, basket targets, release blackouts.", cta: "New trigger", onClick: () => c.openRuleWizard("trigger") },
    { icon: <ShieldCheck size={16} />, title: "Risk management", metric: `${rules.filter((r) => r.kind === "risk").length} guards`, text: "Exposure caps, drawdown breakers, reconnect safety.", cta: "Risk policy", onClick: c.openRiskPolicy },
    { icon: <Bell size={16} />, title: "Notification rules", metric: `${rules.filter((r) => r.kind === "notification").length} alerts`, text: "One alert per event — pauses, margin, statements.", cta: "Alert rules", onClick: c.openAlertRules },
  ];

  return (
    <section className="dx-section" id="features-automation">
      <div className="container">
        <SectionHead
          eyebrow="Feature 04 · Automation"
          title="Schedules, triggers and brakes that run while you sleep"
          lead="Rules evaluate inside the engine on every tick — trigger first, conditions second, risk caps last. A failed cap always wins."
          actions={
            <button type="button" className="dx-btn dx-btn-primary" onClick={() => c.openRuleWizard()}>
              <Zap size={14} /> New automation rule
            </button>
          }
        />

        <div className="row g-4 row-cols-1 row-cols-sm-2 row-cols-lg-4">
          {cards.map((card, i) => (
            <div className="col" key={card.title}>
              <Reveal delay={i * 60}>
                <article className="dx-card dx-card-pad d-flex flex-column h-100">
                  <span className="dx-empty-ico mb-3" style={{ width: 40, height: 40 }}>{card.icon}</span>
                  <h3 className="dx-h-card">{card.title}</h3>
                  <div className="dx-kpi-value mt-2" style={{ fontSize: "1.3rem" }}>{card.metric}</div>
                  <p className="dx-help mt-2 flex-grow-1">{card.text}</p>
                  <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost mt-2 align-self-start" onClick={card.onClick}>
                    {card.cta} <ArrowRight size={13} />
                  </button>
                </article>
              </Reveal>
            </div>
          ))}
        </div>

        <Reveal>
          <div className="dx-card dx-card-flush mt-4">
            <div className="dx-card-head">
              <div>
                <h3 className="dx-card-title">Automation rules — live register</h3>
                <p className="dx-card-sub">Toggle in place, edit in the wizard, or open the drawer for fire history.</p>
              </div>
              <Chip tone="accent"><span className="font-display">{rules.filter((r) => r.status === "enabled").length}</span>&nbsp;enabled</Chip>
            </div>
            <div className="dx-card-body">
              <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
                <SearchInput value={table.query} onChange={table.setQuery} placeholder="Search rules, bots, triggers…" className="flex-grow-1" />
                <FilterChips options={table.filterOptions} value={table.filter} onChange={table.setFilter} />
              </div>
              <DataTable columns={columns} state={table} rowKey={(r) => r.id} onRowClick={(r) => c.openRuleDetail(r)} ariaLabel="Automation rules" />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// 5 · MARKET COVERAGE
// -----------------------------------------------------------------------------
interface MarketRow extends Symbol {
  live: number;
  dir: "up" | "down" | "flat";
  change: number;
}

export function FeaturesMarketsSection({ c }: { c: FeaturesController }) {
  const [openOnly, setOpenOnly] = useState(false);
  const [contractFilter, setContractFilter] = useState("all");
  const codes = useMemo(() => MARKET_SYMBOLS.map((s) => s.code), []);
  const quotes = useTicks(codes, 1800);
  const rows: MarketRow[] = MARKET_SYMBOLS.map((s) => {
    const q = quotes[s.code];
    const live = q?.quote ?? s.basePrice;
    return { ...s, live, dir: q?.dir ?? "flat", change: ((live - s.basePrice) / s.basePrice) * 100 };
  });
  const visible = openOnly ? rows.filter((r) => r.open) : rows;

  const table = useDataTable<MarketRow>({
    rows: visible,
    searchKeys: (r) => [r.code, r.name, r.short, r.market],
    sorters: {
      code: (r) => r.code, live: (r) => r.live, payout: (r) => r.payoutPct,
      change: (r) => r.change, popularity: (r) => r.popularity, spread: (r) => r.spread,
    },
    filterKey: (r) => r.market,
    filterOptions: MARKETS.map((m) => ({ id: m.id, label: m.label })),
    initialPageSize: 10,
    initialSort: "popularity",
  });

  const columns: Column<MarketRow>[] = [
    {
      key: "code", header: "Symbol",
      cell: (r) => (
        <span>
          <span className="d-block fw-semibold font-display">{r.code}</span>
          <span className="dx-help d-block">{r.name}</span>
        </span>
      ),
    },
    { header: "Market", cell: (r) => <Chip tone="muted">{r.market}</Chip> },
    {
      key: "live", header: "Live price", align: "end",
      cell: (r) => <PriceFlash value={fmtPrice(r.live, r.pipSize)} dir={r.dir} />,
    },
    {
      key: "change", header: "Session", align: "end",
      cell: (r) => <span className={r.change >= 0 ? "dx-up" : "dx-down"}>{pct(r.change, 2, true)}</span>,
    },
    { key: "payout", header: "Payout", align: "end", cell: (r) => <span className="font-display">{pct(r.payoutPct, 1)}</span> },
    { key: "spread", header: "Spread", align: "end", hideOnMobile: true, cell: (r) => <span className="font-display">{r.spread}</span> },
    { header: "Status", cell: (r) => (r.open ? <Chip tone="up" pulse>open</Chip> : <Chip tone="muted">closed</Chip>) },
    {
      header: "Actions",
      cell: (r) => (
        <span className="d-flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => c.openInstrument(r.code)}>Detail</button>
          <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => c.openDemo("trade")}>Trade</button>
        </span>
      ),
    },
  ];

  const contractRows = CONTRACT_TYPES.filter((ct) => contractFilter === "all" || ct.markets.includes(contractFilter as never));

  return (
    <section className="dx-section" id="features-markets">
      <div className="container">
        <SectionHead
          eyebrow="Feature 05 · Market Coverage"
          title="Every Deriv market. Real-time pricing, 24/7 synthetics."
          lead="Twenty instruments across synthetics, forex, crypto, commodities and OTC indices — the full active_symbols catalogue, streaming through one relay."
          actions={
            <>
              <button type="button" className="dx-btn dx-btn-ghost" onClick={c.openStatus}>Stream health</button>
              <button type="button" className="dx-btn dx-btn-primary" onClick={() => c.openDemo("trade")}>Open trade console</button>
            </>
          }
        />

        <Reveal>
          <div className="dx-card dx-card-flush">
            <div className="dx-card-head">
              <div>
                <h3 className="dx-card-title">Instrument catalogue — live</h3>
                <p className="dx-card-sub">Prices flash on every simulated tick. Row opens the instrument drawer.</p>
              </div>
              <span className="d-inline-flex align-items-center gap-2">
                <span className="dx-pulse" aria-label="live" />
                <Toggle checked={openOnly} onChange={setOpenOnly} label="Open only" />
              </span>
            </div>
            <div className="dx-card-body">
              <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
                <SearchInput value={table.query} onChange={table.setQuery} placeholder="Search R_100, EUR/USD, Gold…" className="flex-grow-1" />
                <FilterChips options={table.filterOptions} value={table.filter} onChange={table.setFilter} />
              </div>
              <DataTable columns={columns} state={table} rowKey={(r) => r.code} onRowClick={(r) => c.openInstrument(r.code)} ariaLabel="Market coverage" />
            </div>
          </div>
        </Reveal>

        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mt-4 mb-3">
          <h3 className="dx-h-card mb-0">Contract types — tap any card for barriers &amp; durations</h3>
          <FilterChips
            options={MARKETS.map((m) => ({ id: m.id, label: m.label }))}
            value={contractFilter}
            onChange={setContractFilter}
          />
        </div>
        <div className="row g-4 row-cols-1 row-cols-sm-2 row-cols-lg-3">
          {contractRows.map((ct, i) => (
            <div className="col" key={ct.id}>
              <Reveal delay={i * 40}>
                <button type="button" className="dx-card dx-card-pad dx-card-interactive w-100 text-start d-flex flex-column h-100" onClick={() => c.openContract(ct.id)}>
                  <span className="d-flex align-items-center justify-content-between gap-2">
                    <span className="fw-semibold">{ct.label}</span>
                    <Chip tone="accent">{pct(ct.payoutHigh, 0)} max</Chip>
                  </span>
                  <span className="dx-help mt-2 flex-grow-1">{ct.blurb}</span>
                  <span className="dx-help font-display mt-2">{ct.barrier} · {ct.minDuration}–{ct.maxDuration} {ct.units[0]}</span>
                </button>
              </Reveal>
            </div>
          ))}
        </div>

        <Reveal>
          <div className="dx-card dx-card-pad mt-4">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <div className="dx-kpi-label">Weekly contract volume by type (demo fleet)</div>
                <div className="dx-help">Rise/Fall still dominates tick strategies; accumulators are the fastest-growing type.</div>
              </div>
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => c.openDemo("analytics")}>Open analytics</button>
            </div>
            <BarSeries
              data={[4820, 2140, 860, 1320, 640, 420]}
              labels={["Rise/Fall", "Digits", "Touch", "Accumulator", "Multiplier", "Higher/Lower"]}
              height={150}
              positiveOnly
              format={(v) => v.toLocaleString("en-US")}
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// COMPARISON TABLE
// -----------------------------------------------------------------------------
export function ComparisonSection({ c }: { c: FeaturesController }) {
  const table = useDataTable<ComparisonRow>({
    rows: COMPARISON_ROWS,
    searchKeys: (r) => [r.feature, r.category, r.note],
    sorters: { feature: (r) => r.feature, category: (r) => r.category },
    filterKey: (r) => r.category,
    filterOptions: ["Automation", "Scripting", "Markets", "Risk", "Social", "Pricing"].map((x) => ({ id: x, label: x })),
    initialPageSize: 10,
    initialSort: "feature",
    initialDir: "asc",
  });

  const columns: Column<ComparisonRow>[] = [
    {
      key: "feature", header: "Capability",
      cell: (r) => (
        <span>
          <span className="d-block fw-semibold">{r.feature}</span>
          <span className="dx-help d-block">{r.note}</span>
        </span>
      ),
    },
    { key: "category", header: "Area", cell: (r) => <Chip tone="muted">{r.category}</Chip> },
    { header: "DerivX", cell: (r) => <span className="dx-compare-highlight"><ComparisonCellView value={r.derivx} /></span> },
    { header: "Deriv Native", cell: (r) => <ComparisonCellView value={r.deriv} /> },
    { header: "BMX Bot", cell: (r) => <ComparisonCellView value={r.bmx} /> },
    { header: "Other bots", cell: (r) => <ComparisonCellView value={r.other} /> },
  ];

  return (
    <section className="dx-section" id="features-compare">
      <div className="container">
        <SectionHead
          eyebrow="Head to head"
          title="DerivX vs Deriv Native vs BMX Bot vs the rest"
          lead="Fourteen capabilities, honestly scored — including the two where Deriv native matches us (it is Deriv's market, after all). Tap any row for the full note."
          actions={
            <>
              <button type="button" className="dx-btn dx-btn-ghost" onClick={() => c.openPricing()}>See DerivX plans</button>
              <button type="button" className="dx-btn dx-btn-primary" onClick={c.openOAuth}>
                <BotIcon size={14} /> Try it on your account
              </button>
            </>
          }
        />
        <Reveal>
          <div className="dx-card dx-card-flush">
            <div className="dx-card-head">
              <div>
                <h3 className="dx-card-title">Capability matrix</h3>
                <p className="dx-card-sub">The DerivX column is highlighted. Partial means the capability exists with material limits.</p>
              </div>
              <Chip tone="up"><Gauge size={12} /> {COMPARISON_ROWS.filter((r) => r.derivx === "yes" || (r.derivx !== "no" && r.derivx !== "partial")).length} full DerivX wins</Chip>
            </div>
            <div className="dx-card-body">
              <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
                <SearchInput value={table.query} onChange={table.setQuery} placeholder="Search capabilities…" className="flex-grow-1" />
                <FilterChips options={table.filterOptions} value={table.filter} onChange={table.setFilter} />
              </div>
              <DataTable columns={columns} state={table} rowKey={(r) => r.id} onRowClick={(r) => c.openComparison(r)} ariaLabel="Platform comparison" />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
export type { AutomationRule, Bot };
