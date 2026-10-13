// H-1 — HOW IT WORKS (blueprint: 4 steps with animated connector)
import { ArrowRight, Bot, KeyRound, Play, SlidersHorizontal } from "lucide-react";
import { Chip, Reveal, SectionHead, Stepper } from "../../ui/primitives";
import type { LandingController } from "../types";

export interface HowStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  detail: string;
  bullets: string[];
  bulletsTitle: string;
  cta: { label: string; action: "oauth" | "presets" | "signup" | "demo" };
  metrics: { label: string; value: string }[];
}

export const HOW_STEPS: HowStep[] = [
  {
    id: "connect",
    title: "Connect Deriv",
    description: "OAuth2 handshake — no password ever touches DerivX.",
    icon: <KeyRound size={16} />,
    detail:
      "You are redirected to Deriv's own authorisation screen and grant read + trade scopes. We store the returned token encrypted at rest, then open a dedicated WebSocket session per connection.",
    bulletsTitle: "What happens during the handshake",
    bullets: [
      "Redirect to oauth.deriv.com with app_id, state (CSRF) and your requested scopes",
      "Deriv returns a code, which the worker exchanges for an access token",
      "Token encrypted with a per-user key, scopes recorded in the audit log",
      "Balance, portfolio and tick streams subscribe immediately",
    ],
    cta: { label: "Open the OAuth walkthrough", action: "oauth" },
    metrics: [
      { label: "Typical handshake", value: "4.2 s" },
      { label: "Scopes", value: "read · trade · admin" },
      { label: "Accounts supported", value: "CR · VRTC · MX" },
    ],
  },
  {
    id: "strategy",
    title: "Choose Strategy",
    description: "Start from a preset or write your own script.",
    icon: <SlidersHorizontal size={16} />,
    detail:
      "Ten presets ship with sane defaults — stake, duration, martingale step and hard caps. Every parameter is editable, and each preset links to its backtest so you can see the drawdown before committing capital.",
    bulletsTitle: "Preset library covers",
    bullets: [
      "Martingale ladders with a hard per-leg cap (Volatility 10, 100)",
      "DCA baskets on indices, 1–4 legs with scale-out targets",
      "Digit differ / over-under models with frequency recalibration",
      "Accumulator growth-rate tuners on the 1-second indices",
    ],
    cta: { label: "Browse the preset library", action: "presets" },
    metrics: [
      { label: "Presets", value: "10" },
      { label: "Median backtest length", value: "2 years" },
      { label: "Time to first deploy", value: "under 3 min" },
    ],
  },
  {
    id: "configure",
    title: "Configure Bot",
    description: "Stake, duration, martingale and the risk ceiling.",
    icon: <Bot size={16} />,
    detail:
      "Set the base stake, duration and unit, recovery step plus the two numbers that matter: maximum stake per leg and total stop-loss. The engine refuses any order that would breach them — the cap is enforced server-side, not by your clicking discipline.",
    bulletsTitle: "Guard rails you configure once",
    bullets: [
      "Maximum stake per leg and cumulative exposure ceiling",
      "Stop-loss and take-profit on realised P&L, not floating",
      "Session windows (e.g. 07:00–10:30 UTC) and news blackouts",
      "Auto-pause after N consecutive losses, with a single notification",
    ],
    cta: { label: "Run the 4-step setup wizard", action: "signup" },
    metrics: [
      { label: "Config fields", value: "12 core" },
      { label: "Risk checks per order", value: "5" },
      { label: "Reconnect policy", value: "idempotent retry" },
    ],
  },
  {
    id: "trade",
    title: "Let It Trade",
    description: "Workers place contracts while you monitor.",
    icon: <Play size={16} />,
    detail:
      "Each bot is an isolated worker: it subscribes to its symbol, evaluates every tick, requests a proposal and buys. Positions, floating P&L and the audit trail stream back into the portfolio view — and you can close any contract early from a drawer.",
    bulletsTitle: "What you see while it runs",
    bullets: [
      "Live floating P&L per contract with barrier distance",
      "Bot log tape with timestamps, proposals and fills",
      "One notification when a cap, stop-loss or barrier event fires",
      "Statement export that reconciles against Deriv to the cent",
    ],
    cta: { label: "Watch a contract get placed", action: "demo" },
    metrics: [
      { label: "Median worker restart", value: "1.4 s" },
      { label: "Contract settle lag", value: "under 300 ms" },
      { label: "Contracts today", value: "128,940" },
    ],
  },
];

export function HowItWorksSection({ c }: { c: LandingController }) {
  const runCta = (action: HowStep["cta"]["action"]) => {
    if (action === "oauth") c.openOAuth();
    else if (action === "presets") c.openPresets();
    else if (action === "signup") c.openSignUp();
    else c.openDemo("trade");
  };

  return (
    <section className="dx-section" id="how-it-works">
      <div className="container">
        <SectionHead
          center
          eyebrow="How it works"
          title="From zero to a running bot in four steps"
          lead="Connect, choose, configure, trade. Each step below opens the real screen it refers to — the OAuth walkthrough, the preset library, the setup wizard and the live console."
        />

        <Reveal>
          <div className="dx-card dx-card-pad mb-4">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <Stepper steps={HOW_STEPS.map((s) => ({ id: s.id, label: s.title }))} active={0} />
              <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => c.openSignUp()}>
                Start step 1 <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </Reveal>

        <div className="row g-4 row-cols-1 row-cols-sm-2 row-cols-lg-4">
          {HOW_STEPS.map((step, i) => (
            <div className="col" key={step.id}>
              <Reveal delay={i * 70}>
                <article className="dx-card dx-card-pad h-100 d-flex flex-column">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <span className="dx-step-dot" style={{ width: 30, height: 30 }}>
                      {i + 1}
                    </span>
                    <span className="dx-muted">{step.icon}</span>
                  </div>
                  <h3 className="dx-h-card">{step.title}</h3>
                  <p className="dx-help mt-2 flex-grow-1">{step.description}</p>
                  <div className="d-flex gap-2 mt-2 flex-wrap">
                    {step.metrics.slice(0, 2).map((m) => (
                      <Chip key={m.label} tone="muted">
                        {m.value}
                      </Chip>
                    ))}
                  </div>
                  <div className="d-flex gap-2 mt-3">
                    <button type="button" className="dx-btn dx-btn-sm flex-grow-1" onClick={() => c.openStep(i)}>
                      Step detail
                    </button>
                    <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => runCta(step.cta.action)}>
                      Go
                    </button>
                  </div>
                </article>
              </Reveal>
              {i < HOW_STEPS.length - 1 ? <div className="dx-step-line d-none d-lg-block" aria-hidden="true" /> : null}
            </div>
          ))}
        </div>

        <Reveal delay={280}>
          <div className="dx-card dx-card-pad mt-4 d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div>
              <h3 className="dx-h-card">Prefer to see it before you connect anything?</h3>
              <p className="dx-help mb-0 mt-1">
                The console runs entirely on simulated ticks — place a paper contract, watch the worker fill it and read the
                receipt. No Deriv account needed.
              </p>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <button type="button" className="dx-btn dx-btn-ghost" onClick={() => c.openTour()}>
                Take the 5-slide tour
              </button>
              <button type="button" className="dx-btn dx-btn-primary" onClick={() => c.openDemo("trade")}>
                Open the console
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
