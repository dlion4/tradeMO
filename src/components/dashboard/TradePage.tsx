/* D-3 · Trade Page (/dashboard/trade). Inside the shared AppShell.
   Chart + order panel + live open-contract monitoring, with the blueprint's
   advanced features: multi-leg builder, one-click trading, inline journal,
   smart order routing, price alerts with auto-execute, chart drawings and
   saved layouts. Front-end only — simulated Deriv streams via lib/live. */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { AppShell, useDashboardAccount } from "../shell/AppShell";
import {
  CONTRACT_TYPE_MAP, DURATION_UNITS, MARKET_SYMBOLS, SYMBOL_MAP, fmtDur, fmtPrice, pnl, usd,
  type ContractTypeId, type DurationUnit, type Symbol as Sym,
} from "../../data/market";
import { BOTS, DERIV_ACCOUNTS, MARKET_SCHEDULES, POSITIONS, type Bot, type Position } from "../../data/trading";
import { useCountdown, useLiveSeries, usePnlDrift, useTicks } from "../../lib/live";
import { agoMin } from "../auth/AuthDialogs";
import {
  Dialog, Drawer, Dropdown, MiniTabs, Toggle, SearchInput, FilterChips, Pagination, EmptyState, Chip, Meter, PriceFlash, Reveal, Alert, useToast,
} from "../ui/primitives";
import { PositionCloseDialog } from "./TradeDialogs";
import { Bell, Pause, Play, Plus, Star, Trash2 } from "lucide-react";
import "../../styles/trade.scss";

// ---------------------------------------------------------------- helpers
type TF = "1m" | "5m" | "15m" | "1h" | "1d";
type ChartType = "candle" | "line" | "bars";
const TF_BUCKET: Record<TF, number> = { "1m": 5, "5m": 7, "15m": 10, "1h": 14, "1d": 20 };

interface Candle { o: number; h: number; l: number; c: number }
function buildCandles(series: number[], bucket: number): Candle[] {
  const out: Candle[] = [];
  for (let i = 0; i + bucket <= series.length; i += bucket) {
    const chunk = series.slice(i, i + bucket);
    out.push({ o: chunk[0], h: Math.max(...chunk), l: Math.min(...chunk), c: chunk[chunk.length - 1] });
  }
  return out;
}
const closes = (cs: Candle[]) => cs.map((c) => c.c);
function sma(vals: number[], p: number): (number | null)[] {
  return vals.map((_, i) => (i < p - 1 ? null : vals.slice(i - p + 1, i + 1).reduce((a, b) => a + b, 0) / p));
}
function emaSeries(vals: number[], p: number): (number | null)[] {
  const k = 2 / (p + 1);
  let prev = vals[0] ?? 0;
  return vals.map((v, i) => {
    if (i < p - 1) return null;
    prev = i === p - 1 ? vals.slice(0, p).reduce((a, b) => a + b, 0) / p : v * k + prev * (1 - k);
    return prev;
  });
}
function rsiValue(vals: number[], p = 14): number {
  if (vals.length < p + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = vals.length - p; i < vals.length; i++) {
    const d = vals[i] - vals[i - 1];
    if (d >= 0) gains += d; else losses -= d;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return Math.round((100 - 100 / (1 + rs)) * 10) / 10;
}

const DIRECTION_PAIRS: Record<string, { value: string; label: string }[]> = {
  rise_fall: [{ value: "rise", label: "Rise" }, { value: "fall", label: "Fall" }],
  higher_lower: [{ value: "higher", label: "Higher" }, { value: "lower", label: "Lower" }],
  touch: [{ value: "touch", label: "Touch" }, { value: "notouch", label: "No Touch" }],
  digits: [{ value: "match", label: "Matches" }, { value: "differ", label: "Differs" }],
  even_odd: [{ value: "even", label: "Even" }, { value: "odd", label: "Odd" }],
  over_under: [{ value: "over", label: "Over" }, { value: "under", label: "Under" }],
  accumulator: [{ value: "grow", label: "Grow" }],
  multiplier: [{ value: "up", label: "Up" }, { value: "down", label: "Down" }],
  lookback: [{ value: "high", label: "High-Close" }, { value: "low", label: "Low-Close" }],
};

interface IndState { on: boolean; period: number }
interface Indicators { sma: IndState; ema: IndState; bb: IndState; rsi: boolean; macd: boolean }
const DEFAULT_INDICATORS: Indicators = {
  sma: { on: true, period: 10 }, ema: { on: false, period: 20 }, bb: { on: false, period: 20 }, rsi: true, macd: false,
};

interface DrawLine { kind: "trend" | "sr"; x1: number; y1: number; x2: number; y2: number }
interface OpenContract extends Position { botName?: string; queued?: boolean; pendingUntil?: number }
interface QuickSlot { symbol: string; dir: "rise" | "fall"; stake: number; dur: number }
interface TradeAlert {
  id: number; symbol: string; cond: "above" | "below"; price: number;
  dir: string; stake: number; duration: number; active: boolean; triggered?: boolean;
}
interface JournalEntry { id: number; contractId: string; symbol: string; emotion: string; note: string; closedMin: number }
interface Leg { symbol: string; type: ContractTypeId; dir: string; stake: number; duration: number }
interface LegTemplate { id: number; name: string; legs: Leg[] }
interface SavedLayout { id: number; name: string; symbol: string; tf: TF; chartType: ChartType; indicators: Indicators }

const EMOTIONS = ["Confident", "Calm", "FOMO", "Tilt", "Revenge", "Bored"];
const seedContracts = (): OpenContract[] => POSITIONS.slice(0, 6).map((p) => ({ ...p }));
const newContractId = () => `DX${Math.floor(100000 + Math.random() * 900000)}`;

// ---------------------------------------------------------------- contract row
function ContractRow({ c, quote, onSell, onOpen }: { c: OpenContract; quote?: number; onSell: (c: OpenContract) => void; onOpen: (c: OpenContract) => void }) {
  const drift = usePnlDrift(c.currentPnl);
  const countdown = useCountdown(c.expiresAt);
  const [, setTick] = useState(0);
  const pending = (c.pendingUntil ?? 0) > Date.now();
  useEffect(() => {
    if (!pending) return;
    const id = window.setTimeout(() => setTick((t) => t + 1), Math.max(50, (c.pendingUntil ?? 0) - Date.now()));
    return () => window.clearTimeout(id);
  }, [pending, c.pendingUntil]);
  const sym = SYMBOL_MAP[c.symbol];
  return (
    <tr onClick={() => onOpen(c)} style={{ cursor: "pointer" }} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") onOpen(c); }}>
      <td data-label="Contract">
        <span className="font-display">{c.contractId}</span>
        {pending ? <Chip tone="warn">Verifying entry…</Chip> : null}
        {c.queued ? <Chip tone="warn">Queued · bot</Chip> : c.botName ? <Chip tone="info">{c.botName}</Chip> : null}
      </td>
      <td data-label="Symbol · Type">
        <span className="font-display">{c.symbol}</span>
        <span className="d-block text-muted small">{CONTRACT_TYPE_MAP[c.contractType]?.label ?? c.contractType} · {c.direction}</span>
      </td>
      <td data-label="Entry" className="dx-td-num"><span className="font-display">{pending ? "—" : fmtPrice(c.entrySpot, sym?.pipSize)}</span></td>
      <td data-label="Current" className="dx-td-num"><span className="font-display">{quote !== undefined ? fmtPrice(quote, sym?.pipSize) : fmtPrice(c.currentSpot, sym?.pipSize)}</span></td>
      <td data-label="P&L" className="dx-td-num"><span className={`font-display ${drift >= 0 ? "dx-up" : "dx-down"}`}>{pnl(drift)}</span></td>
      <td data-label="Expires" className="dx-td-num"><span className="font-display">{countdown ?? "—"}</span></td>
      <td data-label="Action">
        <button type="button" className="dx-btn dx-btn-sm" onClick={(e) => { e.stopPropagation(); onSell(c); }}>Sell</button>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------- page
function TradeInner() {
  const navigate = useNavigate();
  const toast = useToast();
  const { account, openSwitcher } = useDashboardAccount();

  const [symbolCode, setSymbolCode] = useState("R_100");
  const sym = SYMBOL_MAP[symbolCode];
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set(["R_100", "R_10"]));
  const [symbolDrawerOpen, setSymbolDrawerOpen] = useState(false);

  // chart
  const [tf, setTf] = useState<TF>("1m");
  const [chartType, setChartType] = useState<ChartType>("candle");
  const [dualView, setDualView] = useState(false);
  const [indicators, setIndicators] = useState<Indicators>(DEFAULT_INDICATORS);
  const [indicatorsOpen, setIndicatorsOpen] = useState(false);
  const [drawMode, setDrawMode] = useState<null | "trend" | "sr">(null);
  const [trendPending, setTrendPending] = useState<{ x: number; y: number } | null>(null);
  const [drawings, setDrawings] = useState<Record<string, DrawLine[]>>({});
  const [feedPaused, setFeedPaused] = useState(false);
  const [frozen, setFrozen] = useState<number[] | null>(null);
  const [announce, setAnnounce] = useState(false);
  const [calm, setCalm] = useState(false);
  const [crossIdx, setCrossIdx] = useState<number | null>(null);
  const [layoutsOpen, setLayoutsOpen] = useState(false);
  const [layoutName, setLayoutName] = useState("");
  const [layouts, setLayouts] = useState<SavedLayout[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem("dx-chart-layouts") ?? "[]") as SavedLayout[];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem("dx-chart-layouts", JSON.stringify(layouts));
    } catch { /* storage unavailable */ }
  }, [layouts]);

  const liveSeries = useLiveSeries(symbolCode, 140, 1600);
  const dualSeries = useLiveSeries(symbolCode, 60, 2600);
  const series = feedPaused && frozen ? frozen : liveSeries;
  const candles = useMemo(() => buildCandles(series, TF_BUCKET[tf]), [series, tf]);
  const cls = useMemo(() => closes(candles), [candles]);
  const smaLine = useMemo(() => (indicators.sma.on ? sma(cls, indicators.sma.period) : []), [cls, indicators]);
  const emaLine = useMemo(() => (indicators.ema.on ? emaSeries(cls, indicators.ema.period) : []), [cls, indicators]);
  const bbLines = useMemo(() => {
    if (!indicators.bb.on) return null;
    const mid = sma(cls, indicators.bb.period);
    const upper = mid.map((m, i) => {
      if (m === null) return null;
      const win = cls.slice(i - indicators.bb.period + 1, i + 1);
      const sd = Math.sqrt(win.reduce((a, v) => a + (v - m) ** 2, 0) / win.length);
      return m + 2 * sd;
    });
    const lower = mid.map((m, i) => (m === null || upper[i] === null ? null : 2 * m - (upper[i] as number)));
    return { upper, lower };
  }, [cls, indicators]);
  const rsi = useMemo(() => rsiValue(cls), [cls]);

  // order panel
  const [contractType, setContractType] = useState<ContractTypeId>("rise_fall");
  const [direction, setDirection] = useState("rise");
  const [durationVal, setDurationVal] = useState(5);
  const [durationUnit, setDurationUnit] = useState<DurationUnit>("ticks");
  const [barrier, setBarrier] = useState("");
  const [stake, setStake] = useState(10);
  const [assignBotId, setAssignBotId] = useState<string | null>(null);
  const [smartRouting, setSmartRouting] = useState(true);
  const [routingOpen, setRoutingOpen] = useState(false);
  const [errors, setErrors] = useState<{ stake?: string; duration?: string; barrier?: string }>({});
  const type = CONTRACT_TYPE_MAP[contractType];
  const dirPair = DIRECTION_PAIRS[contractType] ?? DIRECTION_PAIRS.rise_fall;
  const needsBarrier = contractType === "higher_lower" || contractType === "touch";
  const runningBots = BOTS.filter((b) => b.status === "running");
  const assignedBot: Bot | null = assignBotId ? BOTS.find((b) => b.id === assignBotId) ?? null : null;

  useEffect(() => {
    if (!sym.contractTypes.includes(contractType)) {
      const next = sym.contractTypes[0];
      setContractType(next);
      setDirection((DIRECTION_PAIRS[next] ?? DIRECTION_PAIRS.rise_fall)[0].value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolCode]);

  // contracts + ticks
  const [contracts, setContracts] = useState<OpenContract[]>(seedContracts);
  const tickCodes = useMemo(() => [...new Set([symbolCode, ...contracts.map((c) => c.symbol)])], [symbolCode, contracts]);
  const ticks = useTicks(tickCodes, 1600);
  const quote = ticks[symbolCode]?.quote ?? sym.basePrice;
  const spotDir = ticks[symbolCode]?.dir ?? "flat";
  const payout = Math.round(stake * (1 + sym.payoutPct / 100) * 100) / 100;
  const profitIfWin = Math.round((payout - stake) * 100) / 100;

  const routedAccount = useMemo(() => {
    if (!smartRouting) return account;
    const connected = DERIV_ACCOUNTS.filter((a) => a.connected);
    return [...connected].sort((a, b) => stake / b.equity - stake / a.equity)[0] ?? account;
  }, [smartRouting, account, stake]);

  const placeContract = (params: {
    symbol: string; type: ContractTypeId; dir: string; stake: number; duration: number; unit: DurationUnit; barrier?: string; bot: Bot | null;
  }): OpenContract => {
    const s = SYMBOL_MAP[params.symbol];
    const entry = ticks[params.symbol]?.quote ?? s.basePrice;
    const botQueued = params.bot ? params.bot.symbol !== params.symbol || params.bot.trades >= 60 : false;
    const c: OpenContract = {
      id: `pos_${Date.now()}_${Math.floor(Math.random() * 999)}`,
      contractId: newContractId(),
      symbol: params.symbol,
      contractType: params.type,
      direction: params.dir as Position["direction"],
      stake: params.stake,
      currentPnl: 0,
      entrySpot: entry,
      currentSpot: entry,
      payout: Math.round(params.stake * (1 + s.payoutPct / 100) * 100) / 100,
      barrier: params.barrier,
      openedAt: Date.now(),
      expiresAt: Date.now() + (params.unit === "ticks" ? params.duration * 45_000 : params.duration * 60_000),
      loginId: routedAccount.loginId,
      risk: s.payoutPct > 92 ? "high" : "medium",
      botId: params.bot?.id,
      status: "open",
      botName: params.bot?.name,
      queued: botQueued,
      pendingUntil: Date.now() + 2500,
    };
    setContracts((prev) => [c, ...prev]);
    return c;
  };

  // buy flow (confirm dialog stages)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [stage, setStage] = useState<"proposal" | "buying" | "receipt">("proposal");
  const [receipt, setReceipt] = useState<OpenContract | null>(null);
  const [closedSym, setClosedSym] = useState<Sym | null>(null);
  const [insufficientOpen, setInsufficientOpen] = useState(false);

  const validateOrder = (): boolean => {
    const next: typeof errors = {};
    if (!(stake >= sym.minStake && stake <= sym.maxStake)) next.stake = `Stake must be between ${usd(sym.minStake)} and ${usd(sym.maxStake)} for ${sym.code}.`;
    if (durationUnit === "ticks" && !(durationVal >= 1 && durationVal <= 10)) next.duration = "Tick contracts run 1–10 ticks.";
    else if (durationUnit !== "ticks" && !(durationVal >= type.minDuration && durationVal <= type.maxDuration)) next.duration = `${type.label} duration must be ${type.minDuration}–${type.maxDuration} ${durationUnit}.`;
    if (needsBarrier && barrier.trim() === "") next.barrier = "Set a barrier for this contract type.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const attemptBuy = (dir: string) => {
    setDirection(dir);
    if (!sym.open) {
      setClosedSym(sym);
      return;
    }
    if (!validateOrder()) return;
    if (stake > account.balance) {
      setInsufficientOpen(true);
      return;
    }
    setStage("proposal");
    setReceipt(null);
    setConfirmOpen(true);
  };

  const confirmBuy = () => {
    setStage("buying");
    window.setTimeout(() => {
      const c = placeContract({
        symbol: symbolCode, type: contractType, dir: direction, stake, duration: durationVal, unit: durationUnit,
        barrier: needsBarrier ? barrier : undefined, bot: assignedBot,
      });
      setReceipt(c);
      setStage("receipt");
    }, 900);
  };

  // sell + journal
  const [sellTarget, setSellTarget] = useState<OpenContract | null>(null);
  const [detail, setDetail] = useState<OpenContract | null>(null);
  const detailDrift = usePnlDrift(detail?.currentPnl ?? 0);
  const detailCountdown = useCountdown(detail?.expiresAt ?? Date.now());
  const [journal, setJournal] = useState<JournalEntry[]>([
    { id: 1, contractId: "DX340121", symbol: "R_75", emotion: "Confident", note: "Waited for the pullback, sized down. Textbook entry.", closedMin: 190 },
    { id: 2, contractId: "DX339870", symbol: "frxEURUSD", emotion: "FOMO", note: "Chased the CPI spike — journal says never again.", closedMin: 460 },
    { id: 3, contractId: "DX339512", symbol: "R_10", emotion: "Calm", note: "Bot-mirrored trade, hands off. Let the rules work.", closedMin: 1250 },
  ]);
  const [journalOpen, setJournalOpen] = useState(false);
  const [promptFor, setPromptFor] = useState<{ contractId: string; symbol: string } | null>(null);
  const [emotion, setEmotion] = useState("Calm");
  const [note, setNote] = useState("");
  const saveJournal = () => {
    if (!promptFor) return;
    setJournal((prev) => [{ id: Date.now(), contractId: promptFor.contractId, symbol: promptFor.symbol, emotion, note: note.trim() || "No note — closed from the trade page.", closedMin: 0 }, ...prev]);
    setPromptFor(null);
    setNote("");
    setEmotion("Calm");
  };

  // one-click trading
  const [slots, setSlots] = useState<QuickSlot[]>([
    { symbol: "R_10", dir: "rise", stake: 1, dur: 5 },
    { symbol: "R_100", dir: "fall", stake: 2, dur: 5 },
    { symbol: "1HZ100V", dir: "rise", stake: 1, dur: 3 },
    { symbol: "frxEURUSD", dir: "rise", stake: 5, dur: 10 },
  ]);
  const [confirmQuick, setConfirmQuick] = useState(true);
  const [quickOpen, setQuickOpen] = useState(false);
  const quickBuy = (slot: QuickSlot) => {
    const s = SYMBOL_MAP[slot.symbol];
    if (!s.open) {
      setClosedSym(s);
      return;
    }
    if (confirmQuick) {
      setSymbolCode(slot.symbol);
      setContractType("rise_fall");
      setDirection(slot.dir);
      setStake(slot.stake);
      setDurationVal(slot.dur);
      setDurationUnit("ticks");
      setErrors({});
      setStage("proposal");
      setReceipt(null);
      setConfirmOpen(true);
      return;
    }
    const c = placeContract({ symbol: slot.symbol, type: "rise_fall", dir: slot.dir, stake: slot.stake, duration: slot.dur, unit: "ticks", bot: null });
    toast.push({ tone: "success", title: `One-click buy · ${slot.symbol}`, body: `${c.contractId} — ${slot.dir} ${usd(slot.stake)} over ${slot.dur} ticks.` });
  };

  // price alerts + auto-execute
  const [alerts, setAlerts] = useState<TradeAlert[]>([
    { id: 1, symbol: "R_100", cond: "above", price: 1695, dir: "rise", stake: 10, duration: 5, active: true },
    { id: 2, symbol: "R_10", cond: "below", price: 6400, dir: "fall", stake: 5, duration: 5, active: true },
  ]);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [aCond, setACond] = useState<"above" | "below">("above");
  const [aPrice, setAPrice] = useState(0);
  const [aDir, setADir] = useState("rise");
  const [aStake, setAStake] = useState(10);
  const symbolAlerts = alerts.filter((a) => a.symbol === symbolCode);
  useEffect(() => {
    const hit = alerts.find((a) => a.active && a.symbol === symbolCode && (a.cond === "above" ? quote >= a.price : quote <= a.price));
    if (!hit) return;
    setAlerts((prev) => prev.map((a) => (a.id === hit.id ? { ...a, active: false, triggered: true } : a)));
    const c = placeContract({ symbol: hit.symbol, type: "rise_fall", dir: hit.dir, stake: hit.stake, duration: hit.duration, unit: "ticks", bot: null });
    toast.push({ tone: "success", title: `Alert triggered · ${hit.symbol}`, body: `${hit.cond} ${fmtPrice(hit.price, sym.pipSize)} — auto-bought ${hit.dir} ${usd(hit.stake)} (${c.contractId}).` });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote]);

  // multi-leg builder + templates
  const [multiOpen, setMultiOpen] = useState(false);
  const [legs, setLegs] = useState<Leg[]>([
    { symbol: "R_100", type: "rise_fall", dir: "rise", stake: 10, duration: 5 },
    { symbol: "R_100", type: "higher_lower", dir: "higher", stake: 10, duration: 5 },
  ]);
  const [multiPlaced, setMultiPlaced] = useState<string[] | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templates, setTemplates] = useState<LegTemplate[]>([
    { id: 1, name: "Vol100 hedge pair", legs: [
      { symbol: "R_100", type: "rise_fall", dir: "rise", stake: 10, duration: 5 },
      { symbol: "R_100", type: "rise_fall", dir: "fall", stake: 6, duration: 5 },
    ] },
  ]);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [pendingDeleteTpl, setPendingDeleteTpl] = useState<number | null>(null);
  const legPayout = (l: Leg) => Math.round(l.stake * (1 + SYMBOL_MAP[l.symbol].payoutPct / 100) * 100) / 100;

  // contracts filter/pagination
  const [contractFilter, setContractFilter] = useState("all");
  const [contractPage, setContractPage] = useState(1);
  const filteredContracts = contracts.filter((c) => {
    if (contractFilter === "winning") return c.currentPnl >= 0;
    if (contractFilter === "losing") return c.currentPnl < 0;
    if (contractFilter === "bots") return Boolean(c.botName);
    return true;
  });
  const contractPageCount = Math.max(1, Math.ceil(filteredContracts.length / 6));
  const contractRows = filteredContracts.slice((Math.min(contractPage, contractPageCount) - 1) * 6, Math.min(contractPage, contractPageCount) * 6);

  // ---- chart geometry
  const W = 720, H = 300, PAD = 8;
  const allPrices = [...cls, ...smaLine.filter((v): v is number => v !== null), ...emaLine.filter((v): v is number => v !== null)];
  const minP = Math.min(...allPrices, ...candles.map((c) => c.l));
  const maxP = Math.max(...allPrices, ...candles.map((c) => c.h));
  const spanP = maxP - minP || 1;
  const yOf = (p: number) => PAD + (1 - (p - minP) / spanP) * (H - PAD * 2);
  const xOf = (i: number) => PAD + (i + 0.5) * ((W - PAD * 2) / Math.max(1, candles.length));
  const linePath = (vals: (number | null)[]) =>
    vals.map((v, i) => (v === null ? null : `${i === 0 || vals[i - 1] === null ? "M" : "L"}${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`)).filter(Boolean).join(" ");
  const cross = crossIdx !== null && candles[crossIdx] ? candles[crossIdx] : candles[candles.length - 1];
  const symDrawings = drawings[symbolCode] ?? [];

  const onChartClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!drawMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const py = ((e.clientY - rect.top) / rect.height) * H;
    const idx = Math.max(0, Math.min(candles.length - 1, Math.floor((px - PAD) / ((W - PAD * 2) / Math.max(1, candles.length)))));
    const price = minP + (1 - (py - PAD) / (H - PAD * 2)) * spanP;
    if (drawMode === "sr") {
      setDrawings((prev) => ({ ...prev, [symbolCode]: [...(prev[symbolCode] ?? []), { kind: "sr", x1: 0, y1: price, x2: candles.length - 1, y2: price }] }));
      setDrawMode(null);
      return;
    }
    if (!trendPending) {
      setTrendPending({ x: idx, y: price });
      return;
    }
    setDrawings((prev) => ({ ...prev, [symbolCode]: [...(prev[symbolCode] ?? []), { kind: "trend", x1: trendPending.x, y1: trendPending.y, x2: idx, y2: price }] }));
    setTrendPending(null);
    setDrawMode(null);
  };

  const toggleFav = (code: string) =>
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  const saveLayout = () => {
    if (!layoutName.trim()) return;
    setLayouts((prev) => [{ id: Date.now(), name: layoutName.trim(), symbol: symbolCode, tf, chartType, indicators }, ...prev]);
    setLayoutName("");
  };

  const indCount = [indicators.sma.on, indicators.ema.on, indicators.bb.on, indicators.rsi, indicators.macd].filter(Boolean).length;
  const scheduleNote = MARKET_SCHEDULES.find((s) => s.market === sym.market);

  return (
    <div className={calm ? "is-calm" : ""}>
      {/* ------- symbol bar ------- */}
      <Reveal>
        <section className="dx-card p-3 mb-3">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <div className="dx-field mb-0" style={{ minWidth: 220 }}>
              <label className="dx-field-label" htmlFor="td-symbol">Symbol</label>
              <select id="td-symbol" className="dx-select" value={symbolCode} onChange={(e) => setSymbolCode(e.target.value)}>
                {MARKET_SYMBOLS.map((s) => (
                  <option key={s.code} value={s.code}>{s.code} — {s.name}{s.open ? "" : " (closed)"}</option>
                ))}
              </select>
            </div>
            <button type="button" className="dx-btn" onClick={() => setSymbolDrawerOpen(true)}>Symbol list</button>
            <button type="button" className="dx-icon-btn" aria-pressed={favorites.has(symbolCode)} aria-label={`Toggle ${symbolCode} favourite`} onClick={() => toggleFav(symbolCode)}>
              <Star size={16} className={favorites.has(symbolCode) ? "dx-mk-star-on" : undefined} />
            </button>
            <div className="ms-md-auto d-flex flex-wrap align-items-center gap-2">
              <PriceFlash value={fmtPrice(quote, sym.pipSize)} dir={spotDir} className="dx-stat-value" />
              <Chip tone={sym.changePct >= 0 ? "up" : "down"}>{sym.changePct >= 0 ? "▲ +" : "▼ "}{sym.changePct.toFixed(2)}%</Chip>
              {sym.open ? <Chip tone="up" pulse>open</Chip> : <Chip tone="muted">closed</Chip>}
              <Chip>spread <span className="font-display">{fmtPrice(sym.spread, sym.pipSize)}</span></Chip>
              <Chip>payout <span className="font-display">{sym.payoutPct}%</span></Chip>
              <button type="button" className="dx-btn dx-btn-sm" onClick={() => { setAPrice(quote); setAlertsOpen(true); }}>
                <Bell size={13} /> Alerts ({symbolAlerts.filter((a) => a.active).length})
              </button>
              <Link to="/dashboard/markets" className="dx-btn dx-btn-sm dx-btn-ghost">All markets</Link>
            </div>
          </div>
          {announce && (
            <p className="dx-help mb-0 mt-2" role="status" aria-live="polite">
              {symbolCode} {fmtPrice(quote, sym.pipSize)} {spotDir === "down" ? "down" : "up"} · {tf} chart · {contracts.length} open contracts
            </p>
          )}
        </section>
      </Reveal>

      {/* ------- one-click bar ------- */}
      <Reveal delay={30}>
        <section className="dx-card p-3 mb-3" aria-label="One-click trading">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <span className="dx-eyebrow">One-click</span>
            {slots.map((slot, i) => (
              <button key={i} type="button" className="dx-btn dx-btn-sm" onClick={() => quickBuy(slot)}>
                <span className="font-display">{slot.symbol}</span> {slot.dir === "rise" ? <span className="dx-up">▲ Rise</span> : <span className="dx-down">▼ Fall</span>}{" "}
                <span className="font-display">{usd(slot.stake)}</span> · <span className="font-display">{slot.dur}t</span>
              </button>
            ))}
            <span className="ms-auto d-flex align-items-center gap-3">
              <Toggle checked={confirmQuick} onChange={setConfirmQuick} label="Confirm first" />
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setQuickOpen(true)}>Configure slots</button>
            </span>
          </div>
        </section>
      </Reveal>

      <div className="row g-3 mb-3">
        {/* ------- chart ------- */}
        <div className="col-12 col-lg-8">
          <Reveal delay={50}>
            <section className="dx-card h-100">
              <div className="dx-card-head">
                <span className="d-flex flex-wrap gap-2 align-items-center">
                  <MiniTabs ariaLabel="Timeframe"
                    options={[{ id: "1m", label: "1m" }, { id: "5m", label: "5m" }, { id: "15m", label: "15m" }, { id: "1h", label: "1h" }, { id: "1d", label: "1d" }]}
                    value={tf} onChange={(v) => setTf(v as TF)} />
                  <MiniTabs ariaLabel="Chart type"
                    options={[{ id: "candle", label: "Candles" }, { id: "line", label: "Line" }, { id: "bars", label: "Bars" }]}
                    value={chartType} onChange={(v) => setChartType(v as ChartType)} />
                </span>
                <span className="d-flex flex-wrap gap-1">
                  <button type="button" className="dx-btn dx-btn-sm" onClick={() => setIndicatorsOpen(true)}>Indicators ({indCount})</button>
                  <button type="button" className="dx-btn dx-btn-sm" aria-pressed={drawMode === "trend"} onClick={() => { setDrawMode(drawMode === "trend" ? null : "trend"); setTrendPending(null); }}>Trendline</button>
                  <button type="button" className="dx-btn dx-btn-sm" aria-pressed={drawMode === "sr"} onClick={() => setDrawMode(drawMode === "sr" ? null : "sr")}>S/R line</button>
                  <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setDrawings((prev) => ({ ...prev, [symbolCode]: [] }))}>Clear</button>
                  <button type="button" className="dx-btn dx-btn-sm" aria-pressed={dualView} onClick={() => setDualView((d) => !d)}>Dual view</button>
                  <button type="button" className="dx-btn dx-btn-sm" onClick={() => setLayoutsOpen(true)}>Layouts</button>
                  <button
                    type="button" className="dx-btn dx-btn-sm"
                    onClick={() => {
                      if (feedPaused) { setFeedPaused(false); setFrozen(null); }
                      else { setFrozen(liveSeries); setFeedPaused(true); }
                    }}
                  >
                    {feedPaused ? <><Play size={13} /> Resume feed</> : <><Pause size={13} /> Pause feed</>}
                  </button>
                </span>
              </div>
              <div className="dx-card-body">
                <div
                  className="dx-chart-wrap"
                  tabIndex={0}
                  role="application"
                  aria-label={`${symbolCode} price chart. Use left and right arrow keys to move the crosshair.`}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowRight") { e.preventDefault(); setCrossIdx((i) => Math.min(candles.length - 1, (i ?? candles.length - 1) + 1)); }
                    if (e.key === "ArrowLeft") { e.preventDefault(); setCrossIdx((i) => Math.max(0, (i ?? candles.length - 1) - 1)); }
                  }}
                >
                  <svg viewBox={`0 0 ${W} ${H}`} className="dx-chart-svg" role="img" aria-label={`${symbolCode} ${tf} ${chartType} chart`} onClick={onChartClick}>
                    {[0.25, 0.5, 0.75].map((f) => (
                      <line key={f} x1={PAD} x2={W - PAD} y1={H * f} y2={H * f} className="dx-chart-grid" />
                    ))}
                    {chartType === "line" && <path d={linePath(cls.map((v) => v))} className="dx-chart-line" fill="none" />}
                    {chartType !== "line" && candles.map((c, i) => {
                      const up = c.c >= c.o;
                      const bw = Math.max(2, ((W - PAD * 2) / candles.length) * 0.6);
                      return (
                        <g key={i} className={up ? "dx-candle-up" : "dx-candle-down"}>
                          <line x1={xOf(i)} x2={xOf(i)} y1={yOf(c.h)} y2={yOf(c.l)} className="dx-candle-wick" />
                          {chartType === "candle" ? (
                            <rect x={xOf(i) - bw / 2} y={yOf(Math.max(c.o, c.c))} width={bw} height={Math.max(1.5, Math.abs(yOf(c.o) - yOf(c.c)))} className="dx-candle-body" />
                          ) : (
                            <>
                              <line x1={xOf(i) - bw / 2} x2={xOf(i)} y1={yOf(c.o)} y2={yOf(c.o)} className="dx-candle-wick" />
                              <line x1={xOf(i)} x2={xOf(i) + bw / 2} y1={yOf(c.c)} y2={yOf(c.c)} className="dx-candle-wick" />
                            </>
                          )}
                        </g>
                      );
                    })}
                    {indicators.sma.on && <path d={linePath(smaLine)} className="dx-ind-sma" fill="none" />}
                    {indicators.ema.on && <path d={linePath(emaLine)} className="dx-ind-ema" fill="none" />}
                    {bbLines && <path d={linePath(bbLines.upper)} className="dx-ind-bb" fill="none" />}
                    {bbLines && <path d={linePath(bbLines.lower)} className="dx-ind-bb" fill="none" />}
                    {symDrawings.map((d, i) =>
                      d.kind === "sr" ? (
                        <line key={i} x1={PAD} x2={W - PAD} y1={yOf(d.y1)} y2={yOf(d.y1)} className="dx-draw-sr" />
                      ) : (
                        <line key={i} x1={xOf(d.x1)} x2={xOf(d.x2)} y1={yOf(d.y1)} y2={yOf(d.y2)} className="dx-draw-trend" />
                      ),
                    )}
                    {trendPending && <circle cx={xOf(trendPending.x)} cy={yOf(trendPending.y)} r={4} className="dx-draw-dot" />}
                    {cross && (
                      <line x1={xOf(crossIdx ?? candles.length - 1)} x2={xOf(crossIdx ?? candles.length - 1)} y1={PAD} y2={H - PAD} className="dx-crosshair" />
                    )}
                  </svg>
                  {feedPaused && (
                    <div className="dx-chart-paused">
                      <p className="mb-2"><strong>Feed paused</strong> — chart frozen, pricing pill shows reconnecting. Your data is intact.</p>
                      <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => { setFeedPaused(false); setFrozen(null); }}>
                        <Play size={13} /> Resume feed
                      </button>
                    </div>
                  )}
                </div>
                <div className="d-flex flex-wrap gap-3 dx-help mt-2">
                  <span>O <span className="font-display">{cross ? fmtPrice(cross.o, sym.pipSize) : "—"}</span></span>
                  <span>H <span className="font-display">{cross ? fmtPrice(cross.h, sym.pipSize) : "—"}</span></span>
                  <span>L <span className="font-display">{cross ? fmtPrice(cross.l, sym.pipSize) : "—"}</span></span>
                  <span>C <span className="font-display">{cross ? fmtPrice(cross.c, sym.pipSize) : "—"}</span></span>
                  {indicators.rsi && <span>RSI <span className="font-display">{rsi}</span></span>}
                  {indicators.macd && <span>MACD <span className="font-display">{(rsi - 50).toFixed(1)}</span> (demo calc)</span>}
                  <span className="ms-auto">{drawMode ? (drawMode === "trend" ? (trendPending ? "Click the second point…" : "Click the first trendline point…") : "Click the chart to drop a support/resistance line…") : `${candles.length} candles · ←/→ moves crosshair`}</span>
                </div>
                {dualView && (
                  <div className="mt-3">
                    <p className="dx-eyebrow mb-1">Multi-timeframe · 5m context</p>
                    <svg viewBox={`0 0 ${W} 90`} className="dx-chart-svg" role="img" aria-label={`${symbolCode} 5 minute context chart`}>
                      <path
                        d={dualSeries.map((v, i) => {
                          const mn = Math.min(...dualSeries), mx = Math.max(...dualSeries), sp = mx - mn || 1;
                          return `${i === 0 ? "M" : "L"}${(PAD + (i / Math.max(1, dualSeries.length - 1)) * (W - PAD * 2)).toFixed(1)},${(8 + (1 - (v - mn) / sp) * 74).toFixed(1)}`;
                        }).join(" ")}
                        className="dx-chart-line" fill="none"
                      />
                    </svg>
                  </div>
                )}
                <div className="d-flex flex-wrap gap-4 mt-3">
                  <Toggle checked={announce} onChange={setAnnounce} label="Announce prices (screen reader)" />
                  <Toggle checked={calm} onChange={setCalm} label="Reduce visual noise" hint="Stops pulse/flash animation on this page" />
                </div>
              </div>
            </section>
          </Reveal>
        </div>

        {/* ------- order panel ------- */}
        <div className="col-12 col-lg-4">
          <Reveal delay={90}>
            <section className="dx-card dx-order-panel">
              <div className="dx-card-head">
                <span>Order panel</span>
                <Chip tone={feedPaused ? "warn" : "up"} pulse={!feedPaused}>{feedPaused ? "Pricing: reconnecting…" : "Pricing: live"}</Chip>
              </div>
              <div className="dx-card-body d-grid gap-3">
                <div className="dx-field mb-0">
                  <label className="dx-field-label" htmlFor="td-type">Contract type</label>
                  <select
                    id="td-type" className="dx-select" value={contractType}
                    onChange={(e) => {
                      const next = e.target.value as ContractTypeId;
                      setContractType(next);
                      setDirection((DIRECTION_PAIRS[next] ?? DIRECTION_PAIRS.rise_fall)[0].value);
                      const t = CONTRACT_TYPE_MAP[next];
                      if (!t.units.includes(durationUnit)) setDurationUnit(t.units[0]);
                    }}
                  >
                    {sym.contractTypes.map((id) => <option key={id} value={id}>{CONTRACT_TYPE_MAP[id].label}</option>)}
                  </select>
                  <span className="dx-help">{type.blurb}</span>
                </div>

                <div className="dx-field mb-0">
                  <span className="dx-field-label">Direction</span>
                  <div className="d-flex gap-2" role="group" aria-label="Direction">
                    {dirPair.map((d, i) => (
                      <button
                        key={d.value} type="button" aria-pressed={direction === d.value}
                        className={`dx-btn flex-grow-1 ${direction === d.value ? "dx-btn-primary" : ""}`}
                        onClick={() => setDirection(d.value)}
                      >
                        {i === 0 ? <span className="dx-up">▲</span> : <span className="dx-down">▼</span>} {d.label}
                        <span className="d-block font-display small">{i === 0 ? fmtPrice(quote + sym.spread / 2, sym.pipSize) : fmtPrice(quote - sym.spread / 2, sym.pipSize)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="row g-2">
                  <div className="col-6">
                    <div className="dx-field mb-0">
                      <label className="dx-field-label" htmlFor="td-dur">Duration</label>
                      <input id="td-dur" type="number" className={`dx-input font-display ${errors.duration ? "is-invalid" : ""}`} value={durationVal}
                        onChange={(e) => { setDurationVal(Number(e.target.value)); setErrors((er) => ({ ...er, duration: undefined })); }} />
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="dx-field mb-0">
                      <label className="dx-field-label" htmlFor="td-unit">Unit</label>
                      <select id="td-unit" className="dx-select" value={durationUnit} onChange={(e) => setDurationUnit(e.target.value as DurationUnit)}>
                        {DURATION_UNITS.filter((u) => type.units.includes(u.id)).map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                {errors.duration ? <p className="dx-help dx-down mb-0" role="alert">{errors.duration}</p> : null}

                {needsBarrier && (
                  <div className="dx-field mb-0">
                    <label className="dx-field-label" htmlFor="td-barrier">Barrier ({type.barrier})</label>
                    <input id="td-barrier" type="text" inputMode="decimal" className={`dx-input font-display ${errors.barrier ? "is-invalid" : ""}`}
                      placeholder={fmtPrice(quote, sym.pipSize)} value={barrier}
                      onChange={(e) => { setBarrier(e.target.value); setErrors((er) => ({ ...er, barrier: undefined })); }} />
                    {errors.barrier ? <span className="dx-help dx-down" role="alert">{errors.barrier}</span> : null}
                  </div>
                )}

                <div className="dx-field mb-0">
                  <label className="dx-field-label" htmlFor="td-stake">Stake (USD)</label>
                  <input id="td-stake" type="number" className={`dx-input font-display ${errors.stake ? "is-invalid" : ""}`} value={stake}
                    onChange={(e) => { setStake(Number(e.target.value)); setErrors((er) => ({ ...er, stake: undefined })); }} />
                  <span className="d-flex gap-1 mt-1">
                    {[1, 5, 10, 25, 100].map((v) => (
                      <button key={v} type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setStake(v)}>${v}</button>
                    ))}
                  </span>
                  {errors.stake ? <span className="dx-help dx-down" role="alert">{errors.stake}</span> : <span className="dx-help">Range {usd(sym.minStake)}–{usd(sym.maxStake)} · balance {usd(account.balance)}</span>}
                </div>

                <div className="dx-card-inset">
                  <span className="dx-kpi-label">Proposal · {CONTRACT_TYPE_MAP[contractType].label} {fmtDur(durationVal, durationUnit)}</span>
                  <div className="d-flex justify-content-between mt-1">
                    <span className="dx-help">Spot</span><span className="font-display">{fmtPrice(quote, sym.pipSize)}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="dx-help">Ask price</span><span className="font-display">{usd(stake)}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="dx-help">Payout if you win</span><span className="font-display dx-up">{usd(payout)}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="dx-help">Potential profit / loss</span>
                    <span className="font-display"><span className="dx-up">+{usd(profitIfWin)}</span> / <span className="dx-down">−{usd(stake)}</span></span>
                  </div>
                </div>

                <div className="d-flex flex-wrap align-items-center gap-2">
                  <Chip>Account <span className="font-display">{routedAccount.loginId}</span></Chip>
                  <Toggle checked={smartRouting} onChange={setSmartRouting} label="Smart routing" />
                  <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setRoutingOpen(true)}>Routing detail</button>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <span className="dx-field-label mb-0">Assign bot</span>
                  <Dropdown
                    label="Assign bot"
                    trigger={<span>{assignedBot ? assignedBot.name : "Manual trade"}</span>}
                    items={[
                      { id: "none", label: "Manual trade", hint: "no bot", onSelect: () => setAssignBotId(null), active: assignBotId === null },
                      ...runningBots.map((b) => ({
                        id: b.id,
                        label: b.name,
                        hint: `${b.symbol} · ${b.trades} trades`,
                        onSelect: () => setAssignBotId(b.id),
                        active: assignBotId === b.id,
                      })),
                    ]}
                  />
                  {assignedBot && assignedBot.symbol !== symbolCode ? <Chip tone="warn">symbol differs — will queue</Chip> : null}
                </div>

                <div className="d-flex gap-2">
                  {dirPair.map((d, i) => (
                    <button key={d.value} type="button" className={`dx-btn dx-btn-lg flex-grow-1 ${i === 0 ? "dx-btn-primary" : ""}`} onClick={() => attemptBuy(d.value)}>
                      {i === 0 ? <span className="dx-up">▲</span> : <span className="dx-down">▼</span>} Buy {d.label}
                    </button>
                  ))}
                </div>
                <button type="button" className="dx-btn" onClick={() => { setMultiPlaced(null); setMultiOpen(true); }}>
                  <Plus size={14} /> Multi-leg builder
                </button>
                <button type="button" className="dx-btn dx-btn-ghost" onClick={() => setTemplatesOpen(true)}>
                  Leg templates ({templates.length})
                </button>
              </div>
            </section>
          </Reveal>
        </div>
      </div>

      {/* ------- open contracts ------- */}
      <Reveal>
        <section className="dx-card" id="td-contracts">
          <div className="dx-card-head">
            <span>Open contracts ({contracts.length})</span>
            <span className="d-flex gap-2">
              <button type="button" className="dx-btn dx-btn-sm" onClick={() => setJournalOpen(true)}>Trading journal ({journal.length})</button>
              <FilterChips
                options={[{ id: "winning", label: "Winning" }, { id: "losing", label: "Losing" }, { id: "bots", label: "Bot trades" }]}
                value={contractFilter}
                onChange={(v) => { setContractFilter(v); setContractPage(1); }}
                allLabel="All"
              />
            </span>
          </div>
          <div className="dx-card-body">
            {filteredContracts.length === 0 ? (
              <EmptyState
                title={contracts.length === 0 ? "No open contracts" : "Nothing in this filter"}
                message={contracts.length === 0 ? "Buy a contract from the order panel and it will be monitored here in real time." : "Try a different filter, or clear it to see every open contract."}
                action={contracts.length === 0
                  ? <button type="button" className="dx-btn dx-btn-primary" onClick={() => attemptBuy(dirPair[0].value)}>Buy {dirPair[0].label} on {symbolCode}</button>
                  : <button type="button" className="dx-btn" onClick={() => setContractFilter("all")}>Clear filter</button>}
              />
            ) : (
              <>
                <div className="dx-table-wrap dx-table-scroll">
                  <table className="dx-table dx-table-stack" aria-label="Open contracts">
                    <thead className="dx-table-sticky">
                      <tr>
                        <th scope="col">Contract</th><th scope="col">Symbol · Type</th>
                        <th scope="col" style={{ textAlign: "end" }}>Entry</th>
                        <th scope="col" style={{ textAlign: "end" }}>Current</th>
                        <th scope="col" style={{ textAlign: "end" }}>P&L</th>
                        <th scope="col" style={{ textAlign: "end" }}>Expires</th>
                        <th scope="col">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contractRows.map((c) => (
                        <ContractRow key={c.id} c={c} quote={ticks[c.symbol]?.quote} onSell={setSellTarget} onOpen={setDetail} />
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={Math.min(contractPage, contractPageCount)} pageCount={contractPageCount} onPageChange={setContractPage} total={filteredContracts.length} pageSize={6} label="contracts" />
              </>
            )}
          </div>
        </section>
      </Reveal>

      {/* ---------- overlays ---------- */}

      {/* contract confirm: proposal → buying → receipt */}
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={stage === "receipt" ? "Contract receipt" : "Confirm contract"}
        labelledBy="td-confirm-title"
        footer={
          stage === "proposal" ? (
            <div className="d-flex gap-2 justify-content-end w-100">
              <button type="button" className="dx-btn" onClick={() => setConfirmOpen(false)}>Cancel</button>
              <button type="button" className="dx-btn dx-btn-primary" onClick={confirmBuy}>Confirm buy · {usd(stake)}</button>
            </div>
          ) : stage === "receipt" ? (
            <div className="d-flex gap-2 justify-content-end w-100">
              <button type="button" className="dx-btn" onClick={() => { setConfirmOpen(false); setStage("proposal"); }}>New trade</button>
              <button
                type="button" className="dx-btn dx-btn-primary"
                onClick={() => { setConfirmOpen(false); document.getElementById("td-contracts")?.scrollIntoView({ behavior: "smooth" }); }}
              >
                Track in open contracts
              </button>
            </div>
          ) : undefined
        }
      >
        {stage === "buying" ? (
          <p className="d-flex align-items-center gap-2 mb-0"><span className="dx-pulse" aria-hidden /> Sending buy request to Deriv ({routedAccount.loginId})…</p>
        ) : stage === "receipt" && receipt ? (
          <div className="d-grid gap-2">
            <Alert tone="up" title={`Bought · ${receipt.contractId}`}>Entry spot locks in within seconds — watch it under Open contracts.</Alert>
            <div className="d-flex justify-content-between"><span className="dx-help">Contract</span><span className="font-display">{receipt.contractId}</span></div>
            <div className="d-flex justify-content-between"><span className="dx-help">Symbol · type</span><span className="font-display">{receipt.symbol}</span><span>{CONTRACT_TYPE_MAP[receipt.contractType]?.label} · {receipt.direction}</span></div>
            <div className="d-flex justify-content-between"><span className="dx-help">Entry spot</span><span className="font-display">{fmtPrice(receipt.entrySpot, SYMBOL_MAP[receipt.symbol].pipSize)}</span></div>
            <div className="d-flex justify-content-between"><span className="dx-help">Stake → payout</span><span className="font-display">{usd(receipt.stake)} → {usd(receipt.payout)}</span></div>
            <div className="d-flex justify-content-between"><span className="dx-help">Routed account</span><span className="font-display">{receipt.loginId}</span></div>
            {receipt.queued ? <Alert tone="warn" title="Queued for bot">The assigned bot is busy or on another symbol — this contract sits in its pipeline and shows a Queued badge.</Alert> : null}
          </div>
        ) : (
          <div className="d-grid gap-2">
            <div className="d-flex justify-content-between"><span className="dx-help">Symbol</span><span className="font-display">{symbolCode}</span></div>
            <div className="d-flex justify-content-between"><span className="dx-help">Contract</span><span>{type.label} · {direction}</span></div>
            <div className="d-flex justify-content-between"><span className="dx-help">Duration</span><span className="font-display">{fmtDur(durationVal, durationUnit)}</span></div>
            {needsBarrier && <div className="d-flex justify-content-between"><span className="dx-help">Barrier</span><span className="font-display">{barrier}</span></div>}
            <div className="d-flex justify-content-between"><span className="dx-help">Spot now</span><span className="font-display">{fmtPrice(quote, sym.pipSize)}</span></div>
            <div className="d-flex justify-content-between"><span className="dx-help">Stake → payout</span><span className="font-display">{usd(stake)} → {usd(payout)}</span></div>
            <div className="d-flex justify-content-between"><span className="dx-help">Profit if you win</span><span className="font-display dx-up">+{usd(profitIfWin)}</span></div>
            <div className="d-flex justify-content-between"><span className="dx-help">Account</span><span className="font-display">{routedAccount.loginId}</span></div>
            {assignedBot && <div className="d-flex justify-content-between"><span className="dx-help">Assigned bot</span><span>{assignedBot.name}</span></div>}
            <span className="dx-help">Proposal refreshes with every tick until you confirm. Prices can move between proposal and buy — that is real Deriv behaviour, priced in ticks.</span>
          </div>
        )}
      </Dialog>

      {/* closed market */}
      <Dialog open={closedSym !== null} onClose={() => setClosedSym(null)} title="Market closed" labelledBy="td-closed-title">
        {closedSym && (
          <>
            <Alert tone="danger" title={`${closedSym.code} is closed`}>
              MarketClosed — {scheduleNote ? `${scheduleNote.market} hours: ${scheduleNote.open}. ${scheduleNote.note}` : "This market is outside its trading hours."}
            </Alert>
            <div className="d-flex flex-wrap gap-2 justify-content-end mt-3">
              <button type="button" className="dx-btn" onClick={() => { setClosedSym(null); setSymbolDrawerOpen(true); }}>Pick another symbol</button>
              <button type="button" className="dx-btn dx-btn-primary" onClick={() => { setClosedSym(null); void navigate({ to: "/dashboard/markets" }); }}>Browse open markets</button>
            </div>
          </>
        )}
      </Dialog>

      {/* insufficient balance */}
      <Dialog open={insufficientOpen} onClose={() => setInsufficientOpen(false)} title="Insufficient balance" labelledBy="td-insufficient-title">
        <Alert tone="danger" title="InsufficientBalance">
          Balance: <span className="font-display">{usd(account.balance)}</span>. Required: <span className="font-display">{usd(stake)}</span> on {account.loginId}.
        </Alert>
        <p className="dx-help">Lower the stake, or switch to an account with enough headroom — smart routing can also split large stakes across accounts.</p>
        <div className="d-flex flex-wrap gap-2 justify-content-end">
          <button type="button" className="dx-btn" onClick={() => setInsufficientOpen(false)}>Lower stake</button>
          <button type="button" className="dx-btn" onClick={() => { setInsufficientOpen(false); setRoutingOpen(true); }}>See split routing</button>
          <button type="button" className="dx-btn dx-btn-primary" onClick={() => { setInsufficientOpen(false); openSwitcher(); }}>Switch account</button>
        </div>
      </Dialog>

      {/* sell */}
      <PositionCloseDialog
        position={sellTarget}
        onClose={() => setSellTarget(null)}
        onClosed={(p) => {
          setContracts((prev) => prev.filter((x) => x.id !== p.id));
          setSellTarget(null);
          setPromptFor({ contractId: p.contractId, symbol: p.symbol });
          toast.push({ tone: p.currentPnl >= 0 ? "success" : "warn", title: "Contract sold", body: `${p.symbol} closed at ${pnl(p.currentPnl)}.` });
        }}
      />

      {/* contract detail */}
      <Drawer open={detail !== null} onClose={() => setDetail(null)} title={detail ? `Contract ${detail.contractId}` : "Contract"} wide>
        {detail && (
          <div className="d-grid gap-3">
            <div className="d-flex flex-wrap gap-2">
              <Chip tone="up" pulse>open</Chip>
              <Chip>{CONTRACT_TYPE_MAP[detail.contractType]?.label} · {detail.direction}</Chip>
              {detail.botName ? <Chip tone="info">{detail.botName}</Chip> : <Chip>manual</Chip>}
              {detail.queued ? <Chip tone="warn">queued for bot</Chip> : null}
              <Chip tone={detail.risk === "high" ? "warn" : "muted"}>{detail.risk} risk</Chip>
            </div>
            <div className="d-flex align-items-end gap-3">
              <span>
                <span className="dx-help d-block">Live P&L</span>
                <span className={`dx-stat-value font-display ${detailDrift >= 0 ? "dx-up" : "dx-down"}`}>{pnl(detailDrift)}</span>
              </span>
              <span className="dx-help">expires in <span className="font-display">{detailCountdown ?? "—"}</span></span>
            </div>
            <div className="row g-3">
              <div className="col-6"><span className="dx-help d-block">Entry spot</span><strong className="font-display">{fmtPrice(detail.entrySpot, SYMBOL_MAP[detail.symbol].pipSize)}</strong></div>
              <div className="col-6"><span className="dx-help d-block">Current spot</span><strong className="font-display">{fmtPrice(ticks[detail.symbol]?.quote ?? detail.currentSpot, SYMBOL_MAP[detail.symbol].pipSize)}</strong></div>
              <div className="col-6"><span className="dx-help d-block">Stake</span><strong className="font-display">{usd(detail.stake)}</strong></div>
              <div className="col-6"><span className="dx-help d-block">Payout</span><strong className="font-display">{usd(detail.payout)}</strong></div>
              <div className="col-6"><span className="dx-help d-block">Account</span><strong className="font-display">{detail.loginId}</strong></div>
              <div className="col-6"><span className="dx-help d-block">Opened</span><strong className="font-display">{new Date(detail.openedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong></div>
            </div>
            {detail.barrier ? <p className="dx-help mb-0">Barrier <span className="font-display">{detail.barrier}</span></p> : null}
            <div className="d-flex gap-2">
              <button
                type="button" className="dx-btn dx-btn-primary flex-grow-1"
                onClick={() => { const d = detail; setDetail(null); setSellTarget(d); }}
              >
                Sell now · {pnl(detailDrift)}
              </button>
              <button type="button" className="dx-btn" onClick={() => { setPromptFor({ contractId: detail.contractId, symbol: detail.symbol }); }}>Journal note</button>
            </div>
          </div>
        )}
      </Drawer>

      {/* journal prompt */}
      <Dialog open={promptFor !== null} onClose={() => setPromptFor(null)} title="Journal this trade" labelledBy="td-journal-prompt">
        {promptFor && (
          <>
            <p className="dx-help">Contract <span className="font-display">{promptFor.contractId}</span> on <span className="font-display">{promptFor.symbol}</span> just closed. Two fields now save an hour of regret later — entries live in your trading journal.</p>
            <div className="dx-field">
              <span className="dx-field-label">Emotion tag</span>
              <div className="d-flex flex-wrap gap-1" role="group" aria-label="Emotion tag">
                {EMOTIONS.map((e) => (
                  <button key={e} type="button" className={`dx-filter-chip ${emotion === e ? "is-active" : ""}`} aria-pressed={emotion === e} onClick={() => setEmotion(e)}>{e}</button>
                ))}
              </div>
            </div>
            <div className="dx-field">
              <label className="dx-field-label" htmlFor="td-journal-note">Note</label>
              <textarea id="td-journal-note" className="dx-input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Entry reason, what the chart showed, what you'd repeat or avoid…" />
            </div>
            <div className="d-flex gap-2 justify-content-end">
              <button type="button" className="dx-btn" onClick={() => setPromptFor(null)}>Skip</button>
              <button type="button" className="dx-btn dx-btn-primary" onClick={saveJournal}>Save entry</button>
            </div>
          </>
        )}
      </Dialog>

      {/* journal drawer */}
      <Drawer open={journalOpen} onClose={() => setJournalOpen(false)} title={`Trading journal (${journal.length})`} wide>
        <p className="dx-help">Inline journal — every closed contract prompts for a note and emotion tag. Review them here before the next session.</p>
        {journal.map((j) => (
          <div key={j.id} className="dx-list-row">
            <span className="text-start">
              <span className="d-flex flex-wrap gap-2 align-items-center">
                <strong className="font-display">{j.symbol}</strong>
                <Chip tone={j.emotion === "FOMO" || j.emotion === "Tilt" || j.emotion === "Revenge" ? "warn" : "up"}>{j.emotion}</Chip>
                <span className="dx-help font-display">{j.contractId}</span>
              </span>
              <span className="d-block">{j.note}</span>
              <span className="dx-help">{agoMin(j.closedMin)} ago</span>
            </span>
            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" aria-label={`Delete journal entry ${j.contractId}`} onClick={() => setJournal((prev) => prev.filter((x) => x.id !== j.id))}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        {journal.length === 0 && <EmptyState title="Journal is empty" message="Close a contract and save the prompted entry — patterns show up fast." action={<button type="button" className="dx-btn" onClick={() => setJournalOpen(false)}>Back to trading</button>} />}
      </Drawer>

      {/* symbol list drawer */}
      <Drawer open={symbolDrawerOpen} onClose={() => setSymbolDrawerOpen(false)} title="Symbols" wide>
        <SymbolPicker
          favorites={favorites}
          onToggleFav={toggleFav}
          onPick={(code) => { setSymbolCode(code); setSymbolDrawerOpen(false); }}
        />
      </Drawer>

      {/* indicators */}
      <Dialog open={indicatorsOpen} onClose={() => setIndicatorsOpen(false)} title="Indicators" size="lg" labelledBy="td-ind-title">
        <p className="dx-eyebrow mb-2">Templates — one click</p>
        <div className="d-flex flex-wrap gap-2 mb-3">
          <button type="button" className="dx-btn dx-btn-sm" onClick={() => setIndicators({ sma: { on: true, period: 10 }, ema: { on: true, period: 20 }, bb: { on: false, period: 20 }, rsi: false, macd: false })}>Trend stack (SMA+EMA)</button>
          <button type="button" className="dx-btn dx-btn-sm" onClick={() => setIndicators({ sma: { on: false, period: 10 }, ema: { on: false, period: 20 }, bb: { on: true, period: 20 }, rsi: true, macd: false })}>Volatility stack (BB+RSI)</button>
          <button type="button" className="dx-btn dx-btn-sm" onClick={() => setIndicators({ sma: { on: true, period: 10 }, ema: { on: true, period: 20 }, bb: { on: true, period: 20 }, rsi: true, macd: true })}>Full stack</button>
          <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setIndicators({ sma: { on: false, period: 10 }, ema: { on: false, period: 20 }, bb: { on: false, period: 20 }, rsi: false, macd: false })}>Clear all</button>
        </div>
        {([
          ["sma", "SMA — simple moving average"],
          ["ema", "EMA — exponential moving average"],
          ["bb", "Bollinger Bands (±2σ)"],
        ] as const).map(([key, label]) => (
          <div key={key} className="dx-list-row">
            <Toggle
              checked={indicators[key].on}
              onChange={(v) => setIndicators((prev) => ({ ...prev, [key]: { ...prev[key], on: v } }))}
              label={label}
            />
            <label className="d-flex align-items-center gap-2">
              <span className="dx-help">period</span>
              <input
                type="number" min={2} max={50} className="dx-input font-display" style={{ width: 76 }} value={indicators[key].period}
                onChange={(e) => setIndicators((prev) => ({ ...prev, [key]: { ...prev[key], period: Math.max(2, Number(e.target.value) || 2) } }))}
              />
            </label>
          </div>
        ))}
        <div className="dx-list-row">
          <Toggle checked={indicators.rsi} onChange={(v) => setIndicators((prev) => ({ ...prev, rsi: v }))} label="RSI (14) readout" />
        </div>
        <div className="dx-list-row">
          <Toggle checked={indicators.macd} onChange={(v) => setIndicators((prev) => ({ ...prev, macd: v }))} label="MACD readout" />
        </div>
        <div className="d-flex justify-content-end mt-3">
          <button type="button" className="dx-btn dx-btn-primary" onClick={() => setIndicatorsOpen(false)}>Apply</button>
        </div>
      </Dialog>

      {/* layouts */}
      <Dialog open={layoutsOpen} onClose={() => setLayoutsOpen(false)} title="Chart layouts" labelledBy="td-layouts-title">
        <p className="dx-help">Layouts save timeframe, chart type and indicators per symbol, in this browser.</p>
        <div className="d-flex gap-2 mb-3">
          <input className="dx-input" placeholder={`Layout name for ${symbolCode}…`} value={layoutName} onChange={(e) => setLayoutName(e.target.value)} aria-label="Layout name" />
          <button type="button" className="dx-btn dx-btn-primary" disabled={!layoutName.trim()} onClick={saveLayout}>Save current</button>
        </div>
        {layouts.map((l) => (
          <div key={l.id} className="dx-list-row">
            <span className="text-start">
              <strong>{l.name}</strong>
              <span className="d-block dx-help"><span className="font-display">{l.symbol}</span> · {l.tf} · {l.chartType}</span>
            </span>
            <span className="d-flex gap-1">
              <button type="button" className="dx-btn dx-btn-sm" onClick={() => { setSymbolCode(l.symbol); setTf(l.tf); setChartType(l.chartType); setIndicators(l.indicators); setLayoutsOpen(false); }}>Apply</button>
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" aria-label={`Delete layout ${l.name}`} onClick={() => setLayouts((prev) => prev.filter((x) => x.id !== l.id))}><Trash2 size={13} /></button>
            </span>
          </div>
        ))}
        {layouts.length === 0 && <p className="dx-help mb-0">No saved layouts yet — dial in a view and save it.</p>}
      </Dialog>

      {/* routing */}
      <Dialog open={routingOpen} onClose={() => setRoutingOpen(false)} title="Smart order routing" size="lg" labelledBy="td-routing-title">
        <p className="dx-help">
          {smartRouting
            ? <>Smart routing sends this <span className="font-display">{usd(stake)}</span> order to the connected account with the lowest utilisation — currently <strong className="font-display">{routedAccount.loginId}</strong>.</>
            : <>Routing is manual: orders go to your active account <strong className="font-display">{account.loginId}</strong>. Enable smart routing in the order panel to optimise.</>}
        </p>
        {DERIV_ACCOUNTS.map((a) => {
          const util = Math.min(100, Math.round((stake / Math.max(1, a.equity)) * 100));
          return (
            <div key={a.loginId} className="dx-list-row">
              <span className="text-start">
                <span className="d-flex gap-2 align-items-center">
                  <strong className="font-display">{a.loginId}</strong>
                  {a.loginId === routedAccount.loginId ? <Chip tone="up">routed here</Chip> : null}
                  {!a.connected ? <Chip tone="muted">not connected</Chip> : null}
                </span>
                <span className="d-block dx-help">{a.label} · balance <span className="font-display">{usd(a.balance)}</span> · equity <span className="font-display">{usd(a.equity)}</span></span>
                <Meter value={util} label="Utilisation after this stake" />
              </span>
            </div>
          );
        })}
        {stake > account.balance && (
          <>
            <p className="dx-eyebrow mt-3 mb-1">Split preview — stake exceeds active balance</p>
            {DERIV_ACCOUNTS.filter((a) => a.connected).map((a) => {
              const totalBal = DERIV_ACCOUNTS.filter((x) => x.connected).reduce((s2, x) => s2 + x.balance, 0);
              const share = Math.round(stake * (a.balance / totalBal) * 100) / 100;
              return (
                <div key={a.loginId} className="d-flex justify-content-between">
                  <span className="font-display">{a.loginId}</span>
                  <span className="font-display">{usd(share)}</span>
                </div>
              );
            })}
          </>
        )}
        <div className="d-flex justify-content-end mt-3">
          <button type="button" className="dx-btn dx-btn-primary" onClick={() => setRoutingOpen(false)}>Done</button>
        </div>
      </Dialog>

      {/* one-click settings */}
      <Dialog open={quickOpen} onClose={() => setQuickOpen(false)} title="Configure one-click slots" size="lg" labelledBy="td-quick-title">
        <p className="dx-help">Four pre-configured tickets. With “Confirm first” on, a slot loads the order panel proposal; off, it buys instantly.</p>
        {slots.map((slot, i) => (
          <div key={i} className="row g-2 align-items-end mb-2">
            <div className="col-5">
              <div className="dx-field mb-0">
                <label className="dx-field-label" htmlFor={`qk-sym-${i}`}>Slot {i + 1} symbol</label>
                <select id={`qk-sym-${i}`} className="dx-select" value={slot.symbol} onChange={(e) => setSlots((prev) => prev.map((s2, si) => (si === i ? { ...s2, symbol: e.target.value } : s2)))}>
                  {MARKET_SYMBOLS.filter((s) => s.open).map((s) => <option key={s.code} value={s.code}>{s.code}</option>)}
                </select>
              </div>
            </div>
            <div className="col-3">
              <div className="dx-field mb-0">
                <label className="dx-field-label" htmlFor={`qk-dir-${i}`}>Direction</label>
                <select id={`qk-dir-${i}`} className="dx-select" value={slot.dir} onChange={(e) => setSlots((prev) => prev.map((s2, si) => (si === i ? { ...s2, dir: e.target.value as "rise" | "fall" } : s2)))}>
                  <option value="rise">Rise</option>
                  <option value="fall">Fall</option>
                </select>
              </div>
            </div>
            <div className="col-2">
              <div className="dx-field mb-0">
                <label className="dx-field-label" htmlFor={`qk-stake-${i}`}>Stake</label>
                <input id={`qk-stake-${i}`} type="number" className="dx-input font-display" value={slot.stake} onChange={(e) => setSlots((prev) => prev.map((s2, si) => (si === i ? { ...s2, stake: Number(e.target.value) } : s2)))} />
              </div>
            </div>
            <div className="col-2">
              <div className="dx-field mb-0">
                <label className="dx-field-label" htmlFor={`qk-dur-${i}`}>Ticks</label>
                <input id={`qk-dur-${i}`} type="number" min={1} max={10} className="dx-input font-display" value={slot.dur} onChange={(e) => setSlots((prev) => prev.map((s2, si) => (si === i ? { ...s2, dur: Math.min(10, Math.max(1, Number(e.target.value) || 1)) } : s2)))} />
              </div>
            </div>
          </div>
        ))}
        <div className="d-flex justify-content-end mt-2">
          <button type="button" className="dx-btn dx-btn-primary" onClick={() => setQuickOpen(false)}>Save slots</button>
        </div>
      </Dialog>

      {/* price alerts */}
      <Dialog open={alertsOpen} onClose={() => setAlertsOpen(false)} title={`Price alerts · ${symbolCode}`} size="lg" labelledBy="td-alerts-title">
        <p className="dx-help">Conditional orders on the selected symbol: when the level trades, the contract auto-executes. Max 10 active per symbol ({symbolAlerts.filter((a) => a.active).length} active here).</p>
        <div className="row g-2 align-items-end">
          <div className="col-4">
            <div className="dx-field mb-0">
              <label className="dx-field-label" htmlFor="al2-cond">Condition</label>
              <select id="al2-cond" className="dx-select" value={aCond} onChange={(e) => setACond(e.target.value as "above" | "below")}>
                <option value="above">Trades above</option>
                <option value="below">Trades below</option>
              </select>
            </div>
          </div>
          <div className="col-4">
            <div className="dx-field mb-0">
              <label className="dx-field-label" htmlFor="al2-price">Price</label>
              <input id="al2-price" type="number" step="any" className="dx-input font-display" value={aPrice} onChange={(e) => setAPrice(Number(e.target.value))} />
            </div>
          </div>
          <div className="col-4">
            <div className="dx-field mb-0">
              <label className="dx-field-label" htmlFor="al2-dir">Then buy</label>
              <select id="al2-dir" className="dx-select" value={aDir} onChange={(e) => setADir(e.target.value)}>
                <option value="rise">Rise</option>
                <option value="fall">Fall</option>
              </select>
            </div>
          </div>
          <div className="col-4">
            <div className="dx-field mb-0">
              <label className="dx-field-label" htmlFor="al2-stake">Stake (USD)</label>
              <input id="al2-stake" type="number" className="dx-input font-display" value={aStake} onChange={(e) => setAStake(Number(e.target.value))} />
            </div>
          </div>
          <div className="col-8">
            <button
              type="button" className="dx-btn dx-btn-primary w-100"
              disabled={!(aPrice > 0) || symbolAlerts.filter((a) => a.active).length >= 10}
              onClick={() => setAlerts((prev) => [...prev, { id: Date.now(), symbol: symbolCode, cond: aCond, price: aPrice, dir: aDir, stake: aStake, duration: 5, active: true }])}
            >
              <Plus size={14} /> Add alert on {symbolCode}
            </button>
          </div>
        </div>
        <p className="dx-eyebrow mt-3 mb-1">On this symbol</p>
        {symbolAlerts.map((a) => (
          <div key={a.id} className="dx-list-row">
            <span>
              <strong className="font-display">{a.symbol}</strong> {a.cond} <span className="font-display">{fmtPrice(a.price, sym.pipSize)}</span>
              <span className="dx-help d-block">→ buy {a.dir} <span className="font-display">{usd(a.stake)}</span> · {a.duration} ticks</span>
            </span>
            <span className="d-flex gap-2 align-items-center">
              {a.triggered ? <Chip tone="up">triggered</Chip> : <Chip tone={a.active ? "up" : "muted"} pulse={a.active}>{a.active ? "watching" : "off"}</Chip>}
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" aria-label={`Delete alert ${a.id}`} onClick={() => setAlerts((prev) => prev.filter((x) => x.id !== a.id))}><Trash2 size={13} /></button>
            </span>
          </div>
        ))}
        {symbolAlerts.length === 0 && <p className="dx-help mb-0">No alerts on {symbolCode} yet.</p>}
      </Dialog>

      {/* multi-leg builder */}
      <Dialog open={multiOpen} onClose={() => setMultiOpen(false)} title="Multi-leg trade builder" size="lg" labelledBy="td-multi-title">
        {multiPlaced ? (
          <>
            <Alert tone="up" title="Both legs placed">Contracts {multiPlaced.join(" · ")} are live under Open contracts.</Alert>
            <div className="d-flex justify-content-end mt-3">
              <button type="button" className="dx-btn dx-btn-primary" onClick={() => { setMultiOpen(false); document.getElementById("td-contracts")?.scrollIntoView({ behavior: "smooth" }); }}>Track contracts</button>
            </div>
          </>
        ) : (
          <>
            <p className="dx-help">Two contracts, one idea — e.g. Rise plus a Higher barrier leg. Combined payout assumes both legs win.</p>
            {legs.map((leg, li) => (
              <fieldset key={li} className="dx-card-inset mb-2">
                <legend className="dx-eyebrow">Leg {li + 1}</legend>
                <div className="row g-2">
                  <div className="col-4">
                    <div className="dx-field mb-0">
                      <label className="dx-field-label" htmlFor={`leg-sym-${li}`}>Symbol</label>
                      <select id={`leg-sym-${li}`} className="dx-select" value={leg.symbol} onChange={(e) => setLegs((prev) => prev.map((l, i) => (i === li ? { ...l, symbol: e.target.value, type: SYMBOL_MAP[e.target.value].contractTypes[0], dir: (DIRECTION_PAIRS[SYMBOL_MAP[e.target.value].contractTypes[0]] ?? DIRECTION_PAIRS.rise_fall)[0].value } : l)))}>
                        {MARKET_SYMBOLS.filter((s) => s.open).map((s) => <option key={s.code} value={s.code}>{s.code}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="dx-field mb-0">
                      <label className="dx-field-label" htmlFor={`leg-type-${li}`}>Type</label>
                      <select id={`leg-type-${li}`} className="dx-select" value={leg.type} onChange={(e) => setLegs((prev) => prev.map((l, i) => (i === li ? { ...l, type: e.target.value as ContractTypeId, dir: (DIRECTION_PAIRS[e.target.value] ?? DIRECTION_PAIRS.rise_fall)[0].value } : l)))}>
                        {SYMBOL_MAP[leg.symbol].contractTypes.map((id) => <option key={id} value={id}>{CONTRACT_TYPE_MAP[id].label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="dx-field mb-0">
                      <label className="dx-field-label" htmlFor={`leg-dir-${li}`}>Direction</label>
                      <select id={`leg-dir-${li}`} className="dx-select" value={leg.dir} onChange={(e) => setLegs((prev) => prev.map((l, i) => (i === li ? { ...l, dir: e.target.value } : l)))}>
                        {(DIRECTION_PAIRS[leg.type] ?? DIRECTION_PAIRS.rise_fall).map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="dx-field mb-0">
                      <label className="dx-field-label" htmlFor={`leg-stake-${li}`}>Stake</label>
                      <input id={`leg-stake-${li}`} type="number" className="dx-input font-display" value={leg.stake} onChange={(e) => setLegs((prev) => prev.map((l, i) => (i === li ? { ...l, stake: Number(e.target.value) } : l)))} />
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="dx-field mb-0">
                      <label className="dx-field-label" htmlFor={`leg-dur-${li}`}>Duration (ticks)</label>
                      <input id={`leg-dur-${li}`} type="number" min={1} max={10} className="dx-input font-display" value={leg.duration} onChange={(e) => setLegs((prev) => prev.map((l, i) => (i === li ? { ...l, duration: Math.min(10, Math.max(1, Number(e.target.value) || 1)) } : l)))} />
                    </div>
                  </div>
                </div>
                <p className="dx-help mb-0 mt-1">Payout if this leg wins: <span className="font-display">{usd(legPayout(leg))}</span></p>
              </fieldset>
            ))}
            <div className="d-flex justify-content-between">
              <span className="dx-help">Combined stake</span><span className="font-display">{usd(legs.reduce((a, l) => a + l.stake, 0))}</span>
            </div>
            <div className="d-flex justify-content-between">
              <span className="dx-help">Combined payout (both win)</span><span className="font-display dx-up">{usd(legs.reduce((a, l) => a + legPayout(l), 0))}</span>
            </div>
            {legs[0].symbol === legs[1].symbol && legs[0].dir !== legs[1].dir && (
              <Alert tone="info" title="Hedged pair">Opposite directions on {legs[0].symbol} — one leg will lose by construction; the pair profits when the winning leg's payout beats the combined stake.</Alert>
            )}
            <div className="d-flex gap-2 mt-2">
              <input className="dx-input" placeholder="Template name…" value={templateName} onChange={(e) => setTemplateName(e.target.value)} aria-label="Template name" />
              <button
                type="button" className="dx-btn" disabled={!templateName.trim()}
                onClick={() => { setTemplates((prev) => [{ id: Date.now(), name: templateName.trim(), legs }, ...prev]); setTemplateName(""); }}
              >
                Save as template
              </button>
            </div>
            <div className="d-flex gap-2 justify-content-end mt-3">
              <button type="button" className="dx-btn" onClick={() => setMultiOpen(false)}>Cancel</button>
              <button
                type="button" className="dx-btn dx-btn-primary"
                onClick={() => {
                  const ids = legs.map((l) => placeContract({ symbol: l.symbol, type: l.type, dir: l.dir, stake: l.stake, duration: l.duration, unit: "ticks", bot: null }).contractId);
                  setMultiPlaced(ids);
                }}
              >
                Place both legs · {usd(legs.reduce((a, l) => a + l.stake, 0))}
              </button>
            </div>
          </>
        )}
      </Dialog>

      {/* leg templates */}
      <Dialog open={templatesOpen} onClose={() => setTemplatesOpen(false)} title={`Leg templates (${templates.length})`} labelledBy="td-templates-title">
        {pendingDeleteTpl !== null && (
          <Alert tone="danger" title="Delete this template?">
            <span className="d-flex gap-2 mt-1">
              <button type="button" className="dx-btn dx-btn-sm" onClick={() => setPendingDeleteTpl(null)}>Keep it</button>
              <button type="button" className="dx-btn dx-btn-sm dx-btn-danger" onClick={() => { setTemplates((prev) => prev.filter((t) => t.id !== pendingDeleteTpl)); setPendingDeleteTpl(null); }}>Confirm delete</button>
            </span>
          </Alert>
        )}
        {templates.map((t) => (
          <div key={t.id} className="dx-list-row">
            <span className="text-start">
              <strong>{t.name}</strong>
              <span className="d-block dx-help">{t.legs.map((l) => `${l.symbol} ${l.dir} ${usd(l.stake)}`).join("  +  ")}</span>
            </span>
            <span className="d-flex gap-1">
              <button type="button" className="dx-btn dx-btn-sm" onClick={() => { setLegs(t.legs); setMultiPlaced(null); setTemplatesOpen(false); setMultiOpen(true); }}>Load in builder</button>
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setPendingDeleteTpl(t.id)}><Trash2 size={13} /> Delete</button>
            </span>
          </div>
        ))}
        {templates.length === 0 && <EmptyState title="No templates" message="Build a leg pair and save it as a template for one-click reuse." action={<button type="button" className="dx-btn dx-btn-primary" onClick={() => { setTemplatesOpen(false); setMultiPlaced(null); setMultiOpen(true); }}>Open builder</button>} />}
      </Dialog>

      <span className="visually-hidden" role="status" aria-live="polite">{announce ? `${symbolCode} ${fmtPrice(quote, sym.pipSize)}` : ""}</span>
    </div>
  );
}

// symbol picker used inside the drawer (live quotes for every symbol)
function SymbolPicker({ favorites, onToggleFav, onPick }: { favorites: Set<string>; onToggleFav: (code: string) => void; onPick: (code: string) => void }) {
  const [query, setQuery] = useState("");
  const codes = useMemo(() => MARKET_SYMBOLS.map((s) => s.code), []);
  const ticks = useTicks(codes, 2200);
  const rows = MARKET_SYMBOLS.filter((s) => `${s.code} ${s.name}`.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <>
      <SearchInput placeholder="Search symbols…" value={query} onChange={setQuery} />
      <div className="mt-2">
        {rows.map((s) => (
          <div key={s.code} className="dx-list-row">
            <button type="button" className="dx-list-row-main" onClick={() => onPick(s.code)}>
              <span className="text-start">
                <strong className="font-display">{s.code}</strong>
                <span className="d-block dx-help">{s.name} · {s.market}</span>
              </span>
            </button>
            <span className="d-flex align-items-center gap-2">
              <span className="font-display">{ticks[s.code] ? fmtPrice(ticks[s.code].quote, s.pipSize) : "—"}</span>
              <Chip tone={s.changePct >= 0 ? "up" : "down"}>{s.changePct >= 0 ? "+" : ""}{s.changePct.toFixed(2)}%</Chip>
              {s.open ? <Chip tone="up">open</Chip> : <Chip tone="muted">closed</Chip>}
              <button type="button" className="dx-icon-btn" aria-pressed={favorites.has(s.code)} aria-label={`Toggle ${s.code} favourite`} onClick={() => onToggleFav(s.code)}>
                <Star size={14} className={favorites.has(s.code) ? "dx-mk-star-on" : undefined} />
              </button>
            </span>
          </div>
        ))}
        {rows.length === 0 && <p className="dx-help mb-0">No symbols match “{query}”.</p>}
      </div>
    </>
  );
}

export default function TradePage() {
  return (
    <AppShell title="Trade" actions={<Link to="/dashboard/markets" className="dx-btn dx-btn-sm dx-btn-primary d-none d-md-inline-flex">Browse markets</Link>}>
      <div className="page-trade">
        <TradeInner />
      </div>
    </AppShell>
  );
}
