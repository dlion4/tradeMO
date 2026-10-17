// =============================================================================
// ResetPasswordPage.tsx — A-5 (/auth/reset-password). Blueprint contract:
// token from the email link + new password (min 8, uppercase, digit, special)
// → simulated POST /api/auth/reset-password → all sessions invalidated →
// back to A-2. Expired/used/missing token states are first-class screens.
// Demo tokens: dxr_live_9f27c1 (valid), dxr_expired_41aa (expired).
// =============================================================================
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Check, Eye, EyeOff, XCircle } from "lucide-react";
import { AuthShell } from "./AuthShell";
import { PasswordPolicyDialog, passwordScore } from "./SignupDialogs";
import { AuthConsole, AuthInboxDrawer, SessionsDrawer } from "./AuthDialogs";
import { Alert, Chip, Field, Meter, MiniTabs } from "../ui/primitives";
import { ApiDocsDialog, CommunityDialog, ContactDialog, FaqDialog, LegalDialog } from "../marketing/modals/ContentDialogs";
import { PricingDialog } from "../marketing/modals/CommerceDialogs";
import { StatusDrawer } from "../marketing/modals/SocialModals";
import { AccountSwitcherDialog, OAuthWizard } from "../marketing/modals/AccountModals";
import { DEMO_RESET_TOKEN, LEGAL_DOCS } from "../../data/trading";

type TokenState = "valid" | "expired" | "used" | "missing";

export function ResetPasswordPage({ token }: { token?: string }) {
  const navigate = useNavigate();
  const derived: TokenState = !token ? "missing" : token.includes("expired") ? "expired" : token.includes("used") ? "used" : "valid";
  const [tokenState, setTokenState] = useState<TokenState>(derived);
  useEffect(() => { setTokenState(derived); }, [derived]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const [policyOpen, setPolicyOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [oauthOpen, setOauthOpen] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [activeLoginId, setActiveLoginId] = useState("CR8842197");
  const [statusOpen, setStatusOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [communityOpen, setCommunityOpen] = useState(false);
  const [legalDocId, setLegalDocId] = useState<string | null>(null);
  const [planNote, setPlanNote] = useState<string | null>(null);

  const legalDoc = useMemo(() => LEGAL_DOCS.find((d) => d.id === legalDocId) ?? null, [legalDocId]);
  const { score, checks } = passwordScore(password);
  const matches = confirm.length > 0 && confirm === password;

  const submit = () => {
    const next: Record<string, string> = {};
    if (password.length < 8) next.password = "At least 8 characters.";
    else if (!checks.find((c) => c.id === "upper")?.ok) next.password = "Add an uppercase letter.";
    else if (!checks.find((c) => c.id === "digit")?.ok) next.password = "Add a digit.";
    else if (!checks.find((c) => c.id === "special")?.ok) next.password = "Add a symbol (e.g. ! ? # -).";
    if (confirm !== password || confirm === "") next.confirm = "Confirm password must match the new password.";
    setErrors(next);
    if (Object.keys(next).length || busy) return;
    setBusy(true);
    // Simulated POST /api/auth/reset-password — token hash lookup + session wipe.
    window.setTimeout(() => { setBusy(false); setDone(true); }, 900);
  };

  return (
    <div className="page-auth-reset">
      <AuthShell
        title="Set new password"
        subtitle="This replaces your DerivX password only — your Deriv password and OAuth connection are untouched."
        side="reset"
        stepLabel="Account recovery · New password"
        extras={
          <div className="d-grid gap-3">
            <div className="dx-card dx-card-pad">
              <span className="dx-kpi-label">Demo: token states</span>
              <MiniTabs
                ariaLabel="Reset token state"
                value={tokenState}
                onChange={(id) => { setTokenState(id as TokenState); setDone(false); }}
                options={[
                  { id: "valid", label: "Valid" },
                  { id: "expired", label: "Expired" },
                  { id: "used", label: "Used" },
                  { id: "missing", label: "Missing" },
                ]}
              />
              <p className="dx-help mb-0 mt-2">
                Real links arrive as <span className="font-display">/auth/reset-password?token=…</span> — try the expired and vaulted states without waiting an hour.
              </p>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setSessionsOpen(true)}>Sessions that will be revoked</button>
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setPolicyOpen(true)}>Password policy</button>
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setFaqOpen(true)}>Help &amp; FAQ</button>
            </div>
          </div>
        }
        footer={
          <div className="d-flex flex-wrap align-items-center gap-2">
            <span className="dx-help me-1">Legal &amp; help:</span>
            <button type="button" className="dx-btn-link" onClick={() => setLegalDocId("terms")}>Terms of Service</button>
            <button type="button" className="dx-btn-link" onClick={() => setStatusOpen(true)}>API status</button>
            <button type="button" className="dx-btn-link" onClick={() => setCommunityOpen(true)}>Community</button>
            <button type="button" className="dx-btn-link" onClick={() => setContactOpen(true)}>Contact</button>
          </div>
        }
      >
        {planNote ? (
          <div className="mb-3">
            <Alert tone="info" title={`${planNote} plan noted`}>Finish the reset, then sign in — the plan applies to your next session.</Alert>
          </div>
        ) : null}
        {done ? (
          <div className="d-grid gap-3">
            <div className="d-flex align-items-center gap-3">
              <span className="dx-up"><Check size={26} /></span>
              <div>
                <h2 className="dx-h-card mb-0">Password updated</h2>
                <span className="dx-help">The reset token was deleted and every other session signed out.</span>
              </div>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <Chip tone="up">password_resets: token consumed</Chip>
              <Chip tone="warn">10 sessions revoked</Chip>
              <Chip tone="muted">2FA settings unchanged</Chip>
            </div>
            <Link to="/auth/signin" className="dx-btn dx-btn-lg dx-btn-primary w-100">Sign in with new password →</Link>
            <div className="row g-2">
              <div className="col-6"><button type="button" className="dx-btn w-100" onClick={() => setSessionsOpen(true)}>Review sessions</button></div>
              <div className="col-6"><button type="button" className="dx-btn w-100" onClick={() => setOauthOpen(true)}>Reconnect Deriv</button></div>
            </div>
          </div>
        ) : tokenState !== "valid" ? (
          <div className="d-grid gap-3">
            <div className="d-flex align-items-center gap-3">
              <XCircle size={26} className="dx-down" />
              <div>
                <h2 className="dx-h-card mb-0">
                  {tokenState === "expired" ? "This link has expired" : tokenState === "used" ? "This link was already used" : "No reset token in this link"}
                </h2>
                <span className="dx-help">
                  {tokenState === "expired"
                    ? "Reset links live for 60 minutes. Request a fresh one — the old token is already destroyed."
                    : tokenState === "used"
                      ? "Reset tokens are single-use. If you did not use it, request a new link and review your sessions."
                      : "This page needs the token from your reset email. Request a link and open it from your inbox."}
                </span>
              </div>
            </div>
            <Link to="/auth/forgot-password" className="dx-btn dx-btn-lg dx-btn-primary w-100">Request a new link →</Link>
            <div className="row g-2">
              <div className="col-6"><button type="button" className="dx-btn w-100" onClick={() => setInboxOpen(true)}>Open demo inbox</button></div>
              <div className="col-6"><button type="button" className="dx-btn w-100" onClick={() => setSessionsOpen(true)}>Review sessions</button></div>
            </div>
            <p className="dx-help text-center mb-0">
              Remember it now? <Link to="/auth/signin" className="dx-btn-link">Sign In →</Link>
            </p>
          </div>
        ) : (
          <form noValidate className="d-grid gap-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <div>
              <h2 className="dx-h-card mb-1">Choose a new password</h2>
              <span className="dx-help">Token <span className="font-display">{(token ?? DEMO_RESET_TOKEN).slice(0, 12)}…</span> verified — expires in 41 minutes.</span>
            </div>
            <Field label="New Password" required error={errors.password}>
              <div className="dx-input-group">
                <input className={`dx-input ${errors.password ? "is-invalid" : ""}`} type={showPw ? "text" : "password"}
                  autoComplete="new-password" placeholder="Min 8 · upper · digit · symbol" value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors((er) => ({ ...er, password: "" })); }} />
                <button type="button" className="dx-btn" style={{ borderRadius: "0 8px 8px 0" }} onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? "Hide password" : "Show password"}>{showPw ? <EyeOff size={15} /> : <Eye size={15} />}</button>
              </div>
            </Field>
            <div>
              <Meter label="Password strength" value={score} display={`${score}/5`} />
              <div className="d-grid gap-1 mt-2">
                {checks.map((c) => (
                  <span key={c.id} className="d-flex align-items-center gap-2" style={{ fontSize: "0.8rem" }}>
                    {c.ok ? <Check size={13} className="dx-up" /> : <span className="dx-step-dot" style={{ width: 13, height: 13 }} />}
                    <span className={c.ok ? "" : "dx-text-dim"}>{c.label}</span>
                  </span>
                ))}
                <span className="d-flex align-items-center gap-2" style={{ fontSize: "0.8rem" }}>
                  {matches ? <Check size={13} className="dx-up" /> : <span className="dx-step-dot" style={{ width: 13, height: 13 }} />}
                  <span className={matches ? "" : "dx-text-dim"}>Passwords match</span>
                </span>
              </div>
              <button type="button" className="dx-btn-link mt-1" onClick={() => setPolicyOpen(true)}>Read the full password policy</button>
            </div>
            <Field label="Confirm New Password" required error={errors.confirm}>
              <div className="dx-input-group">
                <input className={`dx-input ${errors.confirm ? "is-invalid" : ""}`} type={showConfirm ? "text" : "password"}
                  autoComplete="new-password" placeholder="Repeat the new password" value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setErrors((er) => ({ ...er, confirm: "" })); }} />
                <button type="button" className="dx-btn" style={{ borderRadius: "0 8px 8px 0" }} onClick={() => setShowConfirm((s) => !s)}
                  aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}>{showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}</button>
              </div>
            </Field>
            <button type="submit" className="dx-btn dx-btn-lg dx-btn-primary w-100" disabled={busy}>
              {busy ? "Updating password…" : "Reset Password"}
            </button>
            <Alert tone="warn" title="Everywhere else signs out">
              Completing this reset invalidates all existing sessions and refresh tokens for the account.
            </Alert>
          </form>
        )}
      </AuthShell>

      {/* ================= overlays ================= */}
      <PasswordPolicyDialog open={policyOpen} onClose={() => setPolicyOpen(false)} password={password} />
      <SessionsDrawer open={sessionsOpen} onClose={() => setSessionsOpen(false)} />
      <AuthInboxDrawer open={inboxOpen} onClose={() => setInboxOpen(false)} email="trader@derivx.app"
        highlight={{
          from: "DerivX Security",
          subject: "Reset your DerivX password",
          preview: "This link sets a new DerivX password and signs out all other sessions. Expires in 60 minutes.",
          actionLabel: "Open a fresh valid link",
        }}
        onAction={() => { setInboxOpen(false); setTokenState("valid"); setDone(false); }} />
      <AuthConsole open={demoOpen} initialTab="trade" onClose={() => setDemoOpen(false)} />
      <OAuthWizard open={oauthOpen} onClose={() => setOauthOpen(false)}
        onConnected={(id) => setActiveLoginId(id)}
        onOpenStatus={() => { setOauthOpen(false); setStatusOpen(true); }}
        onOpenSignUp={() => { setOauthOpen(false); void navigate({ to: "/auth/signup" }); }}
        onOpenDemo={() => { setOauthOpen(false); setDemoOpen(true); }} />
      <AccountSwitcherDialog open={accountsOpen} onClose={() => setAccountsOpen(false)} activeLoginId={activeLoginId}
        onSetActive={(id) => setActiveLoginId(id)}
        onOpenOAuth={() => { setAccountsOpen(false); setOauthOpen(true); }}
        onDisconnected={() => undefined}
        onOpenStatus={() => { setAccountsOpen(false); setStatusOpen(true); }} />
      <StatusDrawer open={statusOpen} onClose={() => setStatusOpen(false)}
        onOpenDocs={() => { setStatusOpen(false); setDocsOpen(true); }}
        onOpenConnections={() => { setStatusOpen(false); setAccountsOpen(true); }} />
      <ApiDocsDialog open={docsOpen} onClose={() => setDocsOpen(false)}
        onOpenStatus={() => { setDocsOpen(false); setStatusOpen(true); }}
        onOpenDemo={() => { setDocsOpen(false); setDemoOpen(true); }} />
      <FaqDialog open={faqOpen} onClose={() => setFaqOpen(false)}
        onContact={() => { setFaqOpen(false); setContactOpen(true); }}
        onOpenDocs={() => { setFaqOpen(false); setDocsOpen(true); }}
        onOpenPricing={() => { setFaqOpen(false); setPricingOpen(true); }} />
      <PricingDialog open={pricingOpen} onClose={() => setPricingOpen(false)}
        onOpenFaq={() => { setPricingOpen(false); setFaqOpen(true); }}
        onDeployed={(name) => { setPricingOpen(false); setPlanNote(name); }} />
      <LegalDialog doc={legalDoc} onClose={() => setLegalDocId(null)}
        onContact={() => { setLegalDocId(null); setContactOpen(true); }} />
      <CommunityDialog open={communityOpen} onClose={() => setCommunityOpen(false)}
        onContact={() => { setCommunityOpen(false); setContactOpen(true); }}
        onLeaderboard={() => { setCommunityOpen(false); setDemoOpen(true); }} />
      <ContactDialog open={contactOpen} onClose={() => setContactOpen(false)}
        onOpenCommunity={() => { setContactOpen(false); setCommunityOpen(true); }} />
    </div>
  );
}
