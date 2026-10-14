// =============================================================================
// AuthDialogs.tsx — shared A-group overlays (A-2 … A-7): the 6-box OTP input,
// trusted-session drawer, login-activity audit, backup codes and the
// multistep authenticator setup wizard. Front-end only — every "API call"
// resolves in-page against the mock datasets in src/data/trading.ts.
// =============================================================================
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Check, Download, LogOut, Mail, MonitorSmartphone, RefreshCw, ShieldCheck, Smartphone } from "lucide-react";
import { AccountSwitcherDialog, OAuthWizard } from "../marketing/modals/AccountModals";
import { DemoConsoleDialog } from "../marketing/modals/DemoModals";
import { ApiDocsDialog, CommunityDialog, ContactDialog } from "../marketing/modals/ContentDialogs";
import { BacktestDialog, DeployBotWizard, PresetsDialog } from "../marketing/modals/CommerceDialogs";
import { CopySetupWizard, LeaderboardDialog, StatusDrawer, TraderDrawer } from "../marketing/modals/SocialModals";
import type { DemoTab, QueuedBot } from "../marketing/types";
import {
  Alert,
  Chip,
  CodeBlock,
  CopyButton,
  Dialog,
  Drawer,
  Field,
  SearchInput,
  Stepper,
  useToast,
} from "../ui/primitives";
import { DataTable, useDataTable, type Column } from "../ui/data-table";
import {
  AUTHENTICATOR_APPS,
  BACKUP_CODES,
  DEMO_TOTP_CODE,
  DEMO_TOTP_SECRET,
  DERIV_ACCOUNTS,
  INBOX_MESSAGES,
  LOGIN_ATTEMPTS,
  SIGNUP_SESSIONS,
  TRADERS,
  type BackupCode,
  type LoginAttempt,
  type SignupSession,
  type StrategyPreset,
  type Trader,
} from "../../data/trading";
import { timeAgo, usd } from "../../data/market";

/** "4m ago" / "3h ago" / "2d ago" for minute-offset datasets. */
export const agoMin = (n: number): string =>
  n < 60 ? `${n}m ago` : n < 1440 ? `${Math.round(n / 60)}h ago` : `${Math.round(n / 1440)}d ago`;

// -----------------------------------------------------------------------------
// Shared 6-digit code input (email OTP on A-1/A-6, TOTP on A-7)
// -----------------------------------------------------------------------------
export function OtpInputs({
  value,
  onChange,
  error,
  label = "6-digit code",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  error?: boolean;
  label?: string;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  return (
    <div className="d-flex justify-content-center gap-2" role="group" aria-label={label}>
      {value.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          className={`dx-input dx-input-num text-center font-display ${error ? "is-invalid" : ""}`}
          style={{ width: 48, height: 56, fontSize: "1.2rem" }}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(-1);
            const next = [...value];
            next[i] = v;
            onChange(next);
            if (v && i < 5) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !value[i] && i > 0) refs.current[i - 1]?.focus();
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
            if (!text) return;
            e.preventDefault();
            const next = ["", "", "", "", "", ""];
            text.split("").forEach((ch, idx) => { next[idx] = ch; });
            onChange(next);
            refs.current[Math.min(text.length, 5)]?.focus();
          }}
        />
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Trusted sessions drawer — audit table with revoke (destructive → confirm)
// -----------------------------------------------------------------------------
export function SessionsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [sessions, setSessions] = useState<SignupSession[]>(SIGNUP_SESSIONS);
  const [revokeTarget, setRevokeTarget] = useState<SignupSession | null>(null);
  const [signOutAllOpen, setSignOutAllOpen] = useState(false);

  const table = useDataTable<SignupSession>({
    rows: sessions,
    searchKeys: (s) => [s.device, s.location, s.ip],
    sorters: { device: (s) => s.device, last: (s) => s.lastActive },
    initialPageSize: 5,
    initialSort: "last",
  });

  const columns: Column<SignupSession>[] = [
    {
      key: "device", header: "Device",
      cell: (s) => (
        <span>
          <span className="d-block fw-semibold">{s.device}</span>
          <span className="dx-help d-block font-display">{s.ip}</span>
        </span>
      ),
    },
    { header: "Location", cell: (s) => <span className="dx-help">{s.location}</span> },
    { key: "last", header: "Last active", cell: (s) => <span className="dx-help">{timeAgo(s.lastActive)}</span> },
    {
      header: "Trust",
      cell: (s) => (s.current ? <Chip tone="up" pulse>Current</Chip> : s.trusted ? <Chip tone="info">Trusted</Chip> : <Chip tone="warn">Unverified</Chip>),
    },
    {
      header: "",
      cell: (s) => (s.current ? <span className="dx-help">This device</span> : (
        <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={(e) => { e.stopPropagation(); setRevokeTarget(s); }}>
          Revoke
        </button>
      )),
    },
  ];

  return (
    <>
      <Drawer open={open} onClose={onClose} title="Trusted sessions" subtitle="Every device signed in to this DerivX account. Revoking signs that device out everywhere." wide
        footer={
          <button type="button" className="dx-btn dx-btn-danger w-100" onClick={() => setSignOutAllOpen(true)}>
            <LogOut size={14} /> Sign out all other devices
          </button>
        }>
        <div className="d-grid gap-3">
          <SearchInput value={table.query} onChange={table.setQuery} placeholder="Search device, location or IP…" />
          <DataTable columns={columns} state={table} rowKey={(s) => s.id} ariaLabel="Trusted sessions" dense />
          <Alert tone="info" title="How sessions work">
            Access tokens live 15 minutes; refresh tokens last 7 days (30 with “Remember me”). A revoked device must complete sign-in + 2FA again.
          </Alert>
        </div>
      </Drawer>

      <Dialog open={Boolean(revokeTarget)} onClose={() => setRevokeTarget(null)} size="sm"
        title="Revoke this session?"
        footer={
          <>
            <button type="button" className="dx-btn" onClick={() => setRevokeTarget(null)}>Keep session</button>
            <button type="button" className="dx-btn dx-btn-danger" onClick={() => {
              setSessions((all) => all.filter((s) => s.id !== revokeTarget?.id));
              setRevokeTarget(null);
              toast.push({ tone: "success", title: "Session revoked", body: `${revokeTarget?.device} was signed out.` });
            }}>
              Revoke session
            </button>
          </>
        }>
        <p className="dx-text-dim mb-0">
          <strong>{revokeTarget?.device}</strong> ({revokeTarget?.location}) will be signed out immediately and its refresh token destroyed. Bots already running keep their saved risk caps.
        </p>
      </Dialog>

      <Dialog open={signOutAllOpen} onClose={() => setSignOutAllOpen(false)} size="sm"
        title="Sign out all other devices?"
        footer={
          <>
            <button type="button" className="dx-btn" onClick={() => setSignOutAllOpen(false)}>Cancel</button>
            <button type="button" className="dx-btn dx-btn-danger" onClick={() => {
              setSessions((all) => all.filter((s) => s.current));
              setSignOutAllOpen(false);
              toast.push({ tone: "success", title: "Other devices signed out", body: "Only this device keeps an active session." });
            }}>
              Sign out all others
            </button>
          </>
        }>
        <p className="dx-text-dim mb-0">Every session except this one is revoked. Anyone signed in elsewhere must pass password + 2FA to get back in.</p>
      </Dialog>
    </>
  );
}

// -----------------------------------------------------------------------------
// Login activity audit — filterable, paginated attempt log
// -----------------------------------------------------------------------------
const RESULT_TONE: Record<LoginAttempt["result"], string> = {
  success: "dx-chip-up",
  failed: "dx-chip-down",
  blocked: "dx-chip-down",
  "2fa-challenge": "dx-chip-warn",
};

export function LoginActivityDialog({ open, onClose, onOpenSessions }: { open: boolean; onClose: () => void; onOpenSessions?: () => void }) {
  const table = useDataTable<LoginAttempt>({
    rows: LOGIN_ATTEMPTS,
    searchKeys: (a) => [a.ip, a.location, a.device, a.method],
    sorters: { when: (a) => -a.epochMin, method: (a) => a.method },
    filterKey: (a) => a.result,
    filterOptions: [
      { id: "success", label: "Success" },
      { id: "failed", label: "Failed" },
      { id: "blocked", label: "Blocked" },
      { id: "2fa-challenge", label: "2FA challenge" },
    ],
    initialPageSize: 6,
  });

  const columns: Column<LoginAttempt>[] = [
    { key: "when", header: "When", cell: (a) => <span className="dx-help font-display">{agoMin(a.epochMin)}</span> },
    {
      header: "Device",
      cell: (a) => (
        <span>
          <span className="d-block fw-semibold">{a.device}</span>
          <span className="dx-help d-block font-display">{a.ip} · {a.location}</span>
        </span>
      ),
    },
    { key: "method", header: "Method", cell: (a) => <span className="dx-help">{a.method}</span> },
    { header: "Result", cell: (a) => <span className={`dx-chip ${RESULT_TONE[a.result]}`}>{a.result}</span> },
  ];

  return (
    <Dialog open={open} onClose={onClose} size="lg" title="Login activity"
      subtitle="Sign-in attempts against this account (mock audit log). Three failed passwords in a row trigger a 15-minute block."
      footer={onOpenSessions ? (
        <button type="button" className="dx-btn" onClick={onOpenSessions}>
          <MonitorSmartphone size={14} /> Manage trusted sessions
        </button>
      ) : undefined}>
      <div className="d-grid gap-3">
        <div className="d-flex flex-wrap align-items-center gap-3">
          <SearchInput value={table.query} onChange={table.setQuery} placeholder="Search IP, city, device…" className="flex-grow-1" />
        </div>
        <DataTable columns={columns} state={table} rowKey={(a) => a.id} ariaLabel="Login attempts" dense />
      </div>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// Backup codes — view, copy, download, regenerate (with confirm)
// -----------------------------------------------------------------------------
function freshCodes(seed: number): BackupCode[] {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 10 }, (_, i) => {
    let out = "";
    let n = seed + i * 7919;
    for (let k = 0; k < 12; k++) {
      n = (n * 9301 + 49297) % 233280;
      out += alphabet[n % alphabet.length];
      if (k === 3 || k === 7) out += "-";
    }
    return { code: out, used: false };
  });
}

export function BackupCodesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [codes, setCodes] = useState<BackupCode[]>(BACKUP_CODES);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [seed, setSeed] = useState(41);

  const download = () => {
    const text = `DerivX backup codes (demo)\nGenerated ${new Date().toISOString()}\n\n${codes.map((c, i) => `${i + 1}. ${c.code}${c.used ? " (used)" : ""}`).join("\n")}\n`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "derivx-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} size="md" title="Backup codes"
        subtitle="Each code signs you in once if you lose your authenticator. Used codes can never be replayed."
        footer={
          <>
            <button type="button" className="dx-btn" onClick={download}>
              <Download size={14} /> Download .txt
            </button>
            <button type="button" className="dx-btn dx-btn-ghost" onClick={() => setConfirmRegen(true)}>
              <RefreshCw size={14} /> Regenerate all
            </button>
          </>
        }>
        <div className="row row-cols-1 row-cols-sm-2 g-2">
          {codes.map((c) => (
            <div key={c.code} className="col">
              <div className="dx-card-inset d-flex align-items-center justify-content-between gap-2 py-2 px-3">
                <span className={`font-display ${c.used ? "text-decoration-line-through dx-text-dim" : ""}`} style={{ fontSize: "0.85rem" }}>{c.code}</span>
                {c.used ? <Chip tone="muted">used</Chip> : <CopyButton text={c.code} label="Copy" />}
              </div>
            </div>
          ))}
        </div>
        <Alert tone="warn" title="Store them offline">
          Anyone with a backup code can pass the second factor once. Keep them in a password manager or on paper — never in email.
        </Alert>
      </Dialog>

      <Dialog open={confirmRegen} onClose={() => setConfirmRegen(false)} size="sm"
        title="Regenerate backup codes?"
        footer={
          <>
            <button type="button" className="dx-btn" onClick={() => setConfirmRegen(false)}>Keep current codes</button>
            <button type="button" className="dx-btn dx-btn-danger" onClick={() => {
              const next = freshCodes(seed * 13 + 7);
              setSeed((s) => s + 1);
              setCodes(next);
              setConfirmRegen(false);
              toast.push({ tone: "success", title: "Backup codes regenerated", body: "The previous set no longer works." });
            }}>
              Regenerate
            </button>
          </>
        }>
        <p className="dx-text-dim mb-0">All 10 current codes stop working immediately — including any you have saved. The new set is shown here once.</p>
      </Dialog>
    </>
  );
}

// -----------------------------------------------------------------------------
// Authenticator setup wizard — app pick → secret/QR payload → first code →
// backup codes. Used by A-7 (and anywhere 2FA gets enabled front-end-only).
// -----------------------------------------------------------------------------
const SETUP_STEPS = [
  { id: "app", label: "Choose app" },
  { id: "scan", label: "Scan & verify" },
  { id: "codes", label: "Backup codes" },
];

export function TwoFactorSetupWizard({
  open,
  onClose,
  onEnabled,
}: {
  open: boolean;
  onClose: () => void;
  onEnabled: () => void;
}) {
  const [step, setStep] = useState(0);
  const [appId, setAppId] = useState(AUTHENTICATOR_APPS[0].id);
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [codeError, setCodeError] = useState("");
  const [saved, setSaved] = useState(false);
  const app = AUTHENTICATOR_APPS.find((a) => a.id === appId) ?? AUTHENTICATOR_APPS[0];
  const otpUri = useMemo(
    () => `otpauth://totp/DerivX:trader@derivx.app?secret=${DEMO_TOTP_SECRET}&issuer=DerivX&digits=6&period=30`,
    [],
  );

  const reset = () => { setStep(0); setCode(["", "", "", "", "", ""]); setCodeError(""); setSaved(false); };

  const verifyFirstCode = () => {
    if (code.join("") !== DEMO_TOTP_CODE) {
      setCodeError(`That code does not match ${app.name}'s current 6 digits. In this demo the authenticator shows ${DEMO_TOTP_CODE}.`);
      return;
    }
    setCodeError("");
    setStep(2);
  };

  return (
    <Dialog open={open} onClose={() => { onClose(); reset(); }} size="lg"
      title="Set up two-factor authentication"
      subtitle="TOTP codes from an authenticator app — the second factor A-7 challenges at sign-in."
      footer={
        step === 0 ? (
          <>
            <button type="button" className="dx-btn" onClick={() => { onClose(); reset(); }}>Cancel</button>
            <button type="button" className="dx-btn dx-btn-primary" onClick={() => setStep(1)}>Continue with {app.name}</button>
          </>
        ) : step === 1 ? (
          <>
            <button type="button" className="dx-btn" onClick={() => setStep(0)}>Back</button>
            <button type="button" className="dx-btn dx-btn-primary" onClick={verifyFirstCode}>Verify &amp; continue</button>
          </>
        ) : (
          <>
            <button type="button" className="dx-btn" onClick={() => setStep(1)}>Back</button>
            <button type="button" className="dx-btn dx-btn-primary" disabled={!saved} onClick={() => { onEnabled(); onClose(); reset(); }}>
              <ShieldCheck size={14} /> Enable 2FA
            </button>
          </>
        )
      }>
      <div className="d-grid gap-3">
        <Stepper steps={SETUP_STEPS} active={step} />
        {step === 0 ? (
          <div className="d-grid gap-2" role="radiogroup" aria-label="Authenticator app">
            {AUTHENTICATOR_APPS.map((a) => (
              <button key={a.id} type="button" role="radio" aria-checked={a.id === appId}
                className={`dx-card-inset d-flex align-items-center gap-3 text-start w-100 ${a.id === appId ? "border-primary" : ""}`}
                onClick={() => setAppId(a.id)}>
                <Smartphone size={18} className="dx-accent flex-shrink-0" />
                <span className="flex-grow-1">
                  <span className="d-block fw-semibold">{a.name} {a.recommended ? <Chip tone="up">Recommended</Chip> : null}</span>
                  <span className="dx-help d-block">{a.platforms} · {a.note}</span>
                </span>
                {a.id === appId ? <Check size={16} className="dx-up" /> : null}
              </button>
            ))}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="d-grid gap-3">
            <Alert tone="info" title={`Add DerivX to ${app.name}`}>
              In the app choose “Scan QR code” — or paste the setup key below. This demo renders the otpauth payload as text instead of a QR image.
            </Alert>
            <Field label="Setup key (manual entry)">
              <div className="d-flex align-items-center gap-2">
                <span className="dx-input font-display flex-grow-1 d-flex align-items-center">{DEMO_TOTP_SECRET}</span>
                <CopyButton text={DEMO_TOTP_SECRET} label="Copy key" small={false} />
              </div>
            </Field>
            <CodeBlock code={otpUri} maxHeight={90} />
            <Field label={`Enter the 6-digit code from ${app.name}`} help={`Demo authenticator shows ${DEMO_TOTP_CODE} for the next 30 seconds.`}>
              <OtpInputs value={code} onChange={(next) => { setCode(next); setCodeError(""); }} error={Boolean(codeError)} label="First authenticator code" />
            </Field>
            {codeError ? <span className="dx-error text-center">{codeError}</span> : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="d-grid gap-3">
            <Alert tone="warn" title="Save your backup codes">
              If the phone is lost, a backup code is the only way back in. Each works once.
            </Alert>
            <div className="row row-cols-1 row-cols-sm-2 g-2">
              {BACKUP_CODES.slice(0, 6).map((c) => (
                <div key={c.code} className="col">
                  <div className="dx-card-inset d-flex align-items-center justify-content-between gap-2 py-2 px-3">
                    <span className="font-display" style={{ fontSize: "0.85rem" }}>{c.code}</span>
                    <CopyButton text={c.code} label="Copy" />
                  </div>
                </div>
              ))}
            </div>
            <span className="dx-help">+ 4 more codes in Security → Backup codes after setup.</span>
            <label className="d-flex align-items-start gap-2 dx-text-dim" style={{ fontSize: "0.86rem" }}>
              <input type="checkbox" className="form-check-input mt-1" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
              I saved these codes somewhere offline (password manager or paper).
            </label>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// Demo inbox drawer — the simulated mailbox every email flow (A-4/A-5/A-6)
// deep-links from. The highlighted message carries a real in-app Link.
// -----------------------------------------------------------------------------
export function AuthInboxDrawer({
  open,
  onClose,
  email,
  highlight,
  onAction,
}: {
  open: boolean;
  onClose: () => void;
  email: string;
  highlight: { from: string; subject: string; preview: string; actionLabel: string } | null;
  onAction?: () => void;
}) {
  return (
    <Drawer open={open} onClose={onClose} title="Demo inbox" wide
      subtitle={`Simulated mailbox for ${email || "your address"} — the front-end build never sends real email.`}>
      <div className="d-grid gap-2">
        {highlight ? (
          <div className="dx-card-inset" style={{ borderLeft: "3px solid var(--dx-accent)" }}>
            <div className="d-flex align-items-center justify-content-between gap-2">
              <span className="fw-semibold" style={{ fontSize: "0.86rem" }}>{highlight.from}</span>
              <Chip tone="accent">new</Chip>
            </div>
            <span className="d-block fw-semibold mt-1">{highlight.subject}</span>
            <span className="dx-help d-block">{highlight.preview}</span>
            <button type="button" className="dx-btn dx-btn-sm dx-btn-primary mt-2" onClick={onAction}>
              <Mail size={13} /> {highlight.actionLabel}
            </button>
          </div>
        ) : null}
        {INBOX_MESSAGES.map((m) => (
          <div key={m.id} className="dx-card-inset">
            <div className="d-flex align-items-center justify-content-between gap-2">
              <span className="fw-semibold" style={{ fontSize: "0.86rem" }}>{m.from}</span>
              <span className="dx-help">{timeAgo(m.epoch)}</span>
            </div>
            <span className="d-block fw-semibold mt-1">{m.subject}</span>
            <span className="dx-help d-block">{m.preview}</span>
            {m.code ? <span className="dx-chip dx-chip-muted font-display mt-2">code {m.code}</span> : null}
          </div>
        ))}
      </div>
    </Drawer>
  );
}

// -----------------------------------------------------------------------------
// AuthConsole — the demo-console overlay ecosystem (console + presets +
// backtest + deploy + leaderboard/trader/copy + status/docs/community),
// self-contained so every A-page can offer the full trading surface.
// -----------------------------------------------------------------------------
export function AuthConsole({
  open,
  initialTab,
  onClose,
  onContractBought,
}: {
  open: boolean;
  initialTab: DemoTab;
  onClose: () => void;
  onContractBought?: (receipt: { contractId: string; symbol: string; stake: number; payout: number }) => void;
}) {
  const toast = useToast();
  const navigate = useNavigate();
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [backtestOpen, setBacktestOpen] = useState(false);
  const [backtestPreset, setBacktestPreset] = useState<string | undefined>(undefined);
  const [deployPreset, setDeployPreset] = useState<StrategyPreset | null>(null);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [trader, setTrader] = useState<Trader | null>(null);
  const [copyTrader, setCopyTrader] = useState<Trader | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [communityOpen, setCommunityOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [oauthOpen, setOauthOpen] = useState(false);
  const [activeLoginId, setActiveLoginId] = useState(DERIV_ACCOUNTS[0].loginId);
  const [queuedBots, setQueuedBots] = useState<QueuedBot[]>([]);
  // DemoConsoleDialog reads initialTab only on mount — remount per tab request.
  const [consoleTab, setConsoleTab] = useState<DemoTab>(initialTab);
  const [consoleKey, setConsoleKey] = useState(0);
  useEffect(() => {
    if (open) {
      setConsoleTab(initialTab);
      setConsoleKey((k) => k + 1);
    }
  }, [open, initialTab]);
  const showConsole = (tab: DemoTab) => {
    setConsoleTab(tab);
    setConsoleKey((k) => k + 1);
  };

  return (
    <>
      <DemoConsoleDialog key={consoleKey} open={open} onClose={onClose}
        initialTab={consoleTab} queuedBots={queuedBots}
        onContractBought={(receipt) => {
          onContractBought?.(receipt);
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
          if (p) setQueuedBots((list) => [...list, { id: `bot_auth_${list.length + 1}`, name, symbol: p.symbol, stake, cap, strategy: p.kind, contractType: p.contractType, duration: p.duration, durationUnit: p.durationUnit, risk: p.risk, winRate: p.winRate }]);
          setDeployPreset(null);
          showConsole("bots");
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
        onOpenDemo={() => { setDocsOpen(false); showConsole("trade"); }} />
      <CommunityDialog open={communityOpen} onClose={() => setCommunityOpen(false)}
        onContact={() => { setCommunityOpen(false); setContactOpen(true); }}
        onLeaderboard={() => { setCommunityOpen(false); showConsole("social"); }} />
      <ContactDialog open={contactOpen} onClose={() => setContactOpen(false)}
        onOpenCommunity={() => { setContactOpen(false); setCommunityOpen(true); }} />
      <AccountSwitcherDialog open={accountsOpen} onClose={() => setAccountsOpen(false)} activeLoginId={activeLoginId}
        onSetActive={(id) => setActiveLoginId(id)}
        onOpenOAuth={() => { setAccountsOpen(false); setOauthOpen(true); }}
        onDisconnected={() => undefined}
        onOpenStatus={() => { setAccountsOpen(false); setStatusOpen(true); }} />
      <OAuthWizard open={oauthOpen} onClose={() => setOauthOpen(false)}
        onConnected={(id) => {
          setActiveLoginId(id);
          toast.push({ tone: "success", title: `Deriv connection established — ${id}`, body: "authorize handshake complete · balance snapshot stored." });
        }}
        onOpenStatus={() => { setOauthOpen(false); setStatusOpen(true); }}
        onOpenSignUp={() => { setOauthOpen(false); void navigate({ to: "/auth/signup" }); }}
        onOpenDemo={() => { setOauthOpen(false); showConsole("trade"); }} />
    </>
  );
}

// -----------------------------------------------------------------------------
// Shared destructive confirm for "unlink Deriv" style actions on auth pages
// -----------------------------------------------------------------------------
export function UnlinkDerivDialog({
  loginId,
  onClose,
  onUnlinked,
}: {
  loginId: string | null;
  onClose: () => void;
  onUnlinked: (loginId: string) => void;
}) {
  return (
    <Dialog open={Boolean(loginId)} onClose={onClose} size="sm"
      title={`Disconnect ${loginId ?? "Deriv"}?`}
      footer={
        <>
          <button type="button" className="dx-btn" onClick={onClose}>Keep connected</button>
          <button type="button" className="dx-btn dx-btn-danger" onClick={() => { if (loginId) onUnlinked(loginId); onClose(); }}>
            <AlertTriangle size={14} /> Disconnect
          </button>
        </>
      }>
      <p className="dx-text-dim mb-0">
        Bots on <span className="font-display">{loginId}</span> pause immediately and open positions stay with Deriv until expiry. You can reconnect over OAuth2 at any time — no Deriv password ever touches DerivX.
      </p>
    </Dialog>
  );
}
