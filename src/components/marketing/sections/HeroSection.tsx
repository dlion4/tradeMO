// H-1 — HERO SECTION (blueprint: headline, subheadline, CTAs, live ticker strip)
import { ArrowRight, Play, Radio, Users } from "lucide-react";
import { Chip, CountUp, Dropdown, MiniTabs, PriceFlash, Reveal } from "../../ui/primitives";
import { fmtPrice, TICKER_SYMBOLS, SYMBOL_MAP, usd } from "../../../data/market";
import { STATS, DERIV_ACCOUNTS } from "../../../data/trading";
import { useTicks } from "../../../lib/live";
import { useState } from "react";
import type { LandingController } from "../types";

export function HeroSection({ c }: { c: LandingController }) {
  const [tickerSet, setTickerSet] = useState<"majors" | "synthetics" | "crypto">("majors");
  const codes =
    tickerSet === "majors"
      ? TICKER_SYMBOLS
      : tickerSet === "synthetics"
        ? ["R_10", "R_25", "R_50", "R_75", "R_100", "1HZ10V"]
        : ["cryBTCUSD", "cryETHUSD", "frxXAUUSD", "frxXAGUSD"];
  const quotes = useTicks(codes);

  return (
    <section className="dx-hero dx-grid-bg">
      <div className="dx-hero-glow" aria-hidden="true" />
      <div className="container position-relative">
        <div className="row g-5 align-items-center">
          <div className="col-12 col-lg-7">
            <Reveal>
              <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                <Chip tone="accent" pulse>
                  {STATS.botsLive.toLocaleString("en-US")} bots live
                </Chip>
                <Chip tone="muted">Deriv WebSocket API</Chip>
                <Chip tone="info">Front-end build · mock data</Chip>
              </div>
            </Reveal>
            <Reveal delay={60}>
              <h1 className="dx-h-hero">
                Trade Smarter on <span className="dx-up">Deriv</span>
              </h1>
            </Reveal>
            <Reveal delay={120}>
              <p className="dx-lead mt-3">Automate strategies. Build bots. Monitor the crowd.</p>
              <p className="dx-help mt-2 mb-0">
                DerivX places Rise/Fall, Digits, Touch, Accumulator and Multiplier contracts on your own Deriv account —
                with stake caps, stop-losses and an audit log that never blinks.
              </p>
            </Reveal>

            <Reveal delay={180}>
              <div className="d-flex flex-wrap align-items-center gap-3 mt-4">
                <button type="button" className="dx-btn dx-btn-lg dx-btn-primary" onClick={c.openOAuth}>
                  Connect to Deriv <ArrowRight size={16} />
                </button>
                <button type="button" className="dx-btn dx-btn-lg dx-btn-ghost" onClick={() => c.openTour()}>
                  <Play size={15} /> Watch Demo
                </button>
                <button type="button" className="dx-btn-link" onClick={() => c.openDemo("trade")}>
                  Skip the tour — open the live console
                </button>
              </div>
            </Reveal>

            <Reveal delay={240}>
              <div className="row g-3 mt-4">
                <div className="col-6 col-lg-3">
                  <div className="dx-card dx-card-pad">
                    <div className="dx-kpi">
                      <span className="dx-kpi-label">Median payout</span>
                      <span className="dx-kpi-value dx-up">{STATS.medPayoutPct}%</span>
                    </div>
                  </div>
                </div>
                <div className="col-6 col-lg-3">
                  <div className="dx-card dx-card-pad">
                    <div className="dx-kpi">
                      <span className="dx-kpi-label">Tick latency</span>
                      <span className="dx-kpi-value">
                        <CountUp value={STATS.avgTickLatencyMs} suffix=" ms" />
                      </span>
                    </div>
                  </div>
                </div>
                <div className="col-6 col-lg-3">
                  <div className="dx-card dx-card-pad">
                    <div className="dx-kpi">
                      <span className="dx-kpi-label">Symbols</span>
                      <span className="dx-kpi-value">
                        <CountUp value={STATS.assets} />
                      </span>
                    </div>
                  </div>
                </div>
                <div className="col-6 col-lg-3">
                  <div className="dx-card dx-card-pad">
                    <div className="dx-kpi">
                      <span className="dx-kpi-label">Contract types</span>
                      <span className="dx-kpi-value">
                        <CountUp value={STATS.contractTypes} />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          <div className="col-12 col-lg-5">
            <Reveal delay={140}>
              <div className="dx-card dx-card-accent">
                <div className="dx-card-head">
                  <div>
                    <h2 className="dx-card-title">Execution tape</h2>
                    <p className="dx-card-sub">Public tick stream · ws.derivws.com relay</p>
                  </div>
                  <span className="dx-pulse" aria-label="live feed" />
                </div>
                <div className="dx-card-body">
                  <MiniTabs
                    options={[
                      { id: "majors", label: "Majors" },
                      { id: "synthetics", label: "Synthetics" },
                      { id: "crypto", label: "Crypto / Metals" },
                    ]}
                    value={tickerSet}
                    onChange={(v) => setTickerSet(v as typeof tickerSet)}
                    ariaLabel="Ticker group"
                  />
                  <div className="dx-list mt-3">
                    {codes.slice(0, 5).map((code) => {
                      const symbol = SYMBOL_MAP[code];
                      const q = quotes[code];
                      if (!symbol || !q) return null;
                      return (
                        <button
                          key={code}
                          type="button"
                          className="dx-list-row w-100 text-start"
                          onClick={() => c.openInstrument(code)}
                        >
                          <span className="dx-dot dx-dot-info" />
                          <span className="flex-grow-1 min-w-0">
                            <span className="d-block fw-semibold font-display" style={{ fontSize: "0.84rem" }}>
                              {symbol.code}
                            </span>
                            <span className="dx-help d-block text-truncate">{symbol.name}</span>
                          </span>
                          <span className="text-end">
                            <PriceFlash value={fmtPrice(q.quote, symbol.pipSize)} dir={q.dir} className="d-block" />
                            <span className={`dx-help d-block ${q.changePct >= 0 ? "dx-up" : "dx-down"}`}>
                              {q.changePct >= 0 ? "+" : ""}
                              {q.changePct.toFixed(2)}% today
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="dx-card-inset mt-3 d-flex align-items-center justify-content-between gap-3 flex-wrap">
                    <div>
                      <div className="dx-kpi-label">Connected account</div>
                      <div className="font-display fw-semibold">{DERIV_ACCOUNTS[1].loginId}</div>
                      <div className="dx-help">
                        {DERIV_ACCOUNTS[1].label} · balance{" "}
                        <span className="font-display">{usd(DERIV_ACCOUNTS[1].balance)}</span>
                      </div>
                    </div>
                    <Dropdown
                      label="Account actions"
                      trigger={
                        <span className="d-inline-flex align-items-center gap-1">
                          <Users size={13} /> Account
                        </span>
                      }
                      items={[
                        { type: "label", label: "Deriv connections" },
                        { id: "a1", label: "Switch account", hint: "3 live", onSelect: c.openAccountSwitcher },
                        { id: "a2", label: "Reconnect OAuth token", onSelect: c.openOAuth },
                        { id: "a3", label: "Open API status board", onSelect: c.openStatus },
                        { type: "divider" },
                        { id: "a4", label: "Trade on the demo console", onSelect: () => c.openDemo("trade") },
                        { id: "a5", label: "Review risk disclosure", onSelect: () => c.openLegal("risk") },
                      ]}
                    />
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>

      {/* LIVE TICKER STRIP (blueprint) */}
      <div className="container mt-5">
        <div className="dx-card dx-card-pad py-3">
          <div className="d-flex align-items-center gap-3 mb-2">
            <span className="dx-eyebrow dx-eyebrow-bare mb-0">
              <Radio size={12} /> Live ticker
            </span>
            <span className="dx-help">Scrolls continuously · pauses on hover</span>
            <button type="button" className="dx-btn-link ms-auto" onClick={c.openStatus}>
              Stream health
            </button>
          </div>
          <div className="dx-ticker">
            <div className="dx-ticker-track">
              {[0, 1].map((pass) => (
                <div key={pass} className="d-flex gap-4" aria-hidden={pass === 1}>
                  {codes.map((code) => {
                    const symbol = SYMBOL_MAP[code];
                    const q = quotes[code];
                    if (!symbol || !q) return null;
                    return (
                      <button
                        key={`${pass}-${code}`}
                        type="button"
                        className="dx-ticker-item"
                        onClick={() => c.openInstrument(code)}
                      >
                        <span className="dx-ticker-sym">
                          <span className={`dx-dot ${q.dir === "down" ? "dx-dot-down" : "dx-dot-up"}`} />
                          {symbol.code}
                        </span>
                        <PriceFlash value={fmtPrice(q.quote, symbol.pipSize)} dir={q.dir} />
                        <span className={`dx-chip ${q.changePct >= 0 ? "dx-chip-up" : "dx-chip-down"}`}>
                          {q.changePct >= 0 ? "▲" : "▼"} {Math.abs(q.changePct).toFixed(2)}%
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
