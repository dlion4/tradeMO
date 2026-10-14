// =============================================================================
// ContentDialogs.tsx — H-1 informational overlay pack: feature deep dives,
// how-it-works step detail, legal documents, FAQ, API reference, about,
// changelog, sitemap, community channels, contact and testimonial detail.
// =============================================================================
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Bot,
  Check,
  Code2,
  ExternalLink,
  FileText,
  GitBranch,
  Lock,
  MessageSquare,
  Printer,
  Search,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  Alert,
  Avatar,
  Chip,
  CodeBlock,
  CopyButton,
  Dialog,
  Drawer,
  EmptyState,
  Field,
  FilterChips,
  Meter,
  MiniTabs,
  Reveal,
  SearchInput,
  Sparkline,
  Tabs,
} from "../../ui/primitives";
import { LineChart } from "../../ui/charts";
import {
  API_ENDPOINTS,
  BACKTESTS,
  BOTS,
  COMMUNITY_CHANNELS,
  FAQS,
  LEGAL_DOCS,
  PLANS,
  SCRIPTS,
  STATS,
  STRATEGY_PRESETS,
  TESTIMONIALS,
  TRADERS,
  equityCurve,
  type Faq,
  type LegalDoc,
} from "../../../data/trading";
import { CONTRACT_TYPES, MARKET_SYMBOLS, fmtDur, pnl, usd } from "../../../data/market";
import type { FeatureId, LandingController } from "../types";

// -----------------------------------------------------------------------------
// Feature detail dialog (Bot Builder / Script Engine / Social Trade)
// -----------------------------------------------------------------------------
const FEATURE_COPY: Record<
  FeatureId,
  {
    title: string;
    tagline: string;
    tabs: { id: string; label: string }[];
    overview: string[];
    how: { step: string; text: string }[];
    limits: { label: string; value: string }[];
    code?: string;
    cta: { label: string; action: "presets" | "docs" | "leaderboard" | "demo" };
  }
> = {
  "bot-builder": {
    title: "Bot Builder",
    tagline: "Automate the trade, keep control of the risk",
    tabs: [
      { id: "overview", label: "Overview" },
      { id: "how", label: "Execution flow" },
      { id: "limits", label: "Risk limits" },
      { id: "fleet", label: "Live fleet" },
    ],
    overview: [
      "Ten preset strategies cover the common Deriv approaches: martingale ladders, DCA baskets, fixed-stake grids, digit models and accumulator growth tuners.",
      "Each preset exposes twelve core parameters — stake, duration, recovery step, maximum stake per leg, stop-loss, take-profit, session window and more — with sane defaults already filled in.",
      "Workers run in isolated queues with idempotent order retries, so a socket drop never double-buys a contract.",
    ],
    how: [
      { step: "Subscribe", text: "The worker subscribes to its symbol's tick stream on a dedicated lane." },
      { step: "Evaluate", text: "Every tick runs through your strategy plus the five risk assertions." },
      { step: "Propose", text: "A proposal is requested from Deriv with the stake and duration you configured." },
      { step: "Buy", text: "The contract is purchased with an idempotency key; the receipt streams to your portfolio view." },
      { step: "Settle", text: "On expiry the result is reconciled, the martingale step applies and the loop continues." },
    ],
    limits: [
      { label: "Maximum stake per leg", value: "hard cap, engine-enforced" },
      { label: "Stop-loss / take-profit", value: "on realised P&L" },
      { label: "Consecutive-loss pause", value: "configurable, default 5" },
      { label: "Session window", value: "UTC windows + news blackouts" },
      { label: "Exposure ceiling", value: "aggregate open stake across bots" },
    ],
    cta: { label: "Browse the preset library", action: "presets" },
  },
  "script-engine": {
    title: "Script Engine",
    tagline: "Custom JavaScript strategies in a sandbox",
    tabs: [
      { id: "overview", label: "Overview" },
      { id: "api", label: "API surface" },
      { id: "sample", label: "Sample script" },
      { id: "limits", label: "Limits" },
    ],
    overview: [
      "Scripts run in a VM2 sandbox with a deterministic replay mode — no filesystem, no outbound network, no access to your Deriv token.",
      "Subscribe to ticks or bars, read indicators, set barriers and place contracts through a promise-based API that mirrors the Deriv request shapes.",
      "Backtest any script over two years of tick history with drawdown, Sharpe and walk-forward splits before deploying to a live connection.",
      "All six starter templates run through the API, and the deployment checklist verifies that the risk ceiling stays inside your authorized limits.",
    ],
    how: [
      { step: "Write", text: "Edit in the code panel with the DerivX API types injected." },
      { step: "Backtest", text: "Replay two years of ticks and inspect the equity curve." },
      { step: "Deploy", text: "Promote the script to a bot config with stake and risk caps." },
      { step: "Observe", text: "Stream logs and fills to the bot detail page." },
    ],
    limits: [
      { label: "Runtime model", value: "VM2 isolate, 250 ms evaluation budget" },
      { label: "Memory", value: "64 MB per script" },
      { label: "Tick throughput", value: "up to 1,000 evaluations/sec" },
      { label: "Allowed calls", value: "ticks, bars, indicators, buy, sell, risk" },
      { label: "Blocked", value: "filesystem, network, process, timers > 60s" },
    ],
    code: `// Momentum reclaim — EUR/USD, 15-minute Rise/Fall
const { api, risk, log } = DerivX;

api.onTick("frxEURUSD", (tick) => {
  const emaFast = api.ema("frxEURUSD", 20);
  const emaSlow = api.ema("frxEURUSD", 60);
  if (emaFast <= emaSlow) return;                  // no edge, stay flat

  const stake = risk.sized(25, { maxPct: 1.5 });
  api.buy({
    symbol: "frxEURUSD",
    contract_type: "CALL",
    amount: stake,
    duration: 15,
    duration_unit: "m",
    currency: "USD",
  }).then((receipt) => log.info("filled " + receipt.contract_id));
});`,
    cta: { label: "Open the API reference", action: "docs" },
  },
  "social-trade": {
    title: "Social Trade",
    tagline: "Verified performance, one-click mirroring",
    tabs: [
      { id: "overview", label: "Overview" },
      { id: "verified", label: "How verification works" },
      { id: "copy", label: "Copy mechanics" },
      { id: "board", label: "Top traders" },
    ],
    overview: [
      "Leaderboards are built from reconciled Deriv statements, not from screenshots — every P&L number is reproducible from contract history.",
      "Per-trader risk profiles show maximum drawdown, streak history and typical duration so you can judge the style, not just the return.",
      "Copy trading replays the trader's contract requests at your own stake ratio, on your own connection, with an independent loss cap and kill switch.",
    ],
    how: [
      { step: "Ingest", text: "Contract history is pulled per trader and normalised." },
      { step: "Reconcile", text: "Entries, payouts and expiries are matched against Deriv records." },
      { step: "Rank", text: "Realised P&L, win rate and risk-adjusted score drive the board." },
      { step: "Verify", text: "Only accounts with a clean reconciliation get a verified badge." },
    ],
    limits: [
      { label: "Stake ratio", value: "0.1× – 2× of the trader's stake" },
      { label: "Max concurrent legs", value: "configurable, default 4" },
      { label: "Loss cap", value: "hard halt per copy relay" },
      { label: "Kill switch", value: "releases every mirrored leg within one tick" },
      { label: "Slippage", value: "possible on fast tick contracts" },
    ],
    cta: { label: "Open the full leaderboard", action: "leaderboard" },
  },
};

export function FeatureDetailDialog({
  feature,
  onClose,
  onPresets,
  onDocs,
  onLeaderboard,
  onDemo,
  onOpenStep,
}: {
  feature: FeatureId | null;
  onClose: () => void;
  onPresets: () => void;
  onDocs: () => void;
  onLeaderboard: () => void;
  onDemo: () => void;
  onOpenStep: (index: number) => void;
}) {
  const [tab, setTab] = useState("overview");
  if (!feature) return null;
  const copy = FEATURE_COPY[feature];

  const runCta = () => {
    if (copy.cta.action === "presets") onPresets();
    else if (copy.cta.action === "docs") onDocs();
    else if (copy.cta.action === "leaderboard") onLeaderboard();
    else onDemo();
  };

  const fleetBots = BOTS.filter((b) => b.status !== "stopped").slice(0, 6);

  return (
    <Dialog
      open={Boolean(feature)}
      onClose={onClose}
      size="xl"
      title={copy.title}
      subtitle={copy.tagline}
      footer={
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 w-100">
          <span className="dx-help">
            {STATS.botsLive.toLocaleString("en-US")} bots running platform-wide · {SCRIPTS.length} scripts deployed
          </span>
          <div className="d-flex flex-wrap gap-2">
            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => onOpenStep(2)}>
              See configuration step
            </button>
            <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={runCta}>
              {copy.cta.label} <ArrowRight size={13} />
            </button>
          </div>
        </div>
      }
    >
      <Tabs tabs={copy.tabs} active={tab} onChange={setTab} className="mb-4" />

      {tab === "overview" ? (
        <div className="row g-4">
          <div className="col-12 col-lg-7 d-grid gap-3">
            {copy.overview.map((p) => (
              <p key={p} className="dx-text-dim mb-0" style={{ fontSize: "0.88rem" }}>
                {p}
              </p>
            ))}
            <div className="d-flex flex-wrap gap-2">
              <Chip tone="up">engine-enforced caps</Chip>
              <Chip tone="muted">idempotent retries</Chip>
              <Chip tone="info">audit log</Chip>
            </div>
          </div>
          <div className="col-12 col-lg-5">
            <div className="dx-card-inset">
              <div className="dx-kpi-label mb-2">Adoption</div>
              <Sparkline data={equityCurve(24, feature.length * 313, 400, 6)} tone="accent" height={70} ariaLabel="Adoption trend" />
              <div className="d-flex justify-content-between mt-2">
                <span className="dx-help">last 30 days</span>
                <span className="dx-help font-display dx-up">+38.4%</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "how" || tab === "api" ? (
        <div className="row g-4">
          <div className="col-12 col-lg-6">
            <ol className="d-grid gap-3 ps-0" style={{ listStyle: "none" }}>
              {copy.how.map((h, i) => (
                <li key={h.step} className="dx-card-inset d-flex gap-3">
                  <span className="dx-step-dot">{i + 1}</span>
                  <span>
                    <span className="d-block fw-semibold" style={{ fontSize: "0.86rem" }}>
                      {h.step}
                    </span>
                    <span className="dx-help">{h.text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="col-12 col-lg-6">
            <div className="dx-card-inset">
              <div className="dx-kpi-label mb-2">Request envelope</div>
              <CodeBlock
                code={`{
  "buy": 1,
  "price": 25.00,
  "parameters": {
    "amount": 25,
    "basis": "stake",
    "contract_type": "CALL",
    "currency": "USD",
    "duration": 15,
    "duration_unit": "m",
    "symbol": "frxEURUSD"
  }
}`}
              />
            </div>
          </div>
        </div>
      ) : null}

      {tab === "sample" ? (
        <div className="d-grid gap-3">
          <CodeBlock code={copy.code ?? ""} maxHeight={420} />
          <div className="d-flex flex-wrap gap-2">
            <CopyButton text={copy.code ?? ""} label="Copy script" />
            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={onDocs}>
              Full API surface
            </button>
            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => onOpenStep(1)}>
              Choose a strategy instead
            </button>
          </div>
        </div>
      ) : null}

      {tab === "limits" ? (
        <div className="row g-3">
          {copy.limits.map((l) => (
            <div className="col-12 col-sm-6" key={l.label}>
              <div className="dx-card-inset">
                <div className="dx-kpi-label">{l.label}</div>
                <div className="fw-semibold" style={{ fontSize: "0.86rem" }}>
                  {l.value}
                </div>
              </div>
            </div>
          ))}
          <div className="col-12">
            <Alert tone="warn" title="Caps are absolute">
              The engine rejects any order that would breach a configured cap — the bot pauses and you receive one notification.
              Nothing is force-closed without your confirmation.
            </Alert>
          </div>
        </div>
      ) : null}

      {tab === "fleet" ? (
        <div className="dx-table-wrap dx-table-scroll">
          <table className="dx-table dx-table-sm dx-table-stack">
            <thead>
              <tr>
                <th scope="col">Bot</th>
                <th scope="col">Symbol</th>
                <th scope="col" className="dx-td-num">
                  Stake
                </th>
                <th scope="col" className="dx-td-num">
                  P&amp;L
                </th>
                <th scope="col" className="dx-td-num">
                  Win
                </th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {fleetBots.map((b) => (
                <tr key={b.id}>
                  <td data-label="Bot">
                    <span className="fw-semibold">{b.name}</span>
                    <span className="dx-help d-block">{b.owner}</span>
                  </td>
                  <td data-label="Symbol" className="font-display">
                    {b.symbol}
                  </td>
                  <td data-label="Stake" className="dx-td-num">
                    {usd(b.stake)}
                  </td>
                  <td data-label="P&L" className="dx-td-num">
                    <span className={b.pnl >= 0 ? "dx-up" : "dx-down"}>{pnl(b.pnl)}</span>
                  </td>
                  <td data-label="Win" className="dx-td-num">
                    {b.winRate}%
                  </td>
                  <td data-label="Status">
                    <span className={`dx-chip ${b.status === "running" ? "dx-chip-up" : b.status === "paused" ? "dx-chip-warn" : "dx-chip-down"}`}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "board" ? (
        <div className="d-grid gap-3">
          {TRADERS.slice(0, 5).map((t) => (
            <div key={t.id} className="dx-list-row">
              <Avatar name={t.displayName} tone="teal" />
              <span className="flex-grow-1">
                <span className="d-block fw-semibold">
                  {t.flag} {t.displayName}
                </span>
                <span className="dx-help">
                  {t.strategy} · {t.winRate}% win · {t.copies} copiers
                </span>
              </span>
              <span className="font-display dx-up">{pnl(t.pnl30d)}</span>
            </div>
          ))}
          <button type="button" className="dx-btn dx-btn-primary" onClick={onLeaderboard}>
            Open the full leaderboard <ArrowRight size={13} />
          </button>
        </div>
      ) : null}
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// How-it-works step detail
// -----------------------------------------------------------------------------
export function StepDetailDialog({
  open,
  index,
  steps,
  onClose,
  onPrev,
  onNext,
  onRunAction,
}: {
  open: boolean;
  index: number;
  steps: { id: string; title: string; description: string; detail: string; bulletsTitle: string; bullets: string[]; metrics: { label: string; value: string }[]; cta: { label: string } }[];
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onRunAction: (index: number) => void;
}) {
  const [tab, setTab] = useState("overview");
  const step = steps[index];
  if (!step) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={`Step ${index + 1} — ${step.title}`}
      subtitle={step.description}
      footer={
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 w-100">
          <div className="d-flex gap-2">
            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={onPrev} disabled={index === 0}>
              Previous step
            </button>
            <button
              type="button"
              className="dx-btn dx-btn-sm dx-btn-ghost"
              onClick={onNext}
              disabled={index === steps.length - 1}
            >
              Next step
            </button>
          </div>
          <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => onRunAction(index)}>
            {step.cta.label} <ArrowRight size={13} />
          </button>
        </div>
      }
    >
      <Tabs
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "checklist", label: step.bulletsTitle },
          { id: "metrics", label: "Metrics" },
        ]}
        active={tab}
        onChange={setTab}
        className="mb-4"
      />

      {tab === "overview" ? <p className="dx-text-dim" style={{ fontSize: "0.9rem" }}>{step.detail}</p> : null}

      {tab === "checklist" ? (
        <ul className="d-grid gap-2 list-unstyled mb-0">
          {step.bullets.map((b) => (
            <li key={b} className="dx-card-inset d-flex gap-3 align-items-start">
              <Check size={15} className="dx-up mt-1" />
              <span className="dx-help mb-0">{b}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {tab === "metrics" ? (
        <div className="row g-3">
          {step.metrics.map((m) => (
            <div className="col-12 col-sm-4" key={m.label}>
              <div className="dx-card-inset">
                <div className="dx-kpi-label">{m.label}</div>
                <div className="font-display fw-semibold">{m.value}</div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// Legal document dialog
// -----------------------------------------------------------------------------
export function LegalDialog({ doc, onClose, onContact }: { doc: LegalDoc | null; onClose: () => void; onContact: (topic: string) => void }) {
  const [section, setSection] = useState(0);
  const [ack, setAck] = useState(false);

  if (!doc) return null;
  const fullText = `${doc.title} (updated ${doc.updated})\n\n${doc.sections.map((s) => `${s.heading}\n${s.body}`).join("\n\n")}`;

  return (
    <Dialog
      open={Boolean(doc)}
      onClose={onClose}
      size="xl"
      title={doc.title}
      subtitle={`Last updated ${doc.updated} · ${doc.sections.length} sections · ${doc.summary}`}
      footer={
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 w-100">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <CopyButton text={fullText} label="Copy document" />
            <button
              type="button"
              className="dx-btn dx-btn-sm dx-btn-ghost"
              onClick={() => window.print()}
              title="Uses your browser's print dialog"
            >
              <Printer size={13} /> Print
            </button>
          </div>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => onContact("legal")}>
              <MessageSquare size={13} /> Ask a question
            </button>
            <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={onClose}>
              {ack ? "Done" : "Close"}
            </button>
          </div>
        </div>
      }
    >
      <div className="row g-4">
        <div className="col-12 col-lg-4">
          <div className="dx-card-inset">
            <div className="dx-kpi-label mb-2">Contents</div>
            <div className="d-grid gap-1">
              {doc.sections.map((s, i) => (
                <button
                  key={s.heading}
                  type="button"
                  className={`dx-dd-item ${i === section ? "is-active" : ""}`}
                  onClick={() => setSection(i)}
                >
                  <FileText size={13} /> {s.heading}
                </button>
              ))}
            </div>
            <hr className="dx-hr" />
            <label className="dx-check">
              <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
              <span>I have read this section and understand it.</span>
            </label>
          </div>
        </div>
        <div className="col-12 col-lg-8">
          <h3 className="dx-h-card mb-2">{doc.sections[section].heading}</h3>
          <p className="dx-text-dim" style={{ fontSize: "0.88rem" }}>
            {doc.sections[section].body}
          </p>
          <div className="d-flex flex-wrap gap-2 mt-3">
            <Chip tone="muted">screen {section + 1} of {doc.sections.length}</Chip>
            {ack ? (
              <Chip tone="up">
                <BadgeCheck size={12} /> acknowledged
              </Chip>
            ) : (
              <Chip tone="warn">awaiting acknowledgement</Chip>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// FAQ dialog — accordion with search + categories
// -----------------------------------------------------------------------------
export function FaqDialog({
  open,
  onClose,
  initialCategory,
  onContact,
  onOpenDocs,
  onOpenPricing,
}: {
  open: boolean;
  onClose: () => void;
  initialCategory?: string;
  onContact: (topic: string) => void;
  onOpenDocs: () => void;
  onOpenPricing: (planId?: string) => void;
}) {
  const [category, setCategory] = useState(initialCategory ?? "all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(FAQS[0].id);

  const filtered = useMemo(() => {
    let list: Faq[] = FAQS;
    if (category !== "all") list = list.filter((f) => f.category === category);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q));
    }
    return list;
  }, [category, query]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Help centre"
      subtitle={`${FAQS.length} answers across onboarding, trading, automation, security and billing`}
      footer={
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 w-100">
          <span className="dx-help">Still stuck? Support answers within one business day.</span>
          <div className="d-flex gap-2">
            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={onOpenDocs}>
              <Code2 size={13} /> API reference
            </button>
            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => onOpenPricing()}>
              Compare plans
            </button>
            <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => onContact("support")}>
              <Send size={13} /> Contact support
            </button>
          </div>
        </div>
      }
    >
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Search the answers…" />
        <FilterChips
          options={[
            { id: "getting-started", label: "Getting started" },
            { id: "trading", label: "Trading" },
            { id: "automation", label: "Automation" },
            { id: "security", label: "Security" },
            { id: "billing", label: "Billing" },
          ]}
          value={category}
          onChange={setCategory}
          allLabel="All topics"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={20} />}
          title="No answer matches that search"
          message="Try a shorter phrase, or send the question straight to support with your Deriv login ID attached."
          action={
            <button type="button" className="dx-btn dx-btn-primary" onClick={() => onContact("support")}>
              Ask support
            </button>
          }
        />
      ) : (
        <div className="d-grid gap-2">
          {filtered.map((f) => {
            const isOpen = openId === f.id;
            return (
              <div className="dx-card-inset" key={f.id}>
                <button
                  type="button"
                  className="dx-btn-link w-100 d-flex align-items-start justify-content-between gap-3 text-start"
                  style={{ color: "var(--dx-text)" }}
                  onClick={() => setOpenId(isOpen ? null : f.id)}
                  aria-expanded={isOpen}
                >
                  <span className="fw-semibold" style={{ fontSize: "0.88rem" }}>
                    {f.question}
                  </span>
                  <span className="dx-chip dx-chip-muted">{f.category}</span>
                </button>
                {isOpen ? (
                  <p className="dx-help mt-2 mb-0" style={{ fontSize: "0.84rem" }}>
                    {f.answer}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// API reference dialog
// -----------------------------------------------------------------------------
const API_SAMPLES: Record<string, { title: string; body: string }> = {
  auth: {
    title: "authorize",
    body: `// Request\n{ "authorize": "a1-9c82f...", "req_id": 1 }\n\n// Response\n{\n  "authorize": {\n    "loginid": "CR8842197",\n    "currency": "USD",\n    "balance": 4820.55,\n    "scopes": ["read", "trade"]\n  }\n}`,
  },
  market: {
    title: "tick (subscribe)",
    body: `// Request\n{ "ticks": "R_10", "subscribe": 1, "req_id": 2 }\n\n// Response\n{\n  "tick": { "symbol": "R_10", "quote": 6423.752, "epoch": 1791886200, "id": "a1b2c3" }\n}`,
  },
  trading: {
    title: "proposal → buy",
    body: `// proposal\n{ "proposal": 1, "amount": 0.35, "basis": "stake", "contract_type": "CALL",\n  "currency": "USD", "duration": 5, "duration_unit": "t", "symbol": "R_10" }\n\n// buy (idempotent)\n{ "buy": "prop_7f31c", "price": 0.35, "req_id": 4 }`,
  },
  portfolio: {
    title: "portfolio (subscribe)",
    body: `// Request\n{ "portfolio": 1, "subscribe": 1, "req_id": 5 }\n\n// Response\n{\n  "portfolio": { "contracts": [\n    { "contract_id": 34015201, "buy_price": 0.70, "payout": 1.37,\n      "symbol": "R_10", "contract_type": "CALL", "profit": 0.32 }\n  ]}\n}`,
  },
  utility: {
    title: "website_status",
    body: `// Request\n{ "website_status": 1, "req_id": 6 }\n\n// Response\n{ "website_status": { "clients_country": "ng", "site_status": "up" } }`,
  },
};

export function ApiDocsDialog({
  open,
  onClose,
  onOpenStatus,
  onOpenDemo,
}: {
  open: boolean;
  onClose: () => void;
  onOpenStatus: () => void;
  onOpenDemo: () => void;
}) {
  const [channel, setChannel] = useState("market");
  const rows = API_ENDPOINTS.filter((e) => e.channel === channel);
  const sample = API_SAMPLES[channel];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="xl"
      title="Deriv API reference"
      subtitle="Every request this platform makes: auth, market data, trading, portfolio and utility calls on wss://ws.derivws.com/websockets/v3"
      footer={
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 w-100">
          <span className="dx-help">Front-end build: requests and responses below are simulated fixtures, not live payloads.</span>
          <div className="d-flex gap-2">
            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={onOpenStatus}>
              <ShieldCheck size={13} /> Live endpoint health
            </button>
            <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={onOpenDemo}>
              See it in the console
            </button>
          </div>
        </div>
      }
    >
      <MiniTabs
        options={[
          { id: "auth", label: "Auth" },
          { id: "market", label: "Market data" },
          { id: "trading", label: "Trading" },
          { id: "portfolio", label: "Portfolio" },
          { id: "utility", label: "Utility" },
        ]}
        value={channel}
        onChange={setChannel}
        ariaLabel="API channel"
      />

      <div className="row g-4 mt-1">
        <div className="col-12 col-lg-6">
          <div className="dx-table-wrap">
            <table className="dx-table dx-table-sm dx-table-stack">
              <thead>
                <tr>
                  <th scope="col">Request</th>
                  <th scope="col" className="dx-td-num">
                    Latency
                  </th>
                  <th scope="col" className="dx-td-num">
                    Uptime
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td data-label="Request" className="font-display">
                      {r.request}
                    </td>
                    <td data-label="Latency" className="dx-td-num font-display">
                      {r.latencyMs} ms
                    </td>
                    <td data-label="Uptime" className="dx-td-num font-display">
                      {r.uptimePct.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="col-12 col-lg-6">
          <div className="dx-card-inset">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="dx-kpi-label mb-0">{sample.title}</span>
              <CopyButton text={sample.body} label="Copy" />
            </div>
            <CodeBlock code={sample.body} maxHeight={260} />
          </div>
        </div>
        <div className="col-12">
          <div className="row g-3">
            {[
              { k: "Connection", v: "wss://ws.derivws.com/websockets/v3?app_id=108487" },
              { k: "Keep-alive", v: 'ping every 25s → {"ping": 1}' },
              { k: "Rate limit", v: "2 requests / second / connection" },
              { k: "Reconnect", v: "exponential backoff, idempotent order replay" },
            ].map((row) => (
              <div className="col-12 col-sm-6 col-lg-3" key={row.k}>
                <div className="dx-card-inset h-100">
                  <div className="dx-kpi-label">{row.k}</div>
                  <div className="font-display" style={{ fontSize: "0.78rem", wordBreak: "break-word" }}>
                    {row.v}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// About + changelog + sitemap
// -----------------------------------------------------------------------------
const ABOUT_TABS = [
  { id: "story", label: "Story" },
  { id: "stack", label: "Stack" },
  { id: "roadmap", label: "Roadmap" },
  { id: "numbers", label: "Numbers" },
];

const CHANGELOG = [
  { v: "2026.10", date: "2026-10-13", kind: "feature", items: ["Landing page (H-1) rebuilt on the master theme", "Live ticker strip with 3 symbol groups", "OAuth walkthrough + onboarding wizard"] },
  { v: "2026.09", date: "2026-09-28", kind: "fix", items: ["Proposal latency spike resolved on the eu-west relay", "Statement export timezone normalised to UTC"] },
  { v: "2026.09", date: "2026-09-14", kind: "feature", items: ["Automation hub schedules + webhooks", "Backtest walk-forward splits"] },
  { v: "2026.08", date: "2026-08-30", kind: "feature", items: ["Script engine VM2 upgrade", "Digit frequency recalibration every 1,000 ticks"] },
  { v: "2026.08", date: "2026-08-11", kind: "fix", items: ["Martingale cap is now enforced before the proposal call"] },
  { v: "2026.07", date: "2026-07-26", kind: "feature", items: ["Copy trade with independent loss caps", "Kill switch for mirrored legs"] },
  { v: "2026.07", date: "2026-07-09", kind: "security", items: ["TOTP two-factor authentication", "Per-device session revoke"] },
  { v: "2026.06", date: "2026-06-21", kind: "feature", items: ["Investor module: pools, schedules, payouts", "KYC review queue"] },
  { v: "2026.06", date: "2026-06-02", kind: "fix", items: ["Accumulator growth-rate rounding on 1s indices"] },
  { v: "2026.05", date: "2026-05-18", kind: "feature", items: ["19 symbols including OTC indices", "Touch/No Touch barrier preview"] },
];

export function AboutDialog({ open, onClose, onContact }: { open: boolean; onClose: () => void; onContact: (topic: string) => void }) {
  const [tab, setTab] = useState("story");
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="About DerivX"
      subtitle="Third-party automation layer built on Deriv's public WebSocket API"
      footer={
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 w-100">
          <span className="dx-help">DerivX Labs · independent of Deriv Group Services Ltd.</span>
          <div className="d-flex gap-2">
            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => onContact("partnership")}>
              Partner with us
            </button>
            <button type="button" className="dx-btn dx-btn-sm" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      }
    >
      <Tabs tabs={ABOUT_TABS} active={tab} onChange={setTab} className="mb-4" />

      {tab === "story" ? (
        <div className="d-grid gap-3">
          <p className="dx-text-dim mb-0" style={{ fontSize: "0.88rem" }}>
            DerivX started as a personal martingale bot written for one Volatility 10 account. The problem was never placing the
            trade — it was keeping the risk ceiling honest after the third losing streak. So the first thing we built was the risk
            engine, and the second was the log that proves what happened.
          </p>
          <p className="dx-text-dim mb-0" style={{ fontSize: "0.88rem" }}>
            Today the platform covers 19 instruments, 11 contract types, a sandboxed script engine, copy trading with reconciled
            statements and an investor module for pooled capital. It still trades through Deriv's own API, so your money never
            leaves your Deriv account.
          </p>
          <Alert tone="info" title="What we are not">
            Not a broker, not a fund, not a signal group. We do not hold client funds, we do not take profit share, and we do not
            promise returns.
          </Alert>
        </div>
      ) : null}

      {tab === "stack" ? (
        <div className="row g-3">
          {[
            { k: "Frontend", v: "TanStack Start + React 19" },
            { k: "Styling", v: "Bootstrap 5.3 + scoped token CSS" },
            { k: "Charts", v: "Lightweight SVG widgets" },
            { k: "Realtime", v: "Deriv WebSocket + internal relay" },
            { k: "Bot workers", v: "Isolated queue per bot, idempotent retries" },
            { k: "Script runtime", v: "VM2 isolate, deterministic replay" },
            { k: "Risk engine", v: "Pre-proposal assertions, 5 checks" },
            { k: "Storage", v: "Encrypted tokens, 90-day telemetry, 7-year orders" },
          ].map((row) => (
            <div className="col-12 col-sm-6" key={row.k}>
              <div className="dx-card-inset">
                <div className="dx-kpi-label">{row.k}</div>
                <div className="fw-semibold" style={{ fontSize: "0.86rem" }}>
                  {row.v}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "roadmap" ? (
        <div className="d-grid gap-2">
          {[
            { phase: "Phase 1 — MVP", status: "shipped", items: "Landing page, auth, dashboard overview, markets, trade, connections" },
            { phase: "Phase 2 — Bots & scripts", status: "shipped", items: "Bot manager, creator, detail monitor, script editor, presets" },
            { phase: "Phase 3 — Automation & analytics", status: "in progress", items: "Automation hub, analytics, backtest runner, 2FA" },
            { phase: "Phase 4 — Social & polish", status: "next", items: "Copy trading, leaderboard, activity feed, settings" },
            { phase: "Phase 5 — Scale", status: "planned", items: "Multi-worker scaling, AI adaptive strategy, public API, mobile" },
          ].map((r) => (
            <div className="dx-card-inset d-flex align-items-start gap-3" key={r.phase}>
              <GitBranch size={15} className="dx-muted mt-1" />
              <div className="flex-grow-1">
                <div className="d-flex align-items-center gap-2">
                  <span className="fw-semibold" style={{ fontSize: "0.86rem" }}>
                    {r.phase}
                  </span>
                  <span className={`dx-chip ${r.status === "shipped" ? "dx-chip-up" : r.status === "in progress" ? "dx-chip-warn" : "dx-chip-muted"}`}>
                    {r.status}
                  </span>
                </div>
                <div className="dx-help">{r.items}</div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "numbers" ? (
        <div className="row g-3">
          {[
            { k: "Registered traders", v: STATS.traders.toLocaleString("en-US") },
            { k: "Bots live now", v: STATS.botsLive.toLocaleString("en-US") },
            { k: "Contracts settled", v: STATS.contractsSettled.toLocaleString("en-US") },
            { k: "Instruments", v: `${STATS.assets}` },
            { k: "Contract types", v: `${STATS.contractTypes}` },
            { k: "Median tick latency", v: `${STATS.avgTickLatencyMs} ms` },
            { k: "Countries", v: `${STATS.countries}` },
            { k: "Presets", v: `${STRATEGY_PRESETS.length}` },
          ].map((row) => (
            <div className="col-6 col-lg-3" key={row.k}>
              <div className="dx-card-inset">
                <div className="dx-kpi-label">{row.k}</div>
                <div className="font-display fw-semibold">{row.v}</div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </Dialog>
  );
}

export function ChangelogDialog({ open, onClose, onOpenCommunity }: { open: boolean; onClose: () => void; onOpenCommunity: () => void }) {
  const [kind, setKind] = useState("all");
  const list = kind === "all" ? CHANGELOG : CHANGELOG.filter((c) => c.kind === kind);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Changelog"
      subtitle="Platform releases — newest first"
      footer={
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 w-100">
          <span className="dx-help">{CHANGELOG.length} releases documented</span>
          <div className="d-flex gap-2">
            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={onOpenCommunity}>
              Discuss releases
            </button>
            <button type="button" className="dx-btn dx-btn-sm" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      }
    >
      <FilterChips
        options={[
          { id: "feature", label: "Features" },
          { id: "fix", label: "Fixes" },
          { id: "security", label: "Security" },
        ]}
        value={kind}
        onChange={setKind}
        allLabel="Everything"
      />
      <div className="d-grid gap-3 mt-3">
        {list.map((c, i) => (
          <Reveal key={`${c.v}-${i}`} delay={i * 30}>
            <div className="dx-card-inset">
              <div className="d-flex flex-wrap align-items-center gap-2">
                <span className="dx-chip dx-chip-accent font-display">{c.v}</span>
                <span className="dx-help font-display">{c.date}</span>
                <span className={`dx-chip ${c.kind === "feature" ? "dx-chip-up" : c.kind === "fix" ? "dx-chip-info" : "dx-chip-warn"}`}>
                  {c.kind}
                </span>
              </div>
              <ul className="dx-help mt-2 mb-0 ps-3 d-grid gap-1">
                {c.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>
    </Dialog>
  );
}

/** Route registry for the sitemap dialog — mirrors COMPLETE PAGE INDEX. */
type ReadyRoute =
  | "/" | "/features"
  | "/auth/signup" | "/auth/signin" | "/auth/deriv/callback"
  | "/dashboard" | "/dashboard/markets" | "/dashboard/trade" | "/dashboard/bots"
  | "/auth/forgot-password" | "/auth/reset-password" | "/auth/verify-email" | "/auth/2fa";

const ROUTE_INDEX: { group: string; id: string; route: string; title: string; ready: boolean; to?: ReadyRoute }[] = [
  { group: "Home", id: "H-1", route: "/ · /home", title: "Landing page", ready: true, to: "/" },
  { group: "Home", id: "H-2", route: "/features", title: "Features deep dive", ready: true, to: "/features" },
  { group: "Home", id: "H-3", route: "/pricing", title: "Pricing & plans", ready: false },
  { group: "Auth", id: "A-1", route: "/auth/signup", title: "Sign up", ready: true, to: "/auth/signup" },
  { group: "Auth", id: "A-2", route: "/auth/signin", title: "Sign in", ready: true, to: "/auth/signin" },
  { group: "Auth", id: "A-3", route: "/auth/deriv/callback", title: "Deriv OAuth callback", ready: true, to: "/auth/deriv/callback" },
  { group: "Auth", id: "A-4", route: "/auth/forgot-password", title: "Forgot password", ready: true, to: "/auth/forgot-password" },
  { group: "Auth", id: "A-5", route: "/auth/reset-password", title: "Reset password", ready: true, to: "/auth/reset-password" },
  { group: "Auth", id: "A-6", route: "/auth/verify-email", title: "Email verification", ready: true, to: "/auth/verify-email" },
  { group: "Auth", id: "A-7", route: "/auth/2fa", title: "Two-factor authentication", ready: true, to: "/auth/2fa" },
  { group: "Dashboard", id: "D-1", route: "/dashboard", title: "Overview hub", ready: true, to: "/dashboard" },
  { group: "Dashboard", id: "D-2", route: "/dashboard/markets", title: "Markets browser", ready: true, to: "/dashboard/markets" },
  { group: "Dashboard", id: "D-3", route: "/dashboard/trade", title: "Trade execution", ready: true, to: "/dashboard/trade" },
  { group: "Dashboard", id: "D-4", route: "/dashboard/bots", title: "Bot management", ready: true, to: "/dashboard/bots" },
  { group: "Dashboard", id: "D-5", route: "/dashboard/bots/new", title: "Bot creator", ready: false },
  { group: "Dashboard", id: "D-6", route: "/dashboard/scripts", title: "Script editor", ready: false },
  { group: "Dashboard", id: "D-7", route: "/dashboard/automation", title: "Automation hub", ready: false },
  { group: "Dashboard", id: "D-8", route: "/dashboard/portfolio", title: "Portfolio", ready: false },
  { group: "Dashboard", id: "D-9", route: "/dashboard/social", title: "Social monitoring", ready: false },
  { group: "Dashboard", id: "D-10", route: "/dashboard/analytics", title: "Analytics", ready: false },
  { group: "Dashboard", id: "D-11", route: "/dashboard/connections", title: "API connections", ready: false },
  { group: "Dashboard", id: "D-12", route: "/dashboard/settings", title: "Settings", ready: false },
  { group: "Dashboard", id: "D-13", route: "/dashboard/bots/:id", title: "Bot detail", ready: false },
  { group: "Dashboard", id: "D-14", route: "/dashboard/backtest", title: "Backtest runner", ready: false },
  { group: "Investor", id: "I-1", route: "/investors", title: "Investor hub", ready: false },
  { group: "Investor", id: "I-2", route: "/investors/pools", title: "Pool trade plans", ready: false },
  { group: "Investor", id: "I-3", route: "/investors/pools/new", title: "Create pool plan", ready: false },
  { group: "Investor", id: "I-4", route: "/investors/pools/:id", title: "Pool detail", ready: false },
  { group: "Investor", id: "I-5", route: "/investors/schedules", title: "Trade schedules", ready: false },
  { group: "Investor", id: "I-6", route: "/investors/funds", title: "Funds / paid-in", ready: false },
  { group: "Investor", id: "I-7", route: "/investors/investors", title: "Investor directory", ready: false },
  { group: "Investor", id: "I-8", route: "/investors/payouts", title: "Payout manager", ready: false },
  { group: "Investor", id: "I-9", route: "/investors/analytics", title: "Investor analytics", ready: false },
  { group: "Investor", id: "I-10", route: "/investors/documents", title: "Documents & compliance", ready: false },
  { group: "Investor", id: "I-11", route: "/investors/communications", title: "Communications", ready: false },
  { group: "Investor", id: "I-12", route: "/investors/settings", title: "Portal settings", ready: false },
];

export function SitemapDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [group, setGroup] = useState("all");
  const list = group === "all" ? ROUTE_INDEX : ROUTE_INDEX.filter((r) => r.group === group.toLowerCase());
  const built = ROUTE_INDEX.filter((r) => r.ready).length;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Route index"
      subtitle={`${ROUTE_INDEX.length} planned pages · ${built} built (H-group, full auth family, D-1–D-4). Built routes open their real page; unbuilt routes are gated — they render no links anywhere.`}
      footer={
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 w-100">
          <span className="dx-help">Gating lives in the shell nav config (ready flags), so no 404 is ever reachable.</span>
          <button type="button" className="dx-btn dx-btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      }
    >
      <FilterChips
        options={[
          { id: "home", label: "Home (3)" },
          { id: "auth", label: "Auth (7)" },
          { id: "dashboard", label: "Dashboard (14)" },
          { id: "investor", label: "Investor (12)" },
        ]}
        value={group}
        onChange={setGroup}
        allLabel="All 36"
      />

      <div className="dx-table-wrap mt-3 dx-table-scroll">
        <table className="dx-table dx-table-sm dx-table-stack">
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Route</th>
              <th scope="col">Page</th>
              <th scope="col" className="dx-td-actions">
                Open
              </th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id}>
                <td data-label="ID" className="font-display">
                  {r.id}
                </td>
                <td data-label="Route" className="font-display">
                  {r.route}
                </td>
                <td data-label="Page">{r.title}</td>
                <td data-label="Open" className="dx-td-actions">
                  {r.ready && r.to ? (
                    <Link to={r.to} className="dx-btn dx-btn-sm dx-btn-primary" onClick={onClose}>
                      <ExternalLink size={12} /> open
                    </Link>
                  ) : (
                    <span className="dx-chip dx-chip-muted">
                      <Lock size={11} /> not built
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// Community channels
// -----------------------------------------------------------------------------
export function CommunityDialog({
  open,
  onClose,
  initialChannel,
  onContact,
  onLeaderboard,
}: {
  open: boolean;
  onClose: () => void;
  initialChannel?: string;
  onContact: (topic: string) => void;
  onLeaderboard: () => void;
}) {
  const [channelId, setChannelId] = useState(initialChannel ?? COMMUNITY_CHANNELS[0].id);
  const [joined, setJoined] = useState<string[]>([COMMUNITY_CHANNELS[0].id]);
  const [showRules, setShowRules] = useState(false);
  const channel = COMMUNITY_CHANNELS.find((c) => c.id === channelId) ?? COMMUNITY_CHANNELS[0];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="xl"
      title="Community"
      subtitle={`${COMMUNITY_CHANNELS.length} moderated channels · ${COMMUNITY_CHANNELS.reduce((s, c) => s + c.members, 0).toLocaleString("en-US")} members · ${COMMUNITY_CHANNELS.reduce((s, c) => s + c.messages24h, 0).toLocaleString("en-US")} messages in the last 24h`}
      footer={
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 w-100">
          <span className="dx-help">Channels are moderated — no signal selling, no account access requests.</span>
          <div className="d-flex gap-2">
            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={onLeaderboard}>
              Leaderboard
            </button>
            <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => onContact("community")}>
              <MessageSquare size={13} /> Ask in #{channel.name.toLowerCase().replace(/\s+/g, "-")}
            </button>
          </div>
        </div>
      }
    >
      <div className="row g-3">
        <div className="col-12 col-lg-4">
          <div className="d-grid gap-2">
            {COMMUNITY_CHANNELS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`dx-list-row w-100 text-start ${c.id === channelId ? "border-secondary" : ""}`}
                onClick={() => setChannelId(c.id)}
                style={c.id === channelId ? { borderColor: "var(--dx-accent)" } : undefined}
              >
                <span className="flex-grow-1">
                  <span className="d-flex align-items-center gap-2">
                    <span className="fw-semibold" style={{ fontSize: "0.86rem" }}>
                      #{c.name}
                    </span>
                    {joined.includes(c.id) ? <Check size={12} className="dx-up" /> : null}
                  </span>
                  <span className="dx-help">
                    {c.members.toLocaleString("en-US")} members · {c.messages24h} today
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="col-12 col-lg-8">
          <div className="dx-card-inset h-100">
            <div className="d-flex flex-wrap align-items-start justify-content-between gap-2">
              <div>
                <h3 className="dx-h-card">#{channel.name}</h3>
                <p className="dx-help mb-0">{channel.description}</p>
              </div>
              <div className="d-flex flex-wrap gap-2">
                <Chip tone={channel.moderated ? "up" : "warn"}>{channel.moderated ? "moderated" : "unmoderated"}</Chip>
                <button
                  type="button"
                  className={`dx-btn dx-btn-sm ${joined.includes(channel.id) ? "dx-btn-ghost" : "dx-btn-primary"}`}
                  onClick={() =>
                    setJoined((list) => (list.includes(channel.id) ? list.filter((id) => id !== channel.id) : [...list, channel.id]))
                  }
                >
                  {joined.includes(channel.id) ? "Leave channel" : "Join channel"}
                </button>
              </div>
            </div>

            <hr className="dx-hr" />

            <div className="d-flex flex-wrap gap-2">
              {channel.topics.map((t) => (
                <Chip key={t} tone="muted">
                  {t}
                </Chip>
              ))}
            </div>

            <div className="row g-3 mt-1">
              <div className="col-6">
                <div className="dx-card-inset">
                  <div className="dx-kpi-label">Members</div>
                  <div className="font-display fw-semibold">{channel.members.toLocaleString("en-US")}</div>
                </div>
              </div>
              <div className="col-6">
                <div className="dx-card-inset">
                  <div className="dx-kpi-label">24h messages</div>
                  <div className="font-display fw-semibold">{channel.messages24h}</div>
                </div>
              </div>
            </div>

            <div className="d-flex flex-wrap gap-2 mt-3">
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setShowRules((v) => !v)}>
                {showRules ? "Hide rules" : "Channel rules"}
              </button>
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => onContact("community")}>
                Post a question
              </button>
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={onLeaderboard}>
                See who is ranked
              </button>
            </div>

            {showRules ? (
              <ul className="dx-help mt-3 mb-0 ps-3 d-grid gap-1">
                <li>No account credentials, tokens or payment details — ever.</li>
                <li>No profit guarantees, refund offers or signal subscriptions.</li>
                <li>Backtest claims need parameters, symbol and date range.</li>
                <li>Disagreement is fine; personal attacks are not.</li>
              </ul>
            ) : null}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// Contact dialog
// -----------------------------------------------------------------------------
export function ContactDialog({
  open,
  onClose,
  topic = "support",
  onOpenCommunity,
}: {
  open: boolean;
  onClose: () => void;
  topic?: string;
  onOpenCommunity: () => void;
}) {
  const [form, setForm] = useState({ topic, name: "", email: "", loginId: "", message: "", urgency: "normal" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Tell us who you are.";
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(form.email)) next.email = "A valid email is required for the reply.";
    if (form.message.trim().length < 20) next.message = "Add a little more detail (at least 20 characters).";
    if (form.loginId && !/^(CR|VRTC|MX)\d{6,8}$/.test(form.loginId.toUpperCase()))
      next.loginId = "Deriv login IDs look like CR8842197, VRTC9031442 or MX5510883.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const ref = `DX-${(Math.abs(form.email.length * 7919 + form.message.length * 131) % 90000 + 10000).toString()}`;
    setSent(ref);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={sent ? "Request received" : "Talk to a human"}
      subtitle={
        sent
          ? "A copy is on its way to your inbox — the reference below works on every channel."
          : "Support, sales, partnerships, legal. Attach your Deriv login ID and we can pull the connection log before replying."
      }
      footer={
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 w-100">
          <span className="dx-help">Median first reply: 3h 12m on business days</span>
          <div className="d-flex gap-2">
            <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={onOpenCommunity}>
              <Users size={13} /> Community instead
            </button>
            {sent ? (
              <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={onClose}>
                Done
              </button>
            ) : (
              <button type="submit" form="contact-form" className="dx-btn dx-btn-sm dx-btn-primary">
                <Send size={13} /> Send request
              </button>
            )}
          </div>
        </div>
      }
    >
      {sent ? (
        <div className="d-grid gap-3">
          <Alert tone="up" title={`Reference ${sent}`}>
            Your request is queued. Replies come from support@derivx.example — add that address to your allow list if you use a
            filter.
          </Alert>
          <div className="row g-3">
            {[
              { k: "Topic", v: form.topic },
              { k: "Name", v: form.name },
              { k: "Email", v: form.email },
              { k: "Deriv login ID", v: form.loginId || "not provided" },
              { k: "Urgency", v: form.urgency },
              { k: "Channel", v: "web form" },
            ].map((row) => (
              <div className="col-6" key={row.k}>
                <div className="dx-card-inset">
                  <div className="dx-kpi-label">{row.k}</div>
                  <div className="fw-semibold" style={{ fontSize: "0.84rem", wordBreak: "break-word" }}>
                    {row.v}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <CodeBlock
            code={`Subject: [${sent}] ${form.topic}\n\n${form.message}`}
            maxHeight={160}
          />
          <div className="d-flex flex-wrap gap-2">
            <CopyButton text={`Reference: ${sent}\nTopic: ${form.topic}\nFrom: ${form.email}\n\n${form.message}`} label="Copy transcript" />
            <button
              type="button"
              className="dx-btn dx-btn-sm dx-btn-ghost"
              onClick={() => {
                setSent(null);
                setForm({ topic, name: "", email: "", loginId: "", message: "", urgency: "normal" });
              }}
            >
              Send another request
            </button>
          </div>
        </div>
      ) : (
        <form id="contact-form" className="d-grid gap-3" onSubmit={submit} noValidate>
          <div className="row g-3">
            <div className="col-12 col-sm-6">
              <Field label="Topic" required>
                <select className="dx-select" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}>
                  <option value="support">Trading / bot support</option>
                  <option value="sales">Sales &amp; onboarding</option>
                  <option value="partnership">Partnership / IB</option>
                  <option value="legal">Legal / compliance</option>
                  <option value="community">Community moderation</option>
                </select>
              </Field>
            </div>
            <div className="col-12 col-sm-6">
              <Field label="Urgency" help="Emergency covers live-money incidents only.">
                <select className="dx-select" value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })}>
                  <option value="normal">Normal</option>
                  <option value="high">High — bot misbehaving</option>
                  <option value="emergency">Emergency — live funds at risk</option>
                </select>
              </Field>
            </div>
            <div className="col-12 col-sm-6">
              <Field label="Your name" required error={errors.name}>
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
            <div className="col-12">
              <Field label="Deriv login ID" error={errors.loginId} help="Optional — CR / VRTC / MX format lets us pull your connection log.">
                <input
                  className={`dx-input font-display ${errors.loginId ? "is-invalid" : ""}`}
                  value={form.loginId}
                  onChange={(e) => setForm({ ...form, loginId: e.target.value.toUpperCase() })}
                  placeholder="VRTC9031442"
                />
              </Field>
            </div>
            <div className="col-12">
              <Field label="How can we help?" required error={errors.message} help={`${form.message.length}/600 characters`}>
                <textarea
                  className={`dx-textarea ${errors.message ? "is-invalid" : ""}`}
                  maxLength={600}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Describe the bot, symbol and time window — e.g. 'DCA bot on OTC_NDX paused at 14:02 UTC with an exposure-cap error'."
                />
              </Field>
            </div>
          </div>
          <Alert tone="info" title="We never ask for credentials">
            Support will never request your Deriv password, card details or 2FA codes. If someone does, it is not us.
          </Alert>
        </form>
      )}
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// Testimonial detail drawer
// -----------------------------------------------------------------------------
export function TestimonialDrawer({
  testimonialId,
  onClose,
  onOpenTrader,
  onOpenCommunity,
  onOpenPricing,
}: {
  testimonialId: string | null;
  onClose: () => void;
  onOpenTrader: (id: string) => void;
  onOpenCommunity: (channelId?: string) => void;
  onOpenPricing: () => void;
}) {
  const index = TESTIMONIALS.findIndex((t) => t.id === testimonialId);
  const [idx, setIdx] = useState(index >= 0 ? index : 0);
  const active = TESTIMONIALS[Math.min(idx, TESTIMONIALS.length - 1)];
  if (!testimonialId) return null;

  const trader = TRADERS.find((t) => t.loginId === active.loginId);
  const curve = equityCurve(28, active.id.length * 733 + idx * 17, 1400, 8 + idx);

  return (
    <Drawer
      open={Boolean(testimonialId)}
      onClose={onClose}
      wide
      title={`${active.flag} ${active.name}`}
      subtitle={`${active.role} · ${active.country} · joined ${active.joinedAt}`}
      footer={
        <div className="d-flex flex-wrap gap-2 w-100">
          <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}>
            Previous review
          </button>
          <button
            type="button"
            className="dx-btn dx-btn-sm dx-btn-ghost"
            onClick={() => setIdx((i) => Math.min(TESTIMONIALS.length - 1, i + 1))}
            disabled={idx === TESTIMONIALS.length - 1}
          >
            Next review
          </button>
          <span className="flex-grow-1" />
          {trader ? (
            <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => onOpenTrader(trader.id)}>
              Open on the leaderboard
            </button>
          ) : (
            <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => onOpenCommunity("com_help")}>
              Ask them in the community
            </button>
          )}
        </div>
      }
    >
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <Chip tone={active.verified ? "up" : "warn"}>
          {active.verified ? <BadgeCheck size={12} /> : null} {active.verified ? "statement verified" : "verification pending"}
        </Chip>
        <Chip tone="muted">{active.segment}</Chip>
        <Chip tone="info">{active.loginId}</Chip>
      </div>

      <p className="dx-lead" style={{ fontSize: "0.95rem" }}>
        “{active.quote}”
      </p>

      <div className="row g-3 mt-1">
        {[
          { k: "Win rate", v: `${active.winRate}%` },
          { k: "Monthly P&L", v: pnl(active.monthlyPnl) },
          { k: "Automation hours", v: `${active.automationHours}h` },
          { k: "Bots running", v: `${active.botsRunning}` },
        ].map((row) => (
          <div className="col-6" key={row.k}>
            <div className="dx-card-inset">
              <div className="dx-kpi-label">{row.k}</div>
              <div className="font-display fw-semibold">{row.v}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="dx-card-inset mt-3">
        <div className="dx-kpi-label mb-1">In their own words</div>
        <p className="dx-help mb-0">{active.detail}</p>
      </div>

      <div className="dx-card-inset mt-3">
        <div className="dx-kpi-label mb-2">Simulated equity curve</div>
        <LineChart data={curve} height={170} yFormat={(v) => usd(v, 0)} ariaLabel="Reviewer equity curve" />
      </div>

      <div className="dx-card-inset mt-3">
        <div className="d-flex align-items-center gap-2">
          <Avatar name={active.name} tone="teal" />
          <div className="flex-grow-1">
            <div className="fw-semibold" style={{ fontSize: "0.88rem" }}>
              {active.name}
            </div>
            <div className="dx-help">
              {active.segment} · {active.botsRunning} bots · {active.automationHours}h automated
            </div>
          </div>
          <Sparkline data={curve.slice(-12)} tone="up" height={34} ariaLabel="Recent performance" />
        </div>
      </div>

      <div className="d-flex flex-wrap gap-2 mt-3">
        <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={onOpenPricing}>
          Compare tiers
        </button>
        <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => onOpenCommunity("com_general")}>
          Discuss their strategy
        </button>
        <Link to="/" className="dx-btn dx-btn-sm dx-btn-ghost">
          <BookOpen size={13} /> Back to overview
        </Link>
      </div>
    </Drawer>
  );
}

// -----------------------------------------------------------------------------
// Small helpers reused by the landing page (avoid recomputing headline stats)
// -----------------------------------------------------------------------------
export const PRICING_TEASER = PLANS.filter((p) => p.popular).map((p) => `${p.name} — ${usd(p.price, 0)}/${p.cadence}`);
export const BACKTEST_COUNT = BACKTESTS.length;
export const CONTRACT_TYPE_COUNT = CONTRACT_TYPES.length;
export const SYMBOL_COUNT = MARKET_SYMBOLS.length;
export const BOT_COUNT = BOTS.length;
