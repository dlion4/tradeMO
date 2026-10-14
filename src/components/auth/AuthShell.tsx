// =============================================================================
// AuthShell.tsx — the A-group shell (A-1 … A-7). Split panel: brand story +
// form slot. Built out on A-1 (the first A-group page); later auth pages mount
// inside it unchanged. The shell owns only chrome — every control a page adds
// inside the slots must resolve to a real route or a real overlay (pages wire
// those handlers; the shell never invents navigation).
// =============================================================================
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck, Zap } from "lucide-react";
import { Chip, ThemeToggle } from "../ui/primitives";

/** The auth journey every A-page belongs to (A-1 signup is step 1). */
export const AUTH_JOURNEY = [
  { id: "signup", label: "Create account", hint: "A-1 · this page" },
  { id: "verify", label: "Verify email", hint: "A-6 · in-page step" },
  { id: "deriv", label: "Link Deriv (OAuth2)", hint: "A-3 · after signup" },
  { id: "trade", label: "First contract", hint: "Demo console" },
] as const;

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  side = "signup",
  extras,
  journeyStep = 0,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  side?: "signup" | "signin" | "2fa" | "reset";
  /** page-specific panel under the trust bullets (live widgets, quotes…) */
  extras?: ReactNode;
  /** index into AUTH_JOURNEY shown as the shell progress hint */
  journeyStep?: number;
}) {
  const bullets =
    side === "signin"
      ? ["Reconnect any Deriv account in two clicks", "Bots keep running with your saved risk caps", "Session audit log for every connection"]
      : ["OAuth2 — we never see your Deriv password", "Start on a virtual account, switch to real later", "Free tier: 1 bot, full market access"];

  return (
    <div className="dx-auth-shell">
      <div className="container">
        <div className="d-flex align-items-center justify-content-between gap-3 mb-4">
          <span className="dx-chip dx-chip-muted">
            Step {journeyStep + 1} of {AUTH_JOURNEY.length} · {AUTH_JOURNEY[journeyStep]?.label}
          </span>
          <span className="d-inline-flex align-items-center gap-2">
            <Link to="/" className="dx-btn dx-btn-sm dx-btn-ghost">Landing</Link>
            <Link to="/features" className="dx-btn dx-btn-sm dx-btn-ghost">Features</Link>
            <ThemeToggle />
          </span>
        </div>

        <div className="row g-4 justify-content-center align-items-start">
          <div className="col-12 col-lg-5">
            <Link to="/" className="dx-brand mb-4">
              <span className="dx-brand-mark">DX</span>
              <span>
                Deriv<span className="dx-up">X</span>
              </span>
            </Link>
            <h1 className="dx-h-section">{title}</h1>
            <p className="dx-lead mt-3">{subtitle}</p>
            <ul className="list-unstyled d-grid gap-2 mt-4">
              {bullets.map((b) => (
                <li key={b} className="d-flex align-items-start gap-2 dx-text-dim" style={{ fontSize: "0.86rem" }}>
                  <Zap size={14} className="dx-up mt-1" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <div className="d-flex flex-wrap gap-2 mt-4">
              <Chip tone="up">
                <ShieldCheck size={12} /> 256-bit encryption
              </Chip>
              <Chip tone="muted">Deriv OAuth2</Chip>
              <Chip tone="info">Front-end build · mock data</Chip>
            </div>
            {extras ? <div className="mt-4">{extras}</div> : null}
          </div>
          <div className="col-12 col-lg-6">
            <div className="dx-card dx-card-pad">
              {children}
              {footer ? <div className="mt-4 pt-3 border-top border-secondary-subtle">{footer}</div> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
