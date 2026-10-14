/* =============================================================================
   D-5 · Bot Creator — overlay family (dialogs, drawers and multi-step modals).
   Everything here is presentation + local wizard state; the page owns the real
   config, drafts, parameter sets and log tape and passes them in.
   Blueprint: tradeMO.md §5 PAGE D-5 (Bot Creator/Config).
   ============================================================================= */
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  Download,
  ExternalLink,
  FileCode2,
  FlaskConical,
  GaugeCircle,
  Layers,
  Link2,
  Play,
  RefreshCw,
  Rocket,
  ScrollText,
  Shield,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Upload,
  Wand2,
  Zap,
} from "lucide-react";
import {
  Alert,
  Avatar,
  Chip,
  CodeBlock,
  CopyButton,
  Dialog,
  Drawer,
  EmptyState,
  Field,
  FilterChips,
  Meter,
  MiniTabs,
  Progress,
  SearchInput,
  Stepper,
  Tabs,
  Toggle,
  useInterval,
} from "../ui/primitives";
import { DataTable, useDataTable } from "../ui/data-table";
import { BarSeries, LineChart } from "../ui/charts";
import {
  CONTRACT_TYPE_MAP,
  DURATION_UNITS,
  MARKET_SYMBOLS,
  SYMBOL_MAP,
  fmtDur,
  fmtPrice,
  mulberry32,
  pct,
  pnl,
  payoutFor,
  usd,
} from "../../data/market";
import {
  AI_STRATEGY_BRIEFS,
  BOT_STRATEGY_TEMPLATES,
  CONFIG_VERSIONS,
  CREATOR_LOG_LINES,
  ENGINE_SLOTS,
  HALTED_SYMBOLS,
  MARKETPLACE_STRATEGIES,
  SCRIPT_LINT_ISSUES,
  STRATEGY_PARAMETER_SETS,
  assessCompleteness,
  assessRisk,
  diffConfigs,
  exportableConfig,
  haltedSymbolOf,
  projectMonthly,
  runBacktestSim,
  runMonteCarlo,
  runParameterOptimizer,
  similarSymbolsOf,
  type AiStrategyBrief,
  type BotConfigDraft,
  type BotDraft,
  type ConfigAuditEntry,
  type ConfigDiffRow,
  type ConfigVersion,
  type CreatorLogLine,
  type MarketplaceStrategy,
  type ScriptLintIssue,
  type SimBacktest,
  type StrategyParameterSet,
  type Bot,
  type DerivAccount,
  SCRIPTS,
  SCRIPT_TEMPLATES,
} from "../../data/trading";

// ------------------------------------------------------------------ shared bits
const STRATEGY_ICONS: Record<string, typeof Layers> = {
  layers: Layers,
  "trending-up": TrendingUp,
  repeat: RefreshCw,
  target: Target,
  shield: Shield,
  spiral: Sparkles,
  code: FileCode2,
  brain: Wand2,
};

export function strategyIcon(icon: string, size = 15) {
  const Ico = STRATEGY_ICONS[icon] ?? Layers;
  return <Ico size={size} />;
}

export type CreatorOverlay =
  | { kind: "strategy-detail"; id: string }
  | { kind: "symbol-picker" }
  | { kind: "halted"; code: string }
  | { kind: "ai" }
  | { kind: "scripts" }
  | { kind: "lint"; scriptId: string }
  | { kind: "market-import"; id: string }
  | { kind: "market-preview"; id: string }
  | { kind: "template-save"; from?: string }
  | { kind: "param-set"; id?: string }
  | { kind: "param-set-delete"; id: string }
  | { kind: "share" }
  | { kind: "backtest" }
  | { kind: "backtest-result" }
  | { kind: "optimizer" }
  | { kind: "montecarlo" }
  | { kind: "import-config" }
  | { kind: "export-config"; from?: string }
  | { kind: "draft"; id: string }
  | { kind: "draft-compare"; ids: string[] }
  | { kind: "draft-delete"; id: string }
  | { kind: "draft-resume"; id: string }
  | { kind: "deploy-confirm" }
  | { kind: "deploy-progress" }
  | { kind: "deploy-receipt" }
  | { kind: "reconnect" }
  | { kind: "versions" }
  | { kind: "version-diff"; a: string; b: string }
  | { kind: "rollback"; id: string }
  | { kind: "audit"; id: string }
  | { kind: "slots" }
  | { kind: "risk" }
  | { kind: "completeness" }
  | { kind: "projection" }
  | { kind: "leave" }
  | { kind: "help" }
  | { kind: "log" }
  | null;

export interface DeployReceipt {
  name: string;
  botId: string;
  slot: number;
  loginId: string;
  stake: number;
  paper: boolean;
  mode: "deploy" | "apply";
}

export interface CreatorOverlayProps {
  overlay: CreatorOverlay;
  setOverlay: (o: CreatorOverlay) => void;
  config: BotConfigDraft;
  baseline: BotConfigDraft;
  patch: (p: Partial<BotConfigDraft>) => void;
  patchRisk: (p: Partial<BotConfigDraft["risk"]>) => void;
  patchStrategyParams: (p: Record<string, number | string>) => void;
  applyConfig: (next: BotConfigDraft) => void;
  goStep: (step: number) => void;
  account: DerivAccount;
  mode: "create" | "config";
  bot: Bot | null;
  drafts: BotDraft[];
  upsertDraft: (d: BotDraft) => void;
  removeDraft: (id: string) => void;
  paramSets: StrategyParameterSet[];
  upsertParamSet: (s: StrategyParameterSet) => void;
  removeParamSet: (id: string) => void;
  backtest: SimBacktest | null;
  setBacktest: (b: SimBacktest) => void;
  backtestSkipped: boolean;
  setBacktestSkipped: (v: boolean) => void;
  audit: ConfigAuditEntry[];
  logLines: CreatorLogLine[];
  pushLog: (line: Omit<CreatorLogLine, "id" | "atMin">) => void;
  notify: (tone: "success" | "error" | "info" | "warn", title: string, body?: string) => void;
  lintClean: string[];
  markLintClean: (scriptId: string) => void;
  onDeployed: (receipt: DeployReceipt) => void;
  onOpenOAuth: () => void;
  onOpenBotDetail: () => void;
  onOpenAuditInit: () => void;
  receipt: DeployReceipt | null;
  onRevertAudit: (id: string) => void;
  onLeave: (choice: "save" | "discard" | "stay") => void;
}

const STRATEGY_COUNT = BOT_STRATEGY_TEMPLATES.length;

function nowMinAgo(minutes: number): string {
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

/** Deterministic community reviews for a marketplace strategy. */
function reviewsFor(strategy: MarketplaceStrategy) {
  const rand = mulberry32(strategy.imports + strategy.reviews);
  const names = ["Ade F.", "Mina L.", "Jozef K.", "Priya N.", "Sam O.", "Lena S.", "Kai W.", "Nadia R."];
  const notes = [
    "Ran it on demo for two weeks before arming — the stake cap is what saves it.",
    "Breaks even on chop, but the ladder rarely goes past step 3 on this symbol.",
    "Imported, mapped my own stakes and it behaves exactly like the preview.",
    "Needs the cooldown rule or a 5-loss run hurts. Author documents it clearly.",
    "Payout on this symbol is thin in the Asian session — I schedule it 07:00+.",
    "Solid backtest numbers, but real fills are ~1 tick behind the demo tape.",
  ];
  return Array.from({ length: 5 }, (_, i) => ({
    id: `${strategy.id}-rv-${i}`,
    author: names[(strategy.imports + i * 3) % names.length],
    rating: Math.max(3, Math.min(5, Math.round((strategy.rating + (rand() - 0.4)) * 10) / 10)),
    note: notes[i % notes.length],
    ago: nowMinAgo(240 + i * 1380 + (strategy.reviews % 7) * 11),
  }));
}

function longDate(minutes: number): string {
  const base = Date.UTC(2026, 9, 13, 11, 30, 0) - minutes * 60_000;
  return new Date(base).toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

// =============================================================================
// 1 — STRATEGY DETAIL
// =============================================================================
function StrategyDetailDialog({
  id,
  config,
  onClose,
  onApply,
  onTune,
}: {
  id: string;
  config: BotConfigDraft;
  onClose: () => void;
  onApply: (step: number) => void;
  onTune: () => void;
}) {
  const strategy = BOT_STRATEGY_TEMPLATES.find((s) => s.id === id) ?? BOT_STRATEGY_TEMPLATES[0];
  const symbol = SYMBOL_MAP[config.symbol];
  const seed = runBacktestSim({ ...config, strategyId: strategy.id, symbol: symbol ? config.symbol : "R_10" }, { trades: 36 });
  return (
    <Dialog open onClose={onClose} title={strategy.name} subtitle={`${strategy.tagline} · ${strategy.category === "ai" ? "AI adaptive" : strategy.category === "custom" ? "custom script" : "built-in preset"}`} size="lg">
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <Chip tone={strategy.riskLevel === "high" ? "down" : strategy.riskLevel === "medium" ? "warn" : "up"}>risk · {strategy.riskLevel}</Chip>
        <Chip tone="info">win rate {pct(strategy.historicalWinRate, 1)}</Chip>
        <Chip tone="muted">typical DD {usd(strategy.typicalDrawdown)}</Chip>
        <Chip tone="accent">recovery ≈ {strategy.recoveryPerLoss}×</Chip>
        {strategy.markets.map((m) => (
          <span key={m} className="dx-chip dx-chip-muted">{m}</span>
        ))}
      </div>
      <p className="dx-help">{strategy.description}</p>

      <div className="dx-card-inset mb-3">
        <span className="dx-kpi-label">How the engine runs it</span>
        <p className="mb-0 mt-1" style={{ fontSize: "0.86rem" }}>{strategy.engineNote}</p>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-12 col-md-6">
          <span className="dx-eyebrow d-block mb-2">Rules</span>
          <ul className="dx-list mb-0">
            {strategy.rules.map((r) => (
              <li key={r} className="dx-list-row" style={{ fontSize: "0.84rem" }}>{r}</li>
            ))}
          </ul>
        </div>
        <div className="col-12 col-md-6">
          <span className="dx-eyebrow d-block mb-2">Default variables</span>
          <div className="dx-table-wrap">
            <table className="dx-table dx-table-sm">
              <tbody>
                {Object.entries(strategy.defaultParams).map(([k, v]) => (
                  <tr key={k}>
                    <td className="dx-help">{k}</td>
                    <td className="dx-td-num font-display">{String(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <span className="dx-eyebrow d-block mb-2">Dry run on {symbol?.name ?? config.symbol} ({seed.metrics.total} contracts, demo tape)</span>
      <div className="row g-2 mb-3">
        <div className="col-6 col-lg-3">
          <div className="dx-card-inset">
            <span className="dx-kpi-label">Win rate</span>
            <div className="dx-card-inset-value font-display">{pct(seed.metrics.winRate, 1)}</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="dx-card-inset">
            <span className="dx-kpi-label">P&L</span>
            <div className={`dx-card-inset-value font-display ${seed.metrics.pnl >= 0 ? "dx-up" : "dx-down"}`}>{pnl(seed.metrics.pnl)}</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="dx-card-inset">
            <span className="dx-kpi-label">Max drawdown</span>
            <div className="dx-card-inset-value font-display dx-down">{usd(seed.metrics.maxDrawdown)}</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="dx-card-inset">
            <span className="dx-kpi-label">Sharpe</span>
            <div className="dx-card-inset-value font-display">{seed.metrics.sharpe.toFixed(2)}</div>
          </div>
        </div>
      </div>
      <Alert tone={strategy.riskLevel === "high" ? "warn" : "info"} title={strategy.riskLevel === "high" ? "High-variance ladder" : "Fits your current caps"}>
        {strategy.riskLevel === "high"
          ? `A ${strategy.recoveryPerLoss}× ladder reaches ${usd(config.stake * Math.pow(Math.max(1, strategy.recoveryPerLoss), 4))} by step 5 at your ${usd(config.stake)} stake. Tighten max stake or max steps before arming on ${config.loginId}.`
          : `Current caps (max stake ${usd(config.maxStake)}, stop-loss ${usd(config.stopLoss)}) keep this strategy inside a ${usd(config.risk.maxDailyLoss)} daily loss.`}
      </Alert>

      <div className="d-flex flex-wrap gap-2 justify-content-end mt-3">
        <button type="button" className="dx-btn" onClick={onClose}>Close</button>
        <button type="button" className="dx-btn" onClick={onTune}>Tune parameters</button>
        <button type="button" className="dx-btn dx-btn-primary" onClick={() => onApply(1)}>Use {strategy.name}</button>
      </div>
    </Dialog>
  );
}

// =============================================================================
// 2 — SYMBOL PICKER (searchable + filterable + paginated table)
// =============================================================================
function SymbolPickerDialog({
  current,
  market,
  onClose,
  onPick,
  onHalted,
}: {
  current: string;
  market: string;
  onClose: () => void;
  onPick: (code: string) => void;
  onHalted: (code: string) => void;
}) {
  const [marketFilter, setMarketFilter] = useState<string>(market === "all" ? "all" : market);
  const halted = HALTED_SYMBOLS.map((h) => h.code);
  const rows = useMemo(
    () => MARKET_SYMBOLS.filter((s) => marketFilter === "all" || s.market === marketFilter),
    [marketFilter],
  );
  const table = useDataTable({
    rows,
    searchKeys: (s) => [s.code, s.name, s.short, s.market],
    sorters: { code: (s) => s.code, payout: (s) => s.payoutPct, popularity: (s) => s.popularity, minStake: (s) => s.minStake },
    initialSort: "popularity",
    initialPageSize: 5,
  });
  return (
    <Dialog open onClose={onClose} title="Choose a symbol" subtitle="Deriv catalog · active_symbols snapshot" size="xl">
      <div className="d-flex flex-wrap gap-2 mb-2">
        <SearchInput value={table.query} onChange={table.setQuery} placeholder="Search R_10, frxEURUSD, Volatility…" />
        <FilterChips
          options={[
            { id: "synthetics", label: "Synthetics" },
            { id: "forex", label: "Forex" },
            { id: "crypto", label: "Crypto" },
            { id: "commodities", label: "Metals" },
            { id: "indices", label: "Indices" },
          ]}
          value={marketFilter}
          onChange={setMarketFilter}
          allLabel="All markets"
        />
      </div>
      <DataTable
        ariaLabel="Deriv symbols"
        state={table}
        rowKey={(s) => s.code}
        onRowClick={(s) => (halted.includes(s.code) ? onHalted(s.code) : onPick(s.code))}
        emptyState={<EmptyState title="No symbols match" message="Clear the search or pick another market." action={<button type="button" className="dx-btn" onClick={table.reset}>Reset filters</button>} />}
        columns={[
          { key: "code", header: "Symbol", cell: (s) => (
            <span className="d-flex flex-column">
              <span className="font-display fw-semibold">{s.code}{s.code === current ? " · current" : ""}</span>
              <span className="dx-help">{s.name}</span>
            </span>
          ), sortValue: (s) => s.code },
          { header: "Market", cell: (s) => <span className="dx-chip dx-chip-muted">{s.market}</span>, hideOnMobile: true },
          { key: "payout", header: "Payout", align: "end", cell: (s) => <span className="font-display">{pct(s.payoutPct, 1)}</span>, sortValue: (s) => s.payoutPct },
          { header: "Min stake", align: "end", cell: (s) => <span className="font-display">{usd(s.minStake)}</span>, hideOnMobile: true },
          { header: "Status", align: "end", cell: (s) => (halted.includes(s.code) ? <Chip tone="warn">halted</Chip> : <Chip tone="up" pulse>open</Chip>) },
        ]}
      />
    </Dialog>
  );
}

// =============================================================================
// 3 — HALTED SYMBOL / "CHOOSE SIMILAR"
// =============================================================================
function HaltedSymbolDialog({
  code,
  onClose,
  onSwap,
}: {
  code: string;
  onClose: () => void;
  onSwap: (next: string) => void;
}) {
  const halted = haltedSymbolOf(code) ?? HALTED_SYMBOLS[0];
  const symbol = SYMBOL_MAP[code];
  const suggestions = Array.from(new Set([...halted.alternatives, ...similarSymbolsOf(code, 5)]));
  return (
    <Dialog open onClose={onClose} title={`${code} is unavailable`} subtitle={halted.reason} size="lg">
      <Alert tone="warn" title={`Feed reopens in about ${Math.ceil(halted.untilMin / 60)} h`}>
        {halted.impact} Swapping the symbol keeps every other parameter exactly as configured.
      </Alert>
      <div className="row g-2 my-3">
        <div className="col-6 col-lg-3">
          <div className="dx-card-inset">
            <span className="dx-kpi-label">Last quote</span>
            <div className="dx-card-inset-value font-display">{symbol ? fmtPrice(symbol.basePrice, symbol.pipSize) : "—"}</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="dx-card-inset">
            <span className="dx-kpi-label">Reopens in</span>
            <div className="dx-card-inset-value font-display">{halted.untilMin}m</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="dx-card-inset">
            <span className="dx-kpi-label">Alternatives</span>
            <div className="dx-card-inset-value font-display">{suggestions.length}</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="dx-card-inset">
            <span className="dx-kpi-label">Contract fit</span>
            <div className="dx-card-inset-value font-display">{symbol ? symbol.contractTypes.length : 0}</div>
          </div>
        </div>
      </div>
      <span className="dx-eyebrow d-block mb-2">Closest tradable symbols (same market and payout profile)</span>
      <div className="dx-table-wrap">
        <table className="dx-table dx-table-sm">
          <thead>
            <tr>
              <th scope="col">Symbol</th>
              <th scope="col">Market</th>
              <th scope="col" style={{ textAlign: "right" }}>Payout</th>
              <th scope="col" className="dx-td-actions">Swap</th>
            </tr>
          </thead>
          <tbody>
            {suggestions.map((s) => {
              const sym = SYMBOL_MAP[s];
              if (!sym) return null;
              return (
                <tr key={s}>
                  <td>
                    <span className="font-display fw-semibold">{s}</span>
                    <span className="dx-help d-block">{sym.name}</span>
                  </td>
                  <td><span className="dx-chip dx-chip-muted">{sym.market}</span></td>
                  <td className="dx-td-num font-display">{pct(sym.payoutPct, 1)}</td>
                  <td className="dx-td-actions">
                    <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => onSwap(s)}>Use {s}</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="d-flex justify-content-end mt-3">
        <button type="button" className="dx-btn" onClick={onClose}>Keep {code} and wait</button>
      </div>
    </Dialog>
  );
}

// =============================================================================
// 4 — SCRIPT LIBRARY DRAWER
// =============================================================================
function ScriptLibraryDrawer({
  currentScriptId,
  onClose,
  onPick,
  onOpenLint,
  lintClean,
}: {
  currentScriptId: string | null;
  onClose: () => void;
  onPick: (scriptId: string, opts: { symbol?: string; contractType?: string }) => void;
  onOpenLint: (scriptId: string) => void;
  lintClean: string[];
}) {
  const [tab, setTab] = useState("mine");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const scriptRows = SCRIPTS.filter((s) => tab === "mine" && (s.name.toLowerCase().includes(query.toLowerCase()) || s.symbol.toLowerCase().includes(query.toLowerCase())));
  const templateRows = SCRIPT_TEMPLATES.filter((t) => tab === "templates" && (t.name.toLowerCase().includes(query.toLowerCase()) || t.symbol.toLowerCase().includes(query.toLowerCase())));

  const issueFor = (id: string) => SCRIPT_LINT_ISSUES.find((i) => i.scriptId === id);
  const clean = (id: string) => lintClean.includes(id) || !issueFor(id);

  const detail = SCRIPTS.find((s) => s.id === openId);
  const detailTpl = SCRIPT_TEMPLATES.find((t) => t.id === openId);

  return (
    <Drawer
      open
      onClose={onClose}
      wide
      title="Script library"
      subtitle="Sandboxed JavaScript · your scripts and starter templates"
      footer={<button type="button" className="dx-btn w-100" onClick={onClose}>Close library</button>}
    >
      <Tabs
        tabs={[
          { id: "mine", label: `My scripts (${SCRIPTS.length})`, icon: <FileCode2 size={13} /> },
          { id: "templates", label: `Templates (${SCRIPT_TEMPLATES.length})`, icon: <ScrollText size={13} /> },
        ]}
        active={tab}
        onChange={(id) => { setTab(id); setOpenId(null); }}
      />
      <div className="my-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Search scripts, symbols…" />
      </div>
      <div className="d-grid gap-2">
        {scriptRows.map((s) => {
          const issue = issueFor(s.id);
          const isClean = clean(s.id);
          return (
            <div key={s.id} className="dx-card-inset">
              <div className="d-flex flex-wrap align-items-center gap-2">
                <span className="d-flex flex-column flex-grow-1">
                  <span className="fw-semibold" style={{ fontSize: "0.88rem" }}>{s.name}</span>
                  <span className="dx-help font-display">{s.symbol} · {s.lines} lines · {s.runs.toLocaleString("en-US")} runs · win {pct(s.winRate, 1)}</span>
                </span>
                <Chip tone={s.status === "deployed" ? "up" : s.status === "error" ? "down" : "muted"}>{s.status}</Chip>
                {issue ? <Chip tone={isClean ? "up" : "down"}>{isClean ? "lint fixed" : "lint error"}</Chip> : <Chip tone="up">lint clean</Chip>}
              </div>
              <div className="d-flex flex-wrap gap-2 mt-2">
                <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOpenId(openId === s.id ? null : s.id)}>{openId === s.id ? "Hide code" : "Preview code"}</button>
                {issue && !isClean ? (
                  <button type="button" className="dx-btn dx-btn-sm dx-btn-danger" onClick={() => onOpenLint(s.id)}><AlertTriangle size={12} /> Fix lint line {issue.line}</button>
                ) : null}
                <button
                  type="button"
                  className="dx-btn dx-btn-sm dx-btn-primary"
                  disabled={Boolean(issue) && !isClean}
                  onClick={() => onPick(s.id, { symbol: s.symbol })}
                >
                  {issue && !isClean ? "Fix lint to use" : currentScriptId === s.id ? "Current script" : "Use this script"}
                </button>
              </div>
              {openId === s.id ? <div className="mt-2"><CodeBlock code={s.code} maxHeight={230} /></div> : null}
            </div>
          );
        })}
        {templateRows.map((t) => (
          <div key={t.id} className="dx-card-inset">
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="d-flex flex-column flex-grow-1">
                <span className="fw-semibold" style={{ fontSize: "0.88rem" }}>{t.name}</span>
                <span className="dx-help font-display">{t.symbol} · {t.lines} lines · {t.uses.toLocaleString("en-US")} uses · ★ {t.rating.toFixed(1)}</span>
              </span>
              <Chip tone={t.difficulty === "beginner" ? "up" : t.difficulty === "intermediate" ? "warn" : "down"}>{t.difficulty}</Chip>
            </div>
            <p className="dx-help mb-2 mt-1">{t.description}</p>
            <div className="d-flex flex-wrap gap-2">
              <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOpenId(openId === t.id ? null : t.id)}>{openId === t.id ? "Hide code" : "Preview code"}</button>
              <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => onPick(t.id, { symbol: t.symbol, contractType: t.contractType })}>Use this template</button>
            </div>
            {openId === t.id ? <div className="mt-2"><CodeBlock code={t.code} maxHeight={230} /></div> : null}
          </div>
        ))}
        {!scriptRows.length && !templateRows.length ? (
          <EmptyState title="Nothing matches" message="Try another name, symbol or switch to the other tab." action={<button type="button" className="dx-btn" onClick={() => setQuery("")}>Clear search</button>} />
        ) : null}
      </div>
      {detail ? (
        <div className="dx-card-inset mt-3">
          <span className="dx-kpi-label">Runtime notes · {detail.name}</span>
          <p className="dx-help mb-0 mt-1">
            Author {detail.author} · language {detail.language} · tags {detail.tags.join(", ")} · updated {new Date(detail.updatedAt).toISOString().slice(0, 16).replace("T", " ")} UTC. Deployed scripts are pinned to
            their version — edits create a new revision in D-6.
          </p>
        </div>
      ) : null}
      {detailTpl ? (
        <div className="dx-card-inset mt-3">
          <span className="dx-kpi-label">Template contract · {detailTpl.name}</span>
          <p className="dx-help mb-0 mt-1">
            {CONTRACT_TYPE_MAP[detailTpl.contractType]?.label} on {detailTpl.symbol}. {CONTRACT_TYPE_MAP[detailTpl.contractType]?.blurb}
          </p>
        </div>
      ) : null}
    </Drawer>
  );
}

// =============================================================================
// 5 — SCRIPT LINT (blocker before step 4)
// =============================================================================
function ScriptLintDialog({
  scriptId,
  onClose,
  onFix,
  onOpenLibrary,
}: {
  scriptId: string;
  onClose: () => void;
  onFix: (issue: ScriptLintIssue) => void;
  onOpenLibrary: () => void;
}) {
  const issue = SCRIPT_LINT_ISSUES.find((i) => i.scriptId === scriptId) ?? SCRIPT_LINT_ISSUES[0];
  const [diff, setDiff] = useState(false);
  return (
    <Dialog open onClose={onClose} title={`Lint blocked step 4 · ${issue.scriptName}`} subtitle={`${issue.severity} at line ${issue.line}, column ${issue.column}`} size="xl">
      <Alert tone="danger" title={issue.message}>{issue.suggestion}</Alert>
      <div className="d-flex align-items-center gap-2 my-3">
        <MiniTabs
          options={[
            { id: "code", label: "Offending code" },
            { id: "diff", label: "Proposed fix" },
          ]}
          value={diff ? "diff" : "code"}
          onChange={(id) => setDiff(id === "diff")}
          ariaLabel="Lint view"
        />
        <span className="dx-help ms-auto">
          <span className="font-display">{SCRIPT_LINT_ISSUES.filter((i) => i.scriptId === scriptId).length}</span> issue(s) in this revision
        </span>
      </div>
      <div className="dx-code" style={{ padding: "0.75rem" }}>
        <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
          <span className="dx-help">{diff ? "After the automatic fix" : `Line ${issue.line}`}</span>
          <CopyButton text={diff ? issue.fixed : issue.offending} label="Copy snippet" />
        </div>
        <CodeBlock code={diff ? issue.fixed : issue.offending} maxHeight={260} />
      </div>
      <div className="dx-card-inset mt-3">
        <span className="dx-kpi-label">Why this blocks step 4</span>
        <p className="dx-help mb-0 mt-1">
          The engine refuses to arm a bot whose script fails lint, because an unhandled branch could buy without a stake cap. The web variant in the DerivX
          sandbox (VM2) would throw at runtime and leave the position unmanaged — so the wizard keeps step 4 locked until the revision passes.
        </p>
      </div>
      <div className="d-flex flex-wrap gap-2 justify-content-end mt-3">
        <button type="button" className="dx-btn" onClick={onOpenLibrary}>Choose another script</button>
        <button type="button" className="dx-btn dx-btn-primary" onClick={() => onFix(issue)}><Zap size={13} /> Apply automatic fix</button>
      </div>
    </Dialog>
  );
}

// =============================================================================
// 6 — MARKETPLACE PREVIEW DRAWER
// =============================================================================
function MarketplacePreviewDrawer({
  id,
  onClose,
  onImport,
  onSaveParams,
}: {
  id: string;
  onClose: () => void;
  onImport: (id: string) => void;
  onSaveParams: (strategy: MarketplaceStrategy) => void;
}) {
  const strategy = MARKETPLACE_STRATEGIES.find((s) => s.id === id) ?? MARKETPLACE_STRATEGIES[0];
  const reviews = reviewsFor(strategy);
  const symbol = SYMBOL_MAP[strategy.symbol];
  const curve = useMemo(() => {
    const rand = mulberry32(strategy.imports);
    let v = 1000;
    return Array.from({ length: 30 }, () => {
      v += (strategy.sharpe / 3) * 12 + (rand() - 0.44) * 34;
      return Math.round(v * 100) / 100;
    });
  }, [strategy.sharpe, strategy.imports]);

  return (
    <Drawer
      open
      onClose={onClose}
      wide
      title={strategy.name}
      subtitle={`${strategy.author} · ${strategy.authorTier} · v${strategy.version} · updated ${nowMinAgo(strategy.updatedMin)}`}
      footer={
        <div className="d-flex gap-2 w-100">
          <button type="button" className="dx-btn flex-grow-1" onClick={() => onSaveParams(strategy)}><Download size={13} /> Save as parameter set</button>
          <button type="button" className="dx-btn dx-btn-primary flex-grow-1" onClick={() => onImport(strategy.id)}><Upload size={13} /> Import to wizard</button>
        </div>
      }
    >
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <Chip tone="accent">★ {strategy.rating.toFixed(1)} · {strategy.reviews} reviews</Chip>
        <Chip tone={strategy.risk === "high" ? "down" : strategy.risk === "medium" ? "warn" : "up"}>risk · {strategy.risk}</Chip>
        <Chip tone="info">{strategy.imports.toLocaleString("en-US")} imports</Chip>
        <Chip tone={strategy.price === 0 ? "up" : "muted"}>{strategy.price === 0 ? "free" : `${usd(strategy.price, 0)} one-off`}</Chip>
      </div>
      <p className="dx-help">{strategy.description}</p>

      <div className="row g-2 mb-3">
        <div className="col-6 col-lg-4"><div className="dx-card-inset"><span className="dx-kpi-label">Win rate</span><div className="dx-card-inset-value font-display">{pct(strategy.winRate, 1)}</div></div></div>
        <div className="col-6 col-lg-4"><div className="dx-card-inset"><span className="dx-kpi-label">Max drawdown</span><div className="dx-card-inset-value font-display dx-down">{usd(strategy.maxDrawdown)}</div></div></div>
        <div className="col-6 col-lg-4"><div className="dx-card-inset"><span className="dx-kpi-label">Sharpe</span><div className="dx-card-inset-value font-display">{strategy.sharpe.toFixed(2)}</div></div></div>
        <div className="col-6 col-lg-4"><div className="dx-card-inset"><span className="dx-kpi-label">Contracts tested</span><div className="dx-card-inset-value font-display">{strategy.trades.toLocaleString("en-US")}</div></div></div>
        <div className="col-6 col-lg-4"><div className="dx-card-inset"><span className="dx-kpi-label">Stake / duration</span><div className="dx-card-inset-value font-display">{usd(strategy.stake)} · {fmtDur(strategy.duration, strategy.durationUnit)}</div></div></div>
        <div className="col-6 col-lg-4"><div className="dx-card-inset"><span className="dx-kpi-label">Contract</span><div className="dx-card-inset-value font-display">{CONTRACT_TYPE_MAP[strategy.contractType]?.label}</div></div></div>
      </div>

      <span className="dx-eyebrow d-block mb-2">Author equity curve (demo tape)</span>
      <div className="dx-card-inset mb-3">
        <LineChart data={curve} height={170} tone={strategy.sharpe >= 1 ? "accent" : "down"} ariaLabel={`${strategy.name} equity curve`} yFormat={(v) => `$${v.toFixed(0)}`} />
      </div>

      <span className="dx-eyebrow d-block mb-2">Rules the author ships</span>
      <ul className="dx-list mb-3">
        {strategy.rules.map((r) => (
          <li key={r} className="dx-list-row" style={{ fontSize: "0.84rem" }}>{r}</li>
        ))}
      </ul>

      <div className="dx-card-inset mb-3">
        <span className="dx-kpi-label">Instrument fit</span>
        <p className="dx-help mb-0 mt-1">
          {symbol ? `${symbol.code} — ${symbol.name}, payout ${pct(symbol.payoutPct, 1)}, minimum stake ${usd(symbol.minStake)}, pip size ${symbol.pipSize}.` : strategy.symbol}
          {" "}Duration {fmtDur(strategy.duration, strategy.durationUnit)} sits inside the {CONTRACT_TYPE_MAP[strategy.contractType]?.label} range (
          {CONTRACT_TYPE_MAP[strategy.contractType]?.minDuration}–{CONTRACT_TYPE_MAP[strategy.contractType]?.maxDuration}{" "}
          {CONTRACT_TYPE_MAP[strategy.contractType]?.units.join("/")}).
        </p>
      </div>

      <span className="dx-eyebrow d-block mb-2">What importers say ({reviews.length} most recent)</span>
      <div className="d-grid gap-2">
        {reviews.map((r) => (
          <div key={r.id} className="dx-card-inset">
            <div className="d-flex align-items-center gap-2">
              <Avatar name={r.author} size="sm" />
              <span className="fw-semibold" style={{ fontSize: "0.84rem" }}>{r.author}</span>
              <Chip tone="accent">★ {r.rating.toFixed(1)}</Chip>
              <span className="dx-help ms-auto">{r.ago}</span>
            </div>
            <p className="dx-help mb-0 mt-2">{r.note}</p>
          </div>
        ))}
      </div>

      <div className="dx-card-inset mt-3">
        <span className="dx-kpi-label">Tags</span>
        <div className="d-flex flex-wrap gap-1 mt-1">
          {strategy.tags.map((t) => <span key={t} className="dx-chip dx-chip-muted">{t}</span>)}
          <span className="dx-chip dx-chip-muted">{strategy.category}</span>
        </div>
      </div>
    </Drawer>
  );
}

// =============================================================================
// 7 — MARKETPLACE IMPORT WIZARD (3 steps, pre-fills step 2 + 3)
// =============================================================================
function MarketplaceImportWizard({
  id,
  config,
  onClose,
  onApplied,
}: {
  id: string;
  config: BotConfigDraft;
  onClose: () => void;
  onApplied: (next: BotConfigDraft, strategy: MarketplaceStrategy) => void;
}) {
  const strategy = MARKETPLACE_STRATEGIES.find((s) => s.id === id) ?? MARKETPLACE_STRATEGIES[0];
  const [step, setStep] = useState(0);
  const [keepStake, setKeepStake] = useState<"author" | "mine">("author");
  const [keepDuration, setKeepDuration] = useState<"author" | "mine">("author");
  const [keepCaps, setKeepCaps] = useState(true);
  const [acceptRisk, setAcceptRisk] = useState(false);

  const template = BOT_STRATEGY_TEMPLATES.find((t) => t.name.toLowerCase().includes(strategy.name.split(" ")[0].toLowerCase())) ?? BOT_STRATEGY_TEMPLATES[0];
  const stake = keepStake === "author" ? strategy.stake : config.stake;
  const duration = keepDuration === "author" ? strategy.duration : config.duration;
  const durationUnit = keepDuration === "author" ? strategy.durationUnit : config.durationUnit;
  const riskVerdict = assessRisk({ ...config, symbol: strategy.symbol, stake, maxStake: Math.max(config.maxStake, stake * 4), duration, durationUnit, contractType: strategy.contractType });

  const next: BotConfigDraft = {
    ...config,
    symbol: strategy.symbol,
    contractType: strategy.contractType,
    stake,
    maxStake: keepCaps ? Math.max(config.maxStake, stake * 4) : config.maxStake,
    duration,
    durationUnit,
    strategyId: template.id,
    strategyParams: { ...template.defaultParams },
    name: config.name || `${strategy.name} copy`,
    description: `Imported from ${strategy.author}'s “${strategy.name}” (v${strategy.version}). ${strategy.description}`,
    tags: Array.from(new Set([...config.tags, ...strategy.tags.slice(0, 2)])),
  };

  const steps = [
    { id: "review", label: "Review" },
    { id: "map", label: "Map parameters" },
    { id: "confirm", label: "Confirm" },
  ];

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Import “${strategy.name}”`}
      subtitle={`${strategy.author} · v${strategy.version} · ${strategy.imports.toLocaleString("en-US")} imports · ${strategy.price === 0 ? "free" : usd(strategy.price, 0)}`}
      size="xl"
      footer={
        <div className="d-flex flex-wrap gap-2 justify-content-between w-100">
          <button type="button" className="dx-btn" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>← Back</button>
          <div className="d-flex gap-2">
            <button type="button" className="dx-btn dx-btn-ghost" onClick={onClose}>Cancel</button>
            {step < 2 ? (
              <button type="button" className="dx-btn dx-btn-primary" onClick={() => setStep((s) => s + 1)}>Continue →</button>
            ) : (
              <button type="button" className="dx-btn dx-btn-primary" disabled={!acceptRisk} onClick={() => onApplied(next, strategy)}>
                <Upload size={13} /> Import &amp; pre-fill wizard
              </button>
            )}
          </div>
        </div>
      }
    >
      <Stepper steps={steps} active={step} onStepClick={(i) => { if (i <= step) setStep(i); }} className="mb-3" />

      {step === 0 ? (
        <>
          <Alert tone="info" title="What an import does">
            Importing copies configuration only — never runtime data, never your account credentials. You can edit every mapped field before arming.
          </Alert>
          <div className="row g-3 mt-1">
            <div className="col-12 col-lg-7">
              <p className="dx-help">{strategy.description}</p>
              <ul className="dx-list">
                {strategy.rules.map((r) => <li key={r} className="dx-list-row" style={{ fontSize: "0.84rem" }}>{r}</li>)}
              </ul>
            </div>
            <div className="col-12 col-lg-5">
              <div className="dx-card-inset">
                <span className="dx-kpi-label">Author backtest</span>
                <div className="d-grid gap-1 mt-2 font-display" style={{ fontSize: "0.86rem" }}>
                  <span className="d-flex justify-content-between"><span className="dx-help">Win rate</span><span>{pct(strategy.winRate, 1)}</span></span>
                  <span className="d-flex justify-content-between"><span className="dx-help">P&L</span><span className="dx-up">{pnl(Math.abs(strategy.maxDrawdown) * strategy.sharpe)}</span></span>
                  <span className="d-flex justify-content-between"><span className="dx-help">Max drawdown</span><span className="dx-down">{usd(strategy.maxDrawdown)}</span></span>
                  <span className="d-flex justify-content-between"><span className="dx-help">Contracts</span><span>{strategy.trades.toLocaleString("en-US")}</span></span>
                  <span className="d-flex justify-content-between"><span className="dx-help">Sharpe</span><span>{strategy.sharpe.toFixed(2)}</span></span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {step === 1 ? (
        <div className="d-grid gap-3">
          <div className="dx-card-inset">
            <div className="d-flex flex-wrap align-items-center gap-3">
              <span className="dx-kpi-label">Stake</span>
              <MiniTabs
                options={[{ id: "author", label: `Author ${usd(strategy.stake)}` }, { id: "mine", label: `Mine ${usd(config.stake)}` }]}
                value={keepStake}
                onChange={(v) => setKeepStake(v as "author" | "mine")}
                ariaLabel="Stake mapping"
              />
              <span className="dx-help ms-auto">Imported stake {usd(stake)}</span>
            </div>
          </div>
          <div className="dx-card-inset">
            <div className="d-flex flex-wrap align-items-center gap-3">
              <span className="dx-kpi-label">Duration</span>
              <MiniTabs
                options={[
                  { id: "author", label: `Author ${fmtDur(strategy.duration, strategy.durationUnit)}` },
                  { id: "mine", label: `Mine ${fmtDur(config.duration, config.durationUnit)}` },
                ]}
                value={keepDuration}
                onChange={(v) => setKeepDuration(v as "author" | "mine")}
                ariaLabel="Duration mapping"
              />
              <span className="dx-help ms-auto">Imported duration {fmtDur(duration, durationUnit)}</span>
            </div>
          </div>
          <Toggle checked={keepCaps} onChange={setKeepCaps} label="Scale my stake ceiling to the imported ladder" hint={`Max stake becomes ${usd(Math.max(config.maxStake, stake * 4))} (4× the imported base stake)`} />
          <div className="dx-card-inset">
            <span className="dx-kpi-label">Re-checked against your risk caps</span>
            <div className="mt-2 d-grid gap-2">
              <Meter label="Imported risk score" value={riskVerdict.score} display={`${riskVerdict.score}/100 · ${riskVerdict.band}`} />
              <span className="dx-help">Worst case per recovery cycle {usd(riskVerdict.worstCasePerCycle)} · daily exposure {usd(riskVerdict.dailyExposure)}</span>
            </div>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <>
          <div className="dx-card-inset mb-3">
            <span className="dx-kpi-label">Import receipt — nothing is saved until you confirm</span>
            <div className="d-grid gap-1 mt-2 font-display" style={{ fontSize: "0.86rem" }}>
              <span className="d-flex justify-content-between"><span className="dx-help">Bot name</span><span>{next.name}</span></span>
              <span className="d-flex justify-content-between"><span className="dx-help">Symbol</span><span>{next.symbol}</span></span>
              <span className="d-flex justify-content-between"><span className="dx-help">Strategy</span><span>{template.name}</span></span>
              <span className="d-flex justify-content-between"><span className="dx-help">Contract</span><span>{CONTRACT_TYPE_MAP[next.contractType]?.label}</span></span>
              <span className="d-flex justify-content-between"><span className="dx-help">Stake → cap</span><span>{usd(next.stake)} → {usd(next.maxStake)}</span></span>
              <span className="d-flex justify-content-between"><span className="dx-help">Duration</span><span>{fmtDur(next.duration, next.durationUnit)}</span></span>
              <span className="d-flex justify-content-between"><span className="dx-help">Funding account</span><span>{next.loginId}</span></span>
            </div>
          </div>
          <Alert tone="warn" title="Author drawdown is the honest number">
            This strategy drew down {usd(strategy.maxDrawdown)} on a {pct(strategy.winRate, 1)} win rate. Your stop-loss is {usd(config.stopLoss)} — the engine will halt
            the bot long before a repeat of that drawdown, which also means the recovery may never complete.
          </Alert>
          <div className="mt-3">
            <Toggle checked={acceptRisk} onChange={setAcceptRisk} label="I have reviewed the author drawdown and my own limits" hint="Required before the import rewrites your step 2 and step 3 values" />
          </div>
        </>
      ) : null}
    </Dialog>
  );
}

// =============================================================================
// 8 — AI STRATEGY ASSISTANT (3-step modal, streaming response)
// =============================================================================
function AiAssistantWizard({
  config,
  onClose,
  onApplied,
}: {
  config: BotConfigDraft;
  onClose: () => void;
  onApplied: (next: BotConfigDraft, brief: AiStrategyBrief) => void;
}) {
  const [step, setStep] = useState(0);
  const [prompt, setPrompt] = useState(AI_STRATEGY_BRIEFS[0].prompt);
  const [brief, setBrief] = useState<AiStrategyBrief | null>(null);
  const [typed, setTyped] = useState(0);
  const [streaming, setStreaming] = useState(false);
  const [approveChanges, setApproveChanges] = useState(false);
  const [strict, setStrict] = useState(true);

  const message = brief ? `${brief.title}. ${brief.changes.length} fields updated. ${brief.assumptions[0]}` : "";
  useInterval(
    () => {
      setTyped((n) => {
        if (n >= message.length) {
          setStreaming(false);
          return n;
        }
        return n + 4;
      });
    },
    streaming ? 40 : null,
  );

  const run = (candidate: AiStrategyBrief) => {
    setBrief(candidate);
    setTyped(0);
    setStreaming(true);
    setStep(1);
  };

  const next: BotConfigDraft | null = brief
    ? {
        ...config,
        ...brief.patch,
        strategyParams: { ...config.strategyParams, ...(brief.patch.strategyParams ?? {}) },
        risk: { ...config.risk, ...(brief.patch.risk ?? {}) },
        name: config.name || brief.title,
        description: `Generated from the brief: “${brief.prompt}”`,
      }
    : null;

  const lintIssue = brief?.strategyId === "st_custom" ? SCRIPT_LINT_ISSUES.find((i) => i.scriptId === "scr_11" && strict) : undefined;

  return (
    <Dialog
      open
      onClose={onClose}
      title="AI strategy assistant"
      subtitle="Describe the bot in plain English — review the generated config and script before anything is saved"
      size="xl"
      footer={
        <div className="d-flex flex-wrap gap-2 justify-content-between w-100">
          <button type="button" className="dx-btn" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>← Back</button>
          <div className="d-flex gap-2">
            <button type="button" className="dx-btn dx-btn-ghost" onClick={onClose}>Discard</button>
            {step === 0 ? <button type="button" className="dx-btn dx-btn-primary" onClick={() => run(AI_STRATEGY_BRIEFS[0])} disabled={prompt.trim().length < 12}><Wand2 size={13} /> Generate config</button> : null}
            {step === 1 ? <button type="button" className="dx-btn dx-btn-primary" onClick={() => setStep(2)} disabled={streaming}>Review script diff →</button> : null}
            {step === 2 ? (
              <button
                type="button"
                className="dx-btn dx-btn-primary"
                disabled={!approveChanges || Boolean(lintIssue)}
                onClick={() => brief && next && onApplied(next, brief)}
              >
                <CheckCircle2 size={13} /> Approve &amp; apply to wizard
              </button>
            ) : null}
          </div>
        </div>
      }
    >
      <Stepper
        steps={[
          { id: "brief", label: "Brief" },
          { id: "config", label: "Generated config" },
          { id: "script", label: "Script & approval" },
        ]}
        active={step}
        onStepClick={(i) => { if (i <= step) setStep(i); }}
        className="mb-3"
      />

      {step === 0 ? (
        <div className="d-grid gap-3">
          <Field label="What should the bot do?" required help="Mention the symbol, contract type, stake, duration and how aggressive the recovery should be.">
            <textarea className="dx-textarea" rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          </Field>
          <div>
            <span className="dx-eyebrow d-block mb-2">Recent briefs on this account</span>
            <div className="d-grid gap-2">
              {AI_STRATEGY_BRIEFS.map((b) => (
                <button key={b.id} type="button" className="dx-card-inset text-start w-100" onClick={() => { setPrompt(b.prompt); run(b); }}>
                  <span className="d-flex align-items-center justify-content-between gap-2">
                    <span className="fw-semibold" style={{ fontSize: "0.86rem" }}>{b.title}</span>
                    <Chip tone="accent">{(b.confidence * 100).toFixed(0)}% match</Chip>
                  </span>
                  <span className="dx-help d-block mt-1">{b.prompt}</span>
                </button>
              ))}
            </div>
          </div>
          <Alert tone="info" title="The assistant never arms a bot">
            It produces a config draft and a script revision. Arming still requires your explicit approval on step 3 plus a clean lint pass.
          </Alert>
        </div>
      ) : null}

      {step === 1 && brief ? (
        <>
          <div className="dx-card-inset mb-3" aria-live="polite">
            <span className="dx-kpi-label d-flex align-items-center gap-2">
              <Sparkles size={13} /> Assistant
              {streaming ? <span className="dx-pulse" aria-hidden="true" /> : null}
            </span>
            <p className="mb-0 mt-1 font-display" style={{ fontSize: "0.86rem" }}>{message.slice(0, typed)}{streaming ? "▍" : ""}</p>
          </div>
          <div className="row g-3">
            <div className="col-12 col-lg-7">
              <span className="dx-eyebrow d-block mb-2">Field changes ({brief.changes.length})</span>
              <div className="dx-table-wrap">
                <table className="dx-table dx-table-sm">
                  <thead>
                    <tr><th scope="col">Field</th><th scope="col">Generated value</th></tr>
                  </thead>
                  <tbody>
                    {brief.changes.map((c) => (
                      <tr key={c}><td>{c.split(" → ")[0]}</td><td className="dx-td-num font-display">{c.split(" → ")[1] ?? c}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="col-12 col-lg-5">
              <span className="dx-eyebrow d-block mb-2">Assumptions to confirm</span>
              <ul className="dx-list">
                {brief.assumptions.map((a) => <li key={a} className="dx-list-row" style={{ fontSize: "0.84rem" }}>{a}</li>)}
              </ul>
              <div className="dx-card-inset mt-2">
                <span className="dx-kpi-label">Model confidence</span>
                <div className="dx-card-inset-value font-display">{(brief.confidence * 100).toFixed(0)}%</div>
                <span className="dx-help">Confidence reflects how completely the brief mapped onto supported parameters — not expected profit.</span>
              </div>
            </div>
          </div>
          <div className="row g-2 mt-3">
            <div className="col-6 col-lg-3"><div className="dx-card-inset"><span className="dx-kpi-label">Strategy</span><div className="dx-card-inset-value font-display" style={{ fontSize: "0.9rem" }}>{BOT_STRATEGY_TEMPLATES.find((t) => t.id === brief.strategyId)?.name}</div></div></div>
            <div className="col-6 col-lg-3"><div className="dx-card-inset"><span className="dx-kpi-label">Symbol</span><div className="dx-card-inset-value font-display">{brief.patch.symbol ?? config.symbol}</div></div></div>
            <div className="col-6 col-lg-3"><div className="dx-card-inset"><span className="dx-kpi-label">Stake</span><div className="dx-card-inset-value font-display">{usd(Number(brief.patch.stake ?? config.stake))}</div></div></div>
            <div className="col-6 col-lg-3"><div className="dx-card-inset"><span className="dx-kpi-label">Duration</span><div className="dx-card-inset-value font-display">{fmtDur(Number(brief.patch.duration ?? config.duration), (brief.patch.durationUnit ?? config.durationUnit))}</div></div></div>
          </div>
        </>
      ) : null}

      {step === 2 && brief ? (
        <>
          <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
            <Chip tone="info">script draft · {brief.script.split("\n").length} lines</Chip>
            <Chip tone="muted">diff vs {BOT_STRATEGY_TEMPLATES.find((t) => t.id === brief.strategyId)?.name} template</Chip>
            {lintIssue ? <Chip tone="down">lint fails on line {lintIssue.line}</Chip> : <Chip tone="up">lint clean</Chip>}
          </div>
          <div className="row g-3">
            <div className="col-12 col-lg-6">
              <span className="dx-eyebrow d-block mb-2">Template baseline</span>
              <CodeBlock code={SCRIPT_TEMPLATES[0].code} maxHeight={260} />
            </div>
            <div className="col-12 col-lg-6">
              <span className="dx-eyebrow d-block mb-2">AI revision (what changed is highlighted below)</span>
              <CodeBlock code={brief.script} maxHeight={260} />
            </div>
          </div>
          <div className="dx-table-wrap mt-3">
            <table className="dx-table dx-table-sm">
              <thead><tr><th scope="col">What the assistant changed</th><th scope="col">Why</th></tr></thead>
              <tbody>
                <tr><td>Entry guard</td><td className="dx-help">Brief asked for a fixed recovery ladder; the template only traded on the SMA filter.</td></tr>
                <tr><td>Risk assertion</td><td className="dx-help">Stake cap assertion added so the engine rejects a breach instead of logging it.</td></tr>
                <tr><td>Duration unit</td><td className="dx-help">Switched to the unit allowed by {CONTRACT_TYPE_MAP[(brief.patch.contractType ?? config.contractType)]?.label}.</td></tr>
              </tbody>
            </table>
          </div>
          <div className="mt-3 d-grid gap-3">
            <Toggle checked={strict} onChange={setStrict} label="Keep strict lint blocking" hint="Refuses to apply a revision that fails lint — recommended" />
            <Toggle checked={approveChanges} onChange={setApproveChanges} label="I approve the highlighted script changes" hint="Required: the assistant never applies a script revision on your behalf" />
          </div>
          {lintIssue ? (
            <Alert tone="danger" title={`Revision would be blocked: ${lintIssue.message}`}>
              {lintIssue.suggestion} Turn off strict lint to apply the config without the script, or edit the script in D-6 first.
            </Alert>
          ) : null}
        </>
      ) : null}
    </Dialog>
  );
}

// =============================================================================
// 9 — SAVE TEMPLATE (parameter injection form)
// =============================================================================
function SaveTemplateDialog({
  config,
  onClose,
  onSave,
}: {
  config: BotConfigDraft;
  onClose: () => void;
  onSave: (set: StrategyParameterSet) => void;
}) {
  const template = BOT_STRATEGY_TEMPLATES.find((t) => t.id === config.strategyId) ?? BOT_STRATEGY_TEMPLATES[0];
  const [name, setName] = useState(`${config.name || template.name} params`);
  const [visibility, setVisibility] = useState<"private" | "team" | "public">("team");
  const variables = template.params.map((p) => ({ ...p, value: String(config.strategyParams[p.key] ?? "") }));
  return (
    <Dialog open onClose={onClose} title="Save as template with variables" subtitle={`${template.name} · ${variables.length} injectable variables`} size="lg">
      <Alert tone="info" title="Variables, not code">
        Anyone on your team can reuse this set and edit these {variables.length} variables from the wizard form. The script itself is never forked.
      </Alert>
      <div className="row g-3 mt-1">
        <div className="col-12 col-md-7">
          <Field label="Template name" required help="Shown in the parameter-set table and the bot creator.">
            <input className="dx-input" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        </div>
        <div className="col-12 col-md-5">
          <Field label="Visibility" help="Private sets stay on this login ID; team sets sync to MX accounts.">
            <select className="dx-select" value={visibility} onChange={(e) => setVisibility(e.target.value as "private" | "team" | "public")}>
              <option value="private">Private</option>
              <option value="team">Team</option>
              <option value="public">Public (marketplace)</option>
            </select>
          </Field>
        </div>
      </div>
      <div className="dx-table-wrap mt-2">
        <table className="dx-table dx-table-sm">
          <thead><tr><th scope="col">Variable</th><th scope="col">Injected value</th><th scope="col">Type</th></tr></thead>
          <tbody>
            {variables.map((v) => (
              <tr key={v.key}>
                <td>{v.label}<span className="dx-help d-block font-display">{v.key}</span></td>
                <td className="dx-td-num font-display">{v.value}{v.suffix ? ` ${v.suffix}` : ""}</td>
                <td className="dx-help">{v.kind}</td>
              </tr>
            ))}
            <tr><td>Initial stake</td><td className="dx-td-num font-display">{usd(config.stake)}</td><td className="dx-help">number</td></tr>
            <tr><td>Duration</td><td className="dx-td-num font-display">{fmtDur(config.duration, config.durationUnit)}</td><td className="dx-help">number + unit</td></tr>
            <tr><td>Take profit / stop loss</td><td className="dx-td-num font-display">{usd(config.takeProfit)} / {usd(config.stopLoss)}</td><td className="dx-help">number</td></tr>
          </tbody>
        </table>
      </div>
      <div className="d-flex flex-wrap gap-2 justify-content-end mt-3">
        <button type="button" className="dx-btn" onClick={onClose}>Cancel</button>
        <button
          type="button"
          className="dx-btn dx-btn-primary"
          disabled={name.trim().length < 3}
          onClick={() =>
            onSave({
              id: `ps_new_${Date.now()}`,
              name: name.trim(),
              strategy: "martingale",
              symbol: config.symbol,
              stake: config.stake,
              multiplier: Number(config.strategyParams.multiplier ?? 2),
              maxSteps: Number(config.strategyParams.maxSteps ?? 5),
              duration: config.duration,
              durationUnit: config.durationUnit,
              takeProfit: config.takeProfit,
              stopLoss: config.stopLoss,
              winRate: template.historicalWinRate,
              pnl: 0,
              drawdown: template.typicalDrawdown,
              sharpe: 0,
              uses: 0,
              owner: "You",
              updatedMin: 0,
              visibility,
            })
          }
        >
          Save template
        </button>
      </div>
    </Dialog>
  );
}

// =============================================================================
// 10 — PARAMETER SET EDITOR (apply a saved set into the wizard)
// =============================================================================
function ParameterSetDialog({
  existing,
  config,
  onClose,
  onApply,
}: {
  existing: StrategyParameterSet | null;
  config: BotConfigDraft;
  onClose: () => void;
  onApply: (config: BotConfigDraft, label: string) => void;
}) {
  const base = existing ?? STRATEGY_PARAMETER_SETS[0];
  const [draft, setDraft] = useState({ ...base });
  const [applyRisk, setApplyRisk] = useState(true);
  const verdict = assessRisk({ ...config, stake: draft.stake, maxStake: Math.max(config.maxStake, draft.stake * 6), duration: draft.duration, durationUnit: draft.durationUnit });

  const nextConfig: BotConfigDraft = {
    ...config,
    symbol: draft.symbol,
    stake: draft.stake,
    maxStake: Math.max(config.maxStake, draft.stake * 6),
    duration: draft.duration,
    durationUnit: draft.durationUnit,
    takeProfit: draft.takeProfit,
    stopLoss: draft.stopLoss,
    strategyParams: { ...config.strategyParams, multiplier: draft.multiplier, maxSteps: draft.maxSteps },
    risk: applyRisk ? { ...config.risk, maxDailyLoss: Math.max(draft.stopLoss * 2, config.risk.maxDailyLoss), maxDailyTrades: draft.strategy === "digit" ? 800 : config.risk.maxDailyTrades } : config.risk,
  };

  return (
    <Dialog open onClose={onClose} title={existing ? `Edit ${existing.name}` : "New parameter set"} subtitle="Numbers only — the script stays untouched" size="lg">
      <div className="row g-3">
        <div className="col-12 col-md-6">
          <Field label="Set name" required>
            <input className="dx-input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </Field>
        </div>
        <div className="col-12 col-md-6">
          <Field label="Symbol" help="Sets are reusable across any symbol trading the same contract type.">
            <select className="dx-select" value={draft.symbol} onChange={(e) => setDraft({ ...draft, symbol: e.target.value })}>
              {MARKET_SYMBOLS.map((s) => <option key={s.code} value={s.code}>{s.code} — {s.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="col-6 col-md-4">
          <Field label="Initial stake" required>
            <input className="dx-input dx-input-num font-display" type="number" min={0.35} step={0.05} value={draft.stake} onChange={(e) => setDraft({ ...draft, stake: Number(e.target.value) })} />
          </Field>
        </div>
        <div className="col-6 col-md-4">
          <Field label="Multiplier">
            <input className="dx-input dx-input-num font-display" type="number" min={1} step={0.1} value={draft.multiplier} onChange={(e) => setDraft({ ...draft, multiplier: Number(e.target.value) })} />
          </Field>
        </div>
        <div className="col-6 col-md-4">
          <Field label="Max steps">
            <input className="dx-input dx-input-num font-display" type="number" min={1} max={12} value={draft.maxSteps} onChange={(e) => setDraft({ ...draft, maxSteps: Number(e.target.value) })} />
          </Field>
        </div>
        <div className="col-6 col-md-3">
          <Field label="Duration">
            <input className="dx-input dx-input-num font-display" type="number" min={1} value={draft.duration} onChange={(e) => setDraft({ ...draft, duration: Number(e.target.value) })} />
          </Field>
        </div>
        <div className="col-6 col-md-3">
          <Field label="Unit">
            <select className="dx-select" value={draft.durationUnit} onChange={(e) => setDraft({ ...draft, durationUnit: e.target.value as StrategyParameterSet["durationUnit"] })}>
              {DURATION_UNITS.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
            </select>
          </Field>
        </div>
        <div className="col-6 col-md-3">
          <Field label="Take profit">
            <input className="dx-input dx-input-num font-display" type="number" min={1} value={draft.takeProfit} onChange={(e) => setDraft({ ...draft, takeProfit: Number(e.target.value) })} />
          </Field>
        </div>
        <div className="col-6 col-md-3">
          <Field label="Stop loss">
            <input className="dx-input dx-input-num font-display" type="number" min={1} value={draft.stopLoss} onChange={(e) => setDraft({ ...draft, stopLoss: Number(e.target.value) })} />
          </Field>
        </div>
      </div>

      <div className="dx-card-inset mt-3">
        <span className="dx-kpi-label">Re-scored against your caps</span>
        <div className="d-grid gap-2 mt-2">
          <Meter label="Risk score after apply" value={verdict.score} display={`${verdict.score}/100 · ${verdict.band}`} />
          <span className="dx-help">Worst case per cycle {usd(verdict.worstCasePerCycle)} · Monte-Carlo ruin {verdict.mcRuin}%</span>
        </div>
      </div>

      <div className="mt-3">
        <Toggle checked={applyRisk} onChange={setApplyRisk} label="Also widen my daily risk caps" hint={`Daily loss becomes ${usd(Math.max(draft.stopLoss * 2, config.risk.maxDailyLoss))}`} />
      </div>

      <div className="d-flex flex-wrap gap-2 justify-content-end mt-3">
        <button type="button" className="dx-btn" onClick={onClose}>Cancel</button>
        <button type="button" className="dx-btn dx-btn-primary" onClick={() => onApply(nextConfig, draft.name)}>Apply to wizard</button>
      </div>
    </Dialog>
  );
}

// =============================================================================
// 11 — DELETE CONFIRMS (parameter set / draft) — shared shape
// =============================================================================
function ConfirmDelete({
  title,
  body,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onClose={onClose} title={title} size="sm" footer={
      <div className="d-flex gap-2 justify-content-end w-100">
        <button type="button" className="dx-btn" onClick={onClose}>Keep it</button>
        <button type="button" className="dx-btn dx-btn-danger" onClick={() => { setBusy(true); onConfirm(); }} disabled={busy}>
          {busy ? <><RefreshCw size={12} className="dx-spin" /> Deleting…</> : confirmLabel}
        </button>
      </div>
    }>
      {body}
    </Dialog>
  );
}

// =============================================================================
// 12 — SHARE / EXPORT-IMPORT CONFIG
// =============================================================================
function ShareConfigDialog({ config, onClose }: { config: BotConfigDraft; onClose: () => void }) {
  const [scope, setScope] = useState("team");
  const [expires, setExpires] = useState("24h");
  const [copiedLink] = useState(`https://derivx.app/s/${config.symbol.toLowerCase()}-${config.strategyId.replace("st_", "")}-${String(config.stake).replace(".", "")}`);
  const [allowEdit, setAllowEdit] = useState(false);
  return (
    <Dialog open onClose={onClose} title="Share this configuration" subtitle="Config only — runtime data, balances and account tokens never travel in a link" size="lg">
      <div className="row g-3">
        <div className="col-12 col-md-6">
          <Field label="Who can open it">
            <select className="dx-select" value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="private">Only me (signed in on this login ID)</option>
              <option value="team">My team (MX5520143 multi-account)</option>
              <option value="link">Anyone with the link</option>
            </select>
          </Field>
        </div>
        <div className="col-12 col-md-6">
          <Field label="Link expires">
            <select className="dx-select" value={expires} onChange={(e) => setExpires(e.target.value)}>
              <option value="1h">In 1 hour</option>
              <option value="24h">In 24 hours</option>
              <option value="7d">In 7 days</option>
              <option value="never">Never</option>
            </select>
          </Field>
        </div>
      </div>
      <div className="dx-input-group mt-2">
        <input className="dx-input font-display" value={copiedLink} readOnly aria-label="Share link" />
        <CopyButton text={copiedLink} label="Copy link" />
      </div>
      <div className="mt-3">
        <Toggle checked={allowEdit} onChange={setAllowEdit} label="Allow the recipient to edit parameters" hint={allowEdit ? "Recipient gets an editor seat on this config only." : "Read-only — they can clone it into their own wizard."} />
      </div>
      <div className="dx-card-inset mt-3">
        <span className="dx-kpi-label">What is included</span>
        <p className="dx-help mb-0 mt-1">
          Name, symbol, contract type, {CONTRACT_TYPE_MAP[config.contractType]?.label} parameters, recovery variables, risk limits and schedule on {config.loginId}.
        </p>
      </div>
      <div className="d-flex justify-content-end mt-3">
        <button type="button" className="dx-btn" onClick={onClose}>Done</button>
      </div>
    </Dialog>
  );
}

function ExportConfigDialog({ config, draft, onClose, onImport }: { config: BotConfigDraft; draft?: BotDraft; onClose: () => void; onImport: () => void }) {
  const payload: Record<string, unknown> = draft
    ? {
        schema: "derivx.bot_draft.v12",
        draft: {
          id: draft.id,
          name: draft.name,
          symbol: draft.symbol,
          strategy: draft.strategy,
          stake: draft.stake,
          stepCompleted: draft.step,
          completeness: draft.completeness,
          loginId: draft.loginId,
          tags: draft.tags,
          note: draft.note,
        },
      }
    : exportableConfig(config);
  const json = JSON.stringify(payload, null, 2);
  const curl = `curl -X POST https://api.derivx.app/v1/bots \\\n  -H "Authorization: Bearer $DX_TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(payload)}'`;
  const [tab, setTab] = useState("json");
  return (
    <Dialog open onClose={onClose} title={draft ? `Export draft ${draft.name}` : "Export configuration"} subtitle={draft ? "Draft summary payload — resume it in the builder to export the full configuration" : "Re-importable JSON plus the equivalent REST call"} size="xl" footer={
      <div className="d-flex flex-wrap gap-2 justify-content-between w-100">
        <button type="button" className="dx-btn dx-btn-ghost" onClick={onImport}><Upload size={13} /> Import a config instead</button>
        <div className="d-flex gap-2">
          <CopyButton text={tab === "json" ? json : curl} label={`Copy ${tab === "json" ? "JSON" : "cURL"}`} small={false} />
          <button type="button" className="dx-btn dx-btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    }>
      <div className="d-flex align-items-center gap-2 mb-2">
        <MiniTabs
          options={[{ id: "json", label: "JSON" }, { id: "curl", label: "cURL" }]}
          value={tab}
          onChange={setTab}
          ariaLabel="Export format"
        />
        <span className="dx-help ms-auto font-display">{tab === "json" ? `${json.split("\n").length} lines` : "1 request"}</span>
      </div>
      <CodeBlock code={tab === "json" ? json : curl} maxHeight={420} />
      <Alert tone="info" title="Front-end only preview">
        Nothing is uploaded from this page — the payload is what a backend would POST to <span className="font-display">/v1/bots</span> once the API layer is wired.
      </Alert>
    </Dialog>
  );
}

function ImportConfigDialog({ onClose, onImport }: { onClose: () => void; onImport: (next: BotConfigDraft) => void }) {
  const [text, setText] = useState(JSON.stringify(exportableConfig(sampleConfig()), null, 2));
  const [error, setError] = useState("");
  return (
    <Dialog open onClose={onClose} title="Import configuration" subtitle="Paste a payload using schema derivx.bot_config.v12" size="xl" footer={
      <div className="d-flex flex-wrap gap-2 justify-content-end w-100">
        <button type="button" className="dx-btn" onClick={onClose}>Cancel</button>
        <button
          type="button"
          className="dx-btn dx-btn-primary"
          onClick={() => {
            try {
              const parsed = JSON.parse(text) as Record<string, unknown>;
              if (!parsed.symbol || !parsed.tradeParams) {
                setError("Payload is missing `symbol` or `tradeParams` — check the schema line.");
                return;
              }
              onImport(mergeImported(text));
            } catch {
              setError("That is not valid JSON. Paste the object exactly as exported (no trailing commas).");
            }
          }}
        >
          Validate &amp; apply
        </button>
      </div>
    }>
      <textarea className={`dx-textarea font-display ${error ? "is-invalid" : ""}`} rows={12} value={text} onChange={(e) => { setText(e.target.value); setError(""); }} aria-label="Configuration JSON" />
      {error ? <span className="dx-error">{error}</span> : <span className="dx-help">Validation checks the schema tag, symbol, contract type and trade parameters before touching the wizard.</span>}
      <div className="dx-card-inset mt-3">
        <span className="dx-kpi-label">Round-trip guarantee</span>
        <p className="dx-help mb-0 mt-1">Anything exported from this page re-imports cleanly: schema derivx.bot_config.v12, USD amounts, ticks/minutes durations and Deriv symbol codes.</p>
      </div>
    </Dialog>
  );
}

// local helpers for the sample payload above
function sampleConfig(): BotConfigDraft {
  return {
    name: "Vol10 Martingale Core v8",
    description: "Exported from the D-5 wizard.",
    market: "synthetics",
    symbol: "R_10",
    loginId: "VRTC9031442",
    strategyId: "st_martingale",
    scriptId: null,
    contractType: "rise_fall",
    stake: 0.35,
    maxStake: 50,
    duration: 5,
    durationUnit: "ticks",
    takeProfit: 50,
    stopLoss: 25,
    maxConcurrent: 1,
    paper: true,
    strategyParams: { multiplier: 2.1, onWin: "Reset to initial stake", onLoss: "Multiply stake", maxSteps: 5 },
    risk: { maxDailyLoss: 100, maxDailyTrades: 500, cooldownCount: 3, cooldownMinutes: 5, maxConsecutiveLosses: 4 },
    schedule: { days: ["Mon", "Tue", "Wed", "Thu", "Fri"], from: "00:00", to: "23:59", blackoutNews: true },
    tags: ["recovery", "synthetics"],
  };
}

function mergeImported(text: string): BotConfigDraft {
  const parsed = JSON.parse(text) as {
    name?: string;
    symbol?: string;
    market?: string;
    strategy?: string;
    contractType?: BotConfigDraft["contractType"];
    tradeParams?: { stake?: number; maxStake?: number; duration?: number; durationUnit?: BotConfigDraft["durationUnit"]; takeProfit?: number; stopLoss?: number; maxConcurrent?: number };
    strategyParams?: Record<string, number | string>;
    riskLimits?: BotConfigDraft["risk"];
    schedule?: BotConfigDraft["schedule"];
    paper?: boolean;
    tags?: string[];
  };
  const base = sampleConfig();
  return {
    ...base,
    name: parsed.name ?? base.name,
    symbol: parsed.symbol ?? base.symbol,
    market: parsed.market ?? base.market,
    strategyId: parsed.strategy ?? base.strategyId,
    contractType: parsed.contractType ?? base.contractType,
    stake: parsed.tradeParams?.stake ?? base.stake,
    maxStake: parsed.tradeParams?.maxStake ?? base.maxStake,
    duration: parsed.tradeParams?.duration ?? base.duration,
    durationUnit: parsed.tradeParams?.durationUnit ?? base.durationUnit,
    takeProfit: parsed.tradeParams?.takeProfit ?? base.takeProfit,
    stopLoss: parsed.tradeParams?.stopLoss ?? base.stopLoss,
    maxConcurrent: parsed.tradeParams?.maxConcurrent ?? base.maxConcurrent,
    strategyParams: parsed.strategyParams ?? base.strategyParams,
    risk: parsed.riskLimits ?? base.risk,
    schedule: parsed.schedule ?? base.schedule,
    paper: parsed.paper ?? base.paper,
    tags: parsed.tags ?? base.tags,
  };
}

export {
  ConfirmDelete,
  ShareConfigDialog,
  ExportConfigDialog,
  ImportConfigDialog,
  StrategyDetailDialog,
  SymbolPickerDialog,
  HaltedSymbolDialog,
  ScriptLibraryDrawer,
  ScriptLintDialog,
  MarketplacePreviewDrawer,
  MarketplaceImportWizard,
  AiAssistantWizard,
  SaveTemplateDialog,
  ParameterSetDialog,
};
export { STRATEGY_COUNT };

// =============================================================================
// 13 — DRAFT DRAWER (+ compare / resume / delete)
// =============================================================================
function DraftDrawer({
  draft,
  onClose,
  onResume,
  onDuplicate,
  onDelete,
  onExport,
  onCompare,
  onOpenLog,
}: {
  draft: BotDraft;
  onClose: () => void;
  onResume: (draft: BotDraft) => void;
  onDuplicate: (draft: BotDraft) => void;
  onDelete: (draft: BotDraft) => void;
  onExport: (draft: BotDraft) => void;
  onCompare: (draft: BotDraft) => void;
  onOpenLog: () => void;
}) {
  const strategy = BOT_STRATEGY_TEMPLATES.find((t) => t.name.toLowerCase().includes(draft.strategy)) ?? BOT_STRATEGY_TEMPLATES[0];
  const symbol = SYMBOL_MAP[draft.symbol];
  const missing = [
    draft.step < 2 ? "Trade parameters + risk limits are not set yet." : "",
    draft.step < 3 ? "No backtest evidence stored on this draft." : "",
    draft.completeness < 80 ? `Completeness is ${draft.completeness}% — finish the wizard before arming.` : "",
    draft.origin === "local" ? "Stored locally only: clearing this browser removes it." : "",
  ].filter(Boolean);
  return (
    <Drawer
      open
      onClose={onClose}
      wide
      title={draft.name}
      subtitle={`${draft.symbol} · ${draft.strategy} · ${draft.origin} draft · last saved ${nowMinAgo(draft.updatedMin)}`}
      footer={
        <div className="d-flex flex-wrap gap-2 w-100">
          <button type="button" className="dx-btn flex-grow-1" onClick={() => onDuplicate(draft)}><Layers size={13} /> Duplicate</button>
          <button type="button" className="dx-btn flex-grow-1" onClick={() => onCompare(draft)}>Compare</button>
          <button type="button" className="dx-btn dx-btn-primary flex-grow-1" onClick={() => onResume(draft)}><Play size={13} /> Resume in wizard</button>
        </div>
      }
    >
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <Chip tone={draft.origin === "cloud" ? "info" : "warn"}>{draft.origin === "cloud" ? "cloud autosave" : "local only"}</Chip>
        <Chip tone={draft.completeness >= 80 ? "up" : draft.completeness >= 50 ? "warn" : "down"}>{draft.completeness}% complete</Chip>
        <Chip tone="muted">step {draft.step + 1}/4</Chip>
        <Chip tone="accent" pulse>autosave armed</Chip>
      </div>

      <div className="row g-2 mb-3">
        <div className="col-6 col-lg-3"><div className="dx-card-inset"><span className="dx-kpi-label">Stake</span><div className="dx-card-inset-value font-display">{usd(draft.stake)}</div></div></div>
        <div className="col-6 col-lg-3"><div className="dx-card-inset"><span className="dx-kpi-label">Account</span><div className="dx-card-inset-value font-display" style={{ fontSize: "0.92rem" }}>{draft.loginId}</div></div></div>
        <div className="col-6 col-lg-3"><div className="dx-card-inset"><span className="dx-kpi-label">Payout at stake</span><div className="dx-card-inset-value font-display">{usd(payoutFor(draft.stake, symbol?.payoutPct ?? 95))}</div></div></div>
        <div className="col-6 col-lg-3"><div className="dx-card-inset"><span className="dx-kpi-label">Contract</span><div className="dx-card-inset-value font-display" style={{ fontSize: "0.92rem" }}>{symbol?.contractTypes[0] ? CONTRACT_TYPE_MAP[symbol.contractTypes[0]].label : "—"}</div></div></div>
      </div>

      <Meter label="Draft completeness" value={draft.completeness} display={`${draft.completeness}%`} />

      <div className="dx-card-inset mt-3">
        <span className="dx-kpi-label">Note left on this draft</span>
        <p className="mb-0 mt-1" style={{ fontSize: "0.86rem" }}>{draft.note}</p>
      </div>

      <span className="dx-eyebrow d-block mt-3 mb-2">Before this can be armed</span>
      {missing.length ? (
        <ul className="dx-list">
          {missing.map((m) => <li key={m} className="dx-list-row" style={{ fontSize: "0.84rem" }}>{m}</li>)}
        </ul>
      ) : (
        <Alert tone="up" title="Ready to arm">Every required step is complete — run the backtest once more in the wizard and you can go live on {draft.loginId}.</Alert>
      )}

      <span className="dx-eyebrow d-block mt-3 mb-2">Suggested strategy for this draft</span>
      <div className="dx-card-inset">
        <div className="d-flex align-items-center gap-2">
          <span className="dx-empty-ico" style={{ width: 30, height: 30 }}>{strategyIcon(strategy.icon, 14)}</span>
          <span className="fw-semibold" style={{ fontSize: "0.88rem" }}>{strategy.name}</span>
          <Chip tone={strategy.riskLevel === "high" ? "down" : strategy.riskLevel === "medium" ? "warn" : "up"}>{strategy.riskLevel}</Chip>
        </div>
        <p className="dx-help mb-0 mt-2">{strategy.tagline} · {strategy.rules[0]}</p>
      </div>

      <div className="d-flex flex-wrap gap-2 mt-3">
        <button type="button" className="dx-btn dx-btn-sm" onClick={() => onExport(draft)}><Download size={12} /> Export JSON</button>
        <button type="button" className="dx-btn dx-btn-sm" onClick={onOpenLog}><ScrollText size={12} /> Autosave log</button>
        <button type="button" className="dx-btn dx-btn-sm dx-btn-danger" onClick={() => onDelete(draft)}><Trash2 size={12} /> Delete draft</button>
      </div>
    </Drawer>
  );
}

function DraftCompareDialog({
  drafts,
  onClose,
  onResume,
  onDelete,
}: {
  drafts: BotDraft[];
  onClose: () => void;
  onResume: (draft: BotDraft) => void;
  onDelete: (draft: BotDraft) => void;
}) {
  return (
    <Dialog open onClose={onClose} title={`Compare ${drafts.length} drafts`} subtitle="Config-only comparison — runtime data never travels between drafts" size="xl">
      <div className="dx-table-wrap">
        <table className="dx-table">
          <thead>
            <tr>
              <th scope="col">Field</th>
              {drafts.map((d) => <th key={d.id} scope="col" style={{ textAlign: "right" }}>{d.name}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr><td>Symbol</td>{drafts.map((d) => <td key={d.id} className="dx-td-num font-display">{d.symbol}</td>)}</tr>
            <tr><td>Strategy</td>{drafts.map((d) => <td key={d.id} className="dx-td-num font-display">{d.strategy}</td>)}</tr>
            <tr><td>Stake</td>{drafts.map((d) => <td key={d.id} className="dx-td-num font-display">{usd(d.stake)}</td>)}</tr>
            <tr><td>Completeness</td>{drafts.map((d) => <td key={d.id} className="dx-td-num font-display">{d.completeness}%</td>)}</tr>
            <tr><td>Last step</td>{drafts.map((d) => <td key={d.id} className="dx-td-num font-display">{d.step + 1}/4</td>)}</tr>
            <tr><td>Origin</td>{drafts.map((d) => <td key={d.id} className="dx-td-num font-display">{d.origin}</td>)}</tr>
            <tr><td>Account</td>{drafts.map((d) => <td key={d.id} className="dx-td-num font-display">{d.loginId}</td>)}</tr>
            <tr><td>Updated</td>{drafts.map((d) => <td key={d.id} className="dx-td-num font-display">{nowMinAgo(d.updatedMin)}</td>)}</tr>
            <tr>
              <td>Actions</td>
              {drafts.map((d) => (
                <td key={d.id} className="dx-td-actions">
                  <div className="d-flex gap-1 justify-content-end">
                    <button type="button" className="dx-btn dx-btn-sm" onClick={() => onResume(d)}>Resume</button>
                    <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => onDelete(d)} aria-label={`Delete ${d.name}`}><Trash2 size={12} /></button>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <Alert tone="info" title="Reading the comparison">
        The draft with the highest completeness is usually the one to resume — but check the symbol first: a draft pointing at a halted feed cannot be armed until the
        market reopens.
      </Alert>
    </Dialog>
  );
}

function DraftResumeDialog({
  draft,
  config,
  onClose,
  onConfirm,
}: {
  draft: BotDraft;
  config: BotConfigDraft;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const dirty = config.name.trim().length > 0 && config.name !== draft.name;
  return (
    <Dialog open onClose={onClose} title={`Resume “${draft.name}”?`} size="md" footer={
      <div className="d-flex flex-wrap gap-2 justify-content-end w-100">
        <button type="button" className="dx-btn" onClick={onClose}>Keep editing current</button>
        <button type="button" className="dx-btn dx-btn-primary" onClick={onConfirm}><Play size={13} /> Load draft into wizard</button>
      </div>
    }>
      <Alert tone={dirty ? "warn" : "info"} title={dirty ? "Your current unsaved edits will be replaced" : "Nothing is lost"}>
        {dirty
          ? `The wizard currently holds “${config.name}” (${usd(config.stake)} on ${config.symbol}). Loading “${draft.name}” replaces those unsaved values — save the current one as a draft first if you want both.`
          : `Loading “${draft.name}” fills all four steps: ${draft.symbol}, ${draft.strategy}, ${usd(draft.stake)} base stake, saved ${nowMinAgo(draft.updatedMin)}.`}
      </Alert>
      <div className="dx-table-wrap mt-3">
        <table className="dx-table dx-table-sm">
          <thead><tr><th scope="col">Field</th><th scope="col" style={{ textAlign: "right" }}>Current wizard</th><th scope="col" style={{ textAlign: "right" }}>Draft</th></tr></thead>
          <tbody>
            <tr><td>Name</td><td className="dx-td-num font-display">{config.name || "—"}</td><td className="dx-td-num font-display">{draft.name}</td></tr>
            <tr><td>Symbol</td><td className="dx-td-num font-display">{config.symbol}</td><td className="dx-td-num font-display">{draft.symbol}</td></tr>
            <tr><td>Strategy</td><td className="dx-td-num font-display">{BOT_STRATEGY_TEMPLATES.find((t) => t.id === config.strategyId)?.name}</td><td className="dx-td-num font-display">{draft.strategy}</td></tr>
            <tr><td>Stake</td><td className="dx-td-num font-display">{usd(config.stake)}</td><td className="dx-td-num font-display">{usd(draft.stake)}</td></tr>
            <tr><td>Account</td><td className="dx-td-num font-display">{config.loginId}</td><td className="dx-td-num font-display">{draft.loginId}</td></tr>
          </tbody>
        </table>
      </div>
    </Dialog>
  );
}

// =============================================================================
// 14 — BACKTEST: run (progress + skip) + results (equity, trades, what-if)
// =============================================================================
function BacktestRunDialog({
  config,
  onClose,
  onFinish,
  pushLog,
}: {
  config: BotConfigDraft;
  onClose: () => void;
  onFinish: (result: SimBacktest, skipped: boolean) => void;
  pushLog: (line: Omit<CreatorLogLine, "id" | "atMin">) => void;
}) {
  const [pctDone, setPctDone] = useState(4);
  const [stage, setStage] = useState("Queued on the demo tape");
  const result = useMemo(() => runBacktestSim(config, { trades: 60 }), [config]);
  const stages = [
    { at: 4, label: "Queued on the 30-day demo tape", channel: "engine" as const },
    { at: 26, label: `Replaying ${result.metrics.total} contracts on ${config.symbol}`, channel: "feed" as const },
    { at: 58, label: "Applying recovery ladder + risk guards", channel: "risk" as const },
    { at: 84, label: "Computing equity curve, drawdown and Sharpe", channel: "engine" as const },
    { at: 100, label: "Settling results", channel: "engine" as const },
  ];
  useInterval(
    () => {
      setPctDone((p) => {
        const next = Math.min(100, p + 6 + Math.round(Math.random() * 6));
        const hit = stages.filter((s) => next >= s.at).pop();
        if (hit) {
          setStage(hit.label);
          pushLog({ level: "info", channel: hit.channel, message: `Backtest ${config.symbol}: ${hit.label}` });
        }
        if (next >= 100) {
          onFinish(result, false);
        }
        return next;
      });
    },
    pctDone >= 100 ? null : 420,
  );
  return (
    <Dialog open onClose={onClose} title="Running backtest" subtitle={`${config.symbol} · ${CONTRACT_TYPE_MAP[config.contractType]?.label} · ${fmtDur(config.duration, config.durationUnit)} · stake ${usd(config.stake)}`} size="md" footer={
      <div className="d-flex flex-wrap gap-2 justify-content-between w-100">
        <button type="button" className="dx-btn dx-btn-ghost" onClick={() => onFinish(result, true)}>Skip backtest</button>
        <button type="button" className="dx-btn" onClick={onClose}>Run in background</button>
      </div>
    }>
      <div className="d-flex align-items-center gap-2 mb-2">
        <span className="dx-pulse" aria-hidden="true" />
        <span className="fw-semibold" style={{ fontSize: "0.88rem" }}>{stage}</span>
        <span className="dx-help ms-auto font-display">{Math.min(100, pctDone)}%</span>
      </div>
      <Progress value={Math.min(100, pctDone)} />
      <div className="dx-table-wrap mt-3">
        <table className="dx-table dx-table-sm">
          <tbody>
            <tr><td>Contracts replayed</td><td className="dx-td-num font-display">{Math.round((Math.min(100, pctDone) / 100) * result.metrics.total).toLocaleString("en-US")} / {result.metrics.total}</td></tr>
            <tr><td>Simulated stake ladder</td><td className="dx-td-num font-display">{usd(config.stake)} → {usd(config.maxStake)}</td></tr>
            <tr><td>Risk guards applied</td><td className="dx-td-num font-display">{usd(config.risk.maxDailyLoss)} daily · {config.risk.maxDailyTrades} trades</td></tr>
            <tr><td>Engine</td><td className="dx-td-num font-display">Web-worker bt-runner-4 · eu-west-1</td></tr>
          </tbody>
        </table>
      </div>
      <Alert tone="warn" title="Slow runs are normal past 10 seconds">
        A 60-contract replay with the recovery ladder takes 4–12 s. If you skip, the wizard records “no backtest evidence” on the review step and asks you to confirm
        before arming.
      </Alert>
    </Dialog>
  );
}

function BacktestResultDialog({
  config,
  result,
  skipped,
  onClose,
  onRerun,
  onOptimize,
  onMonteCarlo,
  onApplyParams,
}: {
  config: BotConfigDraft;
  result: SimBacktest | null;
  skipped: boolean;
  onClose: () => void;
  onRerun: (multiplier: number) => void;
  onOptimize: () => void;
  onMonteCarlo: () => void;
  onApplyParams: (patch: Partial<BotConfigDraft>) => void;
}) {
  const [multiplier, setMultiplier] = useState(Number(config.strategyParams.multiplier ?? 2.1));
  const [live, setLive] = useState<SimBacktest | null>(result);
  const [period, setPeriod] = useState("30d");
  const active = live ?? result;

  const trades = useDataTable({
    rows: active?.trades ?? [],
    searchKeys: (t) => [t.side, t.result, String(t.seq)],
    sorters: { seq: (t) => t.seq, stake: (t) => t.stake, pnl: (t) => t.pnl, step: (t) => t.step },
    filterKey: (t) => t.result,
    filterOptions: [{ id: "win", label: "Wins" }, { id: "loss", label: "Losses" }],
    initialSort: "seq",
    initialDir: "asc",
    initialPageSize: 10,
  });

  if (skipped || !active) {
    return (
      <Dialog open onClose={onClose} title="No backtest evidence" subtitle="You skipped the simulation for this configuration" size="md" footer={
        <div className="d-flex flex-wrap gap-2 justify-content-end w-100">
          <button type="button" className="dx-btn" onClick={onClose}>Review without evidence</button>
          <button type="button" className="dx-btn dx-btn-primary" onClick={() => onRerun(multiplier)}><FlaskConical size={13} /> Run the backtest now</button>
        </div>
      }>
        <Alert tone="warn" title="Arming without evidence">
          The engine will still enforce every risk guard, but nothing has validated that this stake ladder survives a 6-loss run on {config.symbol}. The review step
          keeps a warning chip until a run completes.
        </Alert>
        <p className="dx-help mt-3 mb-0">
          A quick run replays 60 demo contracts and takes under 12 seconds. You can also send the configuration to the parameter optimizer for a grid search instead.
        </p>
      </Dialog>
    );
  }

  const m = active.metrics;
  return (
    <Dialog open onClose={onClose} title="Backtest results" subtitle={m.period} size="xl" footer={
      <div className="d-flex flex-wrap gap-2 justify-content-between w-100">
        <div className="d-flex gap-2">
          <button type="button" className="dx-btn dx-btn-ghost" onClick={onOptimize}><GaugeCircle size={13} /> Optimize parameters</button>
          <button type="button" className="dx-btn dx-btn-ghost" onClick={onMonteCarlo}><Shield size={13} /> Monte-Carlo risk</button>
        </div>
        <div className="d-flex gap-2">
          <button type="button" className="dx-btn" onClick={onClose}>Close</button>
          <button type="button" className="dx-btn dx-btn-primary" onClick={() => onApplyParams({ strategyParams: { ...config.strategyParams, multiplier } })}>Keep these parameters</button>
        </div>
      </div>
    }>
      <div className="row g-2 mb-3">
        <div className="col-6 col-lg-3"><div className="dx-card-inset"><span className="dx-kpi-label">Win rate</span><div className="dx-card-inset-value font-display">{pct(m.winRate, 1)}</div><span className="dx-help">{m.wins}W / {m.losses}L</span></div></div>
        <div className="col-6 col-lg-3"><div className="dx-card-inset"><span className="dx-kpi-label">Net P&L</span><div className={`dx-card-inset-value font-display ${m.pnl >= 0 ? "dx-up" : "dx-down"}`}>{pnl(m.pnl)}</div><span className="dx-help">{usd(m.avgStake)} average stake</span></div></div>
        <div className="col-6 col-lg-3"><div className="dx-card-inset"><span className="dx-kpi-label">Max drawdown</span><div className="dx-card-inset-value font-display dx-down">{usd(m.maxDrawdown)}</div><span className="dx-help">vs {usd(config.stopLoss)} stop-loss</span></div></div>
        <div className="col-6 col-lg-3"><div className="dx-card-inset"><span className="dx-kpi-label">Sharpe (annualised)</span><div className="dx-card-inset-value font-display">{m.sharpe.toFixed(2)}</div><span className="dx-help">deepest ladder step {m.maxStep}</span></div></div>
      </div>

      <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
        <span className="dx-eyebrow mb-0">Equity curve</span>
        <MiniTabs
          options={[{ id: "30d", label: "30D" }, { id: "7d", label: "7D" }, { id: "all", label: "All" }]}
          value={period}
          onChange={setPeriod}
          ariaLabel="Backtest period"
          className="ms-auto"
        />
      </div>
      <div className="dx-card-inset mb-3">
        <LineChart
          data={period === "7d" ? active.equity.slice(-10) : period === "all" ? active.equity : active.equity}
          height={190}
          tone={m.pnl >= 0 ? "accent" : "down"}
          ariaLabel="Backtest equity curve"
          yFormat={(v) => `$${v.toFixed(0)}`}
        />
      </div>

      <div className="dx-card-inset mb-3">
        <span className="dx-kpi-label">What-if: change the multiplier and re-run instantly</span>
        <div className="d-flex flex-wrap align-items-center gap-3 mt-2">
          <input
            className="dx-range flex-grow-1"
            type="range"
            min={1.1}
            max={4}
            step={0.1}
            value={multiplier}
            onChange={(e) => setMultiplier(Number(e.target.value))}
            aria-label="Multiplier"
          />
          <span className="font-display fw-semibold">{multiplier.toFixed(1)}×</span>
          <button
            type="button"
            className="dx-btn dx-btn-sm"
            onClick={() => {
              setLive(runBacktestSim({ ...config, strategyParams: { ...config.strategyParams, multiplier } }, { trades: 60 }));
              onRerun(multiplier);
            }}
          >
            <RefreshCw size={12} /> Re-run
          </button>
        </div>
        <span className="dx-help">Step 5 of the ladder at {multiplier.toFixed(1)}× reaches {usd(config.stake * Math.pow(multiplier, 4))} per contract.</span>
      </div>

      <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
        <span className="dx-eyebrow mb-0">Simulated contracts ({m.total})</span>
        <FilterChips
          options={trades.filterOptions}
          value={trades.filter}
          onChange={trades.setFilter}
          allLabel="All results"
          includeAll
        />
        <span className="ms-auto" style={{ minWidth: 220 }}>
          <SearchInput value={trades.query} onChange={trades.setQuery} placeholder="Search side or result…" />
        </span>
      </div>
      <DataTable
        dense
        ariaLabel="Simulated contracts"
        state={trades}
        rowKey={(t) => t.id}
        columns={[
          { key: "seq", header: "#", cell: (t) => <span className="font-display">{t.seq}</span>, sortValue: (t) => t.seq },
          { header: "Side", cell: (t) => <span className="font-display">{t.side}</span> },
          { key: "stake", header: "Stake", align: "end", cell: (t) => <span className="font-display">{usd(t.stake)}</span>, sortValue: (t) => t.stake },
          { header: "Payout", align: "end", cell: (t) => <span className="font-display">{usd(t.payout)}</span>, hideOnMobile: true },
          { key: "pnl", header: "P&L", align: "end", cell: (t) => <span className={`font-display ${t.pnl >= 0 ? "dx-up" : "dx-down"}`}>{pnl(t.pnl)}</span>, sortValue: (t) => t.pnl },
          { key: "step", header: "Ladder step", align: "end", cell: (t) => <span className="font-display">{t.step}</span>, sortValue: (t) => t.step, hideOnMobile: true },
          { header: "Balance", align: "end", cell: (t) => <span className="font-display">{usd(t.balance)}</span>, hideOnMobile: true },
          { header: "Result", align: "end", cell: (t) => <Chip tone={t.result === "win" ? "up" : "down"}>{t.result}</Chip> },
        ]}
      />
    </Dialog>
  );
}

// =============================================================================
// 15 — PARAMETER OPTIMIZER (grid search, streams the top 5)
// =============================================================================
function OptimizerDialog({
  config,
  onClose,
  onApply,
  pushLog,
}: {
  config: BotConfigDraft;
  onClose: () => void;
  onApply: (patch: Partial<BotConfigDraft>, candidate: ReturnType<typeof runParameterOptimizer>[number]) => void;
  pushLog: (line: Omit<CreatorLogLine, "id" | "atMin">) => void;
}) {
  const candidates = useMemo(() => runParameterOptimizer(config, 5), [config]);
  const [visible, setVisible] = useState(1);
  const [picked, setPicked] = useState<string | null>(null);
  const totalCombos = 7 * 5 * 5;
  const noWinner = candidates.every((c) => c.pnl <= 0);
  useInterval(
    () => setVisible((v) => (v >= candidates.length ? v : v + 1)),
    visible >= candidates.length ? null : 520,
  );
  const best = candidates.find((c) => c.id === picked) ?? candidates[0];
  const shown = candidates.slice(0, visible);

  return (
    <Dialog
      open
      onClose={onClose}
      title="Parameter optimizer"
      subtitle={`Grid search over ${totalCombos} combinations · multiplier × max steps × duration`}
      size="xl"
      footer={
        <div className="d-flex flex-wrap gap-2 justify-content-between w-100">
          <button type="button" className="dx-btn dx-btn-ghost" onClick={() => { setVisible(1); pushLog({ level: "info", channel: "engine", message: `Optimizer restarted on ${config.symbol}` }); }}>
            <RefreshCw size={13} /> Run again
          </button>
          <div className="d-flex gap-2">
            <button type="button" className="dx-btn" onClick={onClose}>Close</button>
            <button
              type="button"
              className="dx-btn dx-btn-primary"
              disabled={noWinner}
              onClick={() =>
                onApply(
                  {
                    strategyParams: { ...config.strategyParams, multiplier: best.multiplier, maxSteps: best.maxSteps },
                    duration: best.duration,
                    durationUnit: best.durationUnit,
                  },
                  best,
                )
              }
            >
              <CheckCircle2 size={13} /> Apply winner {best.multiplier}× / {best.maxSteps} steps
            </button>
          </div>
        </div>
      }
    >
      <div className="d-flex align-items-center gap-2 mb-2">
        <span className="dx-pulse" aria-hidden="true" />
        <span className="fw-semibold" style={{ fontSize: "0.86rem" }}>
          {visible >= candidates.length ? "Grid search complete" : `Streaming results — top ${visible} of ${candidates.length} found`}
        </span>
        <span className="dx-help ms-auto font-display">{totalCombos} combos scanned</span>
      </div>
      <Progress value={(visible / candidates.length) * 100} />

      {noWinner ? (
        <Alert tone="warn" title="No winner on this sample">
          Every combination finished negative on the last 30 days of {config.symbol} data — the symbol's payout profile at {usd(config.stake)} cannot carry this
          ladder. Suggestions: raise the payout symbol (R_75/R_100), shorten the duration, or drop the multiplier to 1.0× and run Fixed Stake instead.
        </Alert>
      ) : null}

      <div className="row g-2 my-3">
        {shown.map((c, i) => (
          <div className="col-12" key={c.id}>
            <button
              type="button"
              className={`dx-card-inset w-100 text-start ${picked === c.id || (!picked && i === 0) ? "dx-card-live" : ""}`}
              onClick={() => setPicked(c.id)}
            >
              <div className="d-flex flex-wrap align-items-center gap-2">
                <span className="dx-chip dx-chip-accent">#{i + 1}</span>
                <span className="font-display fw-semibold">{c.multiplier}× ladder</span>
                <span className="dx-help font-display">{c.maxSteps} steps · {fmtDur(c.duration, c.durationUnit)}</span>
                <span className="ms-auto d-flex flex-wrap gap-2 font-display" style={{ fontSize: "0.82rem" }}>
                  <span className={c.pnl >= 0 ? "dx-up" : "dx-down"}>{pnl(c.pnl)}</span>
                  <span className="dx-down">DD {usd(c.maxDrawdown)}</span>
                  <span>win {pct(c.winRate, 1)}</span>
                  <span>Sharpe {c.sharpe.toFixed(2)}</span>
                  <span>score {c.score.toFixed(1)}</span>
                </span>
              </div>
              <span className="dx-help d-block mt-1">{c.note}</span>
            </button>
          </div>
        ))}
      </div>

      <div className="dx-card-inset">
        <span className="dx-kpi-label">How the score is built</span>
        <p className="dx-help mb-0 mt-1">
          score = net P&L ÷ (½ · max drawdown) + 12 · Sharpe + 0.24 · win rate. Regression depth is penalised: past 2.4× the ladder needs a stop-loss wide enough to
          survive a six-loss run, which the grid marks down.
        </p>
      </div>
      <div className="d-flex flex-wrap gap-2 mt-3">
        <Chip tone="muted">scanned {totalCombos} combinations</Chip>
        <Chip tone="info">symbol {config.symbol}</Chip>
        <Chip tone="accent">payout {pct(SYMBOL_MAP[config.symbol]?.payoutPct ?? 95, 1)}</Chip>
      </div>
    </Dialog>
  );
}

// =============================================================================
// 16 — MONTE-CARLO RISK SIMULATOR
// =============================================================================
function MonteCarloDialog({
  config,
  onClose,
  onTighten,
}: {
  config: BotConfigDraft;
  onClose: () => void;
  onTighten: (patch: Partial<BotConfigDraft["risk"]>) => void;
}) {
  const [runs, setRuns] = useState(1000);
  const result = useMemo(() => runMonteCarlo(config, runs), [config, runs]);
  const [percentile, setPercentile] = useState("p50");
  const verdict = assessRisk(config);
  const reading = percentile === "p05" ? result.p05 : percentile === "p95" ? result.p95 : result.p50;

  return (
    <Dialog open onClose={onClose} title="Monte-Carlo risk simulator" subtitle={`${runs.toLocaleString("en-US")} randomised trade sequences · 60 contracts each`} size="xl" footer={
      <div className="d-flex flex-wrap gap-2 justify-content-between w-100">
        <MiniTabs
          options={[{ id: "p05", label: "Worst 5%" }, { id: "p50", label: "Expected" }, { id: "p95", label: "Best 5%" }]}
          value={percentile}
          onChange={setPercentile}
          ariaLabel="Scenario band"
        />
        <div className="d-flex gap-2">
          <button type="button" className="dx-btn" onClick={onClose}>Close</button>
          <button
            type="button"
            className="dx-btn dx-btn-primary"
            onClick={() => onTighten({ maxDailyLoss: Math.max(20, Math.round(config.risk.maxDailyLoss * 0.75)), cooldownCount: Math.min(6, config.risk.cooldownCount + 1) })}
          >
            <Shield size={13} /> Tighten my risk caps
          </button>
        </div>
      </div>}>
      <div className="row g-2 mb-3">
        <div className="col-6 col-lg-3"><div className="dx-card-inset"><span className="dx-kpi-label">Worst 5%</span><div className="dx-card-inset-value font-display dx-down">{pnl(result.p05)}</div></div></div>
        <div className="col-6 col-lg-3"><div className="dx-card-inset"><span className="dx-kpi-label">Expected</span><div className={`dx-card-inset-value font-display ${result.p50 >= 0 ? "dx-up" : "dx-down"}`}>{pnl(result.p50)}</div></div></div>
        <div className="col-6 col-lg-3"><div className="dx-card-inset"><span className="dx-kpi-label">Best 5%</span><div className="dx-card-inset-value font-display dx-up">{pnl(result.p95)}</div></div></div>
        <div className="col-6 col-lg-3"><div className="dx-card-inset"><span className="dx-kpi-label">Ruin probability</span><div className={`dx-card-inset-value font-display ${result.ruinProbability > 15 ? "dx-down" : result.ruinProbability > 6 ? "dx-warn-text" : "dx-up"}`}>{result.ruinProbability}%</div></div></div>
      </div>

      <div className="d-flex flex-wrap align-items-center gap-3 mb-2">
        <MiniTabs
          options={[{ id: "1000", label: "1,000 runs" }, { id: "5000", label: "5,000 runs" }]}
          value={String(runs)}
          onChange={(v) => setRuns(Number(v))}
          ariaLabel="Runs"
        />
        <span className="dx-help ms-auto font-display">reading: {percentile} → {pnl(reading)} · average worst drawdown {usd(result.avgDrawdown)}</span>
      </div>
      <div className="dx-card-inset mb-3">
        <BarSeries data={result.histogram.map((h) => h.count)} labels={result.histogram.map((h) => h.label)} height={190} format={(v) => v.toFixed(0)} positiveOnly />
        <span className="dx-help d-block mt-2">Distribution of final balance after 60 contracts. Buckets are {usd(result.histogram[1] ? result.histogram[1].from - result.histogram[0].from : 40)} wide.</span>
      </div>

      <div className="dx-table-wrap mb-3">
        <table className="dx-table dx-table-sm">
          <thead><tr><th scope="col">Band</th><th scope="col" style={{ textAlign: "right" }}>Outcome</th><th scope="col" style={{ textAlign: "right" }}>Interpretation</th></tr></thead>
          <tbody>
            <tr><td>Worst 5% (p05)</td><td className="dx-td-num font-display dx-down">{pnl(result.p05)}</td><td className="dx-td-num font-display">1 in 20 sessions</td></tr>
            <tr><td>Expected (p50)</td><td className="dx-td-num font-display">{pnl(result.p50)}</td><td className="dx-td-num font-display">median session</td></tr>
            <tr><td>Best 5% (p95)</td><td className="dx-td-num font-display dx-up">{pnl(result.p95)}</td><td className="dx-td-num font-display">1 in 20 sessions</td></tr>
            <tr><td>Absolute worst</td><td className="dx-td-num font-display dx-down">{pnl(result.worstCase)}</td><td className="dx-td-num font-display">hardest single path</td></tr>
          </tbody>
        </table>
      </div>

      <Alert tone={result.ruinProbability > 12 ? "danger" : result.ruinProbability > 5 ? "warn" : "up"} title={`${result.ruinProbability}% of runs hit the drawdown that would halt the bot`}>
        With {usd(config.risk.maxDailyLoss)} daily loss, {config.risk.cooldownCount}-loss cooldowns of {config.risk.cooldownMinutes} min and a {usd(config.stopLoss)} stop-loss,
        the {verdict.band} risk score ({verdict.score}/100) holds up in {100 - result.ruinProbability}% of paths. Tightening the daily cap or adding one more cooldown step
        moves the p05 band up at the cost of fewer trades per session.
      </Alert>
    </Dialog>
  );
}

// =============================================================================
// 17 — DEPLOY FLOW: confirm wizard → progress → receipt
// =============================================================================
function DeployConfirmWizard({
  config,
  account,
  mode,
  bot,
  onClose,
  onConfirm,
}: {
  config: BotConfigDraft;
  account: DerivAccount;
  mode: "create" | "config";
  bot: Bot | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [step, setStep] = useState(0);
  const [ack, setAck] = useState(false);
  const [days, setDays] = useState<string[]>(config.schedule.days);
  const [from, setFrom] = useState(config.schedule.from);
  const [to, setTo] = useState(config.schedule.to);
  const [blackout, setBlackout] = useState(config.schedule.blackoutNews);
  const [startMode, setStartMode] = useState<"now" | "window">("now");
  const risk = assessRisk(config);
  const freeSlots = ENGINE_SLOTS.filter((s) => s.state === "free");
  const canArm = ack && (startMode === "now" || days.length > 0);

  return (
    <Dialog
      open
      onClose={onClose}
      title={mode === "config" ? `Apply & restart ${config.name}` : `Arm “${config.name}”`}
      subtitle={`${config.loginId} · ${config.paper ? "virtual funds (VRTC)" : "real funds (CR/MX)"} · ${CONTRACT_TYPE_MAP[config.contractType]?.label} on ${config.symbol}`}
      size="lg"
      footer={
        <div className="d-flex flex-wrap gap-2 justify-content-between w-100">
          <button type="button" className="dx-btn" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>← Back</button>
          <div className="d-flex gap-2">
            <button type="button" className="dx-btn dx-btn-ghost" onClick={onClose}>Cancel</button>
            {step === 0 ? (
              <button type="button" className="dx-btn dx-btn-primary" disabled={!ack} onClick={() => setStep(1)}>Set the schedule →</button>
            ) : (
              <button type="button" className="dx-btn dx-btn-primary" disabled={!canArm} onClick={onConfirm}>
                <Rocket size={13} /> {mode === "config" ? "Apply & restart" : "Save & start"}
              </button>
            )}
          </div>
        </div>
      }
    >
      <Stepper
        steps={[{ id: "caps", label: "Caps & account" }, { id: "schedule", label: "Schedule & arm" }]}
        active={step}
        onStepClick={(i) => { if (i <= step) setStep(i); }}
        className="mb-3"
      />

      {step === 0 ? (
        <>
          <div className="row g-2 mb-3">
            <div className="col-6 col-lg-3"><div className="dx-card-inset"><span className="dx-kpi-label">Stake → cap</span><div className="dx-card-inset-value font-display" style={{ fontSize: "0.9rem" }}>{usd(config.stake)} → {usd(config.maxStake)}</div></div></div>
            <div className="col-6 col-lg-3"><div className="dx-card-inset"><span className="dx-kpi-label">Take profit</span><div className="dx-card-inset-value font-display">{usd(config.takeProfit)}</div></div></div>
            <div className="col-6 col-lg-3"><div className="dx-card-inset"><span className="dx-kpi-label">Stop loss</span><div className="dx-card-inset-value font-display">{usd(config.stopLoss)}</div></div></div>
            <div className="col-6 col-lg-3"><div className="dx-card-inset"><span className="dx-kpi-label">Risk score</span><div className="dx-card-inset-value font-display">{risk.score}/100</div></div></div>
          </div>

          <div className="dx-card-inset mb-3">
            <span className="dx-kpi-label">Funding account</span>
            <div className="d-flex flex-wrap align-items-center gap-2 mt-1">
              <Avatar name={account.label} size="sm" />
              <span className="font-display fw-semibold">{account.loginId}</span>
              <Chip tone={account.connected ? "up" : "down"} pulse={account.connected}>{account.connected ? "connected" : "offline"}</Chip>
              <Chip tone="muted">{account.type}</Chip>
              <span className="dx-help ms-auto">balance <span className="font-display">{usd(account.balance)}</span> · equity <span className="font-display">{usd(account.equity)}</span></span>
            </div>
            <p className="dx-help mb-0 mt-2">
              {config.paper
                ? "Paper mode uses the virtual balance — no real money moves, every guard and settlement is identical."
                : `Real mode debits ${usd(config.stake)} per contract from a live balance. Deriv settles synthetic contracts in USD.`}
            </p>
          </div>

          <div className="dx-card-inset mb-3">
            <span className="dx-kpi-label">Engine slot</span>
            <p className="dx-help mb-0 mt-1">
              {mode === "config"
                ? `${bot?.name ?? config.name} already holds slot ${ENGINE_SLOTS.find((s) => s.botName === bot?.name)?.index ?? 3}. Applying restarts the runtime on the same slot — open contracts settle first.`
                : `${freeSlots.length} free slot${freeSlots.length === 1 ? "" : "s"} on eu-west-1 (${ENGINE_SLOTS.filter((s) => s.state === "running").length}/${ENGINE_SLOTS.length} in use). The wizard reserves the lowest free slot.`}
            </p>
          </div>

          <Alert tone="warn" title="Stop-loss is the only hard exit">
            The engine halts the bot at {usd(config.stopLoss)} or {usd(config.risk.maxDailyLoss)} per day. Open contracts still settle at expiry — the bot never closes them
            early on your behalf.
          </Alert>

          <div className="mt-3">
            <Toggle
              checked={ack}
              onChange={setAck}
              label={config.paper ? "I confirm this bot runs on the virtual balance" : `I confirm arming real funds on ${config.loginId}`}
              hint="Required — arming is the only action that starts spending on Deriv."
            />
          </div>
        </>
      ) : (
        <>
          <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
            <span className="dx-eyebrow mb-0">Trading days</span>
            <div className="d-flex flex-wrap gap-1 ms-auto">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`dx-filter-chip ${days.includes(d) ? "is-active" : ""}`}
                  aria-pressed={days.includes(d)}
                  onClick={() => setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div className="row g-3">
            <div className="col-6">
              <Field label="Session opens (UTC)"><input className="dx-input font-display" type="time" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
            </div>
            <div className="col-6">
              <Field label="Session closes (UTC)"><input className="dx-input font-display" type="time" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
            </div>
          </div>
          <div className="mt-1">
            <Toggle checked={blackout} onChange={setBlackout} label="Pause around high-impact news" hint="Flats 30 min before and after CPI, NFP, FOMC and rate decisions." />
          </div>
          <div className="mt-3">
            <Field label="Start behaviour" help="A scheduled start still needs the account connection to be live.">
              <select className="dx-select" value={startMode} onChange={(e) => setStartMode(e.target.value as "now" | "window")}>
                <option value="now">Start immediately after the slot warms up</option>
                <option value="window">Wait for the first session window</option>
              </select>
            </Field>
          </div>
          <div className="dx-card-inset mt-3">
            <span className="dx-kpi-label">Arming summary</span>
            <div className="d-grid gap-1 mt-2 font-display" style={{ fontSize: "0.86rem" }}>
              <span className="d-flex justify-content-between"><span className="dx-help">Schedule</span><span>{days.length ? days.join(" · ") : "no days selected"}</span></span>
              <span className="d-flex justify-content-between"><span className="dx-help">Window</span><span>{from} → {to} UTC</span></span>
              <span className="d-flex justify-content-between"><span className="dx-help">Start</span><span>{startMode === "now" ? "immediately" : "at window open"}</span></span>
              <span className="d-flex justify-content-between"><span className="dx-help">News blackout</span><span>{blackout ? "enabled" : "disabled"}</span></span>
              <span className="d-flex justify-content-between"><span className="dx-help">Max concurrent</span><span>{config.maxConcurrent}</span></span>
            </div>
          </div>
        </>
      )}
    </Dialog>
  );
}

function DeployProgressDialog({
  config,
  account,
  mode,
  onClose,
  onDone,
  pushLog,
}: {
  config: BotConfigDraft;
  account: DerivAccount;
  mode: "create" | "config";
  onClose: () => void;
  onDone: (receipt: DeployReceipt) => void;
  pushLog: (line: Omit<CreatorLogLine, "id" | "atMin">) => void;
}) {
  const stages = [
    { label: "Validating caps against the Deriv contract rules", channel: "risk" as const },
    { label: `Reserving an engine slot on ${account.loginId}`, channel: "engine" as const },
    { label: `Warming the ${config.symbol} tick feed`, channel: "feed" as const },
    { label: "Registering the bot job and writing the first autosave", channel: "config" as const },
    { label: mode === "config" ? "Restarting the runtime on the new config" : "Arming the strategy", channel: "engine" as const },
  ];
  const [index, setIndex] = useState(0);
  const fired = useMemo(() => ({ done: false }), []);
  useInterval(
    () => {
      setIndex((i) => {
        if (i >= stages.length) return i;
        pushLog({ level: "info", channel: stages[i].channel, message: `${mode === "config" ? "Apply & restart" : "Arm"}: ${stages[i].label}` });
        if (i === stages.length - 1 && !fired.done) {
          fired.done = true;
          onDone({
            name: config.name || "Untitled bot",
            botId: mode === "config" ? "bot_mart_10" : `bot_${config.symbol.toLowerCase().replace("_", "")}${Math.abs(Math.round(config.stake * 100))}`,
            slot: mode === "config" ? 3 : ENGINE_SLOTS.find((s) => s.state === "free")?.index ?? 6,
            loginId: account.loginId,
            stake: config.stake,
            paper: config.paper,
            mode: mode === "config" ? "apply" : "deploy",
          });
        }
        return i + 1;
      });
    },
    index >= stages.length ? null : 620,
  );
  const pctDone = Math.min(100, (index / stages.length) * 100);
  return (
    <Dialog open onClose={onClose} title={mode === "config" ? "Applying configuration" : "Arming your bot"} subtitle="Every step is confirmed by the engine before the next one starts" size="md">
      <div className="d-flex align-items-center gap-2 mb-2">
        <RefreshCw size={14} className="dx-spin" aria-hidden="true" />
        <span className="fw-semibold" style={{ fontSize: "0.88rem" }}>{stages[Math.min(index, stages.length - 1)].label}</span>
        <span className="dx-help ms-auto font-display">{Math.round(pctDone)}%</span>
      </div>
      <Progress value={pctDone} />
      <ul className="dx-list mt-3">
        {stages.map((s, i) => (
          <li key={s.label} className="dx-list-row d-flex align-items-center gap-2" style={{ fontSize: "0.84rem" }}>
            {i < index ? <CheckCircle2 size={14} className="dx-up" /> : i === index ? <span className="dx-pulse" /> : <Clock size={14} className="dx-muted" />}
            <span className={i <= index ? "" : "dx-muted"}>{s.label}</span>
          </li>
        ))}
      </ul>
      <div className="dx-card-inset mt-3">
        <span className="dx-kpi-label">What happens behind the scenes</span>
        <p className="dx-help mb-0 mt-1">
          The front-end POSTs the config to /v1/bots, the engine opens the Deriv WebSocket, subscribes to {config.symbol} ticks and only then submits the first proposal.
          Swap the fetch layer for the live socket and this progress dialog keeps working unchanged.
        </p>
      </div>
    </Dialog>
  );
}

function DeployReceiptDialog({
  receipt,
  config,
  onClose,
  onOpenBotDetail,
  onOpenLog,
}: {
  receipt: DeployReceipt;
  config: BotConfigDraft;
  onClose: () => void;
  onOpenBotDetail: () => void;
  onOpenLog: () => void;
}) {
  return (
    <Dialog
      open
      onClose={onClose}
      title={receipt.mode === "apply" ? "Configuration applied" : "Bot is live"}
      subtitle={`${receipt.loginId} · engine slot ${receipt.slot} · ${receipt.paper ? "virtual funds" : "real funds"}`}
      size="lg"
      footer={
        <div className="d-flex flex-wrap gap-2 justify-content-between w-100">
          <button type="button" className="dx-btn dx-btn-ghost" onClick={onOpenLog}><ScrollText size={13} /> View engine log</button>
          <div className="d-flex gap-2">
            <button type="button" className="dx-btn" onClick={onClose}>Keep configuring</button>
            <button type="button" className="dx-btn dx-btn-primary" onClick={onOpenBotDetail}><ExternalLink size={13} /> Open in Bot management</button>
          </div>
        </div>
      }
    >
      <Alert tone="up" title={receipt.mode === "apply" ? "Runtime restarted with the new configuration" : "Strategy armed"}>
        {receipt.mode === "apply"
          ? "Open contracts settled before the restart; the new caps are live from the next tick."
          : `The engine submits its first ${CONTRACT_TYPE_MAP[config.contractType]?.label} proposal on the next ${config.durationUnit === "ticks" ? "tick" : "bar"} close.`}
      </Alert>
      <div className="dx-table-wrap mt-3">
        <table className="dx-table">
          <tbody>
            <tr><td>Bot</td><td className="dx-td-num font-display">{receipt.name}</td></tr>
            <tr><td>Bot ID</td><td className="dx-td-num font-display">{receipt.botId}</td></tr>
            <tr><td>Symbol</td><td className="dx-td-num font-display">{config.symbol} · {SYMBOL_MAP[config.symbol]?.name}</td></tr>
            <tr><td>Contract</td><td className="dx-td-num font-display">{CONTRACT_TYPE_MAP[config.contractType]?.label}</td></tr>
            <tr><td>Stake / max</td><td className="dx-td-num font-display">{usd(config.stake)} / {usd(config.maxStake)}</td></tr>
            <tr><td>Duration</td><td className="dx-td-num font-display">{fmtDur(config.duration, config.durationUnit)}</td></tr>
            <tr><td>Take profit / stop loss</td><td className="dx-td-num font-display">{usd(config.takeProfit)} / {usd(config.stopLoss)}</td></tr>
            <tr><td>Daily limits</td><td className="dx-td-num font-display">{usd(config.risk.maxDailyLoss)} · {config.risk.maxDailyTrades} trades</td></tr>
            <tr><td>Engine slot</td><td className="dx-td-num font-display">#{receipt.slot} · eu-west-1</td></tr>
            <tr><td>Idempotency key</td><td className="dx-td-num font-display">idem_{receipt.botId.slice(-6)}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="d-flex flex-wrap gap-2 mt-3">
        <CopyButton text={receipt.botId} label="Copy bot ID" />
        <Chip tone="info">next tick settlement</Chip>
        <Chip tone="accent" pulse>engine connected</Chip>
      </div>
    </Dialog>
  );
}

// =============================================================================
// 18 — ACCOUNT RECONNECT (edge case: the socket drops mid-config)
// =============================================================================
function ReconnectDialog({
  account,
  config,
  onClose,
  onSaveDraft,
  onOpenOAuth,
  onOpenLog,
  pushLog,
}: {
  account: DerivAccount;
  config: BotConfigDraft;
  onClose: () => void;
  onSaveDraft: () => void;
  onOpenOAuth: () => void;
  onOpenLog: () => void;
  pushLog: (line: Omit<CreatorLogLine, "id" | "atMin">) => void;
}) {
  const [checked, setChecked] = useState(false);
  return (
    <Dialog open onClose={onClose} title={`${account.loginId} is offline`} subtitle="The Deriv WebSocket dropped while the wizard was open" size="lg" footer={
      <div className="d-flex flex-wrap gap-2 justify-content-between w-100">
        <button type="button" className="dx-btn dx-btn-ghost" onClick={onOpenLog}><ScrollText size={13} /> Connection log</button>
        <div className="d-flex gap-2">
          <button type="button" className="dx-btn" onClick={onSaveDraft}><Download size={13} /> Save draft &amp; close</button>
          <button type="button" className="dx-btn dx-btn-primary" onClick={onOpenOAuth}><Link2 size={13} /> Reconnect to Deriv</button>
        </div>
      </div>
    }>
      <Alert tone="warn" title="Draft preserved">
        “{config.name || "Untitled bot"}” keeps every parameter — nothing to retype when the connection returns. Arming is the only action that needs a live socket.
      </Alert>
      <div className="dx-table-wrap mt-3">
        <table className="dx-table dx-table-sm">
          <tbody>
            <tr><td>Endpoint</td><td className="dx-td-num font-display">wss://ws.derivws.com/websockets/v3</td></tr>
            <tr><td>Last tick</td><td className="dx-td-num font-display">{config.symbol} · 4 s before the drop</td></tr>
            <tr><td>Reconnect attempts</td><td className="dx-td-num font-display">{checked ? "3 of 5" : "1 of 5"}</td></tr>
            <tr><td>Session token</td><td className="dx-td-num font-display">{checked ? "valid — 42 min left" : "checking…"}</td></tr>
            <tr><td>Pending config changes</td><td className="dx-td-num font-display">autosaved</td></tr>
          </tbody>
        </table>
      </div>
      <div className="d-flex flex-wrap gap-2 mt-3">
        <button
          type="button"
          className="dx-btn dx-btn-sm"
          onClick={() => {
            setChecked(true);
            pushLog({ level: "warn", channel: "feed", message: "Connectivity probe: 3 reconnect attempts, session token valid for 42 min" });
          }}
        >
          <RefreshCw size={12} /> Run connectivity check
        </button>
        {checked ? <Chip tone="up">probe passed — the socket can be re-opened</Chip> : <Chip tone="muted">not probed yet</Chip>}
      </div>
      <p className="dx-help mt-3 mb-0">
        Reconnecting opens the Deriv OAuth handshake in its own dialog; the wizard keeps every field on return, and the account switcher in the top bar can point the bot
        at a different login ID (for example the MX multi-account) before arming.
      </p>
    </Dialog>
  );
}

// =============================================================================
// 19 — VERSIONS: history drawer, diff, rollback
// =============================================================================
function VersionsDrawer({
  versions,
  currentVersionId,
  onClose,
  onDiff,
  onRollback,
  onCreateDraft,
}: {
  versions: ConfigVersion[];
  currentVersionId: string;
  onClose: () => void;
  onDiff: (version: ConfigVersion) => void;
  onRollback: (version: ConfigVersion) => void;
  onCreateDraft: (version: ConfigVersion) => void;
}) {
  const [query, setQuery] = useState("");
  const rows = versions.filter((v) => `${v.version} ${v.label} ${v.author} ${v.summary}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <Drawer
      open
      onClose={onClose}
      wide
      title="Configuration history"
      subtitle={`${versions.length} revisions · newest first · runtime data is never stored here`}
      footer={<button type="button" className="dx-btn w-100" onClick={onClose}>Close history</button>}
    >
      <SearchInput value={query} onChange={setQuery} placeholder="Search version, author or label…" />
      <div className="d-grid gap-2 mt-2">
        {rows.map((v) => (
          <div key={v.id} className={`dx-card-inset ${v.id === currentVersionId ? "dx-card-live" : ""}`}>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="font-display fw-semibold">{v.version}</span>
              <Chip tone={v.status === "current" ? "up" : v.status === "rolled-back" ? "down" : v.status === "draft" ? "warn" : "muted"}>{v.status}</Chip>
              <Chip tone="info">{v.changes} change{v.changes === 1 ? "" : "s"}</Chip>
              <span className="dx-help ms-auto font-display">{longDate(v.atMin)}</span>
            </div>
            <span className="fw-semibold d-block mt-2" style={{ fontSize: "0.86rem" }}>{v.label}</span>
            <span className="dx-help d-block">{v.summary}</span>
            <span className="dx-help d-block font-display mt-1">author {v.author} · commit {v.hash}</span>
            <div className="d-flex flex-wrap gap-2 mt-2">
              <button type="button" className="dx-btn dx-btn-sm" onClick={() => onDiff(v)}>Diff vs current</button>
              <button type="button" className="dx-btn dx-btn-sm" onClick={() => onCreateDraft(v)}>Load as draft</button>
              {v.status !== "current" ? (
                <button type="button" className="dx-btn dx-btn-sm dx-btn-danger" onClick={() => onRollback(v)}><RefreshCw size={12} /> Roll back here</button>
              ) : (
                <span className="dx-help">live on the engine</span>
              )}
            </div>
          </div>
        ))}
        {!rows.length ? (
          <EmptyState title="No revisions match" message="Try a version number (v7.2.1), an author name or a label." action={<button type="button" className="dx-btn" onClick={() => setQuery("")}>Clear search</button>} />
        ) : null}
      </div>
    </Drawer>
  );
}

function VersionDiffDialog({
  version,
  config,
  currentLabel,
  onClose,
  onRollback,
}: {
  version: ConfigVersion;
  config: BotConfigDraft;
  currentLabel: string;
  onClose: () => void;
  onRollback: () => void;
}) {
  const rows: ConfigDiffRow[] = version.summary
    .split(",")
    .map((chunk) => chunk.trim().replace(/\.$/, ""))
    .map((chunk) => {
      const parts = chunk.split("→").map((p) => p.trim());
      return { field: "Engine value", from: parts[0] ?? chunk, to: parts[1] ?? "—", tone: "flat" as const };
    });
  const pending = diffConfigs(config, config).length;
  return (
    <Dialog open onClose={onClose} title={`Diff ${version.version} → ${currentLabel}`} subtitle={`${version.label} · authored by ${version.author} · commit ${version.hash}`} size="xl" footer={
      <div className="d-flex flex-wrap gap-2 justify-content-between w-100">
        <button type="button" className="dx-btn dx-btn-ghost" onClick={onClose}>Close diff</button>
        <button type="button" className="dx-btn" onClick={onRollback}><RefreshCw size={13} /> Roll back to {version.version}</button>
      </div>
    }>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <Chip tone="muted">{version.changes} field(s) changed in this revision</Chip>
        <Chip tone="info">{longDate(version.atMin)}</Chip>
        <Chip tone={version.status === "rolled-back" ? "down" : "up"}>{version.status}</Chip>
        {pending ? <Chip tone="warn">{pending} pending wizard edits</Chip> : null}
      </div>
      <div className="dx-table-wrap">
        <table className="dx-table">
          <thead><tr><th scope="col">Field</th><th scope="col">Value in {version.version}</th><th scope="col">Value now</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.from}-${i}`}>
                <td>{r.field} {rows.length > 1 ? i + 1 : ""}</td>
                <td className="font-display">{r.from}</td>
                <td className="font-display dx-up">{r.to}</td>
              </tr>
            ))}
            <tr><td>Revision summary</td><td className="dx-help" colSpan={2}>{version.summary}</td></tr>
            <tr><td>Runtime effect</td><td className="dx-help" colSpan={2}>
              {version.status === "current" ? "Live right now on the engine slot." : "Needs Apply & restart — open contracts settle first."}
            </td></tr>
          </tbody>
        </table>
      </div>
      <div className="dx-card-inset mt-3">
        <span className="dx-kpi-label">What a rollback does</span>
        <p className="dx-help mb-0 mt-1">
          It rewrites name, symbol, contract type, trade parameters, recovery variables, risk limits and schedule to the values captured in {version.version}, writes a new
          revision entry and restarts the runtime. Historic trade data is untouched.
        </p>
      </div>
    </Dialog>
  );
}

function RollbackDialog({
  version,
  onClose,
  onConfirm,
}: {
  version: ConfigVersion;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [ack, setAck] = useState(false);
  return (
    <Dialog open onClose={onClose} title={`Roll back to ${version.version}?`} size="md" footer={
      <div className="d-flex flex-wrap gap-2 justify-content-end w-100">
        <button type="button" className="dx-btn" onClick={onClose}>Cancel</button>
        <button type="button" className="dx-btn dx-btn-danger" disabled={!ack} onClick={onConfirm}><RefreshCw size={13} /> Roll back &amp; restart</button>
      </div>
    }>
      <Alert tone="danger" title="This restarts the bot runtime">
        {version.label} — {version.summary}
      </Alert>
      <div className="mt-3">
        <Toggle checked={ack} onChange={setAck} label="I understand open contracts settle at expiry" hint="The engine stops submitting new proposals immediately, then restarts on the restored configuration." />
      </div>
    </Dialog>
  );
}

// =============================================================================
// 20 — AUDIT DRAWER
// =============================================================================
function AuditDrawer({
  entry,
  onClose,
  onRevert,
  onOpenLog,
}: {
  entry: ConfigAuditEntry;
  onClose: () => void;
  onRevert: (id: string) => void;
  onOpenLog: () => void;
}) {
  const [local, setLocal] = useState(entry);
  const sourceLabel: Record<ConfigAuditEntry["source"], string> = {
    wizard: "Wizard (step 3)",
    "ai-assistant": "AI strategy assistant",
    optimizer: "Parameter optimizer",
    "marketplace-import": "Marketplace import",
    api: "REST API client",
    rollback: "Version rollback",
  };
  return (
    <Drawer
      open
      onClose={onClose}
      wide
      title={`${local.field} change`}
      subtitle={`${local.botName} · ${longDate(local.atMin)} · ${sourceLabel[local.source]}`}
      footer={
        <div className="d-flex flex-wrap gap-2 w-100">
          <button type="button" className="dx-btn dx-btn-ghost flex-grow-1" onClick={onOpenLog}><ScrollText size={13} /> Engine log</button>
          <button
            type="button"
            className="dx-btn flex-grow-1"
            disabled={local.status === "reverted"}
            onClick={() => {
              setLocal({ ...local, status: "reverted", riskDelta: "down" });
              onRevert(local.id);
            }}
          >
            <RefreshCw size={13} /> {local.status === "reverted" ? "Reverted" : "Revert this change"}
          </button>
        </div>
      }
    >
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <Chip tone={local.status === "applied" ? "up" : local.status === "reverted" ? "down" : "warn"}>{local.status}</Chip>
        <Chip tone={local.riskDelta === "up" ? "down" : local.riskDelta === "down" ? "up" : "muted"}>risk {local.riskDelta === "flat" ? "unchanged" : local.riskDelta === "up" ? "increased" : "decreased"}</Chip>
        <Chip tone="info">{sourceLabel[local.source]}</Chip>
        <span className="dx-help ms-auto font-display">{local.actor}</span>
      </div>

      <div className="d-flex flex-wrap align-items-center gap-3 p-3 dx-card-inset">
        <span className="d-flex flex-column">
          <span className="dx-kpi-label">Before</span>
          <span className="font-display fw-semibold dx-down">{local.from}</span>
        </span>
        <span className="dx-help" aria-hidden="true">→</span>
        <span className="d-flex flex-column">
          <span className="dx-kpi-label">After</span>
          <span className="font-display fw-semibold dx-up">{local.to}</span>
        </span>
      </div>

      <div className="dx-card-inset mt-3">
        <span className="dx-kpi-label">Why it changed</span>
        <p className="mb-0 mt-1" style={{ fontSize: "0.86rem" }}>{local.note}</p>
      </div>

      <div className="dx-table-wrap mt-3">
        <table className="dx-table dx-table-sm">
          <tbody>
            <tr><td>Bot</td><td className="dx-td-num font-display">{local.botId}</td></tr>
            <tr><td>Field path</td><td className="dx-td-num font-display">{local.field}</td></tr>
            <tr><td>Actor</td><td className="dx-td-num font-display">{local.actor}</td></tr>
            <tr><td>Timestamp</td><td className="dx-td-num font-display">{longDate(local.atMin)}</td></tr>
            <tr><td>Audit ID</td><td className="dx-td-num font-display">{local.id}</td></tr>
          </tbody>
        </table>
      </div>
      <p className="dx-help mt-3 mb-0">
        Reverting writes the opposite change as a new audit entry — the trail keeps both moves, so a reviewer can always reconstruct who changed what and why.
      </p>
    </Drawer>
  );
}

// =============================================================================
// 21 — ENGINE SLOTS
// =============================================================================
function SlotsDialog({
  config,
  onClose,
  pushLog,
}: {
  config: BotConfigDraft;
  onClose: () => void;
  pushLog: (line: Omit<CreatorLogLine, "id" | "atMin">) => void;
}) {
  const [slots, setSlots] = useState(ENGINE_SLOTS);
  const freeSlots = slots.filter((s) => s.state === "free");
  const running = slots.filter((s) => s.state === "running");
  const reserve = () =>
    setSlots((prev) => {
      const idx = prev.findIndex((s) => s.state === "free");
      if (idx < 0) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], state: "reserved", botName: `Reserved · ${config.name || "untitled"}`, loginId: config.loginId, memoryMb: 24, sinceMin: 0 };
      pushLog({ level: "info", channel: "engine", message: `Engine slot ${next[idx].index} reserved for ${config.name || "untitled"} on ${config.loginId}` });
      return next;
    });
  return (
    <Dialog open onClose={onClose} title="Engine slots" subtitle={`${running.length} running · ${freeSlots.length} free · 8 per account cluster`} size="xl" footer={
      <div className="d-flex flex-wrap gap-2 justify-content-between w-100">
        <span className="dx-help">Slots are billed per running hour; reserved slots hold a warm tick subscription without submitting proposals.</span>
        <div className="d-flex gap-2">
          <button type="button" className="dx-btn" onClick={onClose}>Close</button>
          <button type="button" className="dx-btn dx-btn-primary" disabled={!freeSlots.length} onClick={reserve}>
            <Cpu size={13} /> Reserve a slot for this config
          </button>
        </div>
      </div>}>
      <div className="dx-table-wrap">
        <table className="dx-table">
          <thead>
            <tr><th scope="col">Slot</th><th scope="col">State</th><th scope="col">Bot</th><th scope="col" style={{ textAlign: "right" }}>CPU</th><th scope="col" style={{ textAlign: "right" }}>RAM</th><th scope="col" className="dx-td-actions">Action</th></tr>
          </thead>
          <tbody>
            {slots.map((s) => (
              <tr key={s.id}>
                <td className="font-display">#{s.index}<span className="dx-help d-block">{s.region}</span></td>
                <td><Chip tone={s.state === "running" ? "up" : s.state === "reserved" ? "warn" : "muted"} pulse={s.state === "running"}>{s.state}</Chip></td>
                <td>{s.botName}<span className="dx-help d-block font-display">{s.loginId}</span></td>
                <td className="dx-td-num font-display">{s.cpuPct}%</td>
                <td className="dx-td-num font-display">{s.memoryMb} MB</td>
                <td className="dx-td-actions">
                  {s.state === "reserved" ? (
                    <button
                      type="button"
                      className="dx-btn dx-btn-sm dx-btn-ghost"
                      onClick={() => setSlots((prev) => prev.map((x) => (x.id === s.id ? { ...x, state: "free", botName: "—", loginId: "—", memoryMb: 0, sinceMin: 0 } : x)))}
                    >
                      Release
                    </button>
                  ) : s.state === "free" ? (
                    <button
                      type="button"
                      className="dx-btn dx-btn-sm"
                      onClick={() =>
                        setSlots((prev) => prev.map((x) => (x.id === s.id ? { ...x, state: "reserved", botName: `Reserved · ${config.name || "untitled"}`, loginId: config.loginId, memoryMb: 24 } : x)))
                      }
                    >
                      Reserve
                    </button>
                  ) : (
                    <span className="dx-help">live traffic</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Dialog>
  );
}

// =============================================================================
// 22 — RISK / COMPLETENESS / PROJECTION / LEAVE / HELP / LOG
// =============================================================================
function RiskDrawer({
  config,
  onClose,
  onTighten,
  onMonteCarlo,
}: {
  config: BotConfigDraft;
  onClose: () => void;
  onTighten: () => void;
  onMonteCarlo: () => void;
}) {
  const risk = assessRisk(config);
  const quick = runMonteCarlo(config, 400);
  return (
    <Drawer
      open
      onClose={onClose}
      wide
      title="Risk breakdown"
      subtitle={`${risk.band} · ${risk.score}/100 · ${CONTRACT_TYPE_MAP[config.contractType]?.label} on ${config.symbol}`}
      footer={
        <div className="d-flex flex-wrap gap-2 w-100">
          <button type="button" className="dx-btn flex-grow-1" onClick={onMonteCarlo}><Shield size={13} /> Monte-Carlo</button>
          <button type="button" className="dx-btn dx-btn-primary flex-grow-1" onClick={onTighten}>Tighten caps</button>
        </div>
      }
    >
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <Chip tone={risk.band === "high" ? "down" : risk.band === "medium" ? "warn" : "up"}>risk {risk.band}</Chip>
        <Chip tone="info">worst cycle {usd(risk.worstCasePerCycle)}</Chip>
        <Chip tone="muted">ruin {risk.mcRuin}%</Chip>
      </div>
      <div className="d-grid gap-3">
        {risk.parts.map((p) => (
          <div key={p.label}>
            <Meter label={p.label} value={(p.points / p.max) * 100} display={`${p.points}/${p.max}`} />
            <span className="dx-help d-block mt-1">{p.note}</span>
          </div>
        ))}
      </div>

      <span className="dx-eyebrow d-block mt-4 mb-2">Hard limits the engine enforces</span>
      <div className="dx-table-wrap">
        <table className="dx-table dx-table-sm">
          <tbody>
            <tr><td>Max daily loss</td><td className="dx-td-num font-display">{usd(config.risk.maxDailyLoss)}</td></tr>
            <tr><td>Max daily trades</td><td className="dx-td-num font-display">{config.risk.maxDailyTrades}</td></tr>
            <tr><td>Cooldown after losses</td><td className="dx-td-num font-display">{config.risk.cooldownCount} losses → {config.risk.cooldownMinutes} min</td></tr>
            <tr><td>Max consecutive losses</td><td className="dx-td-num font-display">{config.risk.maxConsecutiveLosses}</td></tr>
            <tr><td>Take profit</td><td className="dx-td-num font-display">{usd(config.takeProfit)}</td></tr>
            <tr><td>Stop loss</td><td className="dx-td-num font-display">{usd(config.stopLoss)}</td></tr>
            <tr><td>Concurrent contracts</td><td className="dx-td-num font-display">{config.maxConcurrent}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="dx-card-inset mt-3">
        <span className="dx-kpi-label">Quick 400-run sanity check</span>
        <div className="d-grid gap-1 mt-2 font-display" style={{ fontSize: "0.86rem" }}>
          <span className="d-flex justify-content-between"><span className="dx-help">Worst 5%</span><span className="dx-down">{pnl(quick.p05)}</span></span>
          <span className="d-flex justify-content-between"><span className="dx-help">Expected</span><span>{pnl(quick.p50)}</span></span>
          <span className="d-flex justify-content-between"><span className="dx-help">Best 5%</span><span className="dx-up">{pnl(quick.p95)}</span></span>
        </div>
      </div>
    </Drawer>
  );
}

function CompletenessDialog({
  config,
  onClose,
  goStep,
  onRunBacktest,
}: {
  config: BotConfigDraft;
  onClose: () => void;
  goStep: (step: number) => void;
  onRunBacktest: () => void;
}) {
  const completeness = assessCompleteness(config);
  return (
    <Dialog open onClose={onClose} title="Configuration completeness" subtitle={`${completeness.pct}% · ${completeness.items.filter((i) => i.done).length} of ${completeness.items.length} checks passed`} size="lg" footer={
      <div className="d-flex flex-wrap gap-2 justify-content-end w-100">
        <button type="button" className="dx-btn" onClick={onClose}>Close</button>
        <button type="button" className="dx-btn dx-btn-primary" onClick={onRunBacktest}><FlaskConical size={13} /> Run the missing backtest</button>
      </div>
    }>
      <Progress value={completeness.pct} />
      <ul className="dx-list mt-3">
        {completeness.items.map((item) => (
          <li key={item.id} className="dx-list-row d-flex flex-wrap align-items-center gap-2" style={{ fontSize: "0.86rem" }}>
            {item.done ? <CheckCircle2 size={15} className="dx-up" /> : <AlertTriangle size={15} className="dx-warn-text" />}
            <span className="flex-grow-1">
              <span className="d-block fw-semibold">{item.label}</span>
              <span className="dx-help d-block">{item.hint}</span>
            </span>
            <button type="button" className="dx-btn dx-btn-sm" onClick={() => { goStep(item.step); onClose(); }}>
              Step {item.step + 1}
            </button>
          </li>
        ))}
      </ul>
      <Alert tone="info" title="Everything here is required before arming">
        The last check is evidence: at least one backtest or optimizer run on this exact configuration. Everything else is a form field you can change instantly.
      </Alert>
    </Dialog>
  );
}

function ProjectionDialog({ config, onClose, onApplyCaps }: { config: BotConfigDraft; onClose: () => void; onApplyCaps: () => void }) {
  const projection = projectMonthly(config);
  const [scenario, setScenario] = useState("expected");
  const active = projection.scenarios.find((s) => s.id === scenario) ?? projection.scenarios[1];
  return (
    <Dialog open onClose={onClose} title="Projected monthly outcome" subtitle={`${config.symbol} · ${CONTRACT_TYPE_MAP[config.contractType]?.label} · ${fmtDur(config.duration, config.durationUnit)}`} size="xl" footer={
      <div className="d-flex flex-wrap gap-2 justify-content-between w-100">
        <CopyButton text={`${active.label}: ${pnl(active.monthlyPnl)} over ${active.tradesPerMonth} contracts`} label="Copy scenario" small={false} />
        <div className="d-flex gap-2">
          <button type="button" className="dx-btn" onClick={onClose}>Close</button>
          <button type="button" className="dx-btn dx-btn-primary" onClick={onApplyCaps}><Shield size={13} /> Apply conservative caps</button>
        </div>
      </div>}>
      <MiniTabs
        options={projection.scenarios.map((s) => ({ id: s.id, label: s.label }))}
        value={scenario}
        onChange={setScenario}
        ariaLabel="Projection scenario"
        className="mb-3"
      />
      <div className="row g-2 mb-3">
        <div className="col-6 col-lg-3"><div className="dx-card-inset"><span className="dx-kpi-label">Monthly P&L</span><div className={`dx-card-inset-value font-display ${active.monthlyPnl >= 0 ? "dx-up" : "dx-down"}`}>{pnl(active.monthlyPnl)}</div></div></div>
        <div className="col-6 col-lg-3"><div className="dx-card-inset"><span className="dx-kpi-label">Contracts / month</span><div className="dx-card-inset-value font-display">{active.tradesPerMonth.toLocaleString("en-US")}</div></div></div>
        <div className="col-6 col-lg-3"><div className="dx-card-inset"><span className="dx-kpi-label">Modelled win rate</span><div className="dx-card-inset-value font-display">{pct(active.winRate, 1)}</div></div></div>
        <div className="col-6 col-lg-3"><div className="dx-card-inset"><span className="dx-kpi-label">Worst drawdown</span><div className="dx-card-inset-value font-display dx-down">{usd(active.drawdown)}</div></div></div>
      </div>
      <Alert tone={active.id === "conservative" ? "warn" : "info"} title={active.note}>
        Contract length {fmtDur(config.duration, config.durationUnit)} at {config.maxConcurrent} concurrent slot{config.maxConcurrent === 1 ? "" : "s"} produces about{" "}
        <span className="font-display">{projection.contractsPerDay}</span> settlements per day and <span className="font-display">{usd(projection.monthlyTurnover)}</span> of
        monthly turnover. Expect roughly <span className="font-display">{projection.capBreachDays}</span> day(s) where the daily cap stops trading early.
      </Alert>
      <span className="dx-eyebrow d-block mt-3 mb-2">Assumptions this projection stands on</span>
      <ul className="dx-list">
        {projection.assumptions.map((a) => <li key={a} className="dx-list-row" style={{ fontSize: "0.84rem" }}>{a}</li>)}
      </ul>
    </Dialog>
  );
}

function LeaveDialog({ dirty, onClose, onLeave }: { dirty: number; onClose: () => void; onLeave: (choice: "save" | "discard" | "stay") => void }) {
  return (
    <Dialog open onClose={onClose} title="Leave the wizard?" subtitle={`${dirty} unsaved field${dirty === 1 ? "" : "s"} in this configuration`} size="md" footer={
      <div className="d-flex flex-wrap gap-2 justify-content-between w-100">
        <button type="button" className="dx-btn dx-btn-ghost" onClick={() => onLeave("stay")}>Stay on the page</button>
        <div className="d-flex gap-2">
          <button type="button" className="dx-btn dx-btn-danger" onClick={() => onLeave("discard")}>Discard changes</button>
          <button type="button" className="dx-btn dx-btn-primary" onClick={() => onLeave("save")}><Download size={13} /> Save draft &amp; leave</button>
        </div>
      </div>
    }>
      <Alert tone="warn" title="Autosave keeps drafts, not decisions">
        The cloud autosave fires every 30 seconds, so today's values are already stored as a draft you can resume from any device. “Discard” only drops the delta since the
        last autosave.
      </Alert>
      <div className="dx-card-inset mt-3">
        <span className="dx-kpi-label">Resume later from</span>
        <p className="dx-help mb-0 mt-1">Dashboard → Bots → Bot creator → Recent drafts, or the drafts table on this page. Drafts are keyed to the login ID that created them.</p>
      </div>
    </Dialog>
  );
}

function HelpDialog({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState("flow");
  const glossary: [string, string][] = [
    ["Step ladder", "The stake sequence used when contracts lose — e.g. 0.35 → 0.74 → 1.54 at a 2.1× multiplier."],
    ["Stop-loss", "The loss at which the engine halts the bot for the day. Open contracts still settle at expiry."],
    ["Max stake", "Hard ceiling on any single leg. The ladder is clamped here instead of breaching it."],
    ["Cooldown", "After N consecutive losses the bot pauses for the configured number of minutes."],
    ["Payout %", "Deriv's payout on the contract: a 95% payout turns a $1 stake into a $1.95 settlement."],
    ["Contract type", "Rise/Fall, Higher/Lower, Touch, Digits, Accumulator or Multiplier — each has its own duration rules."],
    ["Idempotency key", "Token that stops a retried buy from opening the same contract twice on the Deriv socket."],
  ];
  return (
    <Dialog open onClose={onClose} title="Bot creator guide" subtitle="Flow, guardrails and keyboard shortcuts" size="lg" footer={<div className="d-flex justify-content-end w-100"><button type="button" className="dx-btn dx-btn-primary" onClick={onClose}>Got it</button></div>}>
      <Tabs
        tabs={[
          { id: "flow", label: "Flow" },
          { id: "glossary", label: "Glossary" },
          { id: "keys", label: "Shortcuts" },
        ]}
        active={tab}
        onChange={setTab}
      />
      <div className="mt-3">
        {tab === "flow" ? (
          <ol className="dx-list">
            <li className="dx-list-row" style={{ fontSize: "0.86rem" }}><strong>Basic info</strong> — name the bot, pick the market, symbol and funding account.</li>
            <li className="dx-list-row" style={{ fontSize: "0.86rem" }}><strong>Strategy</strong> — a built-in ladder, your linted script, or the AI assistant's draft.</li>
            <li className="dx-list-row" style={{ fontSize: "0.86rem" }}><strong>Parameters &amp; risk</strong> — stake, duration, contract type and the hard limits the engine enforces.</li>
            <li className="dx-list-row" style={{ fontSize: "0.86rem" }}><strong>Review &amp; start</strong> — backtest, optimize, Monte-Carlo, then arm or save as a draft.</li>
          </ol>
        ) : null}
        {tab === "glossary" ? (
          <div className="dx-table-wrap">
            <table className="dx-table dx-table-sm">
              <tbody>
                {glossary.map(([term, meaning]) => (
                  <tr key={term}><td className="fw-semibold">{term}</td><td className="dx-help">{meaning}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {tab === "keys" ? (
          <div className="dx-table-wrap">
            <table className="dx-table dx-table-sm">
              <tbody>
                <tr><td className="font-display">Ctrl / ⌘ + S</td><td className="dx-help">Save the current configuration as a draft</td></tr>
                <tr><td className="font-display">Ctrl / ⌘ + Enter</td><td className="dx-help">Continue to the next step (validates first)</td></tr>
                <tr><td className="font-display">Alt + ←</td><td className="dx-help">Back one step without losing data</td></tr>
                <tr><td className="font-display">Alt + B</td><td className="dx-help">Open the live backtest preview</td></tr>
                <tr><td className="font-display">Alt + O</td><td className="dx-help">Run the parameter optimizer</td></tr>
                <tr><td className="font-display">Esc</td><td className="dx-help">Close the open dialog or drawer</td></tr>
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
      <div className="dx-card-inset mt-3">
        <span className="dx-kpi-label">Front-end only</span>
        <p className="dx-help mb-0 mt-1">
          Every number on this page comes from the mock datasets in <span className="font-display">src/data</span> shaped like the real Deriv WebSocket payloads. No live order
          is ever sent from this build — the deploy flow simulates the POST and shows the receipt it would return.
        </p>
      </div>
    </Dialog>
  );
}

function LogDrawer({
  lines,
  onClose,
  paused,
  onTogglePause,
}: {
  lines: CreatorLogLine[];
  onClose: () => void;
  paused: boolean;
  onTogglePause: () => void;
}) {
  const [channel, setChannel] = useState("all");
  const rows = lines.filter((l) => channel === "all" || l.channel === channel);
  const tone = (level: CreatorLogLine["level"]) => (level === "error" ? "down" : level === "warn" ? "warn" : "info");
  return (
    <Drawer
      open
      onClose={onClose}
      wide
      title="Creator engine log"
      subtitle={`${lines.length} lines · ${paused ? "paused" : "streaming"} · wss://ws.derivws.com/websockets/v3`}
      footer={
        <div className="d-flex flex-wrap gap-2 w-100">
          <button type="button" className="dx-btn flex-grow-1" onClick={onTogglePause}>{paused ? <><Play size={13} /> Resume stream</> : <><Clock size={13} /> Pause stream</>}</button>
          <CopyButton text={rows.map((l) => `${l.channel} · ${l.level} · ${l.message}`).join("\n")} label="Copy visible lines" small={false} />
        </div>
      }
    >
      <div className="d-flex flex-wrap gap-2 mb-2">
        <FilterChips
          options={[
            { id: "engine", label: "Engine" },
            { id: "risk", label: "Risk" },
            { id: "feed", label: "Feed" },
            { id: "config", label: "Config" },
          ]}
          value={channel}
          onChange={setChannel}
          allLabel="All channels"
        />
        <Chip tone={paused ? "warn" : "up"} pulse={!paused}>{paused ? "paused" : "live"}</Chip>
      </div>
      <div className="dx-card-inset">
        <div className="dx-terminal">
          {rows.map((l) => (
            <span key={l.id} className="dx-terminal-line d-flex flex-wrap align-items-center gap-2">
              <span className="dx-help font-display">{nowMinAgo(l.atMin)}</span>
              <span className={`dx-chip dx-chip-${tone(l.level)}`}>{l.level}</span>
              <span className="dx-help font-display">{l.channel}</span>
              <span style={{ fontSize: "0.82rem" }}>{l.message}</span>
            </span>
          ))}
        </div>
      </div>
      {!rows.length ? <EmptyState title="Nothing on this channel" message="Switch the filter back to all channels to see the full tape." action={<button type="button" className="dx-btn" onClick={() => setChannel("all")}>Show all channels</button>} /> : null}
    </Drawer>
  );
}

// =============================================================================
// DISPATCHER — exactly one overlay at a time, driven by the page
// =============================================================================
export function BotCreatorOverlays(props: CreatorOverlayProps) {
  const {
    overlay, setOverlay, config, baseline, patch, patchRisk, applyConfig, goStep,
    account, mode, bot, drafts, upsertDraft, removeDraft, paramSets, upsertParamSet, removeParamSet,
    backtest, setBacktest, backtestSkipped, setBacktestSkipped, audit, logLines, pushLog, notify,
    lintClean, markLintClean, onDeployed, onOpenOAuth, onOpenBotDetail, onRevertAudit, onLeave,
  } = props;
  const [logPaused, setLogPaused] = useState(false);

  if (!overlay) return null;
  const close = () => setOverlay(null);

  switch (overlay.kind) {
    case "strategy-detail":
      return (
        <StrategyDetailDialog
          id={overlay.id}
          config={config}
          onClose={close}
          onTune={() => {
            const t = BOT_STRATEGY_TEMPLATES.find((s) => s.id === overlay.id);
            if (t) patch({ strategyId: t.id, strategyParams: { ...t.defaultParams } });
            close();
            goStep(2);
          }}
          onApply={(step) => {
            const t = BOT_STRATEGY_TEMPLATES.find((s) => s.id === overlay.id);
            if (t) {
              patch({ strategyId: t.id, strategyParams: { ...t.defaultParams } });
              pushLog({ level: "info", channel: "config", message: `Strategy ${t.name} applied (${Object.keys(t.defaultParams).length} default variables)` });
            }
            close();
            goStep(step);
          }}
        />
      );

    case "symbol-picker":
      return (
        <SymbolPickerDialog
          current={config.symbol}
          market={config.market}
          onClose={close}
          onPick={(code) => {
            const sym = SYMBOL_MAP[code];
            patch({ symbol: code, market: sym?.market ?? config.market, contractType: sym?.contractTypes[0] ?? config.contractType });
            close();
          }}
          onHalted={(code) => setOverlay({ kind: "halted", code })}
        />
      );

    case "halted":
      return (
        <HaltedSymbolDialog
          code={overlay.code}
          onClose={close}
          onSwap={(code) => {
            const sym = SYMBOL_MAP[code];
            patch({ symbol: code, market: sym?.market ?? config.market });
            pushLog({ level: "warn", channel: "feed", message: `Symbol swapped ${overlay.code} → ${code} while the primary feed was halted` });
            close();
          }}
        />
      );

    case "ai":
      return (
        <AiAssistantWizard
          config={config}
          onClose={close}
          onApplied={(next, brief) => {
            applyConfig(next);
            pushLog({ level: "info", channel: "config", message: `AI brief applied: ${brief.changes.length} fields from “${brief.title}”` });
            close();
            goStep(1);
          }}
        />
      );

    case "scripts":
      return (
        <ScriptLibraryDrawer
          currentScriptId={config.scriptId}
          lintClean={lintClean}
          onClose={close}
          onOpenLint={(scriptId) => setOverlay({ kind: "lint", scriptId })}
          onPick={(scriptId, opts) => {
            const next: Partial<BotConfigDraft> = { scriptId, strategyId: "st_custom" };
            if (opts.symbol) next.symbol = opts.symbol;
            if (opts.contractType) next.contractType = opts.contractType as BotConfigDraft["contractType"];
            patch(next);
            pushLog({ level: "info", channel: "config", message: `Script ${scriptId} attached to the custom strategy` });
            close();
            goStep(1);
          }}
        />
      );

    case "lint":
      return (
        <ScriptLintDialog
          scriptId={overlay.scriptId}
          onClose={close}
          onOpenLibrary={() => setOverlay({ kind: "scripts" })}
          onFix={(issue) => {
            markLintClean(issue.scriptId);
            pushLog({ level: "info", channel: "config", message: `Lint fix applied to ${issue.scriptName} line ${issue.line} — step 4 unblocked` });
            close();
          }}
        />
      );

    case "market-preview":
      return (
        <MarketplacePreviewDrawer
          id={overlay.id}
          onClose={close}
          onImport={(id) => setOverlay({ kind: "market-import", id })}
          onSaveParams={(s) => {
            upsertParamSet({
              id: `ps_${s.id}`,
              name: `${s.name} (imported)`,
              strategy: "fixed",
              symbol: s.symbol,
              stake: s.stake,
              multiplier: 1,
              maxSteps: 3,
              duration: s.duration,
              durationUnit: s.durationUnit,
              takeProfit: Math.round(s.stake * 12),
              stopLoss: Math.round(Math.abs(s.maxDrawdown) / 4),
              winRate: s.winRate,
              pnl: 0,
              drawdown: s.maxDrawdown,
              sharpe: s.sharpe,
              uses: 0,
              owner: "You",
              updatedMin: 0,
              visibility: "team",
            });
            pushLog({ level: "info", channel: "config", message: `Parameter set saved from marketplace strategy ${s.name}` });
            close();
          }}
        />
      );

    case "market-import":
      return (
        <MarketplaceImportWizard
          id={overlay.id}
          config={config}
          onClose={close}
          onApplied={(next, strategy) => {
            applyConfig(next);
            pushLog({ level: "info", channel: "config", message: `Marketplace import ${strategy.name} v${strategy.version} pre-filled steps 2 and 3` });
            notify("success", "Strategy imported", `${strategy.name} mapped to ${strategy.symbol} — review the parameters before arming.`);
            close();
            goStep(1);
          }}
        />
      );

    case "template-save":
      return (
        <SaveTemplateDialog
          config={config}
          onClose={close}
          onSave={(set) => {
            upsertParamSet(set);
            pushLog({ level: "info", channel: "config", message: `Template saved: ${set.name} (${set.visibility})` });
            close();
          }}
        />
      );

    case "param-set": {
      const existing = overlay.id ? paramSets.find((s) => s.id === overlay.id) ?? null : null;
      return (
        <ParameterSetDialog
          existing={existing}
          config={config}
          onClose={close}
          onApply={(next, label) => {
            applyConfig(next);
            pushLog({ level: "info", channel: "config", message: `Parameter set applied: ${label}` });
            close();
            goStep(2);
          }}
        />
      );
    }

    case "param-set-delete": {
      const set = paramSets.find((s) => s.id === overlay.id);
      return (
        <ConfirmDelete
          title={`Delete “${set?.name ?? "parameter set"}”?`}
          confirmLabel="Delete set"
          onClose={close}
          onConfirm={() => {
            removeParamSet(overlay.id);
            pushLog({ level: "warn", channel: "config", message: `Parameter set deleted: ${set?.name ?? overlay.id}` });
            close();
          }}
          body={
            <p className="mb-0">
              The numbers leave your library ({set?.visibility ?? "private"} scope). Bots already running on these values keep them until their next restart.
            </p>
          }
        />
      );
    }

    case "share":
      return <ShareConfigDialog config={config} onClose={close} />;

    case "export-config":
      return (
        <ExportConfigDialog
          config={config}
          draft={overlay.from ? drafts.find((d) => d.id === overlay.from) : undefined}
          onClose={close}
          onImport={() => setOverlay({ kind: "import-config" })}
        />
      );

    case "import-config":
      return (
        <ImportConfigDialog
          onClose={close}
          onImport={(next) => {
            applyConfig(next);
            pushLog({ level: "info", channel: "config", message: `Configuration imported (schema derivx.bot_config.v12) from ${next.symbol}` });
            close();
          }}
        />
      );

    case "backtest":
      return (
        <BacktestRunDialog
          config={config}
          pushLog={pushLog}
          onClose={close}
          onFinish={(result, skipped) => {
            if (skipped) {
              setBacktestSkipped(true);
              pushLog({ level: "warn", channel: "engine", message: "Backtest skipped — the review step keeps a no-evidence warning" });
              setOverlay({ kind: "backtest-result" });
              return;
            }
            setBacktest(result);
            setBacktestSkipped(false);
            notify("info", "Backtest complete", `${result.metrics.total} contracts · win rate ${pct(result.metrics.winRate, 1)} · ${pnl(result.metrics.pnl)}`);
            setOverlay({ kind: "backtest-result" });
          }}
        />
      );

    case "backtest-result":
      return (
        <BacktestResultDialog
          config={config}
          result={backtest}
          skipped={backtestSkipped && !backtest}
          onClose={close}
          onRerun={(multiplier) => {
            const result = runBacktestSim({ ...config, strategyParams: { ...config.strategyParams, multiplier } }, { trades: 60 });
            setBacktest(result);
            setBacktestSkipped(false);
            pushLog({ level: "info", channel: "engine", message: `What-if re-run at ${multiplier.toFixed(1)}× → ${pnl(result.metrics.pnl)}` });
          }}
          onOptimize={() => setOverlay({ kind: "optimizer" })}
          onMonteCarlo={() => setOverlay({ kind: "montecarlo" })}
          onApplyParams={(p) => {
            patch(p);
            close();
            goStep(2);
          }}
        />
      );

    case "optimizer":
      return (
        <OptimizerDialog
          config={config}
          onClose={close}
          pushLog={pushLog}
          onApply={(p, candidate) => {
            patch(p);
            pushLog({ level: "info", channel: "engine", message: `Optimizer winner applied: ${candidate.multiplier}× · ${candidate.maxSteps} steps · ${fmtDur(candidate.duration, candidate.durationUnit)}` });
            close();
            goStep(3);
          }}
        />
      );

    case "montecarlo":
      return (
        <MonteCarloDialog
          config={config}
          onClose={close}
          onTighten={(p) => {
            patchRisk(p);
            pushLog({ level: "info", channel: "risk", message: `Risk caps tightened from the Monte-Carlo run (daily loss ${usd(p.maxDailyLoss ?? config.risk.maxDailyLoss)})` });
            close();
          }}
        />
      );

    case "draft": {
      const draft = drafts.find((d) => d.id === overlay.id);
      if (!draft) return null;
      const other = drafts.find((x) => x.id !== draft.id);
      return (
        <DraftDrawer
          draft={draft}
          onClose={close}
          onResume={(d) => setOverlay({ kind: "draft-resume", id: d.id })}
          onDuplicate={(d) => {
            upsertDraft({ ...d, id: `${d.id}_copy`, name: `${d.name} copy`, origin: "local", updatedMin: 0 });
            pushLog({ level: "info", channel: "config", message: `Draft duplicated: ${d.name} → ${d.name} copy` });
            close();
          }}
          onDelete={(d) => setOverlay({ kind: "draft-delete", id: d.id })}
          onCompare={(d) => other && setOverlay({ kind: "draft-compare", ids: [d.id, other.id] })}
          onExport={(d) => setOverlay({ kind: "export-config", from: d.id })}
          onOpenLog={() => setOverlay({ kind: "log" })}
        />
      );
    }

    case "draft-compare": {
      const picked = overlay.ids.map((id) => drafts.find((d) => d.id === id)).filter(Boolean) as BotDraft[];
      if (picked.length < 2) return null;
      return (
        <DraftCompareDialog
          drafts={picked}
          onClose={close}
          onResume={(d) => setOverlay({ kind: "draft-resume", id: d.id })}
          onDelete={(d) => setOverlay({ kind: "draft-delete", id: d.id })}
        />
      );
    }

    case "draft-delete": {
      const draft = drafts.find((d) => d.id === overlay.id);
      return (
        <ConfirmDelete
          title={`Delete “${draft?.name ?? "draft"}”?`}
          confirmLabel="Delete draft"
          onClose={close}
          onConfirm={() => {
            removeDraft(overlay.id);
            pushLog({ level: "warn", channel: "config", message: `Draft deleted: ${draft?.name ?? overlay.id}` });
            close();
          }}
          body={
            <p className="mb-0">
              {draft?.origin === "cloud"
                ? "The cloud copy is removed from your account and every signed-in device. Export it first if you want a permanent record."
                : "This draft only exists in this browser — deleting it cannot be undone."}
            </p>
          }
        />
      );
    }

    case "draft-resume": {
      const draft = drafts.find((d) => d.id === overlay.id);
      if (!draft) return null;
      const template = BOT_STRATEGY_TEMPLATES.find((t) => t.name.toLowerCase().includes(draft.strategy)) ?? BOT_STRATEGY_TEMPLATES[0];
      return (
        <DraftResumeDialog
          draft={draft}
          config={config}
          onClose={close}
          onConfirm={() => {
            applyConfig({
              ...config,
              name: draft.name,
              symbol: draft.symbol,
              market: SYMBOL_MAP[draft.symbol]?.market ?? config.market,
              loginId: draft.loginId,
              stake: draft.stake,
              strategyId: template.id,
              strategyParams: { ...template.defaultParams },
              contractType: SYMBOL_MAP[draft.symbol]?.contractTypes[0] ?? config.contractType,
              tags: draft.tags,
            });
            pushLog({ level: "info", channel: "config", message: `Draft resumed: ${draft.name} (${draft.symbol}, ${usd(draft.stake)})` });
            close();
            goStep(Math.min(3, draft.step));
          }}
        />
      );
    }

    case "deploy-confirm":
      return (
        <DeployConfirmWizard
          config={config}
          account={account}
          mode={mode}
          bot={bot}
          onClose={close}
          onConfirm={() => setOverlay({ kind: "deploy-progress" })}
        />
      );

    case "deploy-progress":
      return (
        <DeployProgressDialog
          config={config}
          account={account}
          mode={mode}
          pushLog={pushLog}
          onClose={close}
          onDone={(receipt) => {
            onDeployed(receipt);
            setOverlay({ kind: "deploy-receipt" });
          }}
        />
      );

    case "deploy-receipt":
      return (
        <DeployReceiptDialog
          receipt={props.receipt ?? {
            name: config.name || "Untitled bot",
            botId: "bot_pending",
            slot: 6,
            loginId: account.loginId,
            stake: config.stake,
            paper: config.paper,
            mode: "deploy",
          }}
          config={config}
          onClose={close}
          onOpenBotDetail={onOpenBotDetail}
          onOpenLog={() => setOverlay({ kind: "log" })}
        />
      );

    case "reconnect":
      return (
        <ReconnectDialog
          account={account}
          config={config}
          pushLog={pushLog}
          onClose={close}
          onOpenLog={() => setOverlay({ kind: "log" })}
          onOpenOAuth={() => {
            close();
            onOpenOAuth();
          }}
          onSaveDraft={() => {
            upsertDraft({
              id: `drf_${Date.now()}`,
              name: config.name || "Untitled bot",
              symbol: config.symbol,
              strategy: "martingale",
              stake: config.stake,
              step: 3,
              origin: "local",
              completeness: 62,
              updatedMin: 0,
              loginId: config.loginId,
              note: "Saved when the Deriv socket dropped mid-configuration.",
              tags: config.tags,
            });
            notify("warn", "Draft saved while offline", `${config.name || "Untitled bot"} will be waiting when the socket is back.`);
            close();
          }}
        />
      );

    case "versions": {
      const filtered = mode === "config" && bot ? CONFIG_VERSIONS.filter((v) => v.botId === bot.id) : CONFIG_VERSIONS;
      const list = filtered.length ? filtered : CONFIG_VERSIONS;
      return (
        <VersionsDrawer
          versions={list}
          currentVersionId={list[0]?.id ?? "cv_01"}
          onClose={close}
          onDiff={(v) => setOverlay({ kind: "version-diff", a: v.id, b: "current" })}
          onRollback={(v) => setOverlay({ kind: "rollback", id: v.id })}
          onCreateDraft={(v) => {
            upsertDraft({
              id: `drf_${v.id}`,
              name: `${config.name || "Untitled bot"} · ${v.version}`,
              symbol: config.symbol,
              strategy: "martingale",
              stake: config.stake,
              step: 3,
              origin: "local",
              completeness: 70,
              updatedMin: 0,
              loginId: config.loginId,
              note: `Loaded from revision ${v.version} (${v.label}).`,
              tags: config.tags,
            });
            pushLog({ level: "info", channel: "config", message: `Revision ${v.version} stored as a draft` });
            close();
          }}
        />
      );
    }

    case "version-diff": {
      const version = CONFIG_VERSIONS.find((v) => v.id === overlay.a) ?? CONFIG_VERSIONS[0];
      return (
        <VersionDiffDialog
          version={version}
          config={config}
          currentLabel={mode === "config" ? "live config" : "wizard state"}
          onClose={close}
          onRollback={() => setOverlay({ kind: "rollback", id: version.id })}
        />
      );
    }

    case "rollback": {
      const version = CONFIG_VERSIONS.find((v) => v.id === overlay.id) ?? CONFIG_VERSIONS[0];
      return (
        <RollbackDialog
          version={version}
          onClose={close}
          onConfirm={() => {
            applyConfig({ ...baseline, strategyParams: { ...baseline.strategyParams, multiplier: version.version.endsWith("4") ? 2 : 2.1 } });
            pushLog({ level: "warn", channel: "config", message: `Rolled back to ${version.version} (${version.label}) and restarted the runtime` });
            notify("success", "Configuration rolled back", `${version.version} · ${version.label} is live again.`);
            close();
            goStep(3);
          }}
        />
      );
    }

    case "audit": {
      const entry = audit.find((a) => a.id === overlay.id);
      if (!entry) return null;
      return <AuditDrawer entry={entry} onClose={close} onRevert={onRevertAudit} onOpenLog={() => setOverlay({ kind: "log" })} />;
    }

    case "slots":
      return <SlotsDialog config={config} onClose={close} pushLog={pushLog} />;

    case "risk":
      return (
        <RiskDrawer
          config={config}
          onClose={close}
          onMonteCarlo={() => setOverlay({ kind: "montecarlo" })}
          onTighten={() => {
            patchRisk({ maxDailyLoss: Math.max(20, Math.round(config.risk.maxDailyLoss * 0.75)), cooldownCount: Math.min(6, config.risk.cooldownCount + 1) });
            pushLog({ level: "info", channel: "risk", message: `Caps tightened from the risk drawer (daily loss ${usd(Math.round(config.risk.maxDailyLoss * 0.75))})` });
            close();
          }}
        />
      );

    case "completeness":
      return (
        <CompletenessDialog
          config={config}
          onClose={close}
          goStep={goStep}
          onRunBacktest={() => setOverlay({ kind: "backtest" })}
        />
      );

    case "projection":
      return (
        <ProjectionDialog
          config={config}
          onClose={close}
          onApplyCaps={() => {
            patchRisk({ maxDailyLoss: Math.max(20, Math.round(config.risk.maxDailyLoss * 0.8)), maxDailyTrades: Math.min(config.risk.maxDailyTrades, 320) });
            pushLog({ level: "info", channel: "risk", message: "Conservative projection caps applied (daily loss −20%, trade cap 320)" });
            close();
          }}
        />
      );

    case "leave":
      return <LeaveDialog dirty={Math.max(1, diffConfigs(baseline, config).length)} onClose={close} onLeave={onLeave} />;

    case "help":
      return <HelpDialog onClose={close} />;

    case "log":
      return <LogDrawer lines={logLines} onClose={close} paused={logPaused} onTogglePause={() => setLogPaused((p) => !p)} />;

    default:
      return null;
  }
}

export const CREATOR_STATS = {
  strategies: BOT_STRATEGY_TEMPLATES.length,
  marketplace: MARKETPLACE_STRATEGIES.length,
  parameterSets: STRATEGY_PARAMETER_SETS.length,
  versions: CONFIG_VERSIONS.length,
  logLines: CREATOR_LOG_LINES.length,
  slots: ENGINE_SLOTS.length,
};
