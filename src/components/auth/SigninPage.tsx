// =============================================================================
// SigninPage.tsx — A-2 (/auth/signin). Blueprint contract: email + password
// (schema: valid email, password min 1, rememberMe default false) → simulated
// POST /api/auth/login returning { user, token, refreshToken,
// hasDerivConnection }. Accounts with 2FA continue to the real A-7 route;
// Deriv sign-in leaves via the real A-3 callback route. Front-end only.
// =============================================================================
import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Eye, EyeOff, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { AuthShell } from "./AuthShell";
import { GoogleAccountDialog } from "./SignupDialogs";
import { LoginActivityDialog, SessionsDrawer, UnlinkDerivDialog, agoMin } from "./AuthDialogs";
import { Alert, Avatar, Chip, CopyButton, Field, useToast } from "../ui/primitives";
import { AccountSwitcherDialog, OAuthWizard } from "../marketing/modals/AccountModals";
import { DemoConsoleDialog } from "../marketing/modals/DemoModals";
import { ApiDocsDialog, CommunityDialog, ContactDialog, FaqDialog, LegalDialog } from "../marketing/modals/ContentDialogs";
import { BacktestDialog, DeployBotWizard, PresetsDialog, PricingDialog } from "../marketing/modals/CommerceDialogs";
import { LeaderboardDialog, StatusDrawer, TraderDrawer, CopySetupWizard } from "../marketing/modals/SocialModals";
import {
  DERIV_ACCOUNTS,
  LEGAL_DOCS,
  LOGIN_ATTEMPTS,
  SIGNIN_ACCOUNTS,
  TRADERS,
  type SigninAccount,
  type StrategyPreset,
  type Trader,
} from "../../data/trading";
import { usd } from "../../data/market";
import type { DemoTab, QueuedBot } from "../marketing/types";

export function SigninPage() {
  const toast = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [failures, setFailures] = useState(0);
  const [user, setUser] = useState<SigninAccount | null>(null);
  const [viaMethod, setViaMethod] = useState<"Password" | "Google">("Password");

  // overlays
  const [googleOpen, setGoogleOpen] = useState(false);
  const [oauthOpen, setOauthOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [unlinkId, setUnlinkId] = useState<string | null>(null);
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoTab, setDemoTab] = useState<DemoTab>("trade");
  const [statusOpen, setStatusOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [communityOpen, setCommunityOpen] = useState(false);
  const [legalDocId, setLegalDocId] = useState<string | null>(null);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [backtestOpen, setBacktestOpen] = useState(false);
  const [backtestPreset, setBacktestPreset] = useState<string | undefined>(undefined);
  const [deployPreset, setDeployPreset] = useState<StrategyPreset | null>(null);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [trader, setTrader] = useState<Trader | null>(null);
  const [copyTrader, setCopyTrader] = useState<Trader | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [activeLoginId, setActiveLoginId] = useState(DERIV_ACCOUNTS[0].loginId);
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [queuedBots, setQueuedBots] = useState<QueuedBot[]>([]);
  const [lastOrder, setLastOrder] = useState<string | null>(null);

  const openDemo = (tab: DemoTab) => { setDemoTab(tab); setDemoOpen(true); };
  const legalDoc = useMemo(() => LEGAL_DOCS.find((d) => d.id === legalDocId) ?? null, [legalDocId]);
  const blocked = failures >= 3;

  // --- demo accounts: visible credentials + one-tap autofill -----------------
  const [demoPanelOpen, setDemoPanelOpen] = useState(false);
  const filledAccount = SIGNIN_ACCOUNTS.find((a) => a.email === email && a.password === password) ?? null;
  const fillDemoAccount = (a: SigninAccount) => {
    setEmail(a.email);
    setPassword(a.password);
    setShowPw(true);
    setErrors({});
    setFormError("");
  };
  const toggleDemoPanel = () => {
    setDemoPanelOpen((open) => {
      // Opening the panel also fills the primary demo account, so the form is
      // ready to submit in one click — switch accounts from the list below.
      if (!open && !filledAccount) fillDemoAccount(SIGNIN_ACCOUNTS[0]);
      return !open;
    });
  };

  const signIn = () => {
    const next: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) next.email = "Enter the email you registered with.";
    if (password.length < 1) next.password = "Enter your password.";
    setErrors(next);
    if (Object.keys(next).length || busy || blocked) return;
    setBusy(true);
    setFormError("");
    // Simulated POST /api/auth/login — resolves in-page after a tick.
    window.setTimeout(() => {
      setBusy(false);
      const account = SIGNIN_ACCOUNTS.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
      if (!account || account.password !== password) {
        const count = failures + 1;
        setFailures(count);
        setFormError(
          count >= 3
            ? "Too many failed attempts — password sign-in is blocked for 15 minutes. Use Google, Deriv OAuth, or reset your password."
            : `Email or password does not match our records. ${3 - count} attempt${3 - count === 1 ? "" : "s"} left before a temporary block.`,
        );
        return;
      }
      setFailures(0);
      if (account.twoFactor) {
        void navigate({ to: "/auth/2fa", search: { email: account.email } });
        return;
      }
      setViaMethod("Password");
      setUser(account);
    }, 900);
  };

  const signOut = () => {
    setUser(null);
    setPassword("");
    setFormError("");
  };

  return (
    <div className="page-auth-signin">
      <AuthShell
        title="Welcome back"
        subtitle="Sign in to DerivX — not to Deriv. Your bots kept running under your saved risk caps while you were away."
        side="signin"
        stepLabel="Welcome back · Sign in"
        extras={
          <div className="d-grid gap-3">
            <div className="dx-card dx-card-pad">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="dx-kpi-label mb-0">Recent sign-ins</span>
                <span className="dx-pulse" aria-label="live" />
              </div>
              <div className="dx-list">
                {LOGIN_ATTEMPTS.slice(0, 4).map((a) => (
                  <button key={a.id} type="button" className="dx-list-row w-100 text-start" onClick={() => setActivityOpen(true)}>
                    <span className="flex-grow-1 min-w-0">
                      <span className="d-block fw-semibold" style={{ fontSize: "0.82rem" }}>{a.device}</span>
                      <span className="dx-help d-block text-truncate">{a.location} · {agoMin(a.epochMin)} · {a.method}</span>
                    </span>
                    <span className={`dx-chip ${a.result === "success" ? "dx-chip-up" : a.result === "2fa-challenge" ? "dx-chip-warn" : "dx-chip-down"}`}>{a.result}</span>
                  </button>
                ))}
              </div>
              <div className="d-flex flex-wrap gap-2 mt-3">
                <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setActivityOpen(true)}>Full login activity</button>
                <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setSessionsOpen(true)}>
                  <ShieldCheck size={13} /> Trusted sessions
                </button>
              </div>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setPricingOpen(true)}>Compare plans</button>
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setFaqOpen(true)}>Help &amp; FAQ</button>
              <Link to="/features" className="dx-btn dx-btn-sm dx-btn-ghost">Explore features</Link>
            </div>
          </div>
        }
        footer={
          <div className="d-flex flex-wrap align-items-center gap-2">
            <span className="dx-help me-1">Legal &amp; help:</span>
            <button type="button" className="dx-btn-link" onClick={() => setLegalDocId("terms")}>Terms of Service</button>
            <button type="button" className="dx-btn-link" onClick={() => setLegalDocId("privacy")}>Privacy Policy</button>
            <button type="button" className="dx-btn-link" onClick={() => setStatusOpen(true)}>API status</button>
            <button type="button" className="dx-btn-link" onClick={() => setCommunityOpen(true)}>Community</button>
            <button type="button" className="dx-btn-link" onClick={() => setContactOpen(true)}>Contact</button>
          </div>
        }
      >
        {user ? (
          <div className="d-grid gap-3">
            <div className="d-flex align-items-center gap-3">
              <Avatar name={user.name} size="lg" />
              <div>
                <h2 className="dx-h-card mb-0">{user.name}</h2>
                <span className="dx-help d-block">{user.email} · signed in via {viaMethod}</span>
              </div>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <Chip tone="accent">{activePlan ?? user.plan} plan</Chip>
              <Chip tone={user.hasDeriv ? "up" : "warn"}>{user.hasDeriv ? `Deriv ${user.derivLoginId} linked` : "Deriv not linked yet"}</Chip>
              <Chip tone="muted">{rememberMe ? "Refresh token: 30 days" : "Refresh token: 7 days"}</Chip>
            </div>
            <div className="dx-card-inset">
              <span className="dx-kpi-label">Session (simulated JWT)</span>
              <p className="font-display mb-1" style={{ fontSize: "0.78rem", wordBreak: "break-all" }}>
                dx_live_{user.id}·access 15m·refresh {rememberMe ? "30d" : "7d"}
              </p>
              <span className="dx-help">lastOrder: {lastOrder ?? "No contracts bought this session — open the dashboard to place one."}</span>
            </div>
            <button type="button" className="dx-btn dx-btn-lg dx-btn-primary w-100" onClick={() => void navigate({ to: "/dashboard" })}>
              Open dashboard <ArrowRight size={15} />
            </button>
            <div className="row g-2">
              <div className="col-6">
                {user.hasDeriv ? (
                  <button type="button" className="dx-btn w-100" onClick={() => setAccountsOpen(true)}>Manage Deriv connections</button>
                ) : (
                  <button type="button" className="dx-btn w-100" onClick={() => setOauthOpen(true)}>
                    <KeyRound size={14} /> Connect Deriv
                  </button>
                )}
              </div>
              <div className="col-6">
                <button type="button" className="dx-btn w-100" onClick={() => setSessionsOpen(true)}>Trusted sessions</button>
              </div>
            </div>
            {user.hasDeriv && user.derivLoginId ? (
              <button type="button" className="dx-btn-link" onClick={() => setUnlinkId(user.derivLoginId)}>Disconnect Deriv {user.derivLoginId}</button>
            ) : null}
            <button type="button" className="dx-btn-link" onClick={signOut}>Sign out and use a different account</button>
          </div>
        ) : (
          <form
            noValidate
            onSubmit={(e) => { e.preventDefault(); signIn(); }}
            className="d-grid gap-3"
          >
            <div className="d-flex align-items-center justify-content-between gap-2">
              <h2 className="dx-h-card mb-0">Sign in to DerivX</h2>
              <button
                type="button"
                className="dx-btn dx-btn-sm dx-btn-primary"
                aria-expanded={demoPanelOpen}
                aria-controls="dx-demo-accounts"
                onClick={toggleDemoPanel}
              >
                Use a demo account
              </button>
            </div>

            {demoPanelOpen ? (
              <div className="dx-card-inset" id="dx-demo-accounts">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-1">
                  <span className="dx-kpi-label">Demo accounts</span>
                  <Chip tone="accent">tap an account to fill the form</Chip>
                </div>
                <p className="dx-help mb-2">
                  Demo credentials are shown in full — no real money, nothing leaves this browser.
                  Accounts marked <strong>2FA on</strong> continue to the authenticator step after sign-in.
                </p>
                <div className="d-grid gap-2">
                  {SIGNIN_ACCOUNTS.map((a) => {
                    const filled = filledAccount?.id === a.id;
                    return (
                      <div key={a.id} className="d-flex flex-wrap align-items-center gap-2">
                        <button
                          type="button"
                          className="dx-list-row flex-grow-1 text-start"
                          aria-pressed={filled}
                          onClick={() => fillDemoAccount(a)}
                        >
                          <span className="text-start">
                            <span className="d-flex flex-wrap align-items-center gap-2">
                              <strong>{a.name}</strong>
                              <Chip>{a.plan} plan</Chip>
                              <Chip tone={a.twoFactor ? "warn" : "muted"}>{a.twoFactor ? "2FA on" : "no 2FA"}</Chip>
                              {filled ? <Chip tone="up">in form ✓</Chip> : null}
                            </span>
                            <span className="d-block font-display" style={{ fontSize: "0.82rem" }}>{a.email}</span>
                            <span className="d-block dx-help">
                              password <span className="font-display" style={{ fontSize: "0.82rem" }}>{a.password}</span>
                              {a.derivLoginId ? <> · Deriv <span className="font-display">{a.derivLoginId}</span></> : " · Deriv not linked"}
                            </span>
                          </span>
                        </button>
                        <span className="d-flex gap-1">
                          <CopyButton text={a.email} label="Email" />
                          <CopyButton text={a.password} label="Password" />
                        </span>
                      </div>
                    );
                  })}
                </div>
                {filledAccount ? (
                  <p className="dx-help mb-0 mt-2">
                    <strong>{filledAccount.name}</strong> is filled in below — press <strong>Sign In</strong> to continue
                    {filledAccount.twoFactor ? " to the 2FA step" : ""}.
                  </p>
                ) : null}
              </div>
            ) : null}

            {activePlan ? <Alert tone="info" title={`${activePlan} plan selected`}>The plan applies as soon as you sign in — change it any time from Pricing.</Alert> : null}
            {formError ? <Alert tone="danger" title="Sign-in failed">{formError}</Alert> : null}
            {blocked ? (
              <div className="d-flex flex-wrap gap-2">
                <Link to="/auth/forgot-password" className="dx-btn dx-btn-sm">Reset password instead</Link>
                <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setContactOpen(true)}>Contact support</button>
              </div>
            ) : null}

            <Field label="Email" required error={errors.email}>
              <input className={`dx-input ${errors.email ? "is-invalid" : ""}`} type="email" autoComplete="email"
                placeholder="trader@derivx.app" value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((er) => ({ ...er, email: "" })); }} />
            </Field>

            <Field label="Password" required error={errors.password}>
              <div className="dx-input-group">
                <input className={`dx-input ${errors.password ? "is-invalid" : ""}`} type={showPw ? "text" : "password"}
                  autoComplete="current-password" placeholder="Your DerivX password" value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors((er) => ({ ...er, password: "" })); }} />
                <button type="button" className="dx-btn" style={{ borderRadius: "0 8px 8px 0" }}
                  onClick={() => setShowPw((s) => !s)} aria-label={showPw ? "Hide password" : "Show password"}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </Field>

            <div className="d-flex align-items-center justify-content-between gap-2">
              <label className="d-flex align-items-center gap-2 dx-text-dim" style={{ fontSize: "0.86rem" }}>
                <input type="checkbox" className="form-check-input" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                Remember me (30-day refresh)
              </label>
              <Link to="/auth/forgot-password" className="dx-btn-link">Forgot password?</Link>
            </div>

            <button type="submit" className="dx-btn dx-btn-lg dx-btn-primary w-100" disabled={busy || blocked}>
              {busy ? "Checking credentials…" : "Sign In"}
            </button>

            <div className="d-flex align-items-center gap-3" aria-hidden="true">
              <span className="dx-hr flex-grow-1" /><span className="dx-help">or sign in with</span><span className="dx-hr flex-grow-1" />
            </div>
            <div className="row g-2">
              <div className="col-6">
                <button type="button" className="dx-btn w-100" onClick={() => setGoogleOpen(true)}>
                  <Mail size={14} /> Google
                </button>
              </div>
              <div className="col-6">
                <button type="button" className="dx-btn w-100"
                  onClick={() => void navigate({ to: "/auth/deriv/callback", search: { code: "demo_auth_code_8f3ka", state: "csrf_7f2demo" } })}>
                  <KeyRound size={14} /> Deriv
                </button>
              </div>
            </div>

            <p className="dx-help text-center mb-0">
              Don&apos;t have an account? <Link to="/auth/signup" className="dx-btn-link">Sign Up →</Link>
            </p>
          </form>
        )}
      </AuthShell>

      {/* ================= overlays ================= */}
      <GoogleAccountDialog open={googleOpen} onClose={() => setGoogleOpen(false)}
        onLinked={(name, emailAddr) => {
          setGoogleOpen(false);
          const match = SIGNIN_ACCOUNTS.find((a) => a.email.toLowerCase() === emailAddr.toLowerCase());
          setViaMethod("Google");
          setUser(match ?? { id: "usr_google", email: emailAddr, name, password: "", twoFactor: false, hasDeriv: false, derivLoginId: null, plan: "Free", lastLoginMin: 0 });
          toast.push({ tone: "success", title: `Signed in as ${name}`, body: "Google identity verified — session issued for 7 days." });
        }} />
      <OAuthWizard open={oauthOpen} onClose={() => setOauthOpen(false)}
        onConnected={(id) => {
          setActiveLoginId(id);
          setUser((u) => (u ? { ...u, hasDeriv: true, derivLoginId: id } : u));
          toast.push({ tone: "success", title: `Deriv connection established — ${id}`, body: "Token stored encrypted; bots can trade inside your risk caps." });
        }}
        onOpenStatus={() => { setOauthOpen(false); setStatusOpen(true); }}
        onOpenSignUp={() => { setOauthOpen(false); void navigate({ to: "/auth/signup" }); }}
        onOpenDemo={() => { setOauthOpen(false); openDemo("trade"); }} />
      <SessionsDrawer open={sessionsOpen} onClose={() => setSessionsOpen(false)} />
      <LoginActivityDialog open={activityOpen} onClose={() => setActivityOpen(false)}
        onOpenSessions={() => { setActivityOpen(false); setSessionsOpen(true); }} />
      <AccountSwitcherDialog open={accountsOpen} onClose={() => setAccountsOpen(false)} activeLoginId={activeLoginId}
        onSetActive={(id) => setActiveLoginId(id)}
        onOpenOAuth={() => { setAccountsOpen(false); setOauthOpen(true); }}
        onDisconnected={(id) => {
          if (user?.derivLoginId === id) setUser({ ...user, hasDeriv: false, derivLoginId: null });
        }}
        onOpenStatus={() => { setAccountsOpen(false); setStatusOpen(true); }} />
      <UnlinkDerivDialog loginId={unlinkId} onClose={() => setUnlinkId(null)}
        onUnlinked={(id) => {
          setUser((u) => (u && u.derivLoginId === id ? { ...u, hasDeriv: false, derivLoginId: null } : u));
          toast.push({ tone: "success", title: `Deriv ${id} disconnected`, body: "Bots on that account are paused." });
        }} />
      <DemoConsoleDialog open={demoOpen} onClose={() => setDemoOpen(false)} initialTab={demoTab} queuedBots={queuedBots}
        onContractBought={(receipt) => {
          setLastOrder(`#${receipt.contractId} ${receipt.symbol} ${usd(receipt.stake)}`);
          toast.push({ tone: "success", title: `Contract ${receipt.contractId} bought`, body: `${receipt.symbol} · stake ${usd(receipt.stake)} → payout ${usd(receipt.payout)}.` });
        }}
        onOpenPresets={() => setPresetsOpen(true)}
        onOpenBacktests={(id) => { setBacktestPreset(id); setBacktestOpen(true); }}
        onOpenLeaderboard={() => setLeaderboardOpen(true)}
        onOpenStatus={() => setStatusOpen(true)}
        onOpenCommunity={() => setCommunityOpen(true)} />
      <PresetsDialog open={presetsOpen} onClose={() => setPresetsOpen(false)}
        onDeploy={(p) => { setPresetsOpen(false); setDeployPreset(p); }}
        onBacktest={(id) => { setPresetsOpen(false); setBacktestPreset(id); setBacktestOpen(true); }}
        onOpenFeature={() => { setPresetsOpen(false); void navigate({ to: "/features" }); }} />
      <BacktestDialog open={backtestOpen} onClose={() => setBacktestOpen(false)} initialPresetId={backtestPreset}
        onDeploy={(p) => { setBacktestOpen(false); setDeployPreset(p); }} />
      <DeployBotWizard open={Boolean(deployPreset)} onClose={() => setDeployPreset(null)} preset={deployPreset}
        onDeployed={(name, stake, cap) => {
          const p = deployPreset;
          if (p) setQueuedBots((list) => [...list, { id: `bot_signin_${list.length + 1}`, name, symbol: p.symbol, stake, cap, strategy: p.kind, contractType: p.contractType, duration: p.duration, durationUnit: p.durationUnit, risk: p.risk, winRate: p.winRate }]);
          setDeployPreset(null);
          openDemo("bots");
        }} />
      <LeaderboardDialog open={leaderboardOpen} onClose={() => setLeaderboardOpen(false)}
        onOpenTrader={(id) => setTrader(TRADERS.find((t) => t.id === id) ?? null)}
        onCopy={(t) => setTrader(t)}
        onOpenCommunity={() => { setLeaderboardOpen(false); setCommunityOpen(true); }}
        onOpenBacktests={() => { setLeaderboardOpen(false); setBacktestOpen(true); }} />
      <TraderDrawer trader={trader} onClose={() => setTrader(null)}
        onCopy={(t) => { setTrader(null); setCopyTrader(t); }}
        onOpenLeaderboard={() => { setTrader(null); setLeaderboardOpen(true); }}
        onOpenCommunity={() => setCommunityOpen(true)}
        copied={Boolean(trader && copiedId === trader.id)} />
      <CopySetupWizard open={Boolean(copyTrader)} onClose={() => setCopyTrader(null)} trader={copyTrader}
        onCopied={(traderId, ratio, cap) => {
          setCopiedId(traderId);
          const t = TRADERS.find((x) => x.id === traderId);
          toast.push({ tone: "success", title: `Now copying ${t?.displayName ?? "trader"}`, body: `Stake ratio ${ratio}x · loss cap ${usd(cap, 0)} · kill switch armed.` });
        }} />
      <StatusDrawer open={statusOpen} onClose={() => setStatusOpen(false)}
        onOpenDocs={() => { setStatusOpen(false); setDocsOpen(true); }}
        onOpenConnections={() => { setStatusOpen(false); setAccountsOpen(true); }} />
      <ApiDocsDialog open={docsOpen} onClose={() => setDocsOpen(false)}
        onOpenStatus={() => { setDocsOpen(false); setStatusOpen(true); }}
        onOpenDemo={() => { setDocsOpen(false); openDemo("trade"); }} />
      <FaqDialog open={faqOpen} onClose={() => setFaqOpen(false)}
        onContact={() => { setFaqOpen(false); setContactOpen(true); }}
        onOpenDocs={() => { setFaqOpen(false); setDocsOpen(true); }}
        onOpenPricing={() => { setFaqOpen(false); setPricingOpen(true); }} />
      <PricingDialog open={pricingOpen} onClose={() => setPricingOpen(false)}
        onOpenFaq={() => { setPricingOpen(false); setFaqOpen(true); }}
        onDeployed={(name) => { setPricingOpen(false); setActivePlan(name); }} />
      <LegalDialog doc={legalDoc} onClose={() => setLegalDocId(null)}
        onContact={() => { setLegalDocId(null); setContactOpen(true); }} />
      <CommunityDialog open={communityOpen} onClose={() => setCommunityOpen(false)}
        onContact={() => { setCommunityOpen(false); setContactOpen(true); }}
        onLeaderboard={() => { setCommunityOpen(false); openDemo("social"); }} />
      <ContactDialog open={contactOpen} onClose={() => setContactOpen(false)}
        onOpenCommunity={() => { setContactOpen(false); setCommunityOpen(true); }} />
    </div>
  );
}
