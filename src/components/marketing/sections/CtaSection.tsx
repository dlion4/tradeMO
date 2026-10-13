// H-1 — CTA SECTION (blueprint: "Ready to automate your trading?" + Get Started Free)
import { ArrowRight, CalendarClock, MessageSquare, ShieldCheck, Sparkles } from "lucide-react";
import { Chip, CountUp, Reveal } from "../../ui/primitives";
import { BOTS, STATS, TRADERS } from "../../../data/trading";
import { usd } from "../../../data/market";
import type { LandingController } from "../types";

export function CtaSection({ c }: { c: LandingController }) {
  const livePnl = BOTS.filter((b) => b.status === "running").reduce((s, b) => s + b.pnl, 0);

  return (
    <section className="dx-section" id="get-started">
      <div className="container">
        <Reveal>
          <div className="dx-card dx-card-pad dx-card-accent">
            <div className="row g-4 align-items-center">
              <div className="col-12 col-lg-7">
                <div className="dx-eyebrow mb-2">Ready when you are</div>
                <h2 className="dx-h-section">
                  Ready to automate your trading?
                  <br />
                  Start on a virtual account — move to real when the edge holds.
                </h2>
                <p className="dx-lead mt-3">
                  Four steps, about three minutes: create the platform account, connect Deriv via OAuth, pick a preset and set your
                  risk ceiling. Nothing goes live until you confirm the first contract.
                </p>

                <div className="d-flex flex-wrap gap-3 mt-4">
                  <button type="button" className="dx-btn dx-btn-lg dx-btn-primary" onClick={() => c.openSignUp()}>
                    Get started free <ArrowRight size={16} />
                  </button>
                  <button type="button" className="dx-btn dx-btn-lg dx-btn-ghost" onClick={() => c.openContact("sales")}>
                    <CalendarClock size={15} /> Book a walkthrough
                  </button>
                  <button type="button" className="dx-btn-link align-self-center" onClick={() => c.openPricing()}>
                    Compare tiers →
                  </button>
                </div>

                <div className="d-flex flex-wrap align-items-center gap-2 mt-4">
                  <Chip tone="up">
                    <ShieldCheck size={12} /> No card for the free tier
                  </Chip>
                  <Chip tone="muted">
                    <Sparkles size={12} /> {STATS.botsLive.toLocaleString("en-US")} bots running right now
                  </Chip>
                  <Chip tone="info">
                    <MessageSquare size={12} /> Support in 5 channels
                  </Chip>
                </div>
              </div>

              <div className="col-12 col-lg-5">
                <div className="dx-card-inset">
                  <div className="row g-3">
                    <div className="col-6">
                      <div className="dx-kpi">
                        <span className="dx-kpi-label">Open bot P&amp;L</span>
                        <span className={`dx-kpi-value ${livePnl >= 0 ? "dx-up" : "dx-down"}`}>{usd(livePnl, 0)}</span>
                        <span className="dx-help">across {BOTS.filter((b) => b.status === "running").length} workers</span>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="dx-kpi">
                        <span className="dx-kpi-label">Ranked traders</span>
                        <span className="dx-kpi-value">
                          <CountUp value={TRADERS.length} />
                        </span>
                        <span className="dx-help">verified statements</span>
                      </div>
                    </div>
                    <div className="col-12">
                      <hr className="dx-hr my-1" />
                      <p className="dx-help mb-2">Onboarding checklist</p>
                      <ol className="dx-help mb-0 ps-3 d-grid gap-1">
                        <li>Platform account (email + password, 2FA optional)</li>
                        <li>Deriv OAuth connection — virtual or real</li>
                        <li>Preset selection and risk ceiling</li>
                        <li>First contract confirmed by you, not the bot</li>
                      </ol>
                    </div>
                    <div className="col-12 d-grid gap-2">
                      <button type="button" className="dx-btn dx-btn-sm" onClick={c.openOAuth}>
                        Just connect an existing account
                      </button>
                      <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => c.openFaq("getting-started")}>
                        Read the getting-started FAQ
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
