// =============================================================================
// DerivCallbackPage.tsx — A-3 (/auth/deriv/callback). Blueprint states:
// LOADING (animated exchange steps) → SUCCESS (account linked) / ERROR
// (denied or expired). The token exchange, WebSocket authorize and balance
// fetch are simulated in-page against DERIV_ACCOUNTS — front-end only.
// Blueprint's [Go to Dashboard →] lands on the live demo console because
// D-1 is not built yet (never link to unbuilt routes).
// =============================================================================
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, KeyRound, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { AuthShell } from "./AuthShell";
import { SessionsDrawer, UnlinkDerivDialog } from "./AuthDialogs";
import { Alert, Chip, Dialog, Drawer, MiniTabs, Progress, SearchInput, useToast } from "../ui/primitives";
import { DataTable, useDataTable, type Column } from "../ui/data-table";
import { AccountSwitcherDialog, OAuthWizard } from "../marketing/modals/AccountModals";
import { DemoConsoleDialog } from "../marketing/modals/DemoModals";
import { ApiDocsDialog, CommunityDialog, ContactDialog, FaqDialog } from "../marketing/modals/ContentDialogs";
import { BacktestDialog, DeployBotWizard, PresetsDialog, PricingDialog } from "../marketing/modals/CommerceDialogs";
import { LeaderboardDialog, StatusDrawer, TraderDrawer, CopySetupWizard } from "../marketing/modals/SocialModals";
import {
  DERIV_ACCOUNTS,
  OAUTH_SCOPES,
  TRADERS,
  type OAuthScope,
  type StrategyPreset,
  type Trader,
} from "../../data/trading";
import { usd } from "../../data/market";
import type { DemoTab, QueuedBot } from "../marketing/types";

const STEPS = [
  { id: "redirect", label: "Redirected from Deriv", detail: "state parameter matched the CSRF token from your session" },
  { id: "exchange", label: "Exchanging authorization code…", detail: "POST /api/auth/deriv/connect — code is single-use, 60s TTL" },
  { id: "socket", label: "Establishing WebSocket connection…", detail: "wss relay eu-west · subscribe ticks for 20 symbols" },
  { id: "account", label: "Fetching account details…", detail: "authorize → loginid, balance, currency, landing company" },
  { id: "link", label: "Linking to your DerivX account…", detail: "AES-256-GCM token vault · token never reaches the browser again" },
];

const LOG_LINES = [
  "← 302 oauth.deriv.com → /auth/deriv/callback?code=•••&state=csrf_7f2demo",
  "✓ state === session.csrf (timing-safe compare)",
  "→ { \"authorize\": \"<one-time code>\" } over wss (eu-west relay)",
  "← { \"authorize\": { \"loginid\": \"CR8842197\", \"currency\": \"USD\", \"balance\": 4820.55 } }",
  "✓ token sealed (AES-256-GCM) → deriv_connections#conn_8f21",
  "✓ active_symbols cached (20) · balance snapshot stored",
];

type Outcome = "success" | "denied" | "expired";

export function DerivCallbackPage({ code, error }: { code?: string; error?: string }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [outcome, setOutcome] = useState<Outcome>(error ? "denied" : "success");
  const [phase, setPhase] = useState<"loading" | "done">("loading");
  const [stepIndex, setStepIndex] = useState(0);
  const [runId, setRunId] = useState(0);
  const [linked, setLinked] = useState(true);

  const account = DERIV_ACCOUNTS[0];

  // ---- simulated exchange sequence -------------------------------------------
  useEffect(() => {
    setPhase("loading");
    setStepIndex(0);
    const timers: number[] = [];
    STEPS.forEach((_, i) => {
      timers.push(window.setTimeout(() => setStepIndex(i + 1), 850 * (i + 1)));
    });
    timers.push(window.setTimeout(() => setPhase("done"), 850 * STEPS.length + 500));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [runId, outcome]);

  const retry = (next: Outcome) => {
    setOutcome(next);
    setLinked(true);
    setRunId((r) => r + 1);
  };

  // ---- overlays ---------------------------------------------------------------
  const [oauthOpen, setOauthOpen] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [unlinkId, setUnlinkId] = useState<string | null>(null);
  const [scopesOpen, setScopesOpen] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoTab, setDemoTab] = useState<DemoTab>("trade");
  const [statusOpen, setStatusOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [communityOpen, setCommunityOpen] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [backtestOpen, setBacktestOpen] = useState(false);
  const [backtestPreset, setBacktestPreset] = useState<string | undefined>(undefined);
  const [deployPreset, setDeployPreset] = useState<StrategyPreset | null>(null);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [trader, setTrader] = useState<Trader | null>(null);
  const [copyTrader, setCopyTrader] = useState<Trader | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeLoginId, setActiveLoginId] = useState(account.loginId);
  const [queuedBots, setQueuedBots] = useState<QueuedBot[]>([]);
  const [lastOrder, setLastOrder] = useState<string | null>(null);

  const openDemo = (tab: DemoTab) => { setDemoTab(tab); setDemoOpen(true); };

  const scopeTable = useDataTable<OAuthScope>({
    rows: OAUTH_SCOPES,
    searchKeys: (s) => [s.label, s.description, s.level],
    sorters: { label: (s) => s.label, level: (s) => s.level },
    filterKey: (s) => s.level,
    filterOptions: [
      { id: "read", label: "Read" }, { id: "trade", label: "Trade" }, { id: "payments", label: "Payments" }, { id: "admin", label: "Admin" },
    ],
    initialPageSize: 5,
  });
  const scopeColumns: Column<OAuthScope>[] = [
    {
      key: "label", header: "Scope",
      cell: (s) => (
        <span>
          <span className="d-block fw-semibold font-display" style={{ fontSize: "0.8rem" }}>{s.label}</span>
          <span className="dx-help d-block">{s.description}</span>
        </span>
      ),
    },
    { key: "level", header: "Level", cell: (s) => <span className={`dx-chip dx-risk-${s.level === "read" ? "low" : s.level === "trade" ? "med" : "high"}`}>{s.level}</span> },
    { header: "Status", cell: (s) => (s.granted ? <Chip tone="up">granted</Chip> : <Chip tone="muted">not requested</Chip>) },
  ];

  const visibleLog = useMemo(() => LOG_LINES.slice(0, Math.max(1, stepIndex + 1)), [stepIndex]);
  const grantedCount = OAUTH_SCOPES.filter((s) => s.granted).length;

  return (
    <div className="page-auth-callback">
      <AuthShell
        title="Connecting to Deriv"
        subtitle="The OAuth2 return leg: authorization code in, encrypted connection out. Your Deriv password never touches DerivX."
        side="signin"
        journeyStep={2}
        extras={
          <div className="d-grid gap-3">
            <div className="dx-card dx-card-pad">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="dx-kpi-label mb-0">Linked Deriv accounts</span>
                <Chip tone="muted">{DERIV_ACCOUNTS.filter((a) => a.connected).length} connected</Chip>
              </div>
              <div className="dx-list">
                {DERIV_ACCOUNTS.map((a) => (
                  <button key={a.loginId} type="button" className="dx-list-row w-100 text-start" onClick={() => setAccountsOpen(true)}>
                    <span className="flex-grow-1 min-w-0">
                      <span className="d-block fw-semibold font-display" style={{ fontSize: "0.82rem" }}>{a.loginId}</span>
                      <span className="dx-help d-block text-truncate">{a.label} · {a.currency}</span>
                    </span>
                    <span className="font-display" style={{ fontSize: "0.82rem" }}>{usd(a.balance)}</span>
                  </button>
                ))}
              </div>
              <div className="d-flex flex-wrap gap-2 mt-3">
                <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setScopesOpen(true)}>
                  <ShieldCheck size={13} /> OAuth scopes ({grantedCount}/{OAUTH_SCOPES.length})
                </button>
                <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setStatusOpen(true)}>API status</button>
              </div>
            </div>
            <div className="dx-card dx-card-pad">
              <span className="dx-kpi-label">Demo: preview each blueprint state</span>
              <MiniTabs
                ariaLabel="Simulated callback outcome"
                value={outcome}
                onChange={(id) => retry(id as Outcome)}
                options={[
                  { id: "success", label: "Success" },
                  { id: "denied", label: "Denied" },
                  { id: "expired", label: "Expired code" },
                ]}
              />
              <p className="dx-help mb-0 mt-2">
                {code ? <>Returned with <span className="font-display">code={code.slice(0, 10)}…</span> — switch outcomes to replay the exchange.</> : "No code in the URL — replaying the demo exchange."}
              </p>
            </div>
          </div>
        }
        footer={
          <div className="d-flex flex-wrap align-items-center gap-2">
            <span className="dx-help me-1">Stuck?</span>
            <button type="button" className="dx-btn-link" onClick={() => setFaqOpen(true)}>Help &amp; FAQ</button>
            <button type="button" className="dx-btn-link" onClick={() => setContactOpen(true)}>Contact support</button>
            <Link to="/auth/signin" className="dx-btn-link">Back to sign in</Link>
          </div>
        }
      >
        {phase === "loading" ? (
          <div className="d-grid gap-3" aria-live="polite">
            <div className="d-flex align-items-center gap-3">
              <Loader2 size={22} className="dx-accent dx-callback-spin" />
              <div>
                <h2 className="dx-h-card mb-0">Connecting to Deriv…</h2>
                <span className="dx-help">Keep this tab open — the exchange takes a few seconds.</span>
              </div>
            </div>
            <Progress value={stepIndex} max={STEPS.length} />
            <div className="d-grid gap-2">
              {STEPS.map((s, i) => {
                const state = i < stepIndex ? "done" : i === stepIndex ? "active" : "todo";
                return (
                  <div key={s.id} className={`dx-card-inset dx-callback-step d-flex align-items-start gap-3 ${state === "active" ? "is-active" : ""} ${state === "done" ? "is-done" : ""}`}>
                    {state === "done" ? <Check size={16} className="dx-up mt-1" /> : state === "active" ? <Loader2 size={16} className="dx-accent dx-callback-spin mt-1" /> : <span className="dx-step-dot mt-1">{i + 1}</span>}
                    <span>
                      <span className="d-block fw-semibold" style={{ fontSize: "0.88rem" }}>{s.label}</span>
                      <span className="dx-help d-block">{s.detail}</span>
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="dx-card-inset font-display">
              {visibleLog.map((line) => (
                <div key={line} className="dx-terminal-line">{line}</div>
              ))}
            </div>
          </div>
        ) : outcome === "success" && linked ? (
          <div className="d-grid gap-3">
            <div className="d-flex align-items-center gap-3">
              <span className="dx-up"><Check size={26} /></span>
              <div>
                <h2 className="dx-h-card mb-0">Deriv account connected!</h2>
                <span className="dx-help">Connection conn_8f21 is live on the eu-west relay.</span>
              </div>
            </div>
            <div className="dx-card-inset d-grid gap-1">
              <span className="d-flex justify-content-between"><span className="dx-help">Account</span><span className="font-display fw-semibold">{account.loginId}</span></span>
              <span className="d-flex justify-content-between"><span className="dx-help">Balance</span><span className="font-display fw-semibold">{usd(account.balance)} (USD)</span></span>
              <span className="d-flex justify-content-between"><span className="dx-help">Currency</span><span className="font-display">{account.currency}</span></span>
              <span className="d-flex justify-content-between"><span className="dx-help">Type</span><span className="dx-chip dx-chip-accent">{account.label}</span></span>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <Chip tone="up">{grantedCount} scopes granted</Chip>
              <Chip tone="muted">WebSocket live · 20 symbols</Chip>
              {lastOrder ? <Chip tone="info">lastOrder: {lastOrder}</Chip> : null}
            </div>
            <button type="button" className="dx-btn dx-btn-lg dx-btn-primary w-100" onClick={() => openDemo("trade")}>
              Open live console <ArrowRight size={15} />
            </button>
            <div className="row g-2">
              <div className="col-6"><button type="button" className="dx-btn w-100" onClick={() => setAccountsOpen(true)}>Manage connections</button></div>
              <div className="col-6"><button type="button" className="dx-btn w-100" onClick={() => setRecordOpen(true)}>Connection record</button></div>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <button type="button" className="dx-btn-link" onClick={() => setScopesOpen(true)}>Review OAuth scopes</button>
              <button type="button" className="dx-btn-link" onClick={() => setUnlinkId(account.loginId)}>Disconnect this account</button>
            </div>
          </div>
        ) : outcome === "success" && !linked ? (
          <div className="d-grid gap-3">
            <Alert tone="info" title="Deriv disconnected">
              {account.loginId} was unlinked from this DerivX account. Bots on it are paused; open Deriv positions run to expiry on Deriv&apos;s side.
            </Alert>
            <button type="button" className="dx-btn dx-btn-lg dx-btn-primary w-100" onClick={() => setOauthOpen(true)}>
              <KeyRound size={15} /> Reconnect Deriv
            </button>
            <Link to="/auth/signin" className="dx-btn w-100">Back to sign in</Link>
          </div>
        ) : (
          <div className="d-grid gap-3">
            <div className="d-flex align-items-center gap-3">
              <XCircle size={26} className="dx-down" />
              <div>
                <h2 className="dx-h-card mb-0">Connection failed</h2>
                <span className="dx-help">No changes were made to your DerivX account.</span>
              </div>
            </div>
            <Alert tone="danger" title={outcome === "denied" ? "Authorization was denied" : "Authorization code expired"}>
              {outcome === "denied"
                ? "You (or Deriv) cancelled the authorization on Deriv's consent screen, so no code reached DerivX. Nothing was linked."
                : "The authorization code lived longer than its 60-second window and Deriv rejected the exchange. Codes are single-use — start a fresh authorization."}
            </Alert>
            <div className="row g-2">
              <div className="col-6">
                <button type="button" className="dx-btn dx-btn-primary w-100" onClick={() => setOauthOpen(true)}>Try again</button>
              </div>
              <div className="col-6">
                <button type="button" className="dx-btn w-100" onClick={() => setContactOpen(true)}>Contact support</button>
              </div>
            </div>
            <button type="button" className="dx-btn-link" onClick={() => retry("success")}>Replay the exchange (demo)</button>
          </div>
        )}
      </AuthShell>

      {/* ================= overlays ================= */}
      <OAuthWizard open={oauthOpen} onClose={() => setOauthOpen(false)}
        onConnected={(id) => {
          setActiveLoginId(id);
          setLinked(true);
          setOutcome("success");
          toast.push({ tone: "success", title: `Deriv connection established — ${id}`, body: "authorize handshake complete · balance snapshot stored." });
        }}
        onOpenStatus={() => { setOauthOpen(false); setStatusOpen(true); }}
        onOpenSignUp={() => { setOauthOpen(false); void navigate({ to: "/auth/signup" }); }}
        onOpenDemo={() => { setOauthOpen(false); openDemo("trade"); }} />
      <AccountSwitcherDialog open={accountsOpen} onClose={() => setAccountsOpen(false)} activeLoginId={activeLoginId}
        onSetActive={(id) => setActiveLoginId(id)}
        onOpenOAuth={() => { setAccountsOpen(false); setOauthOpen(true); }}
        onDisconnected={(id) => { if (id === account.loginId) setLinked(false); }}
        onOpenStatus={() => { setAccountsOpen(false); setStatusOpen(true); }} />
      <UnlinkDerivDialog loginId={unlinkId} onClose={() => setUnlinkId(null)}
        onUnlinked={() => {
          setLinked(false);
          toast.push({ tone: "success", title: `Deriv ${account.loginId} disconnected`, body: "The sealed token was destroyed." });
        }} />
      <Drawer open={scopesOpen} onClose={() => setScopesOpen(false)} title="OAuth scopes" wide
        subtitle={`${grantedCount} of ${OAUTH_SCOPES.length} scopes granted to DerivX for ${account.loginId}. Payments and admin scopes are never requested by the trading app.`}
        footer={<button type="button" className="dx-btn dx-btn-primary w-100" onClick={() => { setScopesOpen(false); setOauthOpen(true); }}>Re-authorize with different scopes</button>}>
        <div className="d-grid gap-3">
          <SearchInput value={scopeTable.query} onChange={scopeTable.setQuery} placeholder="Search scopes…" />
          <DataTable columns={scopeColumns} state={scopeTable} rowKey={(s) => s.id} ariaLabel="OAuth scopes" dense />
        </div>
      </Drawer>
      <Dialog open={recordOpen} onClose={() => setRecordOpen(false)} size="md" title="Connection record"
        subtitle="What DerivX stored for this link (token shown as a vault fingerprint only)."
        footer={<button type="button" className="dx-btn" onClick={() => { setRecordOpen(false); setSessionsOpen(true); }}>View trusted sessions</button>}>
        <div className="dx-card-inset d-grid gap-1 font-display" style={{ fontSize: "0.8rem" }}>
          <span className="d-flex justify-content-between"><span className="dx-help">connection_id</span><span>conn_8f21</span></span>
          <span className="d-flex justify-content-between"><span className="dx-help">deriv_loginid</span><span>{account.loginId}</span></span>
          <span className="d-flex justify-content-between"><span className="dx-help">token_vault</span><span>aes256gcm:9f2c…e41a</span></span>
          <span className="d-flex justify-content-between"><span className="dx-help">relay</span><span>eu-west · wss · 38ms</span></span>
          <span className="d-flex justify-content-between"><span className="dx-help">is_new_connection</span><span>false</span></span>
          <span className="d-flex justify-content-between"><span className="dx-help">markets_cached</span><span>20 active symbols</span></span>
        </div>
        <Alert tone="info" title="Security model">
          CSRF state validated before exchange, token encrypted at rest (AES-256-GCM) and never sent to the browser after the handshake.
        </Alert>
      </Dialog>
      <SessionsDrawer open={sessionsOpen} onClose={() => setSessionsOpen(false)} />
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
          if (p) setQueuedBots((list) => [...list, { id: `bot_cb_${list.length + 1}`, name, symbol: p.symbol, stake, cap, strategy: p.kind, contractType: p.contractType, duration: p.duration, durationUnit: p.durationUnit, risk: p.risk, winRate: p.winRate }]);
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
        onDeployed={(name) => {
          setPricingOpen(false);
          toast.push({ tone: "success", title: `${name} plan active`, body: "Plan switched for this demo session." });
        }} />
      <CommunityDialog open={communityOpen} onClose={() => setCommunityOpen(false)}
        onContact={() => { setCommunityOpen(false); setContactOpen(true); }}
        onLeaderboard={() => { setCommunityOpen(false); openDemo("social"); }} />
      <ContactDialog open={contactOpen} onClose={() => setContactOpen(false)}
        onOpenCommunity={() => { setContactOpen(false); setCommunityOpen(true); }} />
    </div>
  );
}
