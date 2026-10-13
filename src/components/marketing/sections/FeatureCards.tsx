// H-1 — FEATURE CARDS (blueprint: 🤖 Bot Builder · 📜 Script Engine · 👥 Social Trade)
// Each card keeps to the anti-crowd rule (1 metric + 1 trend + 1 action); all
// depth opens in a detail dialog with its own tabs.
import { ArrowRight, Bell, Bot, Code2, Cpu, Gauge, PlayCircle, Shuffle, Users } from "lucide-react";
import { Chip, Meter, Reveal, SectionHead, Sparkline } from "../../ui/primitives";
import { BOTS, SCRIPTS, TRADERS, equityCurve } from "../../../data/trading";
import { pct, usd } from "../../../data/market";
import type { FeatureId, LandingController } from "../types";

interface FeatureCardDef {
  id: FeatureId;
  icon: React.ReactNode;
  title: string;
  tagline: string;
  description: string;
  metricLabel: string;
  metricValue: string;
  trend: string;
  trendDir: "up" | "down";
  spark: number[];
  bullets: string[];
}

const FEATURES: FeatureCardDef[] = [
  {
    id: "bot-builder",
    icon: <Bot size={18} />,
    title: "Bot Builder",
    tagline: "Automate the trade, not the risk",
    description:
      "Start from a preset, set a stake cap and stop-loss, and the worker handles proposals, buys and reconnects. Every action is logged with a timestamp you can audit.",
    metricLabel: "Avg. bot win rate (30d)",
    metricValue: pct(BOTS.reduce((s, b) => s + b.winRate, 0) / BOTS.length, 1),
    trend: "+4.2 pts vs last month",
    trendDir: "up",
    spark: equityCurve(24, 4242, 620, 3.1),
    bullets: [
      "10 preset strategies: martingale, DCA, fixed, accumulator, digit models",
      "Hard stake cap + stop-loss enforced inside the engine, not by your discipline",
      "Auto-reconnect reuses the same idempotency key — a contract is never bought twice",
    ],
  },
  {
    id: "script-engine",
    icon: <Code2 size={18} />,
    title: "Script Engine",
    tagline: "Write custom JS strategies",
    description:
      "A sandboxed JavaScript runtime with tick and bar subscriptions, indicator helpers, risk assertions and session schedules. Backtest two years of ticks before you deploy.",
    metricLabel: "Scripts deployed",
    metricValue: `${SCRIPTS.filter((s) => s.status === "deployed").length}`,
    trend: "12 backtests today",
    trendDir: "up",
    spark: equityCurve(24, 9911, 400, 5.4),
    bullets: [
      "Sandboxed VM2 runtime — no filesystem, no network, deterministic replay",
      "Indicators, barriers and digit helpers built in",
      "Backtest runner with drawdown, Sharpe and walk-forward splits",
    ],
  },
  {
    id: "social-trade",
    icon: <Users size={18} />,
    title: "Social Trade",
    tagline: "Monitor & follow other traders",
    description:
      "Verified P&L leaderboards, per-trader risk profiles and copy trading that mirrors positions at your own stake ratio — with a kill switch that closes every copied leg instantly.",
    metricLabel: "Copiers on top strategies",
    metricValue: `${TRADERS.reduce((s, t) => s + t.copies, 0).toLocaleString("en-US")}`,
    trend: "+218 this week",
    trendDir: "up",
    spark: equityCurve(24, 3131, 220, 6.2),
    bullets: [
      "Statements are reconciled against Deriv, not screenshots",
      "Copy limit and stake multiplier set before the first mirrored contract",
      "Independent kill switch: close copied legs without touching your own bots",
    ],
  },
];

const CAPABILITIES = [
  { icon: <Cpu size={15} />, label: "Automation hub", note: "Schedules, triggers, webhooks", id: "auto" },
  { icon: <Gauge size={15} />, label: "Risk engine", note: "Exposure caps + stop-outs", id: "risk" },
  { icon: <Shuffle size={15} />, label: "Copy trade", note: "Stake-ratio mirroring", id: "copy" },
  { icon: <Bell size={15} />, label: "Alerting", note: "Bot pause, barrier hit, margin", id: "alerts" },
];

export function FeatureCards({ c }: { c: LandingController }) {
  const totalPnl = BOTS.filter((b) => b.status === "running").reduce((s, b) => s + b.pnl, 0);

  return (
    <section className="dx-section" id="features">
      <div className="container">
        <SectionHead
          eyebrow="Feature deep dive"
          title="Everything you need to run Deriv on autopilot"
          lead="Three pillars, one execution layer. Bots, scripts and social mirroring all place contracts through the same Deriv WebSocket connection — with the same risk guard rails."
          actions={
            <>
              <button type="button" className="dx-btn dx-btn-ghost" onClick={() => c.openPresets()}>
                Browse 10 presets
              </button>
              <button type="button" className="dx-btn dx-btn-primary" onClick={() => c.openDemo("bots")}>
                Open live console <ArrowRight size={14} />
              </button>
            </>
          }
        />

        <div className="row g-4 row-cols-1 row-cols-lg-3">
          {FEATURES.map((f, i) => (
            <div className="col" key={f.id}>
              <Reveal delay={i * 80}>
                <article className="dx-card dx-card-pad d-flex flex-column h-100">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <span className="dx-empty-ico" style={{ width: 42, height: 42 }}>
                      {f.icon}
                    </span>
                    <Chip tone="muted">{f.tagline}</Chip>
                  </div>
                  <h3 className="dx-h-card">{f.title}</h3>
                  <p className="dx-help mt-2 flex-grow-1">{f.description}</p>

                  <div className="dx-kpi-trend is-up mt-3">
                    <span className="dx-kpi-label">{f.metricLabel}</span>
                  </div>
                  <div className="d-flex align-items-baseline justify-content-between gap-2">
                    <span className="dx-kpi-value">{f.metricValue}</span>
                    <span className={`dx-chip ${f.trendDir === "up" ? "dx-chip-up" : "dx-chip-down"}`}>{f.trend}</span>
                  </div>
                  <Sparkline data={f.spark} tone="accent" height={38} ariaLabel={`${f.title} trend`} />

                  <ul className="list-unstyled d-grid gap-1 mt-3 mb-3">
                    {f.bullets.slice(0, 2).map((b) => (
                      <li key={b} className="dx-help d-flex gap-2">
                        <span className="dx-dot dx-dot-info mt-2" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="d-flex gap-2 mt-auto">
                    <button type="button" className="dx-btn dx-btn-sm dx-btn-primary flex-grow-1" onClick={() => c.openFeature(f.id)}>
                      Explore {f.title}
                    </button>
                    <button
                      type="button"
                      className="dx-btn dx-btn-sm dx-btn-ghost"
                      onClick={() => (f.id === "script-engine" ? c.openApiDocs() : c.openPresets())}
                      aria-label={f.id === "script-engine" ? "Open API reference" : "Open strategy presets"}
                    >
                      <PlayCircle size={14} />
                    </button>
                  </div>
                </article>
              </Reveal>
            </div>
          ))}
        </div>

        <Reveal delay={240}>
          <div className="dx-card dx-card-pad mt-4">
            <div className="row g-4 align-items-center">
              <div className="col-12 col-lg-5">
                <div className="dx-eyebrow mb-2">Capability map</div>
                <h3 className="dx-h-card">Built on top of the same Deriv API surface</h3>
                <p className="dx-help mt-2 mb-3">
                  Open futures P&L across every running bot:{" "}
                  <span className={`font-display fw-semibold ${totalPnl >= 0 ? "dx-up" : "dx-down"}`}>{usd(totalPnl, 2, { sign: true })}</span>{" "}
                  across {BOTS.filter((b) => b.status === "running").length} workers · {SCRIPTS.length} scripts · {TRADERS.length} ranked traders.
                </p>
                <div className="d-grid gap-3">
                  <Meter label="Tick relay uptime (30d)" value={99.99} display="99.99%" />
                  <Meter label="Bot restart success after disconnect" value={98.4} display="98.4%" />
                  <Meter label="Proposal → buy round-trip under 120 ms" value={93.1} display="93.1%" />
                </div>
              </div>
              <div className="col-12 col-lg-7">
                <div className="row g-3 row-cols-1 row-cols-sm-2">
                  {CAPABILITIES.map((cap) => (
                    <div className="col" key={cap.id}>
                      <button
                        type="button"
                        className="dx-card-inset dx-card-hover w-100 text-start"
                        onClick={() =>
                          cap.id === "copy"
                            ? c.openLeaderboard("month")
                            : cap.id === "alerts"
                              ? c.openFaq("automation")
                              : cap.id === "risk"
                                ? c.openLegal("risk")
                                : c.openPresets()
                        }
                      >
                        <span className="d-flex align-items-center gap-2 dx-muted mb-2">{cap.icon}</span>
                        <span className="d-block fw-semibold" style={{ fontSize: "0.88rem" }}>
                          {cap.label}
                        </span>
                        <span className="dx-help d-block">{cap.note}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
