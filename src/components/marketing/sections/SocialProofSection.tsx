// H-1 — SOCIAL PROOF (blueprint: "Trusted by X traders" counter, testimonial
// cards, leaderboard preview of the top 5)
import { useMemo, useState } from "react";
import { ArrowRight, BadgeCheck, Quote, Star, Trophy, Users } from "lucide-react";
import { Avatar, Chip, CountUp, FilterChips, MiniTabs, Reveal, SectionHead } from "../../ui/primitives";
import { STATS, TESTIMONIALS, TRADERS } from "../../../data/trading";
import { pct, pnl, usd } from "../../../data/market";
import type { LandingController } from "../types";

export function SocialProofSection({ c }: { c: LandingController }) {
  const [segment, setSegment] = useState("all");
  const [board, setBoard] = useState<"all" | "month" | "week">("month");
  const [visible, setVisible] = useState(6);

  const filtered = useMemo(() => {
    const list = segment === "all" ? TESTIMONIALS : TESTIMONIALS.filter((t) => t.segment === segment);
    return list.slice(0, visible);
  }, [segment, visible]);

  const ranked = useMemo(() => {
    const sorted = [...TRADERS].sort((a, b) => (board === "week" ? b.pnl30d / 4.3 - a.pnl30d / 4.3 : b.pnl30d - a.pnl30d));
    return sorted.slice(0, 5);
  }, [board]);

  const avgWin = TESTIMONIALS.reduce((s, t) => s + t.winRate, 0) / TESTIMONIALS.length;

  return (
    <section className="dx-section dx-section-band" id="community">
      <div className="container">
        <SectionHead
          eyebrow="Social proof"
          title={
            <>
              Trusted by <CountUp value={STATS.traders} /> traders in {STATS.countries} countries
            </>
          }
          lead="Real accounts, verified statements. Filter the reviews by trader type, then open any card for the full breakdown — win rate, monthly P&L, automation hours and the strategies they actually run."
          actions={
            <>
              <button type="button" className="dx-btn dx-btn-ghost" onClick={() => c.openCommunity()}>
                <Users size={14} /> Community channels
              </button>
              <button type="button" className="dx-btn dx-btn-primary" onClick={() => c.openLeaderboard("month")}>
                <Trophy size={14} /> Full leaderboard
              </button>
            </>
          }
        />

        <Reveal>
          <div className="row g-3 mb-4">
            {[
              { label: "Verified testimonials", value: TESTIMONIALS.filter((t) => t.verified).length, suffix: ` / ${TESTIMONIALS.length}` },
              { label: "Median win rate (reviewers)", value: avgWin, decimals: 1, suffix: "%" },
              { label: "Automation hours logged", value: TESTIMONIALS.reduce((s, t) => s + t.automationHours, 0), suffix: "h" },
              { label: "Bots running for reviewers", value: TESTIMONIALS.reduce((s, t) => s + t.botsRunning, 0) },
            ].map((k) => (
              <div className="col-6 col-lg-3" key={k.label}>
                <div className="dx-card dx-card-pad">
                  <div className="dx-kpi">
                    <span className="dx-kpi-label">{k.label}</span>
                    <span className="dx-kpi-value">
                      <CountUp value={k.value} decimals={k.decimals ?? 0} suffix={k.suffix ?? ""} />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        <div className="row g-4">
          <div className="col-12 col-xl-7">
            <Reveal>
              <div className="dx-card dx-card-flush">
                <div className="dx-card-head flex-wrap">
                  <div>
                    <h3 className="dx-card-title">Trader reviews</h3>
                    <p className="dx-card-sub">Verified via Deriv statement reconciliation</p>
                  </div>
                  <FilterChips
                    options={[
                      { id: "beginner", label: "Beginner" },
                      { id: "pro", label: "Pro" },
                      { id: "algo", label: "Algo" },
                      { id: "educator", label: "Educator" },
                    ]}
                    value={segment}
                    onChange={(v) => {
                      setSegment(v);
                      setVisible(6);
                    }}
                    allLabel="All reviewers"
                  />
                </div>
                <div className="dx-card-body">
                  <div className="row g-3">
                    {filtered.map((t) => (
                      <div className="col-12 col-md-6" key={t.id}>
                        <article className="dx-card dx-card-pad h-100 d-flex flex-column">
                          <div className="d-flex align-items-center gap-3 mb-2">
                            <Avatar name={t.name} tone={t.verified ? "teal" : "blue"} />
                            <div className="min-w-0">
                              <div className="fw-semibold text-truncate" style={{ fontSize: "0.9rem" }}>
                                {t.flag} {t.name}
                              </div>
                              <div className="dx-help text-truncate">
                                {t.role} · <span className="font-display">{t.loginId}</span>
                              </div>
                            </div>
                            {t.verified ? (
                              <span className="dx-chip dx-chip-up ms-auto">
                                <BadgeCheck size={11} /> verified
                              </span>
                            ) : (
                              <span className="dx-chip dx-chip-warn ms-auto">pending</span>
                            )}
                          </div>
                          <div className="d-flex align-items-center gap-1 mb-2" aria-label={`${t.rating} out of 5`}>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} size={12} fill={i < t.rating ? "currentColor" : "none"} className={i < t.rating ? "dx-warn-text" : "dx-muted"} />
                            ))}
                          </div>
                          <p className="dx-quote dx-text-dim flex-grow-1" style={{ fontSize: "0.84rem" }}>
                            {t.quote}
                          </p>
                          <div className="d-flex flex-wrap align-items-center gap-2 mt-2">
                            <Chip tone="up">{t.winRate}% win</Chip>
                            <Chip tone={t.monthlyPnl >= 0 ? "up" : "down"}>{pnl(t.monthlyPnl)} / mo</Chip>
                            <Chip tone="muted">{t.automationHours}h automated</Chip>
                          </div>
                          <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost mt-3" onClick={() => c.openTestimonial(t.id)}>
                            <Quote size={12} /> Full story
                          </button>
                        </article>
                      </div>
                    ))}
                  </div>
                  {visible < (segment === "all" ? TESTIMONIALS.length : TESTIMONIALS.filter((t) => t.segment === segment).length) ? (
                    <div className="text-center mt-3">
                      <button type="button" className="dx-btn dx-btn-ghost" onClick={() => setVisible((v) => v + 6)}>
                        Load 6 more reviews
                      </button>
                    </div>
                  ) : (
                    <div className="text-center mt-3">
                      <button type="button" className="dx-btn dx-btn-ghost" onClick={() => c.openCommunity("com_help")}>
                        Ask a reviewer in the community
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </Reveal>
          </div>

          <div className="col-12 col-xl-5">
            <Reveal delay={80}>
              <div className="dx-card dx-card-flush h-100">
                <div className="dx-card-head">
                  <div>
                    <h3 className="dx-card-title">Leaderboard preview</h3>
                    <p className="dx-card-sub">Top 5 by realised P&amp;L · statements reconciled</p>
                  </div>
                  <MiniTabs
                    options={[
                      { id: "all", label: "All-time" },
                      { id: "month", label: "30d" },
                      { id: "week", label: "7d" },
                    ]}
                    value={board}
                    onChange={(v) => setBoard(v as typeof board)}
                    ariaLabel="Leaderboard period"
                  />
                </div>
                <div className="dx-card-body">
                  <div className="dx-list">
                    {ranked.map((t, i) => (
                      <button key={t.id} type="button" className="dx-list-row w-100 text-start" onClick={() => c.openTrader(t.id)}>
                        <span className="font-display fw-semibold dx-muted" style={{ width: 22 }}>
                          #{i + 1}
                        </span>
                        <Avatar name={t.displayName} tone={i === 0 ? "teal" : "blue"} />
                        <span className="flex-grow-1 min-w-0">
                          <span className="d-block fw-semibold text-truncate" style={{ fontSize: "0.86rem" }}>
                            {t.flag} {t.displayName}
                          </span>
                          <span className="dx-help d-block text-truncate">
                            {t.strategy} · {pct(t.winRate, 1)} win · {t.copies} copiers
                          </span>
                        </span>
                        <span className="text-end">
                          <span className={`d-block font-display ${t.pnl30d >= 0 ? "dx-up" : "dx-down"}`}>{pnl(t.pnl30d)}</span>
                          <span className="dx-help d-block">{usd(t.volume30d, 0, { compact: true })} vol</span>
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="dx-card-inset mt-3">
                    <div className="dx-kpi-label mb-2">Copy-trade snapshot</div>
                    <div className="d-flex align-items-center justify-content-between">
                      <span className="dx-help">Mirrored open stake</span>
                      <span className="font-display">{usd(1240.5)}</span>
                    </div>
                    <div className="d-flex align-items-center justify-content-between">
                      <span className="dx-help">Copied legs today</span>
                      <span className="font-display">38</span>
                    </div>
                    <div className="d-flex align-items-center justify-content-between">
                      <span className="dx-help">Kill-switch status</span>
                      <span className="dx-chip dx-chip-up">armed</span>
                    </div>
                  </div>

                  <div className="d-flex flex-wrap gap-2 mt-3">
                    <button type="button" className="dx-btn dx-btn-primary flex-grow-1" onClick={() => c.openLeaderboard("month")}>
                      Open full leaderboard <ArrowRight size={13} />
                    </button>
                    <button type="button" className="dx-btn dx-btn-ghost" onClick={() => c.openDemo("social")}>
                      Copy console
                    </button>
                  </div>
                  <p className="dx-help mt-3 mb-0">
                    Leaderboard statistics are simulated demo data. Past performance is never a guarantee of future results.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
