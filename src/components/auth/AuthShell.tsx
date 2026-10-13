// =============================================================================
// AuthShell.tsx — the A-group shell (A-1 … A-7). Split panel: brand story +
// form slot. Scaffolding for the auth group; H-1 does not mount this shell.
// =============================================================================
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck, Zap } from "lucide-react";
import { Chip } from "../ui/primitives";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  side = "signup",
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  side?: "signup" | "signin" | "2fa" | "reset";
}) {
  const bullets =
    side === "signin"
      ? ["Reconnect any Deriv account in two clicks", "Bots keep running with your saved risk caps", "Session audit log for every connection"]
      : ["OAuth2 — we never see your Deriv password", "Start on a virtual account, switch to real later", "Free tier: 1 bot, full market access"];

  return (
    <div className="dx-auth-shell">
      <div className="container">
        <div className="row g-4 justify-content-center align-items-center">
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
            <div className="d-flex gap-2 mt-4">
              <Chip tone="up">
                <ShieldCheck size={12} /> 256-bit encryption
              </Chip>
              <Chip tone="muted">Deriv OAuth2</Chip>
            </div>
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
