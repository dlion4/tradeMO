// =============================================================================
// SocialModals.tsx — H-1 overlay pack: leaderboard table, trader profile drawer,
// instrument drawer, API status drawer and the reusable copy-trade wizard.
// =============================================================================
import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Bookmark,
  Copy,
  ExternalLink,
  LineChart as LineChartIcon,
  Repeat,
  ShieldAlert,
  Star,
  Users,
} from "lucide-react";
import {
  Alert,
  Avatar,
  Chip,
  CopyButton,
  Dialog,
  Drawer,
  Field,
  FilterChips,
  Meter,
  MiniTabs,
  Progress,
  Reveal,
  SearchInput,
  Sparkline,
  Stepper,
  Tabs,
  Toggle,
  useInterval,
} from "../../ui/primitives";
import { Column, DataTable, useDataTable } from "../../ui/data-table";
import { BarSeries, DonutStat, LineChart } from "../../ui/charts";
import {
  API_ENDPOINTS,
  BACKTESTS,
  BOTS,
  DERIV_ACCOUNTS,
  STRATEGY_PRESETS,
  TRADERS,
  TRADES,
  equityCurve,
  type ApiEndpoint,
  type Trader,
} from "../../../data/trading";
import {
  CONTRACT_TYPE_MAP,
  MARKET_SYMBOLS,
  SYMBOL_MAP,
  fmtDur,
  fmtPrice,
  mulberry32,
  nextTick,
  pct,
  pnl,
  usd,
  type Symbol,
} from "../../../data/market";

// -----------------------------------------------------------------------------
// Reusable: copy-trade setup wizard (used by leaderboard + console social tab)
// -----------------------------------------------------------------------------
export function CopySetupWizard({
  open,
  onClose,
  trader,
  onCopied,
}: {
  open: boolean;
  onClose: () => void;
  trader: Trader | null;
  onCopied: (traderId: string, ratio: number, cap: number) => void;
}) {
  const [step, setStep] = useState(0);
  const [ratio, setRatio] = useState(0.5);
  const [cap, setCap] = useState(250);
  const [maxLegs, setMaxLegs] = useState(4);
  const [mirrorStops, setMirrorStops] = useState(true);
  const [confirmLoss, setConfirmLoss] = useState(false);
  const [closing, setClosing] = useState(false);

  const steps = [
    { id: "size", label: "Size" },
    { id: "risk", label: "Risk caps" },
    { id: "review", label: "Review" },
  ];

  if (!trader) return null;

  const projected = Math.round(trader.pnl30d * ratio * 100) / 100;
  const worstCase = Math.round(cap * -1 * 100) / 100;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={`Copy ${trader.displayName}`}
      subtitle={`${trader.flag} ${trader.country} · ${trader.strategy} · ${pct(trader.winRate, 1)} win rate over ${trader.trades30d} trades`}
      footer={
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 w-100">
          <Stepper steps={steps} active={step} />
          <div className="d-flex gap-2">
            {step > 0 ? (
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setStep((s) => s - 1)}>
                Back
              </button>
            ) : null}
            {step < steps.length - 1 ? (
              <button
                type="button"
                className="dx-btn dx-btn-sm dx-btn-primary"
                onClick={() => setStep((s) => s + 1)}
                disabled={step === 1 && !confirmLoss}
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                className="dx-btn dx-btn-sm dx-btn-primary"
                onClick={() => {
                  if (closing) return;
                  setClosing(true);
                  window.setTimeout(() => {
                    setClosing(false);
                    onCopied(trader.id, ratio, cap);
                    onClose();
                  }, 1200);
                }}
                disabled={closing}
              >
                {closing ? (
                  <>
                    <span className="dx-spin">
                      <Repeat size={13} />
                    </span>{" "}
                    Linking worker…
                  </>
                ) : (
                  "Start copying"
                )}
              </button>
            )}
          </div>
        </div>
      }
    >
      {step === 0 ? (
        <div className="d-grid gap-4">
          <Alert tone="info" title="How mirroring works">
            Copy trading replays the trader's <em>contract requests</em> on your own account at your chosen stake ratio. Entries
            execute at Deriv's price for your connection, so small slippage is possible on fast tick contracts.
          </Alert>
          <Field label="Stake ratio" help={`Their $1 leg becomes your $${ratio.toFixed(2)} leg.`}>
            <div className="d-flex align-items-center gap-3">
              <input
                type="range"
                min={0.1}
                max={2}
                step={0.1}
                value={ratio}
                onChange={(e) => setRatio(Number(e.target.value))}
                className="dx-range"
                aria-label="Stake ratio"
              />
              <span className="font-display fw-semibold">{ratio.toFixed(2)}x</span>
            </div>
          </Field>
          <div className="dx-quick-btns">
            {[0.25, 0.5, 1, 2].map((r) => (
              <button key={r} type="button" className={`dx-filter-chip ${ratio === r ? "is-active" : ""}`} onClick={() => setRatio(r)}>
                {r}x
              </button>
            ))}
          </div>
          <div className="row g-3">
            <div className="col-6">
              <div className="dx-card-inset">
                <div className="dx-kpi-label">Projected 30-day P&amp;L</div>
                <div className={`font-display fw-semibold ${projected >= 0 ? "dx-up" : "dx-down"}`}>{pnl(projected)}</div>
                <div className="dx-help">scaled from {pnl(trader.pnl30d)}</div>
              </div>
            </div>
            <div className="col-6">
              <div className="dx-card-inset">
                <div className="dx-kpi-label">Their typical duration</div>
                <div className="font-display fw-semibold">{trader.avgDuration}</div>
                <div className="dx-help">on {trader.favouriteSymbol}</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="d-grid gap-4">
          <div className="row g-3">
            <div className="col-12 col-sm-6">
              <Field label="Hard loss cap (USD)" help="Worker halts and unfollows when realised loss reaches this value.">
                <input
                  className="dx-input dx-input-num"
                  type="number"
                  min={20}
                  max={5000}
                  value={cap}
                  onChange={(e) => setCap(Math.max(20, Number(e.target.value)))}
                />
              </Field>
            </div>
            <div className="col-12 col-sm-6">
              <Field label="Max concurrent legs" help="Mirrored copies never exceed this many open contracts.">
                <select className="dx-select dx-input-num" value={maxLegs} onChange={(e) => setMaxLegs(Number(e.target.value))}>
                  {[1, 2, 3, 4, 6, 8].map((n) => (
                    <option key={n} value={n}>
                      {n} legs
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
          <Toggle checked={mirrorStops} onChange={setMirrorStops} label="Mirror their stop-outs" hint="Close my leg when the trader closes theirs, before its own expiry." />
          <Alert tone="warn" title="Worst case at these settings">
            A full loss cap of <strong className="font-display">{usd(cap)}</strong> is possible if the trader enters a losing sequence
            before their own stop triggers. Nothing here is guaranteed — set a cap you can absorb.
          </Alert>
          <label className="dx-check">
            <input type="checkbox" checked={confirmLoss} onChange={(e) => setConfirmLoss(e.target.checked)} />
            <span>
              I understand copied contracts are executed on my account, that slippage is possible, and that the {usd(worstCase)} worst
              case is my responsibility.
            </span>
          </label>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="d-grid gap-3">
          <div className="dx-card-inset">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
              <div className="d-flex align-items-center gap-3">
                <Avatar name={trader.displayName} tone="teal" />
                <div>
                  <div className="fw-semibold">
                    {trader.flag} {trader.displayName}
                  </div>
                  <div className="dx-help font-display">{trader.loginId}</div>
                </div>
              </div>
              <Chip tone="up">
                <BadgeCheck size={12} /> statement verified
              </Chip>
            </div>
          </div>
          <div className="row g-3">
            {[
              { k: "Stake ratio", v: `${ratio.toFixed(2)}x` },
              { k: "Loss cap", v: usd(cap) },
              { k: "Max legs", v: `${maxLegs}` },
              { k: "Mirror stop-outs", v: mirrorStops ? "on" : "off" },
              { k: "Worker lane", v: "copy-relay-3 (12 ms)" },
              { k: "Kill switch", v: "armed" },
            ].map((row) => (
              <div className="col-6" key={row.k}>
                <div className="dx-card-inset">
                  <div className="dx-kpi-label">{row.k}</div>
                  <div className="font-display fw-semibold">{row.v}</div>
                </div>
              </div>
            ))}
          </div>
          <Alert tone="up" title="Kill switch armed">
            Closing the kill switch releases every mirrored leg at market within one tick and pauses the relay — your own bots are
            untouched.
          </Alert>
        </div>
      ) : null}
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// Leaderboard dialog — comprehensive, sortable, filterable, paginated
// -----------------------------------------------------------------------------
export function LeaderboardDialog({
  open,
  onClose,
  initialTab = "month",
  onOpenTrader,
  onCopy,
  onOpenCommunity,
  onOpenBacktests,
}: {
  open: boolean;
  onClose: () => void;
  initialTab?: "all" | "month" | "week";
  onOpenTrader: (id: string) => void;
  onCopy: (t: Trader) => void;
  onOpenCommunity: () => void;
  onOpenBacktests: () => void;
}) {
  const [tab, setTab] = useState(initialTab);
  const [minWin, setMinWin] = useState("all");

  const rows = useMemo(() => {
    const factor = tab === "week" ? 0.27 : tab === "all" ? 3.6 : 1;
    return TRADERS.map((t) => ({
      ...t,
      periodPnl: Math.round(t.pnl30d * factor * 100) / 100,
      periodTrades: Math.max(12, Math.round(t.trades30d * (tab === "week" ? 0.24 : tab === "all" ? 5.1 : 1))),
    }));
  }, [tab]);

  const table = useDataTable<(typeof rows)[number]>({
    rows,
    searchKeys: (r) => [r.displayName, r.loginId, r.country, r.strategy, r.favouriteSymbol],
    sorters: {
      rank: (r) => r.rank,
      pnl: (r) => r.periodPnl,
      winRate: (r) => r.winRate,
      trades: (r) => r.periodTrades,
      volume: (r) => r.volume30d,
      copies: (r) => r.copies,
      followers: (r) => r.followers,
      streak: (r) => r.streak,
    },
    filterKey: (r) => r.risk,
    filterOptions: [
      { id: "low", label: "Low risk" },
      { id: "medium", label: "Medium" },
      { id: "high", label: "High" },
    ],
    initialPageSize: 10,
    initialSort: "pnl",
    initialDir: "desc",
  });

  const filtered = useMemo(() => {
    if (minWin === "all") return table.rows;
    const threshold = Number(minWin);
    return table.rows.filter((r) => r.winRate >= threshold);
  }, [table.rows, minWin]);

  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: "rank",
      header: "#",
      cell: (r) => <span className="font-display">{r.rank}</span>,
    },
    {
      key: "trader",
      header: "Trader",
      cell: (r) => (
        <span className="d-flex align-items-center gap-2">
          <Avatar name={r.displayName} tone={r.rank <= 3 ? "teal" : "blue"} />
          <span>
            <span className="d-block fw-semibold">
              {r.flag} {r.displayName}
            </span>
            <span className="dx-help font-display">{r.loginId}</span>
          </span>
        </span>
      ),
    },
    {
      key: "strategy",
      header: "Strategy",
      cell: (r) => <span className="dx-chip dx-chip-muted">{r.strategy}</span>,
      hideOnMobile: true,
    },
    {
      key: "winRate",
      header: "Win rate",
      align: "end",
      cell: (r) => <span className="font-display">{r.winRate.toFixed(1)}%</span>,
    },
    {
      key: "pnl",
      header: tab === "week" ? "7d P&L" : tab === "all" ? "All-time P&L" : "30d P&L",
      align: "end",
      cell: (r) => <span className={`font-display ${r.periodPnl >= 0 ? "dx-up" : "dx-down"}`}>{pnl(r.periodPnl)}</span>,
    },
    {
      key: "trades",
      header: "Trades",
      align: "end",
      cell: (r) => <span className="font-display">{r.periodTrades.toLocaleString("en-US")}</span>,
      hideOnMobile: true,
    },
    {
      key: "volume",
      header: "Volume",
      align: "end",
      cell: (r) => <span className="font-display">{usd(r.volume30d, 0, { compact: true })}</span>,
      hideOnMobile: true,
    },
    {
      key: "copies",
      header: "Copiers",
      align: "end",
      cell: (r) => <span className="font-display">{r.copies}</span>,
      hideOnMobile: true,
    },
    {
      key: "risk",
      header: "Risk",
      align: "center",
      cell: (r) => <span className={`dx-chip dx-risk-${r.risk === "low" ? "low" : r.risk === "medium" ? "med" : "high"}`}>{r.risk}</span>,
    },
    {
      header: "",
      align: "end",
      className: "dx-td-actions",
      cell: (r) => (
        <span className="d-inline-flex gap-1">
          <button
            type="button"
            className="dx-btn dx-btn-sm dx-btn-ghost"
            onClick={(e) => {
              e.stopPropagation();
              onOpenTrader(r.id);
            }}
          >
            Profile
          </button>
          <button
            type="button"
            className="dx-btn dx-btn-sm dx-btn-primary"
            onClick={(e) => {
              e.stopPropagation();
              onCopy(r);
            }}
          >
            Copy
          </button>
        </span>
      ),
    },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="full"
      title="Trader leaderboard"
      subtitle="Statements are reconciled against Deriv. Rankings use realised P&L, excluding transfer and swap lines."
      footer={
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 w-100">
          <span className="dx-help">
            {table.total} traders · {TRADERS.reduce((s, t) => s + t.copies, 0).toLocaleString("en-US")} total copiers
          </span>
          <div className="d-flex flex-wrap gap-2">
            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={onOpenCommunity}>
              <Users size={13} /> Discuss in community
            </button>
            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={onOpenBacktests}>
              <LineChartIcon size={13} /> Backtest a strategy
            </button>
            <button type="button" className="dx-btn dx-btn-sm" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      }
    >
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
        <MiniTabs
          options={[
            { id: "month", label: "30 days" },
            { id: "week", label: "7 days" },
            { id: "all", label: "All-time" },
          ]}
          value={tab}
          onChange={(v) => setTab(v as typeof tab)}
          ariaLabel="Leaderboard period"
        />
        <div className="d-flex flex-wrap align-items-center gap-2">
          <SearchInput value={table.query} onChange={table.setQuery} placeholder="Name, login ID, country…" />
          <FilterChips options={table.filterOptions} value={table.filter} onChange={table.setFilter} allLabel="All risk" />
        </div>
      </div>

      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <span className="dx-help">Win-rate floor:</span>
        <FilterChips
          includeAll
          options={[
            { id: "55", label: "≥ 55%" },
            { id: "60", label: "≥ 60%" },
            { id: "65", label: "≥ 65%" },
          ]}
          value={minWin}
          onChange={setMinWin}
          allLabel="Any"
        />
        <span className="dx-help ms-auto">Faded rows on mobile — tap a row for the full profile.</span>
      </div>

      <DataTable
        columns={columns}
        state={{ ...table, rows: filtered, total: filtered.length, pageCount: Math.max(1, Math.ceil(filtered.length / table.pageSize)) }}
        rowKey={(r) => r.id}
        onRowClick={(r) => onOpenTrader(r.id)}
        emptyState={<div className="p-5 text-center dx-lead">No trader matches those filters.</div>}
        ariaLabel="Trader leaderboard"
      />
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// Trader drawer — profile, recent contracts, follow/copy actions
// -----------------------------------------------------------------------------
export function TraderDrawer({
  trader,
  onClose,
  onCopy,
  onOpenLeaderboard,
  onOpenCommunity,
  copied,
}: {
  trader: Trader | null;
  onClose: () => void;
  onCopy: (t: Trader) => void;
  onOpenLeaderboard: () => void;
  onOpenCommunity: () => void;
  copied: boolean;
}) {
  const [following, setFollowing] = useState(false);
  const [tab, setTab] = useState("stats");
  if (!trader) return null;

  const teacher = TRADES.filter((t) => t.status !== "open").slice(trader.rank, trader.rank + 5);
  const curve = equityCurve(30, trader.rank * 977 + 13, 1200, 14 - trader.rank);

  return (
    <Drawer
      open={Boolean(trader)}
      onClose={onClose}
      wide
      title={`${trader.flag} ${trader.displayName}`}
      subtitle={`${trader.country} · joined ${trader.joinedAt} · ${trader.loginId}`}
      footer={
        <div className="d-flex flex-wrap gap-2 w-100">
          <button type="button" className="dx-btn dx-btn-primary flex-grow-1" onClick={() => onCopy(trader)} disabled={copied}>
            <Copy size={14} /> {copied ? "Already copying" : "Copy this trader"}
          </button>
          <button type="button" className={`dx-btn ${following ? "dx-btn-ghost" : ""}`} onClick={() => setFollowing((f) => !f)}>
            <Bookmark size={14} /> {following ? "Following" : "Follow"}
          </button>
          <button type="button" className="dx-btn dx-btn-ghost" onClick={onOpenLeaderboard}>
            Leaderboard
          </button>
        </div>
      }
    >
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        {copied ? (
          <Chip tone="up" pulse>
            copying live
          </Chip>
        ) : null}
        <Chip tone={trader.risk === "low" ? "up" : trader.risk === "medium" ? "warn" : "down"}>risk: {trader.risk}</Chip>
        <Chip tone="muted">{trader.strategy}</Chip>
        <Chip tone="info">{trader.streak}-trade streak</Chip>
        {following ? <Chip tone="accent">followed</Chip> : null}
      </div>

      <Tabs
        tabs={[
          { id: "stats", label: "Statistics" },
          { id: "trades", label: "Recent contracts" },
          { id: "about", label: "About & risk" },
        ]}
        active={tab}
        onChange={setTab}
        className="mb-3"
      />

      {tab === "stats" ? (
        <div className="d-grid gap-4">
          <div className="row g-3">
            <div className="col-6">
              <div className="dx-card-inset">
                <div className="dx-kpi-label">30-day P&amp;L</div>
                <div className={`font-display fw-semibold ${trader.pnl30d >= 0 ? "dx-up" : "dx-down"}`}>{pnl(trader.pnl30d)}</div>
              </div>
            </div>
            <div className="col-6">
              <div className="dx-card-inset">
                <div className="dx-kpi-label">All-time P&amp;L</div>
                <div className="font-display fw-semibold">{pnl(trader.pnlAllTime)}</div>
              </div>
            </div>
            <div className="col-6">
              <div className="dx-card-inset">
                <div className="dx-kpi-label">Win rate</div>
                <div className="font-display fw-semibold">{pct(trader.winRate, 1)}</div>
              </div>
            </div>
            <div className="col-6">
              <div className="dx-card-inset">
                <div className="dx-kpi-label">Volume (30d)</div>
                <div className="font-display fw-semibold">{usd(trader.volume30d, 0, { compact: true })}</div>
              </div>
            </div>
          </div>

          <div className="dx-card-inset">
            <div className="dx-kpi-label mb-2">Equity curve (simulated, 30 sessions)</div>
            <LineChart data={curve} height={180} yFormat={(v) => usd(v, 0)} ariaLabel="Trader equity curve" />
          </div>

          <div className="row g-3">
            <div className="col-6">
              <Meter label="Contracts settling on target" value={trader.winRate} display={`${trader.winRate}%`} />
            </div>
            <div className="col-6">
              <Meter label="Copiers retained 90d" value={Math.min(96, 58 + trader.streak)} display={`${Math.min(96, 58 + trader.streak)}%`} />
            </div>
          </div>
          <div className="d-flex gap-2">
            <Sparkline data={curve} tone={trader.pnl30d >= 0 ? "up" : "down"} height={54} ariaLabel="Trader sparkline" />
          </div>
        </div>
      ) : null}

      {tab === "trades" ? (
        <div className="dx-table-wrap">
          <table className="dx-table dx-table-sm dx-table-stack">
            <thead>
              <tr>
                <th scope="col">Contract</th>
                <th scope="col">Symbol</th>
                <th scope="col" className="dx-td-num">
                  Stake
                </th>
                <th scope="col" className="dx-td-num">
                  Result
                </th>
                <th scope="col">Duration</th>
              </tr>
            </thead>
            <tbody>
              {teacher.map((t) => (
                <tr key={t.id}>
                  <td data-label="Contract">
                    <span className="font-display">{t.contractId}</span>
                    <span className="dx-help d-block">{t.contractType.replace(/_/g, "/")}</span>
                  </td>
                  <td data-label="Symbol" className="font-display">
                    {t.symbol}
                  </td>
                  <td data-label="Stake" className="dx-td-num">
                    {usd(t.stake)}
                  </td>
                  <td data-label="Result" className="dx-td-num">
                    <span className={t.profit >= 0 ? "dx-up" : "dx-down"}>{pnl(t.profit)}</span>
                  </td>
                  <td data-label="Duration" className="font-display">
                    {fmtDur(t.duration, t.durationUnit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "about" ? (
        <div className="d-grid gap-3">
          <div className="dx-card-inset">
            <div className="dx-kpi-label mb-1">Trader notes</div>
            <p className="dx-help mb-0">{trader.bio}</p>
          </div>
          <Alert tone="warn" title="Copying is not risk-free">
            Their stop-loss is theirs. Copied legs are placed on your account at your stake ratio; fast tick contracts can fill a
            few ticks away from their entry.
          </Alert>
          <div className="row g-3">
            {[
              { k: "Favourite symbol", v: trader.favouriteSymbol },
              { k: "Typical duration", v: trader.avgDuration },
              { k: "Copiers", v: `${trader.copies}` },
              { k: "Followers", v: trader.followers.toLocaleString("en-US") },
            ].map((row) => (
              <div className="col-6" key={row.k}>
                <div className="dx-card-inset">
                  <div className="dx-kpi-label">{row.k}</div>
                  <div className="font-display fw-semibold">{row.v}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="d-flex flex-wrap gap-2">
            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={onOpenCommunity}>
              Ask about this trader
            </button>
            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={onOpenLeaderboard}>
              Compare with others
            </button>
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}

// -----------------------------------------------------------------------------
// Instrument drawer — symbol detail with live ticks and payout table
// -----------------------------------------------------------------------------
export function InstrumentDrawer({
  code,
  onClose,
  onTrade,
  onBacktest,
  onOpenMarkets,
}: {
  code: string | null;
  onClose: () => void;
  onTrade: (code: string) => void;
  onBacktest: (symbol: string) => void;
  onOpenMarkets: () => void;
}) {
  const [quote, setQuote] = useState<{ value: number; dir: "up" | "down" | "flat" } | null>(null);
  const [tab, setTab] = useState("live");
  const symbol: Symbol | undefined = code ? SYMBOL_MAP[code] : undefined;
  const rand = useMemo(() => mulberry32(symbol ? symbol.basePrice * 1000 : 1), [symbol]);

  useInterval(
    () => {
      if (!symbol) return;
      setQuote((prev) => {
        const current = prev?.value ?? symbol.basePrice;
        const tick = nextTick(symbol, current, rand);
        return { value: tick.quote, dir: tick.dir };
      });
    },
    symbol && tab === "live" ? 1500 : null,
  );

  if (!symbol) return null;

  const live = quote?.value ?? symbol.basePrice;
  const changePct = ((live - symbol.basePrice) / symbol.basePrice) * 100;
  const series = equityCurve(26, symbol.pipSize * 911 + symbol.basePrice, live - symbol.basePrice * 0.01, symbol.basePrice * 0.002);

  const payoutRows = symbol.contractTypes.map((ct) => {
    const type = CONTRACT_TYPE_MAP[ct];
    const payout = ct === "higher_lower" || ct === "touch" ? symbol.payoutPct * 1.9 : symbol.payoutPct;
    return {
      id: ct,
      label: type.label,
      units: type.units.join(" / "),
      limits: `${type.minDuration}–${type.maxDuration} ${type.units[0]}`,
      payout: Math.round(payout * 10) / 10,
      barrier: type.barrier,
    };
  });

  return (
    <Drawer
      open={Boolean(code)}
      onClose={onClose}
      wide
      title={`${symbol.code} — ${symbol.name}`}
      subtitle={`${symbol.market} · pip size ${symbol.pipSize} · session ${symbol.openTime}–${symbol.closeTime} UTC`}
      footer={
        <div className="d-flex flex-wrap gap-2 w-100">
          <button type="button" className="dx-btn dx-btn-primary flex-grow-1" onClick={() => onTrade(symbol.code)}>
            Trade ${symbol.minStake.toFixed(2)} minimum
          </button>
          <button type="button" className="dx-btn dx-btn-ghost" onClick={() => onBacktest(symbol.code)}>
            Backtest symbol
          </button>
          <button type="button" className="dx-btn dx-btn-ghost" onClick={onOpenMarkets}>
            Full book
          </button>
        </div>
      }
    >
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
        <div>
          <div className="dx-kpi-label">Live quote</div>
          <div className={`dx-kpi-value ${quote?.dir === "down" ? "dx-down" : "dx-up"}`}>{fmtPrice(live, symbol.pipSize)}</div>
          <div className="dx-help">
            {pct(changePct, 2, true)} vs session base · spread {symbol.spread.toFixed(symbol.pipSize)}
          </div>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Chip tone={symbol.open ? "up" : "warn"} pulse={symbol.open}>
            {symbol.open ? "market open" : "market closed"}
          </Chip>
          <Chip tone="muted">popularity {symbol.popularity}</Chip>
          <CopyButton text={symbol.code} label="Copy code" />
        </div>
      </div>

      <Tabs
        tabs={[
          { id: "live", label: "Live ticks" },
          { id: "contracts", label: `Contract types (${payoutRows.length})` },
          { id: "specs", label: "Specs & limits" },
        ]}
        active={tab}
        onChange={setTab}
        className="mb-3"
      />

      {tab === "live" ? (
        <div className="d-grid gap-3">
          <div className="dx-card-inset">
            <Sparkline data={series} tone={changePct >= 0 ? "up" : "down"} height={90} ariaLabel={`${symbol.code} live ticks`} />
            <div className="d-flex justify-content-between mt-2">
              <span className="dx-help">26 ticks · simulated stream</span>
              <span className="dx-help font-display">
                min {fmtPrice(Math.min(...series), symbol.pipSize)} · max {fmtPrice(Math.max(...series), symbol.pipSize)}
              </span>
            </div>
          </div>
          <div className="dx-table-wrap">
            <table className="dx-table dx-table-sm dx-table-stack">
              <thead>
                <tr>
                  <th scope="col">Field</th>
                  <th scope="col" className="dx-td-num">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Symbol code", symbol.code],
                  ["Market", symbol.market],
                  ["Pip size", `${symbol.pipSize}`],
                  ["Minimum stake", usd(symbol.minStake)],
                  ["Maximum stake", usd(symbol.maxStake, 0)],
                  ["Base payout (Rise/Fall)", `${symbol.payoutPct}%`],
                  ["Tick frequency", symbol.market === "synthetics" ? (symbol.code.startsWith("1HZ") ? "1000 ms" : "2000 ms") : "live feed"],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td data-label="Field">{k}</td>
                    <td data-label="Value" className="dx-td-num font-display">
                      {v}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === "contracts" ? (
        <div className="dx-table-wrap dx-table-scroll">
          <table className="dx-table dx-table-sm dx-table-stack">
            <thead>
              <tr>
                <th scope="col">Contract</th>
                <th scope="col">Duration units</th>
                <th scope="col">Limits</th>
                <th scope="col" className="dx-td-num">
                  Payout @ $10
                </th>
              </tr>
            </thead>
            <tbody>
              {payoutRows.map((r) => (
                <tr key={r.id}>
                  <td data-label="Contract">
                    <span className="fw-semibold">{r.label}</span>
                    <span className="dx-help d-block">{r.barrier}</span>
                  </td>
                  <td data-label="Duration units" className="font-display">
                    {r.units}
                  </td>
                  <td data-label="Limits" className="font-display">
                    {r.limits}
                  </td>
                  <td data-label="Payout" className="dx-td-num">
                    <span className="dx-up font-display">{usd((10 * (1 + r.payout / 100)), 2)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "specs" ? (
        <div className="d-grid gap-3">
          <Alert tone="info" title="Settlement">
            Contracts settle against Deriv's own tick feed for this symbol. Underlying prices for synthetic indices are generated by
            Deriv's RNG — they are not tied to any external market.
          </Alert>
          <div className="row g-3">
            {[
              { k: "Highest payout type", v: symbol.contractTypes.includes("touch") ? "Touch/No Touch" : "Higher/Lower" },
              { k: "Fastest duration", v: symbol.market === "synthetics" ? "1 tick" : "15 seconds" },
              { k: "Longest duration", v: "365 days" },
              { k: "Barrier style", v: "absolute offset" },
            ].map((row) => (
              <div className="col-6" key={row.k}>
                <div className="dx-card-inset">
                  <div className="dx-kpi-label">{row.k}</div>
                  <div className="font-display fw-semibold">{row.v}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="d-flex flex-wrap gap-2">
            {MARKET_SYMBOLS.filter((s) => s.market === symbol.market && s.code !== symbol.code)
              .slice(0, 4)
              .map((s) => (
                <Chip key={s.code} tone="muted">
                  {s.code}
                </Chip>
              ))}
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}

// -----------------------------------------------------------------------------
// API status drawer — endpoint health board
// -----------------------------------------------------------------------------
export function StatusDrawer({
  open,
  onClose,
  onOpenDocs,
  onOpenConnections,
}: {
  open: boolean;
  onClose: () => void;
  onOpenDocs: () => void;
  onOpenConnections: () => void;
}) {
  const [spike, setSpike] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastCheck, setLastCheck] = useState(() => new Date().toISOString().slice(11, 19));

  useInterval(
    () => {
      setLastCheck(new Date().toISOString().slice(11, 19));
      setSpike(false);
    },
    autoRefresh ? 9000 : null,
  );

  const rows = useMemo(
    () =>
      API_ENDPOINTS.map((e) => ({
        ...e,
        latencyMs: spike && (e.channel === "trading" || e.channel === "portfolio") ? e.latencyMs * 3 : e.latencyMs,
        status: spike && (e.channel === "trading" || e.channel === "portfolio") ? ("degraded" as const) : e.status,
      })),
    [spike],
  );

  const table = useDataTable<(typeof rows)[number]>({
    rows,
    searchKeys: (r) => [r.request, r.channel, r.status],
    sorters: {
      request: (r) => r.request,
      latency: (r) => r.latencyMs,
      uptime: (r) => r.uptimePct,
      calls: (r) => r.calls24h,
      status: (r) => r.status,
    },
    filterKey: (r) => r.channel,
    filterOptions: [
      { id: "auth", label: "Auth" },
      { id: "market", label: "Market" },
      { id: "trading", label: "Trading" },
      { id: "portfolio", label: "Portfolio" },
      { id: "utility", label: "Utility" },
    ],
    initialPageSize: 10,
    initialSort: "calls",
    initialDir: "desc",
  });

  const degraded = rows.filter((r) => r.status !== "operational").length;
  const columns: Column<ApiEndpoint & { latencyMs: number }>[] = [
    { key: "request", header: "Request", cell: (r) => <span className="font-display">{r.request}</span> },
    { key: "channel", header: "Channel", cell: (r) => <span className="dx-chip dx-chip-muted">{r.channel}</span> },
    { key: "latency", header: "Latency", align: "end", cell: (r) => <span className="font-display">{r.latencyMs} ms</span> },
    { key: "uptime", header: "Uptime 30d", align: "end", cell: (r) => <span className="font-display">{r.uptimePct.toFixed(2)}%</span> },
    {
      key: "calls",
      header: "Calls 24h",
      align: "end",
      cell: (r) => <span className="font-display">{r.calls24h.toLocaleString("en-US")}</span>,
    },
    {
      key: "status",
      header: "Status",
      align: "end",
      cell: (r) => (
        <span className={`dx-chip ${r.status === "operational" ? "dx-chip-up" : r.status === "degraded" ? "dx-chip-warn" : "dx-chip-info"}`}>
          {r.status}
        </span>
      ),
    },
  ];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      wide
      title="Deriv API health"
      subtitle={`Relay ws.derivws.com · last check ${lastCheck} UTC · ${degraded === 0 ? "all systems operational" : `${degraded} endpoint(s) degraded`}`}
      footer={
        <div className="d-flex flex-wrap gap-2 w-100">
          <button type="button" className="dx-btn dx-btn-sm" onClick={() => setLastCheck(new Date().toISOString().slice(11, 19))}>
            <Activity size={13} /> Re-check now
          </button>
          <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={onOpenDocs}>
            <ExternalLink size={13} /> API reference
          </button>
          <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={onOpenConnections}>
            <Repeat size={13} /> Manage connections
          </button>
        </div>
      }
    >
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <Chip tone={degraded === 0 ? "up" : "warn"} pulse>
          {degraded === 0 ? "operational" : "degraded path"}
        </Chip>
        <Chip tone="muted">
          <span className="font-display">{API_ENDPOINTS.length}</span> endpoints monitored
        </Chip>
        <Toggle checked={autoRefresh} onChange={setAutoRefresh} label="Auto re-check every 9s" />
      </div>

      <div className="dx-card-inset mb-3">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div>
            <div className="dx-kpi-label">Active incidents</div>
            <div className="dx-help mb-0">
              {degraded === 0
                ? "No open incidents. sell and time are in scheduled maintenance windows only."
                : "Sell round-trip latency elevated in the eu-west relay. Buys are unaffected."}
            </div>
          </div>
          <button type="button" className="dx-btn dx-btn-sm dx-btn-danger" onClick={() => setSpike((v) => !v)}>
            <AlertTriangle size={13} /> {spike ? "Clear simulated spike" : "Simulate latency spike"}
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        state={table}
        rowKey={(r) => r.id}
        dense
        stacked={false}
        ariaLabel="API endpoint health"
      />

      <div className="row g-3 mt-3">
        <div className="col-12 col-sm-6">
          <div className="dx-card-inset">
            <DonutStat value={99.97} label="uptime" sublabel="Trailing 30 days across all monitored requests." />
          </div>
        </div>
        <div className="col-12 col-sm-6">
          <div className="dx-card-inset">
            <div className="dx-kpi-label mb-2">Calls by channel (24h)</div>
            <BarSeries
              positiveOnly
              data={["auth", "market", "trading", "portfolio", "utility"].map((ch) =>
                rows.filter((r) => r.channel === ch).reduce((s, r) => s + r.calls24h, 0),
              )}
              labels={["auth", "mkt", "trade", "port", "util"]}
              height={150}
              format={(v) => `${Math.round(v / 1000)}k`}
            />
          </div>
        </div>
      </div>

      <Reveal>
        <div className="dx-card-inset mt-3">
          <div className="d-flex align-items-center gap-2 mb-2">
            <ShieldAlert size={14} className="dx-warn-text" />
            <span className="dx-kpi-label mb-0">Incident history</span>
          </div>
          <div className="dx-list">
            {[
              { id: "i1", when: "2026-09-28 14:02 UTC", what: "Proposal latency spike (eu-west)", state: "resolved in 6m" },
              { id: "i2", when: "2026-09-11 09:41 UTC", what: "Statement endpoint slow (ap-south)", state: "resolved in 22m" },
              { id: "i3", when: "2026-08-30 21:15 UTC", what: "Scheduled maintenance — time endpoint", state: "completed" },
            ].map((i) => (
              <div key={i.id} className="dx-list-row">
                <span className="dx-dot dx-dot-info" />
                <span className="flex-grow-1">
                  <span className="d-block" style={{ fontSize: "0.82rem" }}>
                    {i.what}
                  </span>
                  <span className="dx-help font-display">{i.when}</span>
                </span>
                <span className="dx-chip dx-chip-up">{i.state}</span>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <div className="d-flex align-items-center gap-2 mt-3">
        <Star size={13} className="dx-muted" />
        <span className="dx-help mb-0">
          Monitoring runs from three regions; {BOTS.length} bots and {STRATEGY_PRESETS.length} presets route through this relay.
        </span>
      </div>
    </Drawer>
  );
}
