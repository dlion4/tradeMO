// =============================================================================
// AccountModals.tsx — H-1 account overlay pack: the 5-step Deriv OAuth
// walkthrough, sign-in (with 2FA + password reset), the 4-step onboarding
// wizard and the connection manager.
// =============================================================================
import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Check,
  Copy,
  KeyRound,
  Link2,
  Lock,
  LogIn,
  Mail,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Trash2,
  Unplug,
  UserPlus,
} from "lucide-react";
import {
  Alert,
  Avatar,
  Chip,
  CopyButton,
  Dialog,
  Field,
  Meter,
  Progress,
  Stepper,
  Tabs,
  Toggle,
} from "../../ui/primitives";
import {
  DERIV_ACCOUNTS,
  STRATEGY_PRESETS,
  type DerivAccount,
} from "../../../data/trading";
import { pct, usd } from "../../../data/market";

// -----------------------------------------------------------------------------
// OAuth walkthrough — 5 steps, mirrors the real Deriv OAuth2 redirect flow
// -----------------------------------------------------------------------------
export function OAuthWizard({
  open,
  onClose,
  onConnected,
  onOpenStatus,
  onOpenSignUp,
  onOpenDemo,
}: {
  open: boolean;
  onClose: () => void;
  onConnected: (loginId: string) => void;
  onOpenStatus: () => void;
  onOpenSignUp: () => void;
  onOpenDemo: () => void;
}) {
  const [step, setStep] = useState(0);
  const [scopes, setScopes] = useState({ read: true, trade: true, payments: false, admin: false });
  const [account, setAccount] = useState("VRTC9031442");
  const [consent, setConsent] = useState(false);
  const [denied, setDenied] = useState(false);
  const [exchanging, setExchanging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [connectionName, setConnectionName] = useState("Main Deriv link");
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [subscribeBalance, setSubscribeBalance] = useState(true);

  const steps = [
    { id: "authorize", label: "Authorise" },
    { id: "deriv", label: "Deriv screen" },
    { id: "exchange", label: "Token" },
    { id: "link", label: "Link" },
    { id: "done", label: "Connected" },
  ];

  const appId = "108487";
  const state = "st_7f31c9e2ab";
  const redirect = "https://derivx.example/auth/deriv/callback";
  const selected = DERIV_ACCOUNTS.find((a) => a.loginId === account) ?? DERIV_ACCOUNTS[1];

  useEffect(() => {
    if (step !== 2) return;
    setExchanging(true);
    setProgress(0);
    const id = window.setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          window.clearInterval(id);
          setExchanging(false);
          return 100;
        }
        return Math.min(100, p + 12);
      });
    }, 190);
    return () => window.clearInterval(id);
  }, [step]);

  const scopeCount = Object.values(scopes).filter(Boolean).length;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Connect to Deriv"
      subtitle={`OAuth2 authorisation code flow · app_id ${appId} · the platform never receives your Deriv password`}
      footer={
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 w-100">
          <Stepper steps={steps} active={step} onStepClick={(i) => (i < step ? setStep(i) : undefined)} />
          <div className="d-flex flex-wrap gap-2">
            {step > 0 && step < 4 ? (
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setStep((s) => s - 1)}>
                Back
              </button>
            ) : null}
            {step === 0 ? (
              <button
                type="button"
                className="dx-btn dx-btn-sm dx-btn-primary"
                disabled={scopeCount === 0}
                onClick={() => setStep(1)}
              >
                Continue to Deriv
              </button>
            ) : null}
            {step === 1 ? (
              denied ? (
                <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => { setDenied(false); setStep(0); }}>
                  Retry authorisation
                </button>
              ) : (
                <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" disabled={!consent} onClick={() => setStep(2)}>
                  Approve access
                </button>
              )
            ) : null}
            {step === 2 ? (
              <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" disabled={exchanging} onClick={() => setStep(3)}>
                {exchanging ? "Exchanging…" : "Link this account"}
              </button>
            ) : null}
            {step === 3 ? (
              <button
                type="button"
                className="dx-btn dx-btn-sm dx-btn-primary"
                onClick={() => {
                  setStep(4);
                  onConnected(selected.loginId);
                }}
              >
                <Link2 size={13} /> Finish connection
              </button>
            ) : null}
            {step === 4 ? (
              <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={onClose}>
                <Check size={13} /> Done
              </button>
            ) : null}
          </div>
        </div>
      }
    >
      {step === 0 ? (
        <div className="d-grid gap-4">
          <Alert tone="info" title="What you are about to grant">
            DerivX asks Deriv for a scoped access token. Scopes are checked before every request — a read-only connection can never
            place a contract.
          </Alert>
          <div className="d-grid gap-2">
            {[
              { id: "read", label: "read", help: "Market data, balance, portfolio and statements" },
              { id: "trade", label: "trade", help: "Place, sell and cancel contracts on your account" },
              { id: "payments", label: "payments", help: "Deposits, withdrawals and transfer between accounts" },
              { id: "admin", label: "admin", help: "Token management, account settings, self-exclusion" },
            ].map((s) => (
              <Toggle
                key={s.id}
                checked={scopes[s.id as keyof typeof scopes]}
                onChange={(v) => setScopes({ ...scopes, [s.id]: v })}
                label={`${s.label} scope`}
                hint={s.help}
              />
            ))}
          </div>
          <div className="row g-3">
            <div className="col-12 col-sm-6">
              <Field label="Redirect URI" help="Registered in the Deriv app manager.">
                <input className="dx-input font-display" value={redirect} readOnly />
              </Field>
            </div>
            <div className="col-12 col-sm-6">
              <Field label="CSRF state token" help="Verified on return; blocks callback spoofing.">
                <input className="dx-input font-display" value={state} readOnly />
              </Field>
            </div>
          </div>
          <div className="dx-card-inset">
            <div className="dx-kpi-label mb-1">Authorisation URL</div>
            <code className="font-display" style={{ fontSize: "0.74rem", wordBreak: "break-all" }}>
              https://oauth.deriv.com/en/authorize?app_id={appId}&amp;l=en&amp;redirect_uri={encodeURIComponent(redirect)}&amp;state={state}
              &amp;scope={Object.entries(scopes).filter(([, v]) => v).map(([k]) => k).join("+")}
            </code>
            <div className="d-flex gap-2 mt-3">
              <CopyButton text={`https://oauth.deriv.com/en/authorize?app_id=${appId}&l=en&redirect_uri=${redirect}&state=${state}`} label="Copy URL" />
              <span className="dx-help align-self-center">{scopeCount} scope(s) requested</span>
            </div>
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="d-grid gap-3">
          <div className="dx-card-inset">
            <div className="d-flex align-items-center gap-2 mb-3">
              <ShieldCheck size={15} className="dx-up" />
              <span className="fw-semibold">oauth.deriv.com</span>
              <span className="dx-chip dx-chip-muted ms-auto">simulated screen</span>
            </div>
            {denied ? (
              <>
                <Alert tone="danger" title="Authorisation declined">
                  Deriv reported that you declined the request. Nothing was linked and no token was issued.
                </Alert>
                <div className="d-flex flex-wrap gap-2 mt-3">
                  <button type="button" className="dx-btn dx-btn-sm" onClick={() => { setDenied(false); setStep(0); }}>
                    Change scopes and retry
                  </button>
                  <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={onOpenSignUp}>
                    Create a platform account first
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="dx-help">
                  <strong>DerivX</strong> is requesting access to your Deriv account. Select the account to authorise:
                </p>
                <div className="d-grid gap-2">
                  {DERIV_ACCOUNTS.map((a) => (
                    <label key={a.loginId} className={`dx-list-row ${account === a.loginId ? "border-secondary" : ""}`} style={{ cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="oauth-account"
                        className="form-check-input"
                        checked={account === a.loginId}
                        onChange={() => setAccount(a.loginId)}
                      />
                      <span className="flex-grow-1">
                        <span className="d-block fw-semibold font-display">{a.loginId}</span>
                        <span className="dx-help">
                          {a.label} · {a.type} · {usd(a.balance)}
                        </span>
                      </span>
                      <span className={`dx-chip ${a.connected ? "dx-chip-up" : "dx-chip-muted"}`}>{a.connected ? "linked" : "new"}</span>
                    </label>
                  ))}
                </div>
                <label className="dx-check mt-3">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                  <span>
                    I authorise DerivX to access <span className="font-display">{selected.loginId}</span> with{" "}
                    <span className="font-display">{scopeCount}</span> scope(s). I can revoke this at any time.
                  </span>
                </label>
                <div className="d-flex gap-2 mt-3">
                  <button type="button" className="dx-btn dx-btn-sm dx-btn-danger" onClick={() => setDenied(true)}>
                    <Unplug size={13} /> Decline
                  </button>
                  <span className="dx-help align-self-center">
                    Scopes: {Object.entries(scopes).filter(([, v]) => v).map(([k]) => k).join(", ") || "none selected"}
                  </span>
                </div>
              </>
            )}
          </div>
          <Alert tone="warn" title="Real Deriv accounts">
            Connecting a CR account means bots can place contracts with real money. Start on a VRTC virtual account and switch later
            from Settings → Connections.
          </Alert>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="d-grid gap-4">
          <div>
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="dx-kpi-label">Exchanging authorisation code for an access token</span>
              <span className="font-display">{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
          <div className="row g-3">
            <div className="col-12 col-sm-6">
              <div className="dx-card-inset">
                <div className="dx-kpi-label">Request</div>
                <code className="font-display" style={{ fontSize: "0.74rem" }}>
                  {'{ "authorize": "a1-9c82f4d…", "req_id": 1 }'}
                </code>
              </div>
            </div>
            <div className="col-12 col-sm-6">
              <div className="dx-card-inset">
                <div className="dx-kpi-label">Response (masked)</div>
                <code className="font-display" style={{ fontSize: "0.74rem" }}>
                  {exchanging ? '{ "authorize": … }' : `{ "loginid": "${selected.loginId}", "token": "a1-••••••7f", "balance": ${selected.balance} }`}
                </code>
              </div>
            </div>
          </div>
          <div className="row g-3">
            {[
              { k: "Round trip", v: exchanging ? "measuring…" : "118 ms" },
              { k: "Socket", v: "wss://ws.derivws.com/websockets/v3" },
              { k: "Scopes returned", v: `${scopeCount}` },
              { k: "Session lane", v: "eu-west relay · 12 ms" },
            ].map((row) => (
              <div className="col-6 col-lg-3" key={row.k}>
                <div className="dx-card-inset">
                  <div className="dx-kpi-label">{row.k}</div>
                  <div className="font-display fw-semibold" style={{ fontSize: "0.82rem" }}>
                    {row.v}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Alert tone="info" title="Token handling">
            The token is encrypted with a per-user key before it is stored. The plaintext value never appears in logs, analytics or
            support tooling.
          </Alert>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="d-grid gap-4">
          <div className="row g-3">
            <div className="col-12 col-sm-6">
              <Field label="Connection name" required help="Shown everywhere you pick an account.">
                <input className="dx-input" value={connectionName} onChange={(e) => setConnectionName(e.target.value)} />
              </Field>
            </div>
            <div className="col-12 col-sm-6">
              <Field label="Account" required>
                <select className="dx-select font-display" value={account} onChange={(e) => setAccount(e.target.value)}>
                  {DERIV_ACCOUNTS.map((a) => (
                    <option key={a.loginId} value={a.loginId}>
                      {a.loginId} — {a.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
          <div className="d-grid gap-2">
            <Toggle checked={autoReconnect} onChange={setAutoReconnect} label="Auto-reconnect the socket" hint="Retries with exponential backoff; orders stay idempotent." />
            <Toggle checked={subscribeBalance} onChange={setSubscribeBalance} label="Stream balance & portfolio" hint="Keeps the dashboard and bot risk checks in sync." />
          </div>
          <div className="dx-card-inset">
            <div className="dx-kpi-label mb-2">Linked account preview</div>
            <div className="d-flex flex-wrap align-items-center gap-3">
              <Avatar name={connectionName} tone="teal" size="lg" />
              <div className="flex-grow-1">
                <div className="fw-semibold">{connectionName}</div>
                <div className="dx-help font-display">
                  {selected.loginId} · {selected.type} · balance {usd(selected.balance)}
                </div>
              </div>
              <Chip tone="up">
                <BadgeCheck size={12} /> token valid
              </Chip>
            </div>
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="d-grid gap-4">
          <Alert tone="up" title={`${connectionName} connected`}>
            Session established for <span className="font-display">{selected.loginId}</span>. Balance and portfolio subscriptions are
            live on the eu-west relay.
          </Alert>
          <div className="row g-3">
            {[
              { k: "Login ID", v: selected.loginId },
              { k: "Account type", v: selected.type },
              { k: "Balance", v: usd(selected.balance) },
              { k: "Equity", v: usd(selected.equity) },
              { k: "Scopes", v: Object.entries(scopes).filter(([, v]) => v).map(([k]) => k).join(", ") || "read" },
              { k: "Relay", v: "eu-west · 12 ms" },
            ].map((row) => (
              <div className="col-6" key={row.k}>
                <div className="dx-card-inset">
                  <div className="dx-kpi-label">{row.k}</div>
                  <div className="font-display fw-semibold" style={{ fontSize: "0.84rem" }}>
                    {row.v}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="d-flex flex-wrap gap-2">
            <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={onOpenDemo}>
              Trade on the console with this account
            </button>
            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={onOpenStatus}>
              Check the endpoint health
            </button>
            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={onOpenSignUp}>
              Review risk caps next
            </button>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// Sign-in dialog (credentials → 2FA), with password reset sub-flow
// -----------------------------------------------------------------------------
export function SignInDialog({
  open,
  onClose,
  onSignedIn,
  onOpenSignUp,
  onOpenDashboardNotice,
}: {
  open: boolean;
  onClose: () => void;
  onSignedIn: (email: string, loginId: string) => void;
  onOpenSignUp: () => void;
  onOpenDashboardNotice: () => void;
}) {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("ade.fashola@example.com");
  const [password, setPassword] = useState("");
  const [account, setAccount] = useState(DERIV_ACCOUNTS[0].loginId);
  const [remember, setRemember] = useState(true);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [reset, setReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submitCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) {
      setError("Enter the email attached to your platform account.");
      return;
    }
    if (password.length < 8) {
      setError("Passwords are at least 8 characters.");
      return;
    }
    setError("");
    setStep(1);
  };

  const submitCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setError("");
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      setStep(2);
      onSignedIn(email, account);
    }, 900);
  };

  const steps = [
    { id: "credentials", label: "Credentials" },
    { id: "twofa", label: "2FA" },
    { id: "ok", label: "Session" },
  ];

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        size="md"
        title="Log in to DerivX"
        subtitle="Platform credentials — your Deriv account is linked separately with OAuth"
        footer={
          step === 2 ? (
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 w-100">
              <span className="dx-help">Session expires after 12 hours of inactivity.</span>
              <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={onClose}>
                Done
              </button>
            </div>
          ) : (
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 w-100">
              <button type="button" className="dx-btn-link" onClick={() => setReset(true)}>
                Forgot your password?
              </button>
              <div className="d-flex gap-2">
                <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={onOpenSignUp}>
                  <UserPlus size={13} /> Create account
                </button>
                {step === 0 ? (
                  <button type="submit" form="signin-form" className="dx-btn dx-btn-sm dx-btn-primary">
                    <LogIn size={13} /> Continue
                  </button>
                ) : (
                  <button type="submit" form="twofa-form" className="dx-btn dx-btn-sm dx-btn-primary" disabled={busy}>
                    {busy ? "Verifying…" : "Verify & log in"}
                  </button>
                )}
              </div>
            </div>
          )
        }
      >
        <Stepper steps={steps} active={step} className="mb-4" />

        {step === 0 ? (
          <form id="signin-form" className="d-grid gap-3" onSubmit={submitCredentials} noValidate>
            <Field label="Email" required error={error && /email/i.test(error) ? error : undefined}>
              <input
                className={`dx-input ${error && /email/i.test(error) ? "is-invalid" : ""}`}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
            </Field>
            <Field label="Password" required error={error && /password/i.test(error) ? error : undefined}>
              <input
                className={`dx-input ${error && /password/i.test(error) ? "is-invalid" : ""}`}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </Field>
            <Field label="Default trading account">
              <select className="dx-select font-display" value={account} onChange={(e) => setAccount(e.target.value)}>
                {DERIV_ACCOUNTS.map((a) => (
                  <option key={a.loginId} value={a.loginId}>
                    {a.loginId} — {a.label} ({usd(a.balance)})
                  </option>
                ))}
              </select>
            </Field>
            <Toggle checked={remember} onChange={setRemember} label="Keep me signed in on this device" />
            <Alert tone="info" title="Demo credentials">
              This is a front-end build: any 8-character password is accepted and the 2FA code is any six digits.
            </Alert>
          </form>
        ) : null}

        {step === 1 ? (
          <form id="twofa-form" className="d-grid gap-3" onSubmit={submitCode} noValidate>
            <div className="d-flex align-items-center gap-3">
              <span className="dx-empty-ico" style={{ width: 44, height: 44 }}>
                <Smartphone size={18} />
              </span>
              <div>
                <div className="fw-semibold">Two-factor authentication</div>
                <div className="dx-help">Enter the 6-digit code from your authenticator app.</div>
              </div>
            </div>
            <Field label="Authenticator code" required error={error}>
              <input
                className={`dx-input dx-input-num ${error ? "is-invalid" : ""}`}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                style={{ letterSpacing: "0.4em", fontSize: "1.1rem" }}
              />
            </Field>
            <div className="d-flex flex-wrap gap-2">
              <button
                type="button"
                className="dx-btn dx-btn-sm dx-btn-ghost"
                onClick={() => {
                  setCode("418290");
                  setError("");
                }}
              >
                <KeyRound size={13} /> Fill the demo code
              </button>
              <CopyButton text="The demo build accepts any six digits." label="Why?" />
            </div>
          </form>
        ) : null}

        {step === 2 ? (
          <div className="d-grid gap-3">
            <Alert tone="up" title="Signed in">
              Session opened for <span className="font-display">{email}</span> on {account}. Two-factor verification passed at{" "}
              {new Date().toISOString().slice(11, 19)} UTC.
            </Alert>
            <div className="row g-3">
              {[
                { k: "Device", v: "Chrome · Linux" },
                { k: "IP region", v: "Lagos, NG" },
                { k: "Account", v: account },
                { k: "Session TTL", v: "12 hours" },
              ].map((row) => (
                <div className="col-6" key={row.k}>
                  <div className="dx-card-inset">
                    <div className="dx-kpi-label">{row.k}</div>
                    <div className="dx-card-inset-value font-display fw-semibold">{row.v}</div>
                  </div>
                </div>
              ))}
            </div>
            <Alert tone="warn" title="Dashboard routes are not built in this session">
              D-1 … D-14 (overview, markets, trade, bots, scripts, automation, portfolio, social, analytics, connections, settings)
              are gated behind the shell nav config, so nothing links there yet. Use the interactive console meanwhile — it runs the
              same widgets on simulated ticks.
            </Alert>
            <button type="button" className="dx-btn dx-btn-primary" onClick={onOpenDashboardNotice}>
              Open the interactive console instead
            </button>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={reset}
        onClose={() => setReset(false)}
        size="sm"
        title="Reset your password"
        subtitle="We email a single-use link that expires in 30 minutes."
        footer={
          <div className="d-flex justify-content-between align-items-center gap-2 w-100">
            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setReset(false)}>
              Back to sign in
            </button>
            {resetSent ? (
              <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => { setReset(false); setResetSent(false); }}>
                Done
              </button>
            ) : (
              <button
                type="button"
                className="dx-btn dx-btn-sm dx-btn-primary"
                onClick={() => {
                  if (/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(resetEmail)) setResetSent(true);
                }}
              >
                <Mail size={13} /> Send reset link
              </button>
            )}
          </div>
        }
      >
        {resetSent ? (
          <div className="d-grid gap-3">
            <Alert tone="up" title="Check your inbox">
              A reset link is on its way to <span className="font-display">{resetEmail}</span>. The link stops working after 30 minutes
              or once it is used.
            </Alert>
            <div className="dx-card-inset">
              <div className="dx-kpi-label mb-1">Not seeing it?</div>
              <ul className="dx-help mb-0 ps-3 d-grid gap-1">
                <li>Check spam — the sender is no-reply@derivx.example.</li>
                <li>Reset links are per-device and cannot be reused.</li>
                <li>Still nothing after 5 minutes? Contact support with your login ID.</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="d-grid gap-3">
            <Field label="Account email" required help="We never reveal whether an address is registered.">
              <input
                className="dx-input"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="trader@example.com"
              />
            </Field>
            <Alert tone="info" title="2FA still applies">
              Resetting the password does not disable two-factor authentication, and it does not touch your Deriv OAuth connection.
            </Alert>
          </div>
        )}
      </Dialog>
    </>
  );
}

// -----------------------------------------------------------------------------
// Onboarding wizard — 4 steps, opened by every "Get started" CTA
// -----------------------------------------------------------------------------
export function SignupWizard({
  open,
  onClose,
  initialPresetId,
  onCompleted,
  onOpenOAuth,
  onOpenDemo,
  onOpenPresets,
}: {
  open: boolean;
  onClose: () => void;
  initialPresetId?: string;
  onCompleted: (loginId: string) => void;
  onOpenOAuth: () => void;
  onOpenDemo: () => void;
  onOpenPresets: () => void;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: "", email: "", password: "", country: "NG", terms: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [accountType, setAccountType] = useState<"virtual" | "real">("virtual");
  const [linked, setLinked] = useState(false);
  const [skipLink, setSkipLink] = useState(false);
  const [presetId, setPresetId] = useState(initialPresetId ?? STRATEGY_PRESETS[0].id);
  const [maxStake, setMaxStake] = useState(50);
  const [dailyStop, setDailyStop] = useState(150);
  const [maxOpen, setMaxOpen] = useState(3);
  const [autoPause, setAutoPause] = useState(true);
  const [notify, setNotify] = useState(true);
  const [loginId, setLoginId] = useState("");

  const steps = useMemo(
    () => [
      { id: "account", label: "Account" },
      { id: "deriv", label: "Deriv link" },
      { id: "strategy", label: "Strategy" },
      { id: "risk", label: "Risk caps" },
    ],
    [],
  );

  const preset = STRATEGY_PRESETS.find((p) => p.id === presetId) ?? STRATEGY_PRESETS[0];

  const validateAccount = () => {
    const next: Record<string, string> = {};
    if (form.name.trim().length < 3) next.name = "We need a name for the account.";
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(form.email)) next.email = "A valid email is required.";
    if (form.password.length < 8) next.password = "At least 8 characters.";
    if (!form.terms) next.terms = "Accept the terms and the risk disclosure to continue.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={step === 3 ? "You are ready to trade" : "Get started with DerivX"}
      subtitle={
        step === 3
          ? "Nothing goes live until you confirm your first contract."
          : "Four steps: platform account, Deriv link, strategy and risk ceiling."
      }
      footer={
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 w-100">
          <Stepper steps={steps} active={step} onStepClick={(i) => (i < step ? setStep(i) : undefined)} />
          <div className="d-flex flex-wrap gap-2">
            {step > 0 && step < 3 ? (
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setStep((s) => s - 1)}>
                Back
              </button>
            ) : null}
            {step === 0 ? (
              <button
                type="button"
                className="dx-btn dx-btn-sm dx-btn-primary"
                onClick={() => {
                  if (validateAccount()) setStep(1);
                }}
              >
                Create account
              </button>
            ) : null}
            {step === 1 ? (
              <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => setStep(2)} disabled={!linked && !skipLink}>
                {linked || skipLink ? "Continue" : "Link or skip to continue"}
              </button>
            ) : null}
            {step === 2 ? (
              <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => setStep(3)}>
                Set risk caps
              </button>
            ) : null}
            {step === 3 ? (
              <>
                <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={onOpenPresets}>
                  Review presets again
                </button>
                <button
                  type="button"
                  className="dx-btn dx-btn-sm dx-btn-primary"
                  onClick={() => {
                    const id = accountType === "real" ? "CR9120448" : "VRTC1024887";
                    setLoginId(id);
                    onCompleted(id);
                  }}
                >
                  <Check size={13} /> Confirm and open console
                </button>
              </>
            ) : null}
          </div>
        </div>
      }
    >
      {step === 0 ? (
        <div className="d-grid gap-3">
          <div className="row g-3">
            <div className="col-12 col-sm-6">
              <Field label="Full name" required error={errors.name}>
                <input
                  className={`dx-input ${errors.name ? "is-invalid" : ""}`}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ade Fashola"
                />
              </Field>
            </div>
            <div className="col-12 col-sm-6">
              <Field label="Email" required error={errors.email}>
                <input
                  className={`dx-input ${errors.email ? "is-invalid" : ""}`}
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="trader@example.com"
                />
              </Field>
            </div>
            <div className="col-12 col-sm-6">
              <Field label="Password" required error={errors.password} help="Minimum 8 characters; a passphrase beats a symbol soup.">
                <input
                  className={`dx-input ${errors.password ? "is-invalid" : ""}`}
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                />
              </Field>
            </div>
            <div className="col-12 col-sm-6">
              <Field label="Country of residence" required help="Determines the onboarding checklist and tax forms.">
                <select className="dx-select" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
                  <option value="NG">Nigeria</option>
                  <option value="KE">Kenya</option>
                  <option value="GH">Ghana</option>
                  <option value="ID">Indonesia</option>
                  <option value="GB">United Kingdom</option>
                  <option value="DE">Germany</option>
                </select>
              </Field>
            </div>
          </div>
          <Field label="Account type" required help="Virtual accounts trade the same contract types with simulated funds.">
            <div className="d-flex flex-wrap gap-2">
              {(["virtual", "real"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`dx-filter-chip ${accountType === t ? "is-active" : ""}`}
                  onClick={() => setAccountType(t)}
                >
                  {t === "virtual" ? "Virtual (VRTC) — recommended" : "Real (CR)"}
                </button>
              ))}
            </div>
          </Field>
          <label className="dx-check">
            <input type="checkbox" checked={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.checked })} />
            <span>
              I accept the Terms of Service and the Risk Disclosure, and I understand Deriv contracts can lose money quickly if
              automated without caps.
            </span>
          </label>
          {errors.terms ? <span className="dx-error">{errors.terms}</span> : null}
          <Alert tone="info" title="What this step does not do">
            Creating the platform account does not touch Deriv, does not move funds and does not enable trading. The Deriv link is a
            separate OAuth step next.
          </Alert>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="d-grid gap-4">
          <div className="row g-3">
            <div className="col-12 col-sm-6">
              <div className="dx-card-inset h-100 d-flex flex-column">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <Link2 size={15} className="dx-up" />
                  <span className="fw-semibold">Link Deriv now</span>
                </div>
                <p className="dx-help flex-grow-1">Runs the OAuth2 handshake in a guided walkthrough and returns here with the connection ready.</p>
                <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={onOpenOAuth}>
                  <KeyRound size={13} /> Open OAuth walkthrough
                </button>
              </div>
            </div>
            <div className="col-12 col-sm-6">
              <div className="dx-card-inset h-100 d-flex flex-column">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <RefreshCw size={15} className="dx-muted" />
                  <span className="fw-semibold">Skip for now</span>
                </div>
                <p className="dx-help flex-grow-1">Explore the console on simulated ticks. You can link an account from Settings → Connections at any time.</p>
                <button
                  type="button"
                  className={`dx-btn dx-btn-sm ${skipLink ? "dx-btn-primary" : ""}`}
                  onClick={() => setSkipLink(true)}
                >
                  {skipLink ? "Skipping — continue" : "I will link later"}
                </button>
              </div>
            </div>
          </div>
          <div className="dx-card-inset">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
              <div>
                <div className="dx-kpi-label">Connection status</div>
                <div className="dx-help mb-0">
                  {linked ? "Deriv account linked and token stored." : skipLink ? "No connection yet — console runs on simulated ticks." : "Awaiting your choice."}
                </div>
              </div>
              <Chip tone={linked ? "up" : skipLink ? "warn" : "muted"} pulse={linked}>
                {linked ? "linked" : skipLink ? "skipped" : "pending"}
              </Chip>
            </div>
            {linked ? (
              <div className="row g-3 mt-1">
                {DERIV_ACCOUNTS.slice(0, 2).map((a) => (
                  <div className="col-6" key={a.loginId}>
                    <div className="dx-card-inset">
                      <div className="dx-kpi-label font-display">{a.loginId}</div>
                      <div className="dx-help">{usd(a.balance)} · {a.type}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="d-flex flex-wrap gap-2 mt-3">
              <button
                type="button"
                className="dx-btn dx-btn-sm"
                onClick={() => {
                  setLinked(true);
                  setSkipLink(false);
                }}
              >
                Mark as linked (simulate callback)
              </button>
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={onOpenDemo}>
                Preview the console first
              </button>
            </div>
          </div>
          <Alert tone="warn" title="Real-account caution">
            If you link a CR account, every bot you deploy can place contracts with real money. Set the risk caps in the final step
            before you deploy anything.
          </Alert>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="d-grid gap-4">
          <div className="dx-table-wrap dx-table-scroll">
            <table className="dx-table dx-table-sm dx-table-stack">
              <thead>
                <tr>
                  <th scope="col">Preset</th>
                  <th scope="col">Symbol</th>
                  <th scope="col" className="dx-td-num">
                    Stake
                  </th>
                  <th scope="col" className="dx-td-num">
                    Win rate
                  </th>
                  <th scope="col">Risk</th>
                  <th scope="col" className="dx-td-actions">
                    Choose
                  </th>
                </tr>
              </thead>
              <tbody>
                {STRATEGY_PRESETS.slice(0, 8).map((p) => (
                  <tr key={p.id} style={p.id === presetId ? { background: "var(--dx-accent-soft)" } : undefined}>
                    <td data-label="Preset">
                      <span className="fw-semibold">{p.name}</span>
                      <span className="dx-help d-block">{p.kind} · {p.difficulty}</span>
                    </td>
                    <td data-label="Symbol" className="font-display">
                      {p.symbol}
                    </td>
                    <td data-label="Stake" className="dx-td-num font-display">
                      {usd(p.stake)}
                    </td>
                    <td data-label="Win rate" className="dx-td-num font-display">
                      {pct(p.winRate, 1)}
                    </td>
                    <td data-label="Risk">
                      <span className={`dx-chip dx-risk-${p.risk === "low" ? "low" : p.risk === "medium" ? "med" : "high"}`}>{p.risk}</span>
                    </td>
                    <td data-label="Choose" className="dx-td-actions">
                      <button
                        type="button"
                        className={`dx-btn dx-btn-sm ${p.id === presetId ? "dx-btn-primary" : "dx-btn-ghost"}`}
                        onClick={() => setPresetId(p.id)}
                      >
                        {p.id === presetId ? "Selected" : "Select"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="dx-card-inset">
            <div className="dx-kpi-label mb-2">Selected: {preset.name}</div>
            <ul className="dx-help mb-0 ps-3 d-grid gap-1">
              {preset.rules.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="d-grid gap-4">
          <div className="row g-3">
            <div className="col-12 col-sm-4">
              <Field label="Max stake per leg (USD)" help="Engine refuses anything above this.">
                <input
                  className="dx-input dx-input-num"
                  type="number"
                  min={preset.stake}
                  value={maxStake}
                  onChange={(e) => setMaxStake(Math.max(preset.stake, Number(e.target.value)))}
                />
              </Field>
            </div>
            <div className="col-12 col-sm-4">
              <Field label="Daily stop-loss (USD)" help="Realised loss that pauses every bot.">
                <input
                  className="dx-input dx-input-num"
                  type="number"
                  min={20}
                  value={dailyStop}
                  onChange={(e) => setDailyStop(Math.max(20, Number(e.target.value)))}
                />
              </Field>
            </div>
            <div className="col-12 col-sm-4">
              <Field label="Max concurrent contracts" help="Across all bots on this connection.">
                <select className="dx-select dx-input-num" value={maxOpen} onChange={(e) => setMaxOpen(Number(e.target.value))}>
                  {[1, 2, 3, 4, 6, 10].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
          <div className="d-grid gap-3">
            <Meter label="Headroom to cap" value={Math.min(100, (maxStake / (preset.stake * 32)) * 100)} display={`${usd(preset.stake)} → ${usd(maxStake)}`} />
            <Meter label="Daily stop vs projected monthly P&L" value={Math.min(100, (dailyStop / Math.max(1, Math.abs(preset.avgPnl * 22))) * 100)} display={usd(dailyStop)} />
          </div>
          <div className="d-grid gap-2">
            <Toggle checked={autoPause} onChange={setAutoPause} label="Auto-pause after 5 consecutive losses" hint="One notification, no automatic restart." />
            <Toggle checked={notify} onChange={setNotify} label="Notify on cap, stop-loss and barrier events" />
          </div>
          <Alert tone="up" title={`Everything is set${loginId ? ` — account ${loginId}` : ""}`}>
            {accountType === "virtual"
              ? "You are on a virtual account: same tick feed and contract types, simulated funds. Graduate to a real account when the strategy has held up."
              : "You are on a real account: start with the smallest stake that the symbol allows and watch the first twenty contracts before scaling."}
          </Alert>
          <div className="row g-3">
            {[
              { k: "Strategy", v: preset.name },
              { k: "Symbol", v: preset.symbol },
              { k: "Base stake", v: usd(preset.stake) },
              { k: "Max stake", v: usd(maxStake) },
              { k: "Daily stop", v: usd(dailyStop) },
              { k: "Max open", v: `${maxOpen}` },
            ].map((row) => (
              <div className="col-6 col-lg-4" key={row.k}>
                <div className="dx-card-inset">
                  <div className="dx-kpi-label">{row.k}</div>
                  <div className="font-display fw-semibold">{row.v}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="d-flex flex-wrap gap-2">
            <Chip tone="up">
              <ShieldCheck size={12} /> caps enforced server-side
            </Chip>
            <Chip tone="muted">
              <Lock size={12} /> token encrypted at rest
            </Chip>
            <button type="button" className="dx-btn-link" onClick={onOpenDemo}>
              Peek at the console before finishing →
            </button>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// Connection manager (account switcher)
// -----------------------------------------------------------------------------
export function AccountSwitcherDialog({
  open,
  onClose,
  activeLoginId,
  onSetActive,
  onOpenOAuth,
  onDisconnected,
  onOpenStatus,
}: {
  open: boolean;
  onClose: () => void;
  activeLoginId: string;
  onSetActive: (loginId: string) => void;
  onOpenOAuth: () => void;
  onDisconnected: (loginId: string) => void;
  onOpenStatus: () => void;
}) {
  const [accounts, setAccounts] = useState<DerivAccount[]>(DERIV_ACCOUNTS);
  const [tab, setTab] = useState("connections");
  const [confirmRevoke, setConfirmRevoke] = useState<DerivAccount | null>(null);

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        size="lg"
        title="Deriv connections"
        subtitle={`${accounts.filter((a) => a.connected).length} of ${accounts.length} accounts linked · tokens stored encrypted per user`}
        footer={
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 w-100">
            <span className="dx-help">Revoking a connection immediately halts every bot running on it.</span>
            <div className="d-flex gap-2">
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={onOpenStatus}>
                Endpoint health
              </button>
              <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={onOpenOAuth}>
                <Link2 size={13} /> Add connection
              </button>
            </div>
          </div>
        }
      >
        <Tabs
          tabs={[
            { id: "connections", label: "Accounts" },
            { id: "scopes", label: "Scopes & tokens" },
          ]}
          active={tab}
          onChange={setTab}
          className="mb-3"
        />

        {tab === "connections" ? (
          <div className="d-grid gap-3">
            {accounts.map((a) => (
              <div key={a.loginId} className={`dx-card-inset ${a.loginId === activeLoginId ? "dx-card-live" : ""}`}>
                <div className="d-flex flex-wrap align-items-start justify-content-between gap-3">
                  <div className="d-flex align-items-center gap-3">
                    <Avatar name={a.label} tone={a.connected ? "teal" : "blue"} />
                    <div>
                      <div className="fw-semibold font-display">{a.loginId}</div>
                      <div className="dx-help">
                        {a.label} · {a.type} · balance {usd(a.balance)} · equity {usd(a.equity)}
                      </div>
                      <div className="d-flex flex-wrap gap-1 mt-2">
                        {a.scopes.map((s) => (
                          <Chip key={s} tone="muted">
                            {s}
                          </Chip>
                        ))}
                        <Chip tone={a.connected ? "up" : "warn"}>{a.connected ? "connected" : "disconnected"}</Chip>
                        {a.loginId === activeLoginId ? <Chip tone="accent">active</Chip> : null}
                      </div>
                    </div>
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={`dx-btn dx-btn-sm ${a.loginId === activeLoginId ? "dx-btn-ghost" : "dx-btn-primary"}`}
                      onClick={() => onSetActive(a.loginId)}
                      disabled={a.loginId === activeLoginId || !a.connected}
                    >
                      {a.loginId === activeLoginId ? "In use" : "Use this"}
                    </button>
                    <button
                      type="button"
                      className="dx-btn dx-btn-sm dx-btn-ghost"
                      onClick={() => {
                        onSetActive(a.loginId);
                        onOpenOAuth();
                      }}
                    >
                      <RefreshCw size={13} /> Re-auth
                    </button>
                    <button
                      type="button"
                      className="dx-btn dx-btn-sm dx-btn-danger"
                      onClick={() => setConfirmRevoke(a)}
                      disabled={!a.connected}
                    >
                      <Trash2 size={13} /> Revoke
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {tab === "scopes" ? (
          <div className="dx-table-wrap dx-table-scroll">
            <table className="dx-table dx-table-sm dx-table-stack">
              <thead>
                <tr>
                  <th scope="col">Account</th>
                  <th scope="col">Scopes</th>
                  <th scope="col">Token</th>
                  <th scope="col">Last seen</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.loginId}>
                    <td data-label="Account" className="font-display">
                      {a.loginId}
                    </td>
                    <td data-label="Scopes" className="font-display">
                      {a.scopes.join(", ")}
                    </td>
                    <td data-label="Token">
                      <CopyButton text={`a1-••••••${a.loginId.slice(-2)}`} label="Masked" />
                    </td>
                    <td data-label="Last seen" className="font-display">
                      {new Date(a.lastSeen).toISOString().slice(11, 16)}Z
                    </td>
                    <td data-label="Status">
                      <span className={`dx-chip ${a.connected ? "dx-chip-up" : "dx-chip-muted"}`}>{a.connected ? "valid" : "expired"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={Boolean(confirmRevoke)}
        onClose={() => setConfirmRevoke(null)}
        size="sm"
        title="Revoke this connection?"
        subtitle={confirmRevoke ? `${confirmRevoke.loginId} · ${confirmRevoke.label}` : ""}
        footer={
          <div className="d-flex justify-content-between gap-2 w-100">
            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setConfirmRevoke(null)}>
              Keep connection
            </button>
            <button
              type="button"
              className="dx-btn dx-btn-sm dx-btn-danger"
              onClick={() => {
                if (!confirmRevoke) return;
                const id = confirmRevoke.loginId;
                setAccounts((list) => list.map((a) => (a.loginId === id ? { ...a, connected: false, scopes: ["read"] } : a)));
                onDisconnected(id);
                setConfirmRevoke(null);
              }}
            >
              <Unplug size={13} /> Revoke token
            </button>
          </div>
        }
      >
        <div className="d-grid gap-3">
          <Alert tone="danger" title="This stops trading on that account">
            Every bot and copy relay running on {confirmRevoke?.loginId} pauses immediately. Open contracts settle normally — nothing
            is force-closed.
          </Alert>
          <ul className="dx-help mb-0 ps-3 d-grid gap-1">
            <li>The encrypted token is deleted from storage.</li>
            <li>Deriv's app manager entry can also be revoked from your Deriv dashboard.</li>
            <li>Reconnect any time with a fresh OAuth handshake.</li>
          </ul>
        </div>
      </Dialog>
    </>
  );
}
