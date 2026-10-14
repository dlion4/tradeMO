// =============================================================================
// VerifyEmailPage.tsx — A-6 (/auth/verify-email). Blueprint states:
// PENDING (no token — resend with 1/min rate limit, skip-for-now limited
// access) and VERIFIED (valid token → connect Deriv / open console), plus
// EXPIRED. The email lives in the demo inbox; its button is a real
// navigation back here with ?token=dxv_live_77b2e0. Front-end only.
// =============================================================================
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Check, Mail, XCircle } from "lucide-react";
import { AuthShell } from "./AuthShell";
import { VerifyHelpDialog } from "./SignupDialogs";
import { AuthConsole, AuthInboxDrawer, OtpInputs, SessionsDrawer } from "./AuthDialogs";
import { Alert, Chip, Dialog, Field, MiniTabs, useToast } from "../ui/primitives";
import { AccountSwitcherDialog, OAuthWizard } from "../marketing/modals/AccountModals";
import { ApiDocsDialog, CommunityDialog, ContactDialog, FaqDialog, LegalDialog } from "../marketing/modals/ContentDialogs";
import { PricingDialog } from "../marketing/modals/CommerceDialogs";
import { StatusDrawer } from "../marketing/modals/SocialModals";
import { DEMO_VERIFY_TOKEN, INBOX_MESSAGES, LEGAL_DOCS } from "../../data/trading";

type VerifyState = "pending" | "verified" | "expired";
const EMAIL_CODE = INBOX_MESSAGES.find((m) => m.code)?.code ?? "482913";

export function VerifyEmailPage({ token }: { token?: string }) {
  const toast = useToast();
  const navigate = useNavigate();
  const derived: VerifyState = !token ? "pending" : token.includes("expired") ? "expired" : "verified";
  const [state, setState] = useState<VerifyState>(derived);
  useEffect(() => { setState(derived); }, [derived]);

  const [email, setEmail] = useState("trader@derivx.app");
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState(email);
  const [resendIn, setResendIn] = useState(0);
  const [sentCount, setSentCount] = useState(1);
  const [codeMode, setCodeMode] = useState(false);
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [codeError, setCodeError] = useState("");
  const [derivId, setDerivId] = useState<string | null>(null);

  const [inboxOpen, setInboxOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [skipOpen, setSkipOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [oauthOpen, setOauthOpen] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [activeLoginId, setActiveLoginId] = useState("CR8842197");
  const [demoOpen, setDemoOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [communityOpen, setCommunityOpen] = useState(false);
  const [legalDocId, setLegalDocId] = useState<string | null>(null);
  const [planNote, setPlanNote] = useState<string | null>(null);

  const legalDoc = useMemo(() => LEGAL_DOCS.find((d) => d.id === legalDocId) ?? null, [legalDocId]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [resendIn]);

  const resend = () => {
    if (resendIn > 0) return;
    setResendIn(60);
    setSentCount((c) => c + 1);
  };

  const verifyWithCode = () => {
    if (code.join("") !== EMAIL_CODE) {
      setCodeError(`That code does not match. The demo inbox shows ${EMAIL_CODE}.`);
      return;
    }
    setCodeError("");
    setState("verified");
  };

  return (
    <div className="page-auth-verify">
      <AuthShell
        title="Verify your email"
        subtitle="One click (or one 6-digit code) proves the mailbox is yours — then Deriv linking unlocks real accounts."
        side="signup"
        journeyStep={1}
        extras={
          <div className="d-grid gap-3">
            <div className="dx-card dx-card-pad">
              <span className="dx-kpi-label">Demo: verification states</span>
              <MiniTabs
                ariaLabel="Verification state"
                value={state}
                onChange={(id) => setState(id as VerifyState)}
                options={[
                  { id: "pending", label: "Pending" },
                  { id: "verified", label: "Verified" },
                  { id: "expired", label: "Expired" },
                ]}
              />
              <p className="dx-help mb-0 mt-2">
                Real links arrive as <span className="font-display">/auth/verify-email?token=…</span> with a 24-hour window.
              </p>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setInboxOpen(true)}>
                <Mail size={13} /> Demo inbox
              </button>
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
        {planNote ? (
          <div className="mb-3">
            <Alert tone="info" title={`${planNote} plan noted`}>It applies the moment your account is fully verified.</Alert>
          </div>
        ) : null}

        {state === "verified" ? (
          <div className="d-grid gap-3">
            <div className="d-flex align-items-center gap-3">
              <span className="dx-up"><Check size={26} /></span>
              <div>
                <h2 className="dx-h-card mb-0">Email verified!</h2>
                <span className="dx-help">Your account is ready. Connect your Deriv account to start trading.</span>
              </div>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <Chip tone="up">{email} verified</Chip>
              {derivId ? <Chip tone="accent" pulse>Deriv {derivId} linked</Chip> : <Chip tone="warn">Deriv not linked yet</Chip>}
              <Chip tone="muted">email_verifications: token consumed</Chip>
            </div>
            <button type="button" className="dx-btn dx-btn-lg dx-btn-primary w-100" onClick={() => setOauthOpen(true)}>
              Connect Deriv Account →
            </button>
            <div className="row g-2">
              <div className="col-6"><button type="button" className="dx-btn w-100" onClick={() => setDemoOpen(true)}>Open live console</button></div>
              <div className="col-6">
                {derivId
                  ? <button type="button" className="dx-btn w-100" onClick={() => setAccountsOpen(true)}>Manage connections</button>
                  : <Link to="/auth/signin" className="dx-btn w-100">Go to sign in</Link>}
              </div>
            </div>
          </div>
        ) : state === "expired" ? (
          <div className="d-grid gap-3">
            <div className="d-flex align-items-center gap-3">
              <XCircle size={26} className="dx-down" />
              <div>
                <h2 className="dx-h-card mb-0">Verification link expired</h2>
                <span className="dx-help">Verification links live 24 hours. The account is safe — request a fresh link.</span>
              </div>
            </div>
            <button type="button" className="dx-btn dx-btn-lg dx-btn-primary w-100" onClick={() => { setState("pending"); resend(); }}>
              Send a fresh verification email
            </button>
            <div className="row g-2">
              <div className="col-6"><button type="button" className="dx-btn w-100" onClick={() => setInboxOpen(true)}>Open demo inbox</button></div>
              <div className="col-6"><button type="button" className="dx-btn w-100" onClick={() => setHelpOpen(true)}>Didn&apos;t get it?</button></div>
            </div>
          </div>
        ) : (
          <div className="d-grid gap-3">
            <div className="d-flex align-items-center gap-3">
              <Mail size={24} className="dx-accent" />
              <div>
                <h2 className="dx-h-card mb-0">Check your inbox</h2>
                <span className="dx-help">
                  We&apos;ve sent a verification link to <span className="font-display">{email}</span> ({sentCount} sent).
                </span>
              </div>
            </div>

            {editingEmail ? (
              <div className="d-grid gap-2">
                <Field label="New email address" help="The pending link dies and a fresh one goes to the new address.">
                  <input className="dx-input" type="email" value={emailDraft} onChange={(e) => setEmailDraft(e.target.value)} />
                </Field>
                <div className="d-flex gap-2">
                  <button type="button" className="dx-btn dx-btn-primary" onClick={() => {
                    if (/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(emailDraft)) {
                      setEmail(emailDraft);
                      setEditingEmail(false);
                      setSentCount((c) => c + 1);
                      setResendIn(60);
                    }
                  }}>
                    Send to new address
                  </button>
                  <button type="button" className="dx-btn dx-btn-ghost" onClick={() => setEditingEmail(false)}>Cancel</button>
                </div>
              </div>
            ) : codeMode ? (
              <div className="d-grid gap-2">
                <span className="dx-help text-center">Enter the 6-digit code from the email instead:</span>
                <OtpInputs value={code} onChange={(next) => { setCode(next); setCodeError(""); }} error={Boolean(codeError)} label="Email verification code" />
                {codeError ? <span className="dx-error text-center">{codeError}</span> : null}
                <button type="button" className="dx-btn dx-btn-primary w-100" onClick={verifyWithCode}>Verify with code</button>
                <button type="button" className="dx-btn-link" onClick={() => setCodeMode(false)}>Use the link instead</button>
              </div>
            ) : (
              <>
                <button type="button" className="dx-btn dx-btn-lg dx-btn-primary w-100" onClick={() => setInboxOpen(true)}>
                  <Mail size={15} /> Open demo inbox
                </button>
                <span className="dx-help text-center">Didn&apos;t get the email?</span>
                <div className="row g-2">
                  <div className="col-6">
                    <button type="button" className="dx-btn w-100" onClick={resend} disabled={resendIn > 0}>
                      {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend Verification Email"}
                    </button>
                  </div>
                  <div className="col-6">
                    <button type="button" className="dx-btn w-100" onClick={() => setCodeMode(true)}>Enter 6-digit code</button>
                  </div>
                </div>
                <div className="d-flex flex-wrap align-items-center justify-content-center gap-2">
                  <button type="button" className="dx-btn-link" onClick={() => { setEmailDraft(email); setEditingEmail(true); }}>Change email</button>
                  <button type="button" className="dx-btn-link" onClick={() => setHelpOpen(true)}>Didn&apos;t get it?</button>
                  <button type="button" className="dx-btn-link" onClick={() => setSkipOpen(true)}>Skip for now →</button>
                </div>
              </>
            )}
          </div>
        )}
      </AuthShell>

      {/* ================= overlays ================= */}
      <AuthInboxDrawer open={inboxOpen} onClose={() => setInboxOpen(false)} email={email}
        highlight={state !== "verified" ? {
          from: "DerivX",
          subject: "Verify your DerivX email",
          preview: `Confirm ${email} to unlock real-account linking. Link expires in 24 hours; the email also carries the 6-digit code ${EMAIL_CODE}.`,
          actionLabel: "Verify email (opens A-6 verified)",
        } : null}
        onAction={() => { setInboxOpen(false); void navigate({ to: "/auth/verify-email", search: { token: DEMO_VERIFY_TOKEN } }); }} />
      <VerifyHelpDialog open={helpOpen} onClose={() => setHelpOpen(false)}
        onResend={() => { setHelpOpen(false); resend(); }}
        onChangeEmail={() => { setHelpOpen(false); setEmailDraft(email); setEditingEmail(true); }}
        onOpenInbox={() => { setHelpOpen(false); setInboxOpen(true); }}
        onContact={() => { setHelpOpen(false); setContactOpen(true); }} />
      <Dialog open={skipOpen} onClose={() => setSkipOpen(false)} size="md"
        title="Skip verification for now?"
        subtitle="Limited access until the email is verified:"
        footer={
          <>
            <button type="button" className="dx-btn" onClick={() => setSkipOpen(false)}>Verify now</button>
            <button type="button" className="dx-btn dx-btn-primary" onClick={() => { setSkipOpen(false); setDemoOpen(true); }}>
              Continue with limited access
            </button>
          </>
        }>
        <ul className="dx-text-dim d-grid gap-1 mb-0">
          <li>Virtual (VRTC) accounts only — real-money linking stays locked.</li>
          <li>Bots run, but copy-trading and withdrawals need a verified email.</li>
          <li>A reminder banner follows you until verification completes.</li>
        </ul>
      </Dialog>
      <SessionsDrawer open={sessionsOpen} onClose={() => setSessionsOpen(false)} />
      <OAuthWizard open={oauthOpen} onClose={() => setOauthOpen(false)}
        onConnected={(id) => {
          setDerivId(id);
          setActiveLoginId(id);
          toast.push({ tone: "success", title: `Deriv connection established — ${id}`, body: "OAuth2 handshake complete — real and virtual accounts available." });
        }}
        onOpenStatus={() => { setOauthOpen(false); setStatusOpen(true); }}
        onOpenSignUp={() => { setOauthOpen(false); void navigate({ to: "/auth/signup" }); }}
        onOpenDemo={() => { setOauthOpen(false); setDemoOpen(true); }} />
      <AccountSwitcherDialog open={accountsOpen} onClose={() => setAccountsOpen(false)} activeLoginId={activeLoginId}
        onSetActive={(id) => setActiveLoginId(id)}
        onOpenOAuth={() => { setAccountsOpen(false); setOauthOpen(true); }}
        onDisconnected={(id) => { if (derivId === id) setDerivId(null); }}
        onOpenStatus={() => { setAccountsOpen(false); setStatusOpen(true); }} />
      <AuthConsole open={demoOpen} initialTab="trade" onClose={() => setDemoOpen(false)} />
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
