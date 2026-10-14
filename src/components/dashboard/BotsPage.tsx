/* D-4 · Bot Management (/dashboard/bots). Inside the shared AppShell.
   Bot fleet overview: status/tag filters, health scoring, comparison,
   cloning, schedules, collaborative ownership, templates and bulk actions.
   Creating/configuring stays in-page (D-5 is gated in the shell nav). */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { AppShell, useDashboardAccount } from "../shell/AppShell";
import { BOTS, POSITIONS, type Bot, type StrategyPreset } from "../../data/trading";
import { CONTRACT_TYPE_MAP, MARKET_SYMBOLS, SYMBOL_MAP, fmtDur, mulberry32, pnl, usd } from "../../data/market";
import {
  Dialog, Dropdown, Toggle, SearchInput, FilterChips, Pagination, EmptyState, Chip, Meter, Sparkline, Reveal, Alert, Avatar, useToast,
} from "../ui/primitives";
import { BotDetailDrawer } from "./TradeDialogs";
import { PresetsDialog, DeployBotWizard, BacktestDialog } from "../marketing/modals/CommerceDialogs";
import { Pause, Play, Square, Trash2 } from "lucide-react";
import "../../styles/bots.scss";

// ------------------------------------------------------------------ helpers
const hashOf = (s: string) => [...s].reduce((a, c) => a + c.charCodeAt(0), 0);
const scriptOf = (b: Bot) => `${b.strategy}_v${2 + (hashOf(b.id) % 3)}.js`;
const runtimeOf = (mins: number) => `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
const timeOf = (epoch: number) => new Date(epoch).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

interface Health { score: number; band: "up" | "warn" | "down"; parts: { label: string; value: number; max: number; note: string }[] }
function healthOf(b: Bot): Health {
  const win = Math.max(0, Math.min(35, ((b.winRate - 30) / 50) * 35));
  const profit = b.pnl >= 0 ? Math.min(25, 10 + b.pnl / 10) : Math.max(0, 10 + b.pnl / 5);
  const activity = b.trades >= 100 ? 20 : b.trades >= 50 ? 15 : b.trades >= 20 ? 10 : b.trades >= 5 ? 5 : 0;
  const reliability = b.status === "error" ? 0 : b.status === "paused" ? 10 : b.status === "stopped" ? 12 : 20;
  const score = Math.round(win + profit + activity + reliability);
  return {
    score,
    band: score >= 70 ? "up" : score >= 45 ? "warn" : "down",
    parts: [
      { label: "Win rate vs 55% benchmark", value: Math.round(win), max: 35, note: `${b.winRate}% win rate` },
      { label: "Profitability", value: Math.round(profit), max: 25, note: `${pnl(b.pnl)} lifetime` },
      { label: "Activity stability", value: activity, max: 20, note: `${b.trades} trades logged` },
      { label: "Reliability", value: reliability, max: 20, note: b.status === "error" ? "errored — auto-paused" : b.status },
    ],
  };
}

/** Deterministic cumulative P&L curve ending at the bot's lifetime P&L. */
function botCurve(b: Bot, points = 36): number[] {
  if (b.trades === 0) return [];
  const rand = mulberry32(hashOf(b.id) * 97 + 13);
  const raw: number[] = [0];
  for (let i = 1; i < points; i++) raw.push(raw[i - 1] + (rand() - 0.44) * Math.max(1, Math.abs(b.pnl) * 0.14));
  const end = raw[raw.length - 1] || 1;
  return raw.map((v) => Math.round((v / end) * b.pnl * 100) / 100);
}

const ALL_TAGS = ["Scalping", "Long-term", "Recovery", "Digits", "Grid", "Test", "High-conviction"];
const STRATEGY_TAG: Record<Bot["strategy"], string> = {
  scalping: "Scalping", swing: "Long-term", dca: "Long-term", martingale: "Recovery",
  digit: "Digits", accumulator: "Scalping", fixed: "Test",
};
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
interface Schedule { days: string[]; from: string; to: string; holidays: boolean }
interface Member { name: string; role: "viewer" | "editor" | "admin" }
interface BotTemplate { id: number; name: string; preset: StrategyPreset }

const presetFromBot = (b: Bot, name: string): StrategyPreset => ({
  id: `tpl_${b.id}_${Date.now()}`,
  name,
  kind: b.strategy,
  symbol: b.symbol,
  contractType: b.contractType,
  stake: b.stake,
  duration: b.duration,
  durationUnit: b.durationUnit,
  risk: b.risk,
  winRate: b.winRate,
  avgPnl: b.trades ? Math.round((b.pnl / b.trades) * 100) / 100 : 0,
  description: `Template saved from ${b.name} — config only, no runtime data.`,
  rules: [`${CONTRACT_TYPE_MAP[b.contractType]?.label ?? b.contractType} on ${b.symbol}`, `Stake ${usd(b.stake)} · max ${usd(b.maxStake)}`, `Stop-loss ${usd(b.stopLoss)} · take-profit ${usd(b.takeProfit)}`],
  difficulty: "intermediate",
});

// ------------------------------------------------------------------ bot card
interface CardProps {
  bot: Bot;
  tags: string[];
  selected: boolean;
  syncing: boolean;
  starting: boolean;
  paper: boolean;
  schedule?: Schedule;
  onToggleSelect: (b: Bot) => void;
  onOpen: (b: Bot) => void;
  onStart: (b: Bot) => void;
  onForceStart: (b: Bot) => void;
  onCancelStart: (b: Bot) => void;
  onPause: (b: Bot) => void;
  onStop: (b: Bot) => void;
  onConfigure: (b: Bot) => void;
  onDelete: (b: Bot) => void;
  onClone: (b: Bot) => void;
  onSchedule: (b: Bot) => void;
  onOwners: (b: Bot) => void;
  onTags: (b: Bot) => void;
  onHealth: (b: Bot) => void;
  onSaveTemplate: (b: Bot) => void;
  onReplaceSymbol: (b: Bot) => void;
}

function BotCard(p: CardProps) {
  const b = p.bot;
  const health = healthOf(b);
  const curve = useMemo(() => botCurve(b), [b]);
  const sym = SYMBOL_MAP[b.symbol];
  const symUnavailable = !sym || !sym.open;
  const openTrades = POSITIONS.filter((x) => x.botId === b.id).length;
  const statusChip = p.starting
    ? <Chip tone="warn" pulse>Starting…</Chip>
    : b.status === "running" ? <Chip tone="up" pulse>Running</Chip>
    : b.status === "paused" ? <Chip tone="warn">Paused</Chip>
    : b.status === "error" ? <Chip tone="down">Error</Chip>
    : <Chip tone="muted">Stopped</Chip>;

  return (
    <article className="dx-card h-100" aria-label={`${b.name}, status ${b.status}`}>
      <div className="dx-card-head">
        <span className="d-flex align-items-center gap-2 text-start">
          <span className={`dx-pulse ${b.status === "running" ? "" : "dx-pulse-muted"}`} aria-hidden />
          <button type="button" className="dx-btn dx-btn-ghost dx-btn-sm px-0" onClick={() => p.onOpen(b)}>
            <strong>{b.name}</strong>
          </button>
        </span>
        <span className="d-flex align-items-center gap-1">
          <button type="button" className="dx-chip-btn" title="Health score — how it's calculated" onClick={() => p.onHealth(b)}>
            <Chip tone={health.band}>health <span className="font-display">{health.score}</span></Chip>
          </button>
          {statusChip}
        </span>
      </div>
      <div className="dx-card-body d-grid gap-2">
        <p className="mb-0">
          <span className="font-display">{b.symbol}</span> <span className="text-muted small">{sym?.name ?? "delisted symbol"}</span>
          <span className="d-block text-muted small">
            {b.strategy} · script <span className="font-display">{scriptOf(b)}</span> · <span className="font-display">{b.loginId}</span>
          </span>
        </p>

        {b.status === "error" && (
          <Alert tone="danger" title="Auto-paused — errored 5× in 1 min">
            Tick stream gap on {b.symbol} (demo trace). Restart when ready.
            <span className="d-flex gap-2 mt-1">
              <button type="button" className="dx-btn dx-btn-sm" onClick={() => p.onStart(b)}>Restart bot</button>
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => p.onOpen(b)}>View logs</button>
            </span>
          </Alert>
        )}
        {symUnavailable && b.status !== "error" && (
          <Alert tone="warn" title="Symbol no longer available">
            {b.symbol} is closed or delisted — starting is blocked until you pick a replacement.
            <span className="d-flex gap-2 mt-1">
              <button type="button" className="dx-btn dx-btn-sm" onClick={() => p.onReplaceSymbol(b)}>Suggest replacement</button>
            </span>
          </Alert>
        )}
        {p.starting && (
          <Alert tone="warn" title="Delayed start">
            Start is taking longer than usual.
            <span className="d-flex gap-2 mt-1">
              <button type="button" className="dx-btn dx-btn-sm" onClick={() => p.onForceStart(b)}>Force start</button>
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => p.onCancelStart(b)}>Cancel</button>
            </span>
          </Alert>
        )}

        <div className="row g-2 text-center">
          <div className="col-3"><span className="dx-help d-block">Runtime</span><strong className="font-display">{runtimeOf(b.runtimeMinutes)}</strong></div>
          <div className="col-3"><span className="dx-help d-block">Trades</span><strong className="font-display">{b.trades}</strong></div>
          <div className="col-3"><span className="dx-help d-block">Win rate</span><strong className="font-display">{b.winRate}%</strong></div>
          <div className="col-3"><span className="dx-help d-block">Stake</span><strong className="font-display">{usd(b.stake)}</strong></div>
        </div>

        <div>
          <div className="d-flex justify-content-between align-items-baseline">
            <span className="dx-help">P&L · last {Math.min(50, b.trades)} trades</span>
            <span className={`font-display ${b.pnl >= 0 ? "dx-up" : "dx-down"}`}>{pnl(b.pnl)}</span>
          </div>
          {b.trades > 0 ? (
            <Sparkline data={curve} tone={b.pnl >= 0 ? "up" : "down"} height={36} ariaLabel={`${b.name} P&L trend`} />
          ) : (
            <p className="dx-help mb-0">No trades yet — start the bot to build its P&L history.</p>
          )}
        </div>

        <div className="d-flex flex-wrap gap-1">
          {p.tags.map((t) => <Chip key={t} tone="accent">{t}</Chip>)}
          {p.paper && <Chip tone="warn">paper clone</Chip>}
          {openTrades > 0 && <Chip tone="info">{openTrades} open contracts</Chip>}
          {p.schedule && <Chip>⏸ {p.schedule.days.length === 7 ? "daily" : p.schedule.days.join(" ")} {p.schedule.from}–{p.schedule.to}</Chip>}
          {p.syncing && <Chip tone="info" pulse>Syncing…</Chip>}
          <Chip tone="muted">last trade {timeOf(b.lastTradeAt)}</Chip>
        </div>

        <div className="d-flex flex-wrap gap-2 align-items-center">
          {b.status === "running" ? (
            <button type="button" className="dx-btn dx-btn-sm" aria-label={`Pause bot ${b.name}`} onClick={() => p.onPause(b)}><Pause size={13} /> Pause</button>
          ) : (
            <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" aria-label={`Start bot ${b.name}`} disabled={p.starting} onClick={() => p.onStart(b)}><Play size={13} /> {b.status === "paused" ? "Resume" : "Start"}</button>
          )}
          <button type="button" className="dx-btn dx-btn-sm" aria-label={`Stop bot ${b.name}`} onClick={() => p.onStop(b)}><Square size={12} /> Stop</button>
          <button type="button" className="dx-btn dx-btn-sm" aria-label={`Configure bot ${b.name}`} onClick={() => p.onConfigure(b)}>Configure</button>
          <button
            type="button" className="dx-btn dx-btn-sm dx-btn-ghost" aria-pressed={p.selected}
            aria-label={`${p.selected ? "Remove" : "Add"} ${b.name} ${p.selected ? "from" : "to"} comparison`}
            onClick={() => p.onToggleSelect(b)}
          >
            {p.selected ? "✓ Comparing" : "Compare"}
          </button>
          <span className="ms-auto">
            <Dropdown
              label={`More actions for ${b.name}`}
              trigger={<span>More</span>}
              items={[
                { id: "clone", label: "Clone bot (A/B test)", onSelect: () => p.onClone(b) },
                { id: "schedule", label: "Pause schedule", onSelect: () => p.onSchedule(b) },
                { id: "tags", label: "Edit tags", onSelect: () => p.onTags(b) },
                { id: "owners", label: "Owners & audit log", onSelect: () => p.onOwners(b) },
                { id: "health", label: "Health breakdown", onSelect: () => p.onHealth(b) },
                { id: "template", label: "Save as template", onSelect: () => p.onSaveTemplate(b) },
                { id: "delete", label: "Delete bot", danger: true, onSelect: () => p.onDelete(b) },
              ]}
            />
          </span>
        </div>
      </div>
    </article>
  );
}

// ------------------------------------------------------------------ page
function BotsInner() {
  const navigate = useNavigate();
  const toast = useToast();
  const { account } = useDashboardAccount();
  const [bots, setBots] = useState<Bot[]>(BOTS);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [sort, setSort] = useState("recent");
  const [actionNeeded, setActionNeeded] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [compareHint, setCompareHint] = useState("");
  const [syncing, setSyncing] = useState<Set<string>>(new Set());
  const [starting, setStarting] = useState<Set<string>>(new Set());
  const timers = useRef<Map<string, number>>(new Map());
  const prevStatus = useRef<Map<string, Bot["status"]>>(new Map());

  const [tags, setTags] = useState<Record<string, string[]>>(() => {
    const out: Record<string, string[]> = {};
    BOTS.forEach((b) => { out[b.id] = [STRATEGY_TAG[b.strategy]]; });
    out.bot_acc_sniper = ["Scalping", "High-conviction"];
    return out;
  });
  const [schedules, setSchedules] = useState<Record<string, Schedule>>({
    bot_fx_breakout: { days: ["Mon", "Tue", "Wed", "Thu", "Fri"], from: "12:00", to: "13:00", holidays: true },
  });
  const [paper, setPaper] = useState<Set<string>>(new Set());
  const [members, setMembers] = useState<Record<string, Member[]>>({});
  const [templates, setTemplates] = useState<BotTemplate[]>([
    { id: 1, name: "Vol10 recovery (shared by Ade F.)", preset: presetFromBot(BOTS[0], "Vol10 recovery") },
    { id: 2, name: "BTC grid — conservative", preset: presetFromBot(BOTS.find((b) => b.id === "bot_btc_grid") ?? BOTS[5], "BTC grid") },
  ]);

  // dialogs
  const [detailId, setDetailId] = useState<string | null>(null);
  const [configureBot, setConfigureBot] = useState<Bot | null>(null);
  const [stopBot, setStopBot] = useState<Bot | null>(null);
  const [deleteBot, setDeleteBot] = useState<Bot | null>(null);
  const [healthBot, setHealthBot] = useState<Bot | null>(null);
  const [cloneBot, setCloneBot] = useState<Bot | null>(null);
  const [cloneMult, setCloneMult] = useState(1);
  const [clonePaper, setClonePaper] = useState(true);
  const [scheduleBot, setScheduleBot] = useState<Bot | null>(null);
  const [schedDraft, setSchedDraft] = useState<Schedule>({ days: ["Mon", "Tue", "Wed", "Thu", "Fri"], from: "12:00", to: "13:00", holidays: false });
  const [ownersBot, setOwnersBot] = useState<Bot | null>(null);
  const [inviteName, setInviteName] = useState("");
  const [tagsBot, setTagsBot] = useState<Bot | null>(null);
  const [customTag, setCustomTag] = useState("");
  const [saveTplBot, setSaveTplBot] = useState<Bot | null>(null);
  const [tplName, setTplName] = useState("");
  const [replaceBot, setReplaceBot] = useState<Bot | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [bulk, setBulk] = useState<{ kind: "pause" | "stop" | "delete"; targets: Bot[] } | null>(null);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [deployPreset, setDeployPreset] = useState<StrategyPreset | null>(null);
  const [backtestPreset, setBacktestPreset] = useState<string | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [pendingDeleteTpl, setPendingDeleteTpl] = useState<number | null>(null);

  useEffect(() => () => { timers.current.forEach((id) => window.clearTimeout(id)); }, []);

  const flashSync = (id: string) => {
    setSyncing((prev) => new Set(prev).add(id));
    window.setTimeout(() => setSyncing((prev) => { const n = new Set(prev); n.delete(id); return n; }), 1800);
  };

  const setBotStatus = (bot: Bot, status: Bot["status"]) => {
    setBots((prev) => prev.map((b) => (b.id === bot.id ? { ...b, status } : b)));
    flashSync(bot.id);
  };

  const startBot = (bot: Bot) => {
    const sym = SYMBOL_MAP[bot.symbol];
    if (!sym || !sym.open) {
      setReplaceBot(bot);
      return;
    }
    prevStatus.current.set(bot.id, bot.status);
    setStarting((prev) => new Set(prev).add(bot.id));
    const id = window.setTimeout(() => {
      setStarting((prev) => { const n = new Set(prev); n.delete(bot.id); return n; });
      setBotStatus(bot, "running");
    }, 3500);
    timers.current.set(bot.id, id);
  };
  const finishStart = (bot: Bot, run: boolean) => {
    const t = timers.current.get(bot.id);
    if (t) window.clearTimeout(t);
    timers.current.delete(bot.id);
    setStarting((prev) => { const n = new Set(prev); n.delete(bot.id); return n; });
    if (run) setBotStatus(bot, "running");
    else flashSync(bot.id);
  };

  const filtered = useMemo(() => {
    let out = bots.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (tagFilter !== "all" && !(tags[b.id] ?? []).includes(tagFilter)) return false;
      if (actionNeeded && !(healthOf(b).score < 50 || b.status === "error")) return false;
      if (query && !`${b.name} ${b.symbol} ${b.strategy}`.toLowerCase().includes(query.trim().toLowerCase())) return false;
      return true;
    });
    out = [...out].sort((a, b) => {
      if (sort === "pnl") return b.pnl - a.pnl;
      if (sort === "winRate") return b.winRate - a.winRate;
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "health") return healthOf(b).score - healthOf(a).score;
      return b.lastTradeAt - a.lastTradeAt;
    });
    return out;
  }, [bots, statusFilter, tagFilter, actionNeeded, query, sort, tags]);

  useEffect(() => setPage(1), [query, statusFilter, tagFilter, actionNeeded, sort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 6));
  const pageBots = filtered.slice((Math.min(page, pageCount) - 1) * 6, Math.min(page, pageCount) * 6);
  const presentTags = [...new Set(Object.values(tags).flat())];
  const runningCount = bots.filter((b) => b.status === "running").length;
  const totalPnl = bots.reduce((a, b) => a + b.pnl, 0);
  const compareBots = bots.filter((b) => selected.includes(b.id));
  const detailBot = detailId ? bots.find((b) => b.id === detailId) ?? null : null;

  const toggleSelect = (b: Bot) => {
    setSelected((prev) => {
      if (prev.includes(b.id)) return prev.filter((x) => x !== b.id);
      if (prev.length >= 4) {
        setCompareHint("Comparison holds 4 bots max — remove one first.");
        return prev;
      }
      setCompareHint("");
      return [...prev, b.id];
    });
  };

  const applyBulk = () => {
    if (!bulk) return;
    const ids = new Set(bulk.targets.map((b) => b.id));
    if (bulk.kind === "delete") {
      setBots((prev) => prev.filter((b) => !ids.has(b.id)));
      setSelected((prev) => prev.filter((x) => !ids.has(x)));
    } else {
      setBots((prev) => prev.map((b) => (ids.has(b.id) ? { ...b, status: bulk.kind === "pause" ? "paused" : "stopped" } : b)));
      bulk.targets.forEach((b) => flashSync(b.id));
    }
    toast.push({ tone: "success", title: `Bulk ${bulk.kind} complete`, body: `${bulk.targets.length} bot${bulk.targets.length === 1 ? "" : "s"} ${bulk.kind === "delete" ? "deleted" : bulk.kind === "pause" ? "paused" : "stopped"}.` });
    setBulk(null);
  };

  const membersOf = (b: Bot): Member[] =>
    members[b.id] ?? [
      { name: "You", role: "admin" },
      { name: b.owner === "You" ? "Ade F." : b.owner, role: "editor" },
      { name: "Mina L.", role: "viewer" },
    ];

  const cardProps = (bot: Bot): CardProps => ({
    bot,
    tags: tags[bot.id] ?? [],
    selected: selected.includes(bot.id),
    syncing: syncing.has(bot.id),
    starting: starting.has(bot.id),
    paper: paper.has(bot.id),
    schedule: schedules[bot.id],
    onToggleSelect: toggleSelect,
    onOpen: (b) => setDetailId(b.id),
    onStart: startBot,
    onForceStart: (b) => finishStart(b, true),
    onCancelStart: (b) => finishStart(b, false),
    onPause: (b) => setBotStatus(b, "paused"),
    onStop: setStopBot,
    onConfigure: setConfigureBot,
    onDelete: setDeleteBot,
    onClone: (b) => { setCloneBot(b); setCloneMult(1); setClonePaper(true); },
    onSchedule: (b) => { setScheduleBot(b); setSchedDraft(schedules[b.id] ?? { days: ["Mon", "Tue", "Wed", "Thu", "Fri"], from: "12:00", to: "13:00", holidays: false }); },
    onOwners: setOwnersBot,
    onTags: setTagsBot,
    onHealth: setHealthBot,
    onSaveTemplate: (b) => { setSaveTplBot(b); setTplName(`${b.name} template`); },
    onReplaceSymbol: setReplaceBot,
  });

  return (
    <>
      {/* header */}
      <Reveal>
        <div className="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-3">
          <div>
            <p className="dx-eyebrow mb-1">D-4 · Bot management</p>
            <h1 className="dx-h-section mb-1">Trading bots</h1>
            <p className="dx-lead mb-0">
              {bots.length} bots · {runningCount} running · fleet P&L{" "}
              <span className={`font-display ${totalPnl >= 0 ? "dx-up" : "dx-down"}`}>{pnl(totalPnl)}</span>
            </p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <button type="button" className="dx-btn" onClick={() => setBacktestPreset("pre_mart_vol10")}>Backtest a preset</button>
            <button type="button" className="dx-btn" onClick={() => setTemplatesOpen(true)}>Templates ({templates.length})</button>
            <Link to="/dashboard/trade" className="dx-btn">Manual trade</Link>
            <button type="button" className="dx-btn dx-btn-primary" onClick={() => setPresetsOpen(true)}>Create new bot</button>
          </div>
        </div>
      </Reveal>

      {/* filters */}
      <Reveal delay={40}>
        <section className="dx-card mb-3">
          <div className="dx-card-body d-grid gap-2">
            <div className="d-flex flex-wrap align-items-center gap-2">
              <SearchInput placeholder="Search bots, symbols, strategies…" value={query} onChange={setQuery} />
              <span className="ms-auto d-flex align-items-center gap-2">
                <span className="dx-help" role="status">Sort: {sort}</span>
                <Dropdown
                  label="Sort bots"
                  trigger={<span>Sort by</span>}
                  items={[
                    { id: "recent", label: "Most recent", onSelect: () => setSort("recent"), active: sort === "recent" },
                    { id: "pnl", label: "P&L (high first)", onSelect: () => setSort("pnl"), active: sort === "pnl" },
                    { id: "winRate", label: "Win rate", onSelect: () => setSort("winRate"), active: sort === "winRate" },
                    { id: "health", label: "Health score", onSelect: () => setSort("health"), active: sort === "health" },
                    { id: "name", label: "Name A–Z", onSelect: () => setSort("name"), active: sort === "name" },
                  ]}
                />
              </span>
            </div>
            <FilterChips
              options={[
                { id: "running", label: `Running (${bots.filter((b) => b.status === "running").length})` },
                { id: "paused", label: `Paused (${bots.filter((b) => b.status === "paused").length})` },
                { id: "stopped", label: `Stopped (${bots.filter((b) => b.status === "stopped").length})` },
                { id: "error", label: `Error (${bots.filter((b) => b.status === "error").length})` },
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
              allLabel={`All (${bots.length})`}
            />
            <div className="d-flex flex-wrap align-items-center gap-3">
              <FilterChips
                options={presentTags.map((t) => ({ id: t, label: t }))}
                value={tagFilter}
                onChange={setTagFilter}
                allLabel="All tags"
              />
              <Toggle checked={actionNeeded} onChange={setActionNeeded} label="Action needed only" hint="health < 50 or errored" />
            </div>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="dx-help"><span className="font-display">{filtered.length}</span> in view</span>
              <button type="button" className="dx-btn dx-btn-sm" onClick={() => setBulk({ kind: "pause", targets: filtered.filter((b) => b.status === "running") })}>Pause all running</button>
              <button type="button" className="dx-btn dx-btn-sm" onClick={() => setBulk({ kind: "stop", targets: filtered })}>Stop all in view</button>
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setBulk({ kind: "delete", targets: filtered })}>
                <Trash2 size={12} /> Delete in view
              </button>
              <span className="ms-auto d-flex align-items-center gap-2">
                {compareHint && <span className="dx-help dx-down" role="alert">{compareHint}</span>}
                {selected.length >= 2 ? (
                  <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => setCompareOpen(true)}>Compare selected ({selected.length})</button>
                ) : (
                  <span className="dx-help">Select 2–4 bots to compare</span>
                )}
              </span>
            </div>
          </div>
        </section>
      </Reveal>

      {/* cards */}
      {pageBots.length === 0 ? (
        <EmptyState
          title={bots.length === 0 ? "No bots yet" : "No bots match these filters"}
          message={bots.length === 0 ? "Deploy your first bot from a proven preset — it starts in paper-safe caps until you raise them." : "Try a different status, tag or search term."}
          action={bots.length === 0
            ? <button type="button" className="dx-btn dx-btn-primary" onClick={() => setPresetsOpen(true)}>Create your first bot</button>
            : <button type="button" className="dx-btn" onClick={() => { setQuery(""); setStatusFilter("all"); setTagFilter("all"); setActionNeeded(false); }}>Clear filters</button>}
        />
      ) : (
        <>
          <div className="row row-cols-1 row-cols-xl-2 g-3">
            {pageBots.map((b, i) => (
              <div className="col" key={b.id}>
                <Reveal delay={i * 40}>
                  <BotCard {...cardProps(b)} />
                </Reveal>
              </div>
            ))}
          </div>
          <Pagination page={Math.min(page, pageCount)} pageCount={pageCount} onPageChange={setPage} total={filtered.length} pageSize={6} label="bots" />
        </>
      )}

      {/* ---------- overlays ---------- */}
      <BotDetailDrawer bot={detailBot} onClose={() => setDetailId(null)} onSetStatus={setBotStatus} />

      {/* stop confirm */}
      <Dialog open={stopBot !== null} onClose={() => setStopBot(null)} title={stopBot ? `Stop ${stopBot.name}?` : "Stop bot"} labelledBy="bt-stop-title">
        {stopBot && (
          <>
            <p>Stopping ends the current cycle immediately. Open contracts stay open until they settle or you sell them from the Trade page.</p>
            <div className="d-flex gap-2 justify-content-end">
              <button type="button" className="dx-btn" onClick={() => setStopBot(null)}>Keep running</button>
              <button type="button" className="dx-btn dx-btn-danger" onClick={() => { setBotStatus(stopBot, "stopped"); setStopBot(null); }}>Stop bot</button>
            </div>
          </>
        )}
      </Dialog>

      {/* delete confirm (open-trades aware) */}
      <Dialog open={deleteBot !== null} onClose={() => setDeleteBot(null)} title={deleteBot ? `Delete ${deleteBot.name}?` : "Delete bot"} labelledBy="bt-delete-title">
        {deleteBot && (() => {
          const open = POSITIONS.filter((x) => x.botId === deleteBot.id).length;
          return (
            <>
              {open > 0 ? (
                <Alert tone="danger" title={`Bot has ${open} open contract${open === 1 ? "" : "s"}`}>
                  Deleting stops the bot now and its open contracts close at market. Or go back and wait for them to settle first.
                </Alert>
              ) : (
                <p>This removes <strong>{deleteBot.name}</strong> and its configuration. Trade history stays in your records; the bot cannot be undeleted.</p>
              )}
              <div className="d-flex gap-2 justify-content-end mt-3">
                <button type="button" className="dx-btn" onClick={() => setDeleteBot(null)}>{open > 0 ? "Wait — keep bot" : "Cancel"}</button>
                <button
                  type="button" className="dx-btn dx-btn-danger"
                  onClick={() => {
                    setBots((prev) => prev.filter((b) => b.id !== deleteBot.id));
                    setSelected((prev) => prev.filter((x) => x !== deleteBot.id));
                    setDeleteBot(null);
                    toast.push({ tone: "success", title: "Bot deleted", body: `${deleteBot.name} removed${open > 0 ? ` · ${open} contracts closed at market` : ""}.` });
                  }}
                >
                  {open > 0 ? "Stop & delete" : "Delete bot"}
                </button>
              </div>
            </>
          );
        })()}
      </Dialog>

      {/* configure */}
      <Dialog open={configureBot !== null} onClose={() => setConfigureBot(null)} title={configureBot ? `Configure ${configureBot.name}` : "Configure"} size="lg" labelledBy="bt-config-title">
        {configureBot && (
          <ConfigureForm
            bot={configureBot}
            onCancel={() => setConfigureBot(null)}
            onSave={(patch) => {
              setBots((prev) => prev.map((b) => (b.id === configureBot.id ? { ...b, ...patch } : b)));
              flashSync(configureBot.id);
              setConfigureBot(null);
            }}
          />
        )}
      </Dialog>

      {/* health breakdown */}
      <Dialog open={healthBot !== null} onClose={() => setHealthBot(null)} title={healthBot ? `Health · ${healthBot.name}` : "Health"} labelledBy="bt-health-title">
        {healthBot && (() => {
          const h = healthOf(healthBot);
          return (
            <>
              <div className="d-flex align-items-end gap-3 mb-2">
                <span className="dx-stat-value font-display">{h.score}</span>
                <Chip tone={h.band}>{h.score >= 70 ? "healthy" : h.score >= 45 ? "watch" : "action needed"}</Chip>
              </div>
              {h.parts.map((part) => (
                <div key={part.label} className="mb-2">
                  <Meter value={Math.round((part.value / part.max) * 100)} label={`${part.label} — ${part.note}`} display={`${part.value}/${part.max}`} />
                </div>
              ))}
              <p className="dx-help mb-0">
                Score = win rate vs the 55% benchmark (35) + profitability (25) + activity stability (20) + reliability (20).
                {h.score < 50 ? " Below 50: consider pausing, halving the stake, or backtesting new parameters before more live trades." : " Keep doing what the logs say is working."}
              </p>
              <div className="d-flex justify-content-end mt-3">
                <button type="button" className="dx-btn dx-btn-primary" onClick={() => setHealthBot(null)}>Done</button>
              </div>
            </>
          );
        })()}
      </Dialog>

      {/* clone */}
      <Dialog open={cloneBot !== null} onClose={() => setCloneBot(null)} title={cloneBot ? `Clone ${cloneBot.name}` : "Clone bot"} labelledBy="bt-clone-title">
        {cloneBot && (
          <>
            <p className="dx-help">Cloning copies the configuration (never runtime data) so you can A/B test parameters side by side.</p>
            <div className="dx-field">
              <label className="dx-field-label" htmlFor="cl-mult">Stake multiplier</label>
              <select id="cl-mult" className="dx-select" value={cloneMult} onChange={(e) => setCloneMult(Number(e.target.value))}>
                <option value={0.5}>0.5× stake ({usd(cloneBot.stake * 0.5)})</option>
                <option value={1}>1× stake ({usd(cloneBot.stake)})</option>
                <option value={2}>2× stake ({usd(cloneBot.stake * 2)})</option>
              </select>
            </div>
            <Toggle checked={clonePaper} onChange={setClonePaper} label="Paper-trade mode" hint="Clone simulates trades without touching the balance until you promote it" />
            <div className="d-flex gap-2 justify-content-end mt-3">
              <button type="button" className="dx-btn" onClick={() => setCloneBot(null)}>Cancel</button>
              <button
                type="button" className="dx-btn dx-btn-primary"
                onClick={() => {
                  const clone: Bot = {
                    ...cloneBot,
                    id: `bot_clone_${Date.now()}`,
                    name: `${cloneBot.name} (clone)`,
                    stake: Math.round(cloneBot.stake * cloneMult * 100) / 100,
                    status: "stopped",
                    pnl: 0,
                    trades: 0,
                    winRate: 0,
                    runtimeMinutes: 0,
                    lastTradeAt: Date.now(),
                  };
                  setBots((prev) => [clone, ...prev]);
                  if (clonePaper) setPaper((prev) => new Set(prev).add(clone.id));
                  setTags((prev) => ({ ...prev, [clone.id]: [...(prev[cloneBot.id] ?? []), "Test"] }));
                  setCloneBot(null);
                  toast.push({ tone: "success", title: "Bot cloned", body: `${clone.name}${clonePaper ? " — running in paper mode" : ""}. Start it when ready.` });
                }}
              >
                Create clone
              </button>
            </div>
          </>
        )}
      </Dialog>

      {/* schedule */}
      <Dialog open={scheduleBot !== null} onClose={() => setScheduleBot(null)} title={scheduleBot ? `Pause schedule · ${scheduleBot.name}` : "Schedule"} labelledBy="bt-sched-title">
        {scheduleBot && (
          <>
            <p className="dx-help">The bot pauses itself inside the window — handy for lunch breaks, news prints and quiet sessions.</p>
            <div className="dx-field">
              <span className="dx-field-label">Days</span>
              <div className="d-flex flex-wrap gap-1" role="group" aria-label="Schedule days">
                {DAYS.map((d) => (
                  <button
                    key={d} type="button" className={`dx-filter-chip ${schedDraft.days.includes(d) ? "is-active" : ""}`} aria-pressed={schedDraft.days.includes(d)}
                    onClick={() => setSchedDraft((prev) => ({ ...prev, days: prev.days.includes(d) ? prev.days.filter((x) => x !== d) : [...prev.days, d] }))}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="row g-2">
              <div className="col-6">
                <div className="dx-field mb-0">
                  <label className="dx-field-label" htmlFor="sc-from">Pause from</label>
                  <input id="sc-from" type="time" className="dx-input font-display" value={schedDraft.from} onChange={(e) => setSchedDraft((prev) => ({ ...prev, from: e.target.value }))} />
                </div>
              </div>
              <div className="col-6">
                <div className="dx-field mb-0">
                  <label className="dx-field-label" htmlFor="sc-to">Resume at</label>
                  <input id="sc-to" type="time" className="dx-input font-display" value={schedDraft.to} onChange={(e) => setSchedDraft((prev) => ({ ...prev, to: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="mt-2">
              <Toggle checked={schedDraft.holidays} onChange={(v) => setSchedDraft((prev) => ({ ...prev, holidays: v }))} label="Auto-pause on market holidays" />
            </div>
            <div className="d-flex gap-2 justify-content-end mt-3">
              {schedules[scheduleBot.id] && (
                <button type="button" className="dx-btn dx-btn-ghost" onClick={() => { setSchedules((prev) => { const n = { ...prev }; delete n[scheduleBot.id]; return n; }); setScheduleBot(null); }}>Remove schedule</button>
              )}
              <button type="button" className="dx-btn" onClick={() => setScheduleBot(null)}>Cancel</button>
              <button
                type="button" className="dx-btn dx-btn-primary" disabled={schedDraft.days.length === 0}
                onClick={() => { setSchedules((prev) => ({ ...prev, [scheduleBot.id]: schedDraft })); setScheduleBot(null); }}
              >
                Save schedule
              </button>
            </div>
          </>
        )}
      </Dialog>

      {/* owners & audit */}
      <Dialog open={ownersBot !== null} onClose={() => setOwnersBot(null)} title={ownersBot ? `Owners · ${ownersBot.name}` : "Owners"} size="lg" labelledBy="bt-owners-title">
        {ownersBot && (
          <>
            <p className="dx-help">Co-owners share this bot. Viewers watch, editors tune parameters, admins control lifecycle and membership.</p>
            {membersOf(ownersBot).map((m) => (
              <div key={m.name} className="dx-list-row">
                <span className="d-flex align-items-center gap-2 text-start">
                  <Avatar name={m.name} />
                  <span><strong>{m.name}</strong><span className="d-block dx-help">{m.role === "admin" ? "full control" : m.role === "editor" ? "can edit parameters" : "read-only"}</span></span>
                </span>
                {m.name === "You" ? <Chip tone="accent">you · admin</Chip> : (
                  <Dropdown
                    label={`Role for ${m.name}`}
                    trigger={<span>{m.role}</span>}
                    items={(["viewer", "editor", "admin"] as const).map((r) => ({
                      id: r,
                      label: r,
                      active: m.role === r,
                      onSelect: () => setMembers((prev) => ({ ...prev, [ownersBot.id]: membersOf(ownersBot).map((x) => (x.name === m.name ? { ...x, role: r } : x)) })),
                    }))}
                  />
                )}
              </div>
            ))}
            <div className="d-flex gap-2 mt-2">
              <input className="dx-input" placeholder="Invite by name or email…" value={inviteName} onChange={(e) => setInviteName(e.target.value)} aria-label="Invite member" />
              <button
                type="button" className="dx-btn" disabled={!inviteName.trim()}
                onClick={() => {
                  setMembers((prev) => ({ ...prev, [ownersBot.id]: [...membersOf(ownersBot), { name: inviteName.trim(), role: "viewer" }] }));
                  setInviteName("");
                }}
              >
                Add as viewer
              </button>
            </div>
            <p className="dx-eyebrow mt-3 mb-1">Audit log</p>
            {[
              { actor: ownersBot.owner, action: "created the bot", min: 4320 },
              { actor: "Ade F.", action: `raised stake to ${usd(ownersBot.stake)}`, min: 190 },
              { actor: "You", action: "paused during a high-impact news window", min: 64 },
              { actor: "Mina L.", action: "viewed performance report", min: 25 },
            ].map((a, i) => (
              <div key={i} className="dx-list-row">
                <span><strong>{a.actor}</strong> {a.action}</span>
                <span className="dx-help">{a.min >= 60 ? `${Math.round(a.min / 60)}h ago` : `${a.min}m ago`}</span>
              </div>
            ))}
            <div className="d-flex justify-content-end mt-3">
              <button type="button" className="dx-btn dx-btn-primary" onClick={() => setOwnersBot(null)}>Done</button>
            </div>
          </>
        )}
      </Dialog>

      {/* tags */}
      <Dialog open={tagsBot !== null} onClose={() => setTagsBot(null)} title={tagsBot ? `Tags · ${tagsBot.name}` : "Tags"} labelledBy="bt-tags-title">
        {tagsBot && (
          <>
            <p className="dx-help">Tags group bots for filtering and bulk actions.</p>
            <div className="d-flex flex-wrap gap-1 mb-3" role="group" aria-label="Bot tags">
              {[...new Set([...ALL_TAGS, ...(tags[tagsBot.id] ?? [])])].map((t) => {
                const active = (tags[tagsBot.id] ?? []).includes(t);
                return (
                  <button
                    key={t} type="button" className={`dx-filter-chip ${active ? "is-active" : ""}`} aria-pressed={active}
                    onClick={() => setTags((prev) => ({ ...prev, [tagsBot.id]: active ? (prev[tagsBot.id] ?? []).filter((x) => x !== t) : [...(prev[tagsBot.id] ?? []), t] }))}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            <div className="d-flex gap-2">
              <input className="dx-input" placeholder="Custom tag…" value={customTag} onChange={(e) => setCustomTag(e.target.value)} aria-label="Custom tag" />
              <button
                type="button" className="dx-btn" disabled={!customTag.trim()}
                onClick={() => {
                  setTags((prev) => ({ ...prev, [tagsBot.id]: [...new Set([...(prev[tagsBot.id] ?? []), customTag.trim()])] }));
                  setCustomTag("");
                }}
              >
                Add tag
              </button>
            </div>
            <div className="d-flex justify-content-end mt-3">
              <button type="button" className="dx-btn dx-btn-primary" onClick={() => setTagsBot(null)}>Done</button>
            </div>
          </>
        )}
      </Dialog>

      {/* save as template */}
      <Dialog open={saveTplBot !== null} onClose={() => setSaveTplBot(null)} title="Save as template" labelledBy="bt-savetpl-title">
        {saveTplBot && (
          <>
            <p className="dx-help">Saves {saveTplBot.name}&rsquo;s configuration only — stake {usd(saveTplBot.stake)}, {CONTRACT_TYPE_MAP[saveTplBot.contractType]?.label} on <span className="font-display">{saveTplBot.symbol}</span>. Runtime data never travels with a template.</p>
            <div className="dx-field">
              <label className="dx-field-label" htmlFor="tpl-name">Template name</label>
              <input id="tpl-name" className="dx-input" value={tplName} onChange={(e) => setTplName(e.target.value)} />
            </div>
            <div className="d-flex gap-2 justify-content-end">
              <button type="button" className="dx-btn" onClick={() => setSaveTplBot(null)}>Cancel</button>
              <button
                type="button" className="dx-btn dx-btn-primary" disabled={!tplName.trim()}
                onClick={() => {
                  setTemplates((prev) => [{ id: Date.now(), name: tplName.trim(), preset: presetFromBot(saveTplBot, tplName.trim()) }, ...prev]);
                  setSaveTplBot(null);
                  setTemplatesOpen(true);
                }}
              >
                Save template
              </button>
            </div>
          </>
        )}
      </Dialog>

      {/* symbol replacement */}
      <Dialog open={replaceBot !== null} onClose={() => setReplaceBot(null)} title="Symbol unavailable" size="lg" labelledBy="bt-replace-title">
        {replaceBot && (
          <>
            <Alert tone="warn" title={`${replaceBot.symbol} can't be traded right now`}>
              It is closed or delisted. Pick a live replacement in the same market and the bot keeps its strategy and risk caps.
            </Alert>
            {MARKET_SYMBOLS.filter((s) => s.open && s.market === (SYMBOL_MAP[replaceBot.symbol]?.market ?? "synthetics")).slice(0, 6).map((s) => (
              <div key={s.code} className="dx-list-row">
                <span><strong className="font-display">{s.code}</strong><span className="d-block dx-help">{s.name} · payout <span className="font-display">{s.payoutPct}%</span></span></span>
                <button
                  type="button" className="dx-btn dx-btn-sm dx-btn-primary"
                  onClick={() => {
                    setBots((prev) => prev.map((b) => (b.id === replaceBot.id ? { ...b, symbol: s.code } : b)));
                    setReplaceBot(null);
                  }}
                >
                  Switch & keep bot
                </button>
              </div>
            ))}
            <div className="d-flex justify-content-end mt-2">
              <button type="button" className="dx-btn" onClick={() => setReplaceBot(null)}>Decide later</button>
            </div>
          </>
        )}
      </Dialog>

      {/* comparison */}
      <Dialog open={compareOpen} onClose={() => setCompareOpen(false)} title={`Compare bots (${compareBots.length})`} size="xl" labelledBy="bt-compare-title">
        {compareBots.length >= 2 && (
          <>
            <svg viewBox="0 0 720 220" className="dx-compare-svg" role="img" aria-label="Overlaid P&L curves for compared bots">
              {compareBots.map((b, bi) => {
                const curve = botCurve(b);
                const all = compareBots.flatMap((x) => botCurve(x));
                const mn = Math.min(...all, 0), mx = Math.max(...all, 0), sp = mx - mn || 1;
                const d = curve.map((v, i) => `${i === 0 ? "M" : "L"}${(8 + (i / Math.max(1, curve.length - 1)) * 704).toFixed(1)},${(204 - ((v - mn) / sp) * 196).toFixed(1)}`).join(" ");
                return <path key={b.id} d={d} className={`dx-cmp-line dx-cmp-${bi + 1}`} fill="none" />;
              })}
            </svg>
            <div className="d-flex flex-wrap gap-2 mb-3">
              {compareBots.map((b, bi) => (
                <span key={b.id} className="d-inline-flex align-items-center gap-2">
                  <span className={`dx-cmp-swatch dx-cmp-bg-${bi + 1}`} aria-hidden /> {b.name}
                  {paper.has(b.id) && <Chip tone="warn">paper</Chip>}
                </span>
              ))}
            </div>
            <div className="dx-table-wrap">
              <table className="dx-table" aria-label="Bot comparison">
                <thead><tr><th scope="col">Metric</th>{compareBots.map((b) => <th key={b.id} scope="col">{b.name}</th>)}</tr></thead>
                <tbody>
                  {[
                    ["Health", ...compareBots.map((b) => `${healthOf(b).score}`)],
                    ["Status", ...compareBots.map((b) => b.status)],
                    ["Win rate", ...compareBots.map((b) => `${b.winRate}%`)],
                    ["P&L", ...compareBots.map((b) => pnl(b.pnl))],
                    ["Trades", ...compareBots.map((b) => `${b.trades}`)],
                    ["P&L / trade", ...compareBots.map((b) => (b.trades ? pnl(b.pnl / b.trades) : "—"))],
                    ["Stake", ...compareBots.map((b) => usd(b.stake))],
                    ["Runtime", ...compareBots.map((b) => runtimeOf(b.runtimeMinutes))],
                  ].map(([label, ...vals]) => (
                    <tr key={label}><th scope="row">{label}</th>{vals.map((v, i) => <td key={i}><span className="font-display">{v}</span></td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(() => {
              const winner = [...compareBots].sort((a, b) => healthOf(b).score + b.pnl - (healthOf(a).score + a.pnl))[0];
              const paperWinner = paper.has(winner.id);
              return (
                <Alert tone="up" title={`${winner.name} is outperforming`}>
                  Highest combined health and P&L in this set.{paperWinner ? " It is a paper clone — promote it to live from its card when the A/B test convinces you." : ""}
                  {paperWinner && (
                    <span className="d-flex mt-1">
                      <button
                        type="button" className="dx-btn dx-btn-sm dx-btn-primary"
                        onClick={() => { setPaper((prev) => { const n = new Set(prev); n.delete(winner.id); return n; }); setCompareOpen(false); }}
                      >
                        Promote {winner.name} to live
                      </button>
                    </span>
                  )}
                </Alert>
              );
            })()}
          </>
        )}
      </Dialog>

      {/* bulk confirm */}
      <Dialog open={bulk !== null} onClose={() => setBulk(null)} title={bulk ? `${bulk.kind === "delete" ? "Delete" : bulk.kind === "pause" ? "Pause" : "Stop"} ${bulk.targets.length} bots?` : "Bulk action"} labelledBy="bt-bulk-title">
        {bulk && (
          <>
            {bulk.targets.length === 0 ? (
              <p>Nothing to {bulk.kind} — no bots match that action in the current view.</p>
            ) : (
              <>
                <p>
                  {bulk.kind === "pause" && "Running bots in view pause at the end of their current cycle."}
                  {bulk.kind === "stop" && "Every bot in view stops immediately. Open contracts stay open until settled or sold."}
                  {bulk.kind === "delete" && "Every bot in view is deleted. Bots with open contracts close them at market. This cannot be undone."}
                </p>
                <p className="dx-help">{bulk.targets.slice(0, 6).map((b) => b.name).join(" · ")}{bulk.targets.length > 6 ? ` · +${bulk.targets.length - 6} more` : ""}</p>
              </>
            )}
            <div className="d-flex gap-2 justify-content-end">
              <button type="button" className="dx-btn" onClick={() => setBulk(null)}>Cancel</button>
              <button type="button" className={`dx-btn ${bulk.kind === "delete" ? "dx-btn-danger" : "dx-btn-primary"}`} disabled={bulk.targets.length === 0} onClick={applyBulk}>
                {bulk.kind === "delete" ? "Delete" : bulk.kind === "pause" ? "Pause" : "Stop"} {bulk.targets.length} bots
              </button>
            </div>
          </>
        )}
      </Dialog>

      {/* templates library */}
      <Dialog open={templatesOpen} onClose={() => setTemplatesOpen(false)} title={`Bot templates (${templates.length})`} size="lg" labelledBy="bt-templates-title">
        <p className="dx-help">Templates carry configuration only. Apply one to deploy a fresh bot, or fork a public preset from the library.</p>
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
              <span className="d-block dx-help">
                {t.preset.kind} · <span className="font-display">{t.preset.symbol}</span> · stake <span className="font-display">{usd(t.preset.stake)}</span> · win rate <span className="font-display">{t.preset.winRate}%</span>
              </span>
            </span>
            <span className="d-flex gap-1">
              <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => { setTemplatesOpen(false); setDeployPreset(t.preset); }}>Deploy bot</button>
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setPendingDeleteTpl(t.id)}><Trash2 size={12} /> Delete</button>
            </span>
          </div>
        ))}
        <div className="d-flex justify-content-end mt-3">
          <button type="button" className="dx-btn" onClick={() => { setTemplatesOpen(false); setPresetsOpen(true); }}>Fork a public preset</button>
        </div>
      </Dialog>

      {/* create / deploy chain (shared with D-1) */}
      <PresetsDialog
        open={presetsOpen}
        onClose={() => setPresetsOpen(false)}
        onDeploy={(preset) => { setPresetsOpen(false); setDeployPreset(preset); }}
        onBacktest={(presetId) => { setPresetsOpen(false); setBacktestPreset(presetId); }}
        onOpenFeature={() => void navigate({ to: "/features" })}
      />
      <BacktestDialog
        open={backtestPreset !== null}
        onClose={() => setBacktestPreset(null)}
        initialPresetId={backtestPreset ?? undefined}
        onDeploy={(preset) => { setBacktestPreset(null); setDeployPreset(preset); }}
      />
      <DeployBotWizard
        open={deployPreset !== null}
        preset={deployPreset}
        onClose={() => setDeployPreset(null)}
        onDeployed={(name, stake, cap) => {
          const preset = deployPreset;
          setDeployPreset(null);
          if (preset) {
            const bot: Bot = {
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
            };
            setBots((prev) => [bot, ...prev]);
            setTags((prev) => ({ ...prev, [bot.id]: [STRATEGY_TAG[preset.kind]] }));
          }
          toast.push({ tone: "success", title: "Bot deployed", body: `${name} is live on ${account.loginId}.` });
        }}
      />
    </>
  );
}

// configure form (isolated so drafts don't leak between bots)
function ConfigureForm({ bot, onCancel, onSave }: { bot: Bot; onCancel: () => void; onSave: (patch: Partial<Bot>) => void }) {
  const [symbol, setSymbol] = useState(bot.symbol);
  const [stake, setStake] = useState(bot.stake);
  const [duration, setDuration] = useState(bot.duration);
  const [unit, setUnit] = useState(bot.durationUnit);
  const [maxStake, setMaxStake] = useState(bot.maxStake);
  const [stopLoss, setStopLoss] = useState(bot.stopLoss);
  const [takeProfit, setTakeProfit] = useState(bot.takeProfit);
  const [martingale, setMartingale] = useState(bot.martingale);
  const sym = SYMBOL_MAP[symbol];
  const stakeError = sym && !(stake >= sym.minStake && stake <= sym.maxStake)
    ? `Stake must be between ${usd(sym.minStake)} and ${usd(sym.maxStake)} on ${symbol}.`
    : stake > maxStake ? "Stake exceeds the max-stake cap." : "";

  return (
    <>
      {bot.owner !== "You" && (
        <Alert tone="info" title={`Shared bot — ${bot.owner} edited this bot recently`}>
          Saves are last-write-wins: your change applies immediately and {bot.owner} gets a notification.
        </Alert>
      )}
      <div className="row g-2">
        <div className="col-6">
          <div className="dx-field mb-0">
            <label className="dx-field-label" htmlFor="cf-symbol">Symbol</label>
            <select id="cf-symbol" className="dx-select" value={symbol} onChange={(e) => setSymbol(e.target.value)}>
              {MARKET_SYMBOLS.map((s) => <option key={s.code} value={s.code}>{s.code}{s.open ? "" : " (closed)"}</option>)}
            </select>
          </div>
        </div>
        <div className="col-6">
          <div className="dx-field mb-0">
            <label className="dx-field-label" htmlFor="cf-stake">Stake (USD)</label>
            <input id="cf-stake" type="number" className={`dx-input font-display ${stakeError ? "is-invalid" : ""}`} value={stake} onChange={(e) => setStake(Number(e.target.value))} />
          </div>
        </div>
        <div className="col-4">
          <div className="dx-field mb-0">
            <label className="dx-field-label" htmlFor="cf-dur">Duration</label>
            <input id="cf-dur" type="number" className="dx-input font-display" value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
          </div>
        </div>
        <div className="col-4">
          <div className="dx-field mb-0">
            <label className="dx-field-label" htmlFor="cf-unit">Unit</label>
            <select id="cf-unit" className="dx-select" value={unit} onChange={(e) => setUnit(e.target.value as Bot["durationUnit"])}>
              <option value="ticks">Ticks</option>
              <option value="seconds">Seconds</option>
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
              <option value="days">Days</option>
            </select>
          </div>
        </div>
        <div className="col-4">
          <div className="dx-field mb-0">
            <label className="dx-field-label" htmlFor="cf-mart">Martingale ×</label>
            <input id="cf-mart" type="number" step={0.1} min={1} className="dx-input font-display" value={martingale} onChange={(e) => setMartingale(Number(e.target.value))} />
          </div>
        </div>
        <div className="col-4">
          <div className="dx-field mb-0">
            <label className="dx-field-label" htmlFor="cf-max">Max stake</label>
            <input id="cf-max" type="number" className="dx-input font-display" value={maxStake} onChange={(e) => setMaxStake(Number(e.target.value))} />
          </div>
        </div>
        <div className="col-4">
          <div className="dx-field mb-0">
            <label className="dx-field-label" htmlFor="cf-sl">Stop-loss</label>
            <input id="cf-sl" type="number" className="dx-input font-display" value={stopLoss} onChange={(e) => setStopLoss(Number(e.target.value))} />
          </div>
        </div>
        <div className="col-4">
          <div className="dx-field mb-0">
            <label className="dx-field-label" htmlFor="cf-tp">Take-profit</label>
            <input id="cf-tp" type="number" className="dx-input font-display" value={takeProfit} onChange={(e) => setTakeProfit(Number(e.target.value))} />
          </div>
        </div>
      </div>
      {stakeError ? <p className="dx-help dx-down mb-0" role="alert">{stakeError}</p> : <p className="dx-help mb-0">Runs {fmtDur(duration, unit)} contracts · caps: −{usd(stopLoss)} / +{usd(takeProfit)} per session.</p>}
      {sym && !sym.open && <p className="dx-help dx-down mb-0" role="alert">{symbol} is closed — saving keeps the bot unstartable until you pick a live symbol.</p>}
      <div className="d-flex gap-2 justify-content-end mt-3">
        <button type="button" className="dx-btn" onClick={onCancel}>Cancel</button>
        <button
          type="button" className="dx-btn dx-btn-primary" disabled={Boolean(stakeError)}
          onClick={() => onSave({ symbol, stake, duration, durationUnit: unit, maxStake, stopLoss, takeProfit, martingale })}
        >
          Save configuration
        </button>
      </div>
    </>
  );
}

export default function BotsPage() {
  return (
    <AppShell title="Bots">
      <div className="page-bots">
        <BotsInner />
      </div>
    </AppShell>
  );
}
