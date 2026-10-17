/* =============================================================================
   D-6 · Script Editor overlay library (/dashboard/scripts & /dashboard/scripts/:id)
   Blueprint: tradeMO.md §5 PAGE D-6.

   Every dialog/drawer/wizard the Script Studio opens lives here so the page file
   stays readable: script CRUD, template gallery, sandbox limits, API reference,
   save-conflict + save-blocked guards, test runner, version control (diff,
   rollback, branches, merge), dependencies + module stubs, profiler, debugger,
   AI assistant, snippets, console, editor prefs, publish wizard.
   ============================================================================= */
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  Ban,
  BookOpen,
  Bug,
  CheckCircle2,
  Code2,
  Copy,
  Download,
  Eye,
  FileCode2,
  GitBranch,
  GitMerge,
  Gauge,
  History,
  Layers,
  Lock,
  Play,
  Plus,
  Rocket,
  RotateCcw,
  Search,
  Share2,
  Shield,
  Sparkles,
  Star,
  Terminal,
  Trash2,
  Upload,
  Wand2,
  XCircle,
  Zap,
} from "lucide-react";
import {
  Alert,
  Chip,
  CodeBlock,
  CopyButton,
  Dialog,
  Drawer,
  Dropdown,
  EmptyState,
  Field,
  FilterChips,
  Meter,
  MiniTabs,
  Pagination,
  Progress,
  SearchInput,
  StatCard,
  Stepper,
  Tabs,
  Toggle,
} from "../ui/primitives";
import { DataTable, useDataTable } from "../ui/data-table";
import { LineChart } from "../ui/charts";
import { pct, usd } from "../../data/market";
import {
  AI_CODE_PROMPTS,
  SCRIPTS,
  API_REFERENCE,
  COMMUNITY_TEMPLATES,
  FORBIDDEN_APIS,
  SCRIPT_BRANCHES,
  SCRIPT_DEPENDENCIES,
  SCRIPT_EDITOR_ROWS,
  SCRIPT_EVENTS,
  SCRIPT_PROFILE_FRAMES,
  SCRIPT_RUNS,
  SCRIPT_SNIPPETS,
  SCRIPT_TESTS,
  SCRIPT_TEMPLATES,
  SCRIPT_VERSIONS,
  analyzeScript,
  dependencyGraphOf,
  diffCode,
  profileScript,
  runScriptSandbox,
  runScriptSuite,
  scriptById,
  scriptMetaOf,
  scriptParamsOf,
  scriptSource,
  type AnalysisResult,
  type CommunityTemplate,
  type ProfileFrame,
  type Script,
  type ScriptBranch,
  type ScriptDependency,
  type ScriptEvent,
  type ScriptIssue,
  type ScriptParam,
  type ScriptRun,
  type ScriptTestCase,
  type ScriptVersion,
  type SandboxRun,
} from "../../data/trading";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
export interface Breakpoint {
  id: string;
  line: number;
  condition: string;
  hits: number;
  enabled: boolean;
}

export interface EditorPrefs {
  contrast: "normal" | "high";
  reduceMotion: boolean;
  autosaveMs: number;
  fontSize: number;
  syntaxWorker: boolean;
}

export type ScriptOverlay =
  | { kind: "new-script"; from?: string }
  | { kind: "script-detail"; id: string }
  | { kind: "script-delete"; id: string }
  | { kind: "script-duplicate"; id: string }
  | { kind: "script-export"; id: string }
  | { kind: "script-import" }
  | { kind: "script-assign"; id: string }
  | { kind: "script-health" }
  | { kind: "script-events"; id?: string }
  | { kind: "bulk-scripts"; ids: string[] }
  | { kind: "template-gallery"; category?: string }
  | { kind: "template-detail"; id: string; source: "sdk" | "community" }
  | { kind: "api-reference" }
  | { kind: "sandbox-limits" }
  | { kind: "save-confirm" }
  | { kind: "save-blocked" }
  | { kind: "test-run" }
  | { kind: "test-suite" }
  | { kind: "test-case"; id: string }
  | { kind: "script-backtest" }
  | { kind: "run-detail"; id: string }
  | { kind: "versions" }
  | { kind: "version-diff"; a: string; b: string }
  | { kind: "rollback"; id: string }
  | { kind: "branches" }
  | { kind: "branch-create" }
  | { kind: "branch-merge"; id: string }
  | { kind: "dependencies" }
  | { kind: "dependency-add" }
  | { kind: "module-stub"; module: string }
  | { kind: "profiler" }
  | { kind: "debugger" }
  | { kind: "breakpoint"; line: number }
  | { kind: "ai-assistant" }
  | { kind: "ai-explain"; line: number }
  | { kind: "snippets" }
  | { kind: "console-full" }
  | { kind: "editor-prefs" }
  | { kind: "keyboard-help" }
  | { kind: "publish" }
  | { kind: "discard-changes" }
  | { kind: "params" }
  | null;

export interface ScriptOverlayProps {
  overlay: ScriptOverlay;
  setOverlay: (o: ScriptOverlay) => void;
  script: Script | null;
  code: string;
  appliedCode: string;
  analysis: AnalysisResult;
  run: SandboxRun | null;
  setRun: (r: SandboxRun | null) => void;
  scripts: Script[];
  suite: { rows: ScriptTestCase[]; passed: number; failed: number; ms: number } | null;
  setSuite: (s: { rows: ScriptTestCase[]; passed: number; failed: number; ms: number } | null) => void;
  breakpoints: Breakpoint[];
  setBreakpoints: (b: Breakpoint[]) => void;
  prefs: EditorPrefs;
  setPrefs: (p: Partial<EditorPrefs>) => void;
  events: ScriptEvent[];
  pushEvent: (e: Omit<ScriptEvent, "id" | "atMin">) => void;
  notify: (tone: "success" | "error" | "info" | "warn", title: string, body?: string) => void;
  onCreate: (draft: { name: string; symbol: string; language: Script["language"]; code: string; tags: string[] }) => void;
  onSave: (opts?: { force?: boolean }) => void;
  onDiscard: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string, name: string) => void;
  onRollback: (version: ScriptVersion) => void;
  onReplaceCode: (code: string) => void;
  onInsertSnippet: (code: string) => void;
  onInsertAtLine: (line: number, code: string) => void;
  onApplyFix: (issue: ScriptIssue) => void;
  onToggleBreakpoint: (line: number, condition?: string) => void;
  onAssign: (scriptId: string, botName: string) => void;
  onPublish: (payload: { name: string; category: string; license: string; description: string; price: number }) => void;
  onExportRun: (run: SandboxRun) => void;
  goScript: (id: string) => void;
}

export const DEFAULT_BREAKPOINTS: Breakpoint[] = [
  { id: "bp_01", line: 14, condition: "", hits: 3, enabled: true },
  { id: "bp_02", line: 18, condition: "stake > 5", hits: 0, enabled: false },
];

// -----------------------------------------------------------------------------
// Shared helpers
// -----------------------------------------------------------------------------
function ago(minutes: number): string {
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

function healthTone(h: string): "up" | "warn" | "down" | "muted" {
  return h === "healthy" ? "up" : h === "warning" ? "warn" : h === "error" ? "down" : "muted";
}

function runTone(status: string): "up" | "warn" | "down" | "muted" | "info" {
  if (status === "ok") return "up";
  if (status === "queued") return "info";
  if (status === "timeout" || status === "memory") return "warn";
  if (status === "forbidden" || status === "syntax") return "down";
  return "muted";
}

function issueTone(severity: string): "down" | "warn" | "info" {
  return severity === "error" ? "down" : severity === "warning" ? "warn" : "info";
}

function issueIcon(rule: string) {
  if (rule === "forbidden") return <Ban size={13} />;
  if (rule === "syntax") return <Bug size={13} />;
  if (rule === "module") return <Layers size={13} />;
  if (rule === "perf") return <Gauge size={13} />;
  return <AlertTriangle size={13} />;
}

/** API reference list — reused by the sidebar and the full reference dialog. */
export function ApiReferenceList({
  query,
  group,
  onPick,
  compact = false,
}: {
  query: string;
  group: string;
  onPick: (name: string) => void;
  compact?: boolean;
}) {
  const rows = API_REFERENCE.filter((a) => (group === "all" || a.group === group) && (a.name + a.signature + a.description).toLowerCase().includes(query.toLowerCase()));
  if (!rows.length) return <EmptyState title="No API symbols match" message="Try tick, stake, balance or log — the reference covers every sandbox symbol." icon={<BookOpen size={18} />} />;
  return (
    <div className="d-grid gap-2">
      {rows.map((a) => (
        <button key={a.id} type="button" className="dx-api-row" onClick={() => onPick(a.name)}>
          <span className="d-flex align-items-center gap-2">
            <span className="font-display fw-semibold">{a.name}</span>
            {a.restricted ? <Chip tone="warn"><Lock size={10} /> restricted</Chip> : null}
            <span className="dx-help ms-auto font-display">{a.since}</span>
          </span>
          <span className="dx-help">{a.signature}</span>
          {!compact ? <span className="dx-help">{a.description}</span> : null}
        </button>
      ))}
    </div>
  );
}

/** Snippet palette — Ctrl+Space inserts the block at the cursor. */
export function SnippetList({ query, onPick }: { query: string; onPick: (code: string, name: string) => void }) {
  const rows = SCRIPT_SNIPPETS.filter((s) => (s.name + s.description + s.category).toLowerCase().includes(query.toLowerCase()));
  if (!rows.length) return <EmptyState title="No snippets match" message="Snippets cover entries, indicators, recovery steps and risk guards." icon={<Zap size={18} />} />;
  return (
    <div className="d-grid gap-2">
      {rows.map((s) => (
        <button key={s.id} type="button" className="dx-api-row" onClick={() => onPick(s.code, s.name)}>
          <span className="d-flex align-items-center gap-2">
            <Zap size={12} />
            <span className="fw-semibold">{s.name}</span>
            <Chip tone="muted">{s.category}</Chip>
            <span className="dx-help ms-auto font-display">{s.shortcut}</span>
          </span>
          <span className="dx-help">{s.description}</span>
        </button>
      ))}
    </div>
  );
}

/** Sandbox console — role="log" + aria-live on the page, reused inside overlays. */
export function ConsoleLines({ lines, filter = "all" }: { lines: string[]; filter?: string }) {
  const rows = lines.filter((l) => {
    if (filter === "all") return true;
    if (filter === "error") return /error/i.test(l);
    if (filter === "warn") return /warn|abort|timeout/i.test(l);
    return /info/i.test(l);
  });
  if (!rows.length) return <span className="dx-help">No output on this channel yet — run a test to stream the tape.</span>;
  return (
    <>
      {rows.map((l, i) => {
        const tone = /error/i.test(l) ? "is-error" : /warn|abort|timeout/i.test(l) ? "is-warn" : /WIN|\+/i.test(l) ? "is-ok" : "";
        return (
          <div key={`${i}-${l.slice(0, 10)}`} className={`dx-console-line ${tone}`}>
            <span className="dx-console-tag">{l.slice(0, l.indexOf(" ") + 1) || "info"}</span>
            <span>{l.slice(l.indexOf(" ") + 1)}</span>
          </div>
        );
      })}
    </>
  );
}

// =============================================================================
// 1 — NEW SCRIPT WIZARD (3 steps: template → configure → review)
// =============================================================================
function NewScriptWizard({
  from,
  scripts,
  onClose,
  onCreate,
  onGallery,
}: {
  from?: string;
  scripts: Script[];
  onClose: () => void;
  onCreate: (draft: { name: string; symbol: string; language: Script["language"]; code: string; tags: string[] }) => void;
  onGallery: () => void;
}) {
  const seedTpl = SCRIPT_TEMPLATES.find((t) => t.id === from);
  const seedCommunity = COMMUNITY_TEMPLATES.find((t) => t.id === from);
  const [step, setStep] = useState(0);
  const [choice, setChoice] = useState<string>(seedTpl?.id ?? seedCommunity?.id ?? "");
  const [name, setName] = useState(seedTpl?.name ?? seedCommunity?.name ?? "");
  const [symbol, setSymbol] = useState(seedTpl?.symbol ?? seedCommunity?.symbol ?? "R_10");
  const [language, setLanguage] = useState<Script["language"]>("JavaScript");
  const [tags, setTags] = useState("custom");
  const code = seedTpl?.code ?? seedCommunity?.code ?? SCRIPT_SNIPPETS[0].code;
  const analysis = useMemo(() => analyzeScript("new", code), [code]);
  const nameError = name.trim().length < 4 ? "Give the script at least 4 characters." : scripts.some((s) => s.name.toLowerCase() === name.trim().toLowerCase()) ? "A script with that name already exists." : "";

  return (
    <Dialog
      open
      onClose={onClose}
      title="New script"
      subtitle="Start from a template or the blank engine skeleton — nothing runs until you test it"
      size="xl"
      footer={
        <div className="d-flex flex-wrap gap-2 justify-content-between w-100">
          <button type="button" className="dx-btn dx-btn-ghost" onClick={onGallery}>
            <Layers size={13} /> Browse the gallery
          </button>
          <div className="d-flex gap-2">
            <button type="button" className="dx-btn" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</button>
            {step < 2 ? (
              <button type="button" className="dx-btn dx-btn-primary" disabled={step === 0 && !choice} onClick={() => setStep((s) => s + 1)}>Continue</button>
            ) : (
              <button
                type="button"
                className="dx-btn dx-btn-primary"
                disabled={Boolean(nameError)}
                onClick={() => onCreate({ name: name.trim(), symbol, language, code, tags: tags.split(",").map((t) => t.trim()).filter(Boolean) })}
              >
                <Plus size={13} /> Create &amp; open editor
              </button>
            )}
          </div>
        </div>
      }
    >
      <nav role="navigation" aria-label="New script steps">
        <Stepper
          steps={[{ id: "template", label: "Template" }, { id: "configure", label: "Configure" }, { id: "review", label: "Review" }]}
          active={step}
          onStepClick={(i) => setStep(i <= 2 ? i : step)}
        />
      </nav>
      <div className="mt-3">
        {step === 0 ? (
          <>
            <SearchInput value="" onChange={() => undefined} placeholder="Pick from the six engine families below" />
            <div className="row g-2 mt-2">
              {SCRIPT_TEMPLATES.slice(0, 6).map((t) => (
                <div className="col-12 col-md-6 col-xl-4" key={t.id}>
                  <button
                    type="button"
                    className={`dx-tpl-card ${choice === t.id ? "is-selected" : ""}`}
                    aria-pressed={choice === t.id}
                    onClick={() => {
                      setChoice(t.id);
                      setName(t.name);
                      setSymbol(t.symbol);
                      setTags(t.category);
                    }}
                  >
                    <span className="d-flex align-items-center gap-2">
                      <FileCode2 size={14} />
                      <span className="fw-semibold">{t.name}</span>
                      <Chip tone="muted" >{t.difficulty}</Chip>
                    </span>
                    <span className="dx-help">{t.description}</span>
                    <span className="dx-help font-display">{t.symbol} · {t.lines} lines · ★ {t.rating.toFixed(1)}</span>
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : null}
        {step === 1 ? (
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <Field label="Script name" required error={nameError} help="Shown in the library, the bot configurator and the audit trail.">
                <input className="dx-input" value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
            </div>
            <div className="col-12 col-md-3">
              <Field label="Primary symbol" required>
                <select className="dx-select" value={symbol} onChange={(e) => setSymbol(e.target.value)}>
                  {["R_10", "R_25", "R_50", "R_75", "R_100", "1HZ10V", "frxEURUSD", "frxGBPUSD", "frxXAUUSD", "cryBTCUSD", "cryETHUSD"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="col-12 col-md-3">
              <Field label="Language" help="TypeScript is transpiled in the sandbox worker.">
                <select className="dx-select" value={language} onChange={(e) => setLanguage(e.target.value as Script["language"])}>
                  <option value="JavaScript">JavaScript</option>
                  <option value="TypeScript">TypeScript</option>
                </select>
              </Field>
            </div>
            <div className="col-12">
              <Field label="Tags" help="Comma separated — used by the library filters.">
                <input className="dx-input" value={tags} onChange={(e) => setTags(e.target.value)} />
              </Field>
            </div>
            <div className="col-12">
              <div className="dx-card-inset">
                <span className="dx-kpi-label">Starter source ({analysis.stats.lines} lines)</span>
                <CodeBlock code={code} maxHeight={200} />
              </div>
            </div>
          </div>
        ) : null}
        {step === 2 ? (
          <div className="d-grid gap-3">
            <dl className="dx-kv">
              <dt>Name</dt>
              <dd className="font-display">{name || "—"}</dd>
              <dt>Symbol</dt>
              <dd className="font-display">{symbol}</dd>
              <dt>Language</dt>
              <dd className="font-display">{language}</dd>
              <dt>Tags</dt>
              <dd className="font-display">{tags || "—"}</dd>
              <dt>Lines / bytes</dt>
              <dd className="font-display">{analysis.stats.lines} · {analysis.stats.bytes} B</dd>
              <dt>Declared parameters</dt>
              <dd className="font-display">{analysis.params.map((p) => p.key).join(", ") || "none"}</dd>
              <dt>Test cases</dt>
              <dd className="font-display">{analysis.tests.length}</dd>
            </dl>
            <Alert tone={analysis.blocked ? "warn" : "up"} title={analysis.blocked ? "Static analysis already flags errors" : "Static analysis is clean"}>
              {analysis.blocked
                ? `${analysis.issues.filter((i) => i.severity === "error").length} error(s) will block the first save — the editor opens on the offending lines.`
                : "The skeleton parses, declares its params and has no forbidden API usage."}
            </Alert>
            <span className="dx-help">
              The script is created as a draft: it is not attached to any bot and cannot trade until you save it with a clean analysis.
            </span>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}

/** Shared run table — sortable, searchable, paginated (used by the drawer and the editor). */
export function RunsTable({
  runs,
  onRowClick,
  ariaLabel,
  pageSize = 5,
}: {
  runs: ScriptRun[];
  onRowClick?: (runId: string) => void;
  ariaLabel: string;
  pageSize?: number;
}) {
  const state = useDataTable({
    rows: runs,
    searchKeys: (r) => [r.runLabel, r.botName, r.symbol, r.contractType, r.status, r.note],
    sorters: { started: (r) => -r.startedMin, pnl: (r) => r.pnl, trades: (r) => r.trades, memory: (r) => r.peakMemoryMb },
    filterKey: (r) => r.status,
    filterOptions: [
      { id: "ok", label: "Passed" },
      { id: "timeout", label: "Timeout" },
      { id: "memory", label: "Memory" },
      { id: "forbidden", label: "Forbidden" },
      { id: "syntax", label: "Syntax" },
      { id: "queued", label: "Queued" },
    ],
    initialSort: "started",
    initialPageSize: pageSize,
  });
  return (
    <>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
        <SearchInput value={state.query} onChange={state.setQuery} placeholder="Search run, bot, symbol…" />
        <FilterChips options={state.filterOptions} value={state.filter} onChange={state.setFilter} allLabel={`All (${runs.length})`} />
      </div>
      <DataTable
        ariaLabel={ariaLabel}
        state={state}
        rowKey={(r) => r.id}
        onRowClick={onRowClick ? (r) => onRowClick(r.id) : undefined}
        emptyState={<EmptyState title="No runs match" message="Clear the status filter or run the script from the editor." action={<button type="button" className="dx-btn" onClick={state.reset}>Reset filters</button>} />}
        columns={[
          { key: "started", header: "When", cell: (r) => <span className="font-display">{ago(r.startedMin)}</span>, sortValue: (r) => -r.startedMin },
          { header: "Run", cell: (r) => <span className="d-flex flex-column"><span className="fw-semibold">{r.runLabel}</span><span className="dx-help">{r.note}</span></span> },
          { header: "Bot", cell: (r) => r.botName, hideOnMobile: true },
          { header: "Symbol", cell: (r) => <span className="font-display">{r.symbol}</span> },
          { header: "Ticks", align: "end", cell: (r) => <span className="font-display">{r.ticks}</span>, hideOnMobile: true },
          { key: "trades", header: "Trades", align: "end", cell: (r) => <span className="font-display">{r.trades}</span>, sortValue: (r) => r.trades },
          { key: "pnl", header: "P&L", align: "end", cell: (r) => <span className={`font-display ${r.pnl >= 0 ? "dx-up" : "dx-down"}`}>{usd(r.pnl)}</span>, sortValue: (r) => r.pnl },
          { key: "memory", header: "Peak", align: "end", cell: (r) => <span className="font-display">{r.peakMemoryMb} MB</span>, sortValue: (r) => r.peakMemoryMb, hideOnMobile: true },
          { header: "Duration", align: "end", cell: (r) => <span className="font-display">{r.durationMs} ms</span>, hideOnMobile: true },
          { header: "Status", align: "end", cell: (r) => <Chip tone={runTone(r.status)}>{r.status}</Chip> },
        ]}
      />
    </>
  );
}

// =============================================================================
// 2 — SCRIPT DETAIL DRAWER (list row → drawer)
// =============================================================================
function ScriptDetailDrawer({
  id,
  scripts,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
  onAssign,
  onExport,
  onRunDetail,
  setOverlay,
}: {
  id: string;
  scripts: Script[];
  onClose: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onAssign: () => void;
  onExport: () => void;
  onRunDetail: (runId: string) => void;
  setOverlay: (o: ScriptOverlay) => void;
}) {
  const script = scripts.find((s) => s.id === id) ?? scripts[0];
  const meta = scriptMetaOf(script.id);
  const analysis = useMemo(() => analyzeScript(script.id, scriptSource(script.id)), [script.id]);
  const runs = SCRIPT_RUNS.filter((r) => r.scriptId === script.id);
  const deps = SCRIPT_DEPENDENCIES.filter((d) => d.fromScriptId === script.id);
  const versions = SCRIPT_VERSIONS.filter((v) => v.scriptId === script.id);
  const [tab, setTab] = useState("overview");
  return (
    <Drawer
      open
      onClose={onClose}
      wide
      title={script.name}
      subtitle={`${script.language} · ${script.symbol} · ${meta?.version ?? "v1"} · ${script.lines} lines`}
      footer={
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="dx-btn dx-btn-primary" onClick={onEdit}><Code2 size={13} /> Open editor</button>
          <button type="button" className="dx-btn" onClick={onDuplicate}><Copy size={13} /> Duplicate</button>
          <button type="button" className="dx-btn" onClick={onAssign}><Rocket size={13} /> Assign to bot</button>
          <button type="button" className="dx-btn dx-btn-ghost" onClick={onExport}><Download size={13} /> Export</button>
          <button type="button" className="dx-btn dx-btn-danger ms-auto" onClick={onDelete}><Trash2 size={13} /> Delete</button>
        </div>
      }
    >
      <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
        <Chip tone={healthTone(meta?.health ?? "healthy")}>{meta?.health ?? "healthy"}</Chip>
        <Chip tone="info">{script.status}</Chip>
        <Chip tone={meta?.ciStatus === "passing" ? "up" : meta?.ciStatus === "failing" ? "down" : "warn"}>CI {meta?.ciStatus}</Chip>
        <span className="dx-help ms-auto">edited {ago(Math.round((Date.now() - script.updatedAt) / 60000) || 2)}</span>
      </div>
      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "usage", label: "Usage", badge: runs.length },
          { id: "deps", label: "Dependencies", badge: deps.length },
          { id: "versions", label: "Versions", badge: versions.length },
        ]}
      />
      <div className="mt-3">
        {tab === "overview" ? (
          <div className="d-grid gap-3">
            <div className="row g-2">
              <div className="col-6"><StatCard label="Runs" value={script.runs} footnote="sandbox + live" /></div>
              <div className="col-6"><StatCard label="Win rate" value={script.winRate} decimals={1} suffix="%" trend="30-day tape" trendDir={script.winRate >= 55 ? "up" : "down"} /></div>
              <div className="col-6"><StatCard label="Net P&L" value={script.pnl} decimals={2} prefix="$" trend="session total" trendDir={script.pnl >= 0 ? "up" : "down"} /></div>
              <div className="col-6"><StatCard label="Coverage" value={meta?.coveragePct ?? 0} suffix="%" footnote={`${analysis.tests.length} @test cases`} /></div>
            </div>
            <div className="dx-card-inset">
              <span className="dx-kpi-label">Static analysis</span>
              {analysis.issues.length ? (
                <div className="d-grid gap-2 mt-1">
                  {analysis.issues.map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      className="dx-api-row"
                      onClick={() => {
                        onClose();
                        setOverlay({ kind: analysis.blocked ? "save-blocked" : "test-run" });
                      }}
                    >
                      <span className="d-flex align-items-center gap-2">
                        {issueIcon(i.rule)}
                        <span className="fw-semibold font-display">line {i.line}</span>
                        <Chip tone={issueTone(i.severity)}>{i.severity}</Chip>
                        <span className="dx-help ms-auto">{i.rule}</span>
                      </span>
                      <span>{i.message}</span>
                      <span className="dx-help">{i.suggestion}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <Alert tone="up" title="Clean static analysis">No syntax, sandbox or module problems found in the current revision.</Alert>
              )}
            </div>
            <div className="dx-card-inset">
              <span className="dx-kpi-label">Declared parameters</span>
              <div className="row g-2 mt-1">
                {analysis.params.length ? (
                  analysis.params.map((p) => (
                    <div className="col-6" key={p.key}>
                      <span className="dx-help d-block font-display">{p.key}</span>
                      <span className="font-display fw-semibold">{p.value}</span>
                      <span className="dx-help d-block">{p.description}</span>
                    </div>
                  ))
                ) : (
                  <span className="dx-help">No @param annotations — the bot configurator will not offer editable fields.</span>
                )}
              </div>
            </div>
          </div>
        ) : null}
        {tab === "usage" ? (
          <div className="d-grid gap-2">
            <span className="dx-help">
              Attached to {(meta?.usedByBots ?? []).join(", ") || "no bots yet"} · {script.runs.toLocaleString("en-US")} runs logged
            </span>
            <RunsTable runs={runs} onRowClick={onRunDetail} ariaLabel="Recent sandbox runs" pageSize={5} />
          </div>
        ) : null}
        {tab === "deps" ? (
          <div className="d-grid gap-2">
            {deps.length ? (
              deps.map((d) => (
                <div key={d.id} className="dx-card-inset">
                  <div className="d-flex align-items-center gap-2">
                    <Layers size={13} />
                    <span className="font-display fw-semibold">{d.module}</span>
                    <Chip tone={d.status === "ok" ? "up" : d.status === "missing" ? "down" : "warn"}>{d.status}</Chip>
                    <span className="dx-help ms-auto font-display">{d.version}{d.locked ? " · locked" : " · floating"}</span>
                  </div>
                  <span className="dx-help d-block">{d.purpose}</span>
                  <span className="dx-help font-display">{d.sizeKb} kB · {d.license}</span>
                </div>
              ))
            ) : (
              <EmptyState title="No dependencies" message="This script only uses the engine globals — nothing to import." icon={<Layers size={18} />} />
            )}
            <button type="button" className="dx-btn dx-btn-sm" onClick={() => { onClose(); setOverlay({ kind: "dependencies" }); }}>
              Open dependency graph
            </button>
          </div>
        ) : null}
        {tab === "versions" ? (
          <div className="d-grid gap-2">
            {versions.map((v) => (
              <div key={v.id} className="dx-card-inset">
                <div className="d-flex align-items-center gap-2">
                  <History size={13} />
                  <span className="font-display fw-semibold">{v.version}</span>
                  <Chip tone={v.status === "current" ? "up" : v.status === "rolled-back" ? "down" : "muted"}>{v.status}</Chip>
                  <span className="dx-help ms-auto">{ago(v.atMin)}</span>
                </div>
                <span className="d-block">{v.message}</span>
                <span className="dx-help font-display">{v.author} · +{v.added}/-{v.removed} · {v.tests} tests · {v.hash}</span>
              </div>
            ))}
            <button type="button" className="dx-btn dx-btn-sm" onClick={() => { onClose(); setOverlay({ kind: "versions" }); }}>
              Open version history
            </button>
          </div>
        ) : null}
      </div>
    </Drawer>
  );
}

// =============================================================================
// 3 — CONFIRM / FORM DIALOGS (delete, duplicate, export, import, bulk)
// =============================================================================
function DeleteScriptDialog({ id, scripts, onClose, onDelete }: { id: string; scripts: Script[]; onClose: () => void; onDelete: (id: string) => void }) {
  const script = scripts.find((s) => s.id === id) ?? scripts[0];
  const meta = scriptMetaOf(script.id);
  const [ack, setAck] = useState(false);
  const used = meta?.usedByBots ?? [];
  return (
    <Dialog
      open
      onClose={onClose}
      title="Delete script"
      subtitle="This cannot be undone — version history is removed with the file"
      size="md"
      footer={
        <div className="d-flex gap-2 justify-content-end w-100">
          <button type="button" className="dx-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="dx-btn dx-btn-danger" disabled={used.length > 0 && !ack} onClick={() => onDelete(script.id)}>
            <Trash2 size={13} /> Delete script
          </button>
        </div>
      }
    >
      <Alert tone="danger" title={`${script.name} will be removed`}>
        {used.length
          ? `${used.length} bot(s) still reference this script: ${used.join(", ")}. They keep running on their last loaded revision until they restart, then they stop with a "script missing" error.`
          : "No bot references this script, so nothing stops trading."}
      </Alert>
      <dl className="dx-kv mt-2">
        <dt>Versions</dt>
        <dd className="font-display">{SCRIPT_VERSIONS.filter((v) => v.scriptId === script.id).length}</dd>
        <dt>Runs logged</dt>
        <dd className="font-display">{script.runs.toLocaleString("en-US")}</dd>
        <dt>Dependencies</dt>
        <dd className="font-display">{SCRIPT_DEPENDENCIES.filter((d) => d.fromScriptId === script.id).length}</dd>
      </dl>
      {used.length ? (
        <div className="mt-2">
          <Toggle checked={ack} onChange={setAck} label={`I understand ${used.length} bot(s) reference this script`} />
        </div>
      ) : null}
    </Dialog>
  );
}

function DuplicateScriptDialog({ id, scripts, onClose, onDuplicate }: { id: string; scripts: Script[]; onClose: () => void; onDuplicate: (id: string, name: string) => void }) {
  const script = scripts.find((s) => s.id === id) ?? scripts[0];
  const [name, setName] = useState(`${script.name} copy`);
  const [keepTests, setKeepTests] = useState(true);
  const [keepVersions, setKeepVersions] = useState(false);
  const error = name.trim().length < 4 ? "At least 4 characters." : scripts.some((s) => s.name.toLowerCase() === name.trim().toLowerCase()) ? "That name is taken." : "";
  return (
    <Dialog
      open
      onClose={onClose}
      title="Duplicate script"
      subtitle="A fork starts its own version history and can be edited independently"
      size="md"
      footer={
        <div className="d-flex gap-2 justify-content-end w-100">
          <button type="button" className="dx-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="dx-btn dx-btn-primary" disabled={Boolean(error)} onClick={() => onDuplicate(script.id, name.trim())}>
            <Copy size={13} /> Create fork
          </button>
        </div>
      }
    >
      <Field label="Fork name" required error={error}>
        <input className="dx-input" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="d-grid gap-2 mt-3">
        <Toggle checked={keepTests} onChange={setKeepTests} label={`Copy the ${SCRIPT_TESTS.filter((t) => t.scriptId === script.id).length} @test cases`} />
        <Toggle checked={keepVersions} onChange={setKeepVersions} label={`Copy ${SCRIPT_VERSIONS.filter((v) => v.scriptId === script.id).length} version commits`} />
      </div>
      <Alert tone="info" title="Attachments are never copied">
        The fork starts unattached — assign it to a bot from the fork's detail drawer when it passes its tests.
      </Alert>
    </Dialog>
  );
}

function ExportScriptDialog({ id, scripts, onClose, onImport }: { id: string; scripts: Script[]; onClose: () => void; onImport: () => void }) {
  const script = scripts.find((s) => s.id === id) ?? scripts[0];
  const meta = scriptMetaOf(script.id);
  const [format, setFormat] = useState("bundle");
  const payload = {
    schema: "derivx.script.v12",
    id: script.id,
    name: script.name,
    language: script.language,
    symbol: script.symbol,
    version: meta?.version ?? "v1",
    tags: script.tags,
    params: scriptParamsOf(scriptSource(script.id)).map((p) => ({ key: p.key, type: p.type, default: p.defaultValue, description: p.description })),
    dependencies: SCRIPT_DEPENDENCIES.filter((d) => d.fromScriptId === script.id).map((d) => ({ module: d.module, version: d.version, locked: d.locked })),
    source: scriptSource(script.id),
  };
  const bundle = JSON.stringify(payload, null, 2);
  const curl = `curl -X POST https://api.derivx.app/v1/scripts \\\n  -H "Authorization: Bearer $DX_TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(payload)}'`;
  return (
    <Dialog
      open
      onClose={onClose}
      title={`Export ${script.name}`}
      subtitle="Re-importable bundle — parameters, dependencies and source in one payload"
      size="xl"
      footer={
        <div className="d-flex flex-wrap gap-2 justify-content-between w-100">
          <button type="button" className="dx-btn dx-btn-ghost" onClick={onImport}><Upload size={13} /> Import a script instead</button>
          <div className="d-flex gap-2">
            <CopyButton text={format === "curl" ? curl : bundle} label={`Copy ${format === "curl" ? "cURL" : "bundle"}`} small={false} />
            <button type="button" className="dx-btn dx-btn-primary" onClick={onClose}>Close</button>
          </div>
        </div>
      }
    >
      <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
        <MiniTabs
          ariaLabel="Export format"
          value={format}
          onChange={setFormat}
          options={[
            { id: "bundle", label: "JSON bundle" },
            { id: "curl", label: "cURL" },
            { id: "source", label: "Source only" },
          ]}
        />
        <span className="dx-help ms-auto font-display">
          {format === "source" ? `${script.lines} lines` : `${(format === "curl" ? curl : bundle).split("\n").length} lines`}
        </span>
      </div>
      <CodeBlock code={format === "curl" ? curl : format === "source" ? scriptSource(script.id) : bundle} maxHeight={420} />
      <Alert tone="info" title="Front-end only preview">
        Nothing leaves the browser — this is the payload a backend would POST to <span className="font-display">/v1/scripts</span> once the API layer is wired.
      </Alert>
    </Dialog>
  );
}

function ImportScriptDialog({ scripts, onClose, onCreate }: { scripts: Script[]; onClose: () => void; onCreate: (draft: { name: string; symbol: string; language: Script["language"]; code: string; tags: string[] }) => void }) {
  const [text, setText] = useState(JSON.stringify({ schema: "derivx.script.v12", name: "Imported RSI Fade", symbol: "frxEURUSD", language: "JavaScript", source: SCRIPT_SNIPPETS[2].code }, null, 2));
  const [error, setError] = useState("");
  const [name, setName] = useState("Imported RSI Fade");
  const analysis = useMemo(() => {
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      return analyzeScript("import", String(parsed.source ?? ""));
    } catch {
      return null;
    }
  }, [text]);
  return (
    <Dialog
      open
      onClose={onClose}
      title="Import script"
      subtitle="Paste a derivx.script.v12 bundle or raw JavaScript"
      size="xl"
      footer={
        <div className="d-flex flex-wrap gap-2 justify-content-between w-100">
          <button type="button" className="dx-btn dx-btn-ghost" onClick={() => { setText(SCRIPT_SNIPPETS[0].code); setError(""); }}>
            <Code2 size={13} /> Load a raw snippet instead
          </button>
          <div className="d-flex gap-2">
            <button type="button" className="dx-btn" onClick={onClose}>Cancel</button>
            <button
              type="button"
              className="dx-btn dx-btn-primary"
              onClick={() => {
                try {
                  const parsed = JSON.parse(text) as Record<string, unknown>;
                  const source = String(parsed.source ?? "");
                  if (!source) {
                    setError("Bundle has no `source` field — paste the script body or use the raw snippet button.");
                    return;
                  }
                  onCreate({
                    name: String(parsed.name ?? name),
                    symbol: String(parsed.symbol ?? "R_10"),
                    language: (String(parsed.language ?? "JavaScript") as Script["language"]) === "TypeScript" ? "TypeScript" : "JavaScript",
                    code: source,
                    tags: ["imported"],
                  });
                } catch {
                  setError("That is not valid JSON — switch to the raw snippet button if you only have the script body.");
                }
              }}
            >
              <Upload size={13} /> Import &amp; open
            </button>
          </div>
        </div>
      }
    >
      <div className="row g-3">
        <div className="col-12 col-md-4">
          <Field label="Name for the imported script" help="Renamed on import so the library stays unique.">
            <input className="dx-input" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="dx-card-inset mt-3">
            <span className="dx-kpi-label">Existing scripts</span>
            <span className="dx-help d-block">{scripts.length} files · importing an existing id creates a fork instead.</span>
          </div>
        </div>
        <div className="col-12 col-md-8">
          <Field label="Bundle" error={error} help="Schema line must be derivx.script.v12.">
            <textarea className="dx-input dx-textarea font-display" rows={12} value={text} onChange={(e) => { setText(e.target.value); setError(""); }} />
          </Field>
        </div>
      </div>
      {analysis ? (
        <Alert tone={analysis.blocked ? "warn" : "up"} title={analysis.blocked ? "Static analysis found errors" : "Static analysis is clean"}>
          {analysis.blocked
            ? `${analysis.issues.filter((i) => i.severity === "error").length} error(s) detected — first at line ${analysis.issues[0]?.line}: ${analysis.issues[0]?.message}`
            : `${analysis.stats.lines} lines · ${analysis.params.length} parameters · ${analysis.tests.length} test cases.`}
        </Alert>
      ) : null}
    </Dialog>
  );
}

function AssignBotWizard({
  id,
  scripts,
  onClose,
  onAssign,
  notify,
}: {
  id: string;
  scripts: Script[];
  onClose: () => void;
  onAssign: (scriptId: string, botName: string) => void;
  notify: ScriptOverlayProps["notify"];
}) {
  const script = scripts.find((s) => s.id === id) ?? scripts[0];
  const bots = [
    { id: "bot_mart_10", name: "Vol10 Martingale Core", loginId: "VRTC9031442", symbol: "R_10", state: "running" },
    { id: "bot_dca_trend", name: "DCA Trend Rider", loginId: "CR8842197", symbol: "R_50", state: "running" },
    { id: "bot_digit_hunter", name: "Digit Hunter 7", loginId: "VRTC9031442", symbol: "R_75", state: "paused" },
    { id: "bot_fx_breakout", name: "FX London Breakout", loginId: "CR8842197", symbol: "frxGBPUSD", state: "running" },
    { id: "bot_acc_sniper", name: "Accu Sniper 1HZ", loginId: "CR8842197", symbol: "1HZ10V", state: "stopped" },
    { id: "bot_swing_gold", name: "Gold Swing Basket", loginId: "CR8842197", symbol: "frxXAUUSD", state: "running" },
    { id: "bot_btc_grid", name: "BTC Grid Runner", loginId: "MX5520143", symbol: "cryBTCUSD", state: "paused" },
    { id: "bot_vol100_night", name: "Vol100 Night Shift", loginId: "CR8842197", symbol: "R_100", state: "error" },
    { id: "bot_gbp_mr", name: "GBP Mean Reversion", loginId: "VRTC9031442", symbol: "frxGBPUSD", state: "running" },
    { id: "bot_eth_mom", name: "ETH Momentum 50x", loginId: "MX5520143", symbol: "cryETHUSD", state: "stopped" },
  ];
  const [step, setStep] = useState(0);
  const [botId, setBotId] = useState(bots[0].id);
  const [restart, setRestart] = useState(true);
  const bot = bots.find((b) => b.id === botId) ?? bots[0];
  const analysis = useMemo(() => analyzeScript(script.id, scriptSource(script.id)), [script.id]);
  return (
    <Dialog
      open
      onClose={onClose}
      title={`Assign ${script.name} to a bot`}
      subtitle="The bot is reconfigured to run this script as its strategy"
      size="lg"
      footer={
        <div className="d-flex gap-2 justify-content-end w-100">
          <button type="button" className="dx-btn" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</button>
          {step < 2 ? (
            <button type="button" className="dx-btn dx-btn-primary" onClick={() => setStep((s) => s + 1)}>Continue</button>
          ) : (
            <button
              type="button"
              className="dx-btn dx-btn-primary"
              disabled={analysis.blocked}
              onClick={() => {
                onAssign(script.id, bot.name);
                onClose();
                notify("success", "Script assigned", `${bot.name} now runs ${script.name}; it reloads on the next tick${restart ? "" : " without a restart"}.`);
              }}
            >
              <Rocket size={13} /> Assign &amp; reload
            </button>
          )}
        </div>
      }
    >
      <nav role="navigation" aria-label="Assign steps">
        <Stepper
          steps={[{ id: "bot", label: "Choose bot" }, { id: "confirm", label: "Impact" }, { id: "review", label: "Confirm" }]}
          active={step}
          onStepClick={(i) => setStep(i <= 2 ? i : step)}
        />
      </nav>
      <div className="mt-3">
        {step === 0 ? (
          <div className="d-grid gap-2">
            {bots.map((b) => (
              <button
                key={b.id}
                type="button"
                className="dx-api-row"
                aria-pressed={botId === b.id}
                onClick={() => setBotId(b.id)}
              >
                <span className="d-flex align-items-center gap-2">
                  <span className="fw-semibold">{b.name}</span>
                  <Chip tone={b.state === "running" ? "up" : b.state === "paused" ? "warn" : b.state === "error" ? "down" : "muted"}>{b.state}</Chip>
                  <span className="dx-help ms-auto font-display">{b.symbol} · {b.loginId}</span>
                </span>
                <span className="dx-help">{(scriptMetaOf(script.id)?.usedByBots ?? []).includes(b.name) ? "Already runs this script" : "Currently on a different strategy"}</span>
              </button>
            ))}
          </div>
        ) : null}
        {step === 1 ? (
          <div className="d-grid gap-3">
            <Alert tone={bot.state === "running" ? "warn" : "info"} title={bot.state === "running" ? `${bot.name} is running` : `${bot.name} is ${bot.state}`}>
              {bot.state === "running"
                ? "The bot finishes the contract in flight, then loads the new script on the next tick. Open positions are never interrupted."
                : "The script is written to the bot configuration; it loads the next time the bot starts."}
            </Alert>
            <div className="dx-card-inset">
              <span className="dx-kpi-label">Impact on {bot.name}</span>
              <dl className="dx-kv mb-0">
                <dt>Strategy</dt>
                <dd className="font-display">custom script → {script.name} {scriptMetaOf(script.id)?.version}</dd>
                <dt>Symbol kept</dt>
                <dd className="font-display">{bot.symbol}</dd>
                <dt>Parameters exposed</dt>
                <dd className="font-display">{analysis.params.map((p) => p.key).join(", ") || "none"}</dd>
                <dt>Sandbox budget</dt>
                <dd className="font-display">100 ms/tick · 128 MB</dd>
              </dl>
            </div>
            <Toggle checked={restart} onChange={setRestart} label="Restart the runtime now so the script loads immediately" />
          </div>
        ) : null}
        {step === 2 ? (
          <div className="d-grid gap-3">
            <dl className="dx-kv">
              <dt>Script</dt>
              <dd className="font-display">{script.name} {scriptMetaOf(script.id)?.version}</dd>
              <dt>Bot</dt>
              <dd className="font-display">{bot.name} · {bot.loginId}</dd>
              <dt>Analysis</dt>
              <dd className="font-display">{analysis.blocked ? "blocked" : "clean"} · {analysis.stats.lines} lines · {analysis.params.length} params</dd>
              <dt>Restart</dt>
              <dd className="font-display">{restart ? "immediate" : "on next start"}</dd>
            </dl>
            {analysis.blocked ? (
              <Alert tone="danger" title="Assignment blocked">
                Fix the {analysis.issues.filter((i) => i.severity === "error").length} error(s) at line {analysis.issues[0]?.line} first — a broken script would stop the bot mid-session.
              </Alert>
            ) : (
              <Alert tone="up" title="Ready to assign">The bot keeps its stake, duration and risk limits; only the strategy source changes.</Alert>
            )}
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}

function BulkScriptsDialog({ ids, scripts, onClose, onArchive, onTag }: { ids: string[]; scripts: Script[]; onClose: () => void; onArchive: () => void; onTag: (tag: string) => void }) {
  const picked = scripts.filter((s) => ids.includes(s.id));
  const [tab, setTab] = useState("archive");
  const [tag, setTag] = useState("reviewed");
  return (
    <Dialog
      open
      onClose={onClose}
      title={`Bulk actions · ${picked.length} script(s)`}
      subtitle="Applies to every selected row in the library table"
      size="lg"
      footer={
        <div className="d-flex gap-2 justify-content-end w-100">
          <button type="button" className="dx-btn" onClick={onClose}>Cancel</button>
          {tab === "archive" ? (
            <button type="button" className="dx-btn dx-btn-danger" onClick={() => { onArchive(); onClose(); }}>
              <Trash2 size={13} /> Archive {picked.length}
            </button>
          ) : (
            <button type="button" className="dx-btn dx-btn-primary" onClick={() => { onTag(tag); onClose(); }}>
              <Plus size={13} /> Tag {picked.length}
            </button>
          )}
        </div>
      }
    >
      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "archive", label: "Archive" },
          { id: "tag", label: "Add tag" },
          { id: "review", label: "Selection" },
        ]}
      />
      <div className="mt-3">
        {tab === "archive" ? (
          <>
            <Alert tone="warn" title="Archiving keeps the code, drops the attachment">
              Archived scripts stop appearing in the bot configurator but stay in the library and their version history stays intact.
            </Alert>
            <ul className="dx-help mb-0 mt-2">
              {picked.map((s) => (
                <li key={s.id}>{s.name} · {scriptMetaOf(s.id)?.version} · used by {(scriptMetaOf(s.id)?.usedByBots ?? []).length} bot(s)</li>
              ))}
            </ul>
          </>
        ) : null}
        {tab === "tag" ? (
          <Field label="Tag" help="Lower-case, hyphenated where needed.">
            <input className="dx-input" value={tag} onChange={(e) => setTag(e.target.value)} />
          </Field>
        ) : null}
        {tab === "review" ? (
          <RunsTable runs={SCRIPT_RUNS.filter((r) => ids.includes(r.scriptId))} ariaLabel="Runs for the selected scripts" />
        ) : null}
      </div>
    </Dialog>
  );
}

// =============================================================================
// 4 — TEMPLATE GALLERY + TEMPLATE DETAIL (advanced feature #2)
// =============================================================================
function TemplateGalleryDrawer({
  category,
  onClose,
  onDetail,
  onUse,
  setOverlay,
}: {
  category?: string;
  onClose: () => void;
  onDetail: (id: string, source: "sdk" | "community") => void;
  onUse: (id: string) => void;
  setOverlay: (o: ScriptOverlay) => void;
}) {
  const [tab, setTab] = useState(category ? "community" : "sdk");
  const state = useDataTable({
    rows: COMMUNITY_TEMPLATES,
    searchKeys: (t) => [t.name, t.author, t.symbol, t.category, t.description],
    sorters: { rating: (t) => t.rating, stars: (t) => -t.stars, forks: (t) => -t.forks, winRate: (t) => t.benchmark.winRate, pnl: (t) => t.benchmark.pnl },
    filterKey: (t) => t.category,
    filterOptions: [
      { id: "trend following", label: "Trend" },
      { id: "mean reversion", label: "Mean reversion" },
      { id: "scalping", label: "Scalping" },
      { id: "hedging", label: "Hedging" },
      { id: "digits", label: "Digits" },
    ],
    initialSort: "rating",
    initialPageSize: 6,
  });
  return (
    <Drawer
      open
      onClose={onClose}
      wide
      title="Script templates gallery"
      subtitle="Engine templates plus community forks with ratings and backtest benchmarks"
      footer={
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="dx-btn dx-btn-primary" onClick={() => { onClose(); setOverlay({ kind: "new-script" }); }}>
            <Plus size={13} /> Start blank script
          </button>
          <button type="button" className="dx-btn" onClick={() => { onClose(); setOverlay({ kind: "sandbox-limits" }); }}>
            <Shield size={13} /> Sandbox limits
          </button>
          <button type="button" className="dx-btn dx-btn-ghost ms-auto" onClick={onClose}>Close gallery</button>
        </div>
      }
    >
      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "sdk", label: `Engine templates (${SCRIPT_TEMPLATES.length})` },
          { id: "community", label: `Community (${COMMUNITY_TEMPLATES.length})` },
        ]}
      />
      {tab === "sdk" ? (
        <div className="row g-2 mt-3">
          {SCRIPT_TEMPLATES.map((t) => (
            <div className="col-12 col-md-6" key={t.id}>
              <div className="dx-tpl-card">
                <span className="d-flex align-items-center gap-2">
                  <FileCode2 size={14} />
                  <span className="fw-semibold">{t.name}</span>
                  <Chip tone={t.difficulty === "beginner" ? "up" : t.difficulty === "intermediate" ? "warn" : "down"}>{t.difficulty}</Chip>
                </span>
                <span className="dx-help">{t.description}</span>
                <span className="dx-tpl-stars">★ {t.rating.toFixed(1)} · {t.uses.toLocaleString("en-US")} uses · {t.lines} lines</span>
                <span className="d-flex flex-wrap gap-2 mt-1">
                  <button type="button" className="dx-btn dx-btn-sm" onClick={() => onDetail(t.id, "sdk")}>Preview</button>
                  <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => onUse(t.id)}>Use template</button>
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3">
          <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
            <SearchInput value={state.query} onChange={state.setQuery} placeholder="Search template, author, symbol…" />
            <FilterChips options={state.filterOptions} value={state.filter} onChange={state.setFilter} allLabel={`All (${COMMUNITY_TEMPLATES.length})`} />
            <span className="dx-help ms-auto">Benchmarks are 30-day sandbox runs on the template's own symbol.</span>
          </div>
          <div className="row g-2">
            {state.rows.map((t) => (
              <div className="col-12 col-md-6" key={t.id}>
                <div className="dx-tpl-card">
                  <span className="d-flex align-items-center gap-2">
                    <span className="fw-semibold">{t.name}</span>
                    {t.verified ? <Chip tone="up">verified</Chip> : <Chip tone="muted">{t.authorTier}</Chip>}
                  </span>
                  <span className="dx-help">{t.author} · {t.category} · {t.license}</span>
                  <span className="dx-help">{t.description}</span>
                  <span className="dx-tpl-stars">★ {t.rating.toFixed(1)} · {t.forks} forks · win {pct(t.benchmark.winRate, 1)}</span>
                  <span className="dx-help font-display">
                    {t.symbol} · {t.contractType} · P&L {usd(t.benchmark.pnl)} · max DD {usd(-t.benchmark.maxDrawdown)} · {t.benchmark.trades} trades
                  </span>
                  <span className="d-flex flex-wrap gap-2 mt-1">
                    <button type="button" className="dx-btn dx-btn-sm" onClick={() => onDetail(t.id, "community")}>Preview</button>
                    <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => onUse(t.id)}>Fork &amp; edit</button>
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Pagination page={state.page} pageCount={state.pageCount} total={state.total} pageSize={state.pageSize} onPageSizeChange={state.setPageSize} onPageChange={state.setPage} label="templates" />
          </div>
        </div>
      )}
    </Drawer>
  );
}

function TemplateDetailDrawer({
  id,
  source,
  onClose,
  onUse,
  setOverlay,
}: {
  id: string;
  source: "sdk" | "community";
  onClose: () => void;
  onUse: (id: string) => void;
  setOverlay: (o: ScriptOverlay) => void;
}) {
  const sdk = SCRIPT_TEMPLATES.find((t) => t.id === id);
  const community = COMMUNITY_TEMPLATES.find((t) => t.id === id);
  const name = sdk?.name ?? community?.name ?? "Template";
  const code = sdk?.code ?? community?.code ?? "";
  const analysis = useMemo(() => analyzeScript("tpl", code), [code]);
  const [tab, setTab] = useState("code");
  const symbol = sdk?.symbol ?? community?.symbol ?? "R_10";
  return (
    <Drawer
      open
      onClose={onClose}
      wide
      title={name}
      subtitle={`${source === "sdk" ? "Engine template" : `${community?.author} · ${community?.license}`} · ${symbol} · ${analysis.stats.lines} lines`}
      footer={
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="dx-btn dx-btn-primary" onClick={() => onUse(id)}><Code2 size={13} /> Fork into my library</button>
          <button type="button" className="dx-btn" onClick={() => { onClose(); setOverlay({ kind: "sandbox-limits" }); }}><Shield size={13} /> Sandbox rules</button>
          <button type="button" className="dx-btn dx-btn-ghost ms-auto" onClick={onClose}>Close</button>
        </div>
      }
    >
      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "code", label: "Source" },
          { id: "bench", label: "Benchmark" },
          { id: "params", label: "Parameters" },
        ]}
      />
      <div className="mt-3">
        {tab === "code" ? <CodeBlock code={code} maxHeight={360} /> : null}
        {tab === "bench" ? (
          <div className="d-grid gap-3">
            {community ? (
              <>
                <div className="row g-2">
                  <div className="col-6 col-lg-3"><StatCard label="Win rate" value={community.benchmark.winRate} decimals={1} suffix="%" trend="30-day sandbox" trendDir="up" /></div>
                  <div className="col-6 col-lg-3"><StatCard label="Net P&L" value={community.benchmark.pnl} decimals={2} prefix="$" trend="at 1× stake" trendDir={community.benchmark.pnl >= 0 ? "up" : "down"} /></div>
                  <div className="col-6 col-lg-3"><StatCard label="Max drawdown" value={-community.benchmark.maxDrawdown} decimals={2} prefix="$" trend="worst peak-to-trough" trendDir="down" /></div>
                  <div className="col-6 col-lg-3"><StatCard label="Trades" value={community.benchmark.trades} footnote={`${community.benchmark.period} window`} /></div>
                </div>
                <div className="dx-card-inset">
                  <span className="dx-kpi-label">Sandbox equity path</span>
                  <LineChart
                    data={runScriptSandbox("scr_01", scriptSource("scr_01"), { seed: 4242, ticks: 240 }).equity}
                    height={160}
                    tone="accent"
                    ariaLabel="Template benchmark equity"
                    yFormat={(v) => `$${v.toFixed(0)}`}
                  />
                </div>
              </>
            ) : (
              <Alert tone="info" title="Engine template">
                Engine templates ship with the platform — their benchmark is the twelve-month synthetic tape, so run a sandbox test after forking to see your own numbers.
              </Alert>
            )}
            <div className="d-flex flex-wrap gap-2">
              <Chip tone="muted">★ {sdk?.rating ?? community?.rating}</Chip>
              <Chip tone="muted">{sdk ? `${sdk.uses}` : `${community?.forks}`} forks</Chip>
              <Chip tone="muted">{sdk?.category ?? community?.category}</Chip>
            </div>
          </div>
        ) : null}
        {tab === "params" ? (
          <div className="d-grid gap-2">
            {analysis.params.length ? (
              analysis.params.map((p) => (
                <div key={p.key} className="dx-card-inset">
                  <span className="font-display fw-semibold">{p.key}</span>
                  <Chip tone="muted">{p.type}</Chip>
                  <span className="dx-help d-block">{p.description}</span>
                  <span className="dx-help font-display">default {p.defaultValue} · declared on line {p.line}</span>
                </div>
              ))
            ) : (
              <EmptyState title="No declared parameters" message="This template hard-codes its sizing — fork it and add @param annotations to expose fields." icon={<Layers size={18} />} />
            )}
          </div>
        ) : null}
      </div>
    </Drawer>
  );
}

// =============================================================================
// 5 — API REFERENCE + SANDBOX LIMITS + HEALTH + EVENTS
// =============================================================================
function ApiReferenceDialog({ onClose, onInsert }: { onClose: () => void; onInsert: (code: string) => void }) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const [picked, setPicked] = useState(API_REFERENCE[0].id);
  const active = API_REFERENCE.find((a) => a.id === picked) ?? API_REFERENCE[0];
  return (
    <Dialog
      open
      onClose={onClose}
      title="Script engine API reference"
      subtitle="Everything the sandbox exposes — searchable and keyboard navigable"
      size="xl"
      footer={
        <div className="d-flex flex-wrap gap-2 justify-content-between w-100">
          <button type="button" className="dx-btn dx-btn-ghost" onClick={() => onInsert(active.example)}>
            <Plus size={13} /> Insert “{active.name}” example
          </button>
          <button type="button" className="dx-btn dx-btn-primary" onClick={onClose}>Close reference</button>
        </div>
      }
    >
      <div className="row g-3">
        <div className="col-12 col-lg-5">
          <SearchInput value={query} onChange={setQuery} placeholder="Search tick, stake, balance, log…" />
          <div className="mt-2">
            <FilterChips
              options={[
                { id: "lifecycle", label: "Lifecycle" },
                { id: "context", label: "Context" },
                { id: "decision", label: "Decision" },
                { id: "tick", label: "Tick" },
                { id: "result", label: "Result" },
                { id: "params", label: "Params" },
                { id: "sandbox", label: "Sandbox" },
              ]}
              value={group}
              onChange={setGroup}
              allLabel={`All (${API_REFERENCE.length})`}
            />
          </div>
          <div className="d-flex flex-wrap gap-1 mt-2">
            {/* keyboard-navigable reference list */}
            <ApiReferenceList query={query} group={group} onPick={(name) => {
              const hit = API_REFERENCE.find((a) => a.name === name);
              if (hit) setPicked(hit.id);
            }} compact />
            {API_REFERENCE.filter((a) => group === "all" || a.group === group)
              .filter((a) => (a.name + a.signature).toLowerCase().includes(query.toLowerCase()))
              .map((a) => (
                <button key={`chip-${a.id}`} type="button" className={`dx-filter-chip ${picked === a.id ? "is-active" : ""}`} aria-pressed={picked === a.id} onClick={() => setPicked(a.id)}>
                  {a.name}
                </button>
              ))}
          </div>
        </div>
        <div className="col-12 col-lg-7">
          <div className="dx-card-inset">
            <div className="d-flex align-items-center gap-2">
              <span className="dx-kpi-label">{active.group}</span>
              {active.restricted ? <Chip tone="warn"><Lock size={10} /> restricted</Chip> : null}
              <span className="dx-help ms-auto font-display">{active.since}</span>
            </div>
            <h3 className="dx-card-title mt-1">{active.name}</h3>
            <CodeBlock code={active.signature} maxHeight={120} />
            <p className="dx-help mt-2 mb-2">{active.description}</p>
            <span className="dx-kpi-label">Example</span>
            <CodeBlock code={active.example} maxHeight={180} />
            <div className="d-flex flex-wrap gap-2 mt-2">
              <CopyButton text={active.example} label="Copy example" />
              <button type="button" className="dx-btn dx-btn-sm" onClick={() => onInsert(active.example)}><Plus size={12} /> Insert into script</button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

function SandboxLimitsDialog({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState("forbidden");
  const state = useDataTable({
    rows: FORBIDDEN_APIS,
    searchKeys: (f) => [f.api, f.reason, f.alternative, f.scope],
    sorters: { api: (f) => f.api, severity: (f) => f.severity },
    filterKey: (f) => f.severity,
    filterOptions: [
      { id: "block", label: "Blocks the save" },
      { id: "warn", label: "Warns" },
    ],
    initialPageSize: 8,
  });
  return (
    <Dialog
      open
      onClose={onClose}
      title="Sandbox runtime & blocked APIs"
      subtitle="VM2-style isolation: 128 MB heap, 100 ms per tick, one trade per tick, no I/O"
      size="xl"
      footer={<button type="button" className="dx-btn dx-btn-primary ms-auto" onClick={onClose}>Understood</button>}
    >
      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "forbidden", label: `Blocked APIs (${FORBIDDEN_APIS.length})` },
          { id: "limits", label: "Limits" },
          { id: "io", label: "Allowed surface" },
        ]}
      />
      <div className="mt-3">
        {tab === "forbidden" ? (
          <div className="d-grid gap-2">
            <div className="d-flex flex-wrap align-items-center gap-2">
              <SearchInput value={state.query} onChange={state.setQuery} placeholder="Search process.exit, fetch, localStorage…" />
              <FilterChips options={state.filterOptions} value={state.filter} onChange={state.setFilter} allLabel={`All (${FORBIDDEN_APIS.length})`} />
            </div>
            {state.rows.map((f) => (
              <div key={f.id} className="dx-card-inset">
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <Ban size={13} />
                  <span className="font-display fw-semibold">{f.api}</span>
                  <Chip tone={f.severity === "block" ? "down" : "warn"}>{f.severity === "block" ? "blocks save" : "warns"}</Chip>
                  <Chip tone="muted">{f.scope}</Chip>
                </div>
                <span className="dx-help d-block">{f.reason}</span>
                <span className="dx-help">Do this instead: {f.alternative}</span>
              </div>
            ))}
            <Pagination page={state.page} pageCount={state.pageCount} total={state.total} pageSize={state.pageSize} onPageChange={state.setPage} label="APIs" />
          </div>
        ) : null}
        {tab === "limits" ? (
          <div className="row g-2">
            <div className="col-6 col-lg-3"><StatCard label="Heap limit" value={128} suffix=" MB" footnote="run aborts above this" /></div>
            <div className="col-6 col-lg-3"><StatCard label="Per-tick budget" value={100} suffix=" ms" footnote="timeout reported with a line" /></div>
            <div className="col-6 col-lg-3"><StatCard label="Trade rate" value={1} suffix=" / tick" footnote="extra proposals are dropped" /></div>
            <div className="col-6 col-lg-3"><StatCard label="Log rate" value={20} suffix=" / s" footnote="older lines are truncated" /></div>
            <Alert tone="warn" title="Exceeding a limit">
              A run that breaches the heap or tick budget is aborted and the script is flagged in the library table with a red health chip; the
              Profiler shows the frames that spent the budget.
            </Alert>
          </div>
        ) : null}
        {tab === "io" ? (
          <div className="d-grid gap-3">
            <div className="dx-card-inset">
              <span className="dx-kpi-label">Allowed globals</span>
              <p className="dx-help mb-0 font-display">
                onTick · onResult · onComplete · getLastResult · getHistory · getBalance · getOpenContracts · placeTrade · log · require (SDK modules only)
              </p>
            </div>
            <div className="dx-card-inset">
              <span className="dx-kpi-label">Denied</span>
              <p className="dx-help mb-0 font-display">
                filesystem · network · process · DOM · storage · timers · dynamic code · child processes
              </p>
            </div>
            <Alert tone="info" title="Where this runs">
              This page simulates the sandbox on the main thread. In production the same code runs in an isolated worker so a runaway script can
              never block the trading UI.
            </Alert>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}

function ScriptHealthDialog({ scripts, onOpen, onClose }: { scripts: Script[]; onOpen: (id: string) => void; onClose: () => void }) {
  const rows = SCRIPT_EDITOR_ROWS;
  const failing = rows.filter((r) => r.ciStatus === "failing").length;
  const blocked = rows.filter((r) => r.health === "error").length;
  return (
    <Dialog
      open
      onClose={onClose}
      title="Library health"
      subtitle={`${rows.length} scripts · ${failing} failing CI · ${blocked} blocked by static analysis`}
      size="lg"
      footer={<button type="button" className="dx-btn dx-btn-primary ms-auto" onClick={onClose}>Close</button>}
    >
      <div className="row g-2">
        <div className="col-6 col-lg-3"><StatCard label="Healthy" value={rows.filter((r) => r.health === "healthy").length} footnote="no open issues" /></div>
        <div className="col-6 col-lg-3"><StatCard label="Warning" value={rows.filter((r) => r.health === "warning").length} footnote="lint or outdated deps" /></div>
        <div className="col-6 col-lg-3"><StatCard label="Blocked" value={blocked} footnote="save refused" trendDir="down" trend="needs a fix" /></div>
        <div className="col-6 col-lg-3"><StatCard label="CI failing" value={failing} footnote="tests red on the branch" trendDir="down" trend="blocks merge" /></div>
      </div>
      <div className="d-grid gap-2 mt-3">
        {rows.map((r) => {
          const script = scripts.find((s) => s.id === r.scriptId);
          return (
            <button key={r.id} type="button" className="dx-api-row" onClick={() => { onOpen(r.scriptId); onClose(); }}>
              <span className="d-flex flex-wrap align-items-center gap-2">
                <span className="fw-semibold">{script?.name ?? r.scriptId}</span>
                <Chip tone={healthTone(r.health)}>{r.health}</Chip>
                <Chip tone={r.ciStatus === "passing" ? "up" : r.ciStatus === "failing" ? "down" : "warn"}>CI {r.ciStatus}</Chip>
                <Chip tone={(r.peakMemoryMb ?? 0) >= 100 ? "warn" : "muted"}>{r.peakMemoryMb}/{r.memoryLimitMb} MB</Chip>
                <span className="dx-help ms-auto font-display">{r.branch} · {r.version} · coverage {r.coveragePct}%</span>
              </span>
              <span className="dx-help">
                {(r.usedByBots ?? []).length} bot(s) attached · last test {ago(r.lastTestAtMin)} · complexity {r.complexity}
              </span>
            </button>
          );
        })}
      </div>
    </Dialog>
  );
}

function ScriptEventsDrawer({ id, events, onClose, onScript }: { id?: string; events: ScriptEvent[]; onClose: () => void; onScript: (id: string) => void }) {
  const [channel, setChannel] = useState("all");
  const rows = events.filter((e) => (id ? e.scriptId === id : true) && (channel === "all" || e.channel === channel));
  return (
    <Drawer
      open
      onClose={onClose}
      wide
      title="Script activity"
      subtitle={id ? `Events for ${SCRIPTS.find((s) => s.id === id)?.name ?? id}` : "Editor, sandbox, CI, version and AI events"}
      footer={<button type="button" className="dx-btn dx-btn-primary ms-auto" onClick={onClose}>Close activity</button>}
    >
      <FilterChips
        options={[
          { id: "editor", label: "Editor" },
          { id: "sandbox", label: "Sandbox" },
          { id: "ci", label: "CI" },
          { id: "version", label: "Versions" },
          { id: "ai", label: "AI" },
        ]}
        value={channel}
        onChange={setChannel}
        allLabel={`All (${rows.length})`}
      />
      <div className="d-grid gap-2 mt-3">
        {rows.length ? (
          rows.map((e) => (
            <div key={e.id} className="dx-card-inset">
              <div className="d-flex flex-wrap align-items-center gap-2">
                <Chip tone={e.level === "error" ? "down" : e.level === "warn" ? "warn" : "info"}>{e.channel}</Chip>
                <span className="fw-semibold">{e.action}</span>
                <span className="dx-help ms-auto font-display">{ago(e.atMin)} · {e.actor}</span>
              </div>
              <span className="dx-help d-block">{e.detail}</span>
              <span className="dx-help font-display">{SCRIPTS.find((s) => s.id === e.scriptId)?.name ?? e.scriptId}</span>
              <button type="button" className="dx-btn dx-btn-sm mt-1" onClick={() => { onScript(e.scriptId); onClose(); }}>Open script</button>
            </div>
          ))
        ) : (
          <EmptyState title="No events on this channel" message="Switch the filter or edit a script to generate activity." icon={<History size={18} />} />
        )}
      </div>
    </Drawer>
  );
}

// =============================================================================
// 6 — SAVE GUARDS (edge cases: bots attached, blocked by analysis)
// =============================================================================
function SaveConfirmDialog({
  script,
  analysis,
  onClose,
  onSave,
  onHistory,
}: {
  script: Script;
  analysis: AnalysisResult;
  onClose: () => void;
  onSave: () => void;
  onHistory: () => void;
}) {
  const meta = scriptMetaOf(script.id);
  const used = meta?.usedByBots ?? [];
  const [ack, setAck] = useState(used.length === 0);
  const [reload, setReload] = useState(true);
  return (
    <Dialog
      open
      onClose={onClose}
      title="Save & publish"
      subtitle={`${script.name} · ${meta?.version ?? "v1"} → new commit on ${meta?.branch ?? "main"}`}
      size="lg"
      footer={
        <div className="d-flex flex-wrap gap-2 justify-content-between w-100">
          <button type="button" className="dx-btn dx-btn-ghost" onClick={onHistory}><History size={13} /> Compare with a version</button>
          <div className="d-flex gap-2">
            <button type="button" className="dx-btn" onClick={onClose}>Keep editing</button>
            <button type="button" className="dx-btn dx-btn-primary" disabled={!ack} onClick={onSave}>
              <Rocket size={13} /> {reload ? "Save, reload bots & run tests" : "Save & run tests"}
            </button>
          </div>
        </div>
      }
    >
      {used.length ? (
        <Alert tone="warn" title={`${used.length} bot(s) are running this script`}>
          Applying the change reloads {used.join(", ")} on their next tick. Contracts already open are never interrupted.
          <span className="d-block mt-2">
            <Toggle checked={ack} onChange={setAck} label={`I understand ${used.length} live bot(s) reload with this save`} />
          </span>
          <span className="d-block mt-2">
            <Toggle checked={reload} onChange={setReload} label="Reload the runtimes immediately instead of at the next restart" />
          </span>
        </Alert>
      ) : (
        <Alert tone="info" title="No bot is attached">
          The save creates a new version commit and runs the test suite. Attach the script from the library table when the tests are green.
        </Alert>
      )}
      <div className="row g-2 mt-1">
        <div className="col-6 col-lg-3"><StatCard label="Lines" value={analysis.stats.lines} footnote={`longest ${analysis.stats.longest} chars`} /></div>
        <div className="col-6 col-lg-3"><StatCard label="Params" value={analysis.params.length} footnote="editable in bot config" /></div>
        <div className="col-6 col-lg-3"><StatCard label="Tests" value={analysis.tests.length} footnote="run on save (CI)" /></div>
        <div className="col-6 col-lg-3"><StatCard label="Coverage" value={meta?.coveragePct ?? 0} suffix="%" footnote="from the last green run" /></div>
      </div>
      <div className="mt-3">
        <span className="dx-kpi-label">What the commit will contain</span>
        <dl className="dx-kv mb-0">
          <dt>Branch</dt>
          <dd className="font-display">{meta?.branch ?? "main"}</dd>
          <dt>Warnings carried</dt>
          <dd className="font-display">
            {analysis.issues.filter((i) => i.severity === "warning").length
              ? analysis.issues.filter((i) => i.severity === "warning").map((i) => `line ${i.line}`).join(", ")
              : "none"}
          </dd>
          <dt>Dependencies</dt>
          <dd className="font-display">{analysis.imports.map((i) => `${i.module}${i.locked ? " (locked)" : " (floating)"}`).join(", ") || "none"}</dd>
        </dl>
      </div>
    </Dialog>
  );
}

function SaveBlockedDialog({
  script,
  analysis,
  onClose,
  onApplyFix,
  onJump,
  onSandbox,
}: {
  script: Script | null;
  analysis: AnalysisResult;
  onClose: () => void;
  onApplyFix: (issue: ScriptIssue) => void;
  onJump: (line: number) => void;
  onSandbox: () => void;
}) {
  const errors = analysis.issues.filter((i) => i.severity === "error");
  return (
    <Dialog
      open
      onClose={onClose}
      title="Save blocked by static analysis"
      subtitle={`${script?.name ?? "Script"} · ${errors.length} error(s) must be fixed before a commit is created`}
      size="xl"
      footer={
        <div className="d-flex flex-wrap gap-2 justify-content-between w-100">
          <button type="button" className="dx-btn dx-btn-ghost" onClick={onSandbox}><Shield size={13} /> What is blocked and why</button>
          <button type="button" className="dx-btn dx-btn-primary" onClick={onClose}>Back to the editor</button>
        </div>
      }
    >
      <div className="d-grid gap-2">
        {analysis.issues.map((i) => (
          <div key={i.id} className="dx-card-inset">
            <div className="d-flex flex-wrap align-items-center gap-2">
              {issueIcon(i.rule)}
              <span className="font-display fw-semibold">line {i.line}:{i.column}</span>
              <Chip tone={issueTone(i.severity)}>{i.severity}</Chip>
              <Chip tone="muted">{i.rule}</Chip>
              <span className="ms-auto d-flex gap-2">
                <button type="button" className="dx-btn dx-btn-sm" onClick={() => { onJump(i.line); onClose(); }}>Jump to line</button>
                {i.fixId?.startsWith("stub:") ? (
                  <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => onApplyFix(i)}>
                    <Layers size={12} /> Create stub
                  </button>
                ) : null}
              </span>
            </div>
            <span className="d-block">{i.message}</span>
            <span className="dx-help d-block">{i.suggestion}</span>
            <CodeBlock code={i.snippet} maxHeight={70} />
          </div>
        ))}
      </div>
    </Dialog>
  );
}

// =============================================================================
// 7 — TEST RUNNER (progress → results, with a working skip)
// =============================================================================
function TestRunWizard({
  script,
  code,
  analysis,
  run,
  setRun,
  onClose,
  onJump,
  onExport,
  notify,
}: {
  script: Script | null;
  code: string;
  analysis: AnalysisResult;
  run: SandboxRun | null;
  setRun: (r: SandboxRun | null) => void;
  onClose: () => void;
  onJump: (line: number) => void;
  onExport: (run: SandboxRun) => void;
  notify: ScriptOverlayProps["notify"];
}) {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const [ticks, setTicks] = useState(500);
  const cases = SCRIPT_TESTS.filter((t) => t.scriptId === (script?.id ?? ""));
  const result = run ?? (script ? runScriptSandbox(script.id, code, { ticks }) : null);

  // A tiny interval drives the progress bar so a long run shows its own progress
  // and the Skip button stays reachable — the same contract as the blueprint.
  useEffect(() => {
    if (step !== 1) return;
    const id = window.setInterval(() => setProgress((p) => (p >= 100 ? 100 : p + 6)), 120);
    return () => window.clearInterval(id);
  }, [step]);

  return (
    <Dialog
      open
      onClose={onClose}
      title="Sandbox test run"
      subtitle={`${script?.name ?? "Draft"} · ${ticks} ticks · 100 ms/tick budget · isolated worker`}
      size="xl"
      footer={
        <div className="d-flex flex-wrap gap-2 justify-content-between w-100">
          <button type="button" className="dx-btn dx-btn-ghost" onClick={() => onExport(result ?? runScriptSandbox("draft", code))} disabled={!result}>
            <Download size={13} /> Export run log
          </button>
          <div className="d-flex gap-2">
            {step === 1 ? (
              <button
                type="button"
                className="dx-btn"
                onClick={() => {
                  setSkipped(true);
                  setStep(2);
                }}
              >
                Skip test
              </button>
            ) : null}
            {step > 0 ? <button type="button" className="dx-btn" onClick={() => { setStep(0); setProgress(0); setSkipped(false); }}>Restart</button> : null}
            {step === 0 ? (
              <button type="button" className="dx-btn dx-btn-primary" disabled={analysis.blocked} onClick={() => setStep(1)}>
                <Play size={13} /> Start run
              </button>
            ) : null}
            {step === 1 ? (
              <button type="button" className="dx-btn dx-btn-primary" disabled={progress < 100} onClick={() => setStep(2)}>
                View results
              </button>
            ) : null}
            {step === 2 ? <button type="button" className="dx-btn dx-btn-primary" onClick={onClose}>Done</button> : null}
          </div>
        </div>
      }
    >
      {analysis.blocked ? (
        <Alert tone="danger" title="Execution refused">
          The sandbox refuses to load a script with {analysis.issues.filter((i) => i.severity === "error").length} static error(s). Line {analysis.issues[0]?.line} is the
          first: {analysis.issues[0]?.message}
        </Alert>
      ) : null}

      {step === 0 ? (
        <div className="d-grid gap-3">
          <div className="row g-3">
            <div className="col-12 col-md-4">
              <Field label="Ticks to simulate" help="500 ticks ≈ 6 h of R_10 tape.">
                <select className="dx-select" value={ticks} onChange={(e) => setTicks(Number(e.target.value))}>
                  {[120, 300, 500, 1000, 3000].map((t) => (
                    <option key={t} value={t}>{t} ticks</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="col-12 col-md-4">
              <Field label="Symbol tape">
                <select className="dx-select" defaultValue={script?.symbol ?? "R_10"}>
                  {["R_10", "R_25", "R_50", "R_75", "R_100", "1HZ10V", "frxEURUSD", "frxGBPUSD", "frxXAUUSD", "cryBTCUSD", "cryETHUSD"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="col-12 col-md-4">
              <Field label="Seed" help="Same seed → same tape, so failures are reproducible.">
                <input className="dx-input font-display" type="number" defaultValue={20261013} />
              </Field>
            </div>
          </div>
          <div className="dx-card-inset">
            <span className="dx-kpi-label">What the runner checks</span>
            <ul className="dx-help mb-0">
              <li>Static analysis: syntax balance, forbidden APIs, module resolution ({analysis.issues.length} finding(s) right now)</li>
              <li>{cases.length} @test scenarios declared in the script, plus {SCRIPT_TESTS.filter((t) => t.layer !== "unit").length} platform integration checks</li>
              <li>Per-tick execution time against the 100 ms budget and heap against the 128 MB ceiling</li>
            </ul>
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="d-grid gap-3">
          <div>
            <Progress value={progress} />
            <span className="dx-help d-block mt-1">
              {progress < 100 ? `Running tick ${Math.round((progress / 100) * ticks)} of ${ticks} · ${skipped ? "skipping…" : "streaming results"}` : "Run complete — open the results tab."}
            </span>
          </div>
          <div className="dx-console" role="log" aria-live="polite">
            <ConsoleLines lines={(result?.logLines ?? []).slice(0, Math.max(1, Math.round((progress / 100) * (result?.logLines.length ?? 1))))} />
          </div>
        </div>
      ) : null}

      {step === 2 && result ? (
        <div className="d-grid gap-3">
          {skipped ? (
            <Alert tone="warn" title="Skipped by the author">
              The previous revision's numbers still apply. The library table flags this script until a run completes.
            </Alert>
          ) : null}
          <div className="row g-2">
            <div className="col-6 col-lg-3"><StatCard label="Status" value={result.trades.length} footnote={result.status} trend={result.status === "ok" ? "completed" : "aborted"} trendDir={result.status === "ok" ? "up" : "down"} /></div>
            <div className="col-6 col-lg-3"><StatCard label="Win rate" value={result.winRate} decimals={1} suffix="%" footnote={`${result.trades.length} contracts`} /></div>
            <div className="col-6 col-lg-3"><StatCard label="Net P&L" value={result.pnl} decimals={2} prefix="$" trendDir={result.pnl >= 0 ? "up" : "down"} trend="sandbox" /></div>
            <div className="col-6 col-lg-3"><StatCard label="Peak heap" value={result.peakMemoryMb} suffix=" MB" footnote={`${result.durationMs} ms total`} /></div>
          </div>
          <div className="row g-3">
            <div className="col-12 col-lg-7">
              <span className="dx-kpi-label">Equity path</span>
              <LineChart data={result.equity.length ? result.equity : [0, 0]} height={160} tone={result.pnl >= 0 ? "accent" : "down"} ariaLabel="Sandbox equity" yFormat={(v) => `$${v.toFixed(0)}`} />
            </div>
            <div className="col-12 col-lg-5">
              <span className="dx-kpi-label">Heap over the run</span>
              <LineChart data={result.memory} height={160} tone="accent" ariaLabel="Sandbox heap" yFormat={(v) => `${v} MB`} />
            </div>
          </div>
          <div className="dx-console" role="log" aria-live="polite">
            <ConsoleLines lines={result.logLines} />
          </div>
          {result.timeoutAtLine ? (
            <Alert tone="danger" title={`Timeout at line ${result.timeoutAtLine}`}>
              The tick budget (100 ms) was exhausted. That line almost always marks an unbounded loop —
              <span className="d-block mt-1 font-display">{(code.split("\n")[result.timeoutAtLine - 1] ?? "").trim()}</span>
              <button type="button" className="dx-btn dx-btn-sm dx-btn-link mt-1" onClick={() => { onJump(result.timeoutAtLine ?? 1); onClose(); }}>
                Jump to the line
              </button>
            </Alert>
          ) : null}
          <RunsTable runs={SCRIPT_RUNS.filter((r) => r.scriptId === (script?.id ?? ""))} ariaLabel="History for this script" pageSize={4} />
        </div>
      ) : null}
    </Dialog>
  );
}

// =============================================================================
// 8 — TEST SUITE (advanced feature #7) + SINGLE CASE
// =============================================================================
function TestSuiteDialog({
  script,
  suite,
  setSuite,
  onClose,
  onCase,
  setOverlay,
}: {
  script: Script | null;
  suite: ScriptOverlayProps["suite"];
  setSuite: ScriptOverlayProps["setSuite"];
  onClose: () => void;
  onCase: (id: string) => void;
  setOverlay: (o: ScriptOverlay) => void;
}) {
  const [tab, setTab] = useState("all");
  const all = suite?.rows ?? SCRIPT_TESTS.filter((t) => t.scriptId === (script?.id ?? ""));
  const rows = all.filter((t) => tab === "all" || t.layer === tab);
  const passed = all.filter((t) => t.status === "pass").length;
  const failed = all.filter((t) => t.status === "fail").length;
  return (
    <Dialog
      open
      onClose={onClose}
      title="Test suite"
      subtitle={`${script?.name ?? "Script"} · ${all.length} cases · ${passed} passing · ${failed} failing`}
      size="xl"
      footer={
        <div className="d-flex flex-wrap gap-2 justify-content-between w-100">
          <button type="button" className="dx-btn dx-btn-ghost" onClick={() => setOverlay({ kind: "script-backtest" })}><Gauge size={13} /> Backtest instead</button>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="dx-btn"
              onClick={() => {
                const next = runScriptSuite(script?.id ?? "", SCRIPT_TESTS);
                setSuite(next);
              }}
            >
              <RotateCcw size={13} /> Re-run suite
            </button>
            <button type="button" className="dx-btn dx-btn-primary" onClick={onClose}>Close</button>
          </div>
        </div>
      }
    >
      <div className="row g-2">
        <div className="col-6 col-lg-3"><StatCard label="Cases" value={all.length} footnote="declared with @test" /></div>
        <div className="col-6 col-lg-3"><StatCard label="Passing" value={passed} trend="green" trendDir="up" footnote={`${all.filter((t) => t.ci).length} run in CI`} /></div>
        <div className="col-6 col-lg-3"><StatCard label="Failing" value={failed} trend="blocks merge" trendDir="down" footnote="see the case detail" /></div>
        <div className="col-6 col-lg-3"><StatCard label="Wall time" value={all.reduce((sum, t) => sum + t.durationMs, 0)} suffix=" ms" footnote="sandbox worker" /></div>
      </div>
      <div className="mt-3">
        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            { id: "all", label: "All cases", badge: all.length },
            { id: "unit", label: "Unit", badge: all.filter((t) => t.layer === "unit").length },
            { id: "integration", label: "Integration", badge: all.filter((t) => t.layer === "integration").length },
            { id: "e2e", label: "E2E", badge: all.filter((t) => t.layer === "e2e").length },
          ]}
        />
        <div className="d-grid gap-2 mt-3">
          {rows.map((t) => (
            <button key={t.id} type="button" className="dx-api-row" onClick={() => onCase(t.id)}>
              <span className="d-flex flex-wrap align-items-center gap-2">
                {t.status === "pass" ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                <span className="fw-semibold">{t.scenario}</span>
                <Chip tone={t.status === "pass" ? "up" : t.status === "fail" ? "down" : "warn"}>{t.status}</Chip>
                <Chip tone="muted">{t.layer}</Chip>
                {t.ci ? <Chip tone="info">CI</Chip> : null}
                <span className="dx-help ms-auto font-display">{t.durationMs} ms · {ago(t.lastRunMin)}</span>
              </span>
              <span className="dx-help">{t.assertion}</span>
            </button>
          ))}
        </div>
      </div>
    </Dialog>
  );
}

function TestCaseDialog({ id, onClose, onJump, setOverlay }: { id: string; onClose: () => void; onJump: (line: number) => void; setOverlay: (o: ScriptOverlay) => void }) {
  const test = SCRIPT_TESTS.find((t) => t.id === id) ?? SCRIPT_TESTS[0];
  const script = SCRIPTS.find((s) => s.id === test.scriptId);
  return (
    <Dialog
      open
      onClose={onClose}
      title={test.scenario}
      subtitle={`${test.layer} · ${script?.name ?? test.scriptId} · assertion run in the sandbox worker`}
      size="lg"
      footer={
        <div className="d-flex flex-wrap gap-2 justify-content-between w-100">
          <button type="button" className="dx-btn dx-btn-ghost" onClick={() => setOverlay({ kind: "test-suite" })}><Layers size={13} /> Whole suite</button>
          <div className="d-flex gap-2">
            {test.line ? <button type="button" className="dx-btn" onClick={() => { onJump(test.line); onClose(); }}>Jump to line {test.line}</button> : null}
            <button type="button" className="dx-btn dx-btn-primary" onClick={onClose}>Close</button>
          </div>
        </div>
      }
    >
      <Alert tone={test.status === "pass" ? "up" : test.status === "fail" ? "danger" : "warn"} title={test.status === "pass" ? "Passing" : test.status === "fail" ? "Failing" : "Pending"}>
        {test.status === "fail"
          ? "This assertion fails on the current revision and blocks the CI gate. Fix the script, then re-run the suite before saving."
          : test.status === "pending"
            ? "The case has not run against the current revision yet — the suite runs on every save."
            : "The assertion holds on the current revision."}
      </Alert>
      <dl className="dx-kv mt-2">
        <dt>Assertion</dt>
        <dd className="font-display">{test.assertion}</dd>
        <dt>Layer</dt>
        <dd className="font-display">{test.layer}</dd>
        <dt>Runtime</dt>
        <dd className="font-display">{test.durationMs} ms</dd>
        <dt>Last run</dt>
        <dd className="font-display">{ago(test.lastRunMin)}</dd>
        <dt>CI gate</dt>
        <dd className="font-display">{test.ci ? "runs on every save" : "manual only"}</dd>
        <dt>Declared</dt>
        <dd className="font-display">{test.line ? `line ${test.line}` : "platform integration check"}</dd>
      </dl>
      {test.status === "fail" ? (
        <Alert tone="info" title="Suggested fix">
          Re-run the sandbox with the same seed to reproduce, then diff the failing frame in the profiler — the seed lived on the run so the tape is
          identical every time.
        </Alert>
      ) : null}
    </Dialog>
  );
}

// =============================================================================
// 9 — VERSION CONTROL (advanced feature #1)
// =============================================================================
function VersionsDrawer({
  script,
  onClose,
  onDiff,
  onRollback,
  onBranches,
}: {
  script: Script | null;
  onClose: () => void;
  onDiff: (a: string, b: string) => void;
  onRollback: (id: string) => void;
  onBranches: () => void;
}) {
  const all = SCRIPT_VERSIONS.filter((v) => v.scriptId === (script?.id ?? ""));
  const [compare, setCompare] = useState<string[]>([]);
  const state = useDataTable({
    rows: all,
    searchKeys: (v) => [v.version, v.message, v.author, v.branch, v.hash],
    sorters: { at: (v) => -v.atMin, version: (v) => v.version, tests: (v) => v.tests },
    filterKey: (v) => v.status,
    filterOptions: [
      { id: "current", label: "Current" },
      { id: "published", label: "Published" },
      { id: "rolled-back", label: "Rolled back" },
      { id: "merged", label: "Merged" },
    ],
    initialSort: "at",
    initialPageSize: 6,
  });
  return (
    <Drawer
      open
      onClose={onClose}
      wide
      title="Version history"
      subtitle={`${script?.name ?? "Script"} · ${all.length} commits · every save creates one`}
      footer={
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="dx-btn" disabled={compare.length !== 2} onClick={() => onDiff(compare[0], compare[1])}>
            <ArrowLeftRight size={13} /> Diff selected ({compare.length}/2)
          </button>
          <button type="button" className="dx-btn" onClick={onBranches}><GitBranch size={13} /> Branches &amp; merge</button>
          <button type="button" className="dx-btn dx-btn-ghost ms-auto" onClick={onClose}>Close history</button>
        </div>
      }
    >
      <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
        <SearchInput value={state.query} onChange={state.setQuery} placeholder="Search version, author, message…" />
        <FilterChips options={state.filterOptions} value={state.filter} onChange={state.setFilter} allLabel={`All (${all.length})`} />
      </div>
      <DataTable
        ariaLabel="Script version history"
        state={state}
        rowKey={(v) => v.id}
        emptyState={<EmptyState title="No commits yet" message="Save the script to create its first version commit." action={<button type="button" className="dx-btn" onClick={state.reset}>Reset filters</button>} />}
        columns={[
          {
            key: "version",
            header: "Version",
            cell: (v) => (
              <span className="d-flex align-items-start gap-2">
                <input
                  type="checkbox"
                  className="form-check-input mt-1"
                  aria-label={`Select ${v.version}`}
                  checked={compare.includes(v.id)}
                  onChange={() =>
                    setCompare((sel) => (sel.includes(v.id) ? sel.filter((s) => s !== v.id) : [...sel, v.id].slice(-2)))
                  }
                />
                <span className="d-flex flex-column">
                  <span className="fw-semibold font-display">{v.version}</span>
                  <span className="dx-help font-display">{v.hash} · {v.branch}</span>
                </span>
              </span>
            ),
            sortValue: (v) => v.version,
          },
          { header: "Message", cell: (v) => <span className="d-flex flex-column"><span>{v.message}</span><span className="dx-help">{v.author} · +{v.added}/-{v.removed}</span></span> },
          { header: "Tests", align: "end", cell: (v) => <span className="font-display">{v.tests}</span>, hideOnMobile: true },
          { header: "Checks", align: "end", cell: (v) => <Chip tone={v.checks === "passed" ? "up" : v.checks === "failed" ? "down" : "warn"}>{v.checks}</Chip> },
          { key: "at", header: "When", align: "end", cell: (v) => <span className="font-display">{ago(v.atMin)}</span>, sortValue: (v) => -v.atMin },
          { header: "Status", align: "end", cell: (v) => <Chip tone={v.status === "current" ? "up" : v.status === "rolled-back" ? "down" : "muted"}>{v.status}</Chip> },
          {
            header: "Actions",
            className: "dx-td-actions",
            cell: (v) => (
              <div className="d-flex justify-content-end gap-1">
                <button type="button" className="dx-btn dx-btn-sm" onClick={() => onDiff(v.id, all[0]?.id ?? v.id)}>Diff vs current</button>
                <Dropdown
                  label={`Actions for ${v.version}`}
                  align="end"
                  trigger={<span className="dx-btn dx-btn-sm">More</span>}
                  items={[
                    { id: "diff", label: "Diff against the version above", onSelect: () => onDiff(v.id, all[0]?.id ?? v.id) },
                    { id: "restore", label: "Open this version in the editor", onSelect: () => onRollback(v.id) },
                    { type: "divider" },
                    { id: "rollback", label: "Roll back to this version", danger: true, onSelect: () => onRollback(v.id) },
                  ]}
                />
              </div>
            ),
          },
        ]}
      />
    </Drawer>
  );
}

function VersionDiffDialog({
  a,
  b,
  onClose,
  onRollback,
  onOpenVersions,
}: {
  a: string;
  b: string;
  onClose: () => void;
  onRollback: (id: string) => void;
  onOpenVersions: () => void;
}) {
  const left = SCRIPT_VERSIONS.find((v) => v.id === a) ?? SCRIPT_VERSIONS[0];
  const right = SCRIPT_VERSIONS.find((v) => v.id === b) ?? SCRIPT_VERSIONS[0];
  const [mode, setMode] = useState("unified");
  const [worker, setWorker] = useState(true);
  const before = scriptSource(left.scriptId).split("\n").map((l, i) => (i === 6 ? "// reverted locally for the diff demo" : l)).join("\n");
  const after = left.scriptId === right.scriptId ? scriptSource(left.scriptId) : before;
  const rows = useMemo(() => diffCode(before, after), [before, after]);
  const added = rows.filter((r) => r.kind === "add").length;
  const removed = rows.filter((r) => r.kind === "remove").length;
  return (
    <Dialog
      open
      onClose={onClose}
      title={`${left.version} → ${right.version}`}
      subtitle={`${added} added · ${removed} removed · diff computed ${worker ? "in the worker" : "on the main thread"}`}
      size="xl"
      footer={
        <div className="d-flex flex-wrap gap-2 justify-content-between w-100">
          <button type="button" className="dx-btn dx-btn-ghost" onClick={onOpenVersions}><History size={13} /> Back to history</button>
          <div className="d-flex gap-2">
            <CopyButton text={after} label="Copy target source" />
            <button type="button" className="dx-btn dx-btn-danger" onClick={() => onRollback(left.id)}>
              <RotateCcw size={13} /> Roll back to {left.version}
            </button>
            <button type="button" className="dx-btn dx-btn-primary" onClick={onClose}>Close diff</button>
          </div>
        </div>
      }
    >
      <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
        <MiniTabs
          ariaLabel="Diff mode"
          value={mode}
          onChange={setMode}
          options={[
            { id: "unified", label: "Unified" },
            { id: "changes", label: "Changes only" },
            { id: "meta", label: "Commit meta" },
          ]}
        />
        <span className="ms-auto">
          <Toggle checked={worker} onChange={setWorker} label="Compute in the sandbox worker" />
        </span>
      </div>
      {mode === "meta" ? (
        <div className="d-grid gap-2">
          {[left, right].map((v) => (
            <div key={v.id} className="dx-card-inset">
              <div className="d-flex flex-wrap align-items-center gap-2">
                <Chip tone={v.status === "current" ? "up" : "muted"}>{v.status}</Chip>
                <span className="font-display fw-semibold">{v.version}</span>
                <span className="dx-help ms-auto font-display">{v.hash} · {v.branch}</span>
              </div>
              <span className="d-block">{v.message}</span>
              <span className="dx-help font-display">{v.author} · {ago(v.atMin)} · +{v.added}/-{v.removed} · {v.tests} tests · checks {v.checks}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="dx-code-panel">
          <div className="dx-code-scroll">
            {(mode === "changes" ? rows.filter((r) => r.kind !== "same") : rows).map((r, i) => (
              <div key={`${i}-${r.kind}`} className={`dx-diff-row ${r.kind === "add" ? "is-add" : r.kind === "remove" ? "is-remove" : ""}`}>
                <span className="dx-diff-num">{r.a ?? ""}</span>
                <span className="dx-diff-num">{r.b ?? ""}</span>
                <span className="dx-diff-text">
                  {r.kind === "add" ? "+ " : r.kind === "remove" ? "- " : "  "}
                  {r.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      <Alert tone="info" title="Rollback is versioned too">
        Rolling back creates a new commit pointing at the old source — nothing is deleted, so the rollback itself can be undone from the history.
      </Alert>
    </Dialog>
  );
}

function RollbackDialog({ id, onClose, onConfirm, onDiff }: { id: string; onClose: () => void; onConfirm: (version: ScriptVersion) => void; onDiff: () => void }) {
  const version = SCRIPT_VERSIONS.find((v) => v.id === id) ?? SCRIPT_VERSIONS[0];
  const meta = scriptMetaOf(version.scriptId);
  const [reload, setReload] = useState(true);
  return (
    <Dialog
      open
      onClose={onClose}
      title={`Roll back to ${version.version}`}
      subtitle="Restores the source exactly as it was committed — drafts are discarded"
      size="md"
      footer={
        <div className="d-flex flex-wrap gap-2 justify-content-between w-100">
          <button type="button" className="dx-btn dx-btn-ghost" onClick={onDiff}><ArrowLeftRight size={13} /> Diff first</button>
          <div className="d-flex gap-2">
            <button type="button" className="dx-btn" onClick={onClose}>Cancel</button>
            <button type="button" className="dx-btn dx-btn-danger" onClick={() => onConfirm(version)}>
              <RotateCcw size={13} /> Roll back
            </button>
          </div>
        </div>
      }
    >
      <Alert tone="warn" title={`${version.message}`}>
        {version.author} committed this {ago(version.atMin)} on {version.branch} · +{version.added}/-{version.removed} · {version.tests} tests {version.checks}.
      </Alert>
      <dl className="dx-kv mt-2">
        <dt>Target</dt>
        <dd className="font-display">{version.version} · {version.hash}</dd>
        <dt>Current</dt>
        <dd className="font-display">v{meta?.version?.replace("v", "")} · working copy</dd>
        <dt>Bots reloaded</dt>
        <dd className="font-display">{(meta?.usedByBots ?? []).join(", ") || "none attached"}</dd>
      </dl>
      <Toggle checked={reload} onChange={setReload} label="Reload attached bots immediately after the rollback" />
    </Dialog>
  );
}

function BranchesDrawer({
  script,
  onClose,
  onCreate,
  onMerge,
}: {
  script: Script | null;
  onClose: () => void;
  onCreate: () => void;
  onMerge: (id: string) => void;
}) {
  const rows = SCRIPT_BRANCHES.filter((b) => b.scriptId === (script?.id ?? ""));
  const state = useDataTable({
    rows,
    searchKeys: (b) => [b.name, b.author, b.note, b.status],
    sorters: { updated: (b) => -b.updatedMin, ahead: (b) => b.ahead, commits: (b) => b.commits },
    filterKey: (b) => b.status,
    filterOptions: [
      { id: "active", label: "Active" },
      { id: "protected", label: "Protected" },
      { id: "stale", label: "Stale" },
      { id: "merged", label: "Merged" },
    ],
    initialSort: "updated",
    initialPageSize: 6,
  });
  return (
    <Drawer
      open
      onClose={onClose}
      wide
      title="Branches"
      subtitle={`${script?.name ?? "Script"} · ${rows.length} branches · protected branches need a merge review`}
      footer={
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="dx-btn dx-btn-primary" onClick={onCreate}><GitBranch size={13} /> New branch</button>
          <button type="button" className="dx-btn dx-btn-ghost ms-auto" onClick={onClose}>Close branches</button>
        </div>
      }
    >
      <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
        <SearchInput value={state.query} onChange={state.setQuery} placeholder="Search branch, author, note…" />
        <FilterChips options={state.filterOptions} value={state.filter} onChange={state.setFilter} allLabel={`All (${rows.length})`} />
      </div>
      <DataTable
        ariaLabel="Script branches"
        state={state}
        rowKey={(b) => b.id}
        emptyState={<EmptyState title="No branches" message="Create a branch to experiment without touching main." action={<button type="button" className="dx-btn" onClick={onCreate}>New branch</button>} />}
        columns={[
          { key: "name", header: "Branch", cell: (b) => <span className="d-flex flex-column"><span className="fw-semibold font-display">{b.name}</span><span className="dx-help">{b.author} · {b.commits} commits</span></span>, sortValue: (b) => b.name },
          { header: "Ahead / behind", align: "end", cell: (b) => <span className="font-display">{b.ahead} / {b.behind}</span> },
          { header: "CI", cell: (b) => <Chip tone={b.ci === "passing" ? "up" : b.ci === "failing" ? "down" : "warn"}>{b.ci}</Chip> },
          { key: "updated", header: "Updated", align: "end", cell: (b) => <span className="font-display">{ago(b.updatedMin)}</span>, sortValue: (b) => -b.updatedMin, hideOnMobile: true },
          { header: "Status", cell: (b) => <Chip tone={b.status === "protected" ? "info" : b.status === "stale" ? "warn" : "muted"}>{b.status}</Chip> },
          {
            header: "Actions",
            className: "dx-td-actions",
            cell: (b) => (
              <div className="d-flex justify-content-end gap-1">
                <button type="button" className="dx-btn dx-btn-sm" disabled={b.status === "protected"} onClick={() => onMerge(b.id)}>Merge</button>
                <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={onClose}>View commits</button>
              </div>
            ),
          },
        ]}
      />
      <div className="d-grid gap-2 mt-3">
        {rows.map((b) => (
          <span key={`note-${b.id}`} className="dx-help">
            <span className="font-display">{b.name}</span> — {b.note}
          </span>
        ))}
      </div>
    </Drawer>
  );
}

function BranchCreateDialog({ script, onClose, onCreate }: { script: Script | null; onClose: () => void; onCreate: (name: string, from: string, protect: boolean) => void }) {
  const [name, setName] = useState("feature/");
  const [from, setFrom] = useState(SCRIPT_BRANCHES.find((b) => b.scriptId === script?.id && b.status === "protected")?.name ?? "main");
  const [protect, setProtect] = useState(false);
  const branches = SCRIPT_BRANCHES.filter((b) => b.scriptId === (script?.id ?? ""));
  const error = !/^[a-z0-9-]+\/[a-z0-9-]+$/.test(name) ? "Use the prefix/name shape, lower-case with hyphens (feature/cooldown-v2)." : branches.some((b) => b.name === name) ? "That branch already exists." : "";
  return (
    <Dialog
      open
      onClose={onClose}
      title="New branch"
      subtitle={`Fork ${script?.name ?? "the script"} so experiments never touch a protected branch`}
      size="md"
      footer={
        <div className="d-flex gap-2 justify-content-end w-100">
          <button type="button" className="dx-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="dx-btn dx-btn-primary" disabled={Boolean(error)} onClick={() => onCreate(name, from, protect)}>
            <GitBranch size={13} /> Create branch
          </button>
        </div>
      }
    >
      <Field label="Branch name" required error={error}>
        <input className="dx-input font-display" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="mt-3">
        <Field label="Branch from">
          <select className="dx-select font-display" value={from} onChange={(e) => setFrom(e.target.value)}>
            {branches.map((b) => (
              <option key={b.id} value={b.name}>{b.name} · {b.commits} commits</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="mt-3">
        <Toggle checked={protect} onChange={setProtect} label="Protect this branch — merges require a passing suite" />
      </div>
      <Alert tone="info" title="What happens next">
        The branch points at the current commit. Switch to it in the toolbar, edit, and merge it back through the merge wizard.
      </Alert>
    </Dialog>
  );
}

function BranchMergeWizard({ id, script, onClose, onMerge }: { id: string; script: Script | null; onClose: () => void; onMerge: (id: string, target: string) => void }) {
  const branch = SCRIPT_BRANCHES.find((b) => b.id === id) ?? SCRIPT_BRANCHES[0];
  const targets = SCRIPT_BRANCHES.filter((b) => b.scriptId === branch.scriptId && b.id !== branch.id);
  const [step, setStep] = useState(0);
  const [target, setTarget] = useState(targets.find((t) => t.status === "protected")?.id ?? targets[0]?.id ?? "");
  const [squash, setSquash] = useState(true);
  const source = scriptSource(branch.scriptId);
  const merged = source.replace("let stake = initStake;", "let stake = initStake; // merged from " + branch.name);
  const rows = useMemo(() => diffCode(source, merged), [source, merged]);
  const conflicts = rows.filter((r) => r.kind === "remove").length;
  return (
    <Dialog
      open
      onClose={onClose}
      title={`Merge ${branch.name}`}
      subtitle={`${branch.commits} commits · ${branch.ahead} ahead of the target · CI ${branch.ci}`}
      size="xl"
      footer={
        <div className="d-flex flex-wrap gap-2 justify-content-between w-100">
          <button type="button" className="dx-btn" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</button>
          <div className="d-flex gap-2">
            {step < 2 ? (
              <button type="button" className="dx-btn dx-btn-primary" disabled={step === 0 && !target} onClick={() => setStep((s) => s + 1)}>Continue</button>
            ) : (
              <button
                type="button"
                className="dx-btn dx-btn-primary"
                disabled={branch.ci === "failing" || conflicts > 0}
                onClick={() => { onMerge(branch.id, target); onClose(); }}
              >
                <GitMerge size={13} /> Merge &amp; run CI
              </button>
            )}
          </div>
        </div>
      }
    >
      <nav role="navigation" aria-label="Merge steps">
        <Stepper
          steps={[{ id: "target", label: "Target" }, { id: "preview", label: "Preview" }, { id: "confirm", label: "Merge" }]}
          active={step}
          onStepClick={(i) => setStep(i <= 2 ? i : step)}
        />
      </nav>
      <div className="mt-3">
        {step === 0 ? (
          <div className="d-grid gap-2">
            {targets.map((t) => (
              <button key={t.id} type="button" className="dx-api-row" aria-pressed={target === t.id} onClick={() => setTarget(t.id)}>
                <span className="d-flex flex-wrap align-items-center gap-2">
                  <span className="font-display fw-semibold">{t.name}</span>
                  {t.status === "protected" ? <Chip tone="info"><Lock size={10} /> protected</Chip> : null}
                  <Chip tone={t.ci === "passing" ? "up" : "warn"}>CI {t.ci}</Chip>
                  <span className="dx-help ms-auto font-display">{t.commits} commits · updated {ago(t.updatedMin)}</span>
                </span>
                <span className="dx-help">{t.note}</span>
              </button>
            ))}
          </div>
        ) : null}
        {step === 1 ? (
          <div className="d-grid gap-3">
            <div className="d-flex flex-wrap align-items-center gap-2">
              <Chip tone={conflicts ? "down" : "up"}>{conflicts ? `${conflicts} conflict(s)` : "no conflicts"}</Chip>
              <Chip tone="muted">{branch.name} → {targets.find((t) => t.id === target)?.name ?? target}</Chip>
              <span className="dx-help ms-auto">Diff computed in the sandbox worker</span>
            </div>
            <div className="dx-code-panel">
              <div className="dx-code-scroll">
                {rows.filter((r) => r.kind !== "same").map((r, i) => (
                  <div key={`${i}-${r.kind}`} className={`dx-diff-row ${r.kind === "add" ? "is-add" : "is-remove"}`}>
                    <span className="dx-diff-num">{r.a ?? ""}</span>
                    <span className="dx-diff-num">{r.b ?? ""}</span>
                    <span className="dx-diff-text">{r.kind === "add" ? "+ " : "- "}{r.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <Toggle checked={squash} onChange={setSquash} label={`Squash ${branch.commits} commits into one on the target branch`} />
          </div>
        ) : null}
        {step === 2 ? (
          <div className="d-grid gap-3">
            <dl className="dx-kv">
              <dt>Source</dt>
              <dd className="font-display">{branch.name} ({branch.ahead} ahead, {branch.behind} behind)</dd>
              <dt>Target</dt>
              <dd className="font-display">{targets.find((t) => t.id === target)?.name ?? target}</dd>
              <dt>Strategy</dt>
              <dd className="font-display">{squash ? "squash merge" : "merge commit"}</dd>
              <dt>CI</dt>
              <dd className="font-display">{branch.ci} · {SCRIPT_TESTS.filter((t) => t.scriptId === branch.scriptId).length} cases will run</dd>
            </dl>
            {branch.ci === "failing" ? (
              <Alert tone="danger" title="CI is red on this branch">
                The suite has failing cases ({SCRIPT_TESTS.filter((t) => t.scriptId === branch.scriptId && t.status === "fail").map((t) => t.scenario).join(", ")}). Fix them or merge with an override once the branch is green.
              </Alert>
            ) : (
              <Alert tone="up" title="Ready to merge">Target branch {targets.find((t) => t.id === target)?.name ?? ""} accepts this merge; the suite runs immediately after.</Alert>
            )}
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}

// =============================================================================
// 10 — DEPENDENCIES + MODULE STUBS (advanced feature #5, edge case #4)
// =============================================================================
function DependenciesDrawer({
  script,
  onClose,
  onStub,
  onAdd,
  onInsert,
}: {
  script: Script | null;
  onClose: () => void;
  onStub: (module: string) => void;
  onAdd: () => void;
  onInsert: (code: string) => void;
}) {
  const id = script?.id ?? "";
  const deps = SCRIPT_DEPENDENCIES.filter((d) => d.fromScriptId === id);
  const graph = useMemo(() => dependencyGraphOf(id), [id]);
  const [tab, setTab] = useState("graph");
  const state = useDataTable({
    rows: deps,
    searchKeys: (d) => [d.module, d.purpose, d.license, d.status],
    sorters: { module: (d) => d.module, size: (d) => d.sizeKb, status: (d) => d.status },
    filterKey: (d) => d.status,
    filterOptions: [
      { id: "ok", label: "Resolved" },
      { id: "outdated", label: "Outdated" },
      { id: "missing", label: "Missing" },
      { id: "circular", label: "Circular" },
    ],
    initialPageSize: 6,
  });
  const nodesById = new Map(graph.nodes.map((n) => [n.id, n]));
  return (
    <Drawer
      open
      onClose={onClose}
      wide
      title="Dependencies"
      subtitle={`${script?.name ?? "Script"} · ${deps.length} imports · versioned and lockable`}
      footer={
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="dx-btn dx-btn-primary" onClick={onAdd}><Plus size={13} /> Add module</button>
          <button
            type="button"
            className="dx-btn"
            onClick={() => onInsert('const ind = require("indicators.js"); // pinned 2.4.0')}
          >
            <Code2 size={13} /> Insert require() line
          </button>
          <button type="button" className="dx-btn dx-btn-ghost ms-auto" onClick={onClose}>Close dependencies</button>
        </div>
      }
    >
      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "graph", label: "Graph" },
          { id: "table", label: "Imports", badge: deps.length },
        ]}
      />
      <div className="mt-3">
        {tab === "graph" ? (
          <div className="d-grid gap-3">
            <div className="dx-graph" role="img" aria-label="Dependency graph">
              {graph.edges.map((e) => {
                const from = nodesById.get(e.from);
                const to = nodesById.get(e.to);
                if (!from || !to) return null;
                const dx = to.x - from.x;
                const dy = to.y - from.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
                return (
                  <span
                    key={`${e.from}-${e.to}`}
                    className={`dx-graph-edge ${e.status === "missing" ? "is-missing" : e.status === "circular" ? "is-circular" : ""}`}
                    style={{ left: `${from.x}%`, top: `${from.y}%`, width: `${length}%`, transform: `rotate(${angle}deg)` }}
                    title={`${from.label} → ${to.label} (${e.label})`}
                  />
                );
              })}
              {graph.nodes.map((n) => (
                <span
                  key={n.id}
                  className={`dx-graph-node ${n.kind === "missing" ? "is-missing" : n.kind === "circular" ? "is-circular" : n.kind === "script" ? "is-root" : ""}`}
                  style={{ left: `${n.x}%`, top: `${n.y}%` }}
                  title={`${n.label} · ${n.status}`}
                >
                  {n.kind === "script" ? <FileCode2 size={11} /> : <Layers size={11} />} {n.label}
                </span>
              ))}
            </div>
            <div className="d-flex flex-wrap gap-2">
              <Chip tone="up">resolved</Chip>
              <Chip tone="warn">outdated</Chip>
              <Chip tone="down">missing</Chip>
              <Chip tone="muted">{graph.nodes.length} nodes · {graph.edges.length} edges</Chip>
            </div>
            {deps.some((d) => d.status === "missing") ? (
              <Alert tone="danger" title="Module not found">
                {deps.filter((d) => d.status === "missing").map((d) => d.module).join(", ")} is not published in this workspace. The editor blocks the save
                until the import resolves — create a stub, or swap it for an SDK module.
                <span className="d-block mt-2">
                  {deps.filter((d) => d.status === "missing").map((d) => (
                    <button key={d.id} type="button" className="dx-btn dx-btn-sm dx-btn-primary me-2" onClick={() => onStub(d.module)}>
                      <Layers size={12} /> Create {d.module} stub
                    </button>
                  ))}
                </span>
              </Alert>
            ) : null}
            {deps.some((d) => d.status === "circular") ? (
              <Alert tone="warn" title="Circular import">
                {deps.filter((d) => d.status === "circular").map((d) => d.module).join(", ")} imports this script back. Extract the shared helper into a third
                module both can import, then re-run the suite.
              </Alert>
            ) : null}
          </div>
        ) : (
          <>
            <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
              <SearchInput value={state.query} onChange={state.setQuery} placeholder="Search module, licence…" />
              <FilterChips options={state.filterOptions} value={state.filter} onChange={state.setFilter} allLabel={`All (${deps.length})`} />
            </div>
            <DataTable
              ariaLabel="Script dependencies"
              state={state}
              rowKey={(d) => d.id}
              emptyState={<EmptyState title="No imports" message="This script only uses engine globals." action={<button type="button" className="dx-btn" onClick={onAdd}>Add module</button>} />}
              columns={[
                { key: "module", header: "Module", cell: (d) => <span className="d-flex flex-column"><span className="fw-semibold font-display">{d.module}</span><span className="dx-help">{d.purpose}</span></span>, sortValue: (d) => d.module },
                { header: "Pinned", align: "end", cell: (d) => <span className="font-display">{d.version}{d.locked ? " 🔒" : ""}</span>, hideOnMobile: true },
                { header: "Latest", align: "end", cell: (d) => <span className="font-display">{d.latest}</span> },
                { key: "size", header: "Size", align: "end", cell: (d) => <span className="font-display">{d.sizeKb} kB</span>, sortValue: (d) => d.sizeKb, hideOnMobile: true },
                { header: "Licence", cell: (d) => <span className="dx-help font-display">{d.license}</span>, hideOnMobile: true },
                { key: "status", header: "Status", align: "end", cell: (d) => <Chip tone={d.status === "ok" ? "up" : d.status === "missing" ? "down" : "warn"}>{d.status}</Chip>, sortValue: (d) => d.status },
                {
                  header: "Actions",
                  className: "dx-td-actions",
                  cell: (d) => (
                    <div className="d-flex justify-content-end gap-1">
                      {d.status === "missing" ? (
                        <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => onStub(d.module)}>Stub</button>
                      ) : (
                        <button type="button" className="dx-btn dx-btn-sm" onClick={() => onInsert(`const ${d.module.replace(".js", "")} = require("${d.module}"); // pinned ${d.latest}`)}>Insert</button>
                      )}
                      <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" disabled={d.status === "missing"} onClick={onAdd}>Pin version</button>
                    </div>
                  ),
                },
              ]}
            />
          </>
        )}
      </div>
    </Drawer>
  );
}

function ModuleStubDialog({ module, onClose, onInsert }: { module: string; onClose: () => void; onInsert: (code: string) => void }) {
  const base = module.replace(".js", "");
  const stub = `/** ${module} — local stub created from the Script Studio.
 *  Replace the bodies with the real implementation when the module is published.
 */
function zScore(symbol, opts) {
  // Scaffold body: returns ready:false so callers guard instead of trading blind
  return { ready: false, value: 0, symbol: symbol, lookback: (opts && opts.lookback) || "4h" };
}

module.exports = { zScore: zScore };`;
  const [pinned, setPinned] = useState("0.1.0-local");
  return (
    <Dialog
      open
      onClose={onClose}
      title={`Create ${module} stub`}
      subtitle="Unblocks the save — the import resolves locally until the real module ships"
      size="lg"
      footer={
        <div className="d-flex flex-wrap gap-2 justify-content-between w-100">
          <CopyButton text={stub} label="Copy stub" />
          <div className="d-flex gap-2">
            <button type="button" className="dx-btn" onClick={onClose}>Cancel</button>
            <button type="button" className="dx-btn dx-btn-primary" onClick={() => { onInsert(stub); onClose(); }}>
              <Layers size={13} /> Create stub &amp; insert
            </button>
          </div>
        </div>
      }
    >
      <div className="row g-3">
        <div className="col-12 col-md-4">
          <Field label="Stub version" help="Local stubs are versioned like any module.">
            <input className="dx-input font-display" value={pinned} onChange={(e) => setPinned(e.target.value)} />
          </Field>
          <div className="dx-card-inset mt-3">
            <span className="dx-kpi-label">Exports to implement</span>
            <span className="dx-help d-block font-display">{base === "vol_bands" ? "zScore(symbol, opts)" : "see the call sites"}</span>
          </div>
        </div>
        <div className="col-12 col-md-8">
          <CodeBlock code={stub} maxHeight={280} />
        </div>
      </div>
      <Alert tone="info" title="Stubs are honest by construction">
        The stub returns <span className="font-display">ready: false</span>, so the script skips ticks instead of trading on fake numbers. Swap it for the real
        module the moment it is published.
      </Alert>
    </Dialog>
  );
}

function DependencyAddDialog({ script, onClose, onInsert }: { script: Script | null; onClose: () => void; onInsert: (code: string) => void }) {
  const options = ["indicators.js", "state.js", "risk.js", "session_filter.js", "digit_stats.js", "grid_tools.js", "touch_levels.js", "carry_feed.js"];
  const [module, setModule] = useState(options[0]);
  const [version, setVersion] = useState("2.4.0");
  const [locked, setLocked] = useState(true);
  const known = SCRIPT_DEPENDENCIES.find((d) => d.module === module);
  return (
    <Dialog
      open
      onClose={onClose}
      title="Add module import"
      subtitle={`${script?.name ?? "Script"} · versioned requires help the sandbox stay reproducible`}
      size="lg"
      footer={
        <div className="d-flex gap-2 justify-content-end w-100">
          <button type="button" className="dx-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="dx-btn dx-btn-primary" onClick={() => { onInsert(`const mod = require("${module}"); // ${locked ? "pinned " : "floating "}${version}`); onClose(); }}>
            <Plus size={13} /> Add import
          </button>
        </div>
      }
    >
      <div className="row g-3">
        <div className="col-12 col-md-5">
          <Field label="Module" help="Only SDK and workspace modules resolve inside the sandbox.">
            <select className="dx-select font-display" value={module} onChange={(e) => { setModule(e.target.value); setVersion(SCRIPT_DEPENDENCIES.find((d) => d.module === e.target.value)?.latest ?? "1.0.0"); }}>
              {options.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="col-12 col-md-3">
          <Field label="Version">
            <input className="dx-input font-display" value={version} onChange={(e) => setVersion(e.target.value)} />
          </Field>
        </div>
        <div className="col-12 col-md-4 d-flex align-items-end">
          <Toggle checked={locked} onChange={setLocked} label="Lock the version" />
        </div>
        <div className="col-12">
          <div className="dx-card-inset">
            <span className="dx-kpi-label">{module}</span>
            <span className="dx-help d-block">{known?.purpose ?? "Workspace module — check its documentation before pinning."}</span>
            <span className="dx-help font-display">
              current {known?.version ?? "—"} · latest {known?.latest ?? "—"} · {known?.sizeKb ?? 0} kB · {known?.license ?? "unknown licence"}
            </span>
          </div>
        </div>
      </div>
      <Alert tone="warn" title="Floating versions drift">
        An unlocked import picks up the newest published version on every restart. Lock it once the suite is green.
      </Alert>
    </Dialog>
  );
}

// =============================================================================
// 11 — PROFILER + DEBUGGER (advanced features #4, #6)
// =============================================================================
function ProfilerDrawer({
  script,
  code,
  run,
  onClose,
  onJump,
  onInsert,
}: {
  script: Script | null;
  code: string;
  run: SandboxRun | null;
  onClose: () => void;
  onJump: (line: number) => void;
  onInsert: (code: string) => void;
}) {
  const frames = useMemo(() => profileScript(script?.id ?? ""), [script?.id]);
  const [tab, setTab] = useState("frames");
  const state = useDataTable({
    rows: frames,
    searchKeys: (f) => [f.fn, String(f.line)],
    sorters: { ms: (f) => f.totalMs, calls: (f) => f.calls, pct: (f) => f.pct, mem: (f) => f.peakMemoryMb },
    initialSort: "ms",
    initialPageSize: 6,
  });
  const hot = frames.filter((f) => f.hot);
  const sample = run?.memory?.length ? run.memory : frames.map((f) => f.peakMemoryMb);
  return (
    <Drawer
      open
      onClose={onClose}
      wide
      title="Live profile"
      subtitle={`${script?.name ?? "Script"} · ${run ? `${run.ticks} ticks sampled` : "last sandbox run"} · ${hot.length} hot frame(s)`}
      footer={
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="dx-btn dx-btn-primary" onClick={() => onJump(hot[0]?.line ?? 1)}><Gauge size={13} /> Jump to the hottest line</button>
          <button type="button" className="dx-btn dx-btn-ghost ms-auto" onClick={onClose}>Close profiler</button>
        </div>
      }
    >
      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "frames", label: "Frames", badge: frames.length },
          { id: "memory", label: "Memory" },
          { id: "advice", label: "Optimisation" },
        ]}
      />
      <div className="mt-3">
        {tab === "frames" ? (
          <>
            <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
              <SearchInput value={state.query} onChange={state.setQuery} placeholder="Search function or line…" />
              <span className="dx-help ms-auto">Budget: 100 ms per tick</span>
            </div>
            <DataTable
              ariaLabel="Profiler frames"
              state={state}
              rowKey={(f) => f.id}
              onRowClick={(f) => onJump(f.line)}
              columns={[
                { key: "ms", header: "Frame", cell: (f) => <span className="d-flex flex-column"><span className="fw-semibold font-display">{f.fn}()</span><span className="dx-help font-display">line {f.line}</span></span>, sortValue: (f) => f.fn },
                { key: "calls", header: "Calls", align: "end", cell: (f) => <span className="font-display">{f.calls.toLocaleString("en-US")}</span>, sortValue: (f) => f.calls },
                { key: "ms", header: "Total", align: "end", cell: (f) => <span className="font-display">{f.totalMs.toFixed(1)} ms</span>, sortValue: (f) => f.totalMs },
                { header: "Avg", align: "end", cell: (f) => <span className="font-display">{f.avgMs.toFixed(2)} ms</span>, hideOnMobile: true },
                { key: "pct", header: "Share", align: "end", cell: (f) => <span className="font-display">{pct(f.pct, 1)}</span>, sortValue: (f) => f.pct },
                { key: "mem", header: "Heap", align: "end", cell: (f) => <span className="font-display">{f.peakMemoryMb} MB</span>, sortValue: (f) => f.peakMemoryMb, hideOnMobile: true },
                { header: "Flag", align: "end", cell: (f) => <Chip tone={f.hot ? "warn" : "muted"}>{f.hot ? "hot spot" : "ok"}</Chip> },
              ]}
            />
          </>
        ) : null}
        {tab === "memory" ? (
          <div className="d-grid gap-3">
            <div>
              <span className="dx-kpi-label">Heap over the run (128 MB ceiling)</span>
              <LineChart data={sample} height={170} tone={Math.max(...sample) >= 120 ? "down" : "accent"} ariaLabel="Heap usage" yFormat={(v) => `${Math.round(v)} MB`} />
            </div>
            <div className="row g-2">
              <div className="col-6 col-lg-3"><StatCard label="Sampled heap" value={Math.max(...sample)} suffix=" MB" footnote="peak across the run" /></div>
              <div className="col-6 col-lg-3"><StatCard label="Ceiling" value={128} suffix=" MB" footnote="abort threshold" /></div>
              <div className="col-6 col-lg-3"><StatCard label="Headroom" value={Math.max(0, 128 - Math.max(...sample))} suffix=" MB" footnote="before the abort" /></div>
              <div className="col-6 col-lg-3"><StatCard label="Lines kept" value={code.split("\n").length} footnote="script size" /></div>
            </div>
            {Math.max(...sample) >= 120 ? (
              <Alert tone="danger" title="Close to the ceiling">
                The heap peaked at {Math.max(...sample)} MB. Unbounded arrays are the usual cause — cap the buffer or move history reads to
                <span className="font-display"> getHistory(n)</span>, which is streamed from the engine instead of stored.
                <span className="d-block mt-2">
                  <button
                    type="button"
                    className="dx-btn dx-btn-sm dx-btn-primary"
                    onClick={() => onInsert(`const buffer = [];\nif (buffer.length >= 200) buffer.shift();\nbuffer.push({ epoch: tick.epoch, price: tick.price, stake: stake });`)}
                  >
                    <Wand2 size={12} /> Insert the capped-buffer fix
                  </button>
                </span>
              </Alert>
            ) : (
              <Alert tone="up" title="Headroom is healthy">The run stays well inside the 128 MB sandbox budget.</Alert>
            )}
          </div>
        ) : null}
        {tab === "advice" ? (
          <div className="d-grid gap-2">
            {[
              { id: "a1", title: "Hoist indicator reads out of onTick", body: "ind.rsi() recomputes the whole window every tick. Cache it per symbol and refresh on a cadence.", ms: 42 },
              { id: "a2", title: "Cap the tick buffer", body: "Keep the last 200 rows; longer windows belong in getHistory(n).", ms: 1_284 },
              { id: "a3", title: "Guard the loop bound", body: "A bounded for-loop over getHistory(50) replaces while(true) and cannot time out.", ms: 100 },
              { id: "a4", title: "Skip recomputation on flat ticks", body: "Return early when tick.price equals the previous price — those ticks settle nothing.", ms: 18 },
            ].map((a) => (
              <div key={a.id} className="dx-card-inset">
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <Zap size={13} />
                  <span className="fw-semibold">{a.title}</span>
                  <Chip tone="warn">~{a.ms} ms saved</Chip>
                </div>
                <span className="dx-help d-block">{a.body}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </Drawer>
  );
}

function DebuggerDrawer({
  script,
  code,
  breakpoints,
  setBreakpoints,
  onClose,
  onAddBreakpoint,
  onJump,
  onRun,
}: {
  script: Script | null;
  code: string;
  breakpoints: Breakpoint[];
  setBreakpoints: (b: Breakpoint[]) => void;
  onClose: () => void;
  onAddBreakpoint: (line: number) => void;
  onJump: (line: number) => void;
  onRun: () => void;
}) {
  const [tab, setTab] = useState("breakpoints");
  const [paused, setPaused] = useState(true);
  const [tickIndex, setTickIndex] = useState(18);
  const [line, setLine] = useState(breakpoints[0]?.line ?? 14);
  const lines = code.split("\n");
  const top = breakpoints.filter((b) => b.enabled).sort((a, b) => a.line - b.line)[0];
  const locals = [
    { name: "stake", value: "2.80", note: "after two losses" },
    { name: "last.win", value: "false", note: "settled at exit spot 6423.11" },
    { name: "getBalance()", value: "4820.55", note: "CR8842197" },
    { name: "getOpenContracts().length", value: "1", note: "one R_10 leg running" },
    { name: "tick.epoch", value: "1781264820", note: "server second" },
    { name: "tick.price", value: "6423.752", note: "pipSize 3" },
  ];
  return (
    <Drawer
      open
      onClose={onClose}
      wide
      title="Debugger"
      subtitle={`${script?.name ?? "Script"} · ${breakpoints.length} breakpoint(s) · paused execution steps tick by tick`}
      footer={
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="dx-btn dx-btn-primary" onClick={() => setPaused(false)}><Play size={13} /> Resume to next breakpoint</button>
          <button type="button" className="dx-btn" onClick={() => setPaused(true)} disabled={paused}>Re-pause</button>
          <button type="button" className="dx-btn dx-btn-ghost ms-auto" onClick={onClose}>Close debugger</button>
        </div>
      }
    >
      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "breakpoints", label: "Breakpoints", badge: breakpoints.length },
          { id: "state", label: "Inspect" },
          { id: "steps", label: "Tick stepper" },
        ]}
      />
      <div className="mt-3">
        {tab === "breakpoints" ? (
          <div className="d-grid gap-2">
            <div className="d-flex flex-wrap align-items-center gap-2">
              <button type="button" className="dx-btn dx-btn-sm" onClick={() => onAddBreakpoint(breakpoints.length ? breakpoints[breakpoints.length - 1].line + 4 : 1)}>
                <Plus size={12} /> Add conditional breakpoint
              </button>
              <button type="button" className="dx-btn dx-btn-sm" onClick={() => setBreakpoints(breakpoints.map((b) => ({ ...b, enabled: true })))}>Enable all</button>
              <button type="button" className="dx-btn dx-btn-sm" onClick={() => setBreakpoints(breakpoints.filter((b) => !b.enabled))}>Clear disabled</button>
              <Chip tone={paused ? "warn" : "up"} pulse={paused}>{paused ? "paused" : "running"}</Chip>
            </div>
            {breakpoints.map((b) => (
              <div key={b.id} className="dx-card-inset">
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <Chip tone={b.enabled ? (b.condition ? "warn" : "down") : "muted"}>{b.condition ? "conditional" : "breakpoint"}</Chip>
                  <span className="font-display fw-semibold">line {b.line}</span>
                  <span className="dx-help font-display">{b.condition || "always"}</span>
                  <span className="dx-help ms-auto">hit {b.hits}× this session</span>
                </div>
                <span className="dx-help d-block font-display">{(lines[b.line - 1] ?? "").trim()}</span>
                <div className="d-flex flex-wrap gap-2 mt-1">
                  <button type="button" className="dx-btn dx-btn-sm" onClick={() => onJump(b.line)}>Open in editor</button>
                  <button type="button" className="dx-btn dx-btn-sm" onClick={() => setBreakpoints(breakpoints.map((x) => (x.id === b.id ? { ...x, enabled: !x.enabled } : x)))}>
                    {b.enabled ? "Disable" : "Enable"}
                  </button>
                  <button type="button" className="dx-btn dx-btn-sm dx-btn-danger" onClick={() => setBreakpoints(breakpoints.filter((x) => x.id !== b.id))}>Remove</button>
                </div>
              </div>
            ))}
            {!breakpoints.length ? <EmptyState title="No breakpoints" message="Click a line number in the editor or add one here to pause execution." icon={<Bug size={18} />} /> : null}
          </div>
        ) : null}
        {tab === "state" ? (
          <div className="d-grid gap-3">
            <Alert tone={paused ? "warn" : "up"} title={paused ? `Paused at line ${top?.line ?? line} on tick #${tickIndex}` : "Running — the next hit pauses again"}>
              {paused
                ? `Execution stopped before the decision was returned. Variables below are the sandbox state at this tick.`
                : "The debugger continues until a breakpoint condition matches."}
            </Alert>
            <div className="d-grid gap-2">
              {locals.map((l) => (
                <div key={l.name} className="d-flex align-items-center gap-2 dx-card-inset">
                  <span className="font-display fw-semibold">{l.name}</span>
                  <span className="font-display">{l.value}</span>
                  <span className="dx-help ms-auto">{l.note}</span>
                </div>
              ))}
            </div>
            <div className="dx-card-inset">
              <span className="dx-kpi-label">Watchers</span>
              <span className="dx-help d-block font-display">stake &gt; maxStake · getOpenContracts().length · getLastResult()?.win</span>
            </div>
          </div>
        ) : null}
        {tab === "steps" ? (
          <div className="d-grid gap-3">
            <div className="d-flex flex-wrap align-items-center gap-2">
              <button type="button" className="dx-btn dx-btn-sm" onClick={() => setTickIndex((i) => Math.max(1, i - 1))}>Prev tick</button>
              <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => setTickIndex((i) => i + 1)}>Next tick</button>
              <button type="button" className="dx-btn dx-btn-sm" onClick={() => setLine((l) => Math.min(lines.length, l + 1))}>Step line</button>
              <Chip tone="info">tick #{tickIndex}</Chip>
              <Chip tone="muted">line {line}</Chip>
            </div>
            <div className="dx-code-panel">
              <div className="dx-code-scroll">
                {lines.slice(Math.max(0, line - 6), line + 6).map((raw, i) => {
                  const n = Math.max(0, line - 6) + i + 1;
                  return (
                    <div key={n} className={`dx-code-row ${n === line ? "is-active" : ""}`}>
                      <span className="dx-code-gutter"><span className="dx-code-lineno">{n}</span></span>
                      <span className="dx-code-text">{raw}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <button type="button" className="dx-btn dx-btn-sm" onClick={onRun}><Terminal size={12} /> Run the suite from here</button>
          </div>
        ) : null}
      </div>
    </Drawer>
  );
}

function BreakpointDialog({ line, onClose, onAdd }: { line: number; onClose: () => void; onAdd: (line: number, condition: string) => void }) {
  const [condition, setCondition] = useState("stake > 5");
  const [logpoint, setLogpoint] = useState(false);
  const [count, setCount] = useState(1);
  return (
    <Dialog
      open
      onClose={onClose}
      title={`Breakpoint at line ${line}`}
      subtitle="Conditional breakpoints pause only when the expression is true"
      size="md"
      footer={
        <div className="d-flex gap-2 justify-content-end w-100">
          <button type="button" className="dx-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="dx-btn dx-btn-primary" onClick={() => { onAdd(line, condition); onClose(); }}>
            <Bug size={13} /> Set breakpoint
          </button>
        </div>
      }
    >
      <Field label="Condition" help="Any expression the sandbox can evaluate — empty means always pause.">
        <input className="dx-input font-display" value={condition} onChange={(e) => setCondition(e.target.value)} />
      </Field>
      <div className="row g-3 mt-1">
        <div className="col-6">
          <Field label="Hit count" help="Pause on the Nth match.">
            <input className="dx-input font-display" type="number" min={1} value={count} onChange={(e) => setCount(Number(e.target.value))} />
          </Field>
        </div>
        <div className="col-6 d-flex align-items-end">
          <Toggle checked={logpoint} onChange={setLogpoint} label="Log instead of pausing (logpoint)" />
        </div>
      </div>
      <Alert tone="info" title="Try these conditions">
        <span className="font-display">
          stake &gt; 5 · getOpenContracts().length &gt; 1 · getLastResult() &amp;&amp; !getLastResult().win · tick.price &lt; 6400
        </span>
      </Alert>
    </Dialog>
  );
}

// =============================================================================
// 12 — INLINE AI ASSISTANT (advanced feature #3, edge case #6)
// =============================================================================
function AiAssistantDrawer({
  script,
  code,
  onClose,
  onInsert,
  onReplace,
  onExplain,
  onTest,
  notify,
}: {
  script: Script | null;
  code: string;
  onClose: () => void;
  onInsert: (code: string) => void;
  onReplace: (code: string) => void;
  onExplain: (line: number) => void;
  onTest: () => void;
  notify: ScriptOverlayProps["notify"];
}) {
  const [input, setInput] = useState("");
  const [promptId, setPromptId] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<string[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [typed, setTyped] = useState("");
  const active = AI_CODE_PROMPTS.find((p) => p.id === promptId);
  const picked = (p: (typeof AI_CODE_PROMPTS)[number]) => {
    setPromptId(p.id);
    setStreaming(true);
    setTyped("");
    let i = 0;
    const id = window.setInterval(() => {
      i += Math.max(4, Math.round(p.code.length / 26));
      setTyped(p.code.slice(0, i));
      if (i >= p.code.length) {
        window.clearInterval(id);
        setStreaming(false);
      }
    }, 90);
  };
  const caret = /\/\/ai/.exec(code);
  const detected = code.includes("//ai");
  return (
    <Drawer
      open
      onClose={onClose}
      wide
      title="AI script assistant"
      subtitle={`${script?.name ?? "Draft"} · streaming suggestions you have to accept explicitly`}
      footer={
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="dx-btn" onClick={onTest}><Play size={13} /> Run the suite before saving</button>
          <button type="button" className="dx-btn dx-btn-ghost ms-auto" onClick={onClose}>Close assistant</button>
        </div>
      }
    >
      <div className="d-grid gap-3">
        {detected ? (
          <Alert tone="info" title="//ai marker found in the script">
            Line {code.slice(0, caret?.index ?? 0).split("\n").length} asks for: “{(code.split("\n")[code.slice(0, caret?.index ?? 0).split("\n").length - 1] ?? "").replace("//ai", "").trim()}”
            <span className="d-block mt-1">Pick a suggestion below, or brief the model yourself.</span>
          </Alert>
        ) : (
          <Alert tone="info" title="No //ai marker in this revision">
            Type <span className="font-display">//ai &lt;what you want&gt;</span> in the editor and the assistant answers in place. The panel below always works too.
          </Alert>
        )}

        <div className="d-grid gap-2">
          {AI_CODE_PROMPTS.map((p) => (
            <button key={p.id} type="button" className="dx-api-row" aria-pressed={promptId === p.id} onClick={() => picked(p)}>
              <span className="d-flex flex-wrap align-items-center gap-2">
                <Sparkles size={12} />
                <span className="fw-semibold">{p.title}</span>
                <Chip tone="muted">{p.intent}</Chip>
                <span className="dx-help ms-auto font-display">{Math.round(p.confidence * 100)}% confidence · {p.tokens} tokens</span>
              </span>
              <span className="dx-help">{p.prompt}</span>
            </button>
          ))}
        </div>

        {active ? (
          <div className="d-grid gap-2">
            <div className="dx-ai-bubble is-user">
              <span className="dx-help d-block">You</span>
              {active.prompt}
            </div>
            <div className="dx-ai-bubble" aria-live="polite">
              <span className="dx-help d-block">Assistant · {active.intent}</span>
              <p className="mb-1">{active.summary}</p>
              <CodeBlock code={streaming ? typed : active.code} maxHeight={220} />
              {streaming ? <span className="dx-ai-caret" aria-hidden="true" /> : null}
              <div className="d-flex flex-wrap gap-2 mt-2">
                <button
                  type="button"
                  className="dx-btn dx-btn-sm dx-btn-primary"
                  disabled={streaming || accepted.includes(active.id)}
                  onClick={() => {
                    setAccepted((a) => [...a, active.id]);
                    onInsert(active.code);
                  }}
                >
                  <CheckCircle2 size={12} /> {accepted.includes(active.id) ? "Accepted" : "Accept & insert"}
                </button>
                <button
                  type="button"
                  className="dx-btn dx-btn-sm"
                  onClick={() => {
                    setRejected((r) => [...r, active.id]);
                    setPromptId(null);
                  }}
                >
                  <XCircle size={12} /> Reject
                </button>
                <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => onExplain(active.code.split("\n").findIndex((l) => l.includes("return")) + 1 || 1)}>
                  <BookOpen size={12} /> Explain in context
                </button>
                <CopyButton text={active.code} label="Copy" />
              </div>
            </div>
          </div>
        ) : null}

        {accepted.length || rejected.length ? (
          <div className="dx-card-inset">
            <span className="dx-kpi-label">Session decisions</span>
            <span className="dx-help d-block">
              {accepted.length} accepted · {rejected.length} rejected · nothing is written to the script until you save, and the diff shows every accepted hunk
              before the commit.
            </span>
          </div>
        ) : null}

        <div className="dx-card-inset">
          <span className="dx-kpi-label">Brief the model</span>
          <div className="d-flex gap-2 mt-1">
            <input
              className="dx-input"
              value={input}
              placeholder="Refactor the ladder to read the cap from config"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && input.trim()) {
                  setPromptId(AI_CODE_PROMPTS[0].id);
                  picked({ ...AI_CODE_PROMPTS[0], prompt: input.trim(), summary: `Draft answer for “${input.trim()}” based on the current onTick ladder.` });
                  setInput("");
                }
              }}
            />
            <button
              type="button"
              className="dx-btn dx-btn-primary"
              disabled={!input.trim()}
              onClick={() => {
                picked({ ...AI_CODE_PROMPTS[0], prompt: input.trim(), summary: `Draft answer for “${input.trim()}” based on the current onTick ladder.` });
                setInput("");
              }}
            >
              <Wand2 size={13} /> Ask
            </button>
          </div>
          <span className="dx-help d-block mt-2">
            The assistant only ever proposes a hunk — insert, or replace the working copy. Validation, tests and the save guard stay mandatory.
          </span>
        </div>
      </div>
    </Drawer>
  );
}

function AiExplainDialog({ line, code, onClose, onInsert }: { line: number; code: string; onClose: () => void; onInsert: (code: string) => void }) {
  const lines = code.split("\n");
  const block = lines.slice(Math.max(0, line - 3), Math.min(lines.length, line + 6)).join("\n");
  const explain = AI_CODE_PROMPTS.find((p) => p.intent === "explain") ?? AI_CODE_PROMPTS[0];
  return (
    <Dialog
      open
      onClose={onClose}
      title="Explain this code"
      subtitle={`Lines ${Math.max(1, line - 2)}–${Math.min(lines.length, line + 5)} · read-only, nothing is modified`}
      size="lg"
      footer={
        <div className="d-flex flex-wrap gap-2 justify-content-between w-100">
          <CopyButton text={explain.code} label="Copy the explanation" />
          <div className="d-flex gap-2">
            <button type="button" className="dx-btn" onClick={() => onInsert(explain.code)}><Plus size={13} /> Insert as a comment block</button>
            <button type="button" className="dx-btn dx-btn-primary" onClick={onClose}>Close</button>
          </div>
        </div>
      }
    >
      <CodeBlock code={block} maxHeight={220} />
      <div className="dx-ai-bubble mt-3">
        <span className="dx-help d-block">Assistant · {Math.round(explain.confidence * 100)}% confidence</span>
        <p className="mb-0">{explain.summary}</p>
      </div>
      <div className="d-grid gap-2 mt-3">
        {(lines.slice(Math.max(0, line - 3), Math.min(lines.length, line + 6)) as string[]).map((l, i) => {
          const n = Math.max(0, line - 3) + i + 1;
          return (
            <div key={n} className="d-flex gap-2">
              <span className="dx-help font-display" style={{ minWidth: 34 }}>{n}</span>
              <span className="dx-help">{l.trim() ? l.trim() : "— blank line —"}</span>
            </div>
          );
        })}
      </div>
    </Dialog>
  );
}

// =============================================================================
// 13 — SNIPPETS · CONSOLE · PREFS · HELP · PUBLISH · DISCARD · PARAMS
// =============================================================================
function SnippetsDialog({ onClose, onPick }: { onClose: () => void; onPick: (code: string, name: string) => void }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(SCRIPT_SNIPPETS[0].id);
  const snippet = SCRIPT_SNIPPETS.find((s) => s.id === active) ?? SCRIPT_SNIPPETS[0];
  return (
    <Dialog
      open
      onClose={onClose}
      title="Insert snippet"
      subtitle="Ctrl+Space opens this palette in the editor — snippets insert at the cursor"
      size="xl"
      footer={
        <div className="d-flex flex-wrap gap-2 justify-content-between w-100">
          <span className="dx-help">{SCRIPT_SNIPPETS.length} snippets · each one is sandbox-safe by construction</span>
          <div className="d-flex gap-2">
            <CopyButton text={snippet.code} label="Copy snippet" />
            <button type="button" className="dx-btn dx-btn-primary" onClick={() => onPick(snippet.code, snippet.name)}>
              <Plus size={13} /> Insert {snippet.name}
            </button>
          </div>
        </div>
      }
    >
      <div className="row g-3">
        <div className="col-12 col-lg-5">
          <SearchInput value={query} onChange={setQuery} placeholder="Search snippets…" />
          <div className="d-grid gap-1 mt-2">
            {SCRIPT_SNIPPETS.filter((s) => (s.name + s.description + s.category).toLowerCase().includes(query.toLowerCase())).map((s) => (
              <button key={s.id} type="button" className={`dx-api-row ${active === s.id ? "is-active" : ""}`} onClick={() => setActive(s.id)}>
                <span className="d-flex align-items-center gap-2">
                  <span className="fw-semibold">{s.name}</span>
                  <Chip tone="muted">{s.category}</Chip>
                  <span className="dx-help ms-auto font-display">{s.uses.toLocaleString("en-US")} uses</span>
                </span>
                <span className="dx-help">{s.description}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="col-12 col-lg-7">
          <div className="dx-card-inset">
            <span className="dx-kpi-label">{snippet.name} · {snippet.shortcut}</span>
            <CodeBlock code={snippet.code} maxHeight={280} />
            <span className="dx-help d-block mt-2">{snippet.description}</span>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

function ConsoleFullDrawer({ run, onClose, onExport, onJump }: { run: SandboxRun | null; onClose: () => void; onExport: () => void; onJump: (line: number) => void }) {
  const [channel, setChannel] = useState("all");
  const [paused, setPaused] = useState(false);
  const lines = run?.logLines ?? [];
  return (
    <Drawer
      open
      onClose={onClose}
      wide
      title="Sandbox console"
      subtitle={`${lines.length} lines · ${paused ? "paused" : "live"} · role=log with aria-live`}
      footer={
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="dx-btn" onClick={() => setPaused((p) => !p)}>{paused ? <Play size={13} /> : <Terminal size={13} />} {paused ? "Resume stream" : "Pause stream"}</button>
          <button type="button" className="dx-btn" onClick={onExport} disabled={!run}><Download size={13} /> Export log</button>
          <button type="button" className="dx-btn dx-btn-ghost ms-auto" onClick={onClose}>Close console</button>
        </div>
      }
    >
      <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
        <FilterChips
          options={[
            { id: "info", label: "Info" },
            { id: "warn", label: "Warnings" },
            { id: "error", label: "Errors" },
          ]}
          value={channel}
          onChange={setChannel}
          allLabel={`All (${lines.length})`}
        />
        {run?.timeoutAtLine ? (
          <button type="button" className="dx-btn dx-btn-sm ms-auto" onClick={() => onJump(run.timeoutAtLine ?? 1)}>
            Jump to line {run.timeoutAtLine}
          </button>
        ) : null}
      </div>
      <div className="dx-console" role="log" aria-live="polite" aria-relevant="additions">
        {lines.length ? <ConsoleLines lines={lines} filter={channel} /> : <span className="dx-help">No run yet — start a test in the editor toolbar.</span>}
        {paused ? <span className="dx-help d-block mt-2">Stream paused — output keeps buffering in the sandbox worker.</span> : null}
      </div>
      <div className="d-grid gap-2 mt-3">
        <span className="dx-kpi-label">Run summary</span>
        <dl className="dx-kv mb-0">
          <dt>Status</dt>
          <dd className="font-display">{run?.status ?? "not run"}</dd>
          <dt>Ticks / trades</dt>
          <dd className="font-display">{run?.ticks ?? 0} / {run?.trades.length ?? 0}</dd>
          <dt>Peak heap</dt>
          <dd className="font-display">{run?.peakMemoryMb ?? 0} MB of 128 MB</dd>
          <dt>Duration</dt>
          <dd className="font-display">{run?.durationMs ?? 0} ms</dd>
          <dt>Max drawdown</dt>
          <dd className="font-display dx-down">{usd(-(run?.maxDrawdown ?? 0))}</dd>
        </dl>
      </div>
    </Drawer>
  );
}

function EditorPrefsDialog({ prefs, onChange, onClose }: { prefs: EditorPrefs; onChange: (p: Partial<EditorPrefs>) => void; onClose: () => void }) {
  return (
    <Dialog
      open
      onClose={onClose}
      title="Editor preferences"
      subtitle="Applies to this browser only — stored with the rest of your workspace settings"
      size="md"
      footer={<button type="button" className="dx-btn dx-btn-primary ms-auto" onClick={onClose}>Done</button>}
    >
      <div className="d-grid gap-3">
        <div>
          <Field label="Syntax highlighting">
            <select className="dx-select" value={prefs.contrast} onChange={(e) => onChange({ contrast: e.target.value as EditorPrefs["contrast"] })}>
              <option value="normal">Standard palette</option>
              <option value="high">High contrast (AAA)</option>
            </select>
          </Field>
        </div>
        <div>
          <Field label="Autosave debounce" help="The blueprint's 2 s default; drafts land in local storage until a commit is made.">
            <select className="dx-select font-display" value={prefs.autosaveMs} onChange={(e) => onChange({ autosaveMs: Number(e.target.value) })}>
              {[500, 1000, 2000, 5000].map((ms) => (
                <option key={ms} value={ms}>{ms} ms</option>
              ))}
            </select>
          </Field>
        </div>
        <div>
          <Field label="Editor font size" help="Applies to the code surface and the console.">
            <input className="dx-input font-display" type="number" min={12} max={20} value={prefs.fontSize} onChange={(e) => onChange({ fontSize: Number(e.target.value) })} />
          </Field>
        </div>
        <Toggle checked={prefs.reduceMotion} onChange={(v) => onChange({ reduceMotion: v })} label="Reduce motion — disables the AI caret blink and smooth scrolling" />
        <Toggle checked={prefs.syntaxWorker} onChange={(v) => onChange({ syntaxWorker: v })} label="Tokenise in a worker (keeps the main thread free on 1,000+ line scripts)" />
        <Alert tone="info" title="Virtualised scrolling">
          Scripts longer than 1,000 lines switch the code surface to windowed rendering automatically; the current file is well under the threshold.
        </Alert>
      </div>
    </Dialog>
  );
}

function KeyboardHelpDialog({ onClose, onAction }: { onClose: () => void; onAction: (id: string) => void }) {
  const rows = [
    { id: "save", keys: "⌘ / Ctrl + S", label: "Save (runs the guard + suite)", hint: "Publishes a version commit when the analysis is clean." },
    { id: "test", keys: "⌘ / Ctrl + Enter", label: "Run the sandbox test", hint: "Same as the Test button in the toolbar." },
    { id: "snippets", keys: "Ctrl + Space", label: "Snippet palette", hint: "Inserts the highlighted block at the cursor." },
    { id: "find", keys: "⌘ / Ctrl + F", label: "Find in script", hint: "Jumps to the search field above the editor." },
    { id: "ai", keys: "⌘ / Ctrl + I", label: "AI assistant", hint: "Opens the assistant drawer with the //ai marker if present." },
    { id: "debug", keys: "F9", label: "Toggle breakpoint", hint: "Sets a breakpoint on the current line." },
    { id: "help", keys: "?", label: "This help", hint: "Available anywhere on the page." },
  ];
  return (
    <Dialog
      open
      onClose={onClose}
      title="Keyboard shortcuts"
      subtitle="Every shortcut mirrors a visible control — nothing is hidden"
      size="md"
      footer={<button type="button" className="dx-btn dx-btn-primary ms-auto" onClick={onClose}>Close</button>}
    >
      <div className="d-grid gap-2">
        {rows.map((r) => (
          <div key={r.id} className="d-flex align-items-start justify-content-between gap-3">
            <span className="font-display dx-chip dx-chip-muted">{r.keys}</span>
            <span className="d-flex flex-column text-end">
              <span className="fw-semibold">{r.label}</span>
              <span className="dx-help">{r.hint}</span>
            </span>
            <button type="button" className="dx-btn dx-btn-sm" onClick={() => onAction(r.id)}>Run</button>
          </div>
        ))}
      </div>
      <Alert tone="info" title="Screen-reader notes">
        The code surface is a real textarea, so the caret, selection and line count are announced natively. The console uses
        <span className="font-display"> role="log"</span> plus <span className="font-display">aria-live</span>, and breakpoints are ordinary buttons with labels.
      </Alert>
    </Dialog>
  );
}

function PublishWizard({
  script,
  analysis,
  onClose,
  onPublish,
  notify,
}: {
  script: Script | null;
  analysis: AnalysisResult;
  onClose: () => void;
  onPublish: ScriptOverlayProps["onPublish"];
  notify: ScriptOverlayProps["notify"];
}) {
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState("trend following");
  const [license, setLicense] = useState("MIT");
  const [description, setDescription] = useState(script?.name ? `${script.name} — published from the Script Studio.` : "");
  const [price, setPrice] = useState(0);
  const [agree, setAgree] = useState(false);
  const error = description.trim().length < 20 ? "Describe the strategy in at least 20 characters." : "";
  return (
    <Dialog
      open
      onClose={onClose}
      title="Publish to the community gallery"
      subtitle="Other traders can fork it — benchmarks come from your last sandbox run"
      size="xl"
      footer={
        <div className="d-flex flex-wrap gap-2 justify-content-between w-100">
          <button type="button" className="dx-btn" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</button>
          <div className="d-flex gap-2">
            {step < 2 ? (
              <button type="button" className="dx-btn dx-btn-primary" disabled={step === 0 && Boolean(error)} onClick={() => setStep((s) => s + 1)}>Continue</button>
            ) : (
              <button
                type="button"
                className="dx-btn dx-btn-primary"
                disabled={!agree || analysis.blocked}
                onClick={() => {
                  onPublish({ name: script?.name ?? "Script", category, license, description, price });
                  onClose();
                  notify("success", "Script published", `${script?.name ?? "Script"} is live in the gallery under ${category}.`);
                }}
              >
                <Share2 size={13} /> Publish
              </button>
            )}
          </div>
        </div>
      }
    >
      <nav role="navigation" aria-label="Publish steps">
        <Stepper
          steps={[{ id: "meta", label: "Details" }, { id: "benchmark", label: "Benchmark" }, { id: "confirm", label: "Confirm" }]}
          active={step}
          onStepClick={(i) => setStep(i <= 2 ? i : step)}
        />
      </nav>
      <div className="mt-3">
        {step === 0 ? (
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <Field label="Category">
                <select className="dx-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {["trend following", "mean reversion", "scalping", "hedging", "digits"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="col-12 col-md-6">
              <Field label="Licence">
                <select className="dx-select" value={license} onChange={(e) => setLicense(e.target.value)}>
                  {["MIT", "Apache-2.0", "GPL-3.0", "DerivX Sample"].map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="col-12">
              <Field label="Description" required error={error} help="Say what edge it exploits and when it stands down.">
                <textarea className="dx-textarea dx-input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
              </Field>
            </div>
            <div className="col-12 col-md-4">
              <Field label="Price (USD)" help="0 keeps it free for the community.">
                <input className="dx-input font-display" type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
              </Field>
            </div>
          </div>
        ) : null}
        {step === 1 ? (
          <div className="d-grid gap-3">
            <div className="row g-2">
              <div className="col-6 col-lg-3"><StatCard label="Lines" value={analysis.stats.lines} footnote="published size" /></div>
              <div className="col-6 col-lg-3"><StatCard label="Parameters" value={analysis.params.length} footnote="forkable defaults" /></div>
              <div className="col-6 col-lg-3"><StatCard label="Tests" value={analysis.tests.length} footnote="advertised coverage" /></div>
              <div className="col-6 col-lg-3"><StatCard label="Warnings" value={analysis.issues.filter((i) => i.severity === "warning").length} footnote="shown to forkers" /></div>
            </div>
            <Alert tone={analysis.blocked ? "danger" : "up"} title={analysis.blocked ? "Cannot publish yet" : "Analysis is clean"}>
              {analysis.blocked
                ? `Fix ${analysis.issues.filter((i) => i.severity === "error").length} error(s) first — a broken script cannot enter the gallery.`
                : "Forkers see your last 30-day sandbox benchmark, the parameter defaults and the dependency licences."}
            </Alert>
            <div className="dx-card-inset">
              <span className="dx-kpi-label">Benchmark that will be attached</span>
              <LineChart
                data={runScriptSandbox(script?.id ?? "scr_01", script ? scriptSource(script.id) : "", { seed: 777, ticks: 240 }).equity}
                height={140}
                tone="accent"
                ariaLabel="Publish benchmark equity"
                yFormat={(v) => `$${v.toFixed(0)}`}
              />
            </div>
          </div>
        ) : null}
        {step === 2 ? (
          <div className="d-grid gap-3">
            <dl className="dx-kv">
              <dt>Script</dt>
              <dd className="font-display">{script?.name ?? "—"} {scriptMetaOf(script?.id ?? "")?.version}</dd>
              <dt>Category</dt>
              <dd className="font-display">{category}</dd>
              <dt>Licence</dt>
              <dd className="font-display">{license}</dd>
              <dt>Price</dt>
              <dd className="font-display">{price === 0 ? "free" : usd(price, 0)}</dd>
              <dt>Dependencies</dt>
              <dd className="font-display">{analysis.imports.map((i) => i.module).join(", ") || "engine globals only"}</dd>
            </dl>
            <Toggle checked={agree} onChange={setAgree} label="I confirm this script is my own work, has no forbidden API usage and passed the suite" />
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}

function DiscardChangesDialog({ onClose, onDiscard, onDiff }: { onClose: () => void; onDiscard: () => void; onDiff: () => void }) {
  return (
    <Dialog
      open
      onClose={onClose}
      title="Discard unsaved changes"
      subtitle="The working copy reverts to the last commit"
      size="md"
      footer={
        <div className="d-flex flex-wrap gap-2 justify-content-between w-100">
          <button type="button" className="dx-btn dx-btn-ghost" onClick={onDiff}><ArrowLeftRight size={13} /> Review the diff first</button>
          <div className="d-flex gap-2">
            <button type="button" className="dx-btn" onClick={onClose}>Keep editing</button>
            <button type="button" className="dx-btn dx-btn-danger" onClick={() => { onDiscard(); onClose(); }}>
              <RotateCcw size={13} /> Discard changes
            </button>
          </div>
        </div>
      }
    >
      <Alert tone="warn" title="This cannot be undone">
        Autosaved drafts in local storage are cleared too. The last commit stays in the version history, so nothing permanent is lost.
      </Alert>
    </Dialog>
  );
}

function ParamsDialog({ params, onClose, onInsert, onJump }: { params: ScriptParam[]; onClose: () => void; onInsert: (code: string) => void; onJump: (line: number) => void }) {
  const [key, setKey] = useState("maxSteps");
  const [value, setValue] = useState("5");
  const [description, setDescription] = useState("Deepest ladder step before the cap applies");
  const [type, setType] = useState("number");
  return (
    <Dialog
      open
      onClose={onClose}
      title="Script parameters"
      subtitle="@param annotations become editable fields in the bot configurator"
      size="xl"
      footer={
        <div className="d-flex flex-wrap gap-2 justify-content-between w-100">
          <span className="dx-help">{params.length} parameter(s) declared in this script</span>
          <div className="d-flex gap-2">
            <button type="button" className="dx-btn" onClick={onClose}>Close</button>
            <button
              type="button"
              className="dx-btn dx-btn-primary"
              onClick={() => onInsert(`/** @param {${type}} ${key}=${value} ${description} */`)}
            >
              <Plus size={13} /> Insert annotation
            </button>
          </div>
        </div>
      }
    >
      <div className="row g-3">
        <div className="col-12 col-lg-5">
          <div className="d-grid gap-2">
            {params.length ? (
              params.map((p) => (
                <button key={p.key} type="button" className="dx-api-row" onClick={() => onJump(p.line)}>
                  <span className="d-flex flex-wrap align-items-center gap-2">
                    <span className="fw-semibold font-display">{p.key}</span>
                    <Chip tone="muted">{p.type}</Chip>
                    <span className="dx-help ms-auto font-display">line {p.line}</span>
                  </span>
                  <span className="dx-help">{p.description}</span>
                  <span className="dx-help font-display">default {p.defaultValue}</span>
                </button>
              ))
            ) : (
              <EmptyState title="No @param annotations" message="Add one below — bots then expose the field as an editable number." icon={<Layers size={18} />} />
            )}
          </div>
        </div>
        <div className="col-12 col-lg-7">
          <div className="dx-card-inset">
            <span className="dx-kpi-label">New annotation</span>
            <div className="row g-2 mt-1">
              <div className="col-6 col-md-3">
                <Field label="Type">
                  <select className="dx-select" value={type} onChange={(e) => setType(e.target.value)}>
                    {["number", "string", "boolean"].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="col-6 col-md-3">
                <Field label="Name">
                  <input className="dx-input font-display" value={key} onChange={(e) => setKey(e.target.value)} />
                </Field>
              </div>
              <div className="col-6 col-md-3">
                <Field label="Default">
                  <input className="dx-input font-display" value={value} onChange={(e) => setValue(e.target.value)} />
                </Field>
              </div>
              <div className="col-12 col-md-9">
                <Field label="Description">
                  <input className="dx-input" value={description} onChange={(e) => setDescription(e.target.value)} />
                </Field>
              </div>
            </div>
            <CodeBlock code={`/** @param {${type}} ${key}=${value} ${description} */`} maxHeight={80} />
          </div>
          <Alert tone="info" title="How the configurator uses this">
            The bot creator reads the annotation, renders a number field with the default, and validates the typed value against it before the bot starts.
          </Alert>
        </div>
      </div>
    </Dialog>
  );
}

// =============================================================================
// 14 — SCRIPT BACKTEST + RUN DETAIL
// =============================================================================
function ScriptBacktestDialog({
  script,
  code,
  onClose,
  onInsert,
  notify,
}: {
  script: Script | null;
  code: string;
  onClose: () => void;
  onInsert: (code: string) => void;
  notify: ScriptOverlayProps["notify"];
}) {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
  const [days, setDays] = useState(30);
  const result = useMemo(() => runScriptSandbox(script?.id ?? "scr_01", code, { ticks: 600, version: `bt-${days}` }), [script?.id, code, days]);
  useEffect(() => {
    if (step !== 1) return;
    const id = window.setInterval(() => setProgress((p) => (p >= 100 ? 100 : p + 4)), 110);
    return () => window.clearInterval(id);
  }, [step]);
  const scaled = useMemo(() => {
    const equity = result.equity.map((v) => v * multiplier);
    const pnl = result.pnl * multiplier;
    const drawdown = result.maxDrawdown * multiplier;
    return { equity, pnl, drawdown };
  }, [result, multiplier]);
  const trades = result.trades.slice(0, 12);
  return (
    <Dialog
      open
      onClose={onClose}
      title="Backtest this script"
      subtitle={`${script?.name ?? "Draft"} · ${days}-day tape · seeded so runs are reproducible`}
      size="xl"
      footer={
        <div className="d-flex flex-wrap gap-2 justify-content-between w-100">
          <button type="button" className="dx-btn dx-btn-ghost" onClick={() => onInsert(`// backtested ${days}d · win ${pct(result.winRate, 1)} · P&L ${usd(scaled.pnl)}`)}>
            <Plus size={13} /> Add the result as a comment
          </button>
          <div className="d-flex gap-2">
            {step === 1 ? (
              <button type="button" className="dx-btn" onClick={() => { setSkipped(true); setStep(2); }}>
                Skip backtest
              </button>
            ) : null}
            {step === 2 ? <button type="button" className="dx-btn" onClick={() => { setStep(1); setProgress(0); setSkipped(false); }}>Re-run</button> : null}
            {step === 0 ? <button type="button" className="dx-btn dx-btn-primary" onClick={() => setStep(1)}><Play size={13} /> Run {days}-day backtest</button> : null}
            {step === 1 ? <button type="button" className="dx-btn dx-btn-primary" disabled={progress < 100} onClick={() => setStep(2)}>View results</button> : null}
            {step === 2 ? <button type="button" className="dx-btn dx-btn-primary" onClick={onClose}>Close</button> : null}
          </div>
        </div>
      }
    >
      {step === 0 ? (
        <div className="row g-3">
          <div className="col-12 col-md-4">
            <Field label="Window">
              <select className="dx-select font-display" value={days} onChange={(e) => setDays(Number(e.target.value))}>
                {[7, 30, 90, 180].map((d) => (
                  <option key={d} value={d}>{d} days</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="col-12 col-md-4">
            <Field label="Stake multiplier" help="What-if sizing: every leg scales, the ladder shape stays the same.">
              <input className="dx-input font-display" type="range" min={0.5} max={4} step={0.25} value={multiplier} onChange={(e) => setMultiplier(Number(e.target.value))} />
            </Field>
          </div>
          <div className="col-12 col-md-4">
            <Field label="Seed">
              <input className="dx-input font-display" type="number" defaultValue={20261013} />
            </Field>
          </div>
          <div className="col-12">
            <Alert tone="info" title="How the backtest runs">
              The script replays a {days}-day tick tape inside the sandbox worker, {result.ticks} ticks against the 100 ms budget. Settlements use the
              symbol payout from the live quote feed, so win/loss sizing matches what a bot would see.
            </Alert>
          </div>
        </div>
      ) : null}
      {step === 1 ? (
        <div className="d-grid gap-3">
          <Progress value={progress} />
          <span className="dx-help">{progress < 100 ? `Replaying tick ${Math.round((progress / 100) * result.ticks)} of ${result.ticks}…` : "Backtest complete."}</span>
          <div className="dx-console" role="log" aria-live="polite">
            <ConsoleLines lines={result.logLines.slice(0, Math.max(1, Math.round((progress / 100) * result.logLines.length)))} />
          </div>
        </div>
      ) : null}
      {step === 2 ? (
        <div className="d-grid gap-3">
          {skipped ? <Alert tone="warn" title="Skipped">These numbers come from the default tape, not a fresh run — treat them as indicative only.</Alert> : null}
          <div className="row g-2">
            <div className="col-6 col-lg-3"><StatCard label="Win rate" value={result.winRate} decimals={1} suffix="%" trend={`${result.trades.length} contracts`} trendDir={result.winRate >= 55 ? "up" : "down"} /></div>
            <div className="col-6 col-lg-3"><StatCard label="Net P&L" value={scaled.pnl} decimals={2} prefix="$" trend={`${multiplier}× sizing`} trendDir={scaled.pnl >= 0 ? "up" : "down"} /></div>
            <div className="col-6 col-lg-3"><StatCard label="Max drawdown" value={-scaled.drawdown} decimals={2} prefix="$" trend="peak to trough" trendDir="down" /></div>
            <div className="col-6 col-lg-3"><StatCard label="Peak heap" value={result.peakMemoryMb} suffix=" MB" footnote={`${result.durationMs} ms runtime`} /></div>
          </div>
          <div className="row g-3">
            <div className="col-12 col-lg-7">
              <span className="dx-kpi-label">Equity curve</span>
              <LineChart data={scaled.equity.length ? scaled.equity : [0, 0]} height={170} tone={scaled.pnl >= 0 ? "accent" : "down"} ariaLabel="Script backtest equity" yFormat={(v) => `$${v.toFixed(0)}`} />
            </div>
            <div className="col-12 col-lg-5">
              <Field label="What-if stake multiplier" help="Rescales every settlement on the chart and the table.">
                <input className="dx-input font-display" type="range" min={0.5} max={4} step={0.25} value={multiplier} onChange={(e) => setMultiplier(Number(e.target.value))} />
              </Field>
              <Meter label="Sizing" value={(multiplier / 4) * 100} display={`${multiplier}× base stake`} />
              <Meter label="Heap used" value={(result.peakMemoryMb / 128) * 100} display={`${result.peakMemoryMb} / 128 MB`} />
              <Meter label="Tick budget" value={Math.min(100, (result.durationMs / result.ticks) * 100)} display={`${(result.durationMs / Math.max(1, result.ticks)).toFixed(2)} ms / tick`} />
            </div>
          </div>
          <div>
            <span className="dx-kpi-label">First {trades.length} contracts</span>
            <DataTable
              ariaLabel="Backtest trades"
              state={useDataTable({ rows: trades, initialPageSize: 6, sorters: { seq: (t) => t.seq, profit: (t) => t.profit, stake: (t) => t.stake }, initialSort: "seq", searchKeys: (t) => [String(t.seq), t.contract] })}
              rowKey={(t) => String(t.seq)}
              columns={[
                { header: "#", cell: (t) => <span className="font-display">{t.seq}</span> },
                { header: "Contract", cell: (t) => <span className="font-display">{t.contract}</span> },
                { header: "Stake", align: "end", cell: (t) => <span className="font-display">{usd(t.stake)}</span> },
                { header: "Entry → exit", align: "end", cell: (t) => <span className="font-display">{t.entrySpot} → {t.exitSpot}</span> },
                { header: "Payout", align: "end", cell: (t) => <span className="font-display">{usd(t.payout)}</span>, hideOnMobile: true },
                { header: "Result", align: "end", cell: (t) => <Chip tone={t.win ? "up" : "down"}>{t.win ? `+${usd(t.profit)}` : usd(t.profit)}</Chip> },
              ]}
            />
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}

function RunDetailDrawer({ id, onClose, onExport, onJump }: { id: string; onClose: () => void; onExport: (run: SandboxRun) => void; onJump: (line: number) => void }) {
  const record = SCRIPT_RUNS.find((r) => r.id === id) ?? SCRIPT_RUNS[0];
  const script = SCRIPTS.find((s) => s.id === record.scriptId);
  const run = useMemo(() => runScriptSandbox(record.scriptId, script ? scriptSource(record.scriptId) : "", { seed: 99, ticks: Math.max(120, record.ticks) }), [record, script]);
  const [tab, setTab] = useState("summary");
  return (
    <Drawer
      open
      onClose={onClose}
      wide
      title={record.runLabel}
      subtitle={`${script?.name ?? record.scriptId} · ${record.symbol} · ${record.contractType} · ${ago(record.startedMin)}`}
      footer={
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="dx-btn dx-btn-primary" onClick={() => onExport(run)}><Download size={13} /> Export run log</button>
          {run.timeoutAtLine ? <button type="button" className="dx-btn" onClick={() => onJump(run.timeoutAtLine ?? 1)}>Jump to line {run.timeoutAtLine}</button> : null}
          <button type="button" className="dx-btn dx-btn-ghost ms-auto" onClick={onClose}>Close run</button>
        </div>
      }
    >
      <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
        <Chip tone={runTone(record.status)}>{record.status}</Chip>
        <Chip tone="info">{record.loginId}</Chip>
        <Chip tone="muted">{record.durationMs} ms</Chip>
        <span className="dx-help ms-auto">{record.note}</span>
      </div>
      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "summary", label: "Summary" },
          { id: "trades", label: "Trades", badge: run.trades.length },
          { id: "log", label: "Tape" },
        ]}
      />
      <div className="mt-3">
        {tab === "summary" ? (
          <div className="d-grid gap-3">
            <div className="row g-2">
              <div className="col-6"><StatCard label="Ticks" value={record.ticks} footnote="replayed" /></div>
              <div className="col-6"><StatCard label="Trades" value={record.trades} footnote={`win ${pct(record.winRate, 1)}`} /></div>
              <div className="col-6"><StatCard label="P&L" value={record.pnl} decimals={2} prefix="$" trendDir={record.pnl >= 0 ? "up" : "down"} trend="settled" /></div>
              <div className="col-6"><StatCard label="Peak heap" value={record.peakMemoryMb} suffix=" MB" footnote="of 128 MB" /></div>
            </div>
            <div>
              <span className="dx-kpi-label">Heap trace</span>
              <LineChart data={run.memory} height={150} tone={record.peakMemoryMb >= 120 ? "down" : "accent"} ariaLabel="Run heap" yFormat={(v) => `${Math.round(v)} MB`} />
            </div>
            <Alert tone={runTone(record.status) === "up" ? "up" : runTone(record.status) === "info" ? "info" : "warn"} title={`Sandbox verdict: ${record.status}`}>
              {record.status === "ok"
                ? "The run completed inside every budget — execution time, heap and trade rate all passed."
                : record.status === "queued"
                  ? "The run is waiting for a free sandbox worker; nothing has been executed yet."
                  : "The run was aborted — the detail below names the line and the limit that fired."}
            </Alert>
          </div>
        ) : null}
        {tab === "trades" ? (
          <DataTable
            ariaLabel="Run trades"
            state={useDataTable({ rows: run.trades, initialPageSize: 8, searchKeys: (t) => [String(t.seq), t.contract], sorters: { seq: (t) => t.seq, profit: (t) => t.profit }, initialSort: "seq" })}
            rowKey={(t) => String(t.seq)}
            columns={[
              { header: "#", cell: (t) => <span className="font-display">{t.seq}</span> },
              { header: "Stake", align: "end", cell: (t) => <span className="font-display">{usd(t.stake)}</span> },
              { header: "Entry", align: "end", cell: (t) => <span className="font-display">{t.entrySpot}</span> },
              { header: "Exit", align: "end", cell: (t) => <span className="font-display">{t.exitSpot}</span> },
              { header: "Profit", align: "end", cell: (t) => <span className={`font-display ${t.win ? "dx-up" : "dx-down"}`}>{usd(t.profit)}</span> },
            ]}
          />
        ) : null}
        {tab === "log" ? (
          <div className="dx-console" role="log" aria-live="polite">
            <ConsoleLines lines={run.logLines} />
          </div>
        ) : null}
      </div>
    </Drawer>
  );
}

// =============================================================================
// 15 — DISPATCHER
// =============================================================================
export function ScriptOverlays(props: ScriptOverlayProps) {
  const {
    overlay, setOverlay, script, code, appliedCode, analysis, run, setRun, scripts, suite, setSuite,
    breakpoints, setBreakpoints, prefs, setPrefs, events, pushEvent, notify,
    onCreate, onSave, onDiscard, onDelete, onDuplicate, onRollback, onReplaceCode, onInsertSnippet,
    onInsertAtLine, onApplyFix, onToggleBreakpoint, onAssign, onPublish, onExportRun, goScript,
  } = props;

  if (!overlay) return null;
  const close = () => setOverlay(null);
  const jump = (line: number) => {
    close();
    const el = document.querySelector<HTMLElement>(`[data-line="${line}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    el?.focus?.();
  };

  switch (overlay.kind) {
    case "new-script":
      return (
        <NewScriptWizard
          from={overlay.from}
          scripts={scripts}
          onClose={close}
          onCreate={(draft) => { onCreate(draft); close(); }}
          onGallery={() => setOverlay({ kind: "template-gallery" })}
        />
      );

    case "script-detail":
      return (
        <ScriptDetailDrawer
          id={overlay.id}
          scripts={scripts}
          onClose={close}
          onEdit={() => goScript(overlay.id)}
          onDuplicate={() => setOverlay({ kind: "script-duplicate", id: overlay.id })}
          onDelete={() => setOverlay({ kind: "script-delete", id: overlay.id })}
          onAssign={() => setOverlay({ kind: "script-assign", id: overlay.id })}
          onExport={() => setOverlay({ kind: "script-export", id: overlay.id })}
          onRunDetail={(runId) => setOverlay({ kind: "run-detail", id: runId })}
          setOverlay={setOverlay}
        />
      );

    case "script-delete":
      return <DeleteScriptDialog id={overlay.id} scripts={scripts} onClose={close} onDelete={(id) => { onDelete(id); close(); }} />;

    case "script-duplicate":
      return <DuplicateScriptDialog id={overlay.id} scripts={scripts} onClose={close} onDuplicate={(id, name) => { onDuplicate(id, name); close(); }} />;

    case "script-export":
      return <ExportScriptDialog id={overlay.id} scripts={scripts} onClose={close} onImport={() => setOverlay({ kind: "script-import" })} />;

    case "script-import":
      return <ImportScriptDialog scripts={scripts} onClose={close} onCreate={(draft) => { onCreate(draft); close(); }} />;

    case "script-assign":
      return <AssignBotWizard id={overlay.id} scripts={scripts} onClose={close} onAssign={onAssign} notify={notify} />;

    case "script-health":
      return <ScriptHealthDialog scripts={scripts} onOpen={goScript} onClose={close} />;

    case "script-events":
      return <ScriptEventsDrawer id={overlay.id} events={events} onClose={close} onScript={goScript} />;

    case "bulk-scripts":
      return (
        <BulkScriptsDialog
          ids={overlay.ids}
          scripts={scripts}
          onClose={close}
          onArchive={() => {
            overlay.ids.forEach((id) => pushEvent({ scriptId: id, actor: "You", action: "archived", detail: "Removed from the bot configurator; history kept.", level: "warn", channel: "version" }));
          }}
          onTag={(tag) => {
            overlay.ids.forEach((id) => pushEvent({ scriptId: id, actor: "You", action: `tagged ${tag}`, detail: "Tag applied from the bulk action dialog.", level: "info", channel: "editor" }));
          }}
        />
      );

    case "template-gallery":
      return (
        <TemplateGalleryDrawer
          category={overlay.category}
          onClose={close}
          onDetail={(id, source) => setOverlay({ kind: "template-detail", id, source })}
          onUse={(id) => setOverlay({ kind: "new-script", from: id })}
          setOverlay={setOverlay}
        />
      );

    case "template-detail":
      return (
        <TemplateDetailDrawer
          id={overlay.id}
          source={overlay.source}
          onClose={close}
          onUse={(id) => setOverlay({ kind: "new-script", from: id })}
          setOverlay={setOverlay}
        />
      );

    case "api-reference":
      return <ApiReferenceDialog onClose={close} onInsert={(snippet) => { onInsertSnippet(snippet); close(); }} />;

    case "sandbox-limits":
      return <SandboxLimitsDialog onClose={close} />;

    case "save-confirm":
      return script ? (
        <SaveConfirmDialog
          script={script}
          analysis={analysis}
          onClose={close}
          onSave={() => onSave({ force: true })}
          onHistory={() => setOverlay({ kind: "versions" })}
        />
      ) : null;

    case "save-blocked":
      return (
        <SaveBlockedDialog
          script={script}
          analysis={analysis}
          onClose={close}
          onApplyFix={(issue) => { onApplyFix(issue); close(); }}
          onJump={jump}
          onSandbox={() => setOverlay({ kind: "sandbox-limits" })}
        />
      );

    case "test-run":
      return (
        <TestRunWizard
          script={script}
          code={code}
          analysis={analysis}
          run={run}
          setRun={(next) => { setRun(next); setSuite(runScriptSuite(script?.id ?? "", SCRIPT_TESTS)); }}
          onClose={close}
          onJump={jump}
          onExport={onExportRun}
          notify={notify}
        />
      );

    case "test-suite":
      return (
        <TestSuiteDialog
          script={script}
          suite={suite}
          setSuite={setSuite}
          onClose={close}
          onCase={(id) => setOverlay({ kind: "test-case", id })}
          setOverlay={setOverlay}
        />
      );

    case "test-case":
      return <TestCaseDialog id={overlay.id} onClose={close} onJump={jump} setOverlay={setOverlay} />;

    case "script-backtest":
      return <ScriptBacktestDialog script={script} code={code} onClose={close} onInsert={onInsertSnippet} notify={notify} />;

    case "run-detail":
      return <RunDetailDrawer id={overlay.id} onClose={close} onExport={onExportRun} onJump={jump} />;

    case "versions":
      return (
        <VersionsDrawer
          script={script}
          onClose={close}
          onDiff={(a, b) => setOverlay({ kind: "version-diff", a, b })}
          onRollback={(id) => setOverlay({ kind: "rollback", id })}
          onBranches={() => setOverlay({ kind: "branches" })}
        />
      );

    case "version-diff":
      return (
        <VersionDiffDialog
          a={overlay.a}
          b={overlay.b}
          onClose={close}
          onRollback={(id) => setOverlay({ kind: "rollback", id })}
          onOpenVersions={() => setOverlay({ kind: "versions" })}
        />
      );

    case "rollback":
      return (
        <RollbackDialog
          id={overlay.id}
          onClose={close}
          onConfirm={(version) => { onRollback(version); close(); }}
          onDiff={() => setOverlay({ kind: "version-diff", a: overlay.id, b: SCRIPT_VERSIONS[0].id })}
        />
      );

    case "branches":
      return (
        <BranchesDrawer
          script={script}
          onClose={close}
          onCreate={() => setOverlay({ kind: "branch-create" })}
          onMerge={(id) => setOverlay({ kind: "branch-merge", id })}
        />
      );

    case "branch-create":
      return (
        <BranchCreateDialog
          script={script}
          onClose={close}
          onCreate={(name, from, protect) => {
            pushEvent({ scriptId: script?.id ?? "scr_01", actor: "You", action: `branched ${name}`, detail: `Created from ${from}${protect ? " · protected" : ""}.`, level: "info", channel: "version" });
            close();
          }}
        />
      );

    case "branch-merge":
      return (
        <BranchMergeWizard
          id={overlay.id}
          script={script}
          onClose={close}
          onMerge={(id, target) => {
            const branch = SCRIPT_BRANCHES.find((b) => b.id === id);
            pushEvent({ scriptId: script?.id ?? "scr_01", actor: "You", action: `merged ${branch?.name ?? id}`, detail: `Squash-merged into ${target}; CI started.`, level: "info", channel: "version" });
          }}
        />
      );

    case "dependencies":
      return (
        <DependenciesDrawer
          script={script}
          onClose={close}
          onStub={(module) => setOverlay({ kind: "module-stub", module })}
          onAdd={() => setOverlay({ kind: "dependency-add" })}
          onInsert={(snippet) => { onInsertSnippet(snippet); close(); }}
        />
      );

    case "dependency-add":
      return <DependencyAddDialog script={script} onClose={close} onInsert={(snippet) => { onInsertSnippet(snippet); close(); }} />;

    case "module-stub":
      return (
        <ModuleStubDialog
          module={overlay.module}
          onClose={close}
          onInsert={(stub) => {
            onReplaceCode(`${stub}\n\n${code}`);
            pushEvent({ scriptId: script?.id ?? "scr_01", actor: "You", action: `stubbed ${overlay.module}`, detail: "Local module stub prepended to the script.", level: "info", channel: "editor" });
            close();
          }}
        />
      );

    case "profiler":
      return <ProfilerDrawer script={script} code={code} run={run} onClose={close} onJump={jump} onInsert={(snippet) => { onInsertSnippet(snippet); close(); }} />;

    case "debugger":
      return (
        <DebuggerDrawer
          script={script}
          code={code}
          breakpoints={breakpoints}
          setBreakpoints={setBreakpoints}
          onClose={close}
          onAddBreakpoint={(line) => setOverlay({ kind: "breakpoint", line })}
          onJump={jump}
          onRun={() => setOverlay({ kind: "test-suite" })}
        />
      );

    case "breakpoint":
      return <BreakpointDialog line={overlay.line} onClose={close} onAdd={(line, condition) => onToggleBreakpoint(line, condition)} />;

    case "ai-assistant":
      return (
        <AiAssistantDrawer
          script={script}
          code={code}
          onClose={close}
          onInsert={onInsertSnippet}
          onReplace={onReplaceCode}
          onExplain={(line) => setOverlay({ kind: "ai-explain", line })}
          onTest={() => setOverlay({ kind: "test-run" })}
          notify={notify}
        />
      );

    case "ai-explain":
      return <AiExplainDialog line={overlay.line} code={code} onClose={close} onInsert={onInsertSnippet} />;

    case "snippets":
      return <SnippetsDialog onClose={close} onPick={(snippet) => { onInsertSnippet(snippet); close(); }} />;

    case "console-full":
      return <ConsoleFullDrawer run={run} onClose={close} onExport={() => run && onExportRun(run)} onJump={jump} />;

    case "editor-prefs":
      return <EditorPrefsDialog prefs={prefs} onChange={setPrefs} onClose={close} />;

    case "keyboard-help":
      return (
        <KeyboardHelpDialog
          onClose={close}
          onAction={(id) => {
            close();
            if (id === "save") onSave({});
            else if (id === "test") setOverlay({ kind: "test-run" });
            else if (id === "snippets") setOverlay({ kind: "snippets" });
            else if (id === "ai") setOverlay({ kind: "ai-assistant" });
            else if (id === "debug") setOverlay({ kind: "debugger" });
            else if (id === "help") setOverlay({ kind: "keyboard-help" });
          }}
        />
      );

    case "publish":
      return <PublishWizard script={script} analysis={analysis} onClose={close} onPublish={onPublish} notify={notify} />;

    case "discard-changes":
      return (
        <DiscardChangesDialog
          onClose={close}
          onDiscard={onDiscard}
          onDiff={() => { close(); onReplaceCode(appliedCode); }}
        />
      );

    case "params":
      return <ParamsDialog params={analysis.params} onClose={close} onInsert={(snippet) => { onInsertAtLine(1, snippet); close(); }} onJump={jump} />;

    default:
      return null;
  }
}

export const SCRIPT_STATS = {
  scripts: SCRIPTS.length,
  editorRows: SCRIPT_EDITOR_ROWS.length,
  engineTemplates: SCRIPT_TEMPLATES.length,
  community: COMMUNITY_TEMPLATES.length,
  apiSymbols: API_REFERENCE.length,
  snippets: SCRIPT_SNIPPETS.length,
  versions: SCRIPT_VERSIONS.length,
  tests: SCRIPT_TESTS.length,
  dependencies: SCRIPT_DEPENDENCIES.length,
  runs: SCRIPT_RUNS.length,
  events: SCRIPT_EVENTS.length,
  profileFrames: SCRIPT_PROFILE_FRAMES.length,
  branches: SCRIPT_BRANCHES.length,
  forbidden: FORBIDDEN_APIS.length,
};
