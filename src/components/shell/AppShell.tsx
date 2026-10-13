// =============================================================================
// AppShell.tsx — the D-group shell (dashboard pages D-1 … D-14).
// Nav gating: an entry is rendered as a <Link> ONLY when `ready: true`
// (its route exists in routeTree.gen.ts). Unbuilt pages render as a locked
// chip, never as a dead link.
// Scaffolding for the D-group — H-1 does not mount this shell.
// =============================================================================
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  Bot,
  Code2,
  Cpu,
  Gauge,
  Landmark,
  LayoutDashboard,
  Layers,
  LineChart,
  Lock,
  Plug,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import { Chip } from "../ui/primitives";
import { DERIV_ACCOUNTS } from "../../data/trading";
import { usd } from "../../data/market";

export interface ShellNavItem {
  id: string;
  label: string;
  to: string;
  icon: ReactNode;
  ready: boolean;
}

/** D-group navigation map (tradeMO.md §5). Set ready:true when a page ships. */
export const DASHBOARD_NAV: ShellNavItem[] = [
  { id: "d1", label: "Overview", to: "/dashboard", icon: <LayoutDashboard size={15} />, ready: false },
  { id: "d2", label: "Markets", to: "/dashboard/markets", icon: <Layers size={15} />, ready: false },
  { id: "d3", label: "Trade", to: "/dashboard/trade", icon: <Gauge size={15} />, ready: false },
  { id: "d4", label: "Bots", to: "/dashboard/bots", icon: <Bot size={15} />, ready: false },
  { id: "d5", label: "Bot creator", to: "/dashboard/bots/new", icon: <Cpu size={15} />, ready: false },
  { id: "d6", label: "Scripts", to: "/dashboard/scripts", icon: <Code2 size={15} />, ready: false },
  { id: "d7", label: "Automation", to: "/dashboard/automation", icon: <Activity size={15} />, ready: false },
  { id: "d8", label: "Portfolio", to: "/dashboard/portfolio", icon: <Wallet size={15} />, ready: false },
  { id: "d9", label: "Social", to: "/dashboard/social", icon: <Users size={15} />, ready: false },
  { id: "d10", label: "Analytics", to: "/dashboard/analytics", icon: <LineChart size={15} />, ready: false },
  { id: "d11", label: "Connections", to: "/dashboard/connections", icon: <Plug size={15} />, ready: false },
  { id: "d12", label: "Settings", to: "/dashboard/settings", icon: <Settings size={15} />, ready: false },
  { id: "inv", label: "Investor module", to: "/investors", icon: <Landmark size={15} />, ready: false },
];

export function AppShell({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode }) {
  const primary = DERIV_ACCOUNTS[0];
  return (
    <div className="dx-app-shell">
      <aside className="dx-sidebar d-none d-lg-block">
        <Link to="/" className="dx-brand mb-4">
          <span className="dx-brand-mark">DX</span>
          <span>
            Deriv<span className="dx-up">X</span>
          </span>
        </Link>
        <nav className="d-grid gap-1" aria-label="Dashboard">
          {DASHBOARD_NAV.map((item) =>
            item.ready ? (
              <Link key={item.id} to={item.to} className="dx-side-link">
                {item.icon} {item.label}
              </Link>
            ) : (
              <span key={item.id} className="dx-side-link" style={{ opacity: 0.55, cursor: "not-allowed" }} title="Route not built in this session">
                {item.icon}
                <span className="flex-grow-1">{item.label}</span>
                <Lock size={12} />
              </span>
            ),
          )}
        </nav>
      </aside>

      <div className="d-flex flex-column min-vw-0">
        <header className="dx-topbar">
          <div className="min-w-0">
            <h1 className="dx-h-card mb-0">{title}</h1>
            {subtitle ? <p className="dx-card-sub">{subtitle}</p> : null}
          </div>
          <div className="ms-auto d-flex align-items-center gap-2">
            <Chip tone="muted">{primary.loginId}</Chip>
            <Chip tone="up">
              <span className="dx-pulse" /> {usd(primary.balance)}
            </Chip>
            {actions}
          </div>
        </header>
        <main className="dx-main">{children}</main>
      </div>
    </div>
  );
}
