// =============================================================================
// SignupPage.tsx — A-1 orchestrator (/auth/signup). Mounts inside AuthShell
// (the A-group shell, built out on this page). The right panel is a 4-step
// wizard: Account → Verify email → Strategy & risk → Ready, matching the
// blueprint state machine (step: "form" | "verify-email-sent" → done).
// The blueprint's POST /api/auth/register is simulated in-page (front-end
// only, mock data) — no request ever leaves the browser.
// Overlay inventory (18): GoogleAccount, CountryDrawer, PresetDetailDrawer,
// PasswordPolicy, RiskExplainer, VerifyHelp, VerifyInboxDrawer, Security,
// DiscardConfirm + reused OAuth, SignIn, Legal, Faq, Pricing, Backtest,
// DemoConsole, InstrumentDrawer, StatusDrawer, AccountSwitcher, Community,
// Contact, TestimonialDrawer, DeployBotWizard, Presets.
// Toast budget: 3 triggers (OAuth connected, account ready, contract bought).
// =============================================================================
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, Eye, EyeOff, KeyRound, Mail, Rocket, ShieldCheck } from "lucide-react";
import { AuthShell } from "./AuthShell";
import {
  CountryDrawer,
  DiscardConfirmDialog,
  GoogleAccountDialog,
  PasswordPolicyDialog,
  PresetDetailDrawer,
  RiskExplainerDialog,
  SecurityDialog,
  VerifyHelpDialog,
  VerifyInboxDrawer,
  passwordScore,
} from "./SignupDialogs";
import {
  Alert,
  Chip,
  Field,
  FilterChips,
  Meter,
  PriceFlash,
  SearchInput,
  Sparkline,
  Stepper,
  Toggle,
  useToast,
} from "../ui/primitives";
import { DataTable, useDataTable, type Column } from "../ui/data-table";
import { AccountSwitcherDialog, OAuthWizard, SignInDialog } from "../marketing/modals/AccountModals";
import { DemoConsoleDialog } from "../marketing/modals/DemoModals";
import {
  ApiDocsDialog,
  CommunityDialog,
  ContactDialog,
  FaqDialog,
  LegalDialog,
  TestimonialDrawer,
} from "../marketing/modals/ContentDialogs";
import { BacktestDialog, DeployBotWizard, PresetsDialog, PricingDialog } from "../marketing/modals/CommerceDialogs";
import { CopySetupWizard, InstrumentDrawer, LeaderboardDialog, StatusDrawer, TraderDrawer } from "../marketing/modals/SocialModals";
import {
  DERIV_ACCOUNTS,
  INBOX_MESSAGES,
  LEGAL_DOCS,
  SIGNUP_COUNTRIES,
  STATS,
  STRATEGY_PRESETS,
  TESTIMONIALS,
  TRADERS,
  type StrategyPreset,
  type Trader,
} from "../../data/trading";
import { SYMBOL_MAP, fmtPrice, pct, usd } from "../../data/market";
import { useTicks } from "../../lib/live";
import type { DemoTab, QueuedBot } from "../marketing/types";

const EXPECTED_CODE = INBOX_MESSAGES.find((m) => m.code)?.code ?? "482913";
const WIZARD_STEPS = [
  { id: "account", label: "Account" },
  { id: "verify", label: "Verify email" },
  { id: "strategy", label: "Strategy & risk" },
  { id: "ready", label: "Ready" },
];

export function SignupPage() {
  const toast = useToast();
  const navigate = useNavigate();

  // ---- wizard state ---------------------------------------------------------
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", country: "NG", terms: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [accountType, setAccountType] = useState<"virtual" | "real">("virtual");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verifiedVia, setVerifiedVia] = useState<"email" | "google" | "deriv" | null>(null);
  const [loginId, setLoginId] = useState("");
  const [presetId, setPresetId] = useState(STRATEGY_PRESETS[0].id);
  const [maxStake, setMaxStake] = useState(50);
  const [dailyStop, setDailyStop] = useState(150);
  const [maxOpen, setMaxOpen] = useState(3);
  const [autoPause, setAutoPause] = useState(true);
  const [notify, setNotify] = useState(true);

  // ---- OTP state --------------------------------------------------------------
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [resentNote, setResentNote] = useState("");
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [resendIn]);

  // ---- overlays ---------------------------------------------------------------
  const [googleOpen, setGoogleOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [presetDetail, setPresetDetail] = useState<StrategyPreset | null>(null);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [riskOpen, setRiskOpen] = useState(false);
  const [verifyHelpOpen, setVerifyHelpOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [oauthOpen, setOauthOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [legalDocId, setLegalDocId] = useState<string | null>(null);
  const [faqOpen, setFaqOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [backtestOpen, setBacktestOpen] = useState(false);
  const [backtestPreset, setBacktestPreset] = useState<string | undefined>(undefined);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [deployPreset, setDeployPreset] = useState<StrategyPreset | null>(null);
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoTab, setDemoTab] = useState<DemoTab>("trade");
  const [instrumentCode, setInstrumentCode] = useState<string | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [communityOpen, setCommunityOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [testimonialId, setTestimonialId] = useState<string | null>(null);
  const [docsOpen, setDocsOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [trader, setTrader] = useState<Trader | null>(null);
  const [copyTrader, setCopyTrader] = useState<Trader | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ---- page-visible state -------------------------------------------------------
  const [linkedDeriv, setLinkedDeriv] = useState<string | null>(null);
  const [signedInAs, setSignedInAs] = useState<string | null>(null);
  const [lastOrder, setLastOrder] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [queuedBots, setQueuedBots] = useState<QueuedBot[]>([]);
  const [activeLoginId, setActiveLoginId] = useState(DERIV_ACCOUNTS[1].loginId);
  const [connections, setConnections] = useState<string[]>(DERIV_ACCOUNTS.filter((a) => a.connected).map((a) => a.loginId));

  const country = SIGNUP_COUNTRIES.find((cn) => cn.code === form.country) ?? SIGNUP_COUNTRIES[0];
  const preset = STRATEGY_PRESETS.find((p) => p.id === presetId) ?? STRATEGY_PRESETS[0];
  const legalDoc = useMemo(() => LEGAL_DOCS.find((d) => d.id === legalDocId) ?? null, [legalDocId]);
  const { score, checks } = passwordScore(form.password);
  const dirty = form.name !== "" || form.email !== "" || form.password !== "";

  const tickerCodes = useMemo(() => ["R_10", "frxEURUSD", "cryBTCUSD"], []);
  const quotes = useTicks(tickerCodes, 1800);

  const openDemo = (tab: DemoTab) => { setDemoTab(tab); setDemoOpen(true); };

  // ---- step 1: blueprint schema (signupSchema) ----------------------------------
  const validateAccount = (): boolean => {
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2 || form.name.trim().length > 100) next.name = "Full name must be 2–100 characters.";
    if (!/^[^\\s@]+@[^\\s@]+\\.[a-z]{2,}$/i.test(form.email)) next.email = "Enter a valid email — the verification code goes here.";
    const pw = passwordScore(form.password);
    if (form.password.length < 8) next.password = "At least 8 characters.";
    else if (!pw.checks.find((ch) => ch.id === "upper")?.ok) next.password = "Add an uppercase letter.";
    else if (!pw.checks.find((ch) => ch.id === "digit")?.ok) next.password = "Add a digit.";
    else if (!pw.checks.find((ch) => ch.id === "special")?.ok) next.password = "Add a symbol (e.g. ! ? # -).";
    if (form.confirm !== form.password || form.confirm === "") next.confirm = "Confirm password must match the password above.";
    if (!form.terms) next.terms = "Accept the Terms of Service and Risk Disclosure to continue.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const createAccount = () => {
    if (submitting || !validateAccount()) return;
    setSubmitting(true);
    // Simulated POST /api/auth/register — front-end only, resolves in-page.
    window.setTimeout(() => {
      setSubmitting(false);
      setStep(1);
      setResendIn(30);
      setResentNote(`Code sent to ${form.email}. It expires in 15 minutes.`);
    }, 900);
  };

  const verifyCode = (candidate?: string) => {
    const value = candidate ?? code.join("");
    if (value.length < 6) { setOtpError("Enter all 6 digits from the email."); return; }
    if (value !== EXPECTED_CODE) { setOtpError("That code does not match the one we sent. Codes are single-use — request a fresh one if it expired."); return; }
    setOtpError("");
    setVerifiedVia("email");
    setStep(2);
  };

  const resendCode = () => {
    if (resendIn > 0) return;
    setResendIn(30);
    setCode(["", "", "", "", "", ""]);
    setOtpError("");
    setResentNote(`New code sent to ${form.email}. Previous codes no longer work.`);
  };

  const finishSignup = () => {
    const id = accountType === "real" ? "CR9120448" : "VRTC1024887";
    setLoginId(id);
    setStep(3);
  };

  const resetDraft = () => {
    setForm({ name: "", email: "", password: "", confirm: "", country: "NG", terms: false });
    setErrors({});
    setCode(["", "", "", "", "", ""]);
    setOtpError("");
    setVerifiedVia(null);
    setLoginId("");
    setStep(0);
    setDiscardOpen(false);
  };

  // ---- preset table (step 3) -------------------------------------------------------
  const presetTable = useDataTable<StrategyPreset>({
    rows: STRATEGY_PRESETS,
    searchKeys: (p) => [p.name, p.symbol, p.kind, p.difficulty],
    sorters: { name: (p) => p.name, stake: (p) => p.stake, winRate: (p) => p.winRate },
    filterKey: (p) => p.difficulty,
    filterOptions: [
      { id: "beginner", label: "Beginner" }, { id: "intermediate", label: "Intermediate" }, { id: "advanced", label: "Advanced" },
    ],
    initialPageSize: 5,
    initialSort: "winRate",
  });

  const presetColumns: Column<StrategyPreset>[] = [
    {
      key: "name", header: "Preset",
      cell: (p) => (
        <span>
          <span className="d-block fw-semibold">{p.name}</span>
          <span className="dx-help d-block">{p.kind} · {p.symbol}</span>
        </span>
      ),
    },
    { key: "stake", header: "Stake", align: "end", cell: (p) => <span className="font-display">{usd(p.stake)}</span> },
    { key: "winRate", header: "Win (backtest)", align: "end", cell: (p) => <span className="font-display">{pct(p.winRate, 1)}</span> },
    { header: "Risk", cell: (p) => <span className={`dx-chip dx-risk-${p.risk === "medium" ? "med" : p.risk}`}>{p.risk}</span> },
    {
      header: "Actions",
      cell: (p) => (
        <span className="d-flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setPresetDetail(p)}>Detail</button>
          <button
            type="button"
            className={`dx-btn dx-btn-sm ${p.id === presetId ? "dx-btn-primary" : ""}`}
            onClick={() => setPresetId(p.id)}
          >
            {p.id === presetId ? "Selected" : "Select"}
          </button>
        </span>
      ),
    },
  ];

  const testimonial = TESTIMONIALS[0];

  return (
    <div className="page-auth-signup">
      <AuthShell
        title="Create your account"
        subtitle="Join 18,420 automated traders on Deriv. Email and password first — the Deriv connection happens after, over OAuth2, and we never see your Deriv password."
        side="signup"
        journeyStep={step}
        extras={
          <div className="d-grid gap-3">
            <div className="dx-card dx-card-pad">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="dx-kpi-label mb-0">Markets never close</span>
                <span className="dx-pulse" aria-label="live" />
              </div>
              <div className="dx-list">
                {tickerCodes.map((codeKey) => {
                  const s = SYMBOL_MAP[codeKey];
                  const q = quotes[codeKey];
                  if (!s || !q) return null;
                  return (
                    <button key={codeKey} type="button" className="dx-list-row w-100 text-start" onClick={() => setInstrumentCode(codeKey)}>
                      <span className="flex-grow-1 min-w-0">
                        <span className="d-block fw-semibold font-display" style={{ fontSize: "0.82rem" }}>{s.code}</span>
                        <span className="dx-help d-block text-truncate">{s.name} · payout {s.payoutPct}%</span>
                      </span>
                      <PriceFlash value={fmtPrice(q.quote, s.pipSize)} dir={q.dir} />
                    </button>
                  );
                })}
              </div>
              <div className="d-flex flex-wrap gap-2 mt-3">
                <span className="dx-chip dx-chip-up font-display">{STATS.botsLive.toLocaleString("en-US")} bots live</span>
                <span className="dx-chip dx-chip-muted font-display">{STATS.assets} symbols · {STATS.contractTypes} contract types</span>
              </div>
            </div>

            <button type="button" className="dx-card dx-card-pad dx-card-interactive w-100 text-start" onClick={() => setTestimonialId(testimonial.id)}>
              <span className="dx-quote d-block" style={{ fontSize: "0.88rem" }}>“{testimonial.quote}”</span>
              <span className="dx-help d-block mt-2">
                {testimonial.flag} {testimonial.name} · {testimonial.role} · win rate {testimonial.winRate}% — read the full story
              </span>
            </button>

            <div className="d-flex flex-wrap gap-2">
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setPricingOpen(true)}>Compare plans</button>
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setSecurityOpen(true)}>
                <ShieldCheck size={13} /> Security centre
              </button>
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setFaqOpen(true)}>Help &amp; FAQ</button>
              <Link to="/features" className="dx-btn dx-btn-sm dx-btn-ghost">Explore features</Link>
            </div>
          </div>
        }
        footer={
          <div className="d-flex flex-wrap align-items-center gap-2">
            <span className="dx-help me-1">Legal &amp; help:</span>
            {LEGAL_DOCS.map((d) => (
              <button key={d.id} type="button" className="dx-btn-link" onClick={() => setLegalDocId(d.id)}>{d.title}</button>
            ))}
            <span className="dx-help">·</span>
            <button type="button" className="dx-btn-link" onClick={() => setStatusOpen(true)}>API status</button>
            <button type="button" className="dx-btn-link" onClick={() => setCommunityOpen(true)}>Community</button>
            <button type="button" className="dx-btn-link" onClick={() => setContactOpen(true)}>Contact</button>
            {signedInAs ? <span className="dx-chip dx-chip-info ms-auto">signed in {signedInAs.split("@")[0]}</span> : null}
            {lastOrder ? <span className="dx-chip dx-chip-up font-display ms-auto">last order {lastOrder}</span> : null}
          </div>
        }
      >
        {/* ---------------- wizard header ---------------- */}
        <div className="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-3">
          <div>
            <h2 className="dx-h-card">{step === 3 ? "You are ready to trade" : step === 1 ? "Verify your email" : "Create your account"}</h2>
            <p className="dx-help mb-0 mt-1">
              {step === 0 && "Step 1 of 4 — platform account. No Deriv funds are touched."}
              {step === 1 && `Step 2 of 4 — we sent a 6-digit code to ${form.email || "your email"}.`}
              {step === 2 && "Step 3 of 4 — pick a starter strategy and set the risk ceiling."}
              {step === 3 && "Step 4 of 4 — account created. Link Deriv or explore the console."}
            </p>
          </div>
          {step < 3 && dirty ? (
            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setDiscardOpen(true)}>Discard draft</button>
          ) : null}
        </div>
        <Stepper steps={WIZARD_STEPS} active={step} className="mb-4" />

        {/* ---------------- STEP 1 · account form (blueprint) ---------------- */}
        {step === 0 ? (
          <form
            noValidate
            onSubmit={(e) => { e.preventDefault(); createAccount(); }}
            className="d-grid gap-3"
          >
            <div className="row g-3">
              <div className="col-12 col-sm-6">
                <Field label="Full Name" required error={errors.name}>
                  <input className={`dx-input ${errors.name ? "is-invalid" : ""}`} value={form.name} placeholder="Ade Fashola"
                    onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
                </Field>
              </div>
              <div className="col-12 col-sm-6">
                <Field label="Email" required error={errors.email}>
                  <input className={`dx-input ${errors.email ? "is-invalid" : ""}`} type="email" value={form.email} placeholder="trader@example.com"
                    onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
                </Field>
              </div>
              <div className="col-12 col-sm-6">
                <Field label="Password" required error={errors.password} help="8+ characters with uppercase, digit and symbol.">
                  <div className="dx-input-group">
                    <input className={`dx-input ${errors.password ? "is-invalid" : ""}`} type={showPw ? "text" : "password"} value={form.password}
                      placeholder="••••••••" onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
                    <button type="button" className="dx-btn dx-btn-ghost" style={{ borderRadius: "0 8px 8px 0" }}
                      onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "Hide password" : "Show password"}>
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </Field>
                {form.password ? (
                  <div className="mt-2">
                    <Meter label="Password strength" value={(score / checks.length) * 100} display={`${score}/${checks.length} rules`} />
                    <button type="button" className="dx-btn-link mt-1" onClick={() => setPolicyOpen(true)}>Password rules, checked live</button>
                  </div>
                ) : null}
              </div>
              <div className="col-12 col-sm-6">
                <Field label="Confirm Password" required error={errors.confirm}>
                  <div className="dx-input-group">
                    <input className={`dx-input ${errors.confirm ? "is-invalid" : ""}`} type={showConfirm ? "text" : "password"} value={form.confirm}
                      placeholder="••••••••" onChange={(e) => setForm({ ...form, confirm: e.target.value })} autoComplete="new-password" />
                    <button type="button" className="dx-btn dx-btn-ghost" style={{ borderRadius: "0 8px 8px 0" }}
                      onClick={() => setShowConfirm((v) => !v)} aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}>
                      {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </Field>
              </div>
              <div className="col-12 col-sm-6">
                <Field label="Country of residence" required help={`${country.regulator} · ${country.taxForm}`}>
                  <div className="dx-input-group">
                    <span className="dx-input d-flex align-items-center font-display">{country.flag} {country.name}</span>
                    <button type="button" className="dx-btn" style={{ borderRadius: "0 8px 8px 0" }} onClick={() => setCountryOpen(true)}>
                      Change
                    </button>
                  </div>
                </Field>
              </div>
              <div className="col-12 col-sm-6">
                <Field label="Account type" required help={country.derivAvailable ? "Virtual trades identical contracts with simulated funds." : "Real accounts are not offered for this residency yet — start virtual."}>
                  <div className="d-flex flex-wrap gap-2">
                    {(["virtual", "real"] as const).map((t) => (
                      <button key={t} type="button" className={`dx-filter-chip ${accountType === t ? "is-active" : ""}`} onClick={() => setAccountType(t)}>
                        {t === "virtual" ? "Virtual (VRTC)" : "Real (CR)"}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
            </div>

            <div>
              <label className="dx-check">
                <input type="checkbox" checked={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.checked })} />
                <span>
                  I agree to the{" "}
                  <button type="button" className="dx-btn-link" onClick={(e) => { e.preventDefault(); setLegalDocId("terms"); }}>Terms of Service</button>{" "}
                  and the{" "}
                  <button type="button" className="dx-btn-link" onClick={(e) => { e.preventDefault(); setLegalDocId("risk"); }}>Risk Disclosure</button>,
                  and I understand automated Deriv contracts can lose money quickly without caps.
                </span>
              </label>
              {errors.terms ? <span className="dx-error d-block mt-1">{errors.terms}</span> : null}
            </div>

            <button type="submit" className="dx-btn dx-btn-lg dx-btn-primary w-100" disabled={submitting}>
              {submitting ? <><span className="dx-spin"><Rocket size={15} /></span> Creating account…</> : <>Create Account <ArrowRight size={15} /></>}
            </button>

            <div className="d-flex align-items-center gap-3" aria-hidden="true">
              <span className="dx-hr flex-grow-1" /><span className="dx-help">or continue with</span><span className="dx-hr flex-grow-1" />
            </div>
            <div className="row g-2">
              <div className="col-6">
                <button type="button" className="dx-btn w-100" onClick={() => setGoogleOpen(true)}>
                  <Mail size={14} /> Google
                </button>
              </div>
              <div className="col-6">
                <button type="button" className="dx-btn w-100" onClick={() => setOauthOpen(true)}>
                  <KeyRound size={14} /> Deriv
                </button>
              </div>
            </div>

            <p className="dx-help text-center mb-0">
              Already have an account?{" "}
              <button type="button" className="dx-btn-link" onClick={() => setSignInOpen(true)}>Sign In →</button>
            </p>
          </form>
        ) : null}

        {/* ---------------- STEP 2 · verify email ---------------- */}
        {step === 1 ? (
          <div className="d-grid gap-3">
            <Alert tone="info" title="Verification email sent (simulated)">
              {resentNote || `Code sent to ${form.email}.`} Front-end build — read it in the demo inbox instead of a real mailbox.
            </Alert>
            <div className="d-flex justify-content-center gap-2" role="group" aria-label="6-digit verification code">
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { codeRefs.current[i] = el; }}
                  className={`dx-input dx-input-num text-center font-display ${otpError ? "is-invalid" : ""}`}
                  style={{ width: 48, height: 56, fontSize: "1.2rem" }}
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  aria-label={`Digit ${i + 1}`}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(-1);
                    const next = [...code];
                    next[i] = v;
                    setCode(next);
                    if (v && i < 5) codeRefs.current[i + 1]?.focus();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !code[i] && i > 0) codeRefs.current[i - 1]?.focus();
                  }}
                />
              ))}
            </div>
            {otpError ? <span className="dx-error text-center">{otpError}</span> : null}
            <button type="button" className="dx-btn dx-btn-lg dx-btn-primary w-100" onClick={() => verifyCode()}>
              <Check size={15} /> Verify email
            </button>
            <div className="d-flex flex-wrap align-items-center justify-content-center gap-2">
              <button type="button" className="dx-btn dx-btn-sm" onClick={() => setInboxOpen(true)}>
                <Mail size={13} /> Open demo inbox
              </button>
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={resendCode} disabled={resendIn > 0}>
                {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
              </button>
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setVerifyHelpOpen(true)}>Didn't get it?</button>
              <button type="button" className="dx-btn-link" onClick={() => setStep(0)}>Change email</button>
            </div>
            <p className="dx-help text-center mb-0">
              Wrong account? <button type="button" className="dx-btn-link" onClick={() => setSignInOpen(true)}>Sign in instead</button>
            </p>
          </div>
        ) : null}

        {/* ---------------- STEP 3 · strategy & risk ---------------- */}
        {step === 2 ? (
          <div className="d-grid gap-3">
            <div className="d-flex flex-wrap gap-2">
              <Chip tone="up"><Check size={12} /> {verifiedVia === "google" ? "Google identity linked" : verifiedVia === "deriv" ? "Deriv identity linked" : "Email verified"}</Chip>
              {linkedDeriv ? <Chip tone="accent" pulse>Deriv {linkedDeriv} linked</Chip> : <Chip tone="muted">Deriv not linked yet</Chip>}
              <Chip tone="muted">{country.flag} {country.name} · {accountType === "real" ? "CR real" : "VRTC virtual"}</Chip>
            </div>

            <div className="d-flex flex-wrap align-items-center gap-3">
              <SearchInput value={presetTable.query} onChange={presetTable.setQuery} placeholder="Search starter presets…" className="flex-grow-1" />
              <FilterChips options={presetTable.filterOptions} value={presetTable.filter} onChange={presetTable.setFilter} />
            </div>
            <DataTable columns={presetColumns} state={presetTable} rowKey={(p) => p.id} onRowClick={(p) => setPresetDetail(p)} ariaLabel="Strategy presets" dense />

            <div className="dx-card-inset">
              <div className="d-flex flex-wrap justify-content-between gap-2">
                <span className="fw-semibold" style={{ fontSize: "0.86rem" }}>Selected: {preset.name}</span>
                <span className="dx-help font-display">{preset.symbol} · {usd(preset.stake)} · win {pct(preset.winRate, 1)}</span>
              </div>
              <Sparkline data={presetSpark(preset)} tone="accent" height={44} ariaLabel={`${preset.name} backtest trend`} className="mt-2" />
              <div className="d-flex flex-wrap gap-2 mt-2">
                <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setPresetDetail(preset)}>Preset detail</button>
                <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => { setBacktestPreset(preset.id); setBacktestOpen(true); }}>Backtest it</button>
                <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setRiskOpen(true)}>Why these caps?</button>
              </div>
            </div>

            <div className="row g-3">
              <div className="col-12 col-sm-4">
                <Field label="Max stake / leg (USD)" help="Engine rejects anything above this.">
                  <input className="dx-input dx-input-num" type="number" min={preset.stake} value={maxStake} onChange={(e) => setMaxStake(Math.max(preset.stake, Number(e.target.value)))} />
                </Field>
              </div>
              <div className="col-12 col-sm-4">
                <Field label="Daily stop-loss (USD)" help="Realised loss that pauses all bots.">
                  <input className="dx-input dx-input-num" type="number" min={20} value={dailyStop} onChange={(e) => setDailyStop(Math.max(20, Number(e.target.value)))} />
                </Field>
              </div>
              <div className="col-12 col-sm-4">
                <Field label="Max open contracts">
                  <select className="dx-select dx-input-num" value={maxOpen} onChange={(e) => setMaxOpen(Number(e.target.value))}>
                    {[1, 2, 3, 4, 6, 10].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </Field>
              </div>
            </div>
            <div className="d-grid gap-2">
              <Toggle checked={autoPause} onChange={setAutoPause} label="Auto-pause after 5 consecutive losses" hint="One notification, never an automatic restart." />
              <Toggle checked={notify} onChange={setNotify} label="Notify on cap, stop-loss and barrier events" />
            </div>

            <div className="d-flex flex-wrap gap-2">
              <button type="button" className="dx-btn dx-btn-ghost" onClick={() => setStep(verifiedVia === "email" ? 1 : 0)}>Back</button>
              {!linkedDeriv ? (
                <button type="button" className="dx-btn" onClick={() => setOauthOpen(true)}>
                  <KeyRound size={14} /> Link Deriv now
                </button>
              ) : null}
              <button type="button" className="dx-btn dx-btn-primary flex-grow-1" onClick={finishSignup}>
                Create {accountType === "real" ? "CR" : "VRTC"} account &amp; finish <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ) : null}

        {/* ---------------- STEP 4 · ready ---------------- */}
        {step === 3 ? (
          <div className="d-grid gap-3">
            <Alert tone="up" title={`Account ready${loginId ? ` — ${loginId}` : ""}`}>
              {form.name ? `${form.name}, your ` : "Your "}DerivX account is created on the {activePlan ?? "Starter (free)"} tier with the{" "}
              {preset.name} preset armed but not deployed. Nothing trades until you confirm a contract or deploy the bot.
            </Alert>
            <div className="row g-3">
              {[
                { k: "Login ID", v: loginId || "VRTC1024887" },
                { k: "Email", v: form.email || "trader@example.com" },
                { k: "Residency", v: `${country.flag} ${country.name}` },
                { k: "Starter preset", v: preset.name },
                { k: "Risk ceiling", v: `${usd(maxStake)} / leg · stop ${usd(dailyStop)}` },
                { k: "Deriv link", v: linkedDeriv ?? "not linked" },
              ].map((row) => (
                <div className="col-6" key={row.k}>
                  <div className="dx-card-inset">
                    <div className="dx-kpi-label">{row.k}</div>
                    <div className="font-display fw-semibold text-truncate" title={row.v}>{row.v}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="d-grid gap-2">
              <button type="button" className="dx-btn dx-btn-lg dx-btn-primary" onClick={() => {
                toast.push({ tone: "success", title: `Account ready — ${loginId || "VRTC1024887"}`, body: "Risk caps saved. Place your first contract in the console whenever you are ready." });
                openDemo("trade");
              }}>
                <Rocket size={15} /> Open the trading console
              </button>
              {!linkedDeriv ? (
                <button type="button" className="dx-btn" onClick={() => setOauthOpen(true)}>
                  <KeyRound size={14} /> Connect Deriv with OAuth2
                </button>
              ) : (
                <button type="button" className="dx-btn" onClick={() => setAccountsOpen(true)}>Manage Deriv connections</button>
              )}
              <div className="d-flex flex-wrap gap-2">
                <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost flex-grow-1" onClick={() => setDeployPreset(preset)}>Deploy {preset.name}</button>
                <Link to="/features" className="dx-btn dx-btn-sm dx-btn-ghost flex-grow-1">Explore features</Link>
                <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost flex-grow-1" onClick={resetDraft}>Create another account</button>
              </div>
            </div>
          </div>
        ) : null}
      </AuthShell>

      {/* ================= A-1 overlays ================= */}
      <GoogleAccountDialog
        open={googleOpen}
        onClose={() => setGoogleOpen(false)}
        onLinked={(name, email) => {
          setForm((f) => ({ ...f, name: f.name || name, email }));
          setVerifiedVia("google");
          setGoogleOpen(false);
          setStep(2);
        }}
      />
      <CountryDrawer open={countryOpen} onClose={() => setCountryOpen(false)} selectedCode={form.country}
        onSelect={(cn) => { setForm((f) => ({ ...f, country: cn.code })); if (!cn.derivAvailable) setAccountType("virtual"); }} />
      <PresetDetailDrawer preset={presetDetail} onClose={() => setPresetDetail(null)}
        onDeploy={(p) => { setPresetDetail(null); setPresetId(p.id); setDeployPreset(p); }}
        onBacktest={(p) => { setPresetDetail(null); setBacktestPreset(p.id); setBacktestOpen(true); }} />
      <PasswordPolicyDialog open={policyOpen} onClose={() => setPolicyOpen(false)} password={form.password} />
      <RiskExplainerDialog open={riskOpen} onClose={() => setRiskOpen(false)}
        onBacktest={() => { setRiskOpen(false); setBacktestPreset(preset.id); setBacktestOpen(true); }} />
      <VerifyHelpDialog open={verifyHelpOpen} onClose={() => setVerifyHelpOpen(false)}
        onResend={() => { setVerifyHelpOpen(false); resendCode(); }}
        onChangeEmail={() => { setVerifyHelpOpen(false); setStep(0); }}
        onOpenInbox={() => { setVerifyHelpOpen(false); setInboxOpen(true); }}
        onContact={() => { setVerifyHelpOpen(false); setContactOpen(true); }} />
      <VerifyInboxDrawer open={inboxOpen} onClose={() => setInboxOpen(false)}
        onUseCode={(value) => { setCode(value.split("")); setInboxOpen(false); verifyCode(value); }} />
      <SecurityDialog open={securityOpen} onClose={() => setSecurityOpen(false)} email={form.email} />
      <DiscardConfirmDialog open={discardOpen} onClose={() => setDiscardOpen(false)} onConfirm={resetDraft} />

      {/* ================= reused H-1 overlays ================= */}
      <OAuthWizard open={oauthOpen} onClose={() => setOauthOpen(false)}
        onConnected={(id) => {
          setLinkedDeriv(id);
          setConnections((list) => (list.includes(id) ? list : [...list, id]));
          setActiveLoginId(id);
          if (step === 0) { setVerifiedVia("deriv"); setStep(2); }
          toast.push({ tone: "success", title: `Deriv connection established — ${id}`, body: "Token stored encrypted, tick and portfolio subscriptions live on the eu-west relay." });
        }}
        onOpenStatus={() => { setOauthOpen(false); setStatusOpen(true); }}
        onOpenSignUp={() => setOauthOpen(false)}
        onOpenDemo={() => { setOauthOpen(false); openDemo("trade"); }} />
      <SignInDialog open={signInOpen} onClose={() => setSignInOpen(false)}
        onSignedIn={(email, id) => { setSignedInAs(email); setActiveLoginId(id); }}
        onOpenSignUp={() => setSignInOpen(false)}
        onOpenDashboardNotice={() => { setSignInOpen(false); openDemo("trade"); }} />
      <LegalDialog doc={legalDoc} onClose={() => setLegalDocId(null)}
        onContact={() => { setLegalDocId(null); setContactOpen(true); }} />
      <FaqDialog open={faqOpen} onClose={() => setFaqOpen(false)}
        onContact={() => { setFaqOpen(false); setContactOpen(true); }}
        onOpenDocs={() => { setFaqOpen(false); setDocsOpen(true); }}
        onOpenPricing={() => { setFaqOpen(false); setPricingOpen(true); }} />
      <ApiDocsDialog open={docsOpen} onClose={() => setDocsOpen(false)}
        onOpenStatus={() => { setDocsOpen(false); setStatusOpen(true); }}
        onOpenDemo={() => { setDocsOpen(false); openDemo("trade"); }} />
      <PricingDialog open={pricingOpen} onClose={() => setPricingOpen(false)}
        onOpenFaq={() => { setPricingOpen(false); setFaqOpen(true); }}
        onDeployed={(planName) => setActivePlan(planName)} />
      <PresetsDialog open={presetsOpen} onClose={() => setPresetsOpen(false)}
        onDeploy={(p) => { setPresetsOpen(false); setDeployPreset(p); }}
        onBacktest={(id) => { setPresetsOpen(false); setBacktestPreset(id); setBacktestOpen(true); }}
        onOpenFeature={() => { setPresetsOpen(false); void navigate({ to: "/features" }); }} />
      <BacktestDialog open={backtestOpen} onClose={() => setBacktestOpen(false)} initialPresetId={backtestPreset}
        onDeploy={(p) => { setBacktestOpen(false); setDeployPreset(p); }} />
      <DeployBotWizard open={Boolean(deployPreset)} onClose={() => setDeployPreset(null)} preset={deployPreset}
        onDeployed={(name, stake, cap) => {
          const p = deployPreset;
          setLastOrder(`${name} @ ${usd(stake)} (cap ${usd(cap)})`);
          if (p) setQueuedBots((list) => [...list, { id: `bot_auth_${list.length + 1}`, name, symbol: p.symbol, stake, cap, strategy: p.kind, contractType: p.contractType, duration: p.duration, durationUnit: p.durationUnit, risk: p.risk, winRate: p.winRate }]);
          setDeployPreset(null);
          openDemo("bots");
        }} />
      <DemoConsoleDialog open={demoOpen} onClose={() => setDemoOpen(false)} initialTab={demoTab} queuedBots={queuedBots}
        onContractBought={(receipt) => {
          setLastOrder(`#${receipt.contractId} ${receipt.symbol} ${usd(receipt.stake)}`);
          toast.push({ tone: "success", title: `Contract ${receipt.contractId} bought`, body: `${receipt.symbol} · stake ${usd(receipt.stake)} → payout ${usd(receipt.payout)}. Track it in the portfolio tab.` });
        }}
        onOpenPresets={() => setPresetsOpen(true)}
        onOpenBacktests={(id) => { setBacktestPreset(id); setBacktestOpen(true); }}
        onOpenLeaderboard={() => setLeaderboardOpen(true)}
        onOpenStatus={() => setStatusOpen(true)}
        onOpenCommunity={() => setCommunityOpen(true)} />
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
      <InstrumentDrawer code={instrumentCode} onClose={() => setInstrumentCode(null)}
        onTrade={() => { setInstrumentCode(null); openDemo("trade"); }}
        onBacktest={() => { setInstrumentCode(null); setBacktestOpen(true); }}
        onOpenMarkets={() => { setInstrumentCode(null); void navigate({ to: "/features" }); }} />
      <StatusDrawer open={statusOpen} onClose={() => setStatusOpen(false)}
        onOpenDocs={() => { setStatusOpen(false); setDocsOpen(true); }}
        onOpenConnections={() => { setStatusOpen(false); setAccountsOpen(true); }} />
      <AccountSwitcherDialog open={accountsOpen} onClose={() => setAccountsOpen(false)} activeLoginId={activeLoginId}
        onSetActive={(id) => setActiveLoginId(id)}
        onOpenOAuth={() => { setAccountsOpen(false); setOauthOpen(true); }}
        onDisconnected={(id) => {
          setConnections((list) => list.filter((x) => x !== id));
          if (linkedDeriv === id) setLinkedDeriv(null);
        }}
        onOpenStatus={() => { setAccountsOpen(false); setStatusOpen(true); }} />
      <CommunityDialog open={communityOpen} onClose={() => setCommunityOpen(false)}
        onContact={() => { setCommunityOpen(false); setContactOpen(true); }}
        onLeaderboard={() => { setCommunityOpen(false); openDemo("social"); }} />
      <ContactDialog open={contactOpen} onClose={() => setContactOpen(false)}
        onOpenCommunity={() => { setContactOpen(false); setCommunityOpen(true); }} />
      <TestimonialDrawer testimonialId={testimonialId} onClose={() => setTestimonialId(null)}
        onOpenTrader={(id) => { setTestimonialId(null); setTrader(TRADERS.find((t) => t.id === id) ?? TRADERS[0]); }}
        onOpenCommunity={() => { setTestimonialId(null); setCommunityOpen(true); }}
        onOpenPricing={() => { setTestimonialId(null); setPricingOpen(true); }} />
    </div>
  );
}

function presetSpark(p: StrategyPreset): number[] {
  // Deterministic mini backtest curve per preset (front-end mock).
  let s = Math.round(p.winRate * 100) + p.stake * 10;
  let v = 100;
  const out: number[] = [];
  for (let i = 0; i < 24; i++) {
    s = (s * 9301 + 49297) % 233280;
    v += (s / 233280 - 0.42) * 6 + p.avgPnl / 18;
    out.push(Math.round(v * 100) / 100);
  }
  return out;
}
