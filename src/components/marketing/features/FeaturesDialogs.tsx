// =============================================================================
// FeaturesDialogs.tsx — H-2-only overlays: bot configuration wizard, script
// studio, automation rule wizard, risk policy, alert rules, contract detail,
// comparison detail, bot detail drawer, automation drawer, template drawer.
// Reused H-1 overlays (presets, backtests, leaderboard, demo console, OAuth…)
// are wired by FeaturesPage.tsx — this file only adds what H-1 does not have.
// =============================================================================
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Bot as BotIcon,
  CalendarClock,
  Check,
  Code2,
  Gauge,
  Pause,
  Play,
  Rocket,
  ShieldCheck,
  Sliders,
  Trash2,
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
  Dropdown,
  Field,
  Meter,
  MiniTabs,
  Progress,
  Sparkline,
  Stepper,
  Tabs,
  Toggle,
} from "../../ui/primitives";
import { LineChart, TerminalPreview } from "../../ui/charts";
import {
  AUTOMATION_RULES,
  BOTS,
  DERIV_ACCOUNTS,
  STRATEGY_PRESETS,
  TRADES,
  equityCurve,
  type AutomationKind,
  type AutomationRule,
  type Bot,
  type ComparisonRow,
  type Script,
  type ScriptTemplate,
} from "../../../data/trading";
import {
  CONTRACT_TYPE_MAP,
  CONTRACT_TYPES,
  MARKET_SYMBOLS,
  SYMBOL_MAP,
  fmtDur,
  fmtDurLong,
  fmtPrice,
  pct,
  pnl,
  timeAgo,
  usd,
  type ContractTypeId,
} from "../../../data/market";
import type { DurationUnit } from "../../../data/market";

// -----------------------------------------------------------------------------
// 1 · Bot configuration wizard (3 steps) — "configure from scratch" companion
// to the preset DeployBotWizard reused from H-1.
// -----------------------------------------------------------------------------
export function BotConfigWizard({
  open,
  onClose,
  initialPresetId,
  initialStep = 0,
  onDeployed,
  onOpenBacktests,
  onOpenPresets,
}: {
  open: boolean;
  onClose: () => void;
  initialPresetId?: string;
  initialStep?: number;
  onDeployed: (name: string, symbol: string) => void;
  onOpenBacktests: (presetId?: string) => void;
  onOpenPresets: () => void;
}) {
  const seed = STRATEGY_PRESETS.find((p) => p.id === initialPresetId) ?? STRATEGY_PRESETS[0];
  const [step, setStep] = useState(initialStep);
  const [name, setName] = useState(seed.name);
  const [symbol, setSymbol] = useState(seed.symbol);
  const [contractType, setContractType] = useState<ContractTypeId>(seed.contractType);
  const [stake, setStake] = useState(seed.stake);
  const [duration, setDuration] = useState(seed.duration);
  const [unit, setUnit] = useState<DurationUnit>(seed.durationUnit);
  const [stepMultiplier, setStepMultiplier] = useState(2.1);
  const [maxStake, setMaxStake] = useState(50);
  const [stopLoss, setStopLoss] = useState(250);
  const [takeProfit, setTakeProfit] = useState(150);
  const [account, setAccount] = useState(DERIV_ACCOUNTS[1].loginId);
  const [autoRestart, setAutoRestart] = useState(true);
  const [busy, setBusy] = useState(false);
  const [nameError, setNameError] = useState("");

  const steps = [
    { id: "params", label: "Parameters" },
    { id: "risk", label: "Risk caps" },
    { id: "deploy", label: "Review & deploy" },
  ];
  const sym = SYMBOL_MAP[symbol];
  const contractsForSymbol = sym?.contractTypes ?? CONTRACT_TYPES.map((c) => c.id);

  if (!open) return null;

  const finish = () => {
    if (busy) return;
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      onDeployed(name.trim() || seed.name, symbol);
    }, 1100);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Configure a bot"
      subtitle="Start blank or from a preset — the engine enforces every cap below before it ever asks Deriv for a proposal."
      footer={
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 w-100">
          <Stepper steps={steps} active={step} />
          <div className="d-flex flex-wrap gap-2">
            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={onOpenPresets}>
              Browse presets instead
            </button>
            {step > 0 ? (
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setStep((s) => s - 1)}>
                Back
              </button>
            ) : null}
            {step < 2 ? (
              <button
                type="button"
                className="dx-btn dx-btn-sm dx-btn-primary"
                onClick={() => {
                  if (step === 0 && name.trim().length < 3) {
                    setNameError("Give the bot a name of at least 3 characters — it appears in logs and alerts.");
                    return;
                  }
                  setNameError("");
                  setStep((s) => s + 1);
                }}
              >
                Continue
              </button>
            ) : (
              <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" disabled={busy} onClick={finish}>
                {busy ? (
                  <>
                    <span className="dx-spin"><Rocket size={13} /></span> Deploying worker…
                  </>
                ) : (
                  <>
                    <Rocket size={13} /> Deploy bot
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      }
    >
      {step === 0 ? (
        <div className="d-grid gap-3">
          <div className="row g-3">
            <div className="col-12 col-sm-6">
              <Field label="Bot name" required error={nameError} help="Shown in the fleet table, bot logs and pause alerts.">
                <input className={`dx-input ${nameError ? "is-invalid" : ""}`} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Vol10 Martingale Core" />
              </Field>
            </div>
            <div className="col-12 col-sm-6">
              <Field label="Start from preset" help="Loading a preset only fills the form — nothing deploys yet.">
                <select
                  className="dx-select"
                  value={seed.id}
                  onChange={(e) => {
                    const p = STRATEGY_PRESETS.find((x) => x.id === e.target.value);
                    if (!p) return;
                    setName(p.name); setSymbol(p.symbol); setContractType(p.contractType);
                    setStake(p.stake); setDuration(p.duration); setUnit(p.durationUnit);
                  }}
                >
                  {STRATEGY_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} · {p.symbol}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="col-12 col-sm-6">
              <Field label="Symbol" help={sym ? `${sym.name} · payout ${sym.payoutPct}% · ${sym.open ? "market open" : "market closed"}` : undefined}>
                <select className="dx-select font-display" value={symbol} onChange={(e) => setSymbol(e.target.value)}>
                  {MARKET_SYMBOLS.map((s) => (
                    <option key={s.code} value={s.code}>{s.code} — {s.name}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="col-12 col-sm-6">
              <Field label="Contract type" help="Only types Deriv offers on this symbol are listed.">
                <select className="dx-select" value={contractType} onChange={(e) => setContractType(e.target.value as ContractTypeId)}>
                  {contractsForSymbol.map((id) => (
                    <option key={id} value={id}>{CONTRACT_TYPE_MAP[id].label}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="col-6 col-sm-4">
              <Field label="Stake (USD)">
                <input className="dx-input dx-input-num" type="number" min={0.35} step={0.05} value={stake} onChange={(e) => setStake(Math.max(0.35, Number(e.target.value)))} />
              </Field>
            </div>
            <div className="col-6 col-sm-4">
              <Field label="Duration">
                <input className="dx-input dx-input-num" type="number" min={1} max={365} value={duration} onChange={(e) => setDuration(Math.max(1, Number(e.target.value)))} />
              </Field>
            </div>
            <div className="col-12 col-sm-4">
              <Field label="Duration unit">
                <select className="dx-select" value={unit} onChange={(e) => setUnit(e.target.value as DurationUnit)}>
                  <option value="ticks">Ticks (1–10)</option>
                  <option value="seconds">Seconds</option>
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </Field>
            </div>
          </div>
          <div className="dx-quick-btns" aria-label="Quick stakes">
            {[0.35, 1, 5, 10, 25].map((s) => (
              <button key={s} type="button" className={`dx-filter-chip ${stake === s ? "is-active" : ""}`} onClick={() => setStake(s)}>
                {usd(s)}
              </button>
            ))}
            <span className="dx-help ms-2">Duration here: <span className="font-display">{fmtDurLong(duration, unit)}</span> · barrier: {CONTRACT_TYPE_MAP[contractType].barrier}</span>
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="d-grid gap-3">
          <div className="row g-3">
            <div className="col-12 col-sm-6">
              <Field label="Recovery step (martingale)" help="Stake multiplier applied after a loss. 1.0 = flat staking.">
                <input className="dx-input dx-input-num" type="number" min={1} max={3} step={0.1} value={stepMultiplier} onChange={(e) => setStepMultiplier(Number(e.target.value))} />
              </Field>
            </div>
            <div className="col-12 col-sm-6">
              <Field label="Hard stake cap (USD)" help="The engine rejects any leg above this — before the proposal.">
                <input className="dx-input dx-input-num" type="number" min={1} value={maxStake} onChange={(e) => setMaxStake(Math.max(1, Number(e.target.value)))} />
              </Field>
            </div>
            <div className="col-12 col-sm-6">
              <Field label="Stop-loss (USD, realised)">
                <input className="dx-input dx-input-num" type="number" min={10} value={stopLoss} onChange={(e) => setStopLoss(Math.max(10, Number(e.target.value)))} />
              </Field>
            </div>
            <div className="col-12 col-sm-6">
              <Field label="Take-profit (USD, realised)">
                <input className="dx-input dx-input-num" type="number" min={10} value={takeProfit} onChange={(e) => setTakeProfit(Math.max(10, Number(e.target.value)))} />
              </Field>
            </div>
          </div>
          <Meter label="Worst single leg vs cap" value={Math.min(100, (stake / Math.max(1, maxStake)) * 100)} display={`${usd(stake)} of ${usd(maxStake)}`} />
          <Alert tone="warn" title="Caps are absolute">
            At a {stepMultiplier}x step, five straight losses need <strong className="font-display">{usd(Math.min(maxStake, stake * Math.pow(stepMultiplier, 5)))}</strong> on the sixth leg.
            The stop-loss of <strong className="font-display">{usd(stopLoss)}</strong> pauses the worker before that leg is ever proposed.
          </Alert>
          <Toggle checked={autoRestart} onChange={setAutoRestart} label="Auto-restart after a socket drop" hint="Reconnects with the same idempotency key — a contract is never bought twice." />
        </div>
      ) : null}

      {step === 2 ? (
        <div className="d-grid gap-3">
          <div className="row g-3">
            {[
              { k: "Bot", v: name || seed.name },
              { k: "Market", v: `${symbol} · ${CONTRACT_TYPE_MAP[contractType].label}` },
              { k: "Stake / duration", v: `${usd(stake)} · ${fmtDur(duration, unit)}` },
              { k: "Recovery step", v: `${stepMultiplier}x · cap ${usd(maxStake)}` },
              { k: "Stop-loss / take-profit", v: `${usd(stopLoss)} / ${usd(takeProfit)}` },
              { k: "Account", v: account },
            ].map((row) => (
              <div className="col-6" key={row.k}>
                <div className="dx-card-inset">
                  <div className="dx-kpi-label">{row.k.trim()}</div>
                  <div className="font-display fw-semibold">{row.v}</div>
                </div>
              </div>
            ))}
          </div>
          <Field label="Run on account" help="Virtual (VRTC) accounts settle with demo funds; real (CR) accounts settle with real money.">
            <select className="dx-select font-display" value={account} onChange={(e) => setAccount(e.target.value)}>
              {DERIV_ACCOUNTS.map((a) => (
                <option key={a.loginId} value={a.loginId}>{a.loginId} — {a.label} · {usd(a.balance)}</option>
              ))}
            </select>
          </Field>
          <div className="d-flex flex-wrap gap-2">
            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => onOpenBacktests(seed.id)}>
              Backtest these parameters first
            </button>
            <Chip tone="info">Worker lane: eu-west relay · 12 ms median tick</Chip>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// 2 · Script studio (editor / output / backtest / API tabs)
// -----------------------------------------------------------------------------
export function ScriptStudioDialog({
  open,
  onClose,
  script,
  template,
  onOpenBacktests,
  onOpenConsole,
}: {
  open: boolean;
  onClose: () => void;
  script: Script | null;
  template: ScriptTemplate | null;
  onOpenBacktests: () => void;
  onOpenConsole: () => void;
}) {
  const [tab, setTab] = useState("editor");
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<string[]>([]);
  const [deployed, setDeployed] = useState(false);

  const name = script?.name ?? template?.name ?? "Untitled strategy";
  const code = script?.code ?? template?.code ?? "";
  const symbolCode = script?.symbol ?? template?.symbol ?? "R_10";

  if (!open) return null;

  const run = () => {
    if (running) return;
    setRunning(true);
    setOutput([]);
    const lines = [
      `[sandbox] booted VM2 isolate for ${symbolCode} · no network, no filesystem`,
      `[tick] subscribed ${symbolCode} @ ${fmtPrice(SYMBOL_MAP[symbolCode]?.basePrice ?? 0, SYMBOL_MAP[symbolCode]?.pipSize ?? 2)} · epoch stream live`,
      `[risk] assertions registered · stake cap + daily stop armed`,
      `[sim] evaluated 250 ticks in 41 ms · 3 proposal(s) would fire`,
      `[done] dry-run complete — nothing was bought. Deploy when ready.`,
    ];
    lines.forEach((line, i) => window.setTimeout(() => {
      setOutput((o) => [...o, line]);
      if (i === lines.length - 1) setRunning(false);
    }, 350 * (i + 1)));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="xl"
      title={name}
      subtitle={`${symbolCode} · sandboxed JavaScript (VM2) · deterministic replay over recorded ticks`}
      footer={
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 w-100">
          <span className="dx-help">{deployed ? "Deployed to the demo fleet — watch it in the console." : "Dry-runs never buy. Deploying attaches the script to a bot worker."}</span>
          <div className="d-flex flex-wrap gap-2">
            <CopyButton text={code} label="Copy code" />
            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={onOpenBacktests}>Full backtest</button>
            {deployed ? (
              <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={onOpenConsole}>Open bot fleet</button>
            ) : (
              <button
                type="button"
                className="dx-btn dx-btn-sm dx-btn-primary"
                onClick={() => { setDeployed(true); }}
              >
                <Rocket size={13} /> Deploy script
              </button>
            )}
          </div>
        </div>
      }
    >
      <Tabs
        tabs={[
          { id: "editor", label: "Editor" },
          { id: "output", label: "Dry-run output", badge: output.length || undefined },
          { id: "runs", label: "Run history" },
          { id: "api", label: "API surface" },
        ]}
        active={tab}
        onChange={setTab}
        className="mb-4"
      />

      {tab === "editor" ? (
        <div className="d-grid gap-3">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <Chip tone="accent"><Code2 size={12} /> {script?.language ?? "JavaScript"}</Chip>
            <Chip tone="muted">{script?.lines ?? template?.lines ?? 0} lines</Chip>
            <Chip tone="muted">{symbolCode}</Chip>
            <button type="button" className="dx-btn dx-btn-sm dx-btn-primary ms-auto" onClick={run} disabled={running}>
              {running ? <><span className="dx-spin"><Play size={13} /></span> Running…</> : <><Play size={13} /> Dry-run 250 ticks</>}
            </button>
          </div>
          <CodeBlock code={code} maxHeight={380} />
          {output.length ? <TerminalPreview lines={output} height={150} /> : (
            <p className="dx-help mb-0">No dry-run yet this session. A dry-run replays 250 recorded ticks through the sandbox and reports which proposals would have fired.</p>
          )}
        </div>
      ) : null}

      {tab === "output" ? (
        <div className="d-grid gap-3">
          {output.length ? <TerminalPreview lines={output} height={240} /> : (
            <Alert tone="info" title="Nothing to show yet">Run a dry-run from the Editor tab — the sandbox log, risk assertions and would-fire proposals land here.</Alert>
          )}
          <button type="button" className="dx-btn dx-btn-sm" onClick={run} disabled={running}>{running ? "Running…" : "Run again"}</button>
        </div>
      ) : null}

      {tab === "runs" ? (
        <div className="dx-table-wrap">
          <table className="dx-table dx-table-sm dx-table-stack">
            <thead><tr><th scope="col">Run</th><th scope="col">Symbol</th><th scope="col" className="dx-td-num">Ticks</th><th scope="col" className="dx-td-num">Win rate</th><th scope="col" className="dx-td-num">P&amp;L</th><th scope="col">Verdict</th></tr></thead>
            <tbody>
              {[
                { run: "run_8841", ticks: 10000, win: script?.winRate ?? 62.4, pnl: script?.pnl ?? 128.4, verdict: "edge holds" },
                { run: "run_8790", ticks: 5000, win: (script?.winRate ?? 62.4) - 3.1, pnl: (script?.pnl ?? 128.4) * 0.6, verdict: "edge holds" },
                { run: "run_8712", ticks: 2500, win: (script?.winRate ?? 62.4) - 6.8, pnl: (script?.pnl ?? 128.4) * 0.3, verdict: "thin sample" },
              ].map((r) => (
                <tr key={r.run}>
                  <td data-label="Run" className="font-display">{r.run}</td>
                  <td data-label="Symbol" className="font-display">{symbolCode}</td>
                  <td data-label="Ticks" className="dx-td-num font-display">{r.ticks.toLocaleString("en-US")}</td>
                  <td data-label="Win rate" className="dx-td-num font-display">{pct(r.win, 1)}</td>
                  <td data-label="P&L" className="dx-td-num"><span className={r.pnl >= 0 ? "dx-up" : "dx-down"}>{pnl(r.pnl)}</span></td>
                  <td data-label="Verdict"><Chip tone={r.verdict === "edge holds" ? "up" : "warn"}>{r.verdict}</Chip></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "api" ? (
        <div className="row g-3">
          {[
            { fn: "api.onTick(symbol, handler)", note: "Subscribe to the tick stream for one symbol." },
            { fn: "api.onBar(symbol, tf, handler)", note: "Bar-close handler: 30m, 1h, 4h, 1d timeframes." },
            { fn: "api.buy({ symbol, contract_type, amount, duration })", note: "Requests a proposal then buys — idempotency key attached." },
            { fn: "api.sma / zscore / rsi / range", note: "Indicator helpers computed on the recorded tick window." },
            { fn: "risk.assert(condition, label)", note: "Hard guard: a failed assertion pauses the worker instantly." },
            { fn: "schedule.daily / weekly / onlyDuring", note: "Session windows and blackout calendars (CPI, NFP)." },
          ].map((row) => (
            <div className="col-12 col-md-6" key={row.fn}>
              <div className="dx-card-inset h-100">
                <div className="font-display fw-semibold" style={{ fontSize: "0.8rem" }}>{row.fn}</div>
                <div className="dx-help mt-1">{row.note}</div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// 3 · Automation rule wizard (3 steps)
// -----------------------------------------------------------------------------
export function AutomationRuleWizard({
  open,
  onClose,
  initialKind = "schedule",
  editing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  initialKind?: AutomationKind;
  editing?: AutomationRule | null;
  onSaved: (rule: AutomationRule) => void;
}) {
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<AutomationKind>(editing?.kind ?? initialKind);
  const [name, setName] = useState(editing?.name ?? "");
  const [botName, setBotName] = useState(editing?.botName ?? BOTS[0].name);
  const [trigger, setTrigger] = useState(editing?.trigger ?? "Weekdays 07:00 UTC");
  const [condition, setCondition] = useState(editing?.condition ?? "4h Asian range intact");
  const [action, setAction] = useState(editing?.action ?? "Arm bot, stake $25, 15m Rise/Fall");
  const [nameError, setNameError] = useState("");
  const [busy, setBusy] = useState(false);

  const steps = [
    { id: "trigger", label: "Trigger" },
    { id: "condition", label: "Condition" },
    { id: "review", label: "Action & save" },
  ];

  if (!open) return null;

  const save = () => {
    if (busy) return;
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      const bot = BOTS.find((b) => b.name === botName) ?? BOTS[0];
      onSaved({
        id: editing?.id ?? `auto_${Date.now().toString(36)}`,
        name: name.trim(), kind, botName, symbol: bot.symbol,
        trigger, condition, action,
        status: "enabled", fires30d: editing?.fires30d ?? 0,
        lastFiredAt: editing?.lastFiredAt ?? Date.now(), loginId: bot.loginId,
      });
    }, 900);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? `Edit rule — ${editing.name}` : "New automation rule"}
      subtitle="Rules run inside the engine. Your browser tab does not need to stay open."
      footer={
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 w-100">
          <Stepper steps={steps} active={step} />
          <div className="d-flex gap-2">
            {step > 0 ? <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setStep((s) => s - 1)}>Back</button> : null}
            {step < 2 ? (
              <button
                type="button"
                className="dx-btn dx-btn-sm dx-btn-primary"
                onClick={() => {
                  if (step === 0 && name.trim().length < 4) { setNameError("Name the rule (at least 4 characters) — it appears in the audit log."); return; }
                  setNameError("");
                  setStep((s) => s + 1);
                }}
              >
                Continue
              </button>
            ) : (
              <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" disabled={busy} onClick={save}>
                {busy ? <><span className="dx-spin"><Zap size={13} /></span> Saving…</> : <><Check size={13} /> Save rule</>}
              </button>
            )}
          </div>
        </div>
      }
    >
      {step === 0 ? (
        <div className="d-grid gap-3">
          <Field label="Rule name" required error={nameError}>
            <input className={`dx-input ${nameError ? "is-invalid" : ""}`} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. London open arm — FX Breakout" />
          </Field>
          <div className="row g-3">
            <div className="col-12 col-sm-6">
              <Field label="Rule type">
                <select className="dx-select" value={kind} onChange={(e) => setKind(e.target.value as AutomationKind)}>
                  <option value="schedule">Schedule — clock / calendar</option>
                  <option value="trigger">Trigger — market event</option>
                  <option value="risk">Risk guard — exposure brake</option>
                  <option value="notification">Notification — alert only</option>
                </select>
              </Field>
            </div>
            <div className="col-12 col-sm-6">
              <Field label="Applies to bot">
                <select className="dx-select" value={botName} onChange={(e) => setBotName(e.target.value)}>
                  {BOTS.map((b) => <option key={b.id} value={b.name}>{b.name} · {b.symbol}</option>)}
                </select>
              </Field>
            </div>
            <div className="col-12">
              <Field label="Trigger" help="Schedules use UTC. Triggers evaluate on every tick for the bot's symbol.">
                <input className="dx-input" value={trigger} onChange={(e) => setTrigger(e.target.value)} />
              </Field>
            </div>
          </div>
          <div className="dx-quick-btns">
            {["Weekdays 07:00 UTC", "Every 1,000 ticks", "3 consecutive losses", "Basket P&L reaches +12%", "Margin usage above 70%"].map((t) => (
              <button key={t} type="button" className={`dx-filter-chip ${trigger === t ? "is-active" : ""}`} onClick={() => setTrigger(t)}>{t}</button>
            ))}
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="d-grid gap-3">
          <Field label="Condition (all must hold)" help="Leave as 'always' for unconditional rules — risk guards usually add at least one exposure check.">
            <input className="dx-input" value={condition} onChange={(e) => setCondition(e.target.value)} />
          </Field>
          <div className="dx-quick-btns">
            {["Always", "Open stake would exceed cap", "At least 1 open leg", "Release within ±30 minutes", "Realised vol above 2x mean"].map((t) => (
              <button key={t} type="button" className={`dx-filter-chip ${condition === t ? "is-active" : ""}`} onClick={() => setCondition(t)}>{t}</button>
            ))}
          </div>
          <Alert tone="info" title="Evaluation order">
            The engine checks the trigger, then every condition, then the risk caps — in that order, on the same tick. A failed
            risk cap always wins over a firing trigger.
          </Alert>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="d-grid gap-3">
          <Field label="Action" help="Risk guards pause or stop workers; notifications never touch orders.">
            <input className="dx-input" value={action} onChange={(e) => setAction(e.target.value)} />
          </Field>
          <div className="row g-3">
            {[
              { k: "Rule", v: name || "Untitled rule" },
              { k: "Type / bot", v: `${kind} · ${botName}` },
              { k: "Trigger", v: trigger },
              { k: "Condition", v: condition },
            ].map((row) => (
              <div className="col-6" key={row.k}>
                <div className="dx-card-inset"><div className="dx-kpi-label">{row.k}</div><div className="fw-semibold" style={{ fontSize: "0.84rem" }}>{row.v}</div></div>
              </div>
            ))}
          </div>
          <Alert tone="up" title="Saved enabled">
            The rule starts enabled and appears in the automation table below with its fire count and audit history.
          </Alert>
        </div>
      ) : null}
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// 4 · Risk policy dialog (tabs) · 5 · Alert rules dialog
// -----------------------------------------------------------------------------
export function RiskPolicyDialog({ open, onClose, onOpenAlertRules }: { open: boolean; onClose: () => void; onOpenAlertRules: () => void }) {
  const [tab, setTab] = useState("caps");
  const [saved, setSaved] = useState(false);
  const [maxOpen, setMaxOpen] = useState(4);
  const [dailyStop, setDailyStop] = useState(250);
  const [exposureCap, setExposureCap] = useState(400);
  const [autoPause, setAutoPause] = useState(true);
  const [killArmed, setKillArmed] = useState(true);

  if (!open) return null;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Risk policy"
      subtitle="Account-wide guards. Bots inherit these unless a stricter per-bot cap applies — the stricter cap always wins."
      footer={
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 w-100">
          <span className="dx-help">{saved ? "Policy saved — workers picked it up on the next tick." : "Changes apply on the next tick after saving."}</span>
          <div className="d-flex gap-2">
            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={onOpenAlertRules}><Bell size={13} /> Alert rules</button>
            <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => setSaved(true)}>
              {saved ? <><Check size={13} /> Saved</> : "Save policy"}
            </button>
          </div>
        </div>
      }
    >
      <Tabs tabs={[{ id: "caps", label: "Exposure caps" }, { id: "stops", label: "Stop-outs" }, { id: "audit", label: "Audit" }]} active={tab} onChange={setTab} className="mb-4" />
      {tab === "caps" ? (
        <div className="d-grid gap-3">
          <div className="row g-3">
            <div className="col-12 col-sm-4">
              <Field label="Max open contracts"><input className="dx-input dx-input-num" type="number" min={1} max={20} value={maxOpen} onChange={(e) => setMaxOpen(Number(e.target.value))} /></Field>
            </div>
            <div className="col-12 col-sm-4">
              <Field label="Daily stop-loss (USD)"><input className="dx-input dx-input-num" type="number" min={10} value={dailyStop} onChange={(e) => setDailyStop(Number(e.target.value))} /></Field>
            </div>
            <div className="col-12 col-sm-4">
              <Field label="Total exposure cap (USD)"><input className="dx-input dx-input-num" type="number" min={10} value={exposureCap} onChange={(e) => setExposureCap(Number(e.target.value))} /></Field>
            </div>
          </div>
          <Meter label="Open stake vs exposure cap" value={Math.min(100, (286 / Math.max(1, exposureCap)) * 100)} display={`$286 of ${usd(exposureCap, 0)}`} />
          <Meter label="Today's loss vs daily stop" value={Math.min(100, (42 / Math.max(1, dailyStop)) * 100)} display={`-$42 of ${usd(dailyStop, 0)}`} />
          <Toggle checked={autoPause} onChange={setAutoPause} label="Auto-pause on cap breach" hint="The breaching bot pauses and you get exactly one notification — no force-close." />
        </div>
      ) : null}
      {tab === "stops" ? (
        <div className="d-grid gap-3">
          <Toggle checked={killArmed} onChange={setKillArmed} label="Kill switch armed" hint="Closes every bot and copied leg at market within one tick. Your manual positions are untouched." />
          <Alert tone="warn" title="Multiplier stop-outs">
            Multiplier contracts can lose more than the stake if no stop-out is set. DerivX refuses to deploy a multiplier bot
            without a stop-out at or below the stake.
          </Alert>
          <div className="dx-card-inset">
            <div className="dx-kpi-label">Current multiplier exposure</div>
            <div className="font-display fw-semibold">2 legs · {usd(210)} stake · stop-outs set on both</div>
          </div>
        </div>
      ) : null}
      {tab === "audit" ? (
        <div className="d-grid gap-2">
          {[
            "11:26:04 · risk.assert passed · Vol10 Martingale Core leg 4 ($22.05 ≤ $50 cap)",
            "11:18:41 · exposure check passed · FX London Breakout ($150 ≤ $400 cap)",
            "10:52:17 · BREACH blocked · Vol100 Night Shift would exceed $120 ladder cap — bot paused",
            "09:30:00 · daily DCA leg opened · Index DCA Basket (+$20, 3 of 4 legs)",
          ].map((line) => (
            <div key={line} className="dx-list-row"><span className="dx-dot dx-dot-info" /><span className="font-display" style={{ fontSize: "0.76rem" }}>{line}</span></div>
          ))}
        </div>
      ) : null}
    </Dialog>
  );
}

export function AlertRulesDialog({
  open,
  onClose,
  onNewRule,
}: {
  open: boolean;
  onClose: () => void;
  onNewRule: () => void;
}) {
  const [channels, setChannels] = useState({ inApp: true, email: true, push: false });
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(AUTOMATION_RULES.filter((r) => r.kind === "notification").map((r) => [r.id, r.status === "enabled"])),
  );
  const rows = AUTOMATION_RULES.filter((r) => r.kind === "notification");
  if (!open) return null;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Notification rules"
      subtitle="One alert per event, batched where it helps. Notifications never place or close orders."
      footer={
        <div className="d-flex flex-wrap gap-2 w-100 justify-content-between">
          <span className="dx-help">{rows.filter((r) => enabled[r.id]).length} of {rows.length} alert rules on</span>
          <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={onNewRule}><Bell size={13} /> New alert rule</button>
        </div>
      }
    >
      <div className="d-grid gap-3">
        <div className="row g-3">
          {([
            { id: "inApp" as const, label: "In-app", hint: "Bell + activity feed inside DerivX" },
            { id: "email" as const, label: "Email digest", hint: "Batched every 15 minutes, critical events instant" },
            { id: "push" as const, label: "Push", hint: "Browser push for pauses and margin warnings" },
          ]).map((ch) => (
            <div className="col-12 col-sm-4" key={ch.id}>
              <div className="dx-card-inset h-100">
                <Toggle checked={channels[ch.id]} onChange={(v) => setChannels((c) => ({ ...c, [ch.id]: v }))} label={ch.label} hint={ch.hint} />
              </div>
            </div>
          ))}
        </div>
        {rows.map((r) => (
          <div key={r.id} className="dx-list-row">
            <span className="flex-grow-1 min-w-0">
              <span className="d-block fw-semibold" style={{ fontSize: "0.86rem" }}>{r.name}</span>
              <span className="dx-help d-block text-truncate">{r.trigger} → {r.action} · fired {r.fires30d}x in 30d</span>
            </span>
            <Toggle checked={Boolean(enabled[r.id])} onChange={(v) => setEnabled((s) => ({ ...s, [r.id]: v }))} label={enabled[r.id] ? "On" : "Off"} />
          </div>
        ))}
      </div>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// 6 · Contract detail · 7 · Comparison detail
// -----------------------------------------------------------------------------
export function ContractDetailDialog({
  contractId,
  onClose,
  onTrade,
  onOpenInstrument,
}: {
  contractId: ContractTypeId | null;
  onClose: () => void;
  onTrade: () => void;
  onOpenInstrument: (code: string) => void;
}) {
  const [period, setPeriod] = useState("ticks");
  if (!contractId) return null;
  const ct = CONTRACT_TYPE_MAP[contractId];
  const symbols = MARKET_SYMBOLS.filter((s) => s.contractTypes.includes(contractId));
  return (
    <Dialog
      open={Boolean(contractId)}
      onClose={onClose}
      size="lg"
      title={ct.label}
      subtitle={ct.blurb}
      footer={
        <div className="d-flex flex-wrap gap-2 w-100 justify-content-between">
          <span className="dx-help font-display">Barrier: {ct.barrier}</span>
          <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={onTrade}>Trade {ct.label} in the console</button>
        </div>
      }
    >
      <div className="d-grid gap-3">
        <MiniTabs
          options={ct.units.map((u) => ({ id: u, label: u }))}
          value={period}
          onChange={setPeriod}
          ariaLabel="Duration units"
        />
        <div className="row g-3">
          {[
            { k: "Duration range", v: `${ct.minDuration}–${ct.maxDuration} ${period}` },
            { k: "Payout range", v: `${ct.payoutLow}% – ${ct.payoutHigh}%` },
            { k: "Barrier model", v: ct.barrier },
            { k: "Symbols offered", v: `${symbols.length} of ${MARKET_SYMBOLS.length}` },
          ].map((row) => (
            <div className="col-6" key={row.k}>
              <div className="dx-card-inset"><div className="dx-kpi-label">{row.k}</div><div className="font-display fw-semibold">{row.v}</div></div>
            </div>
          ))}
        </div>
        <div>
          <div className="dx-kpi-label mb-2">Offered on (tap for live pricing)</div>
          <div className="d-flex flex-wrap gap-2">
            {symbols.slice(0, 10).map((s) => (
              <button key={s.code} type="button" className="dx-filter-chip" onClick={() => onOpenInstrument(s.code)}>
                <span className="font-display">{s.code}</span>
              </button>
            ))}
            {symbols.length > 10 ? <Chip tone="muted">+{symbols.length - 10} more in the markets table</Chip> : null}
          </div>
        </div>
        <Alert tone="info" title="Proposal before purchase">
          Every {ct.label} ticket shows payout, entry spot and barrier from Deriv's <em>proposal</em> response before you confirm —
          the buy only fires after your explicit confirmation.
        </Alert>
      </div>
    </Dialog>
  );
}

export function ComparisonDetailDialog({
  row,
  onClose,
  onOpenPricing,
  onOpenOAuth,
}: {
  row: ComparisonRow | null;
  onClose: () => void;
  onOpenPricing: () => void;
  onOpenOAuth: () => void;
}) {
  if (!row) return null;
  const cells: { platform: string; value: ComparisonRow["derivx"]; highlight?: boolean }[] = [
    { platform: "DerivX", value: row.derivx, highlight: true },
    { platform: "Deriv Native", value: row.deriv },
    { platform: "BMX Bot", value: row.bmx },
    { platform: "Other bots", value: row.other },
  ];
  return (
    <Dialog
      open={Boolean(row)}
      onClose={onClose}
      size="md"
      title={row.feature}
      subtitle={`${row.category} · ${row.note}`}
      footer={
        <div className="d-flex flex-wrap gap-2 w-100 justify-content-between">
          <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={onOpenPricing}>See plans</button>
          <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={onOpenOAuth}>Connect to Deriv</button>
        </div>
      }
    >
      <div className="d-grid gap-3">
        <p className="dx-text-dim mb-0" style={{ fontSize: "0.88rem" }}>{row.detail}</p>
        <div className="d-grid gap-2">
          {cells.map((c) => (
            <div key={c.platform} className={`dx-list-row ${c.highlight ? "dx-card-live" : ""}`}>
              <span className="fw-semibold flex-grow-1">{c.platform}</span>
              <ComparisonCellView value={c.value} />
            </div>
          ))}
        </div>
      </div>
    </Dialog>
  );
}

export function ComparisonCellView({ value }: { value: ComparisonRow["derivx"] }) {
  if (value === "yes") return <Chip tone="up"><Check size={12} /> Included</Chip>;
  if (value === "partial") return <Chip tone="warn">Partial</Chip>;
  if (value === "no") return <Chip tone="down">Not offered</Chip>;
  return <Chip tone="accent">{value}</Chip>;
}

// -----------------------------------------------------------------------------
// 8 · Bot detail drawer (logs, params, trades, pause/stop with confirm)
// -----------------------------------------------------------------------------
export function BotDetailDrawer({
  bot,
  onClose,
  onBacktest,
  onClone,
  onToggleStatus,
}: {
  bot: Bot | null;
  onClose: () => void;
  onBacktest: (presetId?: string) => void;
  onClone: (bot: Bot) => void;
  onToggleStatus: (bot: Bot, next: Bot["status"]) => void;
}) {
  const [tab, setTab] = useState("overview");
  const [confirmStop, setConfirmStop] = useState(false);
  if (!bot) return null;
  const trades = TRADES.filter((t) => t.botId === bot.id);
  const fallbackTrades = trades.length ? trades : TRADES.filter((t) => t.symbol === bot.symbol).slice(0, 5);
  const logs = [
    `${bot.name} · worker eu-west-3 · login ${bot.loginId}`,
    `[tick] ${bot.symbol} stream healthy · median latency 12 ms`,
    `[proposal] ${CONTRACT_TYPE_MAP[bot.contractType].label} ${usd(bot.stake)} / ${fmtDur(bot.duration, bot.durationUnit)} → payout quoted`,
    `[risk] stake cap ${usd(bot.maxStake)} · stop-loss ${usd(bot.stopLoss)} · take-profit ${usd(bot.takeProfit)}`,
    bot.status === "error" ? "[ERROR] ladder cap reached — worker paused by the risk engine" : `[state] ${bot.status} · ${bot.trades} contracts settled · win rate ${bot.winRate}%`,
  ];
  return (
    <>
      <Drawer
        open={Boolean(bot)}
        onClose={onClose}
        wide
        title={bot.name}
        subtitle={`${bot.symbol} · ${CONTRACT_TYPE_MAP[bot.contractType].label} · owner ${bot.owner} · ${bot.loginId}`}
        footer={
          <div className="d-flex flex-wrap gap-2 w-100">
            {bot.status === "running" ? (
              <button type="button" className="dx-btn dx-btn-ghost" onClick={() => onToggleStatus(bot, "paused")}><Pause size={14} /> Pause</button>
            ) : (
              <button type="button" className="dx-btn" onClick={() => onToggleStatus(bot, "running")}><Play size={14} /> Resume</button>
            )}
            <button type="button" className="dx-btn dx-btn-ghost" onClick={() => onBacktest(bot.id)}>Backtest</button>
            <button type="button" className="dx-btn dx-btn-ghost" onClick={() => onClone(bot)}>Clone as new bot</button>
            <button type="button" className="dx-btn dx-btn-danger ms-auto" onClick={() => setConfirmStop(true)}>Stop bot</button>
          </div>
        }
      >
        <Tabs tabs={[{ id: "overview", label: "Overview" }, { id: "logs", label: "Worker log" }, { id: "trades", label: "Settled trades", badge: fallbackTrades.length }]} active={tab} onChange={setTab} className="mb-4" />
        {tab === "overview" ? (
          <div className="d-grid gap-3">
            <div className="row g-3">
              {[
                { k: "Status", v: bot.status },
                { k: "Session P&L", v: pnl(bot.pnl) },
                { k: "Win rate", v: pct(bot.winRate, 1) },
                { k: "Contracts", v: `${bot.trades}` },
                { k: "Stake / duration", v: `${usd(bot.stake)} · ${fmtDur(bot.duration, bot.durationUnit)}` },
                { k: "Risk", v: bot.risk },
              ].map((row) => (
                <div className="col-6" key={row.k}>
                  <div className="dx-card-inset"><div className="dx-kpi-label">{row.k}</div><div className="font-display fw-semibold">{row.v}</div></div>
                </div>
              ))}
            </div>
            <Sparkline data={equityCurve(28, bot.trades + 17, 400, bot.pnl >= 0 ? 5 : -4)} tone={bot.pnl >= 0 ? "accent" : "down"} height={64} ariaLabel={`${bot.name} equity trend`} />
            <Meter label="Stop-loss usage" value={Math.min(100, (Math.abs(Math.min(0, bot.pnl)) / Math.max(1, bot.stopLoss)) * 100)} display={`${usd(Math.abs(Math.min(0, bot.pnl)))} of ${usd(bot.stopLoss)}`} />
            <Alert tone={bot.status === "error" ? "warn" : "info"} title={bot.status === "error" ? "Paused by the risk engine" : "Engine guards active"}>
              Stake cap {usd(bot.maxStake)}, stop-loss {usd(bot.stopLoss)} and take-profit {usd(bot.takeProfit)} are checked before
              every proposal. Last contract {timeAgo(bot.lastTradeAt)}.
            </Alert>
          </div>
        ) : null}
        {tab === "logs" ? <TerminalPreview lines={logs} height={240} /> : null}
        {tab === "trades" ? (
          <div className="dx-table-wrap">
            <table className="dx-table dx-table-sm dx-table-stack">
              <thead><tr><th scope="col">Contract</th><th scope="col">Direction</th><th scope="col" className="dx-td-num">Stake</th><th scope="col" className="dx-td-num">Profit</th><th scope="col">Result</th></tr></thead>
              <tbody>
                {fallbackTrades.map((t) => (
                  <tr key={t.id}>
                    <td data-label="Contract" className="font-display">{t.contractId}</td>
                    <td data-label="Direction">{t.direction} · {fmtDur(t.duration, t.durationUnit)}</td>
                    <td data-label="Stake" className="dx-td-num font-display">{usd(t.stake)}</td>
                    <td data-label="Profit" className="dx-td-num"><span className={t.profit >= 0 ? "dx-up" : "dx-down"}>{pnl(t.profit)}</span></td>
                    <td data-label="Result"><Chip tone={t.status === "won" ? "up" : t.status === "lost" ? "down" : "muted"}>{t.status}</Chip></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Drawer>

      <Dialog
        open={confirmStop}
        onClose={() => setConfirmStop(false)}
        size="sm"
        title={`Stop ${bot.name}?`}
        subtitle="Open contracts settle on Deriv as normal — stopping only prevents new proposals."
        footer={
          <div className="d-flex gap-2 w-100 justify-content-end">
            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setConfirmStop(false)}>Keep running</button>
            <button
              type="button"
              className="dx-btn dx-btn-sm dx-btn-danger"
              onClick={() => { setConfirmStop(false); onToggleStatus(bot, "stopped"); onClose(); }}
            >
              Stop bot
            </button>
          </div>
        }
      >
        <Alert tone="warn" title="This halts new entries immediately">
          The worker stops requesting proposals on {bot.symbol}. Settled history, logs and parameters are kept so you can clone
          or restart the bot later.
        </Alert>
      </Dialog>
    </>
  );
}

// -----------------------------------------------------------------------------
// 9 · Automation rule drawer · 10 · Script template drawer
// -----------------------------------------------------------------------------
export function AutomationDrawer({
  rule,
  onClose,
  onEdit,
  onToggle,
  onDelete,
}: {
  rule: AutomationRule | null;
  onClose: () => void;
  onEdit: (rule: AutomationRule) => void;
  onToggle: (rule: AutomationRule) => void;
  onDelete: (rule: AutomationRule) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (!rule) return null;
  const history = [
    `${timeAgo(rule.lastFiredAt)} · fired · ${rule.action}`,
    "2d ago · fired · conditions held for 3 consecutive ticks",
    "5d ago · skipped · risk cap check failed first (by design)",
    "9d ago · fired · logged to audit trail #A-" + rule.id.slice(-4).toUpperCase(),
  ];
  return (
    <>
      <Drawer
        open={Boolean(rule)}
        onClose={onClose}
        title={rule.name}
        subtitle={`${rule.kind} · ${rule.botName} · ${rule.symbol} · ${rule.loginId}`}
        footer={
          <div className="d-flex flex-wrap gap-2 w-100">
            <button type="button" className="dx-btn dx-btn-ghost" onClick={() => onEdit(rule)}><Sliders size={14} /> Edit rule</button>
            <button type="button" className="dx-btn" onClick={() => onToggle(rule)}>
              {rule.status === "enabled" ? <><Pause size={14} /> Pause rule</> : <><Play size={14} /> Enable rule</>}
            </button>
            <button type="button" className="dx-btn dx-btn-danger ms-auto" onClick={() => setConfirmDelete(true)}><Trash2 size={14} /> Delete</button>
          </div>
        }
      >
        <div className="d-grid gap-3">
          <div className="row g-3">
            {[
              { k: "Status", v: rule.status },
              { k: "Fires (30d)", v: `${rule.fires30d}` },
              { k: "Last fired", v: timeAgo(rule.lastFiredAt) },
              { k: "Account", v: rule.loginId },
            ].map((row) => (
              <div className="col-6" key={row.k}>
                <div className="dx-card-inset"><div className="dx-kpi-label">{row.k}</div><div className="font-display fw-semibold">{row.v}</div></div>
              </div>
            ))}
          </div>
          <div className="dx-card-inset">
            <div className="dx-kpi-label">Trigger → condition → action</div>
            <p className="mb-1 mt-2" style={{ fontSize: "0.86rem" }}><strong>When</strong> <span className="font-display">{rule.trigger}</span></p>
            <p className="mb-1" style={{ fontSize: "0.86rem" }}><strong>If</strong> {rule.condition}</p>
            <p className="mb-0" style={{ fontSize: "0.86rem" }}><strong>Then</strong> {rule.action}</p>
          </div>
          <div>
            <div className="dx-kpi-label mb-2">Fire history</div>
            <div className="d-grid gap-2">
              {history.map((h) => (
                <div key={h} className="dx-list-row"><span className="dx-dot dx-dot-info" /><span style={{ fontSize: "0.82rem" }}>{h}</span></div>
              ))}
            </div>
          </div>
        </div>
      </Drawer>

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        size="sm"
        title={`Delete ${rule.name}?`}
        subtitle="The bot itself keeps running — only this rule stops evaluating."
        footer={
          <div className="d-flex gap-2 w-100 justify-content-end">
            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setConfirmDelete(false)}>Keep rule</button>
            <button type="button" className="dx-btn dx-btn-sm dx-btn-danger" onClick={() => { setConfirmDelete(false); onDelete(rule); onClose(); }}>
              Delete rule
            </button>
          </div>
        }
      >
        <Alert tone="warn" title="Audit history is kept">
          Past firings stay in the audit log for reconciliation. Deleting a risk guard is itself recorded as an audit event.
        </Alert>
      </Dialog>
    </>
  );
}

export function ScriptTemplateDrawer({
  template,
  onClose,
  onOpenStudio,
  onBacktestTemplate,
}: {
  template: ScriptTemplate | null;
  onClose: () => void;
  onOpenStudio: (template: ScriptTemplate) => void;
  onBacktestTemplate: (template: ScriptTemplate) => void;
}) {
  if (!template) return null;
  return (
    <Drawer
      open={Boolean(template)}
      onClose={onClose}
      wide
      title={template.name}
      subtitle={`${template.symbol} · ${CONTRACT_TYPE_MAP[template.contractType].label} · ${template.difficulty} · ${template.category}`}
      footer={
        <div className="d-flex flex-wrap gap-2 w-100">
          <button type="button" className="dx-btn dx-btn-primary flex-grow-1" onClick={() => onOpenStudio(template)}>
            <Code2 size={14} /> Open in script studio
          </button>
          <button type="button" className="dx-btn dx-btn-ghost" onClick={() => onBacktestTemplate(template)}>Backtest first</button>
        </div>
      }
    >
      <div className="d-grid gap-3">
        <p className="dx-text-dim mb-0" style={{ fontSize: "0.88rem" }}>{template.description}</p>
        <div className="row g-3">
          {[
            { k: "Community uses", v: template.uses.toLocaleString("en-US") },
            { k: "Rating", v: `${template.rating} / 5` },
            { k: "Lines of code", v: `${template.lines}` },
            { k: "Default symbol", v: template.symbol },
          ].map((row) => (
            <div className="col-6" key={row.k}>
              <div className="dx-card-inset"><div className="dx-kpi-label">{row.k}</div><div className="font-display fw-semibold">{row.v}</div></div>
            </div>
          ))}
        </div>
        <Meter label="Community rating" value={(template.rating / 5) * 100} display={`${template.rating} / 5`} />
        <div className="d-flex flex-wrap gap-2">
          {template.tags.map((t) => <Chip key={t} tone="muted">{t}</Chip>)}
        </div>
        <CodeBlock code={template.code} maxHeight={260} />
        <div className="d-flex flex-wrap gap-2">
          <CopyButton text={template.code} label="Copy template code" />
          <Chip tone="info"><ShieldCheck size={12} /> Sandbox-safe · no network calls</Chip>
        </div>
      </div>
    </Drawer>
  );
}
export function ContractTypeLabel({ id }: { id: ContractTypeId }) {
  return <>{CONTRACT_TYPE_MAP[id].label}</>;
}

// Shared helpers for sections (kept here so section + dialog agree).
export function botStatusChip(status: Bot["status"]) {
  if (status === "running") return <Chip tone="up" pulse>running</Chip>;
  if (status === "paused") return <Chip tone="warn">paused</Chip>;
  if (status === "error") return <Chip tone="down">error</Chip>;
  return <Chip tone="muted">stopped</Chip>;
}

export function ruleKindLabel(kind: AutomationKind) {
  return kind === "schedule" ? "Schedule" : kind === "trigger" ? "Trigger" : kind === "risk" ? "Risk guard" : "Notification";
}
