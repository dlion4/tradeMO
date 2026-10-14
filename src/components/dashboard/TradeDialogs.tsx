// =============================================================================
// TradeDialogs.tsx — shared D-group trading overlays: the contract ticket
// (proposal → confirm → buy spinner → receipt, the Deriv-style flow), bot
// detail drawer, trade detail drawer and the end-position confirm. Front-end
// only — "orders" resolve in-page against the mock market data.
// =============================================================================
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Pause, Play, Square } from "lucide-react";
import { Alert, Chip, Dialog, Drawer, Field, Meter } from "../ui/primitives";
import {
  CONTRACT_TYPE_MAP,
  DURATION_UNITS,
  MARKET_SYMBOLS,
  SYMBOL_MAP,
  fmtDur,
  fmtPrice,
  usd,
  type ContractTypeId,
  type DurationUnit,
} from "../../data/market";
import type { Bot, Position, Trade } from "../../data/trading";

export interface BoughtReceipt {
  contractId: string;
  symbol: string;
  stake: number;
  payout: number;
}

// -----------------------------------------------------------------------------
// Contract ticket — ticket form → proposal → buying → receipt (one Dialog,
// stage-state machine; mirrors the demo-console trade flow on real D pages)
// -----------------------------------------------------------------------------
export function TradeTicketDialog({
  open,
  onClose,
  initialSymbol = "R_10",
  initialDirection = "rise",
  onBought,
}: {
  open: boolean;
  onClose: () => void;
  initialSymbol?: string;
  initialDirection?: "rise" | "fall";
  onBought: (receipt: BoughtReceipt) => void;
}) {
  const [symbolCode, setSymbolCode] = useState(initialSymbol);
  const [contractType, setContractType] = useState<ContractTypeId>("rise_fall");
  const [direction, setDirection] = useState<"rise" | "fall">(initialDirection);
  const [stake, setStake] = useState(10);
  const [duration, setDuration] = useState(5);
  const [unit, setUnit] = useState<DurationUnit>("ticks");
  const [stage, setStage] = useState<"ticket" | "proposal" | "buying" | "receipt">("ticket");
  const [receipt, setReceipt] = useState<BoughtReceipt | null>(null);
  const [stakeError, setStakeError] = useState("");

  useEffect(() => {
    if (open) {
      setSymbolCode(initialSymbol);
      setDirection(initialDirection);
      setStage("ticket");
      setReceipt(null);
      setStakeError("");
    }
  }, [open, initialSymbol, initialDirection]);

  const symbol = SYMBOL_MAP[symbolCode] ?? MARKET_SYMBOLS[0];
  const typeOptions = useMemo(
    () => MARKET_SYMBOLS.find((s) => s.code === symbolCode)?.contractTypes ?? ["rise_fall" as ContractTypeId],
    [symbolCode],
  );
  const entrySpot = symbol.basePrice;
  const payout = Math.round(stake * (1 + symbol.payoutPct / 100) * 100) / 100;

  const toProposal = () => {
    if (stake < symbol.minStake || stake > symbol.maxStake) {
      setStakeError(`Stake must be between ${usd(symbol.minStake)} and ${usd(symbol.maxStake)} for ${symbol.code}.`);
      return;
    }
    setStakeError("");
    setStage("proposal");
  };

  const buy = () => {
    setStage("buying");
    window.setTimeout(() => {
      const r: BoughtReceipt = {
        contractId: `DX${Math.floor(24000000 + Math.random() * 899999)}`,
        symbol: symbol.code,
        stake,
        payout,
      };
      setReceipt(r);
      setStage("receipt");
      onBought(r);
    }, 900);
  };

  return (
    <Dialog open={open} onClose={onClose} size="md"
      title={stage === "ticket" ? "Contract ticket" : stage === "receipt" ? "Contract bought" : "Review proposal"}
      subtitle={`${symbol.code} · ${symbol.name} · payout ${symbol.payoutPct}%`}
      footer={
        stage === "ticket" ? (
          <>
            <button type="button" className="dx-btn" onClick={onClose}>Cancel</button>
            <button type="button" className="dx-btn dx-btn-primary" onClick={toProposal}>Get proposal</button>
          </>
        ) : stage === "proposal" ? (
          <>
            <button type="button" className="dx-btn" onClick={() => setStage("ticket")}>Back to ticket</button>
            <button type="button" className="dx-btn dx-btn-primary" onClick={buy}>
              Confirm buy · {usd(stake)}
            </button>
          </>
        ) : stage === "buying" ? (
          <button type="button" className="dx-btn" disabled>Placing contract…</button>
        ) : (
          <>
            <button type="button" className="dx-btn" onClick={() => setStage("ticket")}>Trade again</button>
            <button type="button" className="dx-btn dx-btn-primary" onClick={onClose}>Done</button>
          </>
        )
      }>
      {stage === "ticket" ? (
        <div className="d-grid gap-3">
          <div className="row g-2">
            <div className="col-12 col-sm-6">
              <Field label="Symbol">
                <select className="dx-select" value={symbolCode} onChange={(e) => setSymbolCode(e.target.value)} aria-label="Symbol">
                  {MARKET_SYMBOLS.map((s) => (
                    <option key={s.code} value={s.code}>{s.code} — {s.short}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="col-12 col-sm-6">
              <Field label="Contract type">
                <select className="dx-select" value={contractType} onChange={(e) => setContractType(e.target.value as ContractTypeId)} aria-label="Contract type">
                  {typeOptions.map((id) => (
                    <option key={id} value={id}>{CONTRACT_TYPE_MAP[id]?.label ?? id}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
          <div className="d-flex gap-2" role="group" aria-label="Direction">
            <button type="button" aria-pressed={direction === "rise"} className={`dx-btn flex-grow-1 ${direction === "rise" ? "dx-btn-primary" : ""}`} onClick={() => setDirection("rise")}>
              <span className="dx-up">▲</span> Rise / Higher
            </button>
            <button type="button" aria-pressed={direction === "fall"} className={`dx-btn flex-grow-1 ${direction === "fall" ? "dx-btn-primary" : ""}`} onClick={() => setDirection("fall")}>
              <span className="dx-down">▼</span> Fall / Lower
            </button>
          </div>
          <div className="row g-2">
            <div className="col-6">
              <Field label="Stake (USD)" error={stakeError}>
                <input className={`dx-input dx-input-num font-display ${stakeError ? "is-invalid" : ""}`} type="number" min={symbol.minStake} max={symbol.maxStake}
                  value={stake} onChange={(e) => setStake(Number(e.target.value))} />
              </Field>
            </div>
            <div className="col-3">
              <Field label="Duration">
                <input className="dx-input dx-input-num font-display" type="number" min={1} max={365} value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))} />
              </Field>
            </div>
            <div className="col-3">
              <Field label="Unit">
                <select className="dx-select" value={unit} onChange={(e) => setUnit(e.target.value as DurationUnit)} aria-label="Duration unit">
                  {DURATION_UNITS.map((u) => (
                    <option key={u.id} value={u.id}>{u.label}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
          <div className="dx-card-inset d-flex justify-content-between align-items-center">
            <span className="dx-help">Potential payout</span>
            <span className="font-display fw-semibold" style={{ fontSize: "1.05rem" }}>{usd(payout)} <span className="dx-up">(+{symbol.payoutPct}%)</span></span>
          </div>
        </div>
      ) : stage === "proposal" || stage === "buying" ? (
        <div className="d-grid gap-3">
          <div className="dx-card-inset d-grid gap-1 font-display" style={{ fontSize: "0.84rem" }}>
            <span className="d-flex justify-content-between"><span className="dx-help">Contract</span><span>{CONTRACT_TYPE_MAP[contractType]?.label} · {direction === "rise" ? "Rise" : "Fall"}</span></span>
            <span className="d-flex justify-content-between"><span className="dx-help">Symbol</span><span>{symbol.code}</span></span>
            <span className="d-flex justify-content-between"><span className="dx-help">Entry spot (indicative)</span><span>{fmtPrice(entrySpot, symbol.pipSize)}</span></span>
            <span className="d-flex justify-content-between"><span className="dx-help">Duration</span><span>{fmtDur(duration, unit)}</span></span>
            <span className="d-flex justify-content-between"><span className="dx-help">Stake</span><span>{usd(stake)}</span></span>
            <span className="d-flex justify-content-between"><span className="dx-help">Payout</span><span className="dx-up">{usd(payout)}</span></span>
          </div>
          {stage === "buying" ? (
            <Alert tone="info" title="Sending buy request…">authorize → proposal → buy over the eu-west relay. Do not close this dialog.</Alert>
          ) : (
            <Alert tone="warn" title="Proposal expires in 5 seconds of market time">The payout is locked once you confirm; the entry spot is the next tick after purchase.</Alert>
          )}
        </div>
      ) : receipt ? (
        <div className="d-grid gap-3">
          <div className="d-flex align-items-center gap-3">
            <span className="dx-up"><Check size={24} /></span>
            <div>
              <div className="fw-semibold">Contract {receipt.contractId} is live</div>
              <span className="dx-help">{receipt.symbol} · stake {usd(receipt.stake)} → payout {usd(receipt.payout)} on a {direction} close.</span>
            </div>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <Chip tone="up">entry spot {fmtPrice(entrySpot, symbol.pipSize)}</Chip>
            <Chip tone="muted">{fmtDur(duration, unit)} · {CONTRACT_TYPE_MAP[contractType]?.label}</Chip>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// Bot detail drawer — stats, guardrails, log tape, pause/stop (confirm)
// -----------------------------------------------------------------------------
function botLogLines(bot: Bot): string[] {
  return [
    `[tick] ${bot.symbol} entry check · stake ${usd(bot.stake)} · cap ${usd(bot.maxStake)}`,
    `[guard] daily P&L ${bot.pnl >= 0 ? "+" : ""}${usd(bot.pnl)} vs stop ${usd(bot.stopLoss)} · take-profit ${usd(bot.takeProfit)}`,
    `[run] ${bot.trades} contracts this session · win rate ${bot.winRate}%`,
    bot.status === "error" ? "[error] proposal rejected: market closed for maintenance window" : "[ws] heartbeat ok · relay eu-west 38ms",
  ];
}

export function BotDetailDrawer({
  bot,
  onClose,
  onSetStatus,
}: {
  bot: Bot | null;
  onClose: () => void;
  onSetStatus: (bot: Bot, status: Bot["status"]) => void;
}) {
  const [confirmStop, setConfirmStop] = useState(false);
  if (!bot) return null;
  return (
    <>
      <Drawer open={Boolean(bot)} onClose={onClose} title={bot.name} wide
        subtitle={`${bot.strategy} · ${bot.symbol} · ${CONTRACT_TYPE_MAP[bot.contractType]?.label ?? bot.contractType}`}
        footer={
          <div className="d-flex gap-2 w-100">
            {bot.status === "running" ? (
              <button type="button" className="dx-btn flex-grow-1" onClick={() => onSetStatus(bot, "paused")}>
                <Pause size={14} /> Pause bot
              </button>
            ) : (
              <button type="button" className="dx-btn flex-grow-1" onClick={() => onSetStatus(bot, "running")}>
                <Play size={14} /> Resume bot
              </button>
            )}
            <button type="button" className="dx-btn dx-btn-danger flex-grow-1" onClick={() => setConfirmStop(true)}>
              <Square size={13} /> Stop bot
            </button>
          </div>
        }>
        <div className="d-grid gap-3">
          <div className="d-flex flex-wrap gap-2">
            <span className={`dx-chip ${bot.status === "running" ? "dx-chip-up" : bot.status === "error" ? "dx-chip-down" : "dx-chip-warn"}`}>
              {bot.status === "running" ? <span className="dx-pulse" /> : null} {bot.status}
            </span>
            <Chip tone="muted">{bot.trades} trades</Chip>
            <Chip tone={bot.pnl >= 0 ? "up" : "down"}>P&amp;L {bot.pnl >= 0 ? "+" : ""}{usd(bot.pnl)}</Chip>
          </div>
          <Meter label="Win rate" value={bot.winRate} display={`${bot.winRate}%`} />
          <Meter label="Stake vs cap" value={Math.round((bot.stake / bot.maxStake) * 100)} display={`${usd(bot.stake)} / ${usd(bot.maxStake)}`} />
          <div className="dx-card-inset d-grid gap-1 font-display" style={{ fontSize: "0.8rem" }}>
            <span className="d-flex justify-content-between"><span className="dx-help">Duration</span><span>{fmtDur(bot.duration, bot.durationUnit)}</span></span>
            <span className="d-flex justify-content-between"><span className="dx-help">Martingale factor</span><span>×{bot.martingale}</span></span>
            <span className="d-flex justify-content-between"><span className="dx-help">Stop-loss (session)</span><span>{usd(bot.stopLoss)}</span></span>
            <span className="d-flex justify-content-between"><span className="dx-help">Take-profit (session)</span><span>{usd(bot.takeProfit)}</span></span>
          </div>
          <div>
            <span className="dx-kpi-label">Live log</span>
            <div className="dx-card-inset font-display mt-1">
              {botLogLines(bot).map((line) => (
                <div key={line} className="dx-terminal-line">{line}</div>
              ))}
            </div>
          </div>
        </div>
      </Drawer>

      <Dialog open={confirmStop} onClose={() => setConfirmStop(false)} size="sm"
        title={`Stop ${bot.name}?`}
        footer={
          <>
            <button type="button" className="dx-btn" onClick={() => setConfirmStop(false)}>Keep running</button>
            <button type="button" className="dx-btn dx-btn-danger" onClick={() => { setConfirmStop(false); onSetStatus(bot, "stopped"); onClose(); }}>
              <AlertTriangle size={14} /> Stop bot
            </button>
          </>
        }>
        <p className="dx-text-dim mb-0">
          The bot stops placing new contracts immediately. Open positions on {bot.symbol} run to expiry — they are not sold early.
        </p>
      </Dialog>
    </>
  );
}

// -----------------------------------------------------------------------------
// Trade detail drawer (settled contract)
// -----------------------------------------------------------------------------
export function TradeDetailDrawer({ trade, onClose }: { trade: Trade | null; onClose: () => void }) {
  if (!trade) return null;
  const symbol = SYMBOL_MAP[trade.symbol];
  return (
    <Drawer open={Boolean(trade)} onClose={onClose} title={`Contract ${trade.contractId}`}
      subtitle={`${trade.symbol} · ${CONTRACT_TYPE_MAP[trade.contractType]?.label ?? trade.contractType} · ${trade.direction}`}>
      <div className="d-grid gap-3">
        <div className="d-flex flex-wrap gap-2">
          <Chip tone={trade.profit >= 0 ? "up" : "down"}>{trade.profit >= 0 ? "Won" : "Lost"} {trade.profit >= 0 ? "+" : ""}{usd(trade.profit)}</Chip>
          <Chip tone="muted">{fmtDur(trade.duration, trade.durationUnit)}</Chip>
        </div>
        <div className="dx-card-inset d-grid gap-1 font-display" style={{ fontSize: "0.82rem" }}>
          <span className="d-flex justify-content-between"><span className="dx-help">Stake</span><span>{usd(trade.stake)}</span></span>
          <span className="d-flex justify-content-between"><span className="dx-help">Payout</span><span>{usd(trade.payout)}</span></span>
          <span className="d-flex justify-content-between"><span className="dx-help">Entry spot</span><span>{fmtPrice(trade.entrySpot, symbol?.pipSize ?? 2)}</span></span>
          <span className="d-flex justify-content-between"><span className="dx-help">Exit spot</span><span>{fmtPrice(trade.exitSpot, symbol?.pipSize ?? 2)}</span></span>
          <span className="d-flex justify-content-between"><span className="dx-help">Result</span><span className={trade.profit >= 0 ? "dx-up" : "dx-down"}>{trade.profit >= 0 ? "+" : ""}{usd(trade.profit)}</span></span>
        </div>
        <Alert tone="info" title="Settlement">Settled by Deriv against the exit tick — the full tick audit is exportable from Portfolio (D-8) once it ships.</Alert>
      </div>
    </Drawer>
  );
}

// -----------------------------------------------------------------------------
// End-position confirm (destructive — sells the open contract back)
// -----------------------------------------------------------------------------
export function PositionCloseDialog({
  position,
  onClose,
  onClosed,
}: {
  position: Position | null;
  onClose: () => void;
  onClosed: (position: Position) => void;
}) {
  const [busy, setBusy] = useState(false);
  if (!position) return null;
  const sellValue = Math.max(0, Math.round((position.stake + position.currentPnl) * 100) / 100);
  return (
    <Dialog open={Boolean(position)} onClose={onClose} size="sm"
      title={`End ${position.contractId} early?`}
      footer={
        <>
          <button type="button" className="dx-btn" onClick={onClose}>Keep position</button>
          <button type="button" className="dx-btn dx-btn-danger" disabled={busy}
            onClick={() => {
              setBusy(true);
              window.setTimeout(() => { setBusy(false); onClosed(position); }, 700);
            }}>
            {busy ? "Selling…" : `Sell for ${usd(sellValue)}`}
          </button>
        </>
      }>
      <p className="dx-text-dim mb-0">
        Selling ends the contract now at the current spot ({fmtPrice(position.currentSpot, SYMBOL_MAP[position.symbol]?.pipSize ?? 2)}).
        Indicative return <strong className="font-display">{usd(sellValue)}</strong> ({position.currentPnl >= 0 ? "+" : ""}{usd(position.currentPnl)} vs stake) — the final price is the next tick.
      </p>
    </Dialog>
  );
}
