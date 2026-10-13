// =============================================================================
// DemoModals.tsx — H-1 interactive core: the 5-slide product tour and the
// Demo Console (trade flow with proposal → confirm → buy → receipt, bot
// controls with confirm dialogs, position drawer with early close, copy flow).
// =============================================================================
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Ban,
  BarChart3,
  Bot as BotIcon,
  Check,
  CheckCircle2,
  CircleStop,
  Copy,
  Gauge,
  Pause,
  Play,
  Receipt,
  Repeat,
  Rocket,
  ShieldAlert,
  Timer,
  TrendingUp,
  Users,
  XCircle,
  Zap,
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
  MiniTabs,
  PriceFlash,
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
import { BarSeries, DigitBars, DonutStat, LineChart, TerminalPreview } from "../../ui/charts";
import {
  BACKTESTS,
  BOTS,
  DERIV_ACCOUNTS,
  POSITIONS,
  STRATEGY_PRESETS,
  TOUR_SLIDES,
  TRADERS,
  TRADES,
  NOW_REF,
  equityCurve,
  type Bot,
  type Position,
  type Trader,
} from "../../../data/trading";
import {
  CONTRACT_TYPE_MAP,
  CONTRACT_TYPES,
  DURATION_UNITS,
  MARKET_SYMBOLS,
  QUICK_STAKES,
  SYMBOL_MAP,
  buildProposal,
  fmtDur,
  fmtDurLong,
  fmtPrice,
  fmtTime,
  pct,
  pnl,
  usd,
  type ContractTypeId,
  type DurationUnit,
  type Proposal,
} from "../../../data/market";
import { useLiveSeries, usePnlDrift, useTicks } from "../../../lib/live";
import type { DemoTab, QueuedBot } from "../types";
import { CopySetupWizard } from "./SocialModals";

// -----------------------------------------------------------------------------
// Product tour — 5 slides with live mock screens
// -----------------------------------------------------------------------------
export function TourDialog({
  open,
  onClose,
  initialSlideId,
  onOpenDemo,
  onOpenSignUp,
}: {
  open: boolean;
  onClose: () => void;
  initialSlideId?: string;
  onOpenDemo: (tab: DemoTab) => void;
  onOpenSignUp: () => void;
}) {
  const startIndex = Math.max(0, TOUR_SLIDES.findIndex((s) => s.id === initialSlideId));
  const [index, setIndex] = useState(startIndex);
  const [motion, setMotion] = useState(true);
  const slide = TOUR_SLIDES[index];
  const series = useLiveSeries(slide.screen === "trade" ? "R_10" : "cryBTCUSD", 24, 2400);

  useEffect(() => {
    if (!motion) return;
    const id = window.setInterval(() => setIndex((i) => (i >= TOUR_SLIDES.length - 1 ? 0 : i + 1)), 9000);
    return () => window.clearInterval(id);
  }, [motion]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="xl"
      title="Product tour"
      subtitle={`Slide ${index + 1} of ${TOUR_SLIDES.length} · ${slide.durationLabel} · auto-advances while motion is on`}
      footer={
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 w-100">
          <Stepper steps={TOUR_SLIDES.map((s) => ({ id: s.id, label: s.screen }))} active={index} onStepClick={setIndex} />
          <div className="d-flex flex-wrap align-items-center gap-2">
            <Toggle checked={motion} onChange={setMotion} label="Auto-advance" />
            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
              <ArrowLeft size={13} /> Prev
            </button>
            {index < TOUR_SLIDES.length - 1 ? (
              <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => setIndex((i) => i + 1)}>
                Next slide
              </button>
            ) : (
              <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => onOpenDemo("trade")}>
                <Play size={13} /> Open the console
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="row g-4">
        <div className="col-12 col-lg-5">
          <div className="dx-eyebrow mb-2">{slide.screen} console</div>
          <h3 className="dx-h-card">{slide.title}</h3>
          <p className="dx-lead mt-3" style={{ fontSize: "0.9rem" }}>
            {slide.blurb}
          </p>
          <ul className="list-unstyled d-grid gap-2 mt-3">
            {slide.bullets.map((b) => (
              <li key={b} className="d-flex gap-2 align-items-start dx-text-dim" style={{ fontSize: "0.84rem" }}>
                <Check size={14} className="dx-up mt-1" /> {b}
              </li>
            ))}
          </ul>
          <div className="d-flex flex-wrap gap-2 mt-3">
            <button type="button" className="dx-btn dx-btn-sm" onClick={() => onOpenDemo(slide.screen)}>
              Jump to this screen
            </button>
            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={onOpenSignUp}>
              Set this up for my account
            </button>
          </div>
        </div>
        <div className="col-12 col-lg-7">
          <div className="dx-card-inset h-100">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <span className="dx-kpi-label mb-0">Live mock screen</span>
              <span className="d-flex align-items-center gap-2">
                <span className="dx-pulse" />
                <span className="dx-help">simulated feed</span>
              </span>
            </div>

            {slide.screen === "trade" ? (
              <div className="d-grid gap-3">
                <Sparkline data={series} tone="accent" height={88} ariaLabel="Tick series" />
                <div className="row g-2">
                  {[0.35, 1, 5].map((s) => (
                    <div className="col-4" key={s}>
                      <div className="dx-card-inset">
                        <div className="dx-kpi-label">Stake {usd(s)}</div>
                        <div className="font-display dx-up">{usd(s * 1.954)} payout</div>
                        <div className="dx-help">5 ticks · Rise</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {slide.screen === "bots" ? (
              <div className="dx-list">
                {BOTS.slice(0, 4).map((b) => (
                  <div key={b.id} className="dx-list-row">
                    <span className={`dx-dot ${b.status === "running" ? "dx-dot-up" : b.status === "error" ? "dx-dot-down" : "dx-dot-warn"}`} />
                    <span className="flex-grow-1">
                      <span className="d-block fw-semibold" style={{ fontSize: "0.84rem" }}>
                        {b.name}
                      </span>
                      <span className="dx-help">
                        {b.symbol} · {fmtDur(b.duration, b.durationUnit)}
                      </span>
                    </span>
                    <span className={`font-display ${b.pnl >= 0 ? "dx-up" : "dx-down"}`}>{pnl(b.pnl)}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {slide.screen === "portfolio" ? (
              <div className="dx-table-wrap">
                <table className="dx-table dx-table-sm">
                  <thead>
                    <tr>
                      <th scope="col">Contract</th>
                      <th scope="col" className="dx-td-num">
                        Stake
                      </th>
                      <th scope="col" className="dx-td-num">
                        Floating
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {POSITIONS.slice(0, 5).map((p) => (
                      <tr key={p.id}>
                        <td className="font-display">
                          {p.symbol}
                          <span className="dx-help d-block">{p.contractType.replace(/_/g, "/")}</span>
                        </td>
                        <td className="dx-td-num">{usd(p.stake)}</td>
                        <td className="dx-td-num">
                          <span className={p.currentPnl >= 0 ? "dx-up" : "dx-down"}>{pnl(p.currentPnl)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {slide.screen === "analytics" ? (
              <div className="d-grid gap-3">
                <LineChart data={equityCurve(32, 8080, 2000, 12)} height={160} yFormat={(v) => usd(v, 0)} ariaLabel="Equity curve" />
                <div className="row g-3">
                  <div className="col-6">
                    <DonutStat value={62.4} label="win rate" size={110} />
                  </div>
                  <div className="col-6">
                    <BarSeries data={[120, -60, 240, 310, -40, 180, 90, 260]} height={120} format={(v) => usd(v, 0)} />
                  </div>
                </div>
              </div>
            ) : null}

            {slide.screen === "social" ? (
              <div className="dx-list">
                {TRADERS.slice(0, 4).map((t, i) => (
                  <div key={t.id} className="dx-list-row">
                    <span className="font-display dx-muted">#{i + 1}</span>
                    <Avatar name={t.displayName} tone={i === 0 ? "teal" : "blue"} />
                    <span className="flex-grow-1">
                      <span className="d-block fw-semibold" style={{ fontSize: "0.84rem" }}>
                        {t.flag} {t.displayName}
                      </span>
                      <span className="dx-help">
                        {t.strategy} · {t.copies} copiers
                      </span>
                    </span>
                    <span className="font-display dx-up">{pnl(t.pnl30d)}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// Demo console
// -----------------------------------------------------------------------------
const BOT_LOGS = [
  "[12:01:23] worker bot_mart_10 → subscribe tick R_10 (lane eu-west, 12ms)",
  "[12:01:25] strategy → sma20 6423.61 · quote 6423.75 · signal RISE",
  "[12:01:25] risk → stake 0.35 ≤ cap 50 · exposure 1.05/400 · pass",
  "[12:01:25] proposal → id prop_7f31c stake $0.35 payout 195% → ask $0.35",
  "[12:01:25] BUY RISE R_10 @ $0.35 · contract 34015201 · idempotency idem_9c82f4d7",
  "[12:01:27] tick 2/5 quote 6424.02 · floating +$0.18",
  "[12:01:33] WIN contract 34015201 · payout $0.68 · realised +$0.33",
  "[12:01:33] martingale → reset to base stake $0.35",
  "[12:03:18] ERROR risk.halt(exposure-cap) → bot paused · 1 notification sent",
  "[12:07:02] operator → resume requested · cap raised to $400 · worker reloaded",
];

export function DemoConsoleDialog({
  open,
  onClose,
  initialTab = "trade",
  onContractBought,
  onOpenPresets,
  onOpenBacktests,
  onOpenLeaderboard,
  onOpenStatus,
  onOpenCommunity,
  queuedBots,
}: {
  open: boolean;
  onClose: () => void;
  initialTab?: DemoTab;
  /** bots deployed from the presets library during this session (visible rows) */
  queuedBots?: QueuedBot[];
  onContractBought: (receipt: { contractId: string; symbol: string; stake: number; payout: number }) => void;
  onOpenPresets: () => void;
  onOpenBacktests: (presetId?: string) => void;
  onOpenLeaderboard: () => void;
  onOpenStatus: () => void;
  onOpenCommunity: (channelId?: string) => void;
}) {
  const [tab, setTab] = useState<DemoTab>(initialTab);
  const [period, setPeriod] = useState("1m");
  const [botFilter, setBotFilter] = useState("all");
  const [botQuery, setBotQuery] = useState("");
  const [botDetail, setBotDetail] = useState<Bot | null>(null);
  const [botAction, setBotAction] = useState<{ bot: Bot; action: "start" | "pause" | "stop" } | null>(null);
  const [positionDetail, setPositionDetail] = useState<Position | null>(null);
  const [closeTarget, setCloseTarget] = useState<Position | null>(null);
  const [positionStates, setPositionStates] = useState<Record<string, { pnl: number; status: Position["status"] }>>({});
  const [copiedTrader, setCopiedTrader] = useState<{ id: string; ratio: number; cap: number } | null>(null);
  const [copyTarget, setCopyTarget] = useState<Trader | null>(null);
  const [killSwitchOpen, setKillSwitchOpen] = useState(false);
  const [tradeTicket, setTradeTicket] = useState({
    symbol: "R_10",
    contractType: "rise_fall" as ContractTypeId,
    direction: "rise" as Proposal["direction"],
    stake: 1,
    duration: 5,
    unit: "ticks" as DurationUnit,
    barrier: 5,
    exitOnBarrier: true,
  });
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [buying, setBuying] = useState(false);
  const [receipt, setReceipt] = useState<Proposal | null>(null);

  const tickCodes = useMemo(() => ["R_10", "R_25", "R_75", "frxEURUSD", "cryBTCUSD", "1HZ10V"], []);
  const quotes = useTicks(tickCodes, 1600);
  const symbol = SYMBOL_MAP[tradeTicket.symbol] ?? SYMBOL_MAP.R_10;
  const series = useLiveSeries(tradeTicket.symbol, 30, 2000);
  const floating = usePnlDrift(POSITIONS.reduce((s, p) => s + p.currentPnl, 0), 2500);

  const preview = useMemo(
    () =>
      buildProposal({
        symbol: tradeTicket.symbol,
        contractType: tradeTicket.contractType,
        direction: tradeTicket.direction,
        stake: tradeTicket.stake,
        duration: tradeTicket.duration,
        durationUnit: tradeTicket.unit,
        barrier: tradeTicket.contractType === "digits" || tradeTicket.contractType === "over_under" ? String(tradeTicket.barrier) : undefined,
      }),
    [tradeTicket],
  );

  const allowedUnits = CONTRACT_TYPE_MAP[tradeTicket.contractType].units;

  const bots = useMemo(() => {
    const deployed: Bot[] = (queuedBots ?? []).map((q) => ({
      id: q.id,
      name: q.name,
      strategy: q.strategy,
      symbol: q.symbol,
      contractType: q.contractType,
      stake: q.stake,
      duration: q.duration,
      durationUnit: q.durationUnit,
      martingale: 1,
      status: "paused",
      pnl: 0,
      trades: 0,
      winRate: q.winRate,
      maxStake: q.cap,
      stopLoss: q.cap * 6,
      takeProfit: q.cap * 10,
      loginId: "VRTC9031442",
      risk: q.risk,
      runtimeMinutes: 0,
      lastTradeAt: NOW_REF,
      owner: "you · this session",
    }));
    let list = [...deployed, ...BOTS];
    if (botFilter !== "all") list = list.filter((b) => b.status === botFilter);
    if (botQuery.trim()) {
      const q = botQuery.trim().toLowerCase();
      list = list.filter((b) => `${b.name} ${b.symbol} ${b.owner} ${b.strategy}`.toLowerCase().includes(q));
    }
    return list;
  }, [botFilter, botQuery, queuedBots]);

  const botTable = useDataTable<Bot>({
    rows: bots,
    searchKeys: (b) => [b.name, b.symbol, b.owner, b.strategy, b.loginId],
    sorters: {
      name: (b) => b.name,
      symbol: (b) => b.symbol,
      pnl: (b) => b.pnl,
      trades: (b) => b.trades,
      winRate: (b) => b.winRate,
      stake: (b) => b.stake,
      runtime: (b) => b.runtimeMinutes,
    },
    filterKey: (b) => b.strategy,
    filterOptions: [
      { id: "martingale", label: "Martingale" },
      { id: "dca", label: "DCA" },
      { id: "scalping", label: "Scalping" },
      { id: "swing", label: "Swing" },
      { id: "fixed", label: "Fixed" },
      { id: "accumulator", label: "Accumulator" },
      { id: "digit", label: "Digit" },
    ],
    initialPageSize: 10,
    initialSort: "pnl",
    initialDir: "desc",
  });

  const botColumns: Column<Bot>[] = [
    {
      key: "name",
      header: "Bot",
      cell: (b) => (
        <span>
          <span className="d-block fw-semibold" style={{ fontSize: "0.86rem" }}>
            {b.name}
          </span>
          <span className="dx-help">
            {b.strategy} · {b.owner}
          </span>
        </span>
      ),
    },
    { key: "symbol", header: "Symbol", cell: (b) => <span className="font-display">{b.symbol}</span> },
    {
      key: "stake",
      header: "Stake",
      align: "end",
      cell: (b) => (
        <span className="font-display">
          {usd(b.stake)}
          <span className="dx-help d-block">cap {usd(b.maxStake)}</span>
        </span>
      ),
    },
    { key: "trades", header: "Trades", align: "end", cell: (b) => <span className="font-display">{b.trades.toLocaleString("en-US")}</span>, hideOnMobile: true },
    { key: "winRate", header: "Win", align: "end", cell: (b) => <span className="font-display">{b.winRate}%</span> },
    {
      key: "pnl",
      header: "P&L",
      align: "end",
      cell: (b) => <span className={`font-display ${b.pnl >= 0 ? "dx-up" : "dx-down"}`}>{pnl(b.pnl)}</span>,
    },
    {
      key: "runtime",
      header: "Runtime",
      align: "end",
      cell: (b) => <span className="font-display">{Math.floor(b.runtimeMinutes / 60)}h {b.runtimeMinutes % 60}m</span>,
      hideOnMobile: true,
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (b) => (
        <span
          className={`dx-chip ${
            b.status === "running" ? "dx-chip-up" : b.status === "paused" ? "dx-chip-warn" : b.status === "error" ? "dx-chip-down" : "dx-chip-muted"
          }`}
        >
          {b.status === "running" ? <span className="dx-pulse" /> : null} {b.status}
        </span>
      ),
    },
    {
      header: "",
      align: "end",
      className: "dx-td-actions",
      cell: (b) => (
        <span className="d-inline-flex gap-1">
          <button
            type="button"
            className="dx-btn dx-btn-sm dx-btn-ghost"
            onClick={(e) => {
              e.stopPropagation();
              setBotDetail(b);
            }}
          >
            Logs
          </button>
          {b.status === "running" ? (
            <button
              type="button"
              className="dx-btn dx-btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                setBotAction({ bot: b, action: "pause" });
              }}
            >
              <Pause size={12} /> Pause
            </button>
          ) : (
            <button
              type="button"
              className="dx-btn dx-btn-sm dx-btn-primary"
              onClick={(e) => {
                e.stopPropagation();
                setBotAction({ bot: b, action: "start" });
              }}
            >
              <Play size={12} /> Start
            </button>
          )}
        </span>
      ),
    },
  ];

  const positions = useMemo(
    () =>
      POSITIONS.map((p) => ({
        ...p,
        currentPnl: positionStates[p.id]?.pnl ?? p.currentPnl,
        status: positionStates[p.id]?.status ?? p.status,
      })),
    [positionStates],
  );

  const posTable = useDataTable<(typeof positions)[number]>({
    rows: positions,
    searchKeys: (p) => [p.symbol, p.contractId, p.contractType, p.loginId],
    sorters: {
      symbol: (p) => p.symbol,
      stake: (p) => p.stake,
      pnl: (p) => p.currentPnl,
      expires: (p) => p.expiresAt,
      risk: (p) => p.risk,
    },
    filterKey: (p) => p.risk,
    filterOptions: [
      { id: "low", label: "Low risk" },
      { id: "medium", label: "Medium" },
      { id: "high", label: "High" },
    ],
    initialPageSize: 10,
    initialSort: "pnl",
    initialDir: "desc",
  });

  const posColumns: Column<(typeof positions)[number]>[] = [
    {
      key: "symbol",
      header: "Contract",
      cell: (p) => (
        <span>
          <span className="d-block font-display fw-semibold">{p.symbol}</span>
          <span className="dx-help">
            #{p.contractId} · {p.contractType.replace(/_/g, "/")}
          </span>
        </span>
      ),
    },
    { key: "stake", header: "Stake", align: "end", cell: (p) => <span className="font-display">{usd(p.stake)}</span> },
    {
      key: "pnl",
      header: "Floating P&L",
      align: "end",
      cell: (p) => <span className={`font-display ${p.currentPnl >= 0 ? "dx-up" : "dx-down"}`}>{pnl(p.currentPnl)}</span>,
    },
    {
      header: "Entry → now",
      align: "end",
      cell: (p) => (
        <span className="font-display">
          {fmtPrice(p.entrySpot, SYMBOL_MAP[p.symbol]?.pipSize ?? 2)}
          <span className="dx-help d-block">{fmtPrice(p.currentSpot, SYMBOL_MAP[p.symbol]?.pipSize ?? 2)}</span>
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: "risk",
      header: "Risk",
      align: "center",
      cell: (p) => <span className={`dx-chip dx-risk-${p.risk === "low" ? "low" : p.risk === "medium" ? "med" : "high"}`}>{p.risk}</span>,
    },
    {
      key: "expires",
      header: "Expiry",
      align: "end",
      cell: (p) => <span className="font-display">{fmtTime(p.expiresAt)}</span>,
      hideOnMobile: true,
    },
    {
      header: "Status",
      align: "center",
      cell: (p) => (
        <span className={`dx-chip ${p.status === "open" ? "dx-chip-up" : p.status === "pending" ? "dx-chip-info" : "dx-chip-warn"}`}>
          {p.status}
        </span>
      ),
    },
    {
      header: "",
      align: "end",
      className: "dx-td-actions",
      cell: (p) => (
        <span className="d-inline-flex gap-1">
          <button
            type="button"
            className="dx-btn dx-btn-sm dx-btn-ghost"
            onClick={(e) => {
              e.stopPropagation();
              setPositionDetail(p);
            }}
          >
            Detail
          </button>
          <button
            type="button"
            className="dx-btn dx-btn-sm dx-btn-danger"
            onClick={(e) => {
              e.stopPropagation();
              setCloseTarget(p);
            }}
            disabled={p.status === "barrier-hit"}
          >
            Close
          </button>
        </span>
      ),
    },
  ];

  const totalPnl = positions.reduce((s, p) => s + p.currentPnl, 0);
  const equity = useMemo(() => {
    const span = period === "1d" ? 14 : period === "1w" ? 22 : period === "1m" ? 34 : 48;
    return equityCurve(span, period.length * 4711, 2400, period === "1d" ? 9 : 14);
  }, [period]);

  const contractChip = (id: ContractTypeId) => CONTRACT_TYPE_MAP[id].label;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        size="full"
        title="DerivX console — simulated"
        subtitle={`${DERIV_ACCOUNTS[1].loginId} (virtual) · balance ${usd(DERIV_ACCOUNTS[1].balance)} · floating ${pnl(totalPnl)} · ${POSITIONS.length} open contracts`}
        footer={
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 w-100">
            <div className="d-flex flex-wrap align-items-center gap-2">
              <Chip tone="up" pulse>
                tick relay 12 ms
              </Chip>
              <Chip tone="muted">{bots.length} bots in view</Chip>
              <Chip tone={totalPnl >= 0 ? "up" : "down"}>floating {pnl(totalPnl)}</Chip>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => onOpenBacktests()}>
                <BarChart3 size={13} /> Backtest
              </button>
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={onOpenStatus}>
                <Activity size={13} /> API health
              </button>
              <button type="button" className="dx-btn dx-btn-sm" onClick={onClose}>
                Exit console
              </button>
            </div>
          </div>
        }
      >
        <Tabs
          tabs={[
            { id: "trade", label: "Trade", icon: <Gauge size={14} /> },
            { id: "bots", label: "Bots", icon: <BotIcon size={14} />, badge: BOTS.filter((b) => b.status === "running").length },
            { id: "portfolio", label: "Portfolio", icon: <Receipt size={14} />, badge: positions.length },
            { id: "analytics", label: "Analytics", icon: <TrendingUp size={14} /> },
            { id: "social", label: "Social", icon: <Users size={14} /> },
          ]}
          active={tab}
          onChange={(id) => setTab(id as DemoTab)}
          className="mb-4"
        />

        {tab === "trade" ? (
          <div className="row g-4">
            <div className="col-12 col-xl-5">
              <div className="dx-card dx-card-pad d-grid gap-3">
                <div className="d-flex align-items-center justify-content-between">
                  <span className="dx-eyebrow dx-eyebrow-bare mb-0">Contract ticket</span>
                  <Chip tone="info">{symbol.market}</Chip>
                </div>

                <Field label="Symbol" help={`${symbol.name} · pip ${symbol.pipSize} · min stake ${usd(symbol.minStake)}`}>
                  <select
                    className="dx-select font-display"
                    value={tradeTicket.symbol}
                    onChange={(e) => setTradeTicket({ ...tradeTicket, symbol: e.target.value })}
                  >
                    {MARKET_SYMBOLS.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.code} — {s.name} ({s.payoutPct}%)
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="dx-field">
                  <span className="dx-label">Contract type</span>
                  <div className="dx-filter-bar">
                    {CONTRACT_TYPES.filter((c) => symbol.contractTypes.includes(c.id)).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={`dx-filter-chip ${tradeTicket.contractType === c.id ? "is-active" : ""}`}
                        onClick={() =>
                          setTradeTicket({
                            ...tradeTicket,
                            contractType: c.id,
                            unit: c.units.includes(tradeTicket.unit) ? tradeTicket.unit : c.units[0],
                            duration: c.maxDuration >= tradeTicket.duration ? tradeTicket.duration : c.maxDuration,
                            direction:
                              c.id === "higher_lower" || (c.id === "touch" && tradeTicket.direction === "rise")
                                ? "higher"
                                : c.id === "digits"
                                  ? "match"
                                  : "rise",
                          })
                        }
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {["rise_fall", "higher_lower", "touch", "lookback", "multiplier", "digits", "over_under", "even_odd"].includes(
                  tradeTicket.contractType,
                ) ? (
                  <div className="dx-field">
                    <span className="dx-label">Direction</span>
                    <div className="dx-quick-btns">
                      {(tradeTicket.contractType === "higher_lower" || tradeTicket.contractType === "touch"
                        ? (["higher", "lower"] as Proposal["direction"][])
                        : tradeTicket.contractType === "digits"
                          ? (["match", "differ"] as Proposal["direction"][])
                          : tradeTicket.contractType === "over_under"
                            ? (["higher", "lower"] as Proposal["direction"][])
                            : tradeTicket.contractType === "even_odd"
                              ? (["differ", "match"] as Proposal["direction"][])
                              : (["rise", "fall"] as Proposal["direction"][])
                      ).map((d) => (
                        <button
                          key={d}
                          type="button"
                          className={`dx-filter-chip ${tradeTicket.direction === d ? "is-active" : ""}`}
                          onClick={() => setTradeTicket({ ...tradeTicket, direction: d })}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="row g-3">
                  <div className="col-6">
                    <Field label="Stake (USD)" help={`${usd(symbol.minStake)} – ${usd(symbol.maxStake, 0)}`}>
                      <input
                        className="dx-input dx-input-num"
                        type="number"
                        min={symbol.minStake}
                        step={0.35}
                        value={tradeTicket.stake}
                        onChange={(e) => setTradeTicket({ ...tradeTicket, stake: Math.max(symbol.minStake, Number(e.target.value)) })}
                      />
                    </Field>
                  </div>
                  <div className="col-6">
                    <Field label="Duration">
                      <div className="dx-input-group">
                        <input
                          className="dx-input dx-input-num"
                          type="number"
                          min={CONTRACT_TYPE_MAP[tradeTicket.contractType].minDuration}
                          max={CONTRACT_TYPE_MAP[tradeTicket.contractType].maxDuration}
                          value={tradeTicket.duration}
                          onChange={(e) => setTradeTicket({ ...tradeTicket, duration: Math.max(1, Number(e.target.value)) })}
                        />
                        <select
                          className="dx-select"
                          style={{ maxWidth: 120 }}
                          value={tradeTicket.unit}
                          onChange={(e) => setTradeTicket({ ...tradeTicket, unit: e.target.value as DurationUnit })}
                        >
                          {DURATION_UNITS.filter((u) => allowedUnits.includes(u.id)).map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </Field>
                  </div>
                </div>

                <div className="dx-quick-btns">
                  {QUICK_STAKES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`dx-filter-chip ${tradeTicket.stake === s ? "is-active" : ""}`}
                      onClick={() => setTradeTicket({ ...tradeTicket, stake: s })}
                    >
                      ${s}
                    </button>
                  ))}
                </div>

                {tradeTicket.contractType === "digits" || tradeTicket.contractType === "over_under" ? (
                  <Field label="Barrier (last digit)" help="Predict the final digit of the exit tick.">
                    <div className="dx-quick-btns">
                      {Array.from({ length: 10 }).map((_, d) => (
                        <button
                          key={d}
                          type="button"
                          className={`dx-filter-chip ${tradeTicket.barrier === d ? "is-active" : ""}`}
                          onClick={() => setTradeTicket({ ...tradeTicket, barrier: d })}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </Field>
                ) : null}

                <Toggle
                  checked={tradeTicket.exitOnBarrier}
                  onChange={(v) => setTradeTicket({ ...tradeTicket, exitOnBarrier: v })}
                  label="Stop-loss safety in the worker"
                  hint="Pauses the bot if this ticket's strategy breaches the cap."
                />

                <button
                  type="button"
                  className="dx-btn dx-btn-primary dx-btn-block"
                  onClick={() => {
                    setProposal(preview);
                    setReceipt(null);
                  }}
                >
                  Get proposal · {usd(preview.stake)} → {usd(preview.payout)}
                </button>
                <p className="dx-help mb-0">
                  Direction: <span className="font-display">{tradeTicket.direction}</span> · {contractChip(tradeTicket.contractType)} ·{" "}
                  {fmtDurLong(tradeTicket.duration, tradeTicket.unit)} · barrier{" "}
                  {preview.barrier ?? CONTRACT_TYPE_MAP[tradeTicket.contractType].barrier}
                </p>
              </div>
            </div>

            <div className="col-12 col-xl-7">
              <div className="d-grid gap-3">
                <div className="dx-card dx-card-pad">
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                    <div>
                      <div className="dx-kpi-label">{symbol.name} · live</div>
                      <PriceFlash
                        value={fmtPrice(quotes[tradeTicket.symbol]?.quote ?? symbol.basePrice, symbol.pipSize)}
                        dir={quotes[tradeTicket.symbol]?.dir ?? "flat"}
                        className="dx-kpi-value"
                      />
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      <Chip tone={symbol.open ? "up" : "warn"}>{symbol.open ? "open" : "closed"}</Chip>
                      <Chip tone="muted">spread {symbol.spread.toFixed(symbol.pipSize)}</Chip>
                      <Chip tone="up">{symbol.payoutPct}% base payout</Chip>
                    </div>
                  </div>
                  <Sparkline data={series} tone="accent" height={86} ariaLabel="Live tick series" />
                  <div className="d-flex justify-content-between mt-2">
                    <span className="dx-help">30-tick window · simulated stream</span>
                    <button type="button" className="dx-btn-link" onClick={onOpenStatus}>
                      stream diagnostics →
                    </button>
                  </div>
                </div>

                <div className="row g-3">
                  {tickCodes.slice(0, 4).map((code) => {
                    const s = SYMBOL_MAP[code];
                    const q = quotes[code];
                    if (!s || !q) return null;
                    return (
                      <div className="col-6 col-lg-3" key={code}>
                        <button
                          type="button"
                          className="dx-card-inset dx-card-hover w-100 text-start"
                          onClick={() => setTradeTicket({ ...tradeTicket, symbol: code })}
                        >
                          <div className="dx-kpi-label">{s.short}</div>
                          <PriceFlash value={fmtPrice(q.quote, s.pipSize)} dir={q.dir} />
                          <div className={`dx-help ${q.changePct >= 0 ? "dx-up" : "dx-down"}`}>{pct(q.changePct, 2, true)}</div>
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="dx-card dx-card-flush">
                  <div className="dx-card-head">
                    <div>
                      <h4 className="dx-card-title">Payout ladder</h4>
                      <p className="dx-card-sub">Same contract at different stakes — Deriv asks, not guesses</p>
                    </div>
                    <Chip tone="muted">{fmtDur(tradeTicket.duration, tradeTicket.unit)}</Chip>
                  </div>
                  <div className="dx-table-wrap" style={{ border: 0, borderRadius: 0 }}>
                    <table className="dx-table dx-table-sm">
                      <thead>
                        <tr>
                          <th scope="col">Stake</th>
                          <th scope="col" className="dx-td-num">
                            Payout
                          </th>
                          <th scope="col" className="dx-td-num">
                            Profit
                          </th>
                          <th scope="col" className="dx-td-num">
                            Payout %
                          </th>
                          <th scope="col" className="dx-td-actions">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {QUICK_STAKES.slice(0, 6).map((s) => {
                          const p = buildProposal({
                            symbol: tradeTicket.symbol,
                            contractType: tradeTicket.contractType,
                            direction: tradeTicket.direction,
                            stake: s,
                            duration: tradeTicket.duration,
                            durationUnit: tradeTicket.unit,
                          });
                          return (
                            <tr key={s}>
                              <td className="font-display">{usd(s)}</td>
                              <td className="dx-td-num font-display">{usd(p.payout)}</td>
                              <td className="dx-td-num font-display dx-up">{pnl(p.profit)}</td>
                              <td className="dx-td-num font-display">{(((p.payout - s) / s) * 100).toFixed(1)}%</td>
                              <td className="dx-td-actions">
                                <button
                                  type="button"
                                  className="dx-btn dx-btn-sm dx-btn-ghost"
                                  onClick={() => {
                                    setTradeTicket({ ...tradeTicket, stake: s });
                                    setProposal(p);
                                    setReceipt(null);
                                  }}
                                >
                                  Propose
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {tab === "bots" ? (
          <div className="row g-4">
            <div className="col-12 col-xl-8">
              <div className="dx-card dx-card-flush">
                <div className="dx-card-head flex-wrap">
                  <div className="d-flex flex-wrap align-items-center gap-2">
                    <SearchInput value={botQuery} onChange={setBotQuery} placeholder="Search bots, owners, symbols…" />
                    <FilterChips
                      options={[
                        { id: "running", label: "Running" },
                        { id: "paused", label: "Paused" },
                        { id: "stopped", label: "Stopped" },
                        { id: "error", label: "Error" },
                      ]}
                      value={botFilter}
                      onChange={setBotFilter}
                      allLabel="All statuses"
                    />
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => onOpenLeaderboard()}>
                      <Users size={13} /> Copy a trader
                    </button>
                    <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => onOpenPresets()}>
                      <Rocket size={13} /> Deploy new bot
                    </button>
                  </div>
                </div>
                <DataTable
                  columns={botColumns}
                  state={botTable}
                  rowKey={(b) => b.id}
                  onRowClick={(b) => setBotDetail(b)}
                  ariaLabel="Bot fleet"
                />
              </div>
            </div>
            <div className="col-12 col-xl-4">
              <div className="dx-card dx-card-pad h-100">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="dx-kpi-label mb-0">Live worker tape</span>
                  <span className="dx-pulse" />
                </div>
                <TerminalPreview lines={BOT_LOGS} animate height={260} />
                <div className="d-flex flex-wrap gap-2 mt-3">
                  <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => onOpenBacktests("pre_mart_vol10")}>
                    Backtest martingale
                  </button>
                  <button
                    type="button"
                    className="dx-btn dx-btn-sm dx-btn-ghost"
                    onClick={() => onOpenCommunity("com_bots")}
                  >
                    Discuss configs
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {tab === "portfolio" ? (
          <div className="row g-4">
            <div className="col-12 col-xl-8">
              <div className="dx-card dx-card-flush">
                <div className="dx-card-head flex-wrap">
                  <div>
                    <h4 className="dx-card-title">Open contracts</h4>
                    <p className="dx-card-sub">
                      {positions.length} positions · floating{" "}
                      <span className={`font-display ${totalPnl >= 0 ? "dx-up" : "dx-down"}`}>{pnl(floating)}</span>
                    </p>
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    <FilterChips
                      options={[
                        { id: "low", label: "Low risk" },
                        { id: "medium", label: "Medium" },
                        { id: "high", label: "High" },
                      ]}
                      value={posTable.filter}
                      onChange={posTable.setFilter}
                      allLabel="All risk"
                    />
                    <SearchInput value={posTable.query} onChange={posTable.setQuery} placeholder="Contract, symbol…" />
                  </div>
                </div>
                <DataTable
                  columns={posColumns}
                  state={posTable}
                  rowKey={(p) => p.id}
                  onRowClick={(p) => setPositionDetail(p)}
                  ariaLabel="Open contracts"
                />
              </div>
            </div>
            <div className="col-12 col-xl-4">
              <div className="d-grid gap-3">
                <div className="dx-card dx-card-pad">
                  <div className="dx-kpi-label mb-2">Exposure by symbol</div>
                  <div className="d-grid gap-2">
                    {["R_10", "R_75", "frxEURUSD", "cryBTCUSD"].map((code) => {
                      const stake = positions.filter((p) => p.symbol === code).reduce((s, p) => s + p.stake, 0);
                      const total = positions.reduce((s, p) => s + p.stake, 0);
                      return (
                        <div key={code}>
                          <div className="d-flex justify-content-between">
                            <span className="dx-help font-display">{code}</span>
                            <span className="dx-help font-display">{usd(stake)}</span>
                          </div>
                          <Progress value={total ? (stake / total) * 100 : 0} />
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="dx-card dx-card-pad">
                  <div className="dx-kpi-label mb-2">Risk guard rails</div>
                  <ul className="dx-help mb-0 ps-3 d-grid gap-1">
                    <li>Max concurrent contracts: 3 (2 in use)</li>
                    <li>Daily stop-loss: {usd(150)} · realised {pnl(-42.4)}</li>
                    <li>Exposure ceiling: {usd(400)} · current {usd(positions.reduce((s, p) => s + p.stake, 0))}</li>
                    <li>Auto-pause after 5 consecutive losses: on</li>
                  </ul>
                  <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost mt-3" onClick={onOpenPresets}>
                    Adjust caps in a preset
                  </button>
                </div>
                <div className="dx-card dx-card-pad">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <ShieldAlert size={14} className="dx-warn-text" />
                    <span className="dx-kpi-label mb-0">Copy relay</span>
                  </div>
                  {copiedTrader ? (
                    <div className="d-grid gap-2">
                      <p className="dx-help mb-0">
                        Mirroring <strong>{TRADERS.find((t) => t.id === copiedTrader.id)?.displayName}</strong> at{" "}
                        <span className="font-display">{copiedTrader.ratio}x</span> · cap{" "}
                        <span className="font-display">{usd(copiedTrader.cap)}</span>
                      </p>
                      <button type="button" className="dx-btn dx-btn-sm dx-btn-danger" onClick={() => setKillSwitchOpen(true)}>
                        <Ban size={13} /> Kill switch
                      </button>
                    </div>
                  ) : (
                    <p className="dx-help mb-0">No relay active. Open the Social tab to mirror a ranked trader.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {tab === "analytics" ? (
          <div className="row g-4">
            <div className="col-12 col-lg-8">
              <div className="dx-card dx-card-pad">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                  <div>
                    <div className="dx-kpi-label">Simulated equity · {period}</div>
                    <div className="font-display dx-h-card">{usd(equity[equity.length - 1])}</div>
                  </div>
                  <div className="d-flex flex-wrap align-items-center gap-2">
                    <MiniTabs
                      options={[
                        { id: "1d", label: "1D" },
                        { id: "1w", label: "1W" },
                        { id: "1m", label: "1M" },
                        { id: "all", label: "All" },
                      ]}
                      value={period}
                      onChange={setPeriod}
                      ariaLabel="Analytics period"
                    />
                    <Chip tone="up">{pct(((equity[equity.length - 1] - equity[0]) / equity[0]) * 100, 1)}</Chip>
                  </div>
                </div>
                <LineChart data={equity} height={220} yFormat={(v) => usd(v, 0)} ariaLabel="Console equity curve" />
              </div>
            </div>
            <div className="col-12 col-lg-4">
              <div className="d-grid gap-3">
                <div className="dx-card dx-card-pad">
                  <DonutStat value={62.4} label="win rate" sublabel="1,284 settled contracts in the simulated month." />
                </div>
                <div className="dx-card dx-card-pad">
                  <div className="dx-kpi-label mb-2">Digit distribution (1,000 ticks · R_10)</div>
                  <DigitBars counts={[9.8, 10.2, 9.6, 10.4, 9.9, 11.2, 9.4, 10.1, 9.7, 9.7]} active={5} />
                </div>
              </div>
            </div>
            <div className="col-12">
              <div className="dx-card dx-card-pad">
                <div className="dx-kpi-label mb-2">Recent backtests</div>
                <div className="dx-table-wrap dx-table-scroll">
                  <table className="dx-table dx-table-sm dx-table-stack">
                    <thead>
                      <tr>
                        <th scope="col">Preset</th>
                        <th scope="col">Symbol</th>
                        <th scope="col">Period</th>
                        <th scope="col" className="dx-td-num">
                          Trades
                        </th>
                        <th scope="col" className="dx-td-num">
                          Win
                        </th>
                        <th scope="col" className="dx-td-num">
                          P&amp;L
                        </th>
                        <th scope="col" className="dx-td-num">
                          Max DD
                        </th>
                        <th scope="col" className="dx-td-actions">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {BACKTESTS.slice(0, 6).map((b) => (
                        <tr key={b.id}>
                          <td data-label="Preset">{b.preset}</td>
                          <td data-label="Symbol" className="font-display">
                            {b.symbol}
                          </td>
                          <td data-label="Period" className="font-display">
                            {b.period}
                          </td>
                          <td data-label="Trades" className="dx-td-num font-display">
                            {b.trades.toLocaleString("en-US")}
                          </td>
                          <td data-label="Win" className="dx-td-num font-display">
                            {b.winRate}%
                          </td>
                          <td data-label="P&L" className="dx-td-num">
                            <span className={b.pnl >= 0 ? "dx-up" : "dx-down"}>{pnl(b.pnl)}</span>
                          </td>
                          <td data-label="Max DD" className="dx-td-num font-display">
                            {usd(b.maxDrawdown)}
                          </td>
                          <td data-label="Action" className="dx-td-actions">
                            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => onOpenBacktests(`${b.symbol}`)}>
                              Re-run
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="d-flex flex-wrap gap-2 mt-3">
                  <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => onOpenBacktests()}>
                    Open the backtest runner
                  </button>
                  <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => onOpenPresets()}>
                    Deploy a preset
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {tab === "social" ? (
          <div className="row g-4">
            <div className="col-12 col-xl-7">
              <div className="dx-card dx-card-flush">
                <div className="dx-card-head">
                  <div>
                    <h4 className="dx-card-title">Copy candidates</h4>
                    <p className="dx-card-sub">Ranked by 30-day realised P&amp;L · statements reconciled against Deriv</p>
                  </div>
                  <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => onOpenLeaderboard()}>
                    Full leaderboard
                  </button>
                </div>
                <div className="dx-card-body">
                  <div className="dx-list">
                    {TRADERS.slice(0, 7).map((t) => (
                      <div key={t.id} className="dx-list-row">
                        <Avatar name={t.displayName} tone={t.rank <= 3 ? "teal" : "blue"} />
                        <span className="flex-grow-1 min-w-0">
                          <span className="d-block fw-semibold text-truncate" style={{ fontSize: "0.86rem" }}>
                            {t.flag} {t.displayName}
                          </span>
                          <span className="dx-help d-block text-truncate">
                            {t.strategy} · {t.winRate}% win · {t.copies} copiers ·{" "}
                            <span className={t.risk === "high" ? "dx-down" : t.risk === "medium" ? "dx-warn-text" : "dx-up"}>{t.risk} risk</span>
                          </span>
                        </span>
                        <span className="text-end me-2">
                          <span className={`d-block font-display ${t.pnl30d >= 0 ? "dx-up" : "dx-down"}`}>{pnl(t.pnl30d)}</span>
                          <span className="dx-help">30d</span>
                        </span>
                        {copiedTrader?.id === t.id ? (
                          <span className="dx-chip dx-chip-up">
                            <BadgeCheck size={12} /> copying {copiedTrader.ratio}x
                          </span>
                        ) : (
                          <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => setCopyTarget(t)}>
                            <Copy size={12} /> Copy
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-12 col-xl-5">
              <div className="d-grid gap-3">
                <div className="dx-card dx-card-pad">
                  <div className="dx-kpi-label mb-2">Relay status</div>
                  {copiedTrader ? (
                    <div className="d-grid gap-2">
                      <div className="d-flex justify-content-between">
                        <span className="dx-help">Trader</span>
                        <span className="font-display">{TRADERS.find((t) => t.id === copiedTrader.id)?.displayName}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="dx-help">Stake ratio</span>
                        <span className="font-display">{copiedTrader.ratio}x</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="dx-help">Loss cap</span>
                        <span className="font-display">{usd(copiedTrader.cap)}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="dx-help">Mirrored legs</span>
                        <span className="font-display">2 open</span>
                      </div>
                      <button type="button" className="dx-btn dx-btn-sm dx-btn-danger mt-2" onClick={() => setKillSwitchOpen(true)}>
                        <Ban size={13} /> Kill switch
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="dx-help">
                        No relay running. Copying replays another trader's contract requests at your own stake ratio — with an
                        independent loss cap.
                      </p>
                      <button type="button" className="dx-btn dx-btn-sm" onClick={() => setCopyTarget(TRADERS[0])}>
                        Start with {TRADERS[0].displayName}
                      </button>
                    </>
                  )}
                </div>
                <div className="dx-card dx-card-pad">
                  <div className="dx-kpi-label mb-2">Recent mirrored fills</div>
                  <div className="dx-list">
                    {TRADES.slice(0, 4).map((t) => (
                      <div key={t.id} className="dx-list-row">
                        <span className="dx-help font-display">{fmtTime(t.closedAt)}</span>
                        <span className="flex-grow-1">
                          <span className="d-block" style={{ fontSize: "0.8rem" }}>
                            {t.symbol} · {t.contractType.replace(/_/g, "/")}
                          </span>
                          <span className="dx-help font-display">#{t.contractId}</span>
                        </span>
                        <span className={`font-display ${t.profit >= 0 ? "dx-up" : "dx-down"}`}>{pnl(t.profit)}</span>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost mt-3" onClick={() => onOpenCommunity("com_general")}>
                    Ask the crowd about this relay
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Dialog>

      {/* Proposal → confirm → buy → receipt */}
      <Dialog
        open={Boolean(proposal) && !receipt}
        onClose={() => setProposal(null)}
        size="md"
        title="Contract proposal"
        subtitle={`${proposal?.symbol} · ${proposal ? CONTRACT_TYPE_MAP[proposal.contractType].label : ""} · id ${proposal?.id ?? ""}`}
        footer={
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 w-100">
            <span className="dx-help font-display">idempotency {proposal?.idempotencyKey}</span>
            <div className="d-flex gap-2">
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setProposal(null)}>
                Decline
              </button>
              <button
                type="button"
                className="dx-btn dx-btn-sm dx-btn-primary"
                disabled={buying}
                onClick={() => {
                  setBuying(true);
                  window.setTimeout(() => {
                    setBuying(false);
                    const p = proposal;
                    if (!p) return;
                    setReceipt({ ...p, id: `ctr_${p.id.slice(5)}` });
                    onContractBought({ contractId: p.id.replace("prop_", ""), symbol: p.symbol, stake: p.stake, payout: p.payout });
                  }, 1500);
                }}
              >
                {buying ? (
                  <>
                    <span className="dx-spin">
                      <Zap size={13} />
                    </span>{" "}
                    Buying at {usd(proposal?.askPrice ?? 0)}…
                  </>
                ) : (
                  <>
                    <Zap size={13} /> Confirm &amp; buy {usd(proposal?.stake ?? 0)}
                  </>
                )}
              </button>
            </div>
          </div>
        }
      >
        {proposal ? (
          <div className="d-grid gap-3">
            <div className="row g-3">
              {[
                { k: "Stake", v: usd(proposal.stake) },
                { k: "Payout", v: usd(proposal.payout) },
                { k: "Potential profit", v: pnl(proposal.profit) },
                { k: "Entry spot", v: fmtPrice(proposal.entrySpot, symbol.pipSize) },
                { k: "Duration", v: fmtDur(proposal.duration, proposal.durationUnit) },
                { k: "Barrier", v: proposal.barrier ?? CONTRACT_TYPE_MAP[proposal.contractType].barrier },
              ].map((row) => (
                <div className="col-6" key={row.k}>
                  <div className="dx-card-inset">
                    <div className="dx-kpi-label">{row.k}</div>
                    <div className="font-display fw-semibold">{row.v}</div>
                  </div>
                </div>
              ))}
            </div>
            <Alert tone="info" title="Prices move">
              The ask price is re-quoted at the moment of purchase. The worker will reject the order if the payout drops more than
              0.4% below this proposal.
            </Alert>
            <div className="d-flex flex-wrap gap-2">
              <CopyButton text={`${proposal.symbol} ${proposal.contractType} ${proposal.direction} stake ${proposal.stake}`} label="Copy proposal" />
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={onOpenStatus}>
                Check the trading endpoints
              </button>
            </div>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={Boolean(receipt)}
        onClose={() => {
          setReceipt(null);
          setProposal(null);
        }}
        size="md"
        title="Contract bought"
        subtitle={`${receipt?.symbol ?? ""} · ${receipt ? CONTRACT_TYPE_MAP[receipt.contractType].label : ""} · settled in ${receipt ? fmtDurLong(receipt.duration, receipt.durationUnit) : ""}`}
        footer={
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 w-100">
            <span className="dx-help">Receipt is also written to the portfolio audit log.</span>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="dx-btn dx-btn-sm dx-btn-ghost"
                onClick={() => {
                  setReceipt(null);
                  setProposal(null);
                  setTab("portfolio");
                }}
              >
                Track in portfolio
              </button>
              <button
                type="button"
                className="dx-btn dx-btn-sm dx-btn-primary"
                onClick={() => {
                  setReceipt(null);
                  setProposal(null);
                }}
              >
                <CheckCircle2 size={13} /> Done
              </button>
            </div>
          </div>
        }
      >
        {receipt ? (
          <div className="d-grid gap-3">
            <Alert tone="up" title={`Contract #${receipt.id.replace("ctr_", "")} opened`}>
              Entry spot {fmtPrice(receipt.entrySpot, symbol.pipSize)} · payout {usd(receipt.payout)} · expiring{" "}
              {new Date(receipt.expiresAt).toISOString().slice(11, 19)}Z.
            </Alert>
            <div className="row g-3">
              {[
                { k: "Contract ID", v: receipt.id.replace("ctr_", "") },
                { k: "Symbol", v: receipt.symbol },
                { k: "Direction", v: receipt.direction },
                { k: "Stake", v: usd(receipt.stake) },
                { k: "Payout", v: usd(receipt.payout) },
                { k: "Barrier", v: receipt.barrier ?? "spot vs spot" },
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
              <CopyButton text={`Contract ${receipt.id.replace("ctr_", "")} · ${receipt.symbol} · stake ${receipt.stake} · payout ${receipt.payout}`} label="Copy receipt" />
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => onOpenPresets()}>
                Automate this setup
              </button>
            </div>
          </div>
        ) : null}
      </Dialog>

      {/* Bot detail drawer */}
      <Drawer
        open={Boolean(botDetail)}
        onClose={() => setBotDetail(null)}
        wide
        title={botDetail?.name ?? "Bot"}
        subtitle={botDetail ? `${botDetail.symbol} · ${botDetail.strategy} · owner ${botDetail.owner} · ${botDetail.loginId}` : ""}
        footer={
          botDetail ? (
            <div className="d-flex flex-wrap gap-2 w-100">
              {botDetail.status === "running" ? (
                <>
                  <button type="button" className="dx-btn dx-btn-sm" onClick={() => setBotAction({ bot: botDetail, action: "pause" })}>
                    <Pause size={13} /> Pause
                  </button>
                  <button type="button" className="dx-btn dx-btn-sm dx-btn-danger" onClick={() => setBotAction({ bot: botDetail, action: "stop" })}>
                    <CircleStop size={13} /> Stop bot
                  </button>
                </>
              ) : (
                <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => setBotAction({ bot: botDetail, action: "start" })}>
                  <Play size={13} /> Start bot
                </button>
              )}
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => onOpenBacktests(botDetail.id)}>
                <BarChart3 size={13} /> Backtest
              </button>
            </div>
          ) : null
        }
      >
        {botDetail ? (
          <div className="d-grid gap-4">
            <div className="d-flex flex-wrap gap-2">
              <Chip tone={botDetail.status === "running" ? "up" : botDetail.status === "error" ? "down" : "warn"} pulse={botDetail.status === "running"}>
                {botDetail.status}
              </Chip>
              <Chip tone={botDetail.risk === "low" ? "up" : botDetail.risk === "medium" ? "warn" : "down"}>risk {botDetail.risk}</Chip>
              <Chip tone="muted">{botDetail.contractType.replace(/_/g, "/")}</Chip>
              <Chip tone="info">runtime {Math.floor(botDetail.runtimeMinutes / 60)}h {botDetail.runtimeMinutes % 60}m</Chip>
            </div>

            <div className="row g-3">
              {[
                { k: "P&L", v: pnl(botDetail.pnl) },
                { k: "Trades", v: botDetail.trades.toLocaleString("en-US") },
                { k: "Win rate", v: `${botDetail.winRate}%` },
                { k: "Base stake", v: usd(botDetail.stake) },
                { k: "Martingale", v: `${botDetail.martingale}x` },
                { k: "Stake cap", v: usd(botDetail.maxStake) },
                { k: "Stop-loss", v: usd(botDetail.stopLoss) },
                { k: "Take profit", v: usd(botDetail.takeProfit) },
              ].map((row) => (
                <div className="col-6 col-lg-3" key={row.k}>
                  <div className="dx-card-inset">
                    <div className="dx-kpi-label">{row.k}</div>
                    <div className="font-display fw-semibold">{row.v}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="dx-card-inset">
              <div className="dx-kpi-label mb-2">Worker log (last 10 entries)</div>
              <TerminalPreview lines={BOT_LOGS} height={200} />
            </div>

            <div className="dx-card-inset">
              <div className="dx-kpi-label mb-2">Recent contracts</div>
              <div className="dx-table-wrap">
                <table className="dx-table dx-table-sm dx-table-stack">
                  <thead>
                    <tr>
                      <th scope="col">Time</th>
                      <th scope="col">Symbol</th>
                      <th scope="col" className="dx-td-num">
                        Stake
                      </th>
                      <th scope="col" className="dx-td-num">
                        Result
                      </th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TRADES.filter((t) => t.botId === botDetail.id || t.symbol === botDetail.symbol)
                      .slice(0, 6)
                      .map((t) => (
                        <tr key={t.id}>
                          <td data-label="Time" className="font-display">
                            {fmtTime(t.closedAt)}
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
                          <td data-label="Status">
                            <span className={`dx-chip ${t.status === "won" ? "dx-chip-up" : t.status === "lost" ? "dx-chip-down" : "dx-chip-muted"}`}>
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    {TRADES.filter((t) => t.botId === botDetail.id || t.symbol === botDetail.symbol).length === 0 ? (
                      <tr>
                        <td colSpan={5} data-label="Contracts" className="dx-help text-center">
                          No settled contracts for this worker yet in the simulated window.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* Bot start/pause/stop confirmation */}
      <Dialog
        open={Boolean(botAction)}
        onClose={() => setBotAction(null)}
        size="sm"
        title={
          botAction
            ? botAction.action === "start"
              ? "Start this bot?"
              : botAction.action === "pause"
                ? "Pause this bot?"
                : "Stop this bot?"
            : ""
        }
        subtitle={botAction ? `${botAction.bot.name} · ${botAction.bot.symbol} · ${usd(botAction.bot.stake)} base stake` : ""}
        footer={
          <div className="d-flex justify-content-between gap-2 w-100">
            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setBotAction(null)}>
              Cancel
            </button>
            <button
              type="button"
              className={`dx-btn dx-btn-sm ${botAction?.action === "stop" ? "dx-btn-danger" : "dx-btn-primary"}`}
              onClick={() => {
                if (botAction) setBotDetail({ ...botAction.bot, status: botAction.action === "start" ? "running" : botAction.action === "pause" ? "paused" : "stopped" });
                setBotAction(null);
              }}
            >
              {botAction?.action === "start" ? (
                <>
                  <Play size={13} /> Start
                </>
              ) : botAction?.action === "pause" ? (
                <>
                  <Pause size={13} /> Pause
                </>
              ) : (
                <>
                  <CircleStop size={13} /> Stop
                </>
              )}
            </button>
          </div>
        }
      >
        {botAction ? (
          <div className="d-grid gap-3">
            <p className="dx-help mb-0">
              {botAction.action === "start"
                ? "The worker subscribes to the tick feed and places contracts at the configured stake until the cap, stop-loss or your pause."
                : botAction.action === "pause"
                  ? "Open contracts keep running to expiry. New orders are blocked until you resume."
                  : "Open contracts settle normally; the worker is removed from the queue and will need a fresh start."}
            </p>
            <div className="dx-card-inset">
              <div className="d-flex justify-content-between">
                <span className="dx-help">Stake cap</span>
                <span className="font-display">{usd(botAction.bot.maxStake)}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="dx-help">Stop-loss</span>
                <span className="font-display">{usd(botAction.bot.stopLoss)}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="dx-help">Current P&L</span>
                <span className={`font-display ${botAction.bot.pnl >= 0 ? "dx-up" : "dx-down"}`}>{pnl(botAction.bot.pnl)}</span>
              </div>
            </div>
          </div>
        ) : null}
      </Dialog>

      {/* Position detail drawer */}
      <Drawer
        open={Boolean(positionDetail)}
        onClose={() => setPositionDetail(null)}
        title={positionDetail ? `${positionDetail.symbol} · #${positionDetail.contractId}` : ""}
        subtitle={positionDetail ? `${positionDetail.contractType.replace(/_/g, "/")} · ${positionDetail.loginId}` : ""}
        footer={
          positionDetail ? (
            <div className="d-flex flex-wrap gap-2 w-100">
              <button type="button" className="dx-btn dx-btn-sm dx-btn-danger" onClick={() => setCloseTarget(positionDetail)} disabled={positionDetail.status === "barrier-hit"}>
                Close early
              </button>
              <CopyButton text={`#${positionDetail.contractId} ${positionDetail.symbol} stake ${positionDetail.stake}`} label="Copy contract" />
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={onOpenStatus}>
                Execution quality
              </button>
            </div>
          ) : null
        }
      >
        {positionDetail ? (
          <div className="d-grid gap-4">
            <div className="row g-3">
              {[
                { k: "Stake", v: usd(positionDetail.stake) },
                { k: "Payout", v: usd(positionDetail.payout) },
                { k: "Floating P&L", v: pnl(positionDetail.currentPnl) },
                { k: "Entry spot", v: fmtPrice(positionDetail.entrySpot, SYMBOL_MAP[positionDetail.symbol]?.pipSize ?? 2) },
                { k: "Current spot", v: fmtPrice(positionDetail.currentSpot, SYMBOL_MAP[positionDetail.symbol]?.pipSize ?? 2) },
                { k: "Barrier", v: positionDetail.barrier ?? "spot vs spot" },
                { k: "Opened", v: fmtTime(positionDetail.openedAt) },
                { k: "Expires", v: fmtTime(positionDetail.expiresAt) },
                { k: "Multiplier", v: positionDetail.multiplier ? `${positionDetail.multiplier}x` : "—" },
                { k: "Risk band", v: positionDetail.risk },
              ].map((row) => (
                <div className="col-6" key={row.k}>
                  <div className="dx-card-inset">
                    <div className="dx-kpi-label">{row.k}</div>
                    <div className="font-display fw-semibold">{row.v}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="dx-card-inset">
              <div className="dx-kpi-label mb-2">Distance to barrier</div>
              <Progress
                value={Math.min(
                  100,
                  60 +
                    ((positionDetail.currentPnl >= 0 ? 1 : -1) *
                      Math.abs(positionDetail.currentSpot - positionDetail.entrySpot) /
                      Math.max(0.00001, Math.abs(positionDetail.entrySpot)) *
                      10000),
                )}
              />
              <p className="dx-help mt-2 mb-0">
                {positionDetail.barrier
                  ? `Barrier at ${positionDetail.barrier}. Settlement uses Deriv's tick feed, not this preview.`
                  : "No barrier on this contract type — settlement is entry spot versus exit spot."}
              </p>
            </div>

            <div className="d-flex flex-wrap gap-2">
              <Chip tone={positionDetail.status === "open" ? "up" : positionDetail.status === "pending" ? "info" : "warn"}>
                {positionDetail.status}
              </Chip>
              {positionDetail.botId ? <Chip tone="accent">managed by {positionDetail.botId}</Chip> : <Chip tone="muted">manual trade</Chip>}
              <Chip tone="muted">{positionDetail.direction}</Chip>
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* Close early confirmation */}
      <Dialog
        open={Boolean(closeTarget)}
        onClose={() => setCloseTarget(null)}
        size="sm"
        title="Close this contract early?"
        subtitle={closeTarget ? `#${closeTarget.contractId} · ${closeTarget.symbol} · stake ${usd(closeTarget.stake)}` : ""}
        footer={
          <div className="d-flex justify-content-between gap-2 w-100">
            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setCloseTarget(null)}>
              Keep running
            </button>
            <button
              type="button"
              className="dx-btn dx-btn-sm dx-btn-danger"
              onClick={() => {
                if (!closeTarget) return;
                const id = closeTarget.id;
                const exitPnl = Math.round((closeTarget.currentPnl - closeTarget.stake * 0.02) * 100) / 100;
                setPositionStates((prev) => ({ ...prev, [id]: { pnl: exitPnl, status: "barrier-hit" } }));
                if (positionDetail?.id === id) setPositionDetail(null);
                setCloseTarget(null);
              }}
            >
              <XCircle size={13} /> Sell at market
            </button>
          </div>
        }
      >
        {closeTarget ? (
          <div className="d-grid gap-3">
            <Alert tone="warn" title="Early close is a market action">
              Deriv quotes a sell price the moment you confirm. You stop tracking the underlying — no profit beyond the current quote,
              and any bid/ask spread is deducted.
            </Alert>
            <div className="dx-card-inset">
              <div className="d-flex justify-content-between">
                <span className="dx-help">Current quote</span>
                <span className={`font-display ${closeTarget.currentPnl >= 0 ? "dx-up" : "dx-down"}`}>{pnl(closeTarget.currentPnl)}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="dx-help">Estimated after 2% spread</span>
                <span className="font-display">{pnl(closeTarget.currentPnl - closeTarget.stake * 0.02)}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="dx-help">Action</span>
                <span className="font-display">sell at market</span>
              </div>
            </div>
          </div>
        ) : null}
      </Dialog>

      {/* Copy wizard + kill switch */}
      <CopySetupWizard
        open={Boolean(copyTarget)}
        onClose={() => setCopyTarget(null)}
        trader={copyTarget}
        onCopied={(id, ratio, cap) => setCopiedTrader({ id, ratio, cap })}
      />

      <Dialog
        open={killSwitchOpen}
        onClose={() => setKillSwitchOpen(false)}
        size="sm"
        title="Release every mirrored leg?"
        subtitle="The copy relay stops and all copied contracts are sold at market."
        footer={
          <div className="d-flex justify-content-between gap-2 w-100">
            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setKillSwitchOpen(false)}>
              Keep copying
            </button>
            <button
              type="button"
              className="dx-btn dx-btn-sm dx-btn-danger"
              onClick={() => {
                setCopiedTrader(null);
                setKillSwitchOpen(false);
              }}
            >
              <AlertTriangle size={13} /> Release all legs
            </button>
          </div>
        }
      >
        <div className="d-grid gap-3">
          <Alert tone="danger" title="This is what a kill switch is for">
            Copied legs are closed at the current quote, not at the trader's entry. Expect a small slippage cost and, on fast tick
            contracts, a fill a few ticks away.
          </Alert>
          <div className="dx-card-inset">
            <div className="d-flex justify-content-between">
              <span className="dx-help">Mirrored legs</span>
              <span className="font-display">2 open</span>
            </div>
            <div className="d-flex justify-content-between">
              <span className="dx-help">Open exposure</span>
              <span className="font-display">{usd(1240.5)}</span>
            </div>
            <div className="d-flex justify-content-between">
              <span className="dx-help">Trailing P&L</span>
              <span className="font-display dx-up">{pnl(186.4)}</span>
            </div>
          </div>
          <p className="dx-help mb-0">
            Your own bots are unaffected — the relay runs in a separate worker lane with its own caps.
          </p>
        </div>
      </Dialog>
    </>
  );
}
