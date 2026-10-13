// H-1 — TRUST BAR (blueprint: "Powered by Deriv API" | "256-bit Encryption"
// | "10,000+ traders" | "24/7 Automation") + secondary capability strip.
import { Activity, KeyRound, Lock, ShieldCheck, Timer, Zap } from "lucide-react";
import { Chip, CountUp, Reveal } from "../../ui/primitives";
import { STATS, TRUST_STATS, DERIV_ACCOUNTS } from "../../../data/trading";
import type { LandingController } from "../types";

const ICONS: Record<string, React.ReactNode> = {
  ts_api: <Activity size={16} />,
  ts_enc: <Lock size={16} />,
  ts_traders: <ShieldCheck size={16} />,
  ts_auto: <Timer size={16} />,
};

export function TrustBar({ c }: { c: LandingController }) {
  return (
    <section className="dx-section dx-section-band dx-section-tight">
      <div className="container">
        <div className="row g-3 row-cols-1 row-cols-sm-2 row-cols-lg-4">
          {TRUST_STATS.map((stat, i) => (
            <div className="col" key={stat.id}>
              <Reveal delay={i * 60}>
                <button
                  type="button"
                  className="dx-card dx-card-pad dx-card-hover w-100 text-start h-100"
                  onClick={() => (stat.id === "ts_api" ? c.openStatus() : c.openAbout())}
                  title={stat.id === "ts_api" ? "Open live API health board" : "Open platform overview"}
                >
                  <div className="d-flex align-items-center gap-2 mb-2 dx-muted">{ICONS[stat.id]}</div>
                  <div className="dx-kpi-value">
                    <CountUp value={stat.value} decimals={stat.decimals ?? 0} suffix={stat.suffix ? ` ${stat.suffix}` : ""} />
                  </div>
                  <div className="d-flex align-items-center justify-content-between gap-2 mt-1">
                    <span className="dx-kpi-label">{stat.label}</span>
                    <span className="dx-help">details →</span>
                  </div>
                  <p className="dx-help mb-0 mt-2">{stat.note}</p>
                </button>
              </Reveal>
            </div>
          ))}
        </div>

        <Reveal delay={240}>
          <div className="dx-card dx-card-pad mt-4 d-flex flex-wrap align-items-center gap-3 justify-content-between">
            <div className="d-flex flex-wrap align-items-center gap-2">
              <Chip tone="up">
                <KeyRound size={12} /> OAuth2 · read + trade scopes only
              </Chip>
              <Chip tone="muted">
                <Zap size={12} /> {STATS.contractsSettled.toLocaleString("en-US")} contracts settled
              </Chip>
              <Chip tone="info">{STATS.countries} countries</Chip>
              <Chip tone="muted">
                <span className="dx-pulse " /> {DERIV_ACCOUNTS.filter((a) => a.connected).length} Deriv connections attached
              </Chip>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => c.openCommunity("com_help")}>
                Support desk
              </button>
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => c.openLegal("privacy")}>
                How we store your token
              </button>
              <button type="button" className="dx-btn dx-btn-sm" onClick={c.openAccountSwitcher}>
                Manage connections
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
