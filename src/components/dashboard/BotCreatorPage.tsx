/* =============================================================================
   D-5 · Bot Creator / Config  (/dashboard/bots/new · /dashboard/bots/:id/config)
   Blueprint: tradeMO.md §5 PAGE D-5.

   Four-step configurator (Basic → Strategy → Parameters & risk → Review) with the
   blueprint's advanced features wired to the data layer:
     #1 AI strategy assistant (3-step modal, streaming response)
     #2 Strategy marketplace import (preview drawer + 3-step import wizard)
     #3 Live backtest preview (progress + skip + equity curve + what-if slider)
     #4 Parameter optimizer (grid search streaming the top 5)
     #5 Monte-Carlo risk simulator (1,000 / 5,000 sequences)
     #6 Strategy templates with variables (parameter sets)
     #7 Draft auto-save & resume (localStorage-shaped cloud + local drafts)
   ============================================================================= */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  FlaskConical,
  Gauge,
  GaugeCircle,
  Layers,
  Link2,
  Pause,
  Pencil,
  Rocket,
  ScrollText,
  Share2,
  Shield,
  Target,
  Trash2,
  TrendingUp,
  Upload,
  Wand2,
} from "lucide-react";
import { AppShell, useDashboardAccount } from "../shell/AppShell";
import {
  Alert,
  Chip,
  Dialog,
  Dropdown,
  EmptyState,
  Field,
  FilterChips,
  Meter,
  MiniTabs,
  Pagination,
  Progress,
  Reveal,
  SearchInput,
  StatCard,
  Stepper,
  Tabs,
  Toggle,
  useInterval,
  useToast,
} from "../ui/primitives";
import { DataTable, useDataTable } from "../ui/data-table";
import { LineChart } from "../ui/charts";
import { useLiveSeries, useTicks, type LiveQuote } from "../../lib/live";
import {
  CONTRACT_TYPE_MAP,
  DURATION_UNITS,
  MARKET_SYMBOLS,
  QUICK_STAKES,
  SYMBOL_MAP,
  fmtDur,
  fmtPrice,
  payoutFor,
  pct,
  pnl,
  usd,
} from "../../data/market";
import {
  BOT_CONFIG_AUDIT,
  BOT_DRAFTS,
  BOTS,
  BOT_STRATEGY_TEMPLATES,
  CONFIG_VERSIONS,
  CREATOR_LOG_LINES,
  DERIV_ACCOUNTS,
  ENGINE_SLOTS,
  MARKETPLACE_STRATEGIES,
  SCRIPT_LINT_ISSUES,
  STRATEGY_PARAMETER_SETS,
  assessCompleteness,
  assessRisk,
  configFromBot,
  defaultBotConfig,
  diffConfigs,
  exportableConfig,
  haltedSymbolOf,
  projectMonthly,
  runBacktestSim,
  type Bot,
  type BotConfigDraft,
  type BotDraft,
  type ConfigAuditEntry,
  type CreatorLogLine,
  type DerivAccount,
  type MarketplaceStrategy,
  type RiskAssessment,
  type SimBacktest,
  type StrategyParameterSet,
} from "../../data/trading";
import { BotCreatorOverlays, CREATOR_STATS, strategyIcon, type CreatorOverlay, type DeployReceipt } from "./BotCreatorOverlays";
import "../../styles/pages/bot-creator.scss";

const STEPS = [
  { id: "basic", label: "Basic info" },
  { id: "strategy", label: "Strategy" },
  { id: "params", label: "Parameters & risk" },
  { id: "review", label: "Review & start" },
];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TAG_SUGGESTIONS = ["recovery", "synthetics", "forex", "digits", "scalp", "swing", "paper-test", "capped"];

// ------------------------------------------------------------------ helpers
function templateOf(config: BotConfigDraft) {
  return BOT_STRATEGY_TEMPLATES.find((t) => t.id === config.strategyId) ?? BOT_STRATEGY_TEMPLATES[0];
}

function strategyKindOf(id: string): Bot["strategy"] {
  const map: Record<string, Bot["strategy"]> = {
    st_martingale: "martingale",
    st_fibonacci: "martingale",
    st_dca: "dca",
    st_fixed: "fixed",
    st_oscar: "fixed",
    st_anti_martingale: "swing",
    st_custom: "digit",
    st_ai_adaptive: "scalping",
  };
  return map[id] ?? "fixed";
}

/** Stake ladder visualisation for the recovery strategies. */
function ladderRows(config: BotConfigDraft) {
  const multiplier = Number(config.strategyParams.multiplier ?? 1);
  const steps = Math.max(1, Number(config.strategyParams.maxSteps ?? 4));
  const rows: { step: number; stake: number; breach: boolean; over: boolean }[] = [];
  let stake = config.stake;
  for (let i = 1; i <= steps; i++) {
    rows.push({ step: i, stake: Math.round(stake * 100) / 100, breach: stake > config.maxStake * 0.66 && stake <= config.maxStake, over: stake > config.maxStake });
    stake *= Math.max(1, multiplier);
  }
  return rows;
}

/** Validation per step — returns field → message. */
function validateStep(step: number, config: BotConfigDraft, lintClean: string[]): Record<string, string> {
  const errors: Record<string, string> = {};
  const symbol = SYMBOL_MAP[config.symbol];
  const contract = CONTRACT_TYPE_MAP[config.contractType];
  const template = templateOf(config);
  if (step === 0) {
    if (config.name.trim().length < 4) errors.name = "Give the bot at least 4 characters so the fleet list stays readable.";
    if (!symbol) errors.symbol = "Pick a symbol from the Deriv catalog.";
    else if (haltedSymbolOf(config.symbol)) errors.symbol = `${config.symbol} is halted — choose a similar symbol to continue.`;
    if (!config.loginId) errors.loginId = "Select the Deriv account that funds the bot.";
  }
  if (step === 1) {
    if (!template) errors.strategyId = "Choose a strategy or a parameter set.";
    if (config.strategyId === "st_custom" && !config.scriptId) errors.scriptId = "Custom strategies need a linted script from the library.";
    if (config.scriptId) {
      const issue = SCRIPT_LINT_ISSUES.find((i) => i.scriptId === config.scriptId);
      if (issue && !lintClean.includes(issue.scriptId)) errors.scriptId = `Lint blocks ${issue.scriptName}: ${issue.message}`;
    }
  }
  if (step === 2) {
    if (!contract) errors.contractType = "Pick a contract type.";
    if (symbol && config.stake < symbol.minStake) errors.stake = `Minimum stake on ${config.symbol} is ${usd(symbol.minStake)}.`;
    if (config.stake <= 0) errors.stake = "Stake must be greater than zero.";
    if (config.maxStake < config.stake) errors.maxStake = "Max stake cannot sit below the initial stake.";
    if (contract && config.duration < contract.minDuration) errors.duration = `${contract.label} needs at least ${contract.minDuration} ${contract.units[0]}.`;
    if (contract && config.duration > contract.maxDuration) errors.duration = `${contract.label} allows at most ${contract.maxDuration} ${contract.units[0]}.`;
    if (contract && !contract.units.includes(config.durationUnit)) errors.durationUnit = `${contract.label} trades in ${contract.units.join(" / ")}.`;
    if (config.takeProfit <= 0) errors.takeProfit = "Set a take-profit so the bot knows when to stop.";
    if (config.stopLoss <= 0) errors.stopLoss = "A stop-loss is mandatory before arming.";
    if (config.stopLoss > config.risk.maxDailyLoss) errors.stopLoss = "Stop-loss cannot exceed the daily loss cap.";
    if (config.risk.maxDailyTrades < 1) errors.maxDailyTrades = "At least one contract per day.";
    template.params.forEach((p) => {
      if (p.kind !== "number") return;
      const v = Number(config.strategyParams[p.key]);
      if (Number.isNaN(v)) errors[`param_${p.key}`] = `${p.label} must be a number.`;
      else if (p.min !== undefined && v < p.min) errors[`param_${p.key}`] = `${p.label} minimum is ${p.min}${p.suffix ?? ""}.`;
      else if (p.max !== undefined && v > p.max) errors[`param_${p.key}`] = `${p.label} maximum is ${p.max}${p.suffix ?? ""}.`;
    });
  }
  return errors;
}

// =============================================================================
// STEP 1 — BASIC INFO
// =============================================================================
interface StepProps {
  config: BotConfigDraft;
  errors: Record<string, string>;
  patch: (p: Partial<BotConfigDraft>) => void;
  patchRisk: (p: Partial<BotConfigDraft["risk"]>) => void;
  patchParams: (p: Record<string, number | string>) => void;
  setOverlay: (o: CreatorOverlay) => void;
  account: DerivAccount;
  mode: "create" | "config";
  backtest: SimBacktest | null;
  backtestSkipped: boolean;
  lintClean: string[];
  feedDown: boolean;
  goStep: (n: number) => void;
  risk: RiskAssessment;
  quotes: Record<string, LiveQuote>;
  spark: number[];
  onBrowseMarketplace: () => void;
}

function StepBasic({ config, errors, patch, setOverlay, account, feedDown }: StepProps) {
  const [tagDraft, setTagDraft] = useState("");
  const symbol = SYMBOL_MAP[config.symbol];
  const halted = haltedSymbolOf(config.symbol);
  const markets = useMemo(() => Array.from(new Set(MARKET_SYMBOLS.map((s) => s.market))), []);
  const symbolCount = MARKET_SYMBOLS.filter((s) => config.market === "all" || s.market === config.market).length;
  const accountOptions = DERIV_ACCOUNTS;
  const addTag = (value: string) => {
    const tag = value.trim().toLowerCase().replace(/\s+/g, "-");
    if (!tag || config.tags.includes(tag) || config.tags.length >= 6) return;
    patch({ tags: [...config.tags, tag] });
    setTagDraft("");
  };
  return (
    <div className="d-grid gap-4">
      <div className="row g-3">
        <div className="col-12 col-lg-7">
          <Field label="Bot name" required error={errors.name} help="Shown on the fleet board, the audit trail and every alert it raises.">
            <input
              className={`dx-input ${errors.name ? "is-invalid" : ""}`}
              data-step-focus
              value={config.name}
              placeholder="My Martingale Bot"
              onChange={(e) => patch({ name: e.target.value })}
            />
          </Field>
        </div>
        <div className="col-12 col-lg-5">
          <Field label="Tags" help="Up to 6 · filtered on the Bot management page.">
            <div className="dx-input-group">
              <input
                className="dx-input"
                value={tagDraft}
                placeholder="recovery"
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag(tagDraft);
                  }
                }}
              />
              <button type="button" className="dx-btn" onClick={() => addTag(tagDraft)} disabled={!tagDraft.trim()}>Add</button>
            </div>
          </Field>
        </div>
        <div className="col-12">
          <Field label="Description" help="Optional — what edge is this bot supposed to exploit?">
            <textarea className="dx-textarea" rows={2} value={config.description} onChange={(e) => patch({ description: e.target.value })} />
          </Field>
        </div>
        <div className="col-12">
          <div className="d-flex flex-wrap gap-1">
            {TAG_SUGGESTIONS.map((t) => (
              <button key={t} type="button" className={`dx-filter-chip ${config.tags.includes(t) ? "is-active" : ""}`} aria-pressed={config.tags.includes(t)} onClick={() => addTag(t)}>
                {t}
              </button>
            ))}
            {config.tags.filter((t) => !TAG_SUGGESTIONS.includes(t)).map((t) => (
              <button key={t} type="button" className="dx-filter-chip is-active" aria-pressed onClick={() => patch({ tags: config.tags.filter((x) => x !== t) })}>
                {t} ×
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-5">
          <Field label="Market" help="Deriv groups its catalog into synthetics, forex, crypto, metals and indices.">
            <select className="dx-select" value={config.market} onChange={(e) => patch({ market: e.target.value })}>
              <option value="all">All markets</option>
              {markets.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="col-12 col-lg-7">
          <span className="dx-label d-block">Symbol <span className="dx-req">*</span></span>
          <div className="d-flex flex-wrap gap-2">
            <button type="button" className="dx-btn" onClick={() => setOverlay({ kind: "symbol-picker" })}>
              <Layers size={13} /> Browse {symbolCount} symbols
            </button>
            <button type="button" className="dx-btn dx-btn-ghost" onClick={() => setOverlay({ kind: "market-preview", id: MARKETPLACE_STRATEGIES[1].id })}>
              <TrendingUp size={13} /> Popular on this market
            </button>
          </div>
          {errors.symbol ? <span className="dx-error">{errors.symbol}</span> : null}
        </div>
      </div>

      {symbol ? (
        <div className="row g-3 align-items-stretch">
          <div className="col-12 col-md-4">
            <div className="dx-symbol-quote">
              <span className="dx-kpi-label">{symbol.name}</span>
              <span className="dx-symbol-quote-value font-display">{fmtPrice(symbol.basePrice, symbol.pipSize)}</span>
              <span className={`dx-symbol-quote-meta font-display ${symbol.changePct >= 0 ? "dx-up" : "dx-down"}`}>
                {symbol.changePct >= 0 ? "+" : ""}{symbol.changePct}% today · {symbol.short}
              </span>
            </div>
          </div>
          <div className="col-6 col-md-2">
            <div className="dx-card-inset h-100">
              <span className="dx-kpi-label">Payout</span>
              <div className="dx-card-inset-value font-display">{pct(symbol.payoutPct, 1)}</div>
            </div>
          </div>
          <div className="col-6 col-md-2">
            <div className="dx-card-inset h-100">
              <span className="dx-kpi-label">Min stake</span>
              <div className="dx-card-inset-value font-display">{usd(symbol.minStake)}</div>
            </div>
          </div>
          <div className="col-6 col-md-2">
            <div className="dx-card-inset h-100">
              <span className="dx-kpi-label">Max stake</span>
              <div className="dx-card-inset-value font-display">{usd(symbol.maxStake, 0)}</div>
            </div>
          </div>
          <div className="col-6 col-md-2">
            <div className="dx-card-inset h-100">
              <span className="dx-kpi-label">Contracts</span>
              <div className="dx-card-inset-value font-display">{symbol.contractTypes.length}</div>
            </div>
          </div>
        </div>
      ) : null}

      {halted ? (
        <Alert tone="warn" title={`Symbol unavailable — ${halted.reason}`}>
          {halted.impact} The feed reopens in about {halted.untilMin} minutes.{" "}
          <button type="button" className="dx-btn dx-btn-sm dx-btn-link" onClick={() => setOverlay({ kind: "halted", code: halted.code })}>
            Choose a similar symbol
          </button>
        </Alert>
      ) : null}

      <div className="row g-3">
        <div className="col-12 col-lg-7">
          <Field label="Funding account" required error={errors.loginId} help="Real (CR/MX) or virtual (VRTC) — the engine routes every proposal to this login ID.">
            <select className={`dx-select font-display ${errors.loginId ? "is-invalid" : ""}`} value={config.loginId} onChange={(e) => patch({ loginId: e.target.value })}>
              {accountOptions.map((a) => (
                <option key={a.loginId} value={a.loginId}>
                  {a.loginId} — {a.label} · {a.type} · {usd(a.balance)}
                </option>
              ))}
            </select>
          </Field>
          <div className="d-flex flex-wrap align-items-center gap-2 mt-2">
            <Chip tone={account.connected && !feedDown ? "up" : "down"} pulse={account.connected && !feedDown}>
              {feedDown ? "socket dropped" : account.connected ? "connected" : "offline"}
            </Chip>
            <span className="dx-help">balance <span className="font-display">{usd(account.balance)}</span> · equity <span className="font-display">{usd(account.equity)}</span></span>
            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setOverlay({ kind: "reconnect" })}>
              <Link2 size={12} /> Connection check
            </button>
          </div>
        </div>
        <div className="col-12 col-lg-5">
          <span className="dx-label d-block">Execution mode</span>
          <div className="d-grid gap-2">
            <Toggle
              checked={config.paper}
              onChange={(v) => patch({ paper: v })}
              label="Paper trading on the virtual balance"
              hint={config.paper ? "Every guard runs identically — no real money moves." : "Live funds: arming debits real USD from " + config.loginId + "."}
            />
            <div className="dx-card-inset">
              <span className="dx-kpi-label">What the engine does next</span>
              <p className="dx-help mb-0 mt-1">
                Reserves slot {ENGINE_SLOTS.find((s) => s.state === "free")?.index ?? 6}, subscribes to {config.symbol} ticks and submits
                {" "}{CONTRACT_TYPE_MAP[config.contractType]?.label} proposals of {usd(config.stake)} every {fmtDur(config.duration, config.durationUnit)}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// STEP 2 — STRATEGY SELECTION
// =============================================================================
function StepStrategy({ config, errors, patch, setOverlay, lintClean }: StepProps) {
  const selected = templateOf(config);
  const scriptIssue = config.scriptId ? SCRIPT_LINT_ISSUES.find((i) => i.scriptId === config.scriptId) : undefined;
  const blocked = scriptIssue && !lintClean.includes(scriptIssue.scriptId);
  const [focusIndex, setFocusIndex] = useState(Math.max(0, BOT_STRATEGY_TEMPLATES.findIndex((t) => t.id === config.strategyId)));
  const gridRef = useRef<HTMLDivElement | null>(null);

  const onGridKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(e.key)) return;
    e.preventDefault();
    const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
    const next = (focusIndex + delta + BOT_STRATEGY_TEMPLATES.length) % BOT_STRATEGY_TEMPLATES.length;
    setFocusIndex(next);
    const node = gridRef.current?.querySelectorAll<HTMLButtonElement>("[data-strategy-card]")[next];
    node?.focus();
  };

  const choose = (id: string) => {
    const t = BOT_STRATEGY_TEMPLATES.find((s) => s.id === id);
    if (!t) return;
    patch({ strategyId: t.id, strategyParams: { ...t.defaultParams } });
  };

  return (
    <div className="d-grid gap-4">
      <div className="d-flex flex-wrap align-items-center gap-2">
        <span className="dx-eyebrow mb-0">Choose a strategy</span>
        <span className="dx-help">Arrow keys move between cards · Enter selects · “Details” opens the dry run.</span>
        <button type="button" className="dx-btn dx-btn-sm ms-auto" onClick={() => setOverlay({ kind: "ai" })}>
          <Wand2 size={12} /> Describe it to the AI assistant
        </button>
      </div>

      <div ref={gridRef} className="row row-cols-1 row-cols-sm-2 row-cols-xl-4 g-3" role="radiogroup" aria-label="Strategy" onKeyDown={onGridKey}>
        {BOT_STRATEGY_TEMPLATES.map((t, i) => {
          const isSelected = t.id === config.strategyId;
          return (
            <div className="col" key={t.id}>
              <button
                type="button"
                data-strategy-card
                role="radio"
                aria-checked={isSelected}
                tabIndex={i === focusIndex ? 0 : -1}
                className={`dx-strategy-card ${isSelected ? "is-selected" : ""}`}
              data-step-focus={i === 0 ? true : undefined}
                onClick={() => { choose(t.id); setFocusIndex(i); }}
                onFocus={() => setFocusIndex(i)}
              >
                <span className="d-flex align-items-center gap-2">
                  <span className="dx-strategy-icon">{strategyIcon(t.icon, 16)}</span>
                  <span className="dx-strategy-name">{t.name}</span>
                </span>
                <span className="dx-strategy-tagline">{t.tagline}</span>
                <span className="dx-strategy-foot">
                  <Chip tone={t.riskLevel === "high" ? "down" : t.riskLevel === "medium" ? "warn" : "up"}>{t.riskLevel}</Chip>
                  <span className="dx-help font-display">{pct(t.historicalWinRate, 0)} hist.</span>
                </span>
              </button>
              <div className="d-flex gap-2 mt-2">
                <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "strategy-detail", id: t.id })}>
                  <FlaskConical size={12} /> Details
                </button>
                {t.id === "st_ai_adaptive" ? (
                  <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setOverlay({ kind: "ai" })}>
                    <Wand2 size={12} /> Brief the model
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {errors.strategyId ? <span className="dx-error">{errors.strategyId}</span> : null}

      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <div className="dx-card dx-card-pad h-100">
            <div className="dx-card-head">
              <div>
                <h3 className="dx-card-title">{selected.name}</h3>
                <p className="dx-card-sub">{selected.tagline}</p>
              </div>
              <Chip tone={selected.category === "ai" ? "accent" : "info"}>{selected.category}</Chip>
            </div>
            <p className="dx-help">{selected.description}</p>
            <ul className="dx-list">
              {selected.rules.map((r) => (
                <li key={r} className="dx-list-row" style={{ fontSize: "0.84rem" }}>{r}</li>
              ))}
            </ul>
            <dl className="dx-kv mt-2">
              <dt>Typical drawdown</dt>
              <dd className="font-display dx-down">{usd(selected.typicalDrawdown)}</dd>
              <dt>Recovery per loss</dt>
              <dd className="font-display">{selected.recoveryPerLoss}×</dd>
              <dt>Markets</dt>
              <dd className="font-display">{selected.markets.join(", ")}</dd>
            </dl>
            <button type="button" className="dx-btn dx-btn-sm mt-2" onClick={() => setOverlay({ kind: "param-set" })}>
              <Download size={12} /> Load a saved parameter set
            </button>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="dx-card dx-card-pad h-100">
            <div className="dx-card-head">
              <div>
                <h3 className="dx-card-title">Existing script</h3>
                <p className="dx-card-sub">Custom strategies run inside the sandboxed JS engine</p>
              </div>
              <Chip tone={config.scriptId ? "up" : "muted"}>{config.scriptId ?? "none attached"}</Chip>
            </div>
            <p className="dx-help">
              Attach one of your linted scripts, or start from a template in the library. A lint error blocks review until it is fixed or you swap scripts.
            </p>
            <div className="d-flex flex-wrap gap-2">
              <button type="button" className="dx-btn" onClick={() => setOverlay({ kind: "scripts" })}>
                <ScrollText size={13} /> Open script library
              </button>
              <button type="button" className="dx-btn dx-btn-ghost" onClick={onBrowseMarketplaceFor(setOverlay)}>
                <Upload size={13} /> Import from marketplace
              </button>
            </div>
            {errors.scriptId ? <span className="dx-error d-block mt-2">{errors.scriptId}</span> : null}
            {blocked ? (
              <Alert tone="danger" title={`Lint error on line ${scriptIssue?.line}`}>
                {scriptIssue?.message}{" "}
                <button type="button" className="dx-btn dx-btn-sm dx-btn-link" onClick={() => setOverlay({ kind: "lint", scriptId: scriptIssue!.scriptId })}>
                  Fix it now
                </button>
              </Alert>
            ) : null}
            <div className="dx-card-inset mt-3">
              <span className="dx-kpi-label">Engine note</span>
              <p className="dx-help mb-0 mt-1">{selected.engineNote}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Small helper so the marketplace button opens the preview drawer from step 2. */
function onBrowseMarketplaceFor(setOverlay: (o: CreatorOverlay) => void) {
  return () => setOverlay({ kind: "market-preview", id: MARKETPLACE_STRATEGIES[0].id });
}

// =============================================================================
// STEP 3 — PARAMETERS & RISK MANAGEMENT
// =============================================================================
function StepParamsRisk({ config, errors, patch, patchRisk, patchParams, setOverlay, risk }: StepProps) {
  const symbol = SYMBOL_MAP[config.symbol];
  const contract = CONTRACT_TYPE_MAP[config.contractType];
  const template = templateOf(config);
  const ladder = ladderRows(config);
  const payout = payoutFor(config.stake, symbol?.payoutPct ?? 95);
  const allowedTypes = symbol ? symbol.contractTypes : [];
  return (
    <div className="d-grid gap-4">
      <div className="row g-3">
        <div className="col-12 col-xl-7">
          <div className="dx-card dx-card-pad h-100">
            <div className="dx-card-head">
              <div>
                <h3 className="dx-card-title">Trade parameters</h3>
                <p className="dx-card-sub">Every value is validated against the {contract?.label} rules on {config.symbol}</p>
              </div>
              <Chip tone="info">{symbol?.short}</Chip>
            </div>
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <Field label="Contract type" required error={errors.contractType} help={contract ? contract.blurb : "Pick a symbol first."}>
                  <select
                    className={`dx-select ${errors.contractType ? "is-invalid" : ""}`}
                    data-step-focus
                    value={config.contractType}
                    onChange={(e) => {
                      const next = e.target.value as BotConfigDraft["contractType"];
                      const nextContract = CONTRACT_TYPE_MAP[next];
                      patch({
                        contractType: next,
                        durationUnit: nextContract?.units.includes(config.durationUnit) ? config.durationUnit : nextContract?.units[0] ?? "ticks",
                      });
                    }}
                  >
                    {allowedTypes.map((id) => (
                      <option key={id} value={id}>{CONTRACT_TYPE_MAP[id]?.label}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="col-12 col-md-6">
                <Field label="Duration" required error={errors.duration ?? errors.durationUnit} help={contract ? `${contract.label}: ${contract.minDuration}–${contract.maxDuration} ${contract.units.join("/")}` : undefined}>
                  <div className="dx-input-group">
                    <input
                      className={`dx-input dx-input-num font-display ${errors.duration ? "is-invalid" : ""}`}
                      type="number"
                      min={contract?.minDuration ?? 1}
                      max={contract?.maxDuration ?? 365}
                      value={config.duration}
                      onChange={(e) => patch({ duration: Number(e.target.value) })}
                    />
                    <select className="dx-select" aria-label="Duration unit" value={config.durationUnit} onChange={(e) => patch({ durationUnit: e.target.value as BotConfigDraft["durationUnit"] })}>
                      {(contract?.units ?? ["ticks"]).map((u) => (
                        <option key={u} value={u}>{DURATION_UNITS.find((d) => d.id === u)?.label}</option>
                      ))}
                    </select>
                  </div>
                </Field>
              </div>
              <div className="col-12 col-md-6">
                <Field label="Initial stake" required error={errors.stake} help={`Deriv minimum ${usd(symbol?.minStake ?? 0.35)} · payout at this stake ${usd(payout)}`}>
                  <input
                    className={`dx-input dx-input-num font-display ${errors.stake ? "is-invalid" : ""}`}
                    type="number"
                    min={symbol?.minStake ?? 0.35}
                    step={0.05}
                    value={config.stake}
                    onChange={(e) => patch({ stake: Number(e.target.value) })}
                  />
                </Field>
                <div className="dx-quick-btns mt-2">
                  {QUICK_STAKES.slice(0, 6).map((s) => (
                    <button key={s} type="button" className={`dx-filter-chip ${config.stake === s ? "is-active" : ""}`} aria-pressed={config.stake === s} onClick={() => patch({ stake: s })}>
                      {usd(s)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-12 col-md-6">
                <Field label="Max stake" required error={errors.maxStake} help="Hard ceiling per leg — the ladder clamps here instead of breaching.">
                  <input
                    className={`dx-input dx-input-num font-display ${errors.maxStake ? "is-invalid" : ""}`}
                    type="number"
                    min={config.stake}
                    step={5}
                    value={config.maxStake}
                    onChange={(e) => patch({ maxStake: Number(e.target.value) })}
                  />
                </Field>
              </div>
              <div className="col-6 col-md-4">
                <Field label="Take profit" required error={errors.takeProfit}>
                  <input className={`dx-input dx-input-num font-display ${errors.takeProfit ? "is-invalid" : ""}`} type="number" min={1} value={config.takeProfit} onChange={(e) => patch({ takeProfit: Number(e.target.value) })} />
                </Field>
              </div>
              <div className="col-6 col-md-4">
                <Field label="Stop loss" required error={errors.stopLoss}>
                  <input className={`dx-input dx-input-num font-display ${errors.stopLoss ? "is-invalid" : ""}`} type="number" min={1} value={config.stopLoss} onChange={(e) => patch({ stopLoss: Number(e.target.value) })} />
                </Field>
              </div>
              <div className="col-12 col-md-4">
                <Field label="Max concurrent" help="Contracts live at the same time on this account.">
                  <input className="dx-input dx-input-num font-display" type="number" min={1} max={5} value={config.maxConcurrent} onChange={(e) => patch({ maxConcurrent: Number(e.target.value) })} />
                </Field>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-5">
          <div className="dx-card dx-card-pad h-100">
            <div className="dx-card-head">
              <div>
                <h3 className="dx-card-title">Recovery ladder</h3>
                <p className="dx-card-sub">{template.name} · {config.maxStake ? `clamped at ${usd(config.maxStake)}` : "no cap"}</p>
              </div>
              <Chip tone={risk.band === "high" ? "down" : risk.band === "medium" ? "warn" : "up"}>{risk.band}</Chip>
            </div>
            <div className="dx-ladder">
              {ladder.map((row) => (
                <div key={row.step} className={`dx-ladder-row ${row.over ? "is-over" : row.breach ? "is-breach" : ""}`}>
                  <span className="dx-help font-display">step {row.step}</span>
                  <span className="dx-ladder-bar">
                    <span style={{ width: `${Math.min(100, (row.stake / Math.max(config.maxStake, row.stake)) * 100)}%` }} />
                  </span>
                  <span className="dx-ladder-value font-display">{usd(row.stake)}</span>
                </div>
              ))}
            </div>
            <dl className="dx-kv mt-3">
              <dt>Worst case per cycle</dt>
              <dd className="font-display dx-down">{usd(risk.worstCasePerCycle)}</dd>
              <dt>Stop-loss coverage</dt>
              <dd className="font-display">{usd(config.stopLoss)}</dd>
              <dt>Payout at initial stake</dt>
              <dd className="font-display dx-up">{usd(payout)}</dd>
            </dl>
            {risk.band === "high" ? (
              <Alert tone="warn" title="This ladder reaches your cap fast">
                A {Number(config.strategyParams.multiplier ?? 2)}× step from {usd(config.stake)} reaches {usd(risk.worstCasePerCycle)} by the configured depth. Tighten the
                multiplier, depth or max stake — the risk drawer shows exactly which guard moves the score.
              </Alert>
            ) : null}
            <button type="button" className="dx-btn dx-btn-sm mt-2" onClick={() => setOverlay({ kind: "risk" })}>
              <Gauge size={12} /> Full risk breakdown
            </button>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-xl-7">
          <div className="dx-card dx-card-pad h-100">
            <div className="dx-card-head">
              <div>
                <h3 className="dx-card-title">{template.name} variables</h3>
                <p className="dx-card-sub">Templates expose variables instead of code — edit them here</p>
              </div>
              <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "template-save" })}>
                <Download size={12} /> Save as template
              </button>
            </div>
            <div className="row g-3">
              {template.params.map((p) => {
                const value = config.strategyParams[p.key];
                const errKey = `param_${p.key}`;
                if (p.kind === "select") {
                  return (
                    <div className="col-12 col-md-6" key={p.key}>
                      <Field label={p.label} error={errors[errKey]} help={p.help}>
                        <select className="dx-select" value={String(value ?? p.options?.[0] ?? "")} onChange={(e) => patchParams({ [p.key]: e.target.value })}>
                          {(p.options ?? []).map((o) => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  );
                }
                if (p.kind === "text") {
                  return (
                    <div className="col-12 col-md-6" key={p.key}>
                      <Field label={p.label} error={errors[errKey]} help={p.help}>
                        <input className="dx-input" value={String(value ?? "")} onChange={(e) => patchParams({ [p.key]: e.target.value })} />
                      </Field>
                    </div>
                  );
                }
                return (
                  <div className="col-12 col-md-6" key={p.key}>
                    <Field label={p.suffix ? `${p.label} (${p.suffix})` : p.label} error={errors[errKey]} help={p.help}>
                      <input
                        className={`dx-input dx-input-num font-display ${errors[errKey] ? "is-invalid" : ""}`}
                        type="number"
                        min={p.min}
                        max={p.max}
                        step={p.step ?? 1}
                        value={Number(value ?? p.min ?? 1)}
                        onChange={(e) => patchParams({ [p.key]: Number(e.target.value) })}
                      />
                    </Field>
                  </div>
                );
              })}
            </div>
            <p className="dx-help mb-0 mt-2">
              Variables are stored with the configuration and versioned on every apply — the audit table below shows who changed what.
            </p>
          </div>
        </div>

        <div className="col-12 col-xl-5">
          <div className="dx-card dx-card-pad h-100">
            <div className="dx-card-head">
              <div>
                <h3 className="dx-card-title">Risk limits</h3>
                <p className="dx-card-sub">Hard guards the engine enforces before every proposal</p>
              </div>
              <Chip tone={risk.band === "high" ? "down" : risk.band === "medium" ? "warn" : "up"}>{risk.score}/100</Chip>
            </div>
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <Field label="Max daily loss" required error={errors.maxDailyLoss ?? errors.stopLoss}>
                  <input className="dx-input dx-input-num font-display" type="number" min={1} value={config.risk.maxDailyLoss} onChange={(e) => patchRisk({ maxDailyLoss: Number(e.target.value) })} />
                </Field>
              </div>
              <div className="col-12 col-md-6">
                <Field label="Max daily trades" required error={errors.maxDailyTrades}>
                  <input className="dx-input dx-input-num font-display" type="number" min={1} value={config.risk.maxDailyTrades} onChange={(e) => patchRisk({ maxDailyTrades: Number(e.target.value) })} />
                </Field>
              </div>
              <div className="col-6 col-md-4">
                <Field label="Cooldown after">
                  <input className="dx-input dx-input-num font-display" type="number" min={1} max={10} value={config.risk.cooldownCount} onChange={(e) => patchRisk({ cooldownCount: Number(e.target.value) })} />
                </Field>
              </div>
              <div className="col-6 col-md-4">
                <Field label="Cooldown (min)">
                  <input className="dx-input dx-input-num font-display" type="number" min={1} max={60} value={config.risk.cooldownMinutes} onChange={(e) => patchRisk({ cooldownMinutes: Number(e.target.value) })} />
                </Field>
              </div>
              <div className="col-12 col-md-4">
                <Field label="Max consecutive losses">
                  <input className="dx-input dx-input-num font-display" type="number" min={1} max={12} value={config.risk.maxConsecutiveLosses} onChange={(e) => patchRisk({ maxConsecutiveLosses: Number(e.target.value) })} />
                </Field>
              </div>
            </div>
            <Meter label="Risk score" value={risk.score} display={`${risk.score}/100 · ${risk.band}`} />
            <div className="d-flex flex-wrap gap-2 mt-3">
              <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "montecarlo" })}>
                <Shield size={12} /> Simulate 1,000 sequences
              </button>
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setOverlay({ kind: "projection" })}>
                <TrendingUp size={12} /> Project the month
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-2">
        <div className="col-6 col-lg-3"><div className="dx-card-inset"><span className="dx-kpi-label">Settlement per win</span><div className="dx-card-inset-value font-display dx-up">{usd(payout)}</div></div></div>
        <div className="col-6 col-lg-3"><div className="dx-card-inset"><span className="dx-kpi-label">Loss per loss</span><div className="dx-card-inset-value font-display dx-down">{usd(config.stake)}</div></div></div>
        <div className="col-6 col-lg-3"><div className="dx-card-inset"><span className="dx-kpi-label">Daily exposure cap</span><div className="dx-card-inset-value font-display">{usd(risk.dailyExposure)}</div></div></div>
        <div className="col-6 col-lg-3"><div className="dx-card-inset"><span className="dx-kpi-label">Ruin estimate</span><div className={`dx-card-inset-value font-display ${risk.mcRuin > 20 ? "dx-down" : "dx-warn-text"}`}>{risk.mcRuin}%</div></div></div>
      </div>
    </div>
  );
}

// =============================================================================
// STEP 4 — REVIEW & START
// =============================================================================
function StepReview({ config, errors, setOverlay, account, mode, backtest, backtestSkipped, goStep, risk, quotes, spark, onBrowseMarketplace }: StepProps) {
  const symbol = SYMBOL_MAP[config.symbol];
  const template = templateOf(config);
  const quote = quotes[config.symbol] ?? { code: config.symbol, quote: symbol?.basePrice ?? 0, prevQuote: symbol?.basePrice ?? 0, dir: "flat" as const, changePct: symbol?.changePct ?? 0 };
  const changed = diffConfigs(account ? config : config, config).length;
  const completeness = assessCompleteness(config);
  const projection = projectMonthly(config);
  const expected = projection.scenarios[1];
  const blockers = Object.keys(errors).length;
  return (
    <div className="d-grid gap-4">
      {mode === "config" ? (
        <Alert tone="info" title={`Editing ${config.name || "this bot"} — ${changed} tracked field group(s) differ from the live revision`}>
          Applying restarts the runtime; the previous values stay in the version history and can be rolled back in one click.
        </Alert>
      ) : null}

      <div className="row g-3">
        <div className="col-12 col-xl-7">
          <div className="dx-card dx-card-pad h-100">
            <div className="dx-card-head">
              <div>
                <h3 className="dx-card-title">{config.name || "Untitled bot"}</h3>
                <p className="dx-card-sub">{symbol?.name} · {template.name} · {CONTRACT_TYPE_MAP[config.contractType]?.label}</p>
              </div>
              <Chip tone={config.paper ? "info" : "warn"}>{config.paper ? "virtual funds" : "real funds"}</Chip>
            </div>
            <dl className="dx-kv">
              <dt>Symbol</dt>
              <dd className="font-display">{config.symbol} · payout {pct(symbol?.payoutPct ?? 95, 1)}</dd>
              <dt>Account</dt>
              <dd className="font-display">{config.loginId}</dd>
              <dt>Contract</dt>
              <dd className="font-display">{CONTRACT_TYPE_MAP[config.contractType]?.label}</dd>
              <dt>Stake → max</dt>
              <dd className="font-display">{usd(config.stake)} → {usd(config.maxStake)}</dd>
              <dt>Duration</dt>
              <dd className="font-display">{fmtDur(config.duration, config.durationUnit)}</dd>
              <dt>Take profit / stop loss</dt>
              <dd className="font-display">{usd(config.takeProfit)} / {usd(config.stopLoss)}</dd>
              <dt>Risk limits</dt>
              <dd className="font-display">{usd(config.risk.maxDailyLoss)} daily · {config.risk.maxDailyTrades} trades</dd>
              <dt>Cooldown</dt>
              <dd className="font-display">{config.risk.cooldownCount} losses → {config.risk.cooldownMinutes} min</dd>
              <dt>Schedule</dt>
              <dd className="font-display">{config.schedule.days.join(" · ")} {config.schedule.from}–{config.schedule.to}</dd>
              <dt>Recovery variables</dt>
              <dd className="font-display">{Object.entries(config.strategyParams).map(([k, v]) => `${k} ${v}`).join(" · ")}</dd>
              <dt>Tags</dt>
              <dd className="font-display">{config.tags.length ? config.tags.join(", ") : "—"}</dd>
            </dl>
            <div className="d-flex flex-wrap gap-2 mt-3">
              <button type="button" className="dx-btn dx-btn-sm" onClick={() => goStep(0)}><Pencil size={12} /> Edit basics</button>
              <button type="button" className="dx-btn dx-btn-sm" onClick={() => goStep(1)}><Layers size={12} /> Change strategy</button>
              <button type="button" className="dx-btn dx-btn-sm" onClick={() => goStep(2)}><Target size={12} /> Tune parameters</button>
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setOverlay({ kind: "export-config" })}><Download size={12} /> Export JSON</button>
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-5">
          <div className="dx-card dx-card-pad h-100">
            <div className="dx-card-head">
              <div>
                <h3 className="dx-card-title">Evidence before arming</h3>
                <p className="dx-card-sub">Backtest, optimizer and Monte-Carlo all run on this exact config</p>
              </div>
              <Chip tone={backtest ? "up" : backtestSkipped ? "warn" : "muted"}>{backtest ? "backtested" : backtestSkipped ? "skipped" : "not run"}</Chip>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <button type="button" className="dx-btn dx-btn-primary" data-step-focus onClick={() => setOverlay({ kind: "backtest" })}>
                <FlaskConical size={13} /> Run 30-day backtest
              </button>
              <button type="button" className="dx-btn" onClick={() => setOverlay({ kind: "backtest-result" })}>View last run</button>
              <button type="button" className="dx-btn dx-btn-ghost" onClick={() => setOverlay({ kind: "optimizer" })}>
                <GaugeCircle size={13} /> Optimize
              </button>
              <button type="button" className="dx-btn dx-btn-ghost" onClick={() => setOverlay({ kind: "montecarlo" })}>
                <Shield size={13} /> Monte-Carlo
              </button>
            </div>

            {backtest ? (
              <>
                <div className="row g-2 mt-3">
                  <div className="col-6"><div className="dx-card-inset"><span className="dx-kpi-label">Win rate</span><div className="dx-card-inset-value font-display">{pct(backtest.metrics.winRate, 1)}</div></div></div>
                  <div className="col-6"><div className="dx-card-inset"><span className="dx-kpi-label">Net P&L</span><div className={`dx-card-inset-value font-display ${backtest.metrics.pnl >= 0 ? "dx-up" : "dx-down"}`}>{pnl(backtest.metrics.pnl)}</div></div></div>
                  <div className="col-6"><div className="dx-card-inset"><span className="dx-kpi-label">Max drawdown</span><div className="dx-card-inset-value font-display dx-down">{usd(backtest.metrics.maxDrawdown)}</div></div></div>
                  <div className="col-6"><div className="dx-card-inset"><span className="dx-kpi-label">Sharpe</span><div className="dx-card-inset-value font-display">{backtest.metrics.sharpe.toFixed(2)}</div></div></div>
                </div>
                <div className="dx-card-inset mt-2">
                  <LineChart data={backtest.equity} height={150} tone={backtest.metrics.pnl >= 0 ? "accent" : "down"} ariaLabel="Backtest equity" yFormat={(v) => `$${v.toFixed(0)}`} />
                </div>
              </>
            ) : (
              <div className="mt-3">
                <Progress value={completeness.pct} />
                <span className="dx-help d-block mt-2">
                  {backtestSkipped
                    ? "You skipped the last run — the engine will still enforce every guard, but nothing has validated this ladder."
                    : `${completeness.pct}% ready. The missing checks are the evidence ones — run a backtest or the optimizer.`}
                </span>
              </div>
            )}

            {backtestSkipped && !backtest ? (
              <Alert tone="warn" title="No backtest evidence">
                Arm anyway only if you already know this ladder on {config.symbol}; the review step keeps the warning on the audit trail.
              </Alert>
            ) : null}
          </div>
        </div>
      </div>

      <div className="dx-live-strip">
        <span className="dx-pulse" aria-hidden="true" />
        <span className="d-flex flex-column">
          <span className="dx-kpi-label">Live {config.symbol}</span>
          <span className="font-display fw-semibold">{fmtPrice(quote.quote, symbol?.pipSize ?? 2)}</span>
        </span>
        <span className={`font-display ${quote.dir === "up" ? "dx-up" : quote.dir === "down" ? "dx-down" : "dx-muted"}`}>
          {quote.dir === "up" ? "▲" : quote.dir === "down" ? "▼" : "■"} {Math.abs(((quote.quote - quote.prevQuote) / Math.max(0.0001, quote.prevQuote)) * 100).toFixed(3)}%
        </span>
        <span className="dx-help font-display ms-auto">24 ticks · seed spark {spark[spark.length - 1]?.toFixed(symbol?.pipSize ?? 2)}</span>
        <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "log" })}>
          <ScrollText size={12} /> Engine log
        </button>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-4">
          <div className="dx-card-inset h-100">
            <span className="dx-kpi-label">Projected month (expected)</span>
            <div className={`dx-card-inset-value font-display ${expected.monthlyPnl >= 0 ? "dx-up" : "dx-down"}`}>{pnl(expected.monthlyPnl)}</div>
            <span className="dx-help">{expected.tradesPerMonth.toLocaleString("en-US")} contracts · worst drawdown {usd(expected.drawdown)}</span>
            <button type="button" className="dx-btn dx-btn-sm mt-2" onClick={() => setOverlay({ kind: "projection" })}>See all scenarios</button>
          </div>
        </div>
        <div className="col-12 col-lg-4">
          <div className="dx-card-inset h-100">
            <span className="dx-kpi-label">Risk score</span>
            <div className="dx-card-inset-value font-display">{risk.score}/100</div>
            <span className="dx-help">{risk.band} band · worst cycle {usd(risk.worstCasePerCycle)}</span>
            <button type="button" className="dx-btn dx-btn-sm mt-2" onClick={() => setOverlay({ kind: "risk" })}>Open breakdown</button>
          </div>
        </div>
        <div className="col-12 col-lg-4">
          <div className="dx-card-inset h-100">
            <span className="dx-kpi-label">Completeness</span>
            <div className="dx-card-inset-value font-display">{completeness.pct}%</div>
            <span className="dx-help">{blockers ? `${blockers} blocking issue(s) in earlier steps` : "no blocking issues"}</span>
            <div className="d-flex gap-2 mt-2">
              <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "completeness" })}>Checklist</button>
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={onBrowseMarketplace}>Marketplace</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// TABLE — recent drafts (advanced feature #7)
// =============================================================================
function DraftsTable({
  drafts,
  selected,
  onToggleSelect,
  onOpen,
  onResume,
  onDuplicate,
  onDelete,
  onCompare,
}: {
  drafts: BotDraft[];
  selected: string[];
  onToggleSelect: (id: string) => void;
  onOpen: (d: BotDraft) => void;
  onResume: (d: BotDraft) => void;
  onDuplicate: (d: BotDraft) => void;
  onDelete: (d: BotDraft) => void;
  onCompare: () => void;
}) {
  const table = useDataTable({
    rows: drafts,
    searchKeys: (d) => [d.name, d.symbol, d.strategy, d.loginId, d.note, ...d.tags],
    sorters: { name: (d) => d.name, completeness: (d) => d.completeness, stake: (d) => d.stake, updated: (d) => -d.updatedMin },
    filterKey: (d) => d.origin,
    filterOptions: [
      { id: "cloud", label: "Cloud autosave" },
      { id: "local", label: "Local only" },
    ],
    initialSort: "updated",
    initialPageSize: 5,
  });
  return (
    <>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
        <SearchInput value={table.query} onChange={table.setQuery} placeholder="Search drafts, symbols, notes…" />
        <FilterChips options={table.filterOptions} value={table.filter} onChange={table.setFilter} allLabel={`All (${drafts.length})`} />
        <span className="ms-auto d-flex align-items-center gap-2">
          <span className="dx-help">{selected.length} selected</span>
          <button type="button" className="dx-btn dx-btn-sm" disabled={selected.length !== 2} onClick={onCompare}>Compare 2 drafts</button>
        </span>
      </div>
      <DataTable
        ariaLabel="Recent bot drafts"
        state={table}
        rowKey={(d) => d.id}
        onRowClick={onOpen}
        emptyState={
          <EmptyState
            title="No drafts match"
            message="Drafts autosave every 30 seconds while you edit — clear the filters to see them all."
            action={<button type="button" className="dx-btn" onClick={table.reset}>Reset filters</button>}
          />
        }
        columns={[
          {
            key: "name",
            header: "Draft",
            cell: (d) => (
              <span className="d-flex align-items-start gap-2">
                <input
                  type="checkbox"
                  className="form-check-input mt-1"
                  checked={selected.includes(d.id)}
                  aria-label={`Select ${d.name}`}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => onToggleSelect(d.id)}
                />
                <span className="d-flex flex-column">
                  <span className="fw-semibold">{d.name}</span>
                  <span className="dx-help">{d.note}</span>
                </span>
              </span>
            ),
            sortValue: (d) => d.name,
          },
          { header: "Symbol", cell: (d) => <span className="font-display">{d.symbol}</span> },
          { header: "Strategy", cell: (d) => <Chip tone="muted">{d.strategy}</Chip>, hideOnMobile: true },
          { key: "stake", header: "Stake", align: "end", cell: (d) => <span className="font-display">{usd(d.stake)}</span>, sortValue: (d) => d.stake },
          { header: "Step", align: "end", cell: (d) => <span className="font-display">{d.step + 1}/4</span>, hideOnMobile: true },
          { header: "Origin", cell: (d) => <Chip tone={d.origin === "cloud" ? "info" : "warn"}>{d.origin}</Chip>, hideOnMobile: true },
          { key: "completeness", header: "Ready", align: "end", cell: (d) => <span className="font-display">{d.completeness}%</span>, sortValue: (d) => d.completeness },
          { key: "updated", header: "Saved", align: "end", cell: (d) => <span className="dx-help font-display">{d.updatedMin === 0 ? "just now" : `${d.updatedMin}m ago`}</span>, sortValue: (d) => -d.updatedMin },
          {
            header: "Actions",
            className: "dx-td-actions",
            cell: (d) => (
              <div className="d-flex justify-content-end" onClick={(e) => e.stopPropagation()}>
                <Dropdown
                  label={`Actions for ${d.name}`}
                  trigger={<span className="dx-btn dx-btn-sm">Manage</span>}
                  items={[
                    { id: "open", label: "Open details", onSelect: () => onOpen(d) },
                    { id: "resume", label: "Resume in wizard", onSelect: () => onResume(d) },
                    { id: "dup", label: "Duplicate", onSelect: () => onDuplicate(d) },
                    { type: "divider" },
                    { id: "del", label: "Delete draft", danger: true, onSelect: () => onDelete(d) },
                  ]}
                />
              </div>
            ),
          },
        ]}
      />
    </>
  );
}

// =============================================================================
// TABLE — strategy marketplace (advanced feature #2)
// =============================================================================
function MarketplaceTable({ onPreview, onImport }: { onPreview: (id: string) => void; onImport: (id: string) => void }) {
  const table = useDataTable({
    rows: MARKETPLACE_STRATEGIES,
    searchKeys: (s) => [s.name, s.author, s.symbol, s.description, ...s.tags],
    sorters: { name: (s) => s.name, rating: (s) => s.rating, imports: (s) => s.imports, winRate: (s) => s.winRate, price: (s) => s.price },
    filterKey: (s) => s.risk,
    filterOptions: [
      { id: "low", label: "Low risk" },
      { id: "medium", label: "Medium risk" },
      { id: "high", label: "High risk" },
    ],
    initialSort: "imports",
    initialPageSize: 5,
  });
  return (
    <>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
        <SearchInput value={table.query} onChange={table.setQuery} placeholder="Search strategy, author, symbol…" />
        <FilterChips options={table.filterOptions} value={table.filter} onChange={table.setFilter} allLabel={`All (${MARKETPLACE_STRATEGIES.length})`} />
        <span className="dx-help ms-auto">Every listing is configuration-only — nothing runs until you import and arm it.</span>
      </div>
      <DataTable
        ariaLabel="Community strategy marketplace"
        state={table}
        rowKey={(s) => s.id}
        onRowClick={(s) => onPreview(s.id)}
        emptyState={<EmptyState title="No strategies match" message="Try another author, symbol or risk band." action={<button type="button" className="dx-btn" onClick={table.reset}>Reset filters</button>} />}
        columns={[
          { key: "name", header: "Strategy", cell: (s) => (
            <span className="d-flex flex-column">
              <span className="fw-semibold">{s.name}</span>
              <span className="dx-help">{s.author} · {s.authorTier} · v{s.version}</span>
            </span>
          ), sortValue: (s) => s.name },
          { header: "Symbol", cell: (s) => <span className="font-display">{s.symbol}</span> },
          { header: "Risk", cell: (s) => <Chip tone={s.risk === "high" ? "down" : s.risk === "medium" ? "warn" : "up"}>{s.risk}</Chip>, hideOnMobile: true },
          { key: "winRate", header: "Win rate", align: "end", cell: (s) => <span className="font-display">{pct(s.winRate, 1)}</span>, sortValue: (s) => s.winRate },
          { header: "Max DD", align: "end", cell: (s) => <span className="font-display dx-down">{usd(s.maxDrawdown)}</span>, hideOnMobile: true },
          { key: "rating", header: "Rating", align: "end", cell: (s) => <span className="font-display">★ {s.rating.toFixed(1)}</span>, sortValue: (s) => s.rating },
          { key: "imports", header: "Imports", align: "end", cell: (s) => <span className="font-display">{s.imports.toLocaleString("en-US")}</span>, sortValue: (s) => s.imports, hideOnMobile: true },
          { key: "price", header: "Price", align: "end", cell: (s) => <span className="font-display">{s.price === 0 ? "free" : usd(s.price, 0)}</span>, sortValue: (s) => s.price },
          {
            header: "Actions",
            className: "dx-td-actions",
            cell: (s) => (
              <div className="d-flex gap-1 justify-content-end" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="dx-btn dx-btn-sm" onClick={() => onPreview(s.id)}>Preview</button>
                <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => onImport(s.id)}>Import</button>
              </div>
            ),
          },
        ]}
      />
    </>
  );
}

// =============================================================================
// TABLE — saved parameter sets (advanced feature #6)
// =============================================================================
function ParameterSetsTable({
  sets,
  onApply,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  sets: StrategyParameterSet[];
  onApply: (id: string) => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const table = useDataTable({
    rows: sets,
    searchKeys: (s) => [s.name, s.symbol, s.strategy, s.owner],
    sorters: { name: (s) => s.name, stake: (s) => s.stake, winRate: (s) => s.winRate, pnl: (s) => s.pnl, uses: (s) => s.uses },
    filterKey: (s) => s.visibility,
    filterOptions: [
      { id: "private", label: "Private" },
      { id: "team", label: "Team" },
      { id: "public", label: "Public" },
    ],
    initialSort: "uses",
    initialPageSize: 5,
  });
  return (
    <>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
        <SearchInput value={table.query} onChange={table.setQuery} placeholder="Search set, symbol or owner…" />
        <FilterChips options={table.filterOptions} value={table.filter} onChange={table.setFilter} allLabel={`All (${sets.length})`} />
        <span className="dx-help ms-auto">Parameter sets are numbers only — the strategy script stays untouched.</span>
      </div>
      <DataTable
        ariaLabel="Saved parameter sets"
        state={table}
        rowKey={(s) => s.id}
        emptyState={<EmptyState title="No parameter sets" message="Save one from step 3 (“Save as template”) to reuse these numbers on any symbol." action={<button type="button" className="dx-btn" onClick={table.reset}>Reset filters</button>} />}
        columns={[
          { key: "name", header: "Set", cell: (s) => (
            <span className="d-flex flex-column">
              <span className="fw-semibold">{s.name}</span>
              <span className="dx-help">{s.owner} · {s.visibility} · {s.uses} uses</span>
            </span>
          ), sortValue: (s) => s.name },
          { header: "Symbol", cell: (s) => <span className="font-display">{s.symbol}</span> },
          { key: "stake", header: "Stake", align: "end", cell: (s) => <span className="font-display">{usd(s.stake)}</span>, sortValue: (s) => s.stake },
          { header: "Ladder", align: "end", cell: (s) => <span className="font-display">{s.multiplier}× / {s.maxSteps}</span>, hideOnMobile: true },
          { header: "Duration", align: "end", cell: (s) => <span className="font-display">{fmtDur(s.duration, s.durationUnit)}</span>, hideOnMobile: true },
          { key: "winRate", header: "Win rate", align: "end", cell: (s) => <span className="font-display">{pct(s.winRate, 1)}</span>, sortValue: (s) => s.winRate },
          { key: "pnl", header: "P&L", align: "end", cell: (s) => <span className={`font-display ${s.pnl >= 0 ? "dx-up" : "dx-down"}`}>{pnl(s.pnl)}</span>, sortValue: (s) => s.pnl },
          {
            header: "Actions",
            className: "dx-td-actions",
            cell: (s) => (
              <div className="d-flex justify-content-end">
                <Dropdown
                  label={`Actions for ${s.name}`}
                  trigger={<span className="dx-btn dx-btn-sm">Manage</span>}
                  items={[
                    { id: "apply", label: "Apply to wizard", onSelect: () => onApply(s.id) },
                    { id: "edit", label: "Edit numbers", onSelect: () => onEdit(s.id) },
                    { id: "dup", label: "Duplicate", onSelect: () => onDuplicate(s.id) },
                    { type: "divider" },
                    { id: "del", label: "Delete set", danger: true, onSelect: () => onDelete(s.id) },
                  ]}
                />
              </div>
            ),
          },
        ]}
      />
    </>
  );
}

// =============================================================================
// TABLE — config audit trail
// =============================================================================
function AuditTable({ audit, onOpen }: { audit: ConfigAuditEntry[]; onOpen: (id: string) => void }) {
  const table = useDataTable({
    rows: audit,
    searchKeys: (a) => [a.botName, a.field, a.actor, a.note, a.from, a.to],
    sorters: { at: (a) => -a.atMin, field: (a) => a.field, actor: (a) => a.actor, status: (a) => a.status },
    filterKey: (a) => a.source,
    filterOptions: [
      { id: "wizard", label: "Wizard" },
      { id: "ai-assistant", label: "AI assistant" },
      { id: "optimizer", label: "Optimizer" },
      { id: "marketplace-import", label: "Import" },
      { id: "api", label: "API" },
      { id: "rollback", label: "Rollback" },
    ],
    initialSort: "at",
    initialPageSize: 5,
  });
  return (
    <>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
        <SearchInput value={table.query} onChange={table.setQuery} placeholder="Search field, bot, actor or reason…" />
        <FilterChips options={table.filterOptions} value={table.filter} onChange={table.setFilter} allLabel={`All (${audit.length})`} />
        <span className="dx-help ms-auto">Every change is attributed — wizard, AI assistant, optimizer, marketplace import, API client or rollback.</span>
      </div>
      <DataTable
        ariaLabel="Bot configuration audit trail"
        state={table}
        rowKey={(a) => a.id}
        onRowClick={(a) => onOpen(a.id)}
        emptyState={<EmptyState title="No audit entries" message="Change a parameter, run the optimizer or roll back a revision to populate the trail." action={<button type="button" className="dx-btn" onClick={table.reset}>Reset filters</button>} />}
        columns={[
          { key: "at", header: "When", cell: (a) => <span className="font-display">{a.atMin === 0 ? "just now" : `${a.atMin}m ago`}</span>, sortValue: (a) => -a.atMin },
          { header: "Bot", cell: (a) => <span>{a.botName}<span className="dx-help d-block font-display">{a.actor}</span></span>, hideOnMobile: true },
          { key: "field", header: "Field", cell: (a) => <span className="font-display">{a.field}</span>, sortValue: (a) => a.field },
          { header: "Change", align: "end", cell: (a) => (
            <span className="font-display d-flex flex-column flex-md-row justify-content-md-end gap-1">
              <span className="dx-down">{a.from}</span>
              <span className="dx-help">→</span>
              <span className="dx-up">{a.to}</span>
            </span>
          ) },
          { header: "Source", cell: (a) => <Chip tone="info">{a.source}</Chip>, hideOnMobile: true },
          { key: "status", header: "Status", align: "end", cell: (a) => <Chip tone={a.status === "applied" ? "up" : a.status === "reverted" ? "down" : "warn"}>{a.status}</Chip>, sortValue: (a) => a.status },
          { header: "Risk", align: "end", cell: (a) => <Chip tone={a.riskDelta === "up" ? "down" : a.riskDelta === "down" ? "up" : "muted"}>{a.riskDelta}</Chip>, hideOnMobile: true },
          {
            header: "Detail",
            className: "dx-td-actions",
            cell: (a) => (
              <div className="d-flex justify-content-end">
                <button type="button" className="dx-btn dx-btn-sm" onClick={(e) => { e.stopPropagation(); onOpen(a.id); }}>Open</button>
              </div>
            ),
          },
        ]}
      />
    </>
  );
}

// =============================================================================
// PAGE — state, autosave, shortcuts, wiring
// =============================================================================
const SHORTCUTS: { keys: string; label: string; hint: string }[] = [
  { keys: "⌘ / Ctrl + S", label: "Save draft", hint: "Writes cloud + local autosave immediately." },
  { keys: "⌘ / Ctrl + Enter", label: "Next step", hint: "Validates the current step first." },
  { keys: "Alt + ←", label: "Previous step", hint: "Never loses typed values." },
  { keys: "Alt + B", label: "Run backtest", hint: "Opens the 30-day preview." },
  { keys: "Alt + O", label: "Optimizer", hint: "Grid-searches the top 5 parameter sets." },
  { keys: "Alt + P", label: "Pause autosave", hint: "Freezes the 30-second cloud save." },
];

function BotCreatorInner({ botId }: { botId?: string }) {
  const { account, openSwitcher, openOAuth } = useDashboardAccount();
  const navigate = useNavigate();
  const { push } = useToast();

  const mode: "create" | "config" = botId ? "config" : "create";
  const bot = useMemo(() => (botId ? BOTS.find((b) => b.id === botId) ?? null : null), [botId]);
  const seeded = useMemo(() => (bot ? configFromBot(bot) : defaultBotConfig(account.loginId)), [bot, account.loginId]);

  const [baseline] = useState<BotConfigDraft>(seeded);
  const [config, setConfig] = useState<BotConfigDraft>(seeded);
  const [step, setStep] = useState(0);
  const [overlay, setOverlay] = useState<CreatorOverlay>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validating, setValidating] = useState(false);
  const [blocked, setBlocked] = useState("");
  const [dirty, setDirty] = useState(false);
  const [savedAgo, setSavedAgo] = useState(0);
  const [autosaveOn, setAutosaveOn] = useState(true);
  const [drafts, setDrafts] = useState<BotDraft[]>(BOT_DRAFTS);
  const [paramSets, setParamSets] = useState<StrategyParameterSet[]>(STRATEGY_PARAMETER_SETS);
  const [audit, setAudit] = useState<ConfigAuditEntry[]>(BOT_CONFIG_AUDIT);
  const [logLines, setLogLines] = useState<CreatorLogLine[]>(CREATOR_LOG_LINES);
  const [lintClean, setLintClean] = useState<string[]>([]);
  const [backtest, setBacktest] = useState<SimBacktest | null>(() => (bot ? runBacktestSim(seeded, { seed: 20261013, horizonLabel: "30 days" }) : null));
  const [backtestSkipped, setBacktestSkipped] = useState(false);
  const [receipt, setReceipt] = useState<DeployReceipt | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [railTab, setRailTab] = useState("summary");
  const [lowerTab, setLowerTab] = useState("drafts");
  const [logChannel, setLogChannel] = useState("all");
  const [logPage, setLogPage] = useState(1);
  const [selectedDrafts, setSelectedDrafts] = useState<string[]>([]);
  const guardedNav = useRef(false);

  const symbol = SYMBOL_MAP[config.symbol];
  const template = templateOf(config);
  const halted = haltedSymbolOf(config.symbol);
  const feedDown = Boolean(symbol && !symbol.open);
  const risk = useMemo(() => assessRisk(config), [config]);
  const completeness = useMemo(() => assessCompleteness(config), [config]);
  const projection = useMemo(() => projectMonthly(config), [config]);
  const live = useMemo(() => validateStep(step, config, lintClean), [step, config, lintClean]);
  const changedRows = useMemo(() => diffConfigs(baseline, config), [baseline, config]);

  const codes = useMemo(() => [config.symbol, ...MARKET_SYMBOLS.filter((s) => s.code !== config.symbol).slice(0, 2).map((s) => s.code)], [config.symbol]);
  const quotes = useTicks(codes);
  const spark = useLiveSeries(config.symbol, 28);

  const notify = (tone: "success" | "error" | "info" | "warn", title: string, body?: string) => push({ tone, title, body });
  const pushLog = (line: Omit<CreatorLogLine, "id" | "atMin">) =>
    setLogLines((list) => [{ ...line, id: `lg_local_${list.length + 1}`, atMin: 0 }, ...list.filter((l) => l.atMin !== 0)].slice(0, 60));

  // --- debounced validation (blueprint perf note: 300 ms) -------------------
  useEffect(() => {
    setValidating(true);
    const id = window.setTimeout(() => {
      setErrors(validateStep(step, config, lintClean));
      setValidating(false);
    }, 300);
    return () => window.clearTimeout(id);
  }, [step, config, lintClean]);

  const patch = (p: Partial<BotConfigDraft>) => {
    setConfig((c) => ({ ...c, ...p }));
    setDirty(true);
    setSavedAgo(0);
  };
  const patchRisk = (p: Partial<BotConfigDraft["risk"]>) => patch({ risk: { ...config.risk, ...p } });
  const patchParams = (p: Record<string, number | string>) => patch({ strategyParams: { ...config.strategyParams, ...p } });
  const applyConfig = (next: BotConfigDraft) => {
    setConfig(next);
    setDirty(true);
    setSavedAgo(0);
    pushLog({ level: "info", channel: "config", message: `Draft updated from overlay — ${diffConfigs(config, next).length} field(s) changed` });
  };

  // --- draft autosave every 30 s (§7) --------------------------------------
  const draftId = `${mode}-${config.name || "untitled"}-${config.symbol}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  const buildDraft = (silent: boolean): BotDraft => ({
    id: draftId,
    name: config.name || "Untitled bot",
    symbol: config.symbol,
    strategy: strategyKindOf(config.strategyId),
    stake: config.stake,
    step: step + 1 > 4 ? 4 : step,
    origin: silent ? "cloud" : autosaveOn ? "cloud" : "local",
    completeness: completeness.pct,
    updatedMin: 0,
    loginId: config.loginId,
    note: `${template.name} · ${CONTRACT_TYPE_MAP[config.contractType]?.label} · ${fmtDur(config.duration, config.durationUnit)}`,
    tags: config.tags,
  });

  const saveDraft = (silent: boolean) => {
    const draft = buildDraft(silent);
    setDrafts((list) => [draft, ...list.filter((d) => d.id !== draft.id)].slice(0, 12));
    setDirty(false);
    setSavedAgo(0);
    pushLog({ level: "info", channel: "config", message: `Draft ${draft.id} ${silent ? "autosaved" : "saved"} to ${draft.origin} (step ${draft.step}/4)` });
    if (!silent) notify("success", "Draft saved", `${draft.name} · ${completeness.pct}% ready · resumes at step ${draft.step}/4.`);
  };

  useInterval(() => {
    if (!autosaveOn || !dirty) return;
    saveDraft(true);
  }, 30_000);

  useInterval(() => {
    if (!dirty) setSavedAgo((s) => s + 5);
  }, 5_000);

  const goStep = (n: number) => {
    const next = Math.max(0, Math.min(STEPS.length - 1, n));
    if (next > step) {
      const issues = Object.keys(validateStep(step, config, lintClean));
      if (issues.length) {
        setErrors(validateStep(step, config, lintClean));
        setBlocked(`${STEPS[step].label} has ${issues.length} issue${issues.length > 1 ? "s" : ""} to resolve before moving on.`);
        pushLog({ level: "warn", channel: "config", message: `Blocked step ${step + 1} → ${next + 1}: ${issues.join(", ")}` });
        document.querySelector<HTMLElement>("[data-step-focus]")?.focus();
        return;
      }
    }
    setBlocked("");
    setStep(next);
    window.setTimeout(() => document.querySelector<HTMLElement>("[data-step-focus]")?.focus(), 0);
  };

  const requestLeave = () => {
    if (guardedNav.current) return;
    if (!dirty) {
      navigate({ to: "/dashboard/bots" });
      return;
    }
    setOverlay({ kind: "leave" });
  };

  const onLeave = (choice: "save" | "discard" | "stay") => {
    if (choice === "stay") {
      setOverlay(null);
      return;
    }
    if (choice === "save") saveDraft(true);
    guardedNav.current = true;
    pushLog({ level: choice === "save" ? "info" : "warn", channel: "config", message: choice === "save" ? "Left the builder — draft stored" : "Left the builder — unsaved changes discarded" });
    navigate({ to: "/dashboard/bots" });
  };

  // --- keyboard shortcuts (§ a11y/perf) -----------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveDraft(false);
      } else if (meta && e.key === "Enter") {
        e.preventDefault();
        goStep(step + 1);
      } else if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        goStep(step - 1);
      } else if (e.altKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setOverlay({ kind: "backtest" });
      } else if (e.altKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        setOverlay({ kind: "optimizer" });
      } else if (e.altKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setAutosaveOn((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const upsertDraft = (d: BotDraft) => setDrafts((list) => [d, ...list.filter((x) => x.id !== d.id)].slice(0, 12));
  const removeDraft = (id: string) => {
    setDrafts((list) => list.filter((d) => d.id !== id));
    setSelectedDrafts((sel) => sel.filter((s) => s !== id));
  };
  const upsertParamSet = (s: StrategyParameterSet) => setParamSets((list) => [s, ...list.filter((x) => x.id !== s.id)].slice(0, 12));
  const removeParamSet = (id: string) => setParamSets((list) => list.filter((s) => s.id !== id));
  const onRevertAudit = (id: string) => {
    setAudit((list) => list.map((a) => (a.id === id ? { ...a, status: "reverted" } : a)));
    pushLog({ level: "warn", channel: "risk", message: `Audit entry ${id} reverted by ${account.loginId}` });
  };
  const duplicateDraft = (d: BotDraft) => {
    const copy: BotDraft = { ...d, id: `${d.id}-copy`, name: `${d.name} (copy)`, updatedMin: 0, origin: "local" };
    upsertDraft(copy);
    pushLog({ level: "info", channel: "config", message: `Duplicated draft ${d.id} → ${copy.id}` });
  };
  const openLower = (id: string) => {
    setLowerTab(id);
    window.setTimeout(() => document.getElementById("dx-bot-lower")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const stepProps: StepProps = {
    config,
    errors,
    patch,
    patchRisk,
    patchParams,
    setOverlay,
    account,
    mode,
    backtest,
    backtestSkipped,
    lintClean,
    feedDown,
    goStep,
    risk,
    quotes,
    spark,
    onBrowseMarketplace: () => openLower("marketplace"),
  };

  const channelOptions = [
    { id: "all", label: `All (${logLines.length})` },
    { id: "engine", label: "Engine" },
    { id: "risk", label: "Risk" },
    { id: "feed", label: "Feed" },
    { id: "config", label: "Config" },
  ];
  const channelRows = logLines.filter((l) => logChannel === "all" || l.channel === logChannel);
  const logPageSize = 6;
  const logPageCount = Math.max(1, Math.ceil(channelRows.length / logPageSize));
  const logSlice = channelRows.slice((Math.min(logPage, logPageCount) - 1) * logPageSize, Math.min(logPage, logPageCount) * logPageSize);
  const blockingIssues = Object.keys(live);

  if (mode === "config" && !bot) {
    return (
      <div className="d-grid gap-3">
        <EmptyState
          title="That bot no longer exists"
          message="The configuration route points at a bot id that is not in this fleet — it may have been deleted from another tab."
          action={
            <div className="d-flex gap-2">
              <Link to="/dashboard/bots" className="dx-btn dx-btn-primary"><ExternalLink size={13} /> Back to the fleet</Link>
              <button type="button" className="dx-btn" onClick={() => openLower("drafts")}>Resume a recent draft</button>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <>
      {blocked ? (
        <Alert tone="warn" title="Cannot continue yet">
          {blocked}{" "}
          <button type="button" className="dx-btn dx-btn-sm dx-btn-link" onClick={() => setOverlay({ kind: "completeness" })}>
            Open the checklist
          </button>{" "}
          <button type="button" className="dx-btn dx-btn-sm dx-btn-link" onClick={() => setBlocked("")}>
            Dismiss
          </button>
        </Alert>
      ) : null}

      {halted ? (
        <Alert tone="danger" title={`${halted.code} is halted`}>
          {halted.reason} Feed expected back in {halted.untilMin} min. {halted.impact}{" "}
          <button type="button" className="dx-btn dx-btn-sm dx-btn-link" onClick={() => setOverlay({ kind: "halted", code: halted.code })}>
            Show similar symbols
          </button>
        </Alert>
      ) : null}

      {!account.connected ? (
        <Alert tone="warn" title="Deriv session expired">
          <span className="d-inline-flex flex-wrap align-items-center gap-2">
            The {account.label} token stopped working {account.lastSeen} h ago. The draft keeps saving locally — reconnect to arm the bot.
            <button type="button" className="dx-btn dx-btn-sm" onClick={() => saveDraft(false)}>Save as draft</button>
            <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => setOverlay({ kind: "reconnect" })}>Reconnect to start bot</button>
          </span>
        </Alert>
      ) : null}

      <Reveal>
        <div className="dx-card dx-card-pad">
          <div className="d-flex flex-wrap align-items-start gap-3">
            <div className="flex-grow-1">
              <span className="dx-eyebrow">{mode === "config" ? "Bot configuration" : "New bot"} · builder v12</span>
              <h1 className="dx-h-section mb-1">{config.name || "Untitled bot"}</h1>
              <p className="dx-card-sub mb-2">
                {symbol?.name} · {template.name} · {CONTRACT_TYPE_MAP[config.contractType]?.label} · {fmtDur(config.duration, config.durationUnit)}
              </p>
              <div className="d-flex flex-wrap align-items-center gap-2">
                <Chip tone={config.paper ? "info" : "warn"}>{config.paper ? "virtual funds" : "real funds"}</Chip>
                <Chip tone={risk.band === "high" ? "down" : risk.band === "medium" ? "warn" : "up"}>risk {risk.score}/100</Chip>
                <Chip tone={completeness.pct >= 90 ? "up" : "muted"}>{completeness.pct}% complete</Chip>
                <Chip tone={autosaveOn ? "up" : "warn"} pulse={autosaveOn && dirty}>
                  {dirty ? `drafting · autosave ${autosaveOn ? "on" : "paused"}` : savedAgo < 5 ? "all changes saved" : `saved ${savedAgo}s ago`}
                </Chip>
                {changedRows.length ? <Chip tone="info">{changedRows.length} field(s) changed</Chip> : null}
                <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setAutosaveOn((v) => !v)}>
                  <Pause size={12} /> {autosaveOn ? "Pause autosave" : "Resume autosave"}
                </button>
              </div>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "ai" })}>
                <Wand2 size={13} /> AI assistant
              </button>
              <button type="button" className="dx-btn dx-btn-sm" onClick={() => openLower("marketplace")}>
                <Upload size={13} /> Marketplace
              </button>
              <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "share" })}>
                <Share2 size={13} /> Share
              </button>
              <button type="button" className="dx-btn dx-btn-sm" onClick={() => setShortcutsOpen(true)}>Keyboard</button>
              <button type="button" className="dx-btn dx-btn-sm" onClick={() => saveDraft(false)}>Save draft</button>
              <Dropdown
                label="More builder actions"
                align="end"
                trigger={<span className="dx-btn dx-btn-sm dx-btn-ghost">More</span>}
                items={[
                  { id: "import", label: "Import configuration", onSelect: () => setOverlay({ kind: "import-config" }) },
                  { id: "export", label: "Export configuration", onSelect: () => setOverlay({ kind: "export-config" }) },
                  { id: "template", label: "Save as template", onSelect: () => setOverlay({ kind: "template-save" }) },
                  { id: "params", label: "Parameter sets", onSelect: () => setOverlay({ kind: "param-set" }) },
                  { type: "divider" },
                  { id: "versions", label: "Version history", onSelect: () => setOverlay({ kind: "versions" }) },
                  { id: "audit", label: "Audit trail", onSelect: () => setOverlay({ kind: "audit", id: audit[0]?.id ?? "aud_01" }) },
                  { id: "slots", label: "Engine slots", onSelect: () => setOverlay({ kind: "slots" }) },
                  { id: "log", label: "Engine log", onSelect: () => setOverlay({ kind: "log" }) },
                  { type: "divider" },
                  { id: "risk", label: "Risk breakdown", onSelect: () => setOverlay({ kind: "risk" }) },
                  { id: "mc", label: "Monte-Carlo", onSelect: () => setOverlay({ kind: "montecarlo" }) },
                  { id: "proj", label: "Monthly projection", onSelect: () => setOverlay({ kind: "projection" }) },
                  { id: "check", label: "Completeness checklist", onSelect: () => setOverlay({ kind: "completeness" }) },
                  { type: "divider" },
                  { id: "scripts", label: "Script library", onSelect: () => setOverlay({ kind: "scripts" }) },
                  { id: "reconnect", label: "Connection check", onSelect: () => setOverlay({ kind: "reconnect" }) },
                  { id: "help", label: "Builder help", onSelect: () => setOverlay({ kind: "help" }) },
                ]}
              />
              <button
                type="button"
                className="dx-btn dx-btn-primary"
                disabled={blockingIssues.length > 0}
                aria-describedby="dx-deploy-hint"
                onClick={() => setOverlay({ kind: "deploy-confirm" })}
              >
                <Rocket size={13} /> {mode === "config" ? "Apply changes" : "Save & start bot"}
              </button>
            </div>
          </div>

          <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
            <span id="dx-deploy-hint" className="dx-help">
              {blockingIssues.length
                ? `${blockingIssues.length} blocking issue(s) on step ${step + 1}: ${blockingIssues.slice(0, 3).join(", ")}`
                : mode === "config"
                  ? "All checks pass — applying restarts the runtime on the same slot."
                  : "All checks pass — the bot starts on a free engine slot right after the receipt."}
            </span>
            <span className="ms-auto">
              <Chip tone={validating ? "warn" : blockingIssues.length ? "down" : "up"}>
                {validating ? "validating…" : blockingIssues.length ? `${blockingIssues.length} errors` : "ready"}
              </Chip>
            </span>
          </div>

          <div className="dx-wizard-bar mt-3">
            <nav role="navigation" aria-label="Bot configuration steps" className="flex-grow-1">
              <Stepper steps={STEPS} active={step} onStepClick={goStep} />
            </nav>
            <div className="d-flex gap-2">
              <button type="button" className="dx-btn dx-btn-sm" disabled={step === 0} onClick={() => goStep(step - 1)}>
                Back
              </button>
              <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" disabled={step === STEPS.length - 1} onClick={() => goStep(step + 1)}>
                Next
              </button>
            </div>
          </div>
          <div className="mt-3">
            <Progress value={((step + 1) / STEPS.length) * 100} />
          </div>
          <div className="d-flex flex-wrap align-items-center gap-3 mt-2">
            <span className="dx-help">Step {step + 1} of {STEPS.length} · {STEPS[step].label}</span>
            <span className="dx-help">⌘/Ctrl+S saves a draft · Alt+← goes back</span>
            <span className="dx-help ms-auto font-display">{exportableConfig(config).schema as string} · login {config.loginId}</span>
          </div>
        </div>
      </Reveal>

      <div className="row g-3">
        <div className="col-12 col-xl-9">
          <div className="dx-card dx-card-pad" tabIndex={-1} data-step-panel aria-label={`${STEPS[step].label} step`}>
            <div className="dx-step-panel" key={step}>
              {step === 0 ? <StepBasic {...stepProps} /> : null}
              {step === 1 ? <StepStrategy {...stepProps} /> : null}
              {step === 2 ? <StepParamsRisk {...stepProps} /> : null}
              {step === 3 ? <StepReview {...stepProps} /> : null}
            </div>
          </div>
        </div>
        <div className="col-12 col-xl-3">
          <div className="dx-card dx-card-pad h-100">
            <MiniTabs
              ariaLabel="Builder side panel"
              value={railTab}
              onChange={setRailTab}
              options={[
                { id: "summary", label: "Summary" },
                { id: "history", label: "History" },
                { id: "slots", label: "Slots" },
              ]}
            />
            {railTab === "summary" ? (
              <div className="mt-3">
                <Meter label="Risk score" value={risk.score} display={`${risk.score}/100 · ${risk.band}`} />
                <Meter label="Completeness" value={completeness.pct} display={`${completeness.pct}%`} />
                <dl className="dx-kv mt-3">
                  <dt>Worst case per cycle</dt>
                  <dd className="font-display">{usd(risk.worstCasePerCycle)}</dd>
                  <dt>Expected month</dt>
                  <dd className={`font-display ${projection.scenarios[1].monthlyPnl >= 0 ? "dx-up" : "dx-down"}`}>{pnl(projection.scenarios[1].monthlyPnl)}</dd>
                  <dt>Contracts / day</dt>
                  <dd className="font-display">{projection.contractsPerDay}</dd>
                  <dt>Cap breach days</dt>
                  <dd className="font-display">{projection.capBreachDays} / 20</dd>
                </dl>
                <div className="d-flex flex-wrap gap-2">
                  <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "risk" })}><Gauge size={12} /> Risk</button>
                  <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "projection" })}><TrendingUp size={12} /> Projection</button>
                  <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setOverlay({ kind: "completeness" })}><CheckCircle2 size={12} /> Checklist</button>
                </div>
                <div className="dx-card-inset mt-3">
                  <span className="dx-kpi-label">Live watch</span>
                  {codes.map((code) => {
                    const q = quotes[code];
                    return (
                      <div key={code} className="d-flex align-items-baseline justify-content-between">
                        <span className="font-display">{code}</span>
                        <span className="font-display">{q ? fmtPrice(q.quote, SYMBOL_MAP[code]?.pipSize ?? 2) : "—"}</span>
                        <span className={`font-display ${q?.dir === "up" ? "dx-up" : q?.dir === "down" ? "dx-down" : "dx-muted"}`}>
                          {q ? `${q.changePct >= 0 ? "+" : ""}${q.changePct.toFixed(2)}%` : "·"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {railTab === "history" ? (
              <div className="mt-3 d-grid gap-2">
                <span className="dx-help">Newest first · {CONFIG_VERSIONS.length} revisions on this account</span>
                {CONFIG_VERSIONS.slice(0, 4).map((v) => (
                  <div key={v.id} className="dx-card-inset">
                    <div className="d-flex align-items-center justify-content-between">
                      <span className="fw-semibold">{v.label}</span>
                      <Chip tone={v.status === "live" ? "up" : v.status === "draft" ? "warn" : "muted"}>{v.status}</Chip>
                    </div>
                    <span className="dx-help d-block font-display">{v.author} · {v.summary}</span>
                    <div className="d-flex gap-2 mt-2">
                      <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "version-diff", a: CONFIG_VERSIONS[0].id, b: v.id })}>Diff</button>
                      <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setOverlay({ kind: "rollback", id: v.id })}>Roll back</button>
                    </div>
                  </div>
                ))}
                <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "versions" })}>Open all versions</button>
              </div>
            ) : null}
            {railTab === "slots" ? (
              <div className="mt-3 d-grid gap-2">
                <span className="dx-help">{ENGINE_SLOTS.filter((s) => s.state === "free").length} of {ENGINE_SLOTS.length} slots free in eu-west-1</span>
                {ENGINE_SLOTS.slice(0, 4).map((s) => (
                  <div key={s.id} className="dx-card-inset">
                    <div className="d-flex align-items-center justify-content-between">
                      <span className="fw-semibold font-display">slot {s.index}</span>
                      <Chip tone={s.state === "free" ? "up" : s.state === "reserved" ? "warn" : "info"}>{s.state}</Chip>
                    </div>
                    <span className="dx-help d-block font-display">{s.botName} · cpu {s.cpuPct}% · {s.memoryMb} MB</span>
                  </div>
                ))}
                <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "slots" })}>Manage slots</button>
              </div>
            ) : null}
            <div className="dx-card-inset mt-3">
              <span className="dx-kpi-label">Account</span>
              <div className="d-flex align-items-center gap-2">
                <span className="font-display">{account.loginId}</span>
                <Chip tone={account.connected ? "up" : "down"} pulse={account.connected}>{account.connected ? "connected" : "offline"}</Chip>
              </div>
              <span className="dx-help d-block">balance <span className="font-display">{usd(account.balance)}</span> · equity <span className="font-display">{usd(account.equity)}</span></span>
              <div className="d-flex flex-wrap gap-2 mt-2">
                <button type="button" className="dx-btn dx-btn-sm" onClick={openSwitcher}>Switch account</button>
                <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={openOAuth}>Re-authorise</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Reveal delay={60}>
        <div id="dx-bot-lower" className="dx-card dx-card-pad">
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            <div className="flex-grow-1">
              <h2 className="dx-card-title mb-0">Library &amp; evidence</h2>
              <p className="dx-card-sub mb-0">Drafts, community strategies, saved parameter sets and every configuration change on this account</p>
            </div>
            <span className="d-flex gap-2">
              <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "template-save" })}><Download size={12} /> Save as template</button>
              <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "ai" })}><Wand2 size={12} /> Generate with AI</button>
            </span>
          </div>
          <Tabs
            active={lowerTab}
            onChange={setLowerTab}
            tabs={[
              { id: "drafts", label: "Recent drafts", badge: drafts.length },
              { id: "marketplace", label: "Marketplace", badge: MARKETPLACE_STRATEGIES.length },
              { id: "paramsets", label: "Parameter sets", badge: paramSets.length },
              { id: "audit", label: "Audit trail", badge: audit.length },
            ]}
          />
          <div className="mt-3">
            {lowerTab === "drafts" ? (
              <>
                <div className="d-flex flex-wrap gap-2 mb-2">
                  <button
                    type="button"
                    className="dx-btn dx-btn-sm"
                    disabled={!selectedDrafts.length}
                    onClick={() => {
                      setDrafts((list) => list.filter((d) => !selectedDrafts.includes(d.id)));
                      pushLog({ level: "warn", channel: "config", message: `Deleted ${selectedDrafts.length} draft(s) from the library` });
                      setSelectedDrafts([]);
                    }}
                  >
                    <Trash2 size={12} /> Delete selected
                  </button>
                  <button
                    type="button"
                    className="dx-btn dx-btn-sm"
                    disabled={selectedDrafts.length !== 2}
                    onClick={() => setOverlay({ kind: "draft-compare", ids: selectedDrafts })}
                  >
                    Compare selected
                  </button>
                  <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => saveDraft(false)}>
                    Save current as new draft
                  </button>
                  <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setOverlay({ kind: "import-config" })}>
                    <Upload size={12} /> Import config file
                  </button>
                </div>
                <DraftsTable
                  drafts={drafts}
                  selected={selectedDrafts}
                  onToggleSelect={(id) => setSelectedDrafts((sel) => (sel.includes(id) ? sel.filter((s) => s !== id) : [...sel, id].slice(-2)))}
                  onOpen={(d) => setOverlay({ kind: "draft", id: d.id })}
                  onResume={(d) => setOverlay({ kind: "draft-resume", id: d.id })}
                  onDuplicate={duplicateDraft}
                  onDelete={(d) => setOverlay({ kind: "draft-delete", id: d.id })}
                  onCompare={() => setOverlay({ kind: "draft-compare", ids: selectedDrafts })}
                />
              </>
            ) : null}
            {lowerTab === "marketplace" ? (
              <MarketplaceTable
                onPreview={(id) => setOverlay({ kind: "market-preview", id })}
                onImport={(id) => setOverlay({ kind: "market-import", id })}
              />
            ) : null}
            {lowerTab === "paramsets" ? (
              <>
                <div className="d-flex flex-wrap gap-2 mb-2">
                  <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "param-set" })}>New parameter set</button>
                  <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setOverlay({ kind: "template-save" })}>
                    Save current numbers as a set
                  </button>
                  <span className="dx-help ms-auto">
                    Active: <span className="font-display">{template.name}</span> · {Object.entries(config.strategyParams).length} variables bound to the form
                  </span>
                </div>
                <ParameterSetsTable
                  sets={paramSets}
                  onApply={(id) => setOverlay({ kind: "param-set", id })}
                  onEdit={(id) => setOverlay({ kind: "param-set", id })}
                  onDuplicate={(id) => {
                    const src = paramSets.find((s) => s.id === id);
                    if (!src) return;
                    upsertParamSet({ ...src, id: `${src.id}-copy`, name: `${src.name} (copy)`, uses: 0, visibility: "private" });
                    pushLog({ level: "info", channel: "config", message: `Duplicated parameter set ${src.id}` });
                  }}
                  onDelete={(id) => setOverlay({ kind: "param-set-delete", id })}
                />
              </>
            ) : null}
            {lowerTab === "audit" ? (
              <>
                <div className="d-flex flex-wrap gap-2 mb-2">
                  <span className="dx-help">
                    {changedRows.length
                      ? `${changedRows.length} unsaved field change(s) against the ${mode === "config" ? "live" : "starter"} revision.`
                      : "The working copy matches the baseline revision."}
                  </span>
                  <button type="button" className="dx-btn dx-btn-sm ms-auto" onClick={() => setOverlay({ kind: "audit", id: audit[0]?.id ?? "aud_01" })}>
                    <ScrollText size={12} /> Open full trail
                  </button>
                  <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setOverlay({ kind: "versions" })}>Versions</button>
                </div>
                <AuditTable audit={audit} onOpen={(id) => setOverlay({ kind: "audit", id })} />
              </>
            ) : null}
          </div>
        </div>
      </Reveal>

      <Reveal delay={90}>
        <div className="row g-3">
          <div className="col-6 col-lg-2">
            <StatCard label="Strategy presets" value={CREATOR_STATS.strategies} footnote="6 recovery families + AI" />
          </div>
          <div className="col-6 col-lg-2">
            <StatCard label="Marketplace" value={CREATOR_STATS.marketplace} footnote="ratings + backtests" />
          </div>
          <div className="col-6 col-lg-2">
            <StatCard label="Parameter sets" value={CREATOR_STATS.parameterSets} footnote={`${paramSets.length} loaded`} />
          </div>
          <div className="col-6 col-lg-2">
            <StatCard label="Versions" value={CREATOR_STATS.versions} footnote="diff + rollback" />
          </div>
          <div className="col-6 col-lg-2">
            <StatCard label="Log lines" value={logLines.length} footnote="engine · risk · feed" live />
          </div>
          <div className="col-6 col-lg-2">
            <StatCard label="Engine slots" value={CREATOR_STATS.slots} footnote="eu-west-1 cluster" />
          </div>
        </div>
      </Reveal>

      <Reveal delay={120}>
        <div className="row g-3">
          <div className="col-12 col-xl-7">
            <div className="dx-card dx-card-pad h-100">
              <div className="dx-card-head">
                <div>
                  <h3 className="dx-card-title">Build trail</h3>
                  <p className="dx-card-sub">Autosave, lint, feed and risk events from this session</p>
                </div>
                <MiniTabs ariaLabel="Log channel" options={channelOptions} value={logChannel} onChange={(id) => { setLogChannel(id); setLogPage(1); }} />
              </div>
              <div className="d-grid gap-2" role="log" aria-live="polite">
                {logSlice.map((l) => (
                  <div key={l.id} className="d-flex align-items-start gap-2">
                    <span className={`dx-dot dx-dot-${l.level === "error" ? "down" : l.level === "warn" ? "warn" : "up"}`} aria-hidden="true" />
                    <span className="d-flex flex-column flex-grow-1">
                      <span>{l.message}</span>
                      <span className="dx-help font-display">{l.channel} · {l.atMin === 0 ? "just now" : `${l.atMin}m ago`}</span>
                    </span>
                  </div>
                ))}
                {!logSlice.length ? <span className="dx-help">No events on this channel yet.</span> : null}
              </div>
              <div className="mt-3">
                <Pagination page={Math.min(logPage, logPageCount)} pageCount={logPageCount} total={channelRows.length} pageSize={logPageSize} onPageChange={setLogPage} label="events" />
              </div>
              <div className="d-flex gap-2 mt-2">
                <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "log" })}><ScrollText size={12} /> Full engine log</button>
                <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setOverlay({ kind: "help" })}>How the engine runs bots</button>
              </div>
            </div>
          </div>
          <div className="col-12 col-xl-5">
            <div className="dx-card dx-card-pad h-100">
              <div className="dx-card-head">
                <div>
                  <h3 className="dx-card-title">{config.symbol} tape</h3>
                  <p className="dx-card-sub">{symbol?.name} · payout {pct(symbol?.payoutPct ?? 95, 1)} · spread {symbol?.spread}</p>
                </div>
                <Chip tone={feedDown ? "down" : "up"} pulse={!feedDown}>{feedDown ? "feed closed" : "streaming"}</Chip>
              </div>
              <LineChart data={spark} height={132} tone="accent" ariaLabel={`${config.symbol} recent ticks`} yFormat={(v) => fmtPrice(v, symbol?.pipSize ?? 2)} />
              <dl className="dx-kv mt-3">
                <dt>Session</dt>
                <dd className="font-display">{symbol?.openTime}–{symbol?.closeTime}</dd>
                <dt>Chosen ladder</dt>
                <dd className="font-display">{ladderRows(config).map((r) => usd(r.stake)).join(" → ")}</dd>
                <dt>Contract types</dt>
                <dd className="font-display">{(symbol?.contractTypes ?? []).map((c) => CONTRACT_TYPE_MAP[c]?.label).join(", ")}</dd>
              </dl>
              <div className="d-flex flex-wrap gap-2">
                <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "backtest" })}><FlaskConical size={12} /> Backtest this ladder</button>
                <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "optimizer" })}><GaugeCircle size={12} /> Optimize</button>
                <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setOverlay({ kind: "montecarlo" })}><Shield size={12} /> Monte-Carlo</button>
                <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={requestLeave}><ExternalLink size={12} /> Fleet view</button>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      <Dialog
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        title="Keyboard shortcuts"
        subtitle="Every action here also has a button — these just cut the clicks"
        size="md"
        footer={<button type="button" className="dx-btn" onClick={() => setShortcutsOpen(false)}>Close</button>}
      >
        <dl className="dx-kv">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="d-contents">
              <dt className="font-display">{s.keys}</dt>
              <dd><span className="fw-semibold">{s.label}</span><span className="dx-help d-block">{s.hint}</span></dd>
            </div>
          ))}
        </dl>
        <Alert tone="info" title="Read-aloud summary">
          Toggle assistive narration of the current step from the builder help dialog — it reads the step summary, the risk band and every blocking issue.
        </Alert>
        <button type="button" className="dx-btn dx-btn-sm mt-2" onClick={() => { setShortcutsOpen(false); setOverlay({ kind: "help" }); }}>
          Open builder help
        </button>
      </Dialog>

      <BotCreatorOverlays
        overlay={overlay}
        setOverlay={setOverlay}
        config={config}
        baseline={baseline}
        patch={patch}
        patchRisk={patchRisk}
        patchStrategyParams={patchParams}
        applyConfig={applyConfig}
        goStep={goStep}
        account={account}
        mode={mode}
        bot={bot}
        drafts={drafts}
        upsertDraft={upsertDraft}
        removeDraft={removeDraft}
        paramSets={paramSets}
        upsertParamSet={upsertParamSet}
        removeParamSet={removeParamSet}
        backtest={backtest}
        setBacktest={setBacktest}
        backtestSkipped={backtestSkipped}
        setBacktestSkipped={setBacktestSkipped}
        audit={audit}
        logLines={logLines}
        pushLog={pushLog}
        notify={notify}
        lintClean={lintClean}
        markLintClean={(scriptId) => {
          setLintClean((list) => (list.includes(scriptId) ? list : [...list, scriptId]));
          patch({ scriptId });
          pushLog({ level: "info", channel: "config", message: `Lint cleared for ${scriptId} — step 4 unblocked` });
        }}
        onDeployed={(r) => {
          setReceipt(r);
          setDirty(false);
          pushLog({ level: "info", channel: "engine", message: `${r.name} ${r.mode === "apply" ? "reconfigured" : "deployed"} on slot ${r.slot} for ${r.loginId}` });
          notify("success", r.mode === "apply" ? "Configuration applied" : "Bot created and started", `${r.name} · slot ${r.slot} · ${usd(r.stake)} base stake${r.paper ? " · virtual funds" : ""}.`);
        }}
        onOpenOAuth={openOAuth}
        onOpenBotDetail={() => {
          guardedNav.current = true;
          navigate({ to: "/dashboard/bots" });
        }}
        onOpenAuditInit={() => pushLog({ level: "info", channel: "config", message: "Audit trail opened from the builder" })}
        receipt={receipt}
        onRevertAudit={onRevertAudit}
        onLeave={onLeave}
      />
      <Dialog
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        title="Keyboard shortcuts"
        subtitle="Every shortcut here mirrors a visible button — nothing is hidden"
        size="md"
        footer={<button type="button" className="dx-btn" onClick={() => setShortcutsOpen(false)}>Close</button>}
      >
        <div className="d-grid gap-2">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="d-flex align-items-baseline justify-content-between gap-3">
              <span className="font-display dx-chip dx-chip-muted">{s.keys}</span>
              <span className="d-flex flex-column text-end">
                <span className="fw-semibold">{s.label}</span>
                <span className="dx-help">{s.hint}</span>
              </span>
            </div>
          ))}
        </div>
        <Alert tone="info" title="Where the guards live">
          The form only protects you from obvious mistakes. Stop-loss, cooldown and the daily cap are re-checked by the engine
          before every proposal, so a stale browser tab cannot bypass them.
        </Alert>
      </Dialog>
    </>
  );
}

export default function BotCreatorPage({ botId }: { botId?: string }) {
  return (
    <AppShell title="Bot creator" subtitle="Four steps from idea to an armed bot — every guard is enforced by the engine, not the form.">
      <div className="page-bot-new">
        <BotCreatorInner botId={botId} />
      </div>
    </AppShell>
  );
}
