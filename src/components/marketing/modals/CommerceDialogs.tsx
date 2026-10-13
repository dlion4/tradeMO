// =============================================================================
// CommerceDialogs.tsx — H-1 commercial overlay pack: pricing plans + checkout
// wizard, strategy preset library + deploy wizard, backtest runner.
// =============================================================================
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Check,
  CreditCard,
  Gauge,
  Play,
  Rocket,
  ShieldCheck,
  Sliders,
  Sparkles,
} from "lucide-react";
import {
  Alert,
  Chip,
  Dialog,
  Field,
  FilterChips,
  Meter,
  MiniTabs,
  Progress,
  SearchInput,
  SectionHead,
  Stepper,
  Tabs,
  Toggle,
  useInterval,
} from "../../ui/primitives";
import { Column, DataTable, useDataTable } from "../../ui/data-table";
import { BarSeries, DonutStat, LineChart } from "../../ui/charts";
import {
  BACKTESTS,
  BOTS,
  DERIV_ACCOUNTS,
  PLANS,
  STRATEGY_PRESETS,
  equityCurve,
  type Plan,
  type StrategyPreset,
} from "../../../data/trading";
import {
  CONTRACT_TYPES,
  MARKET_SYMBOLS,
  SYMBOL_MAP,
  fmtDur,
  fmtDurLong,
  pct,
  payoutFor,
  pnl,
  usd,
  type DurationUnit,
} from "../../../data/market";

// -----------------------------------------------------------------------------
// Deploy wizard — reused by presets dialog, backtest results and the console
// -----------------------------------------------------------------------------
export function DeployBotWizard({
  open,
  onClose,
  preset,
  onDeployed,
}: {
  open: boolean;
  onClose: () => void;
  preset: StrategyPreset | null;
  onDeployed: (name: string, stake: number, cap: number) => void;
}) {
  const [step, setStep] = useState(0);
  const [stake, setStake] = useState(preset?.stake ?? 1);
  const [duration, setDuration] = useState(preset?.duration ?? 5);
  const [unit, setUnit] = useState<DurationUnit>(preset?.durationUnit ?? "ticks");
  const [maxStake, setMaxStake] = useState((preset?.stake ?? 1) * 20);
  const [stopLoss, setStopLoss] = useState(150);
  const [account, setAccount] = useState(DERIV_ACCOUNTS[1].loginId);
  const [autoRestart, setAutoRestart] = useState(true);
  const [alertOn, setAlertOn] = useState(true);
  const [busy, setBusy] = useState(false);

  const steps = [
    { id: "params", label: "Parameters" },
    { id: "risk", label: "Risk caps" },
    { id: "deploy", label: "Deploy" },
  ];

  if (!preset) return null;

  const payoutPct = SYMBOL_MAP[preset.symbol]?.payoutPct ?? 95;
  const projected = payoutFor(stake, payoutPct) - stake;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={`Deploy “${preset.name}”`}
      subtitle={`${preset.symbol} · ${preset.contractType.replace(/_/g, "/")} · ${preset.difficulty} · backtest win rate ${preset.winRate}%`}
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
              <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => setStep((s) => s + 1)}>
                Continue
              </button>
            ) : (
              <button
                type="button"
                className="dx-btn dx-btn-sm dx-btn-primary"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  window.setTimeout(() => {
                    setBusy(false);
                    onDeployed(preset.name, stake, maxStake);
                    onClose();
                  }, 1400);
                }}
              >
                {busy ? (
                  <>
                    <span className="dx-spin">
                      <Rocket size={13} />
                    </span>{" "}
                    Provisioning worker…
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
        <div className="d-grid gap-4">
          <div className="row g-3">
            <div className="col-12 col-sm-4">
              <Field label="Base stake (USD)" help={`Minimum ${usd(SYMBOL_MAP[preset.symbol]?.minStake ?? 0.35)} on this symbol.`}>
                <input
                  className="dx-input dx-input-num"
                  type="number"
                  min={0.35}
                  step={0.35}
                  value={stake}
                  onChange={(e) => setStake(Math.max(0.35, Number(e.target.value)))}
                />
              </Field>
            </div>
            <div className="col-12 col-sm-4">
              <Field label="Duration">
                <input
                  className="dx-input dx-input-num"
                  type="number"
                  min={1}
                  value={duration}
                  onChange={(e) => setDuration(Math.max(1, Number(e.target.value)))}
                />
              </Field>
            </div>
            <div className="col-12 col-sm-4">
              <Field label="Unit">
                <select className="dx-select" value={unit} onChange={(e) => setUnit(e.target.value as DurationUnit)}>
                  {["ticks", "seconds", "minutes", "hours", "days"].map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
          <div className="dx-quick-btns">
            {[0.35, 1, 5, 10, 25, 50].map((s) => (
              <button key={s} type="button" className={`dx-filter-chip ${stake === s ? "is-active" : ""}`} onClick={() => setStake(s)}>
                ${s}
              </button>
            ))}
          </div>
          <div className="row g-3">
            <div className="col-6">
              <div className="dx-card-inset">
                <div className="dx-kpi-label">At these settings</div>
                <div className="font-display fw-semibold">{fmtDurLong(duration, unit)}</div>
                <div className="dx-help">
                  projected win {usd(projected)} on a {payoutPct}% payout
                </div>
              </div>
            </div>
            <div className="col-6">
              <div className="dx-card-inset">
                <div className="dx-kpi-label">Backtest reference</div>
                <div className="font-display fw-semibold">{pct(preset.winRate, 1)} win</div>
                <div className="dx-help">avg {pnl(preset.avgPnl)} per session</div>
              </div>
            </div>
          </div>
          <ul className="dx-help mb-0 ps-3 d-grid gap-1">
            {preset.rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="d-grid gap-4">
          <div className="row g-3">
            <div className="col-12 col-sm-6">
              <Field label="Maximum stake per leg (USD)" help="Hard ceiling — any order above this is rejected.">
                <input
                  className="dx-input dx-input-num"
                  type="number"
                  min={stake}
                  value={maxStake}
                  onChange={(e) => setMaxStake(Math.max(stake, Number(e.target.value)))}
                />
              </Field>
            </div>
            <div className="col-12 col-sm-6">
              <Field label="Stop-loss (USD, realised)" help="Bot pauses when realised loss reaches this value.">
                <input
                  className="dx-input dx-input-num"
                  type="number"
                  min={10}
                  value={stopLoss}
                  onChange={(e) => setStopLoss(Math.max(10, Number(e.target.value)))}
                />
              </Field>
            </div>
          </div>
          <div className="dx-card-inset">
            <Meter
              label="Headroom from base stake to cap"
              value={Math.min(100, (maxStake / (stake * 32)) * 100)}
              display={`${stake.toFixed(2)} → ${maxStake.toFixed(2)}`}
            />
            <p className="dx-help mt-2 mb-0">
              At a {preset.kind === "martingale" ? "2.1× martingale step" : "1.0× flat step"}, this cap allows roughly{" "}
              {Math.max(1, Math.floor(Math.log(maxStake / stake) / Math.log(2.1)))} recovery legs before the engine refuses an order.
            </p>
          </div>
          <div className="row g-3">
            <div className="col-12 col-sm-6">
              <Toggle checked={autoRestart} onChange={setAutoRestart} label="Auto-restart after disconnects" hint="Retries with the same idempotency key." />
            </div>
            <div className="col-12 col-sm-6">
              <Toggle checked={alertOn} onChange={setAlertOn} label="Notify on cap or stop-loss" hint="One notification per event, no repeats." />
            </div>
          </div>
          <Alert tone="warn" title="This bot trades without asking again">
            Once deployed, the worker places contracts on its own until you pause it, the stop-loss fires or the Deriv session ends.
          </Alert>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="d-grid gap-3">
          <div className="row g-3">
            {[
              { k: "Strategy", v: preset.name },
              { k: "Symbol", v: `${preset.symbol} — ${SYMBOL_MAP[preset.symbol]?.name ?? ""}` },
              { k: "Contract", v: preset.contractType.replace(/_/g, "/") },
              { k: "Stake", v: usd(stake) },
              { k: "Duration", v: fmtDur(duration, unit) },
              { k: "Stake cap", v: usd(maxStake) },
              { k: "Stop-loss", v: usd(stopLoss) },
              { k: "Kill behaviour", v: "pause + one notification" },
            ].map((row) => (
              <div className="col-6" key={row.k}>
                <div className="dx-card-inset">
                  <div className="dx-kpi-label">{row.k}</div>
                  <div className="fw-semibold" style={{ fontSize: "0.84rem" }}>
                    {row.v}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Field label="Trading account">
            <select className="dx-select font-display" value={account} onChange={(e) => setAccount(e.target.value)}>
              {DERIV_ACCOUNTS.map((a) => (
                <option key={a.loginId} value={a.loginId}>
                  {a.loginId} — {a.label} · {usd(a.balance)} {a.connected ? "" : "(disconnected)"}
                </option>
              ))}
            </select>
          </Field>
          {(!account || !DERIV_ACCOUNTS.find((a) => a.loginId === account)?.connected) ? (
            <Alert tone="danger" title="Selected account is not connected">
              Pick a connected account or reconnect that connection first — the worker cannot place orders on a closed session.
            </Alert>
          ) : (
            <Alert tone="up" title="Worker lane reserved">
              Isolated queue <span className="font-display">bot-relay-{preset.symbol.length + step}</span> · tick lane 12 ms · idempotent retries enabled.
            </Alert>
          )}
        </div>
      ) : null}
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// Strategy preset library
// -----------------------------------------------------------------------------
export function PresetsDialog({
  open,
  onClose,
  initialPresetId,
  onDeploy,
  onBacktest,
  onOpenFeature,
}: {
  open: boolean;
  onClose: () => void;
  initialPresetId?: string;
  onDeploy: (preset: StrategyPreset) => void;
  onBacktest: (presetId: string) => void;
  onOpenFeature: () => void;
}) {
  const [difficulty, setDifficulty] = useState("all");
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<StrategyPreset | null>(
    initialPresetId ? STRATEGY_PRESETS.find((p) => p.id === initialPresetId) ?? null : null,
  );

  const rows = useMemo(() => {
    let list = STRATEGY_PRESETS;
    if (difficulty !== "all") list = list.filter((p) => p.difficulty === difficulty);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((p) => `${p.name} ${p.symbol} ${p.kind} ${p.description}`.toLowerCase().includes(q));
    }
    return list;
  }, [difficulty, query]);

  const table = useDataTable<StrategyPreset>({
    rows,
    searchKeys: (r) => [r.name, r.symbol, r.kind, r.difficulty],
    sorters: {
      name: (r) => r.name,
      symbol: (r) => r.symbol,
      kind: (r) => r.kind,
      stake: (r) => r.stake,
      winRate: (r) => r.winRate,
      avgPnl: (r) => r.avgPnl,
      risk: (r) => r.risk,
    },
    filterKey: (r) => r.kind,
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
    initialSort: "winRate",
    initialDir: "desc",
  });

  const columns: Column<StrategyPreset>[] = [
    {
      key: "name",
      header: "Preset",
      cell: (r) => (
        <span>
          <span className="d-block fw-semibold" style={{ fontSize: "0.86rem" }}>
            {r.name}
          </span>
          <span className="dx-help">{r.description.slice(0, 58)}…</span>
        </span>
      ),
    },
    { key: "symbol", header: "Symbol", cell: (r) => <span className="font-display">{r.symbol}</span> },
    { key: "kind", header: "Type", cell: (r) => <span className="dx-chip dx-chip-muted">{r.kind}</span>, hideOnMobile: true },
    { key: "stake", header: "Base stake", align: "end", cell: (r) => <span className="font-display">{usd(r.stake)}</span> },
    {
      key: "duration",
      header: "Duration",
      align: "end",
      cell: (r) => <span className="font-display">{fmtDur(r.duration, r.durationUnit)}</span>,
      hideOnMobile: true,
    },
    { key: "winRate", header: "Win rate", align: "end", cell: (r) => <span className="font-display">{r.winRate}%</span> },
    {
      key: "avgPnl",
      header: "Avg P&L",
      align: "end",
      cell: (r) => <span className={`font-display ${r.avgPnl >= 0 ? "dx-up" : "dx-down"}`}>{pnl(r.avgPnl)}</span>,
    },
    {
      key: "risk",
      header: "Risk",
      align: "center",
      cell: (r) => <span className={`dx-chip dx-risk-${r.risk === "low" ? "low" : r.risk === "medium" ? "med" : "high"}`}>{r.risk}</span>,
    },
    {
      header: "Difficulty",
      cell: (r) => <span className="dx-chip dx-chip-info">{r.difficulty}</span>,
      hideOnMobile: true,
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
              setDetail(r);
            }}
          >
            Rules
          </button>
          <button
            type="button"
            className="dx-btn dx-btn-sm dx-btn-primary"
            onClick={(e) => {
              e.stopPropagation();
              onDeploy(r);
            }}
          >
            Deploy
          </button>
        </span>
      ),
    },
  ];

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        size="xl"
        title="Strategy preset library"
        subtitle={`${STRATEGY_PRESETS.length} presets across martingale, DCA, scalping, swing, fixed, accumulator and digit models — each with a reference backtest.`}
        footer={
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 w-100">
            <span className="dx-help">Presets are starting points, not signals. Review the rules and caps before deploying.</span>
            <div className="d-flex gap-2">
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={onOpenFeature}>
                <Sparkles size={13} /> How bots execute
              </button>
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => onBacktest(STRATEGY_PRESETS[0].id)}>
                <BarChart3 size={13} /> Run a backtest
              </button>
              <button type="button" className="dx-btn dx-btn-sm" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        }
      >
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <SearchInput value={query} onChange={setQuery} placeholder="Search presets…" />
            <FilterChips options={table.filterOptions} value={table.filter} onChange={table.setFilter} allLabel="All types" />
          </div>
          <FilterChips
            options={[
              { id: "beginner", label: "Beginner" },
              { id: "intermediate", label: "Intermediate" },
              { id: "advanced", label: "Advanced" },
            ]}
            value={difficulty}
            onChange={setDifficulty}
            allLabel="Any level"
          />
        </div>

        <DataTable
          columns={columns}
          state={table}
          rowKey={(r) => r.id}
          onRowClick={(r) => setDetail(r)}
          ariaLabel="Strategy presets"
        />
      </Dialog>

      <Dialog
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        size="lg"
        title={detail ? detail.name : ""}
        subtitle={detail ? `${detail.symbol} · ${detail.contractType.replace(/_/g, "/")} · ${detail.difficulty}` : ""}
        footer={
          detail ? (
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 w-100">
              <div className="d-flex gap-2">
                <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => onBacktest(detail.id)}>
                  <BarChart3 size={13} /> Backtest 2 years
                </button>
                <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setDetail(null)}>
                  Close
                </button>
              </div>
              <button
                type="button"
                className="dx-btn dx-btn-sm dx-btn-primary"
                onClick={() => {
                  const p = detail;
                  setDetail(null);
                  onDeploy(p);
                }}
              >
                <Rocket size={13} /> Deploy this preset
              </button>
            </div>
          ) : null
        }
      >
        {detail ? (
          <div className="d-grid gap-3">
            <p className="dx-text-dim mb-0" style={{ fontSize: "0.88rem" }}>
              {detail.description}
            </p>
            <div className="row g-3">
              {[
                { k: "Base stake", v: usd(detail.stake) },
                { k: "Duration", v: fmtDur(detail.duration, detail.durationUnit) },
                { k: "Backtest win rate", v: pct(detail.winRate, 1) },
                { k: "Avg session P&L", v: pnl(detail.avgPnl) },
                { k: "Risk band", v: detail.risk },
                { k: "Contract type", v: detail.contractType.replace(/_/g, "/") },
              ].map((row) => (
                <div className="col-6 col-lg-4" key={row.k}>
                  <div className="dx-card-inset">
                    <div className="dx-kpi-label">{row.k}</div>
                    <div className="font-display fw-semibold">{row.v}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="dx-card-inset">
              <div className="dx-kpi-label mb-2">Rules</div>
              <ul className="dx-help mb-0 ps-3 d-grid gap-1">
                {detail.rules.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
            <Alert tone={detail.risk === "high" ? "danger" : detail.risk === "medium" ? "warn" : "up"} title="Risk note">
              {detail.risk === "high"
                ? "Aggressive preset: recovery steps or barrier widths can produce deep drawdowns. Cap the stake hard and never run it on more than one connection."
                : detail.risk === "medium"
                  ? "Moderate preset: expect multi-leg losing sequences. Size the base stake so a full ladder stays inside your daily stop."
                  : "Conservative preset: small per-trade edge with limited downside, best suited to running continuously."}
            </Alert>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}

// -----------------------------------------------------------------------------
// Backtest runner
// -----------------------------------------------------------------------------
export function BacktestDialog({
  open,
  onClose,
  initialPresetId,
  onDeploy,
}: {
  open: boolean;
  onClose: () => void;
  initialPresetId?: string;
  onDeploy: (preset: StrategyPreset) => void;
}) {
  const [presetId, setPresetId] = useState(initialPresetId ?? STRATEGY_PRESETS[0].id);
  const [symbol, setSymbol] = useState("");
  const [period, setPeriod] = useState("2y");
  const [stake, setStake] = useState(0.35);
  const [tab, setTab] = useState("results");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ran, setRan] = useState(false);
  const [spreadCost, setSpreadCost] = useState(true);
  const [slippage, setSlippage] = useState(true);

  const preset = STRATEGY_PRESETS.find((p) => p.id === presetId) ?? STRATEGY_PRESETS[0];
  const effectiveSymbol = symbol || preset.symbol;

  const result = useMemo(() => {
    const base = BACKTESTS.find((b) => b.preset === preset.name) ?? BACKTESTS[0];
    const scale = stake / preset.stake;
    const penalty = (spreadCost ? 0.94 : 1) * (slippage ? 0.97 : 1);
    return {
      ...base,
      pnl: Math.round(base.pnl * scale * penalty * 100) / 100,
      maxDrawdown: Math.round(base.maxDrawdown * scale * 100) / 100,
      trades: Math.round(base.trades),
    };
  }, [preset, stake, spreadCost, slippage]);

  useInterval(
    () => {
      setProgress((p) => {
        if (p >= 100) {
          setRunning(false);
          setRan(true);
          return 100;
        }
        return Math.min(100, p + 9);
      });
    },
    running ? 220 : null,
  );

  const curve = equityCurve(40, preset.name.length * 4243 + stake * 11, 1000, (result.pnl / result.trades) * 8);

  const tradeRows = useMemo(
    () =>
      Array.from({ length: 12 }).map((_, i) => {
        const win = i % 3 !== 2;
        const rowStake = Math.round(stake * (1 + (i % 4) * 0.5) * 100) / 100;
        return {
          id: `bt-row-${i}`,
          n: result.trades - i,
          symbol: effectiveSymbol,
          contractType: preset.contractType,
          stake: rowStake,
          profit: win ? Math.round((payoutFor(rowStake, 94) - rowStake) * 100) / 100 : -rowStake,
          duration: fmtDur(preset.duration, preset.durationUnit),
          ticks: `${5 + i} ticks`,
        };
      }),
    [preset, stake, result.trades, effectiveSymbol],
  );

  const tradeTable = useDataTable<(typeof tradeRows)[number]>({
    rows: tradeRows,
    searchKeys: (r) => [r.symbol, r.contractType],
    sorters: { n: (r) => r.n, stake: (r) => r.stake, profit: (r) => r.profit },
    initialPageSize: 5,
    initialSort: "n",
    initialDir: "desc",
  });

  const columns: Column<(typeof tradeRows)[number]>[] = [
    { key: "n", header: "#", cell: (r) => <span className="font-display">#{r.n}</span> },
    { key: "symbol", header: "Symbol", cell: (r) => <span className="font-display">{r.symbol}</span> },
    { key: "stake", header: "Stake", align: "end", cell: (r) => <span className="font-display">{usd(r.stake)}</span> },
    {
      key: "profit",
      header: "Result",
      align: "end",
      cell: (r) => <span className={`font-display ${r.profit >= 0 ? "dx-up" : "dx-down"}`}>{pnl(r.profit)}</span>,
    },
    { key: "duration", header: "Duration", align: "end", cell: (r) => <span className="font-display">{r.duration}</span>, hideOnMobile: true },
    { header: "Ticks held", cell: (r) => <span className="font-display">{r.ticks}</span>, hideOnMobile: true },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="xl"
      title="Backtest runner"
      subtitle="Replay historical ticks against a preset. Costs are applied when enabled — no look-ahead, no repainting."
      footer={
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 w-100">
          <span className="dx-help">
            {ran ? `Finished: ${result.trades.toLocaleString("en-US")} simulated contracts · ${pct((result.winRate), 1)} win` : "Configure and run to see results"}
          </span>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="dx-btn dx-btn-sm dx-btn-primary"
              onClick={() => {
                setProgress(0);
                setRan(false);
                setRunning(true);
                setTab("results");
              }}
              disabled={running}
            >
              {running ? (
                <>
                  <span className="dx-spin">
                    <Gauge size={13} />
                  </span>{" "}
                  Replaying {progress}%
                </>
              ) : (
                <>
                  <Play size={13} /> {ran ? "Re-run backtest" : "Run backtest"}
                </>
              )}
            </button>
            <button type="button" className="dx-btn dx-btn-sm" onClick={() => onDeploy(preset)} disabled={!ran}>
              <Rocket size={13} /> Deploy preset
            </button>
          </div>
        </div>
      }
    >
      <div className="row g-3 mb-3">
        <div className="col-12 col-sm-6 col-lg-3">
          <Field label="Preset">
            <select className="dx-select" value={presetId} onChange={(e) => setPresetId(e.target.value)}>
              {STRATEGY_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <Field label="Symbol">
            <select className="dx-select font-display" value={effectiveSymbol} onChange={(e) => setSymbol(e.target.value)}>
              {MARKET_SYMBOLS.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="col-6 col-lg-2">
          <Field label="History">
            <select className="dx-select" value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="3m">3 months</option>
              <option value="6m">6 months</option>
              <option value="1y">1 year</option>
              <option value="2y">2 years</option>
            </select>
          </Field>
        </div>
        <div className="col-6 col-lg-2">
          <Field label="Stake">
            <input className="dx-input dx-input-num" type="number" min={0.35} step={0.35} value={stake} onChange={(e) => setStake(Math.max(0.35, Number(e.target.value)))} />
          </Field>
        </div>
        <div className="col-12 col-lg-2">
          <Field label="Contract">
            <select className="dx-select" value={preset.contractType} disabled>
              {CONTRACT_TYPES.filter((c) => c.id === preset.contractType).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-12 col-sm-6">
          <Toggle checked={spreadCost} onChange={setSpreadCost} label="Apply spread cost" hint="Subtracts the quoted spread from every simulated fill." />
        </div>
        <div className="col-12 col-sm-6">
          <Toggle checked={slippage} onChange={setSlippage} label="Apply 3% slippage penalty" hint="Models fills a tick away on fast contracts." />
        </div>
      </div>

      {running ? (
        <div className="mb-3">
          <Progress value={progress} />
          <p className="dx-help mt-2 mb-0">
            Replaying {period} of {effectiveSymbol} ticks · {Math.round((progress / 100) * result.trades).toLocaleString("en-US")} contracts evaluated
          </p>
        </div>
      ) : null}

      <Tabs
        tabs={[
          { id: "results", label: "Results" },
          { id: "trades", label: "Simulated contracts" },
          { id: "params", label: "Parameters" },
        ]}
        active={tab}
        onChange={setTab}
        className="mb-3"
      />

      {tab === "results" ? (
        ran ? (
          <div className="row g-4">
            <div className="col-12 col-lg-8">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div>
                  <div className="dx-kpi-label">Simulated equity</div>
                  <div className="font-display dx-h-card">{usd(1000 + result.pnl)}</div>
                </div>
                <Chip tone={result.pnl >= 0 ? "up" : "down"}>{pnl(result.pnl)}</Chip>
              </div>
              <LineChart data={curve} height={200} yFormat={(v) => usd(v, 0)} ariaLabel="Backtest equity curve" />
            </div>
            <div className="col-12 col-lg-4">
              <div className="row g-3">
                {[
                  { k: "Contracts", v: result.trades.toLocaleString("en-US") },
                  { k: "Win rate", v: pct(result.winRate, 1) },
                  { k: "Max drawdown", v: usd(result.maxDrawdown, 2) },
                  { k: "Sharpe (daily)", v: result.sharpe.toFixed(2) },
                  { k: "Avg duration", v: result.avgDuration },
                  { k: "Period", v: result.period },
                ].map((row) => (
                  <div className="col-6" key={row.k}>
                    <div className="dx-card-inset">
                      <div className="dx-kpi-label">{row.k}</div>
                      <div className="font-display fw-semibold">{row.v}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-12 col-lg-4">
              <div className="dx-card-inset">
                <DonutStat value={result.winRate} label="win rate" sublabel="Across the simulated period with costs applied." />
              </div>
            </div>
            <div className="col-12 col-lg-8">
              <div className="dx-card-inset">
                <div className="dx-kpi-label mb-2">Monthly simulated P&amp;L</div>
                <BarSeries
                  data={curve.slice(-12).map((v, i, arr) => (i === 0 ? 0 : Math.round((v - arr[i - 1]) * 100) / 100))}
                  height={160}
                  format={(v) => usd(v, 0)}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-5">
            <p className="dx-lead mx-auto">
              No run yet. Pick a preset, choose {period} of {effectiveSymbol} history and hit <strong>Run backtest</strong>.
            </p>
            <div className="d-flex justify-content-center gap-2 mt-3">
              <button type="button" className="dx-btn dx-btn-primary" onClick={() => setRunning(true)}>
                <Play size={14} /> Run backtest
              </button>
              <button type="button" className="dx-btn dx-btn-ghost" onClick={() => setTab("params")}>
                Review parameters
              </button>
            </div>
          </div>
        )
      ) : null}

      {tab === "trades" ? (
        <DataTable
          columns={columns}
          state={tradeTable}
          rowKey={(r) => r.id}
          dense
          stacked={false}
          ariaLabel="Simulated contracts"
        />
      ) : null}

      {tab === "params" ? (
        <div className="row g-3">
          {[
            { k: "Preset", v: preset.name },
            { k: "Strategy family", v: preset.kind },
            { k: "Symbol", v: effectiveSymbol },
            { k: "Contract type", v: preset.contractType.replace(/_/g, "/") },
            { k: "Base stake", v: usd(stake) },
            { k: "Duration", v: fmtDur(preset.duration, preset.durationUnit) },
            { k: "History window", v: period },
            { k: "Costs", v: [spreadCost ? "spread" : null, slippage ? "slippage" : null].filter(Boolean).join(" + ") || "none" },
          ].map((row) => (
            <div className="col-6 col-lg-3" key={row.k}>
              <div className="dx-card-inset">
                <div className="dx-kpi-label">{row.k}</div>
                <div className="fw-semibold" style={{ fontSize: "0.84rem" }}>
                  {row.v}
                </div>
              </div>
            </div>
          ))}
          <div className="col-12">
            <Alert tone="info" title="Methodology">
              Ticks are replayed in epoch order with a 1-tick decision delay. Proposals use Deriv's quoted payout percentage for the
              symbol and duration; the result is settled from the following tick. Walk-forward splits are available on the Pro tier.
            </Alert>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// Pricing + checkout wizard
// -----------------------------------------------------------------------------
export function PricingDialog({
  open,
  onClose,
  initialPlanId,
  onOpenFaq,
  onDeployed,
}: {
  open: boolean;
  onClose: () => void;
  initialPlanId?: string;
  onOpenFaq: () => void;
  onDeployed: (planName: string) => void;
}) {
  const [cadence, setCadence] = useState<"monthly" | "yearly">("monthly");
  const [detail, setDetail] = useState<Plan | null>(initialPlanId ? PLANS.find((p) => p.id === initialPlanId) ?? null : null);
  const [checkout, setCheckout] = useState<Plan | null>(null);

  const priceFor = (p: Plan) => {
    if (p.cadence === "forever") return 0;
    return cadence === "yearly" ? Math.round(p.price * 10) : p.price;
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        size="xl"
        title="Pricing & plans"
        subtitle="Flat subscription. No profit share, no per-contract commission, cancel any time."
        footer={
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 w-100">
            <span className="dx-help">Prices in USD. Yearly billing gives two months free.</span>
            <div className="d-flex gap-2">
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={onOpenFaq}>
                Billing FAQ
              </button>
              <button type="button" className="dx-btn dx-btn-sm" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        }
      >
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
          <MiniTabs
            options={[
              { id: "monthly", label: "Monthly" },
              { id: "yearly", label: "Yearly · -17%" },
            ]}
            value={cadence}
            onChange={(v) => setCadence(v as typeof cadence)}
            ariaLabel="Billing cadence"
          />
          <Chip tone="muted">
            <ShieldCheck size={12} /> Free tier needs no card
          </Chip>
        </div>

        <div className="row g-4 row-cols-1 row-cols-md-2 row-cols-xl-4">
          {PLANS.map((p) => (
            <div className="col" key={p.id}>
              <div className={`dx-card dx-card-pad h-100 d-flex flex-column ${p.popular ? "dx-card-live" : ""}`}>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h3 className="dx-h-card">{p.name}</h3>
                  {p.popular ? <Chip tone="up">most popular</Chip> : <Chip tone="muted">{p.tier}</Chip>}
                </div>
                <div className="d-flex align-items-baseline gap-2">
                  <span className="dx-kpi-value">{usd(priceFor(p), 0)}</span>
                  <span className="dx-help">{p.cadence === "forever" ? "forever" : cadence === "yearly" ? "/ year" : "/ month"}</span>
                </div>
                <p className="dx-help mt-2 flex-grow-1">{p.blurb}</p>
                <div className="d-grid gap-2 mb-3">
                  <Meter label="Live bots" value={Math.min(100, (p.bots / 500) * 100)} display={`${p.bots}`} />
                  <Meter label="Connections" value={Math.min(100, (p.connections / 60) * 100)} display={`${p.connections}`} />
                  <Meter label="Backtests / day" value={Math.min(100, (p.backtestsPerDay / 10000) * 100)} display={`${p.backtestsPerDay}`} />
                </div>
                <div className="d-flex gap-2 mt-auto">
                  <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost flex-grow-1" onClick={() => setDetail(p)}>
                    <Sliders size={13} /> Details
                  </button>
                  <button
                    type="button"
                    className={`dx-btn dx-btn-sm ${p.popular ? "dx-btn-primary" : ""}`}
                    onClick={() => (p.price === 0 ? onDeployed(p.name) : setCheckout(p))}
                  >
                    {p.price === 0 ? "Start free" : "Choose"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="dx-table-wrap dx-table-scroll mt-4">
          <table className="dx-table dx-table-sm dx-table-stack">
            <thead>
              <tr>
                <th scope="col">Capability</th>
                {PLANS.map((p) => (
                  <th key={p.id} scope="col" className="dx-td-num">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { k: "Live bots", v: (p: Plan) => `${p.bots}` },
                { k: "Deriv connections", v: (p: Plan) => `${p.connections}` },
                { k: "Backtests per day", v: (p: Plan) => p.backtestsPerDay.toLocaleString("en-US") },
                { k: "Script engine", v: (p: Plan) => (p.tier === "free" ? "—" : "yes") },
                { k: "Copy trading", v: (p: Plan) => (p.tier === "free" ? "—" : p.tier === "pro" ? "5 traders" : "unlimited") },
                { k: "Automation hub", v: (p: Plan) => (["desk", "institutional"].includes(p.tier) ? "yes" : "—") },
                { k: "Investor module", v: (p: Plan) => (p.tier === "institutional" ? "yes" : "—") },
                { k: "Team seats", v: (p: Plan) => (p.tier === "free" || p.tier === "pro" ? "1" : p.tier === "desk" ? "3" : "unlimited") },
                { k: "Statement export", v: (p: Plan) => (p.tier === "free" ? "CSV" : "CSV + PDF") },
                { k: "Yearly price", v: (p: Plan) => (p.price === 0 ? "free" : usd(Math.round(p.price * 10), 0)) },
              ].map((row) => (
                <tr key={row.k}>
                  <td data-label="Capability">{row.k}</td>
                  {PLANS.map((p) => (
                    <td key={p.id} data-label={p.name} className="dx-td-num font-display">
                      {row.v(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Dialog>

      {/* Plan detail */}
      <Dialog
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        size="lg"
        title={detail ? `${detail.name} plan` : ""}
        subtitle={detail ? `${detail.blurb}` : ""}
        footer={
          detail ? (
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 w-100">
              <span className="dx-help">
                {detail.cadence === "forever" ? "No card required" : `${usd(priceFor(detail), 0)} per ${cadence === "yearly" ? "year" : "month"}`}
              </span>
              <div className="d-flex gap-2">
                <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setDetail(null)}>
                  Back to plans
                </button>
                <button
                  type="button"
                  className="dx-btn dx-btn-sm dx-btn-primary"
                  onClick={() => {
                    const p = detail;
                    setDetail(null);
                    if (p.price === 0) onDeployed(p.name);
                    else setCheckout(p);
                  }}
                >
                  {detail.price === 0 ? "Start free" : "Continue to checkout"} <ArrowRight size={13} />
                </button>
              </div>
            </div>
          ) : null
        }
      >
        {detail ? (
          <div className="d-grid gap-3">
            <ul className="list-unstyled d-grid gap-2 mb-0">
              {detail.features.map((f) => (
                <li key={f} className="d-flex gap-2 align-items-start dx-text-dim" style={{ fontSize: "0.86rem" }}>
                  <Check size={14} className="dx-up mt-1" /> {f}
                </li>
              ))}
            </ul>
            <div className="row g-3">
              {[
                { k: "Live bots", v: `${detail.bots}` },
                { k: "Connections", v: `${detail.connections}` },
                { k: "Backtests / day", v: detail.backtestsPerDay.toLocaleString("en-US") },
                { k: "Monthly price", v: usd(detail.price, 0) },
                { k: "Yearly price", v: detail.price === 0 ? "free" : usd(detail.price * 10, 0) },
                { k: "Effective bots cost", v: detail.bots > 0 && detail.price > 0 ? `${usd(detail.price / detail.bots)} / bot` : "free" },
              ].map((row) => (
                <div className="col-6" key={row.k}>
                  <div className="dx-card-inset">
                    <div className="dx-kpi-label">{row.k}</div>
                    <div className="font-display fw-semibold">{row.v}</div>
                  </div>
                </div>
              ))}
            </div>
            <Alert tone="info" title="What happens to my bots if I change tier?">
              Upgrades apply instantly and are pro-rated to the day. Downgrades take effect at the end of the billing period — your
              bots keep running on the current limits until then.
            </Alert>
          </div>
        ) : null}
      </Dialog>

      {/* Checkout wizard */}
      <CheckoutWizard
        plan={checkout}
        cadence={cadence}
        onClose={() => setCheckout(null)}
        onComplete={(plan) => {
          setCheckout(null);
          onDeployed(plan.name);
        }}
      />
    </>
  );
}

function CheckoutWizard({
  plan,
  cadence,
  onClose,
  onComplete,
}: {
  plan: Plan | null;
  cadence: "monthly" | "yearly";
  onClose: () => void;
  onComplete: (plan: Plan) => void;
}) {
  const [step, setStep] = useState(0);
  const [card, setCard] = useState({ name: "", number: "", expiry: "", cvc: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [wallet, setWallet] = useState("card");

  const steps = [
    { id: "billing", label: "Billing" },
    { id: "payment", label: "Payment" },
    { id: "confirm", label: "Confirm" },
  ];

  if (!plan) return null;
  const total = cadence === "yearly" ? plan.price * 10 : plan.price;

  const validate = () => {
    const next: Record<string, string> = {};
    if (wallet === "card") {
      if (card.name.trim().length < 3) next.name = "Name on card is required.";
      if (!/^\d{16}$/.test(card.number.replace(/\s/g, ""))) next.number = "Card number must be 16 digits.";
      if (!/^\d{2}\/\d{2}$/.test(card.expiry)) next.expiry = "Use MM/YY.";
      if (!/^\d{3,4}$/.test(card.cvc)) next.cvc = "CVC must be 3 or 4 digits.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  return (
    <Dialog
      open={Boolean(plan)}
      onClose={onClose}
      size="lg"
      title={`Checkout — ${plan.name}`}
      subtitle={`${cadence === "yearly" ? "Yearly" : "Monthly"} billing · ${usd(total, 0)} per ${cadence === "yearly" ? "year" : "month"} · cancel any time`}
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
                onClick={() => {
                  if (step === 1 && !validate()) return;
                  setStep((s) => s + 1);
                }}
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                className="dx-btn dx-btn-sm dx-btn-primary"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  window.setTimeout(() => {
                    setBusy(false);
                    onComplete(plan);
                  }, 1500);
                }}
              >
                {busy ? (
                  <>
                    <span className="dx-spin">
                      <CreditCard size={13} />
                    </span>{" "}
                    Charging {usd(total, 0)}…
                  </>
                ) : (
                  <>
                    <CreditCard size={13} /> Pay {usd(total, 0)}
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
              <Field label="Account email" required help="Receipts and invoices go here.">
                <input className="dx-input" defaultValue="trader@example.com" />
              </Field>
            </div>
            <div className="col-12 col-sm-6">
              <Field label="Billing country" required>
                <select className="dx-select" defaultValue="NG">
                  <option value="NG">Nigeria</option>
                  <option value="KE">Kenya</option>
                  <option value="ID">Indonesia</option>
                  <option value="GB">United Kingdom</option>
                  <option value="DE">Germany</option>
                </select>
              </Field>
            </div>
          </div>
          <div className="dx-card-inset">
            <div className="d-flex align-items-center justify-content-between">
              <span className="dx-help">Plan</span>
              <span className="font-display">{plan.name}</span>
            </div>
            <div className="d-flex align-items-center justify-content-between">
              <span className="dx-help">Billing cycle</span>
              <span className="font-display">{cadence === "yearly" ? "Annual (2 months free)" : "Monthly"}</span>
            </div>
            <div className="d-flex align-items-center justify-content-between">
              <span className="dx-help">Due today</span>
              <span className="font-display fw-semibold">{usd(total, 0)}</span>
            </div>
            <hr className="dx-hr" />
            <div className="d-flex align-items-center justify-content-between">
              <span className="dx-help">Bot capacity</span>
              <span className="font-display">{plan.bots} live</span>
            </div>
            <div className="d-flex align-items-center justify-content-between">
              <span className="dx-help">Connections</span>
              <span className="font-display">{plan.connections}</span>
            </div>
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="d-grid gap-3">
          <MiniTabs
            options={[
              { id: "card", label: "Card" },
              { id: "wallet", label: "Crypto wallet" },
            ]}
            value={wallet}
            onChange={setWallet}
            ariaLabel="Payment method"
          />
          {wallet === "card" ? (
            <div className="row g-3">
              <div className="col-12">
                <Field label="Name on card" required error={errors.name}>
                  <input
                    className={`dx-input ${errors.name ? "is-invalid" : ""}`}
                    value={card.name}
                    onChange={(e) => setCard({ ...card, name: e.target.value })}
                    placeholder="A. Fashola"
                  />
                </Field>
              </div>
              <div className="col-12">
                <Field label="Card number" required error={errors.number} help="Test data only — nothing is transmitted.">
                  <input
                    className={`dx-input font-display ${errors.number ? "is-invalid" : ""}`}
                    value={card.number}
                    onChange={(e) => setCard({ ...card, number: e.target.value.replace(/[^\d ]/g, "") })}
                    placeholder="4242 4242 4242 4242"
                    inputMode="numeric"
                  />
                </Field>
              </div>
              <div className="col-6">
                <Field label="Expiry" required error={errors.expiry}>
                  <input
                    className={`dx-input font-display ${errors.expiry ? "is-invalid" : ""}`}
                    value={card.expiry}
                    onChange={(e) => setCard({ ...card, expiry: e.target.value })}
                    placeholder="09/28"
                  />
                </Field>
              </div>
              <div className="col-6">
                <Field label="CVC" required error={errors.cvc}>
                  <input
                    className={`dx-input font-display ${errors.cvc ? "is-invalid" : ""}`}
                    value={card.cvc}
                    onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, "") })}
                    placeholder="123"
                  />
                </Field>
              </div>
            </div>
          ) : (
            <div className="d-grid gap-3">
              <Field label="Wallet address" help="USDT / USDC on TRC-20 or ERC-20. Invoice is settled after one confirmation.">
                <input className="dx-input font-display" placeholder="TN9x…4Qd" />
              </Field>
              <Alert tone="info" title="Amount due">
                Send exactly <span className="font-display">{usd(total, 0)}</span> in USDT. Rates are locked for 15 minutes from the
                invoice timestamp.
              </Alert>
            </div>
          )}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="d-grid gap-3">
          <div className="row g-3">
            {[
              { k: "Plan", v: plan.name },
              { k: "Cycle", v: cadence === "yearly" ? "annual" : "monthly" },
              { k: "Amount", v: usd(total, 0) },
              { k: "Method", v: wallet === "card" ? `card ending ${card.number.slice(-4) || "4242"}` : "crypto wallet" },
              { k: "Bots included", v: `${plan.bots}` },
              { k: "Renews", v: cadence === "yearly" ? "2027-10-13" : "2026-11-13" },
            ].map((row) => (
              <div className="col-6" key={row.k}>
                <div className="dx-card-inset">
                  <div className="dx-kpi-label">{row.k}</div>
                  <div className="font-display fw-semibold">{row.v}</div>
                </div>
              </div>
            ))}
          </div>
          <Alert tone="up" title="Your bots keep running">
            Upgrading does not restart running workers. The new limits apply to the next configuration change.
          </Alert>
          <div className="dx-card-inset">
            <div className="dx-kpi-label mb-2">Included in {plan.name}</div>
            <ul className="dx-help mb-0 ps-3 d-grid gap-1">
              {plan.features.slice(0, 4).map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// Small exported helper for the landing page hero stats
// -----------------------------------------------------------------------------
export function planSummary() {
  const paid = PLANS.filter((p) => p.price > 0);
  return {
    cheapest: Math.min(...paid.map((p) => p.price)),
    botsTotal: PLANS.reduce((s, p) => s + p.bots, 0),
    freeTierBots: PLANS[0].bots,
    deployable: BOTS.length,
    sections: CONTRACT_TYPES.length,
  };
}
