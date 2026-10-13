// H-1 — LIVE PREVIEW SECTION ("See it in action") — embedded, interactive
// dashboard preview with tabs, mini-tabs and simulated live widgets.
import { useMemo, useState } from "react";
import { ArrowRight, Bot, ExternalLink, Gauge, PlayCircle, TrendingUp, Users } from "lucide-react";
import {
  Chip,
  MiniTabs,
  PriceFlash,
  Progress,
  Reveal,
  SectionHead,
  Sparkline,
  Tabs,
  useInterval,
} from "../../ui/primitives";
import { BarSeries, DigitBars, DonutStat, LineChart } from "../../ui/charts";
import { BOTS, POSITIONS, TRADERS, ACTIVITY_FEED, equityCurve } from "../../../data/trading";
import { MARKET_SYMBOLS, SYMBOL_MAP, fmtDur, fmtPrice, pct, pnl, pnlTone, usd } from "../../../data/market";
import { useLiveSeries, useTicks, usePnlDrift } from "../../../lib/live";
import type { LandingController, DemoTab } from "../types";

const PREVIEW_STATUS_MAP = {
  running: { tone: "up" as const, label: "running" },
  paused: { tone: "warn" as const, label: "paused" },
  stopped: { tone: "muted" as const, label: "stopped" },
  error: { tone: "down" as const, label: "error" },
};

export function LivePreviewSection({ c }: { c: LandingController }) {
  const [tab, setTab] = useState<DemoTab>("trade");
  const [period, setPeriod] = useState<"1d" | "1w" | "1m" | "all">("1m");
  const [simTicks, setSimTicks] = useState(0);
  const quotes = useTicks(["R_10", "R_75", "frxEURUSD", "cryBTCUSD"], 1500);
  const series = useLiveSeries("R_10", 30, 2000);
  const previewPnl = usePnlDrift(POSITIONS.slice(0, 4).reduce((s, p) => s + p.currentPnl, 0), 2600);
  const [digitCounts, setDigitCounts] = useState([9.8, 10.2, 9.6, 10.4, 9.9, 11.2, 9.4, 10.1, 9.7, 9.7]);

  useInterval(
    () => {
      setDigitCounts((prev) =>
        prev.map((v) => Math.round((v + (Math.random() - 0.5) * 0.6) * 100) / 100),
      );
      setSimTicks((n) => n + 1);
    },
    tab === "analytics" ? 2200 : null,
  );

  const equity = useMemo(() => {
    const spanMap = { "1d": 12, "1w": 20, "1m": 40, all: 60 } as const;
    return equityCurve(spanMap[period], 20261013 + period.length, period === "all" ? 1000 : 2400, period === "1d" ? 8 : 12);
  }, [period]);

  const runningBots = BOTS.filter((b) => b.status === "running");
  const openPnl = POSITIONS.reduce((s, p) => s + p.currentPnl, 0);

  return (
    <section className="dx-section dx-section-band" id="live-preview">
      <div className="container">
        <SectionHead
          eyebrow="Live preview"
          title="See it in action"
          lead="This is the real component tree — the same widgets the dashboard uses, running on simulated ticks. Switch tabs, change periods, open the console and place a paper contract."
          actions={
            <>
              <button type="button" className="dx-btn dx-btn-ghost" onClick={() => c.openDemo(tab)}>
                <ExternalLink size={14} /> Open full console
              </button>
              <button type="button" className="dx-btn dx-btn-primary" onClick={() => c.openDemo("trade")}>
                <PlayCircle size={14} /> Place a paper contract
              </button>
            </>
          }
        />

        <Reveal>
          <div className="dx-card">
            <div className="dx-card-head flex-wrap">
              <Tabs
                tabs={[
                  { id: "trade", label: "Trade", icon: <Gauge size={14} /> },
                  { id: "bots", label: "Bots", icon: <Bot size={14} />, badge: runningBots.length },
                  { id: "portfolio", label: "Portfolio" },
                  { id: "analytics", label: "Analytics", icon: <TrendingUp size={14} /> },
                  { id: "social", label: "Social", icon: <Users size={14} /> },
                ]}
                active={tab}
                onChange={(id) => setTab(id as DemoTab)}
                className="flex-grow-1 border-0"
              />
              <div className="d-flex align-items-center gap-2">
                <span className="dx-pulse" aria-hidden="true" />
                <span className="dx-help d-none d-md-inline">simulated tick feed</span>
                <MiniTabs
                  options={[
                    { id: "1d", label: "1D" },
                    { id: "1w", label: "1W" },
                    { id: "1m", label: "1M" },
                    { id: "all", label: "All" },
                  ]}
                  value={period}
                  onChange={(p) => setPeriod(p as typeof period)}
                  ariaLabel="Preview period"
                />
              </div>
            </div>

            <div className="dx-card-body">
              {tab === "trade" ? (
                <div className="row g-4">
                  <div className="col-12 col-lg-5">
                    <div className="dx-card-inset d-grid gap-3">
                      <div className="d-flex align-items-center justify-content-between">
                        <span className="dx-eyebrow dx-eyebrow-bare mb-0">Contract ticket</span>
                        <Chip tone="info">proposal preview</Chip>
                      </div>
                      <div className="dx-field">
                        <label className="dx-label" htmlFor="prev-symbol">
                          Symbol
                        </label>
                        <select
                          className="dx-select dx-input-num"
                          id="prev-symbol"
                          defaultValue="R_10"
                          onChange={() => c.openDemo("trade")}
                        >
                          {MARKET_SYMBOLS.slice(0, 8).map((s) => (
                            <option key={s.code} value={s.code}>
                              {s.code} — {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="row g-2">
                        <div className="col-6">
                          <div className="dx-field">
                            <label className="dx-label" htmlFor="prev-ct">
                              Contract
                            </label>
                            <select className="dx-select" id="prev-ct" defaultValue="rise_fall" onChange={() => c.openDemo("trade")}>
                              <option value="rise_fall">Rise/Fall</option>
                              <option value="digits">Digits</option>
                              <option value="touch">Touch/No Touch</option>
                              <option value="accumulator">Accumulator</option>
                              <option value="multiplier">Multiplier</option>
                            </select>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="dx-field">
                            <label className="dx-label" htmlFor="prev-dur">
                              Duration
                            </label>
                            <div className="dx-input-group">
                              <input className="dx-input dx-input-num" id="prev-dur" defaultValue="5" onChange={() => c.openDemo("trade")} />
                              <span className="dx-addon">ticks</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="dx-field">
                        <span className="dx-label">Stake (USD)</span>
                        <div className="dx-quick-btns">
                          {[0.35, 1, 5, 10, 25].map((s) => (
                            <button key={s} type="button" className="dx-filter-chip" onClick={() => c.openDemo("trade")}>
                              ${s}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button type="button" className="dx-btn dx-btn-primary dx-btn-block" onClick={() => c.openDemo("trade")}>
                        Get proposal &amp; buy
                      </button>
                      <p className="dx-help mb-0">
                        Payout updates with every tick · entry spot and barrier confirmed before the order leaves the worker.
                      </p>
                    </div>
                  </div>

                  <div className="col-12 col-lg-7">
                    <div className="dx-card-inset h-100">
                      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                        <div>
                          <div className="dx-kpi-label">Volatility 10 index · 5-tick rise</div>
                          <div className="d-flex align-items-baseline gap-2">
                            <PriceFlash
                              value={fmtPrice(quotes["R_10"]?.quote ?? SYMBOL_MAP["R_10"].basePrice, 3)}
                              dir={quotes["R_10"]?.dir ?? "flat"}
                              className="dx-kpi-value"
                            />
                            <span className="dx-help">tick #{simTicks + 4218}</span>
                          </div>
                        </div>
                        <Chip tone={openPnl >= 0 ? "up" : "down"} pulse>
                          floating {pnl(openPnl)}
                        </Chip>
                      </div>
                      <Sparkline data={series} tone="accent" height={92} ariaLabel="R_10 tick series" />
                      <div className="row g-2 mt-3">
                        {["frxEURUSD", "R_75", "cryBTCUSD"].map((code) => {
                          const q = quotes[code];
                          const symbol = SYMBOL_MAP[code];
                          if (!q || !symbol) return null;
                          return (
                            <div className="col-12 col-sm-4" key={code}>
                              <div className="dx-card-inset">
                                <div className="dx-kpi-label">{symbol.short}</div>
                                <PriceFlash value={fmtPrice(q.quote, symbol.pipSize)} dir={q.dir} />
                                <div className={`dx-help ${q.changePct >= 0 ? "dx-up" : "dx-down"}`}>
                                  {pct(q.changePct, 2, true)} today
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="d-flex flex-wrap gap-2 mt-3">
                        <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => c.openInstrument("R_10")}>
                          Symbol detail
                        </button>
                        <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => c.openBacktests()}>
                          Backtest this setup
                        </button>
                        <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => c.openPresets("pre_mart_vol10")}>
                          Deploy as bot
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {tab === "bots" ? (
                <div className="row g-3">
                  {BOTS.slice(0, 6).map((bot) => {
                    const status = PREVIEW_STATUS_MAP[bot.status];
                    return (
                      <div className="col-12 col-lg-6" key={bot.id}>
                        <button type="button" className="dx-card-inset dx-card-hover w-100 text-start h-100" onClick={() => c.openDemo("bots")}>
                          <div className="d-flex align-items-start justify-content-between gap-2">
                            <div className="min-w-0">
                              <div className="fw-semibold text-truncate">{bot.name}</div>
                              <div className="dx-help">
                                {bot.symbol} · {bot.contractType.replace(/_/g, "/")} · {fmtDur(bot.duration, bot.durationUnit)} ·{" "}
                                <span className="font-display">{usd(bot.stake)}</span>
                              </div>
                            </div>
                            <Chip tone={status.tone}>{status.label}</Chip>
                          </div>
                          <div className="d-flex align-items-center justify-content-between mt-3">
                            <span className={`font-display fw-semibold ${bot.pnl >= 0 ? "dx-up" : "dx-down"}`}>{pnl(bot.pnl)}</span>
                            <span className="dx-help font-display">
                              {bot.trades} trades · {bot.winRate}% win
                            </span>
                          </div>
                          <div className="mt-2">
                            <Progress value={Math.min(100, (bot.trades % 500) / 5)} />
                          </div>
                          <div className="d-flex align-items-center justify-content-between mt-2">
                            <span className="dx-help">martingale {bot.martingale}x · cap {usd(bot.maxStake)}</span>
                            <span className="dx-help">{bot.owner}</span>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {tab === "portfolio" ? (
                <div className="dx-table-wrap dx-table-scroll">
                  <table className="dx-table dx-table-stack">
                    <thead className="dx-table-sticky">
                      <tr>
                        <th scope="col">Contract</th>
                        <th scope="col">Symbol</th>
                        <th scope="col" className="dx-td-num">
                          Stake
                        </th>
                        <th scope="col" className="dx-td-num">
                          Floating P&amp;L
                        </th>
                        <th scope="col">Barrier / range</th>
                        <th scope="col">Expiry</th>
                        <th scope="col" className="dx-td-actions">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {POSITIONS.slice(0, 6).map((p) => (
                        <tr key={p.id}>
                          <td data-label="Contract">
                            <span className="font-display d-block">{p.contractId}</span>
                            <span className="dx-help">{p.contractType.replace(/_/g, "/")}</span>
                          </td>
                          <td data-label="Symbol">
                            <span className="font-display">{p.symbol}</span>
                            <span className="dx-help d-block">
                              {fmtPrice(p.entrySpot, SYMBOL_MAP[p.symbol]?.pipSize ?? 2)} →{" "}
                              {fmtPrice(p.currentSpot, SYMBOL_MAP[p.symbol]?.pipSize ?? 2)}
                            </span>
                          </td>
                          <td data-label="Stake" className="dx-td-num">
                            {usd(p.stake)}
                          </td>
                          <td data-label="Floating P&L" className="dx-td-num">
                            <span className={p.currentPnl >= 0 ? "dx-up" : "dx-down"}>{pnl(p.currentPnl)}</span>
                          </td>
                          <td data-label="Barrier">{p.barrier ?? "—"}</td>
                          <td data-label="Expiry" className="font-display">
                            {new Date(p.expiresAt).toISOString().slice(11, 16)}Z
                          </td>
                          <td data-label="Action" className="dx-td-actions">
                            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => c.openDemo("portfolio")}>
                              Manage
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="dx-pager">
                    <span className="dx-help">
                      {POSITIONS.length} open contracts · floating{" "}
                      <span className={`font-display ${openPnl >= 0 ? "dx-up" : "dx-down"}`}>{pnl(previewPnl)}</span>
                    </span>
                    <button type="button" className="dx-btn dx-btn-sm" onClick={() => c.openDemo("portfolio")}>
                      Open portfolio console
                    </button>
                  </div>
                </div>
              ) : null}

              {tab === "analytics" ? (
                <div className="row g-4">
                  <div className="col-12 col-lg-8">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div>
                        <div className="dx-kpi-label">Equity curve · {period.toUpperCase()}</div>
                        <div className="font-display dx-h-card">{usd(equity[equity.length - 1])}</div>
                      </div>
                      <Chip tone="up">+{pct(((equity[equity.length - 1] - equity[0]) / equity[0]) * 100, 1)}</Chip>
                    </div>
                    <LineChart
                      data={equity}
                      height={220}
                      yFormat={(v) => usd(v, 0)}
                      ariaLabel={`Equity curve ${period}`}
                      xLabels={["start", "mid", "now"]}
                    />
                  </div>
                  <div className="col-12 col-lg-4">
                    <div className="d-grid gap-3">
                      <div className="dx-card-inset">
                        <DonutStat value={62.4} label="win rate" sublabel="1,284 settled contracts across 4 symbols in the last 30 days." />
                      </div>
                      <div className="dx-card-inset">
                        <div className="dx-kpi-label mb-2">Last-digit distribution (1,000 ticks)</div>
                        <DigitBars counts={digitCounts} active={5} />
                        <p className="dx-help mt-2 mb-0">Digit 5 is 1.2 pts over-represented — the differ edge this month.</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="dx-card-inset">
                      <div className="dx-kpi-label mb-2">Daily realised P&amp;L (USD, last 14 sessions)</div>
                      <BarSeries
                        data={equity.slice(-14).map((v, i, arr) => (i === 0 ? 0 : Math.round((v - arr[i - 1]) * 100) / 100))}
                        height={160}
                        format={(v) => usd(v, 0)}
                      />
                    </div>
                  </div>
                  <div className="col-12 d-flex flex-wrap gap-2">
                    <button type="button" className="dx-btn dx-btn-primary" onClick={() => c.openBacktests()}>
                      Run a backtest
                    </button>
                    <button type="button" className="dx-btn dx-btn-ghost" onClick={() => c.openDemo("analytics")}>
                      Open analytics console
                    </button>
                    <button type="button" className="dx-btn dx-btn-ghost" onClick={c.openApiDocs}>
                      Script engine API
                    </button>
                  </div>
                </div>
              ) : null}

              {tab === "social" ? (
                <div className="row g-4">
                  <div className="col-12 col-lg-7">
                    <div className="dx-table-wrap">
                      <table className="dx-table dx-table-sm">
                        <thead>
                          <tr>
                            <th scope="col">#</th>
                            <th scope="col">Trader</th>
                            <th scope="col" className="dx-td-num">
                              30d P&amp;L
                            </th>
                            <th scope="col" className="dx-td-num">
                              Win
                            </th>
                            <th scope="col" className="dx-td-num">
                              Copiers
                            </th>
                            <th scope="col" className="dx-td-actions">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {TRADERS.slice(0, 6).map((t) => (
                            <tr key={t.id}>
                              <td data-label="#" className="font-display">
                                {t.rank}
                              </td>
                              <td data-label="Trader">
                                <span className="fw-semibold">
                                  {t.flag} {t.displayName}
                                </span>
                                <span className="dx-help d-block font-display">{t.loginId}</span>
                              </td>
                              <td data-label="30d P&L" className="dx-td-num">
                                <span className={t.pnl30d >= 0 ? "dx-up" : "dx-down"}>{pnl(t.pnl30d)}</span>
                              </td>
                              <td data-label="Win" className="dx-td-num">
                                {t.winRate}%
                              </td>
                              <td data-label="Copiers" className="dx-td-num">
                                {t.copies}
                              </td>
                              <td data-label="Action" className="dx-td-actions">
                                <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => c.openTrader(t.id)}>
                                  Profile
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="dx-pager">
                        <span className="dx-help">Top 6 of {TRADERS.length} ranked traders</span>
                        <button type="button" className="dx-btn dx-btn-sm" onClick={() => c.openLeaderboard("month")}>
                          Full leaderboard <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="col-12 col-lg-5">
                    <div className="dx-card-inset h-100">
                      <div className="d-flex align-items-center gap-2 mb-3">
                        <span className="dx-pulse" />
                        <span className="dx-kpi-label mb-0">Platform activity</span>
                      </div>
                      <div className="dx-list dx-scroll-y" style={{ maxHeight: 340 }}>
                        {ACTIVITY_FEED.slice(0, 8).map((a) => (
                          <div key={a.id} className="dx-list-row">
                            <span
                              className={`dx-dot ${
                                a.tone === "up" ? "dx-dot-up" : a.tone === "warn" ? "dx-dot-warn" : a.tone === "accent" ? "dx-dot-info" : ""
                              }`}
                            />
                            <span className="flex-grow-1">
                              <span className="d-block" style={{ fontSize: "0.82rem" }}>
                                <strong>{a.actor}</strong> {a.action} <span className="font-display">{a.target}</span>
                              </span>
                              <span className="dx-help">{new Date(a.epoch).toISOString().slice(11, 16)}Z</span>
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="d-flex gap-2 mt-3">
                        <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => c.openCommunity("com_general")}>
                          Community
                        </button>
                        <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => c.openDemo("social")}>
                          Copy console
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="dx-card-foot d-flex flex-wrap align-items-center justify-content-between gap-2">
              <span className="dx-help">
                Preview widgets reuse the dashboard primitives — tables, drawers, dialogs and the same risk chips.
              </span>
              <div className="d-flex align-items-center gap-2">
                <span className={`dx-chip ${openPnl >= 0 ? "dx-chip-up" : "dx-chip-down"}`}>
                  floating {pnl(openPnl)} ({pnlTone(openPnl)})
                </span>
                <Chip tone="muted">{simTicks} simulated ticks</Chip>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
