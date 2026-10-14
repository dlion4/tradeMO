// =============================================================================
// AppShell.tsx — the D-group shell (dashboard pages D-1 … D-14), built out on
// D-1/D-2. Nav gating: an entry renders as a <Link> ONLY when `ready: true`
// (its route exists in routeTree.gen.ts). Unbuilt pages render as a locked
// chip, never a dead link. The shell owns chrome: sidebar, topbar with global
// search + notifications + account switching, and the mobile nav drawer.
// Pages read the active Deriv account through useDashboardAccount().
// =============================================================================
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Bell,
  Bot,
  Code2,
  Cpu,
  Gauge,
  Landmark,
  LayoutDashboard,
  Layers,
  LineChart,
  Lock,
  LogOut,
  Menu,
  Plug,
  Search,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { Avatar, Chip, Drawer, Dropdown, ThemeToggle } from "../ui/primitives";
import { AccountSwitcherDialog, OAuthWizard } from "../marketing/modals/AccountModals";
import { ApiDocsDialog } from "../marketing/modals/ContentDialogs";
import { StatusDrawer } from "../marketing/modals/SocialModals";
import { agoMin } from "../auth/AuthDialogs";
import { DERIV_ACCOUNTS, NOTIFICATIONS, type AppNotification, type DerivAccount } from "../../data/trading";
import { MARKET_SYMBOLS, usd } from "../../data/market";

export interface ShellNavItem {
  id: string;
  label: string;
  to: string;
  icon: ReactNode;
  ready: boolean;
}

/** D-group navigation map (tradeMO.md §5). Set ready:true when a page ships. */
export const DASHBOARD_NAV: ShellNavItem[] = [
  { id: "d1", label: "Overview", to: "/dashboard", icon: <LayoutDashboard size={15} />, ready: true },
  { id: "d2", label: "Markets", to: "/dashboard/markets", icon: <Layers size={15} />, ready: true },
  { id: "d3", label: "Trade", to: "/dashboard/trade", icon: <Gauge size={15} />, ready: true },
  { id: "d4", label: "Bots", to: "/dashboard/bots", icon: <Bot size={15} />, ready: true },
  { id: "d5", label: "Bot creator", to: "/dashboard/bots/new", icon: <Cpu size={15} />, ready: true },
  { id: "d6", label: "Scripts", to: "/dashboard/scripts", icon: <Code2 size={15} />, ready: true },
  { id: "d7", label: "Automation", to: "/dashboard/automation", icon: <Activity size={15} />, ready: false },
  { id: "d8", label: "Portfolio", to: "/dashboard/portfolio", icon: <Wallet size={15} />, ready: false },
  { id: "d9", label: "Social", to: "/dashboard/social", icon: <Users size={15} />, ready: false },
  { id: "d10", label: "Analytics", to: "/dashboard/analytics", icon: <LineChart size={15} />, ready: false },
  { id: "d11", label: "Connections", to: "/dashboard/connections", icon: <Plug size={15} />, ready: false },
  { id: "d12", label: "Settings", to: "/dashboard/settings", icon: <Settings size={15} />, ready: false },
  { id: "inv", label: "Investor module", to: "/investors", icon: <Landmark size={15} />, ready: false },
];

// ---- active Deriv account, owned by the shell and shared with pages --------
interface DashboardAccountState {
  account: DerivAccount;
  activeLoginId: string;
  setActiveLoginId: (loginId: string) => void;
  openSwitcher: () => void;
  openOAuth: () => void;
}

const DashboardAccountContext = createContext<DashboardAccountState | null>(null);

export function useDashboardAccount(): DashboardAccountState {
  const ctx = useContext(DashboardAccountContext);
  if (!ctx) throw new Error("useDashboardAccount must be used inside <AppShell>");
  return ctx;
}

const NOTIF_TONE: Record<AppNotification["tone"], string> = {
  up: "dx-chip-up",
  info: "dx-chip-info",
  warn: "dx-chip-warn",
  danger: "dx-chip-down",
  accent: "dx-chip-accent",
};

export function AppShell({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [activeLoginId, setActiveLoginId] = useState(DERIV_ACCOUNTS[0].loginId);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [oauthOpen, setOauthOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(NOTIFICATIONS);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const account = DERIV_ACCOUNTS.find((a) => a.loginId === activeLoginId) ?? DERIV_ACCOUNTS[0];
  const unread = notifications.filter((n) => !n.read).length;

  const accountState = useMemo<DashboardAccountState>(
    () => ({
      account,
      activeLoginId,
      setActiveLoginId,
      openSwitcher: () => setSwitcherOpen(true),
      openOAuth: () => setOauthOpen(true),
    }),
    [account, activeLoginId],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { symbols: [], pages: [] as ShellNavItem[] };
    return {
      symbols: MARKET_SYMBOLS.filter((s) => s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)).slice(0, 6),
      pages: DASHBOARD_NAV.filter((n) => n.ready && n.label.toLowerCase().includes(q)),
    };
  }, [query]);

  const openSymbol = (code: string) => {
    setQuery("");
    setSearchOpen(false);
    void navigate({ to: "/dashboard/markets", search: { q: code } });
  };

  const openNotification = (n: AppNotification) => {
    setNotifications((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    setNotifOpen(false);
    if (n.to) void navigate({ to: n.to as "/" });
  };

  const navLink = (item: ShellNavItem) => {
    const active = item.to === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.to);
    return item.ready ? (
      <Link key={item.id} to={item.to} className={`dx-side-link ${active ? "is-active" : ""}`} onClick={() => setMobileNavOpen(false)}>
        {item.icon} {item.label}
      </Link>
    ) : (
      <span key={item.id} className="dx-side-link" style={{ opacity: 0.55, cursor: "not-allowed" }} title="Route not built yet" aria-disabled="true">
        {item.icon}
        <span className="flex-grow-1">{item.label}</span>
        <Lock size={12} />
      </span>
    );
  };

  return (
    <DashboardAccountContext.Provider value={accountState}>
      <div className="dx-app-shell">
        <aside className="dx-sidebar d-none d-lg-block">
          <Link to="/" className="dx-brand mb-4">
            <span className="dx-brand-mark">DX</span>
            <span>
              Deriv<span className="dx-up">X</span>
            </span>
          </Link>
          <nav className="d-grid gap-1" aria-label="Dashboard">
            {DASHBOARD_NAV.map(navLink)}
          </nav>

          <div className="dx-card-inset mt-4">
            <span className="dx-kpi-label">Deriv connection</span>
            <div className="d-flex align-items-center justify-content-between gap-2 mt-1">
              <span className="font-display fw-semibold">{account.loginId}</span>
              <Chip tone={account.connected ? "up" : "warn"} pulse={account.connected}>{account.connected ? "live" : "offline"}</Chip>
            </div>
            <div className="font-display fw-semibold" style={{ fontSize: "1.15rem" }}>{usd(account.balance)}</div>
            <span className="dx-help d-block">{account.label} · equity {usd(account.equity)}</span>
            <div className="row g-2 mt-2">
              <div className="col-6">
                <button type="button" className="dx-btn dx-btn-sm w-100" onClick={() => setSwitcherOpen(true)}>Switch</button>
              </div>
              <div className="col-6">
                <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost w-100" onClick={() => setOauthOpen(true)}>Add new</button>
              </div>
            </div>
          </div>
        </aside>

        <div className="d-flex flex-column min-vw-0" style={{ minWidth: 0 }}>
          <header className="dx-topbar">
            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost d-lg-none" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation">
              <Menu size={16} />
            </button>
            <div className="min-w-0">
              <h1 className="dx-h-card mb-0">{title}</h1>
              {subtitle ? <p className="dx-card-sub mb-0">{subtitle}</p> : null}
            </div>

            <div className="position-relative mx-auto d-none d-md-block" style={{ width: "min(340px, 36vw)" }}>
              <Search size={14} className="position-absolute dx-text-dim" style={{ left: 10, top: 11 }} aria-hidden="true" />
              <input
                id="dx-global-search"
                className="dx-input w-100"
                style={{ paddingLeft: 30 }}
                placeholder="Search symbols or pages…  ( / )"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => window.setTimeout(() => setSearchOpen(false), 140)}
                aria-label="Global search"
              />
              {searchOpen && query.trim() ? (
                <div className="dx-card position-absolute w-100 mt-1 p-2" style={{ zIndex: 1040 }} role="listbox" aria-label="Search results">
                  {results.pages.map((p) => (
                    <button key={p.id} type="button" className="dx-list-row w-100 text-start" onMouseDown={() => { setQuery(""); void navigate({ to: p.to }); }}>
                      {p.icon}
                      <span className="flex-grow-1">
                        <span className="d-block fw-semibold" style={{ fontSize: "0.84rem" }}>{p.label}</span>
                        <span className="dx-help d-block font-display">{p.to}</span>
                      </span>
                    </button>
                  ))}
                  {results.symbols.map((s) => (
                    <button key={s.code} type="button" className="dx-list-row w-100 text-start" onMouseDown={() => openSymbol(s.code)}>
                      <span className="flex-grow-1">
                        <span className="d-block fw-semibold font-display" style={{ fontSize: "0.84rem" }}>{s.code}</span>
                        <span className="dx-help d-block">{s.name} · payout {s.payoutPct}%</span>
                      </span>
                      <span className={`dx-chip ${s.changePct >= 0 ? "dx-chip-up" : "dx-chip-down"}`}>{s.changePct >= 0 ? "+" : ""}{s.changePct}%</span>
                    </button>
                  ))}
                  {!results.pages.length && !results.symbols.length ? (
                    <span className="dx-help d-block p-2">No matches — try R_10, frxEURUSD or “Markets”.</span>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="ms-auto d-flex align-items-center gap-2">
              {actions}
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost position-relative" onClick={() => setNotifOpen(true)} aria-label={`Notifications, ${unread} unread`}>
                <Bell size={15} />
                {unread ? <span className="dx-chip dx-chip-down position-absolute" style={{ top: -7, right: -7, padding: "0 5px", fontSize: "0.62rem" }}>{unread}</span> : null}
              </button>
              <button type="button" className="dx-btn dx-btn-sm" onClick={() => setSwitcherOpen(true)} aria-label="Switch Deriv account">
                <span className="font-display">{account.loginId}</span>
                <span className="d-none d-xl-inline font-display"> · {usd(account.balance)}</span>
              </button>
              <Dropdown
                label="User menu"
                align="end"
                trigger={
                  <span className="d-inline-flex align-items-center gap-2">
                    <Avatar name="Amara Okafor" size="sm" /> <span className="d-none d-xl-inline">Amara</span>
                  </span>
                }
                items={[
                  { type: "label", label: "trader@derivx.app · Pro plan" },
                  { id: "u1", label: "Verify email", icon: <ShieldCheck size={13} />, onSelect: () => void navigate({ to: "/auth/verify-email" }) },
                  { id: "u2", label: "Two-factor & backup codes", icon: <ShieldCheck size={13} />, onSelect: () => void navigate({ to: "/auth/2fa" }) },
                  { id: "u3", label: "Landing page", onSelect: () => void navigate({ to: "/" }) },
                  { type: "divider" },
                  { id: "u4", label: "Sign out", icon: <LogOut size={13} />, danger: true, onSelect: () => void navigate({ to: "/auth/signin" }) },
                ]}
              />
              <ThemeToggle />
            </div>
          </header>
          <main className="dx-main">{children}</main>
        </div>

        {/* ---- mobile navigation ---- */}
        <Drawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} side="start" title="DerivX dashboard"
          subtitle={`${account.loginId} · ${usd(account.balance)}`}>
          <nav className="d-grid gap-1" aria-label="Dashboard mobile">
            {DASHBOARD_NAV.map(navLink)}
          </nav>
          <div className="row g-2 mt-3">
            <div className="col-6">
              <button type="button" className="dx-btn w-100" onClick={() => { setMobileNavOpen(false); setSwitcherOpen(true); }}>Switch account</button>
            </div>
            <div className="col-6">
              <button type="button" className="dx-btn dx-btn-ghost w-100" onClick={() => { setMobileNavOpen(false); void navigate({ to: "/auth/signin" }); }}>Sign out</button>
            </div>
          </div>
        </Drawer>

        {/* ---- notifications ---- */}
        <Drawer open={notifOpen} onClose={() => setNotifOpen(false)} title="Notifications" wide
          subtitle={`${unread} unread · bot events, settlements and security alerts`}
          footer={
            <button type="button" className="dx-btn w-100" onClick={() => setNotifications((list) => list.map((n) => ({ ...n, read: true })))}>
              Mark all as read
            </button>
          }>
          <div className="d-grid gap-2">
            {notifications.map((n) => (
              <button key={n.id} type="button" className="dx-card-inset text-start w-100" onClick={() => openNotification(n)}
                style={n.read ? undefined : { borderLeft: "3px solid var(--dx-accent)" }}>
                <span className="d-flex align-items-center justify-content-between gap-2">
                  <span className="fw-semibold" style={{ fontSize: "0.86rem" }}>{n.title}</span>
                  <span className="dx-help font-display">{agoMin(n.epochMin)}</span>
                </span>
                <span className="dx-help d-block">{n.body}</span>
                <span className={`dx-chip ${NOTIF_TONE[n.tone]} mt-1`}>{n.read ? "read" : "new"}</span>
              </button>
            ))}
          </div>
        </Drawer>

        <AccountSwitcherDialog open={switcherOpen} onClose={() => setSwitcherOpen(false)} activeLoginId={activeLoginId}
          onSetActive={(id) => setActiveLoginId(id)}
          onOpenOAuth={() => { setSwitcherOpen(false); setOauthOpen(true); }}
          onDisconnected={(id) => { if (id === activeLoginId) setActiveLoginId(DERIV_ACCOUNTS.find((a) => a.loginId !== id)?.loginId ?? DERIV_ACCOUNTS[0].loginId); }}
          onOpenStatus={() => { setSwitcherOpen(false); setStatusOpen(true); }} />
        <OAuthWizard open={oauthOpen} onClose={() => setOauthOpen(false)}
          onConnected={(id) => setActiveLoginId(id)}
          onOpenStatus={() => { setOauthOpen(false); setStatusOpen(true); }}
          onOpenSignUp={() => { setOauthOpen(false); void navigate({ to: "/auth/signup" }); }}
          onOpenDemo={() => { setOauthOpen(false); void navigate({ to: "/dashboard" }); }} />
        <StatusDrawer open={statusOpen} onClose={() => setStatusOpen(false)}
          onOpenDocs={() => { setStatusOpen(false); setDocsOpen(true); }}
          onOpenConnections={() => { setStatusOpen(false); setSwitcherOpen(true); }} />
        <ApiDocsDialog open={docsOpen} onClose={() => setDocsOpen(false)}
          onOpenStatus={() => { setDocsOpen(false); setStatusOpen(true); }}
          onOpenDemo={() => { setDocsOpen(false); void navigate({ to: "/dashboard" }); }} />
      </div>
    </DashboardAccountContext.Provider>
  );
}
