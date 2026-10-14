// =============================================================================
// MarketingNav.tsx — the H-group shell (H-1 /, /home · H-2 /features · H-3 /pricing)
// Nav gating rule: an entry renders as a <Link> ONLY when `ready: true`
// (its route exists in routeTree.gen.ts). Not-ready entries fall back to a
// real in-page action (anchor scroll or an overlay) — never a dead link.
// Auth actions are REAL routes since the A-group shipped: "Log in" links to
// /auth/signin and signup CTAs link to /auth/signup — never sign-in modals.
// =============================================================================
import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, LayoutGrid, LogIn, Menu, Sparkles } from "lucide-react";
import { Dropdown, ThemeToggle } from "../ui/primitives";

export interface MarketingNavItem {
  id: string;
  label: string;
  /** real route once the page exists */
  to?: string;
  /** in-page anchor fallback (always available) */
  anchor?: string;
  ready: boolean;
  hint?: string;
}

export const MARKETING_NAV: MarketingNavItem[] = [
  { id: "home", label: "Home", to: "/", ready: true },
  { id: "features", label: "Features", to: "/features", ready: true },
  { id: "markets", label: "Markets", anchor: "#markets", ready: false, hint: "Live coverage" },
  { id: "pricing", label: "Pricing", anchor: "#pricing", ready: false, hint: "H-3 plans" },
  { id: "community", label: "Community", anchor: "#community", ready: false, hint: "Leaderboard + feed" },
  { id: "how", label: "How it works", anchor: "#how-it-works", ready: false, hint: "4-step setup" },
];

export function MarketingNav({
  activeId = "home",
  badgeLabel = "H-1 Landing",
  anchorOverrides,
  onGetStarted,
  onOpenCommunity,
  onOpenPricing,
  onOpenMobile,
}: {
  activeId?: string;
  badgeLabel?: string;
  /** per-item in-page anchor overrides for pages whose section ids differ (e.g. H-2) */
  anchorOverrides?: Partial<Record<string, string>>;
  onGetStarted: () => void;
  onOpenCommunity: () => void;
  onOpenPricing: () => void;
  onOpenMobile: () => void;
}) {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (anchor: string) => {
    document.querySelector(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header className="dx-nav" style={scrolled ? { boxShadow: "var(--dx-shadow-2)" } : undefined}>
      <div className="dx-nav-banner">
        <div className="container d-flex flex-wrap align-items-center justify-content-between gap-2">
          <span className="d-inline-flex align-items-center gap-2">
            <span className="dx-pulse" aria-hidden="true" />
            <span className="font-display">ws.derivws.com</span> relay live · median tick latency 12 ms · 4,180 bots running now
          </span>
          <button type="button" className="dx-btn-link" onClick={onOpenPricing}>
            Trader tiers from $29/mo
          </button>
        </div>
      </div>

      <div className="container">
        <div className="dx-nav-inner">
          <Link to="/" className="dx-brand" aria-label="DerivX home">
            <span className="dx-brand-mark">DX</span>
            <span>
              Deriv<span className="dx-up">X</span>
            </span>
          </Link>

          <nav className="dx-nav-links" aria-label="Primary">
            {MARKETING_NAV.map((item) =>
              item.ready && item.to ? (
                <Link key={item.id} to={item.to} className={`dx-nav-link ${activeId === item.id ? "is-active" : ""}`} activeOptions={{ exact: true }}>
                  {item.label}
                </Link>
              ) : (
                <button
                  key={item.id}
                  type="button"
                  className={`dx-nav-link ${activeId === item.id ? "is-active" : ""}`}
                  onClick={() => {
                    if (item.id === "community") onOpenCommunity();
                    else if (item.id === "pricing") onOpenPricing();
                    else if (item.anchor) scrollTo(anchorOverrides?.[item.id] ?? item.anchor);
                  }}
                  title={item.hint}
                >
                  {item.label}
                </button>
              ),
            )}
          </nav>

          <div className="dx-nav-actions">
            <span className="dx-shell-badge d-none d-xl-inline-flex">
              <Sparkles size={12} /> {badgeLabel}
            </span>
            <ThemeToggle />
            <Link to="/auth/signin" className="dx-btn dx-btn-sm dx-btn-ghost">
              <LogIn size={14} /> Log in
            </Link>
            <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={onGetStarted}>
              Connect to Deriv
            </button>

            <Dropdown
              label="More"
              align="end"
              className="dx-nav-desktop-only"
              trigger={
                <span className="d-inline-flex align-items-center gap-1">
                  <LayoutGrid size={13} /> Explore
                </span>
              }
              items={[
                { type: "label", label: "Jump to a section" },
                { id: "n1", label: "Live trading demo", onSelect: () => scrollTo("#live-preview") },
                { id: "n2", label: "Market coverage table", onSelect: () => scrollTo("#markets") },
                { id: "n3", label: "How it works", onSelect: () => scrollTo("#how-it-works") },
                { id: "n4", label: "Community channels", onSelect: onOpenCommunity },
                { type: "divider" },
                { type: "label", label: "Pages" },
                { id: "n5", label: "Features deep dive — /features", onSelect: () => void navigate({ to: "/features" }) },
                { id: "n6", label: "/pricing — H-3", hint: "locked", onSelect: onOpenPricing },
                { type: "divider" },
                { id: "n7", label: "Sign in — /auth/signin", onSelect: () => void navigate({ to: "/auth/signin" }) },
                { id: "n8", label: "Create account — /auth/signup", onSelect: () => void navigate({ to: "/auth/signup" }) },
              ]}
            />

            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost dx-nav-mobile-only" onClick={onOpenMobile} aria-label="Open menu">
              <Menu size={16} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export function MarketingMobileMenu({
  open,
  onClose,
  anchorOverrides,
  onGetStarted,
  onOpenCommunity,
  onOpenPricing,
}: {
  open: boolean;
  onClose: () => void;
  anchorOverrides?: Partial<Record<string, string>>;
  onGetStarted: () => void;
  onOpenCommunity: () => void;
  onOpenPricing: () => void;
}) {
  if (!open) return null;
  return (
    <div className="dx-nav-mobile-only container pb-3" role="navigation" aria-label="Mobile">
      <div className="dx-card dx-card-pad d-grid gap-2">
        {MARKETING_NAV.map((item) =>
          item.ready && item.to ? (
            <Link key={item.id} to={item.to} className="dx-nav-link" onClick={onClose}>
              {item.label}
            </Link>
          ) : (
            <button
              key={item.id}
              type="button"
              className="dx-nav-link"
              onClick={() => {
                if (item.id === "community") onOpenCommunity();
                else if (item.id === "pricing") onOpenPricing();
                else if (item.anchor) document.querySelector(anchorOverrides?.[item.id] ?? item.anchor)?.scrollIntoView({ behavior: "smooth" });
                onClose();
              }}
            >
              {item.label}
              <ChevronDown size={13} />
            </button>
          ),
        )}
        <hr className="dx-hr my-1" />
        <Link to="/auth/signin" className="dx-btn dx-btn-ghost" onClick={onClose}>
          Log in
        </Link>
        <Link to="/auth/signup" className="dx-btn dx-btn-ghost" onClick={onClose}>
          Create free account
        </Link>
        <button type="button" className="dx-btn dx-btn-primary" onClick={() => { onGetStarted(); onClose(); }}>
          Connect to Deriv
        </button>
      </div>
    </div>
  );
}
