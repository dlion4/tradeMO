// =============================================================================
// TwoFactorPage.tsx — A-7 (/auth/2fa). Blueprint contract: 6-digit TOTP
// challenge during sign-in, backup-code fallback, rate limiting (5 attempts /
// 5 min, temporary lock after repeated failures) and the authenticator
// SETUP wizard (app pick → otpauth secret → first code → 10 backup codes).
// Demo authenticator shows 472915; backup codes live in BACKUP_CODES.
// =============================================================================
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Check, KeyRound, ShieldCheck } from "lucide-react";
import { AuthShell } from "./AuthShell";
import {
  AuthConsole,
  BackupCodesDialog,
  LoginActivityDialog,
  OtpInputs,
  SessionsDrawer,
  TwoFactorSetupWizard,
} from "./AuthDialogs";
import { Alert, Chip, Dialog, Field, Progress, useToast } from "../ui/primitives";
import { ApiDocsDialog, CommunityDialog, ContactDialog, FaqDialog, LegalDialog } from "../marketing/modals/ContentDialogs";
import { PricingDialog } from "../marketing/modals/CommerceDialogs";
import { StatusDrawer } from "../marketing/modals/SocialModals";
import { AccountSwitcherDialog, OAuthWizard } from "../marketing/modals/AccountModals";
import { BACKUP_CODES, DEMO_TOTP_CODE, LEGAL_DOCS } from "../../data/trading";

const MAX_ATTEMPTS = 5;

export function TwoFactorPage({ email }: { email?: string }) {
  const toast = useToast();
  const navigate = useNavigate();
  const accountEmail = email ?? "trader@derivx.app";

  const [mode, setMode] = useState<"totp" | "backup">("totp");
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [backupCode, setBackupCode] = useState("");
  const [error, setError] = useState("");
  const [failures, setFailures] = useState(0);
  const [lockedFor, setLockedFor] = useState(0);
  const [verified, setVerified] = useState(false);
  const [usedBackup, setUsedBackup] = useState<string | null>(null);
  const [totpWindow, setTotpWindow] = useState(30);
  const [setupDone, setSetupDone] = useState(false);
  const [planNote, setPlanNote] = useState<string | null>(null);

  const [troubleOpen, setTroubleOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
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

  const legalDoc = useMemo(() => LEGAL_DOCS.find((d) => d.id === legalDocId) ?? null, [legalDocId]);
  const locked = lockedFor > 0;
  const remainingCodes = BACKUP_CODES.filter((c) => !c.used && c.code !== usedBackup).length;

  // demo authenticator window + lockout countdown
  useEffect(() => {
    const id = window.setInterval(() => setTotpWindow((w) => (w <= 1 ? 30 : w - 1)), 1000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    if (lockedFor <= 0) return;
    const id = window.setTimeout(() => setLockedFor((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [lockedFor]);

  const registerFailure = (message: string) => {
    const count = failures + 1;
    setFailures(count);
    if (count >= MAX_ATTEMPTS) {
      setLockedFor(30);
      setFailures(0);
      setError("Too many wrong codes — 2FA is locked for 30 seconds (demo-scaled from 5 minutes). Your account is not compromised; this is rate limiting.");
    } else {
      setError(`${message} ${MAX_ATTEMPTS - count} attempt${MAX_ATTEMPTS - count === 1 ? "" : "s"} left before a temporary lock.`);
    }
  };

  const verifyTotp = () => {
    if (locked) return;
    const value = code.join("");
    if (value.length < 6) { setError("Enter all 6 digits from your authenticator app."); return; }
    if (value !== DEMO_TOTP_CODE) {
      registerFailure("That code does not match the current authenticator window.");
      return;
    }
    setError("");
    setVerified(true);
  };

  const verifyBackup = () => {
    if (locked) return;
    const value = backupCode.trim().toUpperCase();
    const match = BACKUP_CODES.find((c) => c.code === value && !c.used && c.code !== usedBackup);
    if (!match) {
      registerFailure("That backup code is invalid or already used. Codes look like KX41-9QPD-77.");
      return;
    }
    setError("");
    setUsedBackup(match.code);
    setVerified(true);
  };

  return (
    <div className="page-auth-2fa">
      <AuthShell
        title="Two-Factor Authentication"
        subtitle="Second factor for a live sign-in — a 30-second TOTP from your authenticator, or a one-time backup code."
        side="2fa"
        stepLabel="Sign-in security · Second factor"
        extras={
          <div className="d-grid gap-3">
            <div className="dx-card dx-card-pad">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="dx-kpi-label mb-0">Your authenticator (demo)</span>
                <span className="dx-pulse" aria-label="live" />
              </div>
              <div className="d-flex align-items-center justify-content-between gap-3">
                <span>
                  <span className="d-block font-display fw-semibold" style={{ fontSize: "1.3rem", letterSpacing: "0.14em" }}>{DEMO_TOTP_CODE}</span>
                  <span className="dx-help d-block">DerivX ({accountEmail}) · refreshes in {totpWindow}s</span>
                </span>
                <ShieldCheck size={26} className="dx-accent" />
              </div>
              <Progress value={30 - totpWindow} max={30} />
              <p className="dx-help mb-0 mt-2">Front-end demo: the code stays {DEMO_TOTP_CODE} so the flow is testable; a real TOTP rotates every window.</p>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setBackupOpen(true)}>
                <KeyRound size={13} /> Backup codes ({remainingCodes} left)
              </button>
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setSetupOpen(true)}>Re-enroll authenticator</button>
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setActivityOpen(true)}>Login activity</button>
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setSessionsOpen(true)}>Trusted sessions</button>
            </div>
          </div>
        }
        footer={
          <div className="d-flex flex-wrap align-items-center gap-2">
            <span className="dx-help me-1">Legal &amp; help:</span>
            <button type="button" className="dx-btn-link" onClick={() => setFaqOpen(true)}>Help &amp; FAQ</button>
            <button type="button" className="dx-btn-link" onClick={() => setLegalDocId("privacy")}>Privacy Policy</button>
            <button type="button" className="dx-btn-link" onClick={() => setStatusOpen(true)}>API status</button>
            <button type="button" className="dx-btn-link" onClick={() => setCommunityOpen(true)}>Community</button>
            <button type="button" className="dx-btn-link" onClick={() => setContactOpen(true)}>Contact</button>
          </div>
        }
      >
        {planNote ? (
          <div className="mb-3">
            <Alert tone="info" title={`${planNote} plan noted`}>It applies once this sign-in completes.</Alert>
          </div>
        ) : null}
        {setupDone ? (
          <div className="mb-3">
            <Alert tone="up" title="Authenticator re-enrolled">The new factor is active — the old secret and its codes no longer work.</Alert>
          </div>
        ) : null}

        {verified ? (
          <div className="d-grid gap-3">
            <div className="d-flex align-items-center gap-3">
              <span className="dx-up"><Check size={26} /></span>
              <div>
                <h2 className="dx-h-card mb-0">You&apos;re signed in</h2>
                <span className="dx-help">{accountEmail} · second factor passed{usedBackup ? ` via backup code ${usedBackup}` : " via authenticator"}.</span>
              </div>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <Chip tone="up">Session issued · 15m access</Chip>
              {usedBackup ? <Chip tone="warn">Backup code consumed — {remainingCodes} remain</Chip> : <Chip tone="muted">TOTP window verified</Chip>}
              <Chip tone="accent">Deriv CR8842197 linked</Chip>
            </div>
            {usedBackup ? (
              <Alert tone="warn" title="Replace that backup code">
                A used code never works again. Review the set and regenerate if fewer than 3 remain.
              </Alert>
            ) : null}
            <button type="button" className="dx-btn dx-btn-lg dx-btn-primary w-100" onClick={() => void navigate({ to: "/dashboard" })}>
              Open dashboard →
            </button>
            <div className="row g-2">
              <div className="col-6"><button type="button" className="dx-btn w-100" onClick={() => setSessionsOpen(true)}>Trusted sessions</button></div>
              <div className="col-6"><button type="button" className="dx-btn w-100" onClick={() => setBackupOpen(true)}>Backup codes</button></div>
            </div>
            <Link to="/auth/signin" className="dx-btn-link text-center">Sign in as someone else</Link>
          </div>
        ) : (
          <div className="d-grid gap-3">
            <div className="d-flex align-items-center gap-3">
              <ShieldCheck size={24} className="dx-accent" />
              <div>
                <h2 className="dx-h-card mb-0">Two-Factor Authentication</h2>
                <span className="dx-help">
                  {mode === "totp"
                    ? `Enter the 6-digit code from your authenticator app for ${accountEmail}.`
                    : "Enter one of your 10 backup codes — each works exactly once."}
                </span>
              </div>
            </div>

            {error ? <Alert tone="danger" title="Verification failed">{error}</Alert> : null}
            {locked ? <Alert tone="warn" title={`Locked — try again in ${lockedFor}s`}>Rate limit: {MAX_ATTEMPTS} failed attempts inside 5 minutes. Backup codes are locked too.</Alert> : null}

            {mode === "totp" ? (
              <>
                <OtpInputs value={code} onChange={(next) => { setCode(next); setError(""); }} error={Boolean(error)} label="Authenticator code" />
                <button type="button" className="dx-btn dx-btn-lg dx-btn-primary w-100" disabled={locked} onClick={verifyTotp}>
                  {locked ? `Locked (${lockedFor}s)` : "Verify"}
                </button>
              </>
            ) : (
              <>
                <Field label="Backup code" help="Format KX41-9QPD-77 · try the first unused code from your saved set.">
                  <input className="dx-input font-display" placeholder="XXXX-XXXX-XX" value={backupCode}
                    onChange={(e) => { setBackupCode(e.target.value); setError(""); }} />
                </Field>
                <div className="d-flex flex-wrap gap-2">
                  {BACKUP_CODES.filter((c) => !c.used).slice(0, 3).map((c) => (
                    <button key={c.code} type="button" className="dx-chip dx-chip-muted font-display" onClick={() => setBackupCode(c.code)}>
                      {c.code}
                    </button>
                  ))}
                </div>
                <button type="button" className="dx-btn dx-btn-lg dx-btn-primary w-100" disabled={locked} onClick={verifyBackup}>
                  {locked ? `Locked (${lockedFor}s)` : "Verify Backup Code"}
                </button>
              </>
            )}

            <div className="d-flex flex-wrap align-items-center justify-content-center gap-2">
              <span className="dx-help">Having trouble?</span>
              {mode === "totp" ? (
                <button type="button" className="dx-btn-link" onClick={() => { setMode("backup"); setError(""); }}>Use backup code</button>
              ) : (
                <button type="button" className="dx-btn-link" onClick={() => { setMode("totp"); setError(""); }}>Use authenticator code</button>
              )}
              <button type="button" className="dx-btn-link" onClick={() => setTroubleOpen(true)}>More help</button>
            </div>
            <p className="dx-help text-center mb-0">
              Wrong account? <Link to="/auth/signin" className="dx-btn-link">Back to sign in</Link>
            </p>
          </div>
        )}
      </AuthShell>

      {/* ================= overlays ================= */}
      <Dialog open={troubleOpen} onClose={() => setTroubleOpen(false)} size="md"
        title="Having trouble with 2FA?"
        subtitle="Recovery paths, in order of speed:"
        footer={<button type="button" className="dx-btn" onClick={() => { setTroubleOpen(false); setContactOpen(true); }}>Contact support</button>}>
        <div className="d-grid gap-2">
          <button type="button" className="dx-card-inset text-start w-100" onClick={() => { setTroubleOpen(false); setMode("backup"); }}>
            <span className="d-block fw-semibold">Use a backup code</span>
            <span className="dx-help d-block">One of the 10 codes from setup — {remainingCodes} unused remain on this demo account.</span>
          </button>
          <button type="button" className="dx-card-inset text-start w-100" onClick={() => { setTroubleOpen(false); setBackupOpen(true); }}>
            <span className="d-block fw-semibold">Review backup codes</span>
            <span className="dx-help d-block">See which codes are used, copy or regenerate the set.</span>
          </button>
          <button type="button" className="dx-card-inset text-start w-100" onClick={() => { setTroubleOpen(false); setSetupOpen(true); }}>
            <span className="d-block fw-semibold">Re-enroll an authenticator</span>
            <span className="dx-help d-block">New phone? Run the setup wizard — old secrets stop working immediately.</span>
          </button>
          <button type="button" className="dx-card-inset text-start w-100" onClick={() => { setTroubleOpen(false); setActivityOpen(true); }}>
            <span className="d-block fw-semibold">Check login activity</span>
            <span className="dx-help d-block">See blocked attempts and sign-ins you do not recognise.</span>
          </button>
        </div>
      </Dialog>
      <TwoFactorSetupWizard open={setupOpen} onClose={() => setSetupOpen(false)}
        onEnabled={() => {
          setSetupDone(true);
          toast.push({ tone: "success", title: "Two-factor enabled", body: "Authenticator verified and 10 backup codes issued." });
        }} />
      <BackupCodesDialog open={backupOpen} onClose={() => setBackupOpen(false)} />
      <SessionsDrawer open={sessionsOpen} onClose={() => setSessionsOpen(false)} />
      <LoginActivityDialog open={activityOpen} onClose={() => setActivityOpen(false)}
        onOpenSessions={() => { setActivityOpen(false); setSessionsOpen(true); }} />
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
