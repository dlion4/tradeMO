/* D-1 · Dashboard Overview (/dashboard). Inside the shared AppShell. */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { AppShell, useDashboardAccount } from "../shell/AppShell";
import {
  ACTIVITY_FEED, BOTS, NOTIFICATIONS, POSITIONS, SIGNIN_ACCOUNTS, TRADES, TRADERS,
  type Bot, type Position, type StrategyPreset, type Trade, type Trader,
} from "../../data/trading";
import { MARKET_SYMBOLS, fmtPrice, pnl, usd } from "../../data/market";
import { useTicks } from "../../lib/live";
import { agoMin } from "../auth/AuthDialogs";
import {
  Dialog, Tabs, MiniTabs, Toggle, SearchInput, FilterChips, Pagination, EmptyState, Chip, Avatar, Reveal, Meter, useToast,
} from "../ui/primitives";
import { DataTable, useDataTable, type Column } from "../ui/data-table";
import { TradeTicketDialog, BotDetailDrawer, TradeDetailDrawer, PositionCloseDialog } from "./TradeDialogs";
import { PresetsDialog, DeployBotWizard, BacktestDialog } from "../marketing/modals/CommerceDialogs";
import { CommunityDialog } from "../marketing/modals/ContentDialogs";
import { LeaderboardDialog, CopySetupWizard, TraderDrawer } from "../marketing/modals/SocialModals";
import { ArrowRight, Keyboard, Sparkles, Volume2 } from "lucide-react";
import "../../styles/dashboard.scss";

type Period = "today" | "week" | "month";
const PERIOD_SLICES: Record<Period, number> = { today: 6, week: 12, month: 16 };
const WATCH_CODES = ["R_10", "R_25", "R_100", "frxEURUSD", "frxGBPUSD", "cryBTCUSD"];
const BOT_STATUS_FILTERS = [
  { id: "running", label: "Running" },
  { id: "paused", label: "Paused" },
  { id: "stopped", label: "Stopped" },
  { id: "error", label: "Error" },
];

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}
const timeOf = (epoch: number) => new Date(epoch).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const statusTone = (s: Bot["status"]) => (s === "running" ? "up" : s === "paused" ? "warn" : s === "error" ? "down" : "muted") as "up" | "warn" | "down" | "muted";

function DashboardInner() {
  const navigate = useNavigate();
  const toast = useToast();
  const { account, openSwitcher } = useDashboardAccount();

  const [bots, setBots] = useState<Bot[]>(BOTS);
  const [positions, setPositions] = useState<Position[]>(POSITIONS);
  const [period, setPeriod] = useState<Period>("week");
  const [focusMode, setFocusMode] = useState(false);
  const [lastOrder, setLastOrder] = useState<string | null>(null);
  const [tab, setTab] = useState("trades");

  // overlays
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketSymbol, setTicketSymbol] = useState("R_10");
  const [botDrawer, setBotDrawer] = useState<Bot | null>(null);
  const [tradeDrawer, setTradeDrawer] = useState<Trade | null>(null);
  const [closePos, setClosePos] = useState<Position | null>(null);
  const [fleetOpen, setFleetOpen] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [deployPreset, setDeployPreset] = useState<StrategyPreset | null>(null);
  const [backtestId, setBacktestId] = useState<string | null>(null);
  const [communityOpen, setCommunityOpen] = useState(false);
  const [contactTopic, setContactTopic] = useState<string | null>(null);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [traderDrawer, setTraderDrawer] = useState<Trader | null>(null);
  const [copyTrader, setCopyTrader] = useState<Trader | null>(null);
  const [copyDone, setCopyDone] = useState<{ name: string; ratio: number; cap: number } | null>(null);
  const [copyList, setCopyList] = useState<string[]>(["Ade F."]);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  // Quick trade form
  const [qSymbol, setQSymbol] = useState("R_100");
  const [qStake, setQStake] = useState(10);
  const [qDur, setQDur] = useState(5);

  const ticks = useTicks(WATCH_CODES, 1600);
  const me = SIGNIN_ACCOUNTS[0];

  const periodTrades = useMemo(() => TRADES.slice(0, PERIOD_SLICES[period]), [period]);
  const wins = periodTrades.filter((t) => t.profit > 0).length;
  const winRate = periodTrades.length ? Math.round((wins / periodTrades.length) * 100) : 0;
  const periodPnl = periodTrades.reduce((a, t) => a + t.profit, 0);
  const bestBot = [...bots].filter((b) => b.status === "running").sort((a, b) => b.pnl - a.pnl)[0];
  const worstBot = [...bots].sort((a, b) => a.pnl - b.pnl)[0];
  const openPnl = positions.reduce((a, p) => a + p.currentPnl, 0);
  const runningCount = bots.filter((b) => b.status === "running").length;
  const unread = NOTIFICATIONS.filter((n) => !n.read).length;

  // --- keyboard shortcuts: g+m markets, g+b bots, g+d dashboard, / search, ? help
  const keyBuf = useRef("");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        document.getElementById("dx-global-search")?.focus();
        return;
      }
      if (e.key === "?") {
        setShortcutsOpen(true);
        return;
      }
      keyBuf.current = (keyBuf.current + e.key.toLowerCase()).slice(-2);
      if (keyBuf.current === "gm") void navigate({ to: "/dashboard/markets" });
      if (keyBuf.current === "gd") void navigate({ to: "/dashboard" });
      if (keyBuf.current === "gb") setFleetOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  const qSym = MARKET_SYMBOLS.find((s) => s.code === qSymbol)!;
  const runningOnSymbol = bots.find((b) => b.symbol === qSymbol && b.status === "running");
  const attemptBuy = () => {
    if (runningOnSymbol) setConflictOpen(true);
    else {
      setTicketSymbol(qSymbol);
      setTicketOpen(true);
    }
  };

  const setBotStatus = (bot: Bot, status: Bot["status"]) => {
    setBots((prev) => prev.map((b) => (b.id === bot.id ? { ...b, status } : b)));
    setBotDrawer((cur) => (cur && cur.id === bot.id ? { ...cur, status } : cur));
    toast.push({
      tone: status === "stopped" ? "warn" : "success",
      title: status === "stopped" ? "Bot stopped" : status === "paused" ? "Bot paused" : "Bot resumed",
      body: bot.name,
    });
  };

  const voiceScript = `${greeting()} Amara. Your account ${account.loginId} holds ${usd(account.balance)}. ${period === "today" ? "Today" : period === "week" ? "This week" : "This month"}, ${periodTrades.length} settled trades returned ${periodPnl >= 0 ? "a profit of" : "a loss of"} ${usd(Math.abs(periodPnl))}, with a win rate of ${winRate} percent. ${runningCount} bots are running; ${bestBot ? `${bestBot.name} is your strongest at ${pnl(bestBot.pnl)}` : "no bots are running"}. Open exposure is ${pnl(openPnl)} across ${positions.length} positions.`;

  const speak = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.push({ tone: "warn", title: "Voice unavailable", body: "This browser does not support speech synthesis." });
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(voiceScript);
    u.rate = 1;
    u.onend = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  };

  // ---------- tables ----------
  const botColumns: Column<Bot>[] = [
    { key: "name", header: "Bot", cell: (b) => <strong>{b.name}</strong>, sortValue: (b) => b.name },
    { key: "strategy", header: "Strategy", cell: (b) => b.strategy },
    { key: "symbol", header: "Symbol", cell: (b) => <span className="font-display">{b.symbol}</span>, sortValue: (b) => b.symbol },
    { key: "stake", header: "Stake", align: "end", cell: (b) => <span className="font-display">{usd(b.stake)}</span>, sortValue: (b) => b.stake },
    { key: "trades", header: "Trades", align: "end", cell: (b) => <span className="font-display">{b.trades}</span>, sortValue: (b) => b.trades },
    { key: "winRate", header: "Win %", align: "end", cell: (b) => <span className="font-display">{b.winRate}%</span>, sortValue: (b) => b.winRate },
    { key: "pnl", header: "P&L", align: "end", cell: (b) => <span className={`font-display ${b.pnl >= 0 ? "dx-up" : "dx-down"}`}>{pnl(b.pnl)}</span>, sortValue: (b) => b.pnl },
    { key: "status", header: "Status", cell: (b) => <Chip tone={statusTone(b.status)} pulse={b.status === "running"}>{b.status}</Chip> },
  ];
  const botsTable = useDataTable<Bot>({
    rows: bots,
    searchKeys: (b) => [b.name, b.strategy, b.symbol],
    sorters: { name: (b) => b.name, symbol: (b) => b.symbol, stake: (b) => b.stake, trades: (b) => b.trades, winRate: (b) => b.winRate, pnl: (b) => b.pnl },
    filterKey: (b) => b.status,
    filterOptions: BOT_STATUS_FILTERS,
    initialPageSize: 5,
    initialSort: "pnl",
  });

  const tradeColumns: Column<Trade>[] = [
    { key: "symbol", header: "Symbol", cell: (t) => <span className="font-display">{t.symbol}</span>, sortValue: (t) => t.symbol },
    { key: "contract", header: "Contract", cell: (t) => `${t.contractType} · ${t.direction}` },
    { key: "stake", header: "Stake", align: "end", cell: (t) => <span className="font-display">{usd(t.stake)}</span>, sortValue: (t) => t.stake },
    { key: "spots", header: "Entry → Exit", cell: (t) => <span className="font-display">{fmtPrice(t.entrySpot)} → {fmtPrice(t.exitSpot)}</span>, hideOnMobile: true },
    { key: "duration", header: "Duration", cell: (t) => `${t.duration} ${t.durationUnit}`, hideOnMobile: true },
    { key: "profit", header: "Profit", align: "end", cell: (t) => <span className={`font-display ${t.profit >= 0 ? "dx-up" : "dx-down"}`}>{pnl(t.profit)}</span>, sortValue: (t) => t.profit },
    { key: "openedAt", header: "Opened", cell: (t) => <span className="font-display">{timeOf(t.openedAt)}</span>, sortValue: (t) => t.openedAt },
  ];
  const tradesTable = useDataTable<Trade>({
    rows: TRADES,
    searchKeys: (t) => [t.symbol, t.contractType, t.contractId],
    sorters: { symbol: (t) => t.symbol, stake: (t) => t.stake, profit: (t) => t.profit, openedAt: (t) => t.openedAt },
    filterKey: (t) => (t.profit >= 0 ? "won" : "lost"),
    filterOptions: [{ id: "won", label: "Won" }, { id: "lost", label: "Lost" }],
    initialPageSize: 5,
    initialSort: "openedAt",
  });

  const positionColumns: Column<Position>[] = [
    { key: "symbol", header: "Symbol", cell: (p) => <span className="font-display">{p.symbol}</span>, sortValue: (p) => p.symbol },
    { key: "contract", header: "Contract", cell: (p) => `${p.contractType} · ${p.direction}` },
    { key: "stake", header: "Stake", align: "end", cell: (p) => <span className="font-display">{usd(p.stake)}</span>, sortValue: (p) => p.stake },
    { key: "spot", header: "Spot", align: "end", cell: (p) => <span className="font-display">{fmtPrice(p.currentSpot)}</span>, sortValue: (p) => p.currentSpot },
    { key: "pnl", header: "Live P&L", align: "end", cell: (p) => <span className={`font-display ${p.currentPnl >= 0 ? "dx-up" : "dx-down"}`}>{pnl(p.currentPnl)}</span>, sortValue: (p) => p.currentPnl },
    {
      key: "act", header: "Action",
      cell: (p) => (
        <button type="button" className="dx-btn dx-btn-sm" onClick={(e) => { e.stopPropagation(); setClosePos(p); }}>
          Sell contract
        </button>
      ),
    },
  ];
  const positionsTable = useDataTable<Position>({
    rows: positions,
    searchKeys: (p) => [p.symbol, p.contractType, p.contractId],
    sorters: { symbol: (p) => p.symbol, stake: (p) => p.stake, spot: (p) => p.currentSpot, pnl: (p) => p.currentPnl },
    initialPageSize: 5,
    initialSort: "pnl",
  });

  const tableChrome = (t: { query: string; setQuery: (q: string) => void; total: number }, label: string, filters?: ReactNode) => (
    <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
      <SearchInput value={t.query} onChange={t.setQuery} placeholder={`Search ${label}…`} />
      {filters}
      <span className="ms-auto dx-help"><span className="font-display">{t.total}</span> rows</span>
    </div>
  );

  return (
    <>
        {/* welcome banner */}
        <Reveal>
          <section className="dx-card p-4 mb-3 dx-app-welcome">
            <div>
              <p className="dx-eyebrow mb-1">D-1 · Dashboard overview</p>
              <h1 className="dx-h-section mb-1">{greeting()}, {me.name.split(" ")[0]}.</h1>
              <p className="dx-lead mb-0">Last sign-in {agoMin(me.lastLoginMin)} · {unread} unread notifications</p>
              <div className="d-flex flex-wrap gap-2 mt-3">
                <Chip tone="up" pulse>Deriv connected · <span className="font-display">{account.loginId}</span></Chip>
                <Chip>{account.type} account</Chip>
                <Chip tone={openPnl >= 0 ? "up" : "down"}>Open P&L <span className="font-display">{pnl(openPnl)}</span></Chip>
              </div>
            </div>
            <div className="dx-app-welcome-actions">
              <button type="button" className="dx-btn" onClick={() => setVoiceOpen(true)}>
                <Volume2 size={15} /> Read my dashboard
              </button>
              <button type="button" className="dx-btn" onClick={() => setShortcutsOpen(true)}>
                <Keyboard size={15} /> Shortcuts
              </button>
              <Toggle checked={focusMode} onChange={setFocusMode} label="Focus mode" hint="Hide community widgets" />
            </div>
          </section>
        </Reveal>

        {/* KPI row */}
        <div className="row g-3 mb-3">
          <div className="col-12 col-sm-6 col-lg-4">
            <Reveal>
              <section className="dx-card h-100">
                <div className="dx-card-head">
                  <span>Balance · <span className="font-display">{account.loginId}</span></span>
                  <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={openSwitcher}>Switch</button>
                </div>
                <div className="dx-card-body">
                  <div className="dx-stat-value font-display">{usd(account.balance)}</div>
                  <div className="dx-stat-label">Equity <span className="font-display">{usd(account.equity)}</span> · {account.type}</div>
                </div>
              </section>
            </Reveal>
          </div>
          <div className="col-12 col-sm-6 col-lg-4">
            <Reveal delay={60}>
              <section className="dx-card h-100">
                <div className="dx-card-head">
                  <span>P&L · {period}</span>
                  <MiniTabs
                    ariaLabel="P&L period"
                    options={[{ id: "today", label: "Today" }, { id: "week", label: "Week" }, { id: "month", label: "Month" }]}
                    value={period} onChange={(v) => setPeriod(v as Period)}
                  />
                </div>
                <div className="dx-card-body">
                  <div className={`dx-stat-value font-display ${periodPnl >= 0 ? "dx-up" : "dx-down"}`}>{pnl(periodPnl)}</div>
                  <div className="dx-stat-label">
                    {periodTrades.length} settled trades · open <span className={`font-display ${openPnl >= 0 ? "dx-up" : "dx-down"}`}>{pnl(openPnl)}</span>
                  </div>
                </div>
              </section>
            </Reveal>
          </div>
          <div className="col-12 col-lg-4">
            <Reveal delay={120}>
              <section className="dx-card h-100">
                <div className="dx-card-head">
                  <span>Win rate</span>
                  <Chip tone={winRate >= 55 ? "up" : winRate >= 45 ? "warn" : "down"}>{winRate >= 55 ? "hot streak" : winRate >= 45 ? "steady" : "cold streak"}</Chip>
                </div>
                <div className="dx-card-body">
                  <div className="dx-stat-value font-display">{winRate}%</div>
                  <div className="dx-stat-label">{wins} wins of {periodTrades.length} trades · {period}</div>
                  <div className="mt-3">
                    <Meter value={winRate} label="Win-rate meter" />
                  </div>
                </div>
              </section>
            </Reveal>
          </div>
        </div>

        {/* bots + live ticks */}
        <div className="row g-3 mb-3">
          <div className="col-12 col-lg-7">
            <Reveal>
              <section className="dx-card h-100">
                <div className="dx-card-head">
                  <span>Active bots · {runningCount} running</span>
                  <span className="d-flex gap-2">
                    <button type="button" className="dx-btn dx-btn-sm" onClick={() => setPresetsOpen(true)}>New bot</button>
                    <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => setFleetOpen(true)}>All bots ({bots.length})</button>
                  </span>
                </div>
                <div className="dx-card-body">
                  {bots.slice(0, 5).map((b) => (
                    <button key={b.id} type="button" className="dx-list-row w-100 text-start" onClick={() => setBotDrawer(b)}>
                      <span className="d-flex align-items-center gap-2 text-start">
                        <span className={`dx-pulse ${b.status === "running" ? "" : "dx-pulse-muted"}`} aria-hidden />
                        <span>
                          <strong>{b.name}</strong>
                          <span className="d-block text-muted small">{b.strategy} · <span className="font-display">{b.symbol}</span></span>
                        </span>
                      </span>
                      <span className="d-flex align-items-center gap-2">
                        <span className={`font-display ${b.pnl >= 0 ? "dx-up" : "dx-down"}`}>{pnl(b.pnl)}</span>
                        <Chip tone={statusTone(b.status)}>{b.status}</Chip>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            </Reveal>
          </div>

          <div className="col-12 col-lg-5">
            <Reveal delay={60}>
              <section className="dx-card h-100">
                <div className="dx-card-head">
                  <span className="d-inline-flex align-items-center gap-2">Live ticks <span className="dx-pulse" aria-hidden /></span>
                  <Link to="/dashboard/markets" className="dx-btn dx-btn-sm dx-btn-ghost">See all <ArrowRight size={13} /></Link>
                </div>
                <div className="dx-card-body">
                  {WATCH_CODES.map((code) => {
                    const sym = MARKET_SYMBOLS.find((s) => s.code === code)!;
                    const tick = ticks[code];
                    return (
                      <button key={code} type="button" className="dx-list-row w-100 text-start" onClick={() => void navigate({ to: "/dashboard/markets", search: { q: code } })}>
                        <span className="text-start">
                          <strong className="font-display">{code}</strong>
                          <span className="d-block text-muted small">{sym.short} · {sym.market}</span>
                        </span>
                        <span className="text-end">
                          <span className="font-display d-block">{tick ? fmtPrice(tick.quote, sym.pipSize) : "—"}</span>
                          <span className={`small font-display ${sym.changePct >= 0 ? "dx-up" : "dx-down"}`}>{sym.changePct >= 0 ? "▲" : "▼"} {Math.abs(sym.changePct).toFixed(2)}%</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </Reveal>
          </div>
        </div>

        {/* quick trade + social */}
        <div className="row g-3 mb-3">
          <div className="col-12 col-lg-5">
            <Reveal>
              <section className="dx-card h-100">
                <div className="dx-card-head"><span>Quick trade</span>{lastOrder && <Chip tone="up">Last · {lastOrder}</Chip>}</div>
                <div className="dx-card-body">
                  <div className="dx-field">
                    <label className="dx-field-label" htmlFor="qx-symbol">Symbol</label>
                    <select id="qx-symbol" className="dx-select" value={qSymbol} onChange={(e) => setQSymbol(e.target.value)}>
                      {MARKET_SYMBOLS.filter((s) => s.open).map((s) => <option key={s.code} value={s.code}>{s.code} — {s.name}</option>)}
                    </select>
                  </div>
                  <div className="row g-2">
                    <div className="col-6">
                      <div className="dx-field">
                        <label className="dx-field-label" htmlFor="qx-stake">Stake (USD)</label>
                        <input id="qx-stake" className="dx-input font-display" type="number" min={qSym.minStake} max={qSym.maxStake} value={qStake} onChange={(e) => setQStake(Number(e.target.value))} />
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="dx-field">
                        <label className="dx-field-label" htmlFor="qx-dur">Duration (ticks)</label>
                        <select id="qx-dur" className="dx-select font-display" value={qDur} onChange={(e) => setQDur(Number(e.target.value))}>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>{n} ticks</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                  <p className="text-muted small">
                    Payout <strong className="font-display">{usd(qStake * (1 + qSym.payoutPct / 100))}</strong> ({qSym.payoutPct}% over stake) · span {usd(qSym.minStake)}–{usd(qSym.maxStake)}
                  </p>
                  <div className="d-flex gap-2">
                    <button type="button" className="dx-btn dx-btn-primary flex-grow-1" onClick={attemptBuy}><span className="dx-up">▲</span> Buy Rise</button>
                    <button type="button" className="dx-btn flex-grow-1" onClick={attemptBuy}><span className="dx-down">▼</span> Buy Fall</button>
                  </div>
                  <p className="text-muted small mb-0 mt-2">Opens the full trade ticket with a proposal preview before any buy.</p>
                </div>
              </section>
            </Reveal>
          </div>

          {!focusMode && (
            <div className="col-12 col-lg-7">
              <Reveal delay={60}>
                <section className="dx-card h-100">
                  <div className="dx-card-head">
                    <span>Community pulse</span>
                    <span className="d-flex gap-2">
                      <button type="button" className="dx-btn dx-btn-sm" onClick={() => setLeaderboardOpen(true)}>Trader leaderboard</button>
                      <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => setCommunityOpen(true)}>Open feed</button>
                    </span>
                  </div>
                  <div className="dx-card-body">
                    {ACTIVITY_FEED.slice(0, 5).map((a) => (
                      <button key={a.id} type="button" className="dx-list-row w-100 text-start" onClick={() => setCommunityOpen(true)}>
                        <span className="d-flex align-items-center gap-2 text-start">
                          <Avatar name={a.actor} />
                          <span>
                            <strong>{a.actor}</strong> {a.action} <strong>{a.target}</strong>
                            <span className="d-block text-muted small">{timeOf(a.epoch)}</span>
                          </span>
                        </span>
                        <Chip tone={a.tone}>live</Chip>
                      </button>
                    ))}
                    <p className="text-muted small mb-0 mt-2">Copying: {copyList.join(", ")} — copy-trading runs on your own risk rules.</p>
                  </div>
                </section>
              </Reveal>
            </div>
          )}
        </div>

        {/* insights */}
        {!focusMode && (
          <Reveal>
            <section className="dx-card mb-3">
              <div className="dx-card-head">
                <span className="d-inline-flex align-items-center gap-2"><Sparkles size={15} /> Daily insights</span>
                <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setInsightsOpen(true)}>Details <ArrowRight size={13} /></button>
              </div>
              <div className="dx-card-body">
                <div className="row g-3">
                  <div className="col-12 col-md-4">
                    <p className="dx-eyebrow mb-1">Strongest bot</p>
                    <p className="mb-1"><strong>{bestBot?.name ?? "None running"}</strong></p>
                    <p className="text-muted small mb-0">{bestBot ? <><span className="font-display dx-up">{pnl(bestBot.pnl)}</span> at a <span className="font-display">{bestBot.winRate}%</span> win rate.</> : "Deploy a bot to start generating signal."}</p>
                  </div>
                  <div className="col-12 col-md-4">
                    <p className="dx-eyebrow mb-1">Needs attention</p>
                    <p className="mb-1"><strong>{worstBot.name}</strong></p>
                    <p className="text-muted small mb-0"><span className={`font-display ${worstBot.pnl >= 0 ? "dx-up" : "dx-down"}`}>{pnl(worstBot.pnl)}</span> · {worstBot.status}. Consider a pause or a lower stake.</p>
                  </div>
                  <div className="col-12 col-md-4">
                    <p className="dx-eyebrow mb-1">Suggestion</p>
                    <p className="mb-1"><strong>Watch <span className="font-display">1HZ100V</span></strong></p>
                    <p className="text-muted small mb-0">Volatility is elevated this session — smaller stakes, shorter durations.</p>
                  </div>
                </div>
              </div>
            </section>
          </Reveal>
        )}

        {/* tables */}
        <Reveal>
          <section className="dx-card">
            <div className="dx-card-head"><span>Activity</span><span className="text-muted small">Click any row for full detail</span></div>
            <div className="dx-card-body">
              <Tabs
                tabs={[
                  { id: "trades", label: `Recent trades (${TRADES.length})` },
                  { id: "positions", label: `Open positions (${positions.length})` },
                ]}
                active={tab}
                onChange={setTab}
              />
              <div className="mt-3">
                {tab === "trades" ? (
                  <>
                    {tableChrome(tradesTable, "trades", (
                      <FilterChips options={[{ id: "won", label: "Won" }, { id: "lost", label: "Lost" }]} value={tradesTable.filter} onChange={tradesTable.setFilter} allLabel="All results" />
                    ))}
                    <DataTable<Trade>
                      columns={tradeColumns}
                      state={tradesTable}
                      rowKey={(t) => t.id}
                      ariaLabel="Recent settled trades"
                      onRowClick={(t) => setTradeDrawer(t)}
                      emptyState={<EmptyState title="No trades match" message="Try a different search term or result filter." action={<button type="button" className="dx-btn" onClick={tradesTable.reset}>Reset filters</button>} />}
                    />
                    <Pagination page={tradesTable.page} pageCount={tradesTable.pageCount} onPageChange={tradesTable.setPage} total={tradesTable.total} pageSize={tradesTable.pageSize} onPageSizeChange={tradesTable.setPageSize} label="trades" />
                  </>
                ) : positions.length ? (
                  <>
                    {tableChrome(positionsTable, "positions")}
                    <DataTable<Position>
                      columns={positionColumns}
                      state={positionsTable}
                      rowKey={(p) => p.id}
                      ariaLabel="Open positions"
                      onRowClick={(p) => setTradeDrawer({ ...p, profit: p.currentPnl, exitSpot: p.currentSpot, closedAt: p.expiresAt, status: "open", duration: 5, durationUnit: "ticks" })}
                      emptyState={<EmptyState title="No positions match" message="Try a different search term." action={<button type="button" className="dx-btn" onClick={positionsTable.reset}>Reset filters</button>} />}
                    />
                    <Pagination page={positionsTable.page} pageCount={positionsTable.pageCount} onPageChange={positionsTable.setPage} total={positionsTable.total} pageSize={positionsTable.pageSize} onPageSizeChange={positionsTable.setPageSize} label="positions" />
                  </>
                ) : (
                  <EmptyState title="No open positions" message="Every contract has settled or been sold. Place a quick trade to open a new position." action={<button type="button" className="dx-btn dx-btn-primary" onClick={attemptBuy}>Place a quick trade</button>} />
                )}
              </div>
            </div>
          </section>
        </Reveal>

        {/* ---------- overlays ---------- */}
        <TradeTicketDialog
          open={ticketOpen}
          initialSymbol={ticketSymbol}
          onClose={() => setTicketOpen(false)}
          onBought={(r) => {
            setTicketOpen(false);
            setLastOrder(`${r.symbol} · ${usd(r.stake)}`);
            toast.push({ tone: "success", title: `Contract bought · ${r.symbol}`, body: `${r.contractId} — payout ${usd(r.payout)}.` });
          }}
        />

        <BotDetailDrawer bot={botDrawer} onClose={() => setBotDrawer(null)} onSetStatus={setBotStatus} />

        <TradeDetailDrawer trade={tradeDrawer} onClose={() => setTradeDrawer(null)} />

        <PositionCloseDialog
          position={closePos}
          onClose={() => setClosePos(null)}
          onClosed={(p) => {
            setPositions((prev) => prev.filter((x) => x.id !== p.id));
            setClosePos(null);
            toast.push({ tone: p.currentPnl >= 0 ? "success" : "warn", title: "Position closed", body: `${p.symbol} settled at ${pnl(p.currentPnl)}.` });
          }}
        />

        <Dialog open={fleetOpen} onClose={() => setFleetOpen(false)} title={`All bots (${bots.length})`} size="lg" labelledBy="fleet-title">
          {tableChrome(botsTable, "bots", (
            <FilterChips options={BOT_STATUS_FILTERS} value={botsTable.filter} onChange={botsTable.setFilter} allLabel="All statuses" />
          ))}
          <DataTable<Bot>
            columns={botColumns}
            state={botsTable}
            rowKey={(b) => b.id}
            ariaLabel="All bots"
            onRowClick={(b) => { setFleetOpen(false); setBotDrawer(b); }}
            emptyState={<EmptyState title="No bots match" message="Try a different search term or status filter." action={<button type="button" className="dx-btn" onClick={botsTable.reset}>Reset filters</button>} />}
          />
          <Pagination page={botsTable.page} pageCount={botsTable.pageCount} onPageChange={botsTable.setPage} total={botsTable.total} pageSize={botsTable.pageSize} onPageSizeChange={botsTable.setPageSize} label="bots" />
          <div className="d-flex justify-content-end mt-3">
            <button type="button" className="dx-btn dx-btn-primary" onClick={() => { setFleetOpen(false); setPresetsOpen(true); }}>Deploy a new bot</button>
          </div>
        </Dialog>

        <Dialog open={conflictOpen} onClose={() => setConflictOpen(false)} title="Bot already trading this symbol" labelledBy="conflict-title">
          <p>
            <strong>{runningOnSymbol?.name}</strong> is currently running on <strong className="font-display">{qSymbol}</strong> with a {usd(runningOnSymbol?.stake ?? 0)} stake.
            A manual contract here competes with that bot's entries.
          </p>
          <div className="d-flex flex-wrap gap-2 justify-content-end mt-3">
            <button type="button" className="dx-btn" onClick={() => setConflictOpen(false)}>Cancel</button>
            <button
              type="button" className="dx-btn dx-btn-ghost"
              onClick={() => {
                if (runningOnSymbol) setBotStatus(runningOnSymbol, "paused");
                setConflictOpen(false);
              }}
            >
              Pause bot
            </button>
            <button
              type="button" className="dx-btn dx-btn-primary"
              onClick={() => { setConflictOpen(false); setTicketSymbol(qSymbol); setTicketOpen(true); }}
            >
              Trade anyway
            </button>
          </div>
        </Dialog>

        <Dialog open={insightsOpen} onClose={() => setInsightsOpen(false)} title="Daily insights — full breakdown" size="lg" labelledBy="insights-title">
          <DataTable<Bot>
            columns={botColumns}
            state={botsTable}
            rowKey={(b) => b.id}
            ariaLabel="Bot performance breakdown"
            onRowClick={(b) => { setInsightsOpen(false); setBotDrawer(b); }}
          />
          <Pagination page={botsTable.page} pageCount={botsTable.pageCount} onPageChange={botsTable.setPage} total={botsTable.total} pageSize={botsTable.pageSize} onPageSizeChange={botsTable.setPageSize} label="bots" />
          <div className="mt-3">
            <p className="dx-eyebrow mb-2">Suggestions</p>
            <ul className="dx-step-list">
              <li><strong>{worstBot.name}</strong> is your weakest performer ({pnl(worstBot.pnl)}). Pause it or halve the stake before the next session.</li>
              <li>{bestBot ? <><strong>{bestBot.name}</strong> is carrying the book at {pnl(bestBot.pnl)} — avoid raising its stake mid-streak.</> : "No running bots — deploy one to generate signal."}</li>
              <li>Volatility on <span className="font-display">1HZ100V</span> is elevated; smaller stakes and shorter durations suit this session.</li>
            </ul>
          </div>
        </Dialog>

        <Dialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} title="Keyboard shortcuts" labelledBy="shortcuts-title">
          <ul className="dx-step-list">
            <li><span className="font-display">g</span> then <span className="font-display">m</span> — go to Markets</li>
            <li><span className="font-display">g</span> then <span className="font-display">d</span> — go to Dashboard overview</li>
            <li><span className="font-display">g</span> then <span className="font-display">b</span> — open All bots</li>
            <li><span className="font-display">/</span> — focus the global search</li>
            <li><span className="font-display">?</span> — open this shortcut list</li>
            <li><span className="font-display">Esc</span> — close any dialog or drawer</li>
          </ul>
        </Dialog>

        <Dialog
          open={voiceOpen}
          onClose={() => { if (speaking && "speechSynthesis" in window) window.speechSynthesis.cancel(); setSpeaking(false); setVoiceOpen(false); }}
          title="Voice overview"
          labelledBy="voice-title"
        >
          <p className="dx-lead">{voiceScript}</p>
          <p className="text-muted small">Read aloud with your browser's speech synthesis. Nothing leaves this device.</p>
          <div className="d-flex gap-2 justify-content-end">
            <button type="button" className="dx-btn" onClick={() => setVoiceOpen(false)}>Close</button>
            <button type="button" className="dx-btn dx-btn-primary" onClick={speak}><Volume2 size={15} /> {speaking ? "Speaking…" : "Speak"}</button>
          </div>
        </Dialog>

        <PresetsDialog
          open={presetsOpen}
          onClose={() => setPresetsOpen(false)}
          onDeploy={(preset) => { setPresetsOpen(false); setDeployPreset(preset); }}
          onBacktest={(presetId) => { setPresetsOpen(false); setBacktestId(presetId); }}
          onOpenFeature={() => void navigate({ to: "/features" })}
        />
        <BacktestDialog
          open={backtestId !== null}
          onClose={() => setBacktestId(null)}
          initialPresetId={backtestId ?? undefined}
          onDeploy={(preset) => { setBacktestId(null); setDeployPreset(preset); }}
        />
        <DeployBotWizard
          open={deployPreset !== null}
          preset={deployPreset}
          onClose={() => setDeployPreset(null)}
          onDeployed={(name, stake, cap) => {
            const preset = deployPreset;
            setDeployPreset(null);
            if (preset) {
              setBots((prev) => [{
                id: `bot_user_${Date.now()}`,
                name,
                strategy: preset.kind,
                symbol: preset.symbol,
                contractType: preset.contractType,
                stake,
                duration: preset.duration,
                durationUnit: preset.durationUnit,
                martingale: preset.kind === "martingale" ? 2 : 1,
                status: "running",
                pnl: 0,
                trades: 0,
                winRate: 0,
                maxStake: cap,
                stopLoss: 150,
                takeProfit: 300,
                loginId: account.loginId,
                risk: preset.risk,
                runtimeMinutes: 0,
                lastTradeAt: Date.now(),
                owner: "You",
              }, ...prev]);
            }
            toast.push({ tone: "success", title: "Bot deployed", body: `${name} is live on ${account.loginId}.` });
          }}
        />

        <CommunityDialog
          open={communityOpen}
          onClose={() => setCommunityOpen(false)}
          onContact={(topic) => { setCommunityOpen(false); setContactTopic(topic); }}
          onLeaderboard={() => { setCommunityOpen(false); setLeaderboardOpen(true); }}
        />
        <Dialog open={contactTopic !== null} onClose={() => setContactTopic(null)} title="Message sent" labelledBy="contact-title">
          <p>Your message about <strong>{contactTopic}</strong> is with the community moderators. Expect a reply in your notifications within one business day.</p>
          <div className="d-flex justify-content-end"><button type="button" className="dx-btn dx-btn-primary" onClick={() => setContactTopic(null)}>Done</button></div>
        </Dialog>

        <LeaderboardDialog
          open={leaderboardOpen}
          onClose={() => setLeaderboardOpen(false)}
          onOpenTrader={(id) => { setLeaderboardOpen(false); setTraderDrawer(TRADERS.find((t) => t.id === id) ?? null); }}
          onCopy={(t) => { setLeaderboardOpen(false); setCopyTrader(t); }}
          onOpenCommunity={() => { setLeaderboardOpen(false); setCommunityOpen(true); }}
          onOpenBacktests={() => { setLeaderboardOpen(false); setBacktestId("pre_mart_vol10"); }}
        />
        <TraderDrawer
          trader={traderDrawer}
          onClose={() => setTraderDrawer(null)}
          onCopy={(t) => { setTraderDrawer(null); setCopyTrader(t); }}
          onOpenLeaderboard={() => { setTraderDrawer(null); setLeaderboardOpen(true); }}
          onOpenCommunity={() => { setTraderDrawer(null); setCommunityOpen(true); }}
          copied={traderDrawer ? copyList.includes(traderDrawer.displayName) : false}
        />
        <CopySetupWizard
          open={copyTrader !== null}
          trader={copyTrader}
          onClose={() => setCopyTrader(null)}
          onCopied={(_traderId, ratio, cap) => {
            if (copyTrader) {
              setCopyDone({ name: copyTrader.displayName, ratio, cap });
              setCopyList((prev) => (prev.includes(copyTrader.displayName) ? prev : [...prev, copyTrader.displayName]));
            }
            setCopyTrader(null);
          }}
        />
        <Dialog open={copyDone !== null} onClose={() => setCopyDone(null)} title="Copying started" labelledBy="copy-done-title">
          {copyDone && (
            <>
              <p>You are now copying <strong>{copyDone.name}</strong> into <span className="font-display">{account.loginId}</span>.</p>
              <ul className="dx-step-list">
                <li>Copy ratio <span className="font-display">{copyDone.ratio}×</span> · daily cap <span className="font-display">{usd(copyDone.cap)}</span></li>
                <li>Your own stop-loss and take-profit rules still apply on every mirrored contract.</li>
              </ul>
              <div className="d-flex justify-content-end mt-3">
                <button type="button" className="dx-btn dx-btn-primary" onClick={() => setCopyDone(null)}>Done</button>
              </div>
            </>
          )}
        </Dialog>
    </>
  );
}

export default function DashboardPage() {
  return (
    <AppShell
      title="Overview"
      actions={(
        <Link to="/dashboard/markets" className="dx-btn dx-btn-sm dx-btn-primary d-none d-md-inline-flex">
          Browse markets <ArrowRight size={14} />
        </Link>
      )}
    >
      <div className="page-dashboard">
        <DashboardInner />
      </div>
    </AppShell>
  );
}
