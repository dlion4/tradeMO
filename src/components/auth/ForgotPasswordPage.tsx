// =============================================================================
// ForgotPasswordPage.tsx — A-4 (/auth/forgot-password). Blueprint contract:
// email → simulated POST /api/auth/forgot-password → success state with
// resend. Always succeeds (anti-enumeration); the "email" lands in the demo
// inbox, whose reset button is a real Link into A-5 with the demo token.
// =============================================================================
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Check, Lock, Mail } from "lucide-react";
import { AuthShell } from "./AuthShell";
import { VerifyHelpDialog } from "./SignupDialogs";
import { AuthConsole, AuthInboxDrawer, LoginActivityDialog, SessionsDrawer } from "./AuthDialogs";
import { Alert, Field } from "../ui/primitives";
import { ApiDocsDialog, CommunityDialog, ContactDialog, FaqDialog, LegalDialog } from "../marketing/modals/ContentDialogs";
import { PricingDialog } from "../marketing/modals/CommerceDialogs";
import { StatusDrawer } from "../marketing/modals/SocialModals";
import { AccountSwitcherDialog } from "../marketing/modals/AccountModals";
import { DEMO_RESET_TOKEN, LEGAL_DOCS } from "../../data/trading";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [resendIn, setResendIn] = useState(0);

  const [inboxOpen, setInboxOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [communityOpen, setCommunityOpen] = useState(false);
  const [legalDocId, setLegalDocId] = useState<string | null>(null);
  const [planNote, setPlanNote] = useState<string | null>(null);
  const [demoOpen, setDemoOpen] = useState(false);
  const [activeLoginId, setActiveLoginId] = useState("CR8842197");

  const legalDoc = useMemo(() => LEGAL_DOCS.find((d) => d.id === legalDocId) ?? null, [legalDocId]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [resendIn]);

  const send = () => {
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) {
      setError("Enter a valid email — the reset link goes there.");
      return;
    }
    if (busy) return;
    setError("");
    setBusy(true);
    // Simulated POST /api/auth/forgot-password — always 200 (anti-enumeration).
    window.setTimeout(() => {
      setBusy(false);
      setSent(true);
      setSentCount((c) => c + 1);
      setResendIn(30);
    }, 900);
  };

  const resend = () => {
    if (resendIn > 0) return;
    setSentCount((c) => c + 1);
    setResendIn(30);
  };

  return (
    <div className="page-auth-forgot">
      <AuthShell
        title="Reset your password"
        subtitle="One link, one hour, one use. Resetting signs out every other session and kills all outstanding reset tokens."
        side="reset"
        stepLabel="Account recovery · Reset link"
        extras={
          <div className="d-grid gap-3">
            <div className="dx-card dx-card-pad">
              <span className="dx-kpi-label">How recovery works</span>
              <div className="d-grid gap-2 mt-2">
                {[
                  { n: 1, t: "Request", d: "We mint a 32-byte token, store only its hash, and email the link." },
                  { n: 2, t: "Set a new password", d: "The link opens A-5 — valid 60 minutes, single use." },
                  { n: 3, t: "Sessions revoked", d: "Every device signs in again with the new password (+ 2FA)." },
                ].map((s) => (
                  <div key={s.n} className="d-flex align-items-start gap-3">
                    <span className="dx-step-dot">{s.n}</span>
                    <span>
                      <span className="d-block fw-semibold" style={{ fontSize: "0.86rem" }}>{s.t}</span>
                      <span className="dx-help d-block">{s.d}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setActivityOpen(true)}>Login activity</button>
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setSessionsOpen(true)}>Trusted sessions</button>
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setFaqOpen(true)}>Help &amp; FAQ</button>
            </div>
          </div>
        }
        footer={
          <div className="d-flex flex-wrap align-items-center gap-2">
            <span className="dx-help me-1">Legal &amp; help:</span>
            <button type="button" className="dx-btn-link" onClick={() => setLegalDocId("privacy")}>Privacy Policy</button>
            <button type="button" className="dx-btn-link" onClick={() => setStatusOpen(true)}>API status</button>
            <button type="button" className="dx-btn-link" onClick={() => setCommunityOpen(true)}>Community</button>
            <button type="button" className="dx-btn-link" onClick={() => setContactOpen(true)}>Contact</button>
          </div>
        }
      >
        {!sent ? (
          <form noValidate className="d-grid gap-3" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <div className="d-flex align-items-center gap-3">
              <Lock size={22} className="dx-accent" />
              <div>
                <h2 className="dx-h-card mb-0">Forgot your password?</h2>
                <span className="dx-help">Enter your email and we&apos;ll send you a reset link.</span>
              </div>
            </div>
            {planNote ? <Alert tone="info" title={`${planNote} plan noted`}>Pricing opens again any time after you are back in.</Alert> : null}
            <Field label="Email" required error={error}>
              <input className={`dx-input ${error ? "is-invalid" : ""}`} type="email" autoComplete="email"
                placeholder="trader@derivx.app" value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }} />
            </Field>
            <button type="submit" className="dx-btn dx-btn-lg dx-btn-primary w-100" disabled={busy}>
              {busy ? "Sending…" : "Send Reset Link"}
            </button>
            <Alert tone="info" title="We never confirm registered emails">
              Whether or not this address has an account, the next screen looks identical — that is deliberate (email-enumeration protection).
            </Alert>
            <p className="dx-help text-center mb-0">
              Remember your password? <Link to="/auth/signin" className="dx-btn-link">Sign In →</Link>
            </p>
          </form>
        ) : (
          <div className="d-grid gap-3">
            <div className="d-flex align-items-center gap-3">
              <span className="dx-up"><Check size={26} /></span>
              <div>
                <h2 className="dx-h-card mb-0">Reset link sent!</h2>
                <span className="dx-help">Check your email — the link expires in 60 minutes and works once.</span>
              </div>
            </div>
            <div className="dx-card-inset d-grid gap-1">
              <span className="d-flex justify-content-between"><span className="dx-help">Sent to</span><span className="font-display">{email}</span></span>
              <span className="d-flex justify-content-between"><span className="dx-help">Emails sent</span><span className="font-display">{sentCount}</span></span>
              <span className="d-flex justify-content-between"><span className="dx-help">Token TTL</span><span className="font-display">60 min · hashed at rest</span></span>
            </div>
            <button type="button" className="dx-btn dx-btn-lg dx-btn-primary w-100" onClick={() => setInboxOpen(true)}>
              <Mail size={15} /> Open demo inbox
            </button>
            <div className="d-flex flex-wrap align-items-center justify-content-center gap-2">
              <span className="dx-help">Didn&apos;t receive it?</span>
              <button type="button" className="dx-btn dx-btn-sm" onClick={resend} disabled={resendIn > 0}>
                {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend"}
              </button>
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setHelpOpen(true)}>Didn&apos;t get it?</button>
              <button type="button" className="dx-btn-link" onClick={() => { setSent(false); setEmail(""); }}>Use a different email</button>
            </div>
            <p className="dx-help text-center mb-0">
              Remember your password? <Link to="/auth/signin" className="dx-btn-link">Sign In →</Link>
            </p>
          </div>
        )}
      </AuthShell>

      {/* ================= overlays ================= */}
      <AuthInboxDrawer open={inboxOpen} onClose={() => setInboxOpen(false)} email={email}
        highlight={sent ? {
          from: "DerivX Security",
          subject: "Reset your DerivX password",
          preview: "This link sets a new DerivX password (not your Deriv password) and signs out all other sessions. Expires in 60 minutes.",
          actionLabel: "Open the reset link (A-5)",
        } : null}
        onAction={() => { setInboxOpen(false); void navigate({ to: "/auth/reset-password", search: { token: DEMO_RESET_TOKEN } }); }} />
      <VerifyHelpDialog open={helpOpen} onClose={() => setHelpOpen(false)}
        onResend={() => { setHelpOpen(false); resend(); }}
        onChangeEmail={() => { setHelpOpen(false); setSent(false); }}
        onOpenInbox={() => { setHelpOpen(false); setInboxOpen(true); }}
        onContact={() => { setHelpOpen(false); setContactOpen(true); }} />
      <SessionsDrawer open={sessionsOpen} onClose={() => setSessionsOpen(false)} />
      <LoginActivityDialog open={activityOpen} onClose={() => setActivityOpen(false)}
        onOpenSessions={() => { setActivityOpen(false); setSessionsOpen(true); }} />
      <StatusDrawer open={statusOpen} onClose={() => setStatusOpen(false)}
        onOpenDocs={() => { setStatusOpen(false); setDocsOpen(true); }}
        onOpenConnections={() => { setStatusOpen(false); setAccountsOpen(true); }} />
      <ApiDocsDialog open={docsOpen} onClose={() => setDocsOpen(false)}
        onOpenStatus={() => { setDocsOpen(false); setStatusOpen(true); }}
        onOpenDemo={() => { setDocsOpen(false); setDemoOpen(true); }} />
      <AuthConsole open={demoOpen} initialTab="trade" onClose={() => setDemoOpen(false)} />
      <AccountSwitcherDialog open={accountsOpen} onClose={() => setAccountsOpen(false)} activeLoginId={activeLoginId}
        onSetActive={(id) => setActiveLoginId(id)}
        onOpenOAuth={() => { setAccountsOpen(false); void navigate({ to: "/auth/deriv/callback", search: { code: "demo_auth_code_8f3ka" } }); }}
        onDisconnected={() => undefined}
        onOpenStatus={() => { setAccountsOpen(false); setStatusOpen(true); }} />
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
        onLeaderboard={() => { setCommunityOpen(false); void navigate({ to: "/features" }); }} />
      <ContactDialog open={contactOpen} onClose={() => setContactOpen(false)}
        onOpenCommunity={() => { setContactOpen(false); setCommunityOpen(true); }} />
    </div>
  );
}
