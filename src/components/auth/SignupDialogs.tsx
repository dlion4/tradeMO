// =============================================================================
// SignupDialogs.tsx — A-1-only overlays: Google chooser, country drawer,
// preset detail drawer, password policy, risk explainer, verify help, demo
// inbox drawer, security centre and the discard-draft confirm. Reused H-1
// overlays (OAuth, sign-in, legal, pricing, demo console…) are wired by
// SignupPage.tsx — this file only adds what the marketing pack does not have.
// =============================================================================
import { useMemo, useState } from "react";
import { Check, KeyRound, Mail, Rocket } from "lucide-react";
import {
  Alert,
  Avatar,
  Chip,
  CopyButton,
  Dialog,
  Drawer,
  Field,
  Meter,
  SearchInput,
  Sparkline,
  Tabs,
  Toggle,
} from "../ui/primitives";
import { DataTable, useDataTable, type Column } from "../ui/data-table";
import {
  GOOGLE_ACCOUNTS,
  INBOX_MESSAGES,
  SIGNUP_COUNTRIES,
  SIGNUP_SESSIONS,
  equityCurve,
  type SignupCountry,
  type SignupSession,
  type StrategyPreset,
} from "../../data/trading";
import { CONTRACT_TYPE_MAP, fmtDur, pct, pnl, timeAgo, usd } from "../../data/market";

// -----------------------------------------------------------------------------
// 1 · Google account chooser (simulated social OAuth)
// -----------------------------------------------------------------------------
export function GoogleAccountDialog({
  open,
  onClose,
  onLinked,
}: {
  open: boolean;
  onClose: () => void;
  onLinked: (name: string, email: string) => void;
}) {
  const [custom, setCustom] = useState("");
  const [customError, setCustomError] = useState("");
  const [busyFor, setBusyFor] = useState<string | null>(null);

  if (!open) return null;

  const link = (id: string, name: string, email: string) => {
    if (busyFor) return;
    setBusyFor(id);
    window.setTimeout(() => {
      setBusyFor(null);
      onLinked(name, email);
    }, 1000);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="md"
      title="Continue with Google"
      subtitle="Simulated Google OAuth — pick an identity to link. No real Google account is touched."
      footer={<span className="dx-help">Google provides name + email only. Your Deriv link stays a separate OAuth step.</span>}
    >
      <div className="d-grid gap-2">
        {GOOGLE_ACCOUNTS.map((g) => (
          <button
            key={g.id}
            type="button"
            className="dx-list-row w-100 text-start"
            disabled={Boolean(busyFor)}
            onClick={() => link(g.id, g.name, g.email)}
          >
            <Avatar name={g.name} tone="teal" />
            <span className="flex-grow-1 min-w-0">
              <span className="d-block fw-semibold" style={{ fontSize: "0.88rem" }}>{g.name}</span>
              <span className="dx-help d-block text-truncate">{g.email} · last used {g.lastUsed}</span>
            </span>
            {busyFor === g.id ? <span className="dx-spin"><KeyRound size={14} /></span> : <Chip tone="muted">link</Chip>}
          </button>
        ))}
        <hr className="dx-hr my-1" />
        <Field label="Use a different email" error={customError} help="We simulate the Google consent screen for this address.">
          <div className="dx-input-group">
            <input
              className={`dx-input ${customError ? "is-invalid" : ""}`}
              type="email"
              placeholder="you@example.com"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
            <button
              type="button"
              className="dx-btn dx-btn-primary"
              style={{ borderRadius: "0 8px 8px 0" }}
              disabled={Boolean(busyFor)}
              onClick={() => {
                if (!/^[^\\s@]+@[^\\s@]+\\.[a-z]{2,}$/i.test(custom)) {
                  setCustomError("Enter a valid email to continue with Google.");
                  return;
                }
                setCustomError("");
                link("custom", custom.split("@")[0].replace(/\\b\\w/g, (ch) => ch.toUpperCase()), custom);
              }}
            >
              <Mail size={14} /> Continue
            </button>
          </div>
        </Field>
      </div>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// 2 · Country / residency drawer (searchable eligibility table)
// -----------------------------------------------------------------------------
export function CountryDrawer({
  open,
  onClose,
  selectedCode,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  selectedCode: string;
  onSelect: (country: SignupCountry) => void;
}) {
  const [query, setQuery] = useState("");
  const rows = SIGNUP_COUNTRIES.filter((cn) =>
    `${cn.name} ${cn.code} ${cn.regulator}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      wide
      title="Country of residence"
      subtitle="Determines your onboarding checklist, tax form and whether a real (CR) account can be offered."
      footer={<span className="dx-help">Residency is self-declared at signup and re-checked before a real account settles its first contract.</span>}
    >
      <div className="d-grid gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Search country or regulator…" />
        <div className="dx-table-wrap">
          <table className="dx-table dx-table-sm dx-table-stack">
            <thead>
              <tr>
                <th scope="col">Country</th>
                <th scope="col">Regulator / basis</th>
                <th scope="col" className="dx-td-num">Traders</th>
                <th scope="col">Accounts</th>
                <th scope="col">Choose</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((cn) => (
                <tr key={cn.code} style={cn.code === selectedCode ? { background: "var(--dx-accent-soft)" } : undefined}>
                  <td data-label="Country">
                    <span className="fw-semibold">{cn.flag} {cn.name}</span>
                    <span className="dx-help d-block">{cn.taxForm}</span>
                  </td>
                  <td data-label="Regulator">{cn.regulator}</td>
                  <td data-label="Traders" className="dx-td-num font-display">{cn.traders.toLocaleString("en-US")}</td>
                  <td data-label="Accounts">
                    {cn.derivAvailable ? <Chip tone="up">{cn.accountTypes.join(" + ")}</Chip> : <Chip tone="warn">virtual only</Chip>}
                  </td>
                  <td data-label="Choose">
                    <button
                      type="button"
                      className={`dx-btn dx-btn-sm ${cn.code === selectedCode ? "dx-btn-primary" : "dx-btn-ghost"}`}
                      onClick={() => { onSelect(cn); onClose(); }}
                    >
                      {cn.code === selectedCode ? "Selected" : "Select"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length ? (
          <Alert tone="warn" title="No match">No country matches “{query}”. Virtual accounts remain available in most jurisdictions — pick the closest residency or clear the search.</Alert>
        ) : null}
      </div>
    </Drawer>
  );
}

// -----------------------------------------------------------------------------
// 3 · Strategy preset detail drawer
// -----------------------------------------------------------------------------
export function PresetDetailDrawer({
  preset,
  onClose,
  onDeploy,
  onBacktest,
}: {
  preset: StrategyPreset | null;
  onClose: () => void;
  onDeploy: (preset: StrategyPreset) => void;
  onBacktest: (preset: StrategyPreset) => void;
}) {
  if (!preset) return null;
  return (
    <Drawer
      open={Boolean(preset)}
      onClose={onClose}
      wide
      title={preset.name}
      subtitle={`${preset.symbol} · ${CONTRACT_TYPE_MAP[preset.contractType].label} · ${preset.kind} · ${preset.difficulty}`}
      footer={
        <div className="d-flex flex-wrap gap-2 w-100">
          <button type="button" className="dx-btn dx-btn-primary flex-grow-1" onClick={() => onDeploy(preset)}>
            <Rocket size={14} /> Deploy this preset
          </button>
          <button type="button" className="dx-btn dx-btn-ghost" onClick={() => onBacktest(preset)}>Backtest first</button>
        </div>
      }
    >
      <div className="d-grid gap-3">
        <p className="dx-text-dim mb-0" style={{ fontSize: "0.88rem" }}>{preset.description}</p>
        <div className="row g-3">
          {[
            { k: "Base stake", v: usd(preset.stake) },
            { k: "Duration", v: fmtDur(preset.duration, preset.durationUnit) },
            { k: "Backtest win rate", v: pct(preset.winRate, 1) },
            { k: "Avg P&L / run", v: pnl(preset.avgPnl) },
          ].map((row) => (
            <div className="col-6" key={row.k}>
              <div className="dx-card-inset"><div className="dx-kpi-label">{row.k}</div><div className="font-display fw-semibold">{row.v}</div></div>
            </div>
          ))}
        </div>
        <Sparkline data={equityCurve(26, preset.winRate * 31, 500, preset.avgPnl / 2)} tone="accent" height={64} ariaLabel={`${preset.name} backtest equity`} />
        <div>
          <div className="dx-kpi-label mb-2">Strategy rules</div>
          <ul className="dx-help mb-0 ps-3 d-grid gap-1">
            {preset.rules.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </div>
        <Meter label="Backtest win rate" value={preset.winRate} display={pct(preset.winRate, 1)} />
        <Alert tone="info" title="Backtests are not a promise">
          The curve above replays recorded ticks with spread and slippage models. Live results vary — deploy on a virtual
          account first and watch the first twenty contracts.
        </Alert>
      </div>
    </Drawer>
  );
}

// -----------------------------------------------------------------------------
// 4 · Password policy dialog (live checklist against the typed password)
// -----------------------------------------------------------------------------
export function passwordScore(password: string): { score: number; checks: { id: string; label: string; ok: boolean }[] } {
  const checks = [
    { id: "len", label: "At least 8 characters (schema minimum)", ok: password.length >= 8 },
    { id: "upper", label: "One uppercase letter", ok: /[A-Z]/.test(password) },
    { id: "digit", label: "One digit", ok: /[0-9]/.test(password) },
    { id: "special", label: "One symbol (e.g. ! ? # -)", ok: /[^a-zA-Z0-9]/.test(password) },
    { id: "long", label: "12+ characters — passphrase territory", ok: password.length >= 12 },
  ];
  return { score: checks.filter((ch) => ch.ok).length, checks };
}

export function PasswordPolicyDialog({ open, onClose, password }: { open: boolean; onClose: () => void; password: string }) {
  const { score, checks } = passwordScore(password);
  if (!open) return null;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="md"
      title="Password policy"
      subtitle="The same rules the signup schema enforces — checked live against what you typed."
      footer={<span className="dx-help">Stored as a bcrypt hash (12 rounds) server-side; this front-end never transmits it anywhere.</span>}
    >
      <div className="d-grid gap-3">
        <Meter label="Strength" value={(score / checks.length) * 100} display={`${score} of ${checks.length} rules`} />
        {checks.map((ch) => (
          <div key={ch.id} className="dx-list-row">
            <span className={`dx-dot ${ch.ok ? "dx-dot-up" : "dx-dot-warn"}`} />
            <span className="flex-grow-1" style={{ fontSize: "0.86rem" }}>{ch.label}</span>
            <Chip tone={ch.ok ? "up" : "muted"}>{ch.ok ? "passed" : "missing"}</Chip>
          </div>
        ))}
        <Alert tone="info" title="Passphrase beats symbol soup">
          Four random words plus a digit clears every rule and is easier to type on mobile than a symbol-heavy string.
          A password manager record beats memory either way.
        </Alert>
      </div>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// 5 · Risk explainer dialog (the ten guardrails, with live meters)
// -----------------------------------------------------------------------------
const GUARDRAILS = [
  { name: "Hard stake cap per leg", detail: "Orders above the cap are rejected before the proposal request.", level: 100 },
  { name: "Daily stop-loss", detail: "Realised loss that pauses every bot on the account for the day.", level: 92 },
  { name: "Take-profit target", detail: "Optional auto-pause when the day or the basket target is reached.", level: 74 },
  { name: "Max concurrent contracts", detail: "Caps total open exposure across bots, scripts and copied legs.", level: 88 },
  { name: "Loss-streak brake", detail: "Auto-pause after a configurable run of consecutive losses.", level: 81 },
  { name: "Multiplier stop-out required", detail: "Multiplier bots cannot deploy without a stop-out at or below stake.", level: 100 },
  { name: "Idempotent retries", detail: "Reconnects reuse the same key — a contract is never bought twice.", level: 97 },
  { name: "Copy-trade loss cap", detail: "Mirrored legs halt at your cap, independent of the trader you follow.", level: 85 },
  { name: "Session blackouts", detail: "CPI/NFP windows can block new entries while exits stay open.", level: 69 },
  { name: "One-notification rule", detail: "A breach notifies once, then stays quiet until you act.", level: 90 },
];

export function RiskExplainerDialog({ open, onClose, onBacktest }: { open: boolean; onClose: () => void; onBacktest: () => void }) {
  if (!open) return null;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="The ten guardrails"
      subtitle="Every automated order passes these checks inside the engine — before Deriv is ever asked for a price."
      footer={
        <div className="d-flex flex-wrap gap-2 w-100 justify-content-between">
          <span className="dx-help">Bars show how strictly each guardrail is enforced (100 = absolute).</span>
          <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={onBacktest}>See them in a backtest</button>
        </div>
      }
    >
      <div className="d-grid gap-3">
        {GUARDRAILS.map((g) => (
          <div key={g.name} className="dx-card-inset">
            <div className="d-flex flex-wrap justify-content-between gap-2">
              <span className="fw-semibold" style={{ fontSize: "0.86rem" }}>{g.name}</span>
              <span className="dx-help">{g.detail}</span>
            </div>
            <Meter label="Enforcement" value={g.level} display={`${g.level}%`} />
          </div>
        ))}
      </div>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// 6 · Verification help dialog · 7 · Demo inbox drawer
// -----------------------------------------------------------------------------
export function VerifyHelpDialog({
  open,
  onClose,
  onResend,
  onChangeEmail,
  onOpenInbox,
  onContact,
}: {
  open: boolean;
  onClose: () => void;
  onResend: () => void;
  onChangeEmail: () => void;
  onOpenInbox: () => void;
  onContact: () => void;
}) {
  if (!open) return null;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="md"
      title="Didn't get the code?"
      subtitle="Work through these in order — most missing codes are one of the first two."
      footer={
        <div className="d-flex flex-wrap gap-2 w-100 justify-content-between">
          <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={onContact}>Contact support instead</button>
          <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={onOpenInbox}><Mail size={13} /> Open demo inbox</button>
        </div>
      }
    >
      <ol className="d-grid gap-3 ps-0 mb-0" style={{ listStyle: "none" }}>
        {[
          { t: "Check spam and promotions", d: "The sender is DerivX Verify. Codes expire after 15 minutes and each new code invalidates the last one." },
          { t: "Confirm the address", d: "One wrong character sends the code nowhere. Changing the email restarts verification with a fresh code." },
          { t: "Resend once, then wait", d: "Resends are rate-limited to protect the mailbox. Wait a full minute before judging a resend missing." },
        ].map((s, i) => (
          <li key={s.t} className="dx-card-inset d-flex gap-3">
            <span className="dx-step-dot">{i + 1}</span>
            <span>
              <span className="d-block fw-semibold" style={{ fontSize: "0.86rem" }}>{s.t}</span>
              <span className="dx-help">{s.d}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="d-flex flex-wrap gap-2 mt-3">
        <button type="button" className="dx-btn dx-btn-sm" onClick={onResend}>Resend code</button>
        <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={onChangeEmail}>Change email address</button>
      </div>
    </Dialog>
  );
}

export function VerifyInboxDrawer({
  open,
  onClose,
  onUseCode,
}: {
  open: boolean;
  onClose: () => void;
  onUseCode: (code: string) => void;
}) {
  const [openedId, setOpenedId] = useState<string | null>(null);
  const opened = INBOX_MESSAGES.find((m) => m.id === openedId) ?? null;
  return (
    <Drawer
      open={open}
      onClose={onClose}
      wide
      title="Demo inbox"
      subtitle="Front-end only: this simulates the mailbox your verification email was sent to."
      footer={<span className="dx-help">In production this panel does not exist — the code arrives in your real mailbox.</span>}
    >
      <div className="d-grid gap-2">
        {INBOX_MESSAGES.map((m) => (
          <button key={m.id} type="button" className="dx-list-row w-100 text-start" onClick={() => setOpenedId(m.id)}>
            <span className={`dx-dot ${m.read ? "dx-dot-info" : "dx-dot-up"}`} />
            <span className="flex-grow-1 min-w-0">
              <span className="d-block fw-semibold" style={{ fontSize: "0.84rem" }}>{m.from} · {m.subject}</span>
              <span className="dx-help d-block text-truncate">{m.preview}</span>
            </span>
            <span className="dx-help">{timeAgo(m.epoch)}</span>
          </button>
        ))}
        {opened ? (
          <div className="dx-card-inset">
            <div className="dx-kpi-label">{opened.from}</div>
            <div className="fw-semibold mt-1" style={{ fontSize: "0.88rem" }}>{opened.subject}</div>
            <p className="dx-help mt-2 mb-2">{opened.preview}</p>
            {opened.code ? (
              <div className="d-flex flex-wrap align-items-center gap-2">
                <span className="dx-card-inset-value font-display">{opened.code}</span>
                <CopyButton text={opened.code} label="Copy code" />
                <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => onUseCode(opened.code!)}>
                  <Check size={13} /> Autofill & verify
                </button>
              </div>
            ) : (
              <span className="dx-help">No action needed from this message.</span>
            )}
          </div>
        ) : (
          <p className="dx-help mb-0">Open the DerivX Verify message to reveal the 6-digit code.</p>
        )}
      </div>
    </Drawer>
  );
}

// -----------------------------------------------------------------------------
// 8 · Security centre (password / 2FA / sessions table) · 9 · Discard confirm
// -----------------------------------------------------------------------------
export function SecurityDialog({ open, onClose, email }: { open: boolean; onClose: () => void; email: string }) {
  const [tab, setTab] = useState("sessions");
  const [twoFa, setTwoFa] = useState(false);
  const [revoked, setRevoked] = useState<string[]>([]);
  const [confirmRevoke, setConfirmRevoke] = useState<SignupSession | null>(null);

  const table = useDataTable<SignupSession>({
    rows: SIGNUP_SESSIONS.filter((s) => !revoked.includes(s.id)),
    searchKeys: (s) => [s.device, s.location, s.ip],
    sorters: { device: (s) => s.device, last: (s) => s.lastActive },
    initialPageSize: 5,
    initialSort: "last",
    initialDir: "asc",
  });

  const columns: Column<SignupSession>[] = [
    {
      key: "device", header: "Device",
      cell: (s) => (
        <span>
          <span className="d-block fw-semibold" style={{ fontSize: "0.82rem" }}>{s.device}</span>
          <span className="dx-help d-block font-display">{s.ip} · {s.location}</span>
        </span>
      ),
    },
    { key: "last", header: "Last active", cell: (s) => <span className="dx-help">{timeAgo(s.lastActive)}</span> },
    { header: "Trust", cell: (s) => (s.current ? <Chip tone="up" pulse>this device</Chip> : s.trusted ? <Chip tone="info">trusted</Chip> : <Chip tone="warn">untrusted</Chip>) },
    {
      header: "Action",
      cell: (s) =>
        s.current ? (
          <Chip tone="muted">current</Chip>
        ) : (
          <button type="button" className="dx-btn dx-btn-sm dx-btn-danger" onClick={() => setConfirmRevoke(s)}>Revoke</button>
        ),
    },
  ];

  if (!open) return null;
  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        size="lg"
        title="Security centre"
        subtitle={`Sessions and sign-in protection for ${email || "your account"}. Revoking a session signs that device out everywhere.`}
        footer={<span className="dx-help">Security events are written to the audit log with device, IP and timestamp.</span>}
      >
        <Tabs
          tabs={[{ id: "sessions", label: "Sessions", badge: table.total }, { id: "2fa", label: "Two-factor" }, { id: "password", label: "Password" }]}
          active={tab}
          onChange={setTab}
          className="mb-4"
        />
        {tab === "sessions" ? (
          <div className="d-grid gap-3">
            <SearchInput value={table.query} onChange={table.setQuery} placeholder="Search device, location, IP…" />
            <DataTable columns={columns} state={table} rowKey={(s) => s.id} ariaLabel="Sessions" dense />
          </div>
        ) : null}
        {tab === "2fa" ? (
          <div className="d-grid gap-3">
            <Toggle checked={twoFa} onChange={setTwoFa} label="Authenticator app (TOTP)" hint="Six-digit codes from your authenticator, required at sign-in and before real-account deploys." />
            {twoFa ? (
              <div className="dx-card-inset">
                <div className="dx-kpi-label">Setup key (demo)</div>
                <div className="d-flex flex-wrap align-items-center gap-2 mt-2">
                  <span className="font-display fw-semibold">JBSW Y3DP EBLW</span>
                  <CopyButton text="JBSWY3DPEBLW" label="Copy key" />
                </div>
                <p className="dx-help mt-2 mb-0">Add this key to your authenticator, then confirm with a code at your first sign-in. Recovery codes are shown once — store them offline.</p>
              </div>
            ) : (
              <Alert tone="warn" title="Strongly recommended before real money">
                A virtual account can wait; a CR account should never trade without 2FA enabled.
              </Alert>
            )}
          </div>
        ) : null}
        {tab === "password" ? (
          <div className="d-grid gap-3">
            <Alert tone="info" title="Password storage">
              Passwords are hashed with bcrypt at 12 rounds and never stored or emailed in plain text. Changing your password
              revokes every other session automatically.
            </Alert>
            <div className="dx-card-inset">
              <div className="dx-kpi-label">Current policy</div>
              <div className="fw-semibold mt-1" style={{ fontSize: "0.86rem" }}>8+ characters · uppercase · digit · symbol</div>
              <div className="dx-help">Checked live on the signup form — open “Password rules” beside the field any time.</div>
            </div>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={Boolean(confirmRevoke)}
        onClose={() => setConfirmRevoke(null)}
        size="sm"
        title="Revoke this session?"
        subtitle={confirmRevoke ? `${confirmRevoke.device} · ${confirmRevoke.location}` : undefined}
        footer={
          <div className="d-flex gap-2 w-100 justify-content-end">
            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setConfirmRevoke(null)}>Keep session</button>
            <button
              type="button"
              className="dx-btn dx-btn-sm dx-btn-danger"
              onClick={() => { if (confirmRevoke) setRevoked((list) => [...list, confirmRevoke.id]); setConfirmRevoke(null); }}
            >
              Revoke session
            </button>
          </div>
        }
      >
        <Alert tone="warn" title="That device signs out immediately">
          Any bot it deployed keeps running under your saved risk caps — revoking a session never stops workers.
        </Alert>
      </Dialog>
    </>
  );
}

export function DiscardConfirmDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title="Discard this signup draft?"
      subtitle="Name, email, country and risk caps typed so far will be cleared."
      footer={
        <div className="d-flex gap-2 w-100 justify-content-end">
          <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={onClose}>Keep editing</button>
          <button type="button" className="dx-btn dx-btn-sm dx-btn-danger" onClick={onConfirm}>Discard draft</button>
        </div>
      }
    >
      <Alert tone="warn" title="Nothing has been created yet">
        No account, token or Deriv connection exists until you finish — discarding is safe and leaves no trace.
      </Alert>
    </Dialog>
  );
}

