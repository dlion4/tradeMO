/* =============================================================================
   D-6 · Script Editor / Script Studio
   Routes: /dashboard/scripts (library) & /dashboard/scripts/:id (editor)
   Blueprint: tradeMO.md §5 PAGE D-6 — mock data only, no backend calls.
   ============================================================================= */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Ban,
  BookOpen,
  Bug,
  CheckCircle2,
  Code2,
  Download,
  Eye,
  FileCode2,
  Gauge,
  GitBranch,
  History,
  Layers,
  Lock,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Save,
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
import { AppShell, useDashboardAccount } from "../shell/AppShell";
import {
  Alert,
  Chip,
  Dialog,
  Dropdown,
  EmptyState,
  Field,
  FilterChips,
  Meter,
  MiniTabs,
  Pagination,
  Progress,
  Reveal,
  SearchInput,
  StatCard,
  Tabs,
  Toggle,
  useInterval,
  useToast,
} from "../ui/primitives";
import { DataTable, useDataTable } from "../ui/data-table";
import { LineChart } from "../ui/charts";
import { fmtPrice, pct, usd } from "../../data/market";
import {
  API_REFERENCE,
  COMMUNITY_TEMPLATES,
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
  SCRIPTS,
  analyzeScript,
  freeEngineSlots,
  profileScript,
  runScriptSandbox,
  runScriptSuite,
  scriptById,
  scriptMetaOf,
  scriptSource,
  tokenizeJs,
  type Script,
  type ScriptEvent,
  type ScriptRun,
  type ScriptVersion,
  type SandboxRun,
} from "../../data/trading";
import {
  ApiReferenceList,
  ConsoleLines,
  DEFAULT_BREAKPOINTS,
  RunsTable,
  ScriptOverlays,
  SCRIPT_STATS,
  SnippetList,
  type Breakpoint,
  type EditorPrefs,
  type ScriptOverlay,
} from "./ScriptEditorOverlays";
import "../../styles/pages/script-editor.scss";

// ------------------------------------------------------------------ helpers
function ago(minutes: number): string {
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

function healthTone(h: string): "up" | "warn" | "down" | "muted" {
  return h === "healthy" ? "up" : h === "warning" ? "warn" : h === "error" ? "down" : "muted";
}

function statusTone(status: string): "up" | "warn" | "down" | "muted" | "info" {
  if (status === "deployed") return "up";
  if (status === "draft") return "info";
  if (status === "error") return "down";
  return "muted";
}


// =============================================================================
// LIST VIEW — /dashboard/scripts
// =============================================================================
function LibraryTable({
  scripts,
  selected,
  onToggleSelect,
  onEdit,
  setOverlay,
}: {
  scripts: Script[];
  selected: string[];
  onToggleSelect: (id: string) => void;
  onEdit: (id: string) => void;
  setOverlay: (o: ScriptOverlay) => void;
}) {
  const state = useDataTable({
    rows: scripts,
    searchKeys: (s) => [s.name, s.symbol, s.author, s.language, s.status, ...s.tags],
    sorters: {
      name: (s) => s.name,
      runs: (s) => s.runs,
      win: (s) => s.winRate,
      pnl: (s) => s.pnl,
      lines: (s) => s.lines,
      edited: (s) => -s.updatedAt,
      coverage: (s) => scriptMetaOf(s.id)?.coveragePct ?? 0,
    },
    filterKey: (s) => s.status,
    filterOptions: [
      { id: "deployed", label: "Deployed" },
      { id: "draft", label: "Draft" },
      { id: "error", label: "Error" },
      { id: "archived", label: "Archived" },
    ],
    initialSort: "edited",
    initialPageSize: 6,
  });
  return (
    <>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
        <SearchInput value={state.query} onChange={state.setQuery} placeholder="Search script, symbol, tag, author…" />
        <FilterChips options={state.filterOptions} value={state.filter} onChange={state.setFilter} allLabel={`All (${scripts.length})`} />
        <span className="ms-auto d-flex align-items-center gap-2">
          <span className="dx-help">{selected.length} selected</span>
          <button type="button" className="dx-btn dx-btn-sm" disabled={!selected.length} onClick={() => setOverlay({ kind: "bulk-scripts", ids: selected })}>
            Bulk actions
          </button>
        </span>
      </div>
      <DataTable
        ariaLabel="Strategy scripts"
        state={state}
        rowKey={(s) => s.id}
        onRowClick={(s) => setOverlay({ kind: "script-detail", id: s.id })}
        emptyState={
          <EmptyState
            title="No scripts match"
            message="Clear the status filter or start a new script from a template."
            action={
              <div className="d-flex gap-2">
                <button type="button" className="dx-btn" onClick={state.reset}>Reset filters</button>
                <button type="button" className="dx-btn dx-btn-primary" onClick={() => setOverlay({ kind: "new-script" })}>New script</button>
              </div>
            }
          />
        }
        columns={[
          {
            key: "name",
            header: "Script",
            cell: (s) => {
              const meta = scriptMetaOf(s.id);
              return (
                <span className="d-flex align-items-start gap-2">
                  <input
                    type="checkbox"
                    className="form-check-input mt-1"
                    aria-label={`Select ${s.name}`}
                    checked={selected.includes(s.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => onToggleSelect(s.id)}
                  />
                  <span className="d-flex flex-column">
                    <span className="fw-semibold">{s.name}</span>
                    <span className="dx-help font-display">
                      {s.language} · {s.lines} lines · {meta?.version} · {s.author}
                    </span>
                  </span>
                </span>
              );
            },
            sortValue: (s) => s.name,
          },
          { header: "Symbol", cell: (s) => <span className="font-display">{s.symbol}</span> },
          { header: "Used by", cell: (s) => (
            <span className="d-flex flex-column">
              <span className="font-display">{(scriptMetaOf(s.id)?.usedByBots ?? []).length} bot(s)</span>
              <span className="dx-help">{(scriptMetaOf(s.id)?.usedByBots ?? []).join(", ") || "unattached"}</span>
            </span>
          ), hideOnMobile: true },
          { key: "runs", header: "Runs", align: "end", cell: (s) => <span className="font-display">{s.runs.toLocaleString("en-US")}</span>, sortValue: (s) => s.runs },
          { key: "win", header: "Win rate", align: "end", cell: (s) => <span className="font-display">{pct(s.winRate, 1)}</span>, sortValue: (s) => s.winRate },
          { key: "pnl", header: "P&L", align: "end", cell: (s) => <span className={`font-display ${s.pnl >= 0 ? "dx-up" : "dx-down"}`}>{usd(s.pnl)}</span>, sortValue: (s) => s.pnl },
          { key: "coverage", header: "Coverage", align: "end", cell: (s) => <span className="font-display">{scriptMetaOf(s.id)?.coveragePct}%</span>, sortValue: (s) => scriptMetaOf(s.id)?.coveragePct ?? 0, hideOnMobile: true },
          { header: "Health", cell: (s) => (
            <span className="d-flex flex-wrap gap-1">
              <Chip tone={healthTone(scriptMetaOf(s.id)?.health ?? "healthy")}>{scriptMetaOf(s.id)?.health}</Chip>
              <Chip tone={scriptMetaOf(s.id)?.ciStatus === "passing" ? "up" : scriptMetaOf(s.id)?.ciStatus === "failing" ? "down" : "warn"}>
                CI {scriptMetaOf(s.id)?.ciStatus}
              </Chip>
            </span>
          ) },
          { header: "Status", cell: (s) => <Chip tone={statusTone(s.status)}>{s.status}</Chip>, hideOnMobile: true },
          { key: "edited", header: "Edited", align: "end", cell: (s) => <span className="dx-help font-display">{ago(Math.round((Date.now() - s.updatedAt) / 60000))}</span>, sortValue: (s) => -s.updatedAt },
          {
            header: "Actions",
            className: "dx-td-actions",
            cell: (s) => (
              <div className="d-flex justify-content-end" onClick={(e) => e.stopPropagation()}>
                <Dropdown
                  label={`Actions for ${s.name}`}
                  align="end"
                  trigger={<span className="dx-btn dx-btn-sm">Manage</span>}
                  items={[
                    { id: "edit", label: "Open editor", onSelect: () => onEdit(s.id) },
                    { id: "detail", label: "Detail drawer", onSelect: () => setOverlay({ kind: "script-detail", id: s.id }) },
                    { id: "assign", label: "Assign to bot", onSelect: () => setOverlay({ kind: "script-assign", id: s.id }) },
                    { id: "dup", label: "Duplicate", onSelect: () => setOverlay({ kind: "script-duplicate", id: s.id }) },
                    { id: "export", label: "Export bundle", onSelect: () => setOverlay({ kind: "script-export", id: s.id }) },
                    { id: "versions", label: "Version history", onSelect: () => setOverlay({ kind: "versions" }) },
                    { id: "events", label: "Activity", onSelect: () => setOverlay({ kind: "script-events", id: s.id }) },
                    { type: "divider" },
                    { id: "del", label: "Delete script", danger: true, onSelect: () => setOverlay({ kind: "script-delete", id: s.id }) },
                  ]}
                />
              </div>
            ),
          },
        ]}
      />
      <div className="mt-2">
        <Pagination page={state.page} pageCount={state.pageCount} total={state.total} pageSize={state.pageSize} onPageSizeChange={state.setPageSize} onPageChange={state.setPage} label="scripts" />
      </div>
    </>
  );
}

function TemplateStrip({ onUse, onPreview, onGallery }: { onUse: (id: string) => void; onPreview: (id: string) => void; onGallery: () => void }) {
  return (
    <div className="d-grid gap-3">
      <div className="row g-2">
        {SCRIPT_TEMPLATES.slice(0, 3).map((t) => (
          <div className="col-12 col-md-4" key={t.id}>
            <div className="dx-tpl-card">
              <span className="d-flex align-items-center gap-2">
                <FileCode2 size={14} />
                <span className="fw-semibold">{t.name}</span>
                <Chip tone="muted">{t.difficulty}</Chip>
              </span>
              <span className="dx-help">{t.description}</span>
              <span className="dx-tpl-stars">★ {t.rating.toFixed(1)} · {t.uses.toLocaleString("en-US")} uses · {t.symbol}</span>
              <span className="d-flex flex-wrap gap-2 mt-1">
                <button type="button" className="dx-btn dx-btn-sm" onClick={() => onPreview(t.id)}>Preview</button>
                <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => onUse(t.id)}>Use template</button>
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="d-flex flex-wrap gap-2">
        <button type="button" className="dx-btn" onClick={onGallery}><Layers size={13} /> Full gallery · {SCRIPT_TEMPLATES.length + COMMUNITY_TEMPLATES.length} templates</button>
        <Link to="/dashboard/bots/new" className="dx-btn dx-btn-ghost"><Code2 size={13} /> Attach scripts in the bot creator</Link>
      </div>
    </div>
  );
}

function EventsTable({ events, scripts, setOverlay }: { events: ScriptEvent[]; scripts: Script[]; setOverlay: (o: ScriptOverlay) => void }) {
  const state = useDataTable({
    rows: events,
    searchKeys: (e) => [e.action, e.detail, e.actor, e.channel, scripts.find((s) => s.id === e.scriptId)?.name ?? ""],
    sorters: { at: (e) => -e.atMin, actor: (e) => e.actor },
    filterKey: (e) => e.channel,
    filterOptions: [
      { id: "editor", label: "Editor" },
      { id: "sandbox", label: "Sandbox" },
      { id: "ci", label: "CI" },
      { id: "version", label: "Versions" },
      { id: "ai", label: "AI" },
    ],
    initialSort: "at",
    initialPageSize: 6,
  });
  return (
    <>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
        <SearchInput value={state.query} onChange={state.setQuery} placeholder="Search action, actor, script…" />
        <FilterChips options={state.filterOptions} value={state.filter} onChange={state.setFilter} allLabel={`All (${events.length})`} />
      </div>
      <DataTable
        ariaLabel="Script activity"
        state={state}
        rowKey={(e) => e.id}
        onRowClick={(e) => setOverlay({ kind: "script-events", id: e.scriptId })}
        emptyState={<EmptyState title="No activity" message="Saves, test runs and merges appear here." action={<button type="button" className="dx-btn" onClick={state.reset}>Reset filters</button>} />}
        columns={[
          { key: "at", header: "When", cell: (e) => <span className="font-display">{ago(e.atMin)}</span>, sortValue: (e) => -e.atMin },
          { header: "Script", cell: (e) => <span className="fw-semibold">{scripts.find((s) => s.id === e.scriptId)?.name ?? e.scriptId}</span> },
          { header: "Action", cell: (e) => <span className="d-flex flex-column"><span>{e.action}</span><span className="dx-help">{e.detail}</span></span> },
          { header: "Channel", cell: (e) => <Chip tone={e.level === "error" ? "down" : e.level === "warn" ? "warn" : "info"}>{e.channel}</Chip> },
          { header: "Actor", cell: (e) => <span className="font-display">{e.actor}</span>, hideOnMobile: true },
        ]}
      />
      <div className="mt-2">
        <Pagination page={state.page} pageCount={state.pageCount} total={state.total} pageSize={state.pageSize} onPageChange={state.setPage} label="events" />
      </div>
    </>
  );
}

// =============================================================================
// EDITOR VIEW — /dashboard/scripts/:id
// =============================================================================
function CodeSurface({
  code,
  mode,
  prefs,
  breakpoints,
  errorLines,
  hotLines,
  activeLine,
  onChange,
  onToggleBreakpoint,
  onLineFocus,
}: {
  code: string;
  mode: "edit" | "read";
  prefs: EditorPrefs;
  breakpoints: Breakpoint[];
  errorLines: number[];
  hotLines: number[];
  activeLine: number | null;
  onChange: (next: string) => void;
  onToggleBreakpoint: (line: number) => void;
  onLineFocus: (line: number) => void;
}) {
  const tokens = useMemo(() => tokenizeJs(code), [code]);
  const bpAt = (line: number) => breakpoints.find((b) => b.line === line);
  return (
    <div className="dx-code-panel">
      <div className="dx-code-scroll" style={{ fontSize: `${prefs.fontSize}px` }}>
        {mode === "edit" ? (
          <div className="d-flex">
            <div className="dx-code-gutter flex-column py-2" aria-hidden="true">
              {code.split("\n").map((_, i) => {
                const line = i + 1;
                const bp = bpAt(line);
                return (
                  <span key={line} className="d-flex align-items-center gap-1" style={{ height: `${Math.round(prefs.fontSize * 1.55)}px` }}>
                    <button
                      type="button"
                      className={`dx-code-bp ${bp?.enabled ? (bp.condition ? "is-conditional" : "is-set") : ""}`}
                      aria-label={`Breakpoint on line ${line}`}
                      tabIndex={0}
                      onClick={() => onToggleBreakpoint(line)}
                    />
                    <span className="dx-code-lineno" style={{ width: 20, textAlign: "right" }}>{line}</span>
                  </span>
                );
              })}
            </div>
            <textarea
              className="dx-code-input"
              value={code}
              spellCheck={false}
              aria-label="Script source"
              onSelect={(e) => {
                const upto = (e.currentTarget.value.slice(0, e.currentTarget.selectionStart) ?? "").split("\n").length;
                onLineFocus(upto);
              }}
              onChange={(e) => onChange(e.target.value)}
            />
          </div>
        ) : (
          tokens.map((lineTokens, i) => {
            const line = i + 1;
            const bp = bpAt(line);
            const isError = errorLines.includes(line);
            const isHot = hotLines.includes(line);
            return (
              <div
                key={line}
                className={`dx-code-row ${isError ? "is-error" : ""} ${isHot ? "is-hot" : ""} ${activeLine === line ? "is-active" : ""}`}
                data-line={line}
                tabIndex={-1}
              >
                <span className="dx-code-gutter">
                  <button
                    type="button"
                    className={`dx-code-bp ${bp?.enabled ? (bp.condition ? "is-conditional" : "is-set") : ""}`}
                    aria-label={`Toggle breakpoint on line ${line}`}
                    onClick={() => onToggleBreakpoint(line)}
                  />
                  <span className="dx-code-lineno">{line}</span>
                </span>
                <span className={`dx-code-text ${isError ? "is-error" : ""}`}>
                  {lineTokens.length ? (
                    lineTokens.map((t, j) => (
                      <span key={`${line}-${j}`} className={`dx-tok-${t.kind}`}>
                        {t.text}
                      </span>
                    ))
                  ) : (
                    <span>&nbsp;</span>
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function EditorSidebar({
  script,
  apiQuery,
  setApiQuery,
  apiGroup,
  setApiGroup,
  snippetQuery,
  setSnippetQuery,
  onPickApi,
  onPickSnippet,
  breakpoints,
  consoleLines,
  consolePaused,
  setConsolePaused,
  onInsertParam,
  onOpenDebugger,
}: {
  script: Script;
  apiQuery: string;
  setApiQuery: (v: string) => void;
  apiGroup: string;
  setApiGroup: (v: string) => void;
  snippetQuery: string;
  setSnippetQuery: (v: string) => void;
  onPickApi: (name: string) => void;
  onPickSnippet: (code: string, name: string) => void;
  breakpoints: Breakpoint[];
  consoleLines: string[];
  consolePaused: boolean;
  setConsolePaused: (v: boolean) => void;
  onInsertParam: () => void;
  onOpenDebugger: () => void;
}) {
  const [open, setOpen] = useState<string[]>(["api", "snippets", "vars", "console"]);
  const toggle = (id: string) => setOpen((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));
  const analysis = useMemo(() => analyzeScript(script.id, scriptSource(script.id)), [script.id]);
  const groups = [
    { id: "all", label: `All (${API_REFERENCE.length})` },
    { id: "lifecycle", label: "Lifecycle" },
    { id: "context", label: "Context" },
    { id: "decision", label: "Decision" },
    { id: "tick", label: "Tick" },
    { id: "result", label: "Result" },
    { id: "params", label: "Params" },
  ];
  const block = (id: string, title: string, icon: React.ReactNode, body: React.ReactNode) => (
    <section className="dx-side-block" key={id}>
      <button type="button" className="dx-side-head" onClick={() => toggle(id)} aria-expanded={open.includes(id)}>
        {icon}
        <span className="flex-grow-1">{title}</span>
        <span className="dx-help">{open.includes(id) ? "−" : "+"}</span>
      </button>
      {open.includes(id) ? <div className="dx-side-body">{body}</div> : null}
    </section>
  );
  return (
    <div className="d-grid gap-2">
      {block(
        "api",
        "API reference",
        <BookOpen size={13} />,
        <>
          <SearchInput value={apiQuery} onChange={setApiQuery} placeholder="Search symbols…" />
          <div className="mt-2 mb-2">
            <FilterChips options={groups.slice(1)} value={apiGroup} onChange={setApiGroup} allLabel={groups[0].label} />
          </div>
          <ApiReferenceList query={apiQuery} group={apiGroup} onPick={onPickApi} compact />
        </>,
      )}
      {block(
        "snippets",
        "Snippets",
        <Zap size={13} />,
        <>
          <SearchInput value={snippetQuery} onChange={setSnippetQuery} placeholder="Buy Rise, Check RSI…" />
          <div className="mt-2">
            <SnippetList query={snippetQuery} onPick={onPickSnippet} />
          </div>
          <span className="dx-help d-block mt-2">Ctrl+Space opens the full palette from anywhere in the editor.</span>
        </>,
      )}
      {block(
        "vars",
        `Variables (${analysis.params.length})`,
        <Layers size={13} />,
        <>
          {analysis.params.length ? (
            <div className="d-grid gap-2">
              {analysis.params.map((p) => (
                <button key={p.key} type="button" className="dx-api-row" onClick={onInsertParam} title={p.description}>
                  <span className="d-flex align-items-center gap-2">
                    <span className="font-display fw-semibold">{p.key}</span>
                    <span className="dx-help">{p.type}</span>
                    <span className="font-display ms-auto">{p.value}</span>
                  </span>
                  <span className="dx-help">
                    default {p.defaultValue} · line {p.line} — open the @param editor to change it
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <span className="dx-help">No @param annotations yet — add one so the bot configurator exposes an editable field.</span>
          )}
          <button type="button" className="dx-btn dx-btn-sm mt-2" onClick={onInsertParam}><Plus size={12} /> Add a parameter</button>
        </>,
      )}
      {block(
        "console",
        "Test console",
        <Terminal size={13} />,
        <>
          <div className="d-flex align-items-center gap-2 mb-2">
            <Chip tone={consolePaused ? "warn" : "up"} pulse={!consolePaused}>{consolePaused ? "paused" : "live"}</Chip>
            <button type="button" className="dx-btn dx-btn-sm ms-auto" onClick={() => setConsolePaused(!consolePaused)}>
              {consolePaused ? <Play size={12} /> : <Pause size={12} />} {consolePaused ? "Resume" : "Pause"}
            </button>
          </div>
          <div className="dx-console" role="log" aria-live="polite">
            {consoleLines.length ? <ConsoleLines lines={consoleLines} /> : <span className="dx-help">Run a test to stream the tape here.</span>}
          </div>
        </>,
      )}
      {block(
        "debug",
        `Debugger (${breakpoints.length})`,
        <Bug size={13} />,
        <>
          <div className="d-grid gap-2">
            {breakpoints.map((b) => (
              <span key={b.id} className="dx-help font-display">
                line {b.line} · {b.condition || "always"} · {b.enabled ? "enabled" : "disabled"}
              </span>
            ))}
          </div>
          <button type="button" className="dx-btn dx-btn-sm mt-2" onClick={onOpenDebugger}><Bug size={12} /> Open debugger</button>
        </>,
      )}
    </div>
  );
}

// =============================================================================
// PAGE — shared state, autosave, shortcuts, both modes
// =============================================================================
function ScriptStudioInner({ scriptId }: { scriptId?: string }) {
  const { account } = useDashboardAccount();
  const navigate = useNavigate();
  const { push } = useToast();

  const [scripts, setScripts] = useState<Script[]>(SCRIPTS);
  const [versions, setVersions] = useState<ScriptVersion[]>(SCRIPT_VERSIONS);
  const [events, setEvents] = useState<ScriptEvent[]>(SCRIPT_EVENTS);
  const [overlay, setOverlay] = useState<ScriptOverlay>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [listTab, setListTab] = useState("library");
  const [mode, setMode] = useState<"edit" | "read">("edit");
  const [prefs, setPrefs] = useState<EditorPrefs>({ contrast: "normal", reduceMotion: false, autosaveMs: 2000, fontSize: 13, syntaxWorker: true });
  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>(DEFAULT_BREAKPOINTS);
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState("");
  const [dirty, setDirty] = useState(false);
  const [savedAgo, setSavedAgo] = useState(0);
  const [activeLine, setActiveLine] = useState<number | null>(1);
  const [apiQuery, setApiQuery] = useState("");
  const [apiGroup, setApiGroup] = useState("all");
  const [snippetQuery, setSnippetQuery] = useState("");
  const [consolePaused, setConsolePaused] = useState(false);
  const [run, setRun] = useState<SandboxRun | null>(null);
  const [suite, setSuite] = useState<{ rows: typeof SCRIPT_TESTS; passed: number; failed: number; ms: number } | null>(null);
  const [runToken, setRunToken] = useState<number | null>(null);
  const [runProgress, setRunProgress] = useState(0);

  const script = scriptId ? scripts.find((s) => s.id === scriptId) ?? null : null;
  const meta = script ? scriptMetaOf(script.id) : undefined;
  const analysis = useMemo(() => analyzeScript(script?.id ?? "draft", code), [script?.id, code]);
  const errorLines = analysis.issues.filter((i) => i.severity === "error").map((i) => i.line);
  const warningLines = analysis.issues.filter((i) => i.severity === "warning").map((i) => i.line);
  const hotLines = useMemo(() => profileScript(script?.id ?? "").filter((f) => f.hot).map((f) => f.line), [script?.id]);
  const botsAttached = meta?.usedByBots ?? [];
  const usageStats = useMemo(
    () => ({
      runs: scripts.reduce((sum, s) => sum + s.runs, 0),
      win: scripts.length ? scripts.reduce((sum, s) => sum + s.winRate, 0) / scripts.length : 0,
      pnl: scripts.reduce((sum, s) => sum + s.pnl, 0),
      blocked: SCRIPT_EDITOR_ROWS.filter((r) => r.health === "error").length,
    }),
    [scripts],
  );

  const pageCls = `page-scripts${prefs.contrast === "high" ? " is-high-contrast" : ""}${prefs.reduceMotion ? " is-reduced-motion" : ""}`;
  const notify = (tone: "success" | "error" | "info" | "warn", title: string, body?: string) => push({ tone, title, body });
  const pushEvent = (e: Omit<ScriptEvent, "id" | "atMin">) =>
    setEvents((list) => [{ ...e, id: `sev_local_${list.length + 1}`, atMin: 0 }, ...list].slice(0, 60));
  const goScript = (id: string) => {
    setRun(null);
    setSuite(null);
    navigate({ to: "/dashboard/scripts/$id", params: { id } });
  };
  const backToLibrary = () => {
    setRun(null);
    setSuite(null);
    navigate({ to: "/dashboard/scripts" });
  };

  // --- editor source seeding + 2 s debounced local autosave ------------------
  useEffect(() => {
    if (!script) return;
    const source = scriptSource(script.id);
    setCode(source);
    setApplied(source);
    setDirty(false);
    setSavedAgo(0);
    setRun(null);
    setSuite(null);
  }, [script?.id]);

  useInterval(() => {
    if (!dirty) {
      setSavedAgo((s) => s + 2);
      return;
    }
    setSavedAgo(0);
    pushEvent({ scriptId: script?.id ?? "scr_01", actor: "You", action: "autosaved draft", detail: `Buffered locally after ${prefs.autosaveMs} ms idle — not yet a version commit.`, level: "info", channel: "editor" });
  }, Math.max(800, prefs.autosaveMs));

  // --- inline sandbox run (progress → real results) -------------------------
  useInterval(
    () => {
      setRunProgress((p) => {
        if (p >= 100) return 100;
        return p + 12;
      });
    },
    runToken === null ? null : 110,
  );

  useEffect(() => {
    if (runToken === null || runProgress < 100) return;
    const record = runToken;
    const next = runScriptSandbox(script?.id ?? "scr_01", code, { ticks: record === 0 ? 300 : 600, version: `inline-${record}` });
    setRun(next);
    setSuite(runScriptSuite(script?.id ?? "", SCRIPT_TESTS));
    setRunToken(null);
    setRunProgress(0);
    pushEvent({
      scriptId: script?.id ?? "scr_01",
      actor: "You",
      action: next.status === "ok" ? "inline run passed" : `inline run ${next.status}`,
      detail: `${next.ticks} ticks · ${next.trades.length} contracts · P&L ${usd(next.pnl)} · peak ${next.peakMemoryMb} MB.`,
      level: next.status === "ok" ? "info" : "error",
      channel: "sandbox",
    });
  }, [runProgress, runToken]);

  const downloadLog = (source: SandboxRun) => {
    const body = [
      `DerivX script run — ${script?.name ?? "draft"} (${meta?.version ?? "v1"})`,
      `status: ${source.status} · ticks: ${source.ticks} · trades: ${source.trades.length}`,
      `win rate: ${pct(source.winRate, 1)} · P&L: ${usd(source.pnl)} · peak heap: ${source.peakMemoryMb} MB`,
      "",
      ...source.logLines,
      "",
      "trades:",
      ...source.trades.map((t) => `#${t.seq} ${t.contract} stake ${usd(t.stake)} ${t.entrySpot}->${t.exitSpot} profit ${usd(t.profit)}`),
    ].join("\n");
    const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(script?.name ?? "script").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-run.log`;
    a.click();
    URL.revokeObjectURL(url);
    notify("success", "Run log exported", "The sandbox tape and every settlement were written to your downloads folder.");
  };

  // --- save / discard / rollback -------------------------------------------
  const commit = () => {
    setApplied(code);
    setDirty(false);
    setSavedAgo(0);
    const nextVersion: ScriptVersion = {
      id: `sv_local_${versions.length + 1}`,
      scriptId: script?.id ?? "scr_01",
      version: `v${(Number((meta?.version ?? "v1").replace("v", "")) + 0.1).toFixed(1)}`,
      atMin: 0,
      author: "You",
      message: analysis.issues.length ? `Saved with ${analysis.issues.length} warning(s) — ${analysis.params.length} params` : "Saved from the Script Studio",
      added: Math.max(0, code.split("\n").length - applied.split("\n").length),
      removed: Math.max(0, applied.split("\n").length - code.split("\n").length),
      hash: Math.random().toString(16).slice(2, 9),
      status: "current",
      branch: meta?.branch ?? "main",
      checks: analysis.blocked ? "failed" : "passed",
      tests: analysis.tests.length,
    };
    setVersions((list) => [nextVersion, ...list.map((v) => (v.scriptId === nextVersion.scriptId && v.status === "current" ? { ...v, status: "published" as const } : v))]);
    setScripts((list) => list.map((s) => (s.id === script?.id ? { ...s, updatedAt: Date.now(), lines: analysis.stats.lines } : s)));
    pushEvent({ scriptId: script?.id ?? "scr_01", actor: "You", action: `committed ${nextVersion.version}`, detail: `${nextVersion.message} · ${nextVersion.tests} tests ${nextVersion.checks}.`, level: "info", channel: "version" });
    notify("success", "Script saved", `${script?.name ?? "Script"} committed as ${nextVersion.version}${botsAttached.length ? ` and ${botsAttached.length} bot(s) reloaded` : ""}.`);
  };

  const onSave = (opts?: { force?: boolean }) => {
    if (!script) return;
    if (analysis.blocked) {
      setOverlay({ kind: "save-blocked" });
      return;
    }
    if (botsAttached.length && !opts?.force) {
      setOverlay({ kind: "save-confirm" });
      return;
    }
    commit();
  };

  const onRollback = (version: ScriptVersion) => {
    setCode(scriptSource(version.scriptId));
    setApplied(scriptSource(version.scriptId));
    setDirty(false);
    setVersions((list) => list.map((v) => (v.id === version.id ? { ...v, status: "current" as const } : v.id === versions[0]?.id ? { ...v, status: "rolled-back" as const } : v)));
    pushEvent({ scriptId: version.scriptId, actor: "You", action: `rolled back to ${version.version}`, detail: version.message, level: "warn", channel: "version" });
  };

  const onInsertSnippet = (snippet: string) => {
    setCode((c) => `${c}\n${snippet}`);
    setDirty(true);
    setActiveLine(code.split("\n").length + 1);
  };
  const onInsertAtLine = (line: number, snippet: string) => {
    const lines = code.split("\n");
    lines.splice(Math.max(0, line - 1), 0, snippet);
    setCode(lines.join("\n"));
    setDirty(true);
  };
  const onApplyFix = (issue: { rule: string; fixId?: string }) => {
    if (issue.fixId?.startsWith("stub:")) {
      setOverlay({ kind: "module-stub", module: issue.fixId.slice(5) });
      return;
    }
    setActiveLine(1);
  };
  const onToggleBreakpoint = (line: number, condition?: string) => {
    setBreakpoints((list) => {
      const hit = list.find((b) => b.line === line);
      if (hit) return list.filter((b) => b.line !== line);
      return [...list, { id: `bp_${line}`, line, condition: condition ?? "", hits: 0, enabled: true }].sort((a, b) => a.line - b.line);
    });
  };
  const onCreate = (draft: { name: string; symbol: string; language: Script["language"]; code: string; tags: string[] }) => {
    const id = `scr_local_${scripts.length + 1}`;
    const next: Script = {
      id,
      name: draft.name,
      language: draft.language,
      symbol: draft.symbol,
      status: "draft",
      runs: 0,
      winRate: 0,
      pnl: 0,
      lines: draft.code.split("\n").length,
      author: account.label,
      updatedAt: Date.now(),
      tags: draft.tags,
      code: draft.code,
    };
    setScripts((list) => [next, ...list]);
    pushEvent({ scriptId: id, actor: "You", action: "created the script", detail: `${draft.symbol} · ${draft.language} · ${next.lines} lines from a template.`, level: "info", channel: "version" });
    notify("success", "Script created", `${draft.name} opened in the editor — run the suite before assigning it to a bot.`);
    goScript(id);
  };
  const onDuplicate = (id: string, name: string) => {
    const source = scripts.find((s) => s.id === id);
    if (!source) return;
    const copy: Script = { ...source, id: `scr_local_${scripts.length + 1}`, name, status: "draft", runs: 0, winRate: 0, pnl: 0, updatedAt: Date.now(), tags: [...source.tags, "fork"] };
    setScripts((list) => [copy, ...list]);
    pushEvent({ scriptId: copy.id, actor: "You", action: "forked the script", detail: `${source.name} → ${name}.`, level: "info", channel: "version" });
  };
  const onDelete = (id: string) => {
    const victim = scripts.find((s) => s.id === id);
    setScripts((list) => list.filter((s) => s.id !== id));
    setSelected((sel) => sel.filter((s) => s !== id));
    pushEvent({ scriptId: id, actor: "You", action: "deleted the script", detail: `${victim?.name ?? id} removed with its version history.`, level: "warn", channel: "version" });
    if (scriptId === id) backToLibrary();
  };
  const onAssign = (id: string, bot: string) => {
    pushEvent({ scriptId: id, actor: "You", action: `assigned to ${bot}`, detail: "The bot reloads the script on its next tick.", level: "info", channel: "editor" });
  };
  const onPublish: React.ComponentProps<typeof ScriptOverlays>["onPublish"] = (payload) => {
    pushEvent({ scriptId: script?.id ?? "scr_01", actor: "You", action: "published to the gallery", detail: `${payload.category} · ${payload.license} · ${payload.price === 0 ? "free" : usd(payload.price, 0)}.`, level: "info", channel: "version" });
  };

  const startInlineRun = () => {
    if (analysis.blocked) {
      setOverlay({ kind: "save-blocked" });
      return;
    }
    setRunToken((t) => (t === null ? 0 : t + 1));
    setRunProgress(6);
    pushEvent({ scriptId: script?.id ?? "scr_01", actor: "You", action: "started a sandbox run", detail: "600 ticks queued in the sandbox worker.", level: "info", channel: "sandbox" });
  };

  // --- keyboard shortcuts ---------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta4 = e.metaKey || e.ctrlKey;
      if (meta4 && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (script) onSave({});
      } else if (meta4 && e.key === "Enter") {
        e.preventDefault();
        if (script) setOverlay({ kind: "test-run" });
      } else if (meta4 && e.code === "Space") {
        e.preventDefault();
        setOverlay({ kind: "snippets" });
      } else if (meta4 && e.key.toLowerCase() === "i") {
        e.preventDefault();
        setOverlay({ kind: "ai-assistant" });
      } else if (e.key === "F9") {
        e.preventDefault();
        if (activeLine) onToggleBreakpoint(activeLine);
      } else if (e.key === "?" && !(e.target instanceof HTMLTextAreaElement)) {
        setOverlay({ kind: "keyboard-help" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const consoleLines = run?.logLines ?? [];
  const overlayProps = {
    overlay,
    setOverlay,
    script,
    code,
    appliedCode: applied,
    analysis,
    run,
    setRun,
    scripts,
    suite,
    setSuite,
    breakpoints,
    setBreakpoints,
    prefs,
    setPrefs: (p: Partial<EditorPrefs>) => setPrefs((cur) => ({ ...cur, ...p })),
    events,
    pushEvent,
    notify,
    onCreate,
    onSave,
    onDiscard: () => {
      setCode(applied);
      setDirty(false);
      pushEvent({ scriptId: script?.id ?? "scr_01", actor: "You", action: "discarded the working copy", detail: "Reverted to the last commit.", level: "warn", channel: "editor" });
    },
    onDelete,
    onDuplicate,
    onRollback,
    onReplaceCode: (next: string) => {
      setCode(next);
      setDirty(true);
    },
    onInsertSnippet,
    onInsertAtLine,
    onApplyFix,
    onToggleBreakpoint,
    onAssign,
    onPublish,
    onExportRun: downloadLog,
    goScript,
  };

  // ---------------------------------------------------------------- LIBRARY --
  if (!scriptId) {
    return (
      <>
        <div className={pageCls}>
          <Reveal>
            <div className="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-3">
              <div>
                <p className="dx-eyebrow mb-1">D-6 · Script studio</p>
                <h1 className="dx-h-section mb-1">Strategy scripts</h1>
                <p className="dx-lead mb-0">
                  {scripts.length} scripts · {scripts.filter((s) => s.status === "deployed").length} deployed · sandbox P&L{" "}
                  <span className={`font-display ${usageStats.pnl >= 0 ? "dx-up" : "dx-down"}`}>{usd(usageStats.pnl, 0)}</span>
                  {" "}· validator blocks {usageStats.blocked} save(s)
                </p>
              </div>
              <div className="d-flex flex-wrap gap-2 align-items-center">
              <button type="button" className="dx-btn dx-btn-primary" onClick={() => setOverlay({ kind: "new-script" })}>
                <Plus size={14} /> New script
              </button>
              <button type="button" className="dx-btn" onClick={() => setOverlay({ kind: "script-import" })}>
                <Upload size={13} /> Import
              </button>
              <Dropdown
                label="Studio tools"
                align="end"
                trigger={<span className="dx-btn dx-btn-ghost" aria-label="Studio tools"><Layers size={14} /> Tools</span>}
                items={[
                  { id: "gallery", label: "Template gallery", icon: <Layers size={13} />, onSelect: () => setOverlay({ kind: "template-gallery" }) },
                  { id: "api", label: "API reference", icon: <BookOpen size={13} />, onSelect: () => setOverlay({ kind: "api-reference" }) },
                  { id: "limits", label: "Sandbox limits", icon: <Shield size={13} />, onSelect: () => setOverlay({ kind: "sandbox-limits" }) },
                  { id: "health", label: "Script health report", icon: <Gauge size={13} />, onSelect: () => setOverlay({ kind: "script-health" }) },
                  { id: "events", label: "Audit trail", icon: <History size={13} />, onSelect: () => setOverlay({ kind: "script-events" }) },
                  { id: "help", label: "Keyboard shortcuts", icon: <Sparkles size={13} />, onSelect: () => setOverlay({ kind: "keyboard-help" }) },
                ]}
              />
              </div>
            </div>
          </Reveal>
          <LibraryList
            scripts={scripts}
            selected={selected}
            setSelected={setSelected}
            events={events}
            setOverlay={setOverlay}
            goScript={goScript}
            usage={usageStats}
          />
        </div>
        <ScriptOverlays {...overlayProps} />
      </>
    );
  }

  // ------------------------------------------------------------ NOT FOUND ---
  if (!script) {
    return (
      <>
        <div className={pageCls}>
          <EmptyState
            icon={<FileCode2 size={18} />}
            title="Script not found"
            message={`No script matches “${scriptId}”. It may have been deleted, renamed, or forked into another workspace.`}
            action={
              <div className="d-flex flex-wrap gap-2">
                <button type="button" className="dx-btn dx-btn-primary" onClick={backToLibrary}>Back to the library</button>
                <button type="button" className="dx-btn" onClick={() => setOverlay({ kind: "script-import" })}><Upload size={13} /> Import a script file</button>
              </div>
            }
          />
        </div>
        <ScriptOverlays {...overlayProps} />
      </>
    );
  }

  // ------------------------------------------------------------------ EDITOR --
  const shellActions = (
    <>
      <button type="button" className={`dx-btn ${dirty ? "dx-btn-primary" : ""}`} onClick={() => onSave({})} disabled={analysis.blocked}>
        <Save size={14} /> {dirty ? "Save*" : "Saved"}
      </button>
      <button type="button" className="dx-btn" onClick={startInlineRun} disabled={runToken !== null}>
        <Play size={13} /> {runToken !== null ? `Testing ${runProgress}%` : "Test"}
      </button>
      <button type="button" className="dx-btn" onClick={() => setOverlay({ kind: "script-backtest" })}>
        <Gauge size={13} /> Backtest
      </button>
      <Dropdown
        label="Editor tools"
        align="end"
        trigger={<span className="dx-btn dx-btn-ghost" aria-label="Editor tools"><Layers size={14} /> Tools</span>}
        items={[
          { id: "versions", label: "Version history", icon: <History size={13} />, onSelect: () => setOverlay({ kind: "versions" }) },
          { id: "branches", label: "Branches & merges", icon: <GitBranch size={13} />, onSelect: () => setOverlay({ kind: "branches" }) },
          { id: "deps", label: "Dependencies", icon: <Layers size={13} />, onSelect: () => setOverlay({ kind: "dependencies" }) },
          { id: "profiler", label: "Live profiler", icon: <Gauge size={13} />, onSelect: () => setOverlay({ kind: "profiler" }) },
          { id: "debug", label: "Debugger", icon: <Bug size={13} />, onSelect: () => setOverlay({ kind: "debugger" }) },
          { id: "suite", label: "Test suite", icon: <CheckCircle2 size={13} />, onSelect: () => setOverlay({ kind: "test-suite" }) },
          { id: "ai", label: "AI assistant", icon: <Wand2 size={13} />, onSelect: () => setOverlay({ kind: "ai-assistant" }) },
          { id: "params", label: "@param editor", icon: <Ban size={13} />, onSelect: () => setOverlay({ kind: "params" }) },
          { id: "console", label: "Full console", icon: <Terminal size={13} />, onSelect: () => setOverlay({ kind: "console-full" }) },
          { id: "publish", label: "Publish to gallery", icon: <Share2 size={13} />, onSelect: () => setOverlay({ kind: "publish" }) },
          { id: "export", label: "Export script", icon: <Download size={13} />, onSelect: () => setOverlay({ kind: "script-export", id: script.id }) },
          { id: "prefs", label: "Editor preferences", icon: <Sparkles size={13} />, onSelect: () => setOverlay({ kind: "editor-prefs" }) },
        ]}
      />
    </>
  );

  return (
    <>
      <div className={pageCls}>
        <Reveal>
          <div className="dx-editor-bar d-flex flex-wrap align-items-center gap-2 mb-3">
            <span className="d-flex align-items-center gap-2">
              <FileCode2 size={15} />
              <span className="fw-semibold font-display">{script.name}</span>
            </span>
            <span className="dx-help">{script.language} · {script.symbol} · {meta?.version ?? "v1"} on {meta?.branch ?? "main"}</span>
            <span className="ms-auto d-flex flex-wrap gap-2 align-items-center">{shellActions}</span>
          </div>
        </Reveal>
        <EditorStudio
          script={script}
          meta={meta}
          botsAttached={botsAttached}
          code={code}
          applied={applied}
          dirty={dirty}
          savedAgo={savedAgo}
          analysis={analysis}
          errorLines={errorLines}
          warningLines={warningLines}
          hotLines={hotLines}
          mode={mode}
          setMode={setMode}
          prefs={prefs}
          setPrefs={(p) => setPrefs((cur) => ({ ...cur, ...p }))}
          breakpoints={breakpoints}
          onToggleBreakpoint={onToggleBreakpoint}
          activeLine={activeLine}
          setActiveLine={setActiveLine}
          onChangeCode={(next) => {
            setCode(next);
            setDirty(true);
          }}
          apiQuery={apiQuery}
          setApiQuery={setApiQuery}
          apiGroup={apiGroup}
          setApiGroup={setApiGroup}
          snippetQuery={snippetQuery}
          setSnippetQuery={setSnippetQuery}
          consoleLines={consoleLines}
          consolePaused={consolePaused}
          setConsolePaused={setConsolePaused}
          run={run}
          runProgress={runToken !== null ? runProgress : null}
          startInlineRun={startInlineRun}
          onExportRun={() => { if (run) downloadLog(run); }}
          setOverlay={setOverlay}
          onSave={onSave}
          backToLibrary={backToLibrary}
          goScript={goScript}
          versions={versions}
        />
      </div>
      <ScriptOverlays {...overlayProps} />
    </>
  );
}

function LibraryList({
  scripts,
  selected,
  setSelected,
  events,
  setOverlay,
  goScript,
  usage,
}: {
  scripts: Script[];
  selected: string[];
  setSelected: (ids: string[]) => void;
  events: ScriptEvent[];
  setOverlay: (o: ScriptOverlay) => void;
  goScript: (id: string) => void;
  usage: { runs: number; win: number; pnl: number; blocked: number };
}) {
  const [tab, setTab] = useState("library");
  const [cat, setCat] = useState("all");
  const [minRating, setMinRating] = useState("all");
  const toggleSelect = (id: string) => setSelected(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  const community = COMMUNITY_TEMPLATES.filter(
    (t) => (cat === "all" || t.category === cat) && (minRating === "all" || t.rating >= Number(minRating)),
  );
  const deployable = scripts.filter((s) => s.status === "deployed").length;
  const avgCoverage = scripts.length ? scripts.reduce((sum, s) => sum + (scriptMetaOf(s.id)?.coveragePct ?? 0), 0) / scripts.length : 0;

  return (
    <div className="d-grid gap-3">
      <Reveal>
        <div className="row g-2">
          <div className="col-12 col-sm-6 col-xl-3">
            <StatCard
              label="Scripts in library"
              value={scripts.length}
              suffix=" files"
              footnote={`${deployable} deployed · ${scripts.length - deployable} draft/archived`}
              action={<button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "bulk-scripts", ids: scripts.map((s) => s.id) })}>Manage</button>}
            />
          </div>
          <div className="col-12 col-sm-6 col-xl-3">
            <StatCard
              label="Sandbox runs (30 d)"
              value={usage.runs}
              trend="+12.4% vs prev 30 d"
              trendDir="up"
              footnote={`${SCRIPT_RUNS.filter((r) => r.status !== "ok").length} aborted by the sandbox`}
              action={<button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "script-events" })}>Audit</button>}
            />
          </div>
          <div className="col-12 col-sm-6 col-xl-3">
            <StatCard
              label="Avg win rate"
              value={usage.win}
              decimals={1}
              suffix="%"
              trend="+1.8 pp vs prev quarter"
              trendDir="up"
              footnote={`Test coverage ${pct(avgCoverage, 0)} of 12 tracked scripts`}
              action={<button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "script-health" })}>Health</button>}
            />
          </div>
          <div className="col-12 col-sm-6 col-xl-3">
            <StatCard
              label="Total sandbox P&L"
              value={usage.pnl}
              prefix="$"
              decimals={0}
              trendDir={usage.pnl >= 0 ? "up" : "down"}
              trend={usage.pnl >= 0 ? "+4.6% vs prev 30 d" : "\u22123.2% vs prev 30 d"}
              footnote={`${usage.blocked} script blocks a save on sandbox limits`}
              action={<button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "sandbox-limits" })}>Rules</button>}
            />
          </div>
        </div>
      </Reveal>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "library", label: "My scripts", icon: <FileCode2 size={13} />, badge: scripts.length },
          { id: "templates", label: "Template library", icon: <Layers size={13} />, badge: SCRIPT_TEMPLATES.length + COMMUNITY_TEMPLATES.length },
          { id: "runs", label: "Sandbox runs", icon: <Play size={13} />, badge: SCRIPT_RUNS.length },
          { id: "audit", label: "Audit trail", icon: <History size={13} />, badge: events.length },
        ]}
      />

      {tab === "library" ? (
        <LibraryTable scripts={scripts} selected={selected} onToggleSelect={toggleSelect} onEdit={goScript} setOverlay={setOverlay} />
      ) : null}

      {tab === "templates" ? (
        <div className="d-grid gap-3">
          <TemplateStrip
            onUse={(id) => setOverlay({ kind: "new-script", from: id })}
            onPreview={(id) => setOverlay({ kind: "template-detail", id, source: "sdk" })}
            onGallery={() => setOverlay({ kind: "template-gallery", category: cat === "all" ? undefined : cat })}
          />
          <div className="d-flex flex-wrap align-items-center gap-2">
            <span className="dx-h-section mb-0">Community gallery</span>
            <FilterChips
              options={[
                { id: "trend", label: "Trend" },
                { id: "mean-reversion", label: "Mean reversion" },
                { id: "scalping", label: "Scalping" },
                { id: "hedging", label: "Hedging" },
              ]}
              value={cat}
              onChange={setCat}
              allLabel={`All (${COMMUNITY_TEMPLATES.length})`}
            />
            <span className="ms-auto d-flex align-items-center gap-2">
              <span className="dx-help">Min rating</span>
              <MiniTabs
                ariaLabel="Minimum community rating"
                value={minRating}
                onChange={setMinRating}
                options={[
                  { id: "all", label: "Any" },
                  { id: "4.5", label: "4.5+" },
                  { id: "4.8", label: "4.8+" },
                ]}
              />
            </span>
          </div>
          {community.length ? (
            <div className="row g-2">
              {community.map((t) => (
                <div className="col-12 col-md-6 col-xl-4" key={t.id}>
                  <div className="dx-tpl-card h-100">
                    <span className="d-flex align-items-center gap-2">
                      <Sparkles size={14} />
                      <span className="fw-semibold">{t.name}</span>
                      <Chip tone={t.verified ? "up" : "muted"}>{t.category}</Chip>
                    </span>
                    <span className="dx-help">{t.description}</span>
                    <span className="dx-tpl-stars">
                      <Star size={12} /> {t.rating.toFixed(1)} · {t.forks.toLocaleString("en-US")} forks · {t.symbol}
                    </span>
                    <span className="dx-help font-display">
                      benchmark {usd(t.benchmark.pnl, 0)} over {t.benchmark.trades} trades · {pct(t.benchmark.winRate, 0)} wins
                    </span>
                    <span className="d-flex flex-wrap gap-2 mt-1">
                      <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "template-detail", id: t.id, source: "community" })}>Preview</button>
                      <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "template-gallery", category: t.category })}>More like this</button>
                      <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => setOverlay({ kind: "new-script", from: t.id })}>Use template</button>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Layers size={18} />}
              title="No community templates match"
              message="Relax the rating bar or switch category — the gallery ships 12 public templates plus 5 SDK starters."
              action={<button type="button" className="dx-btn" onClick={() => { setCat("all"); setMinRating("all"); }}>Reset template filters</button>}
            />
          )}
        </div>
      ) : null}

      {tab === "runs" ? (
        <div className="d-grid gap-3">
          <Alert tone="info" title="Sandbox run history">
            Every run below was executed in the WebAssembly sandbox with a 100 ms tick budget, 128 MB heap and no network access. Open a row to inspect the tape.
          </Alert>
          <RunsTable runs={SCRIPT_RUNS} ariaLabel="Script sandbox runs" pageSize={6} onRowClick={(id) => setOverlay({ kind: "run-detail", id })} />
        </div>
      ) : null}

      {tab === "audit" ? <EventsTable events={events} scripts={scripts} setOverlay={setOverlay} /> : null}

      {selected.length ? (
        <div className="dx-card dx-card-pad d-flex flex-wrap align-items-center gap-2">
          <span className="fw-semibold font-display">{selected.length} selected</span>
          <span className="dx-help">{scripts.filter((s) => selected.includes(s.id)).map((s) => s.name).slice(0, 3).join(", ")}{selected.length > 3 ? ` +${selected.length - 3} more` : ""}</span>
          <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "bulk-scripts", ids: selected })}>Bulk actions</button>
          <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "script-export", id: selected[0] })}><Download size={12} /> Export bundle</button>
          <button type="button" className="dx-btn dx-btn-sm dx-btn-danger" onClick={() => setOverlay({ kind: "script-delete", id: selected[0] })}><Trash2 size={12} /> Delete…</button>
          <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost ms-auto" onClick={() => setSelected([])}>Clear selection</button>
        </div>
      ) : null}

      <span className="dx-help">
        Studio catalogue: {SCRIPT_STATS.scripts} scripts · {SCRIPT_STATS.snippets} snippets · {SCRIPT_STATS.apiSymbols} API symbols · {SCRIPT_STATS.engineTemplates + SCRIPT_STATS.community} templates.{" "}
        <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setOverlay({ kind: "script-assign", id: scripts[0]?.id ?? "scr_01" })}>Assign a script to a bot</button>{" "}
        or{" "}
        <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setOverlay({ kind: "script-duplicate", id: scripts[1]?.id ?? "scr_02" })}>fork today’s best performer</button>.
      </span>
    </div>
  );
}

function EditorStudio({
  script,
  meta,
  botsAttached,
  code,
  applied,
  dirty,
  savedAgo,
  analysis,
  errorLines,
  warningLines,
  hotLines,
  mode,
  setMode,
  prefs,
  setPrefs,
  breakpoints,
  onToggleBreakpoint,
  activeLine,
  setActiveLine,
  onChangeCode,
  apiQuery,
  setApiQuery,
  apiGroup,
  setApiGroup,
  snippetQuery,
  setSnippetQuery,
  consoleLines,
  consolePaused,
  setConsolePaused,
  run,
  runProgress,
  startInlineRun,
  onExportRun,
  setOverlay,
  onSave,
  backToLibrary,
  goScript,
  versions,
}: {
  script: Script;
  meta: ReturnType<typeof scriptMetaOf>;
  botsAttached: string[];
  code: string;
  applied: string;
  dirty: boolean;
  savedAgo: number;
  analysis: ReturnType<typeof analyzeScript>;
  errorLines: number[];
  warningLines: number[];
  hotLines: number[];
  mode: "edit" | "read";
  setMode: (m: "edit" | "read") => void;
  prefs: EditorPrefs;
  setPrefs: (p: Partial<EditorPrefs>) => void;
  breakpoints: Breakpoint[];
  onToggleBreakpoint: (line: number, condition?: string) => void;
  activeLine: number | null;
  setActiveLine: (line: number | null) => void;
  onChangeCode: (next: string) => void;
  apiQuery: string;
  setApiQuery: (v: string) => void;
  apiGroup: string;
  setApiGroup: (v: string) => void;
  snippetQuery: string;
  setSnippetQuery: (v: string) => void;
  consoleLines: string[];
  consolePaused: boolean;
  setConsolePaused: (v: boolean) => void;
  run: SandboxRun | null;
  runProgress: number | null;
  startInlineRun: () => void;
  onExportRun: () => void;
  setOverlay: (o: ScriptOverlay) => void;
  onSave: (opts?: { force?: boolean }) => void;
  backToLibrary: () => void;
  goScript: (id: string) => void;
  versions: ScriptVersion[];
}) {
  const [aiPrompt, setAiPrompt] = useState("");
  const [filter, setFilter] = useState("all");
  const scriptVersions = versions.filter((v) => v.scriptId === script.id).slice(0, 4);
  const myRuns = SCRIPT_RUNS.filter((r) => r.scriptId === script.id);
  const deps = SCRIPT_DEPENDENCIES.filter((d) => d.fromScriptId === script.id || d.module === script.name);
  const failing = SCRIPT_TESTS.filter((t) => t.scriptId === script.id && t.status === "fail").length;
  const lines = code.split("\n").length;
  const profileTop = useMemo(() => profileScript(script.id).filter((f) => f.hot).slice(0, 2), [script.id]);

  return (
    <div className="d-grid gap-3">
      {/* toolbar -------------------------------------------------------------- */}
      <div className="dx-editor-bar d-flex flex-wrap align-items-center gap-2">
        <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={backToLibrary}>
          <FileCode2 size={12} /> Library
        </button>
        <span className="font-display fw-semibold">{script.name}</span>
        <Chip tone={statusTone(script.status)}>{script.status}</Chip>
        <Chip tone={healthTone(meta?.health ?? "healthy")}>{meta?.health ?? "healthy"}</Chip>
        <span className="dx-help">
          {meta?.version ?? "v1"} · {meta?.branch ?? "main"} · {dirty ? <span className="dx-warn-text">unsaved changes</span> : `saved ${savedAgo}s ago`}
        </span>
        <MiniTabs
          ariaLabel="Editor mode"
          value={mode}
          onChange={(m) => setMode(m as "edit" | "read")}
          options={[
            { id: "edit", label: "Edit" },
            { id: "read", label: "Diff view" },
          ]}
        />
        <span className="ms-auto d-flex flex-wrap align-items-center gap-2">
          <button type="button" className="dx-btn dx-btn-sm" onClick={() => setPrefs({ fontSize: Math.max(11, prefs.fontSize - 1) })} aria-label="Decrease font size">A−</button>
          <button type="button" className="dx-btn dx-btn-sm" onClick={() => setPrefs({ fontSize: Math.min(18, prefs.fontSize + 1) })} aria-label="Increase font size">A+</button>
          <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "editor-prefs" })}><Sparkles size={12} /> Editor prefs</button>
          <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "snippets" })}><Zap size={12} /> Snippets ⌘␣</button>
          <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "debugger" })}>
            <Bug size={12} /> Debugger {breakpoints.length ? `· ${breakpoints.length}` : ""}
          </button>
          <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "keyboard-help" })} aria-label="Keyboard shortcuts">?</button>
        </span>
      </div>

      {/* guards -------------------------------------------------------------- */}
      {analysis.blocked ? (
        <Alert tone="danger" title="Save is blocked by the sandbox validator">
          <span className="d-flex flex-wrap align-items-center gap-2">
            <span>
              {analysis.issues.filter((i) => i.severity === "error").length} blocking issue(s): {analysis.issues.filter((i) => i.severity === "error").slice(0, 2).map((i) => `line ${i.line} ${i.rule}`).join(", ")}
              {analysis.issues.filter((i) => i.severity === "error").length > 2 ? " …" : ""}
            </span>
            <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "save-blocked" })}>Review the block</button>
            <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "sandbox-limits" })}>Sandbox rules</button>
          </span>
        </Alert>
      ) : null}
      {botsAttached.length ? (
        <Alert tone="warn" title={`${botsAttached.length} bot(s) run this script`}>
          <span className="d-flex flex-wrap align-items-center gap-2">
            <span>{botsAttached.join(", ")} reload the new version on their next tick — save asks for confirmation first.</span>
            <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "script-assign", id: script.id })}>Manage attachments</button>
          </span>
        </Alert>
      ) : null}

      <div className="row g-3">
        <div className="col-12 col-xl-8 d-grid gap-3">
          <div className="dx-card">
            <div className="dx-card-head d-flex flex-wrap align-items-center gap-2">
              <Code2 size={14} />
              <span className="dx-card-title">{script.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.{script.language === "TypeScript" ? "ts" : "js"}</span>
              <span className="dx-help font-display">{lines} lines · {analysis.stats.functions} fns · {analysis.stats.bytes} B</span>
              <span className="ms-auto d-flex flex-wrap gap-2">
                <button type="button" className="dx-btn dx-btn-sm" onClick={() => { setMode("read"); setActiveLine(1); }}>Show gutter</button>
                <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "ai-assistant" })}><Wand2 size={12} /> Ask AI</button>
                <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "ai-explain", line: activeLine ?? 1 })}><Sparkles size={12} /> Explain</button>
                <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "profiler" })}><Gauge size={12} /> Profile</button>
              </span>
            </div>
            <CodeSurface
              code={code}
              mode={mode}
              prefs={prefs}
              breakpoints={breakpoints}
              errorLines={errorLines}
              hotLines={hotLines}
              activeLine={activeLine}
              onChange={onChangeCode}
              onToggleBreakpoint={onToggleBreakpoint}
              onLineFocus={setActiveLine}
            />
            <div className="d-flex flex-wrap align-items-center gap-2 px-2 py-2 border-top">
              <span className="d-flex align-items-center gap-2 flex-grow-1">
                <input
                  className="dx-input flex-grow-1"
                  placeholder="Ask for a change — “add a 2-step martingale guard after 3 losses”"
                  value={aiPrompt}
                  aria-label="Inline AI prompt"
                  onChange={(e) => setAiPrompt(e.target.value)}
                />
                <button
                  type="button"
                  className="dx-btn dx-btn-sm dx-btn-primary"
                  onClick={() => { setAiPrompt(""); setOverlay({ kind: "ai-assistant" }); }}
                >
                  <Wand2 size={12} /> Suggest
                </button>
              </span>
              <span className="dx-help">Tip: type <span className="dx-code-inline">//ai</span> on any line to summon inline suggestions.</span>
            </div>
          </div>

          <div className="dx-card">
            <div className="dx-card-head d-flex flex-wrap align-items-center gap-2">
              <XCircle size={14} />
              <span className="dx-card-title">Validator &amp; lints</span>
              <Chip tone={analysis.blocked ? "down" : errorLines.length ? "warn" : "up"}>{analysis.issues.length} findings</Chip>
              <span className="ms-auto d-flex gap-2">
                <button type="button" className="dx-btn dx-btn-sm" onClick={() => { setMode("read"); setActiveLine(analysis.issues[0]?.line ?? 1); }}>Jump to first</button>
                <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "test-suite" })}>Run test suite</button>
              </span>
            </div>
            <div className="dx-card-body d-grid gap-2">
              {analysis.issues.length ? (
                analysis.issues.slice(0, 6).map((issue) => (
                  <div key={issue.id} className={`dx-issue dx-issue-${issue.severity}`}>
                    <span className="d-flex align-items-center gap-2">
                      {issue.severity === "error" ? <XCircle size={13} /> : issue.severity === "warning" ? <Ban size={13} /> : <Eye size={13} />}
                      <span className="font-display">line {issue.line}:{issue.column}</span>
                      <Chip tone={issue.severity === "error" ? "down" : issue.severity === "warning" ? "warn" : "info"}>{issue.rule}</Chip>
                      <span className="dx-help ms-auto">{issue.message}</span>
                    </span>
                    <span className="dx-help">{issue.suggestion}</span>
                    <span className="d-flex flex-wrap gap-2">
                      <button type="button" className="dx-btn dx-btn-sm" onClick={() => { setMode("read"); setActiveLine(issue.line); }}>Go to line</button>
                      <button
                        type="button"
                        className="dx-btn dx-btn-sm"
                        onClick={() =>
                          issue.fixId?.startsWith("stub:")
                            ? setOverlay({ kind: "module-stub", module: issue.fixId.slice(5) })
                            : setOverlay({ kind: "ai-explain", line: issue.line })
                        }
                      >
                        {issue.fixId?.startsWith("stub:") ? "Create module stub" : "Explain the fix"}
                      </button>
                      <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => { onChangeCode(`${code}\n${issue.snippet}`); setMode("edit"); }}>
                        Insert suggested snippet
                      </button>
                    </span>
                  </div>
                ))
              ) : (
                <EmptyState icon={<CheckCircle2 size={18} />} title="No findings" message="The validator, linter and forbidden-API scanner are all clear on this revision." />
              )}
              {analysis.issues.length > 6 ? (
                <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "save-blocked" })}>Show all {analysis.issues.length} findings</button>
              ) : null}
            </div>
          </div>

          {/* sandbox results ------------------------------------------------- */}
          <div className="dx-card">
            <div className="dx-card-head d-flex flex-wrap align-items-center gap-2">
              <Play size={14} />
              <span className="dx-card-title">Sandbox results</span>
              {runProgress !== null ? (
                <span className="d-flex align-items-center gap-2" style={{ minWidth: 160 }}>
                  <Progress value={runProgress} />
                  <span className="dx-help font-display">{runProgress}%</span>
                </span>
              ) : run ? (
                <Chip tone={run.status === "ok" ? "up" : "down"}>{run.status === "ok" ? `passed in ${run.durationMs} ms` : `${run.status} at line ${run.timeoutAtLine ?? "?"}`}</Chip>
              ) : (
                <Chip tone="muted">no run yet</Chip>
              )}
              <span className="ms-auto d-flex flex-wrap gap-2">
                <button type="button" className="dx-btn dx-btn-sm" onClick={startInlineRun} disabled={runProgress !== null}><Play size={12} /> Run 600 ticks</button>
                <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "test-run" })}>Guided test</button>
                <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "script-backtest" })}><Gauge size={12} /> Backtest</button>
                <button type="button" className="dx-btn dx-btn-sm" onClick={onExportRun} disabled={!run}><Download size={12} /> Export log</button>
                <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "console-full" })}><Terminal size={12} /> Full console</button>
              </span>
            </div>
            <div className="dx-card-body d-grid gap-3">
              {run ? (
                <>
                  <div className="row g-2">
                    <div className="col-6 col-md-3"><StatCard label="Trades" value={run.trades.length} footnote={`${run.ticks} ticks simulated`} /></div>
                    <div className="col-6 col-md-3"><StatCard label="Win rate" value={run.winRate} decimals={1} suffix="%" trendDir={run.winRate >= 50 ? "up" : "down"} trend={`${(run.winRate - 50).toFixed(1)} pp vs breakeven`} /></div>
                    <div className="col-6 col-md-3"><StatCard label="Net P&L" value={run.pnl} prefix="$" decimals={2} trendDir={run.pnl >= 0 ? "up" : "down"} trend={run.pnl >= 0 ? "+3.1% vs library avg" : "\u22123.1% vs library avg"} /></div>
                    <div className="col-6 col-md-3"><StatCard label="Peak heap" value={run.peakMemoryMb} suffix=" MB" footnote={`limit 128 MB · max drawdown ${usd(run.maxDrawdown, 2)}`} /></div>
                  </div>
                  <LineChart data={run.equity} height={150} tone={run.pnl >= 0 ? "accent" : "down"} showGrid ariaLabel="Sandbox equity curve" yFormat={(v) => usd(v, 0)} />
                  <div className="d-flex flex-wrap align-items-center gap-3">
                    <span className="d-flex align-items-center gap-2">
                      <span className="dx-help">Heap</span>
                      <Meter label="Sandbox heap" value={(run.peakMemoryMb / 128) * 100} display={`${run.peakMemoryMb} / 128 MB peak`} />
                      <span className="dx-help font-display">{run.peakMemoryMb} / 128 MB</span>
                    </span>
                    <span className="dx-help">
                      {errorLines.length} error lines · {warningLines.length} warnings · {hotLines.length} hotspots · {failing} failing test(s)
                    </span>
                  </div>
                  <div className="dx-table-wrap">
                    <table className="dx-table">
                      <caption className="visually-hidden">Last settlements from the sandbox run</caption>
                      <thead>
                        <tr>
                          <th scope="col">#</th>
                          <th scope="col">Contract</th>
                          <th scope="col" className="text-end">Stake</th>
                          <th scope="col" className="text-end">Entry → exit</th>
                          <th scope="col" className="text-end">Profit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {run.trades.slice(0, 5).map((t) => (
                          <tr key={t.seq}>
                            <td className="font-display">{t.seq}</td>
                            <td>{t.contract}</td>
                            <td className="text-end font-display">{usd(t.stake, 2)}</td>
                            <td className="text-end font-display">{fmtPrice(t.entrySpot)} → {fmtPrice(t.exitSpot)}</td>
                            <td className={`text-end font-display ${t.profit >= 0 ? "dx-up" : "dx-down"}`}>{usd(t.profit, 2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <span className="dx-help">
                    Sandbox tape (last 3 lines) — the full tape streams in the right-hand console.
                    {run.logLines.slice(-3).map((l, i) => <span key={`${i}-${l.slice(0, 12)}`} className="dx-code-inline d-block">{l}</span>)}
                  </span>
                </>
              ) : (
                <EmptyState
                  icon={<Play size={18} />}
                  title="No run on this revision yet"
                  message="Run the script against 600 synthetic ticks — the sandbox enforces 100 ms per tick, 128 MB heap and one trade per tick."
                  action={<button type="button" className="dx-btn dx-btn-primary" onClick={startInlineRun}><Play size={13} /> Run the sandbox</button>}
                />
              )}
            </div>
          </div>

          {/* version control ------------------------------------------------- */}
          <div className="dx-card">
            <div className="dx-card-head d-flex flex-wrap align-items-center gap-2">
              <History size={14} />
              <span className="dx-card-title">Version control</span>
              <Chip tone="info">{versions.filter((v) => v.scriptId === script.id).length} commits</Chip>
              <span className="dx-help">{SCRIPT_BRANCHES.filter((b) => b.scriptId === script.id).length} branch(es) · {deps.length} dependency(ies)</span>
              <span className="ms-auto d-flex flex-wrap gap-2">
                <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "versions" })}><History size={12} /> All versions</button>
                <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "branches" })}><GitBranch size={12} /> Branches</button>
                <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "dependencies" })}><Layers size={12} /> Dependencies</button>
                <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "discard-changes" })} disabled={!dirty}><RotateCcw size={12} /> Discard</button>
              </span>
            </div>
            <div className="dx-card-body d-grid gap-2">
              {scriptVersions.length ? (
                scriptVersions.map((v) => (
                  <div key={v.id} className="dx-version-row d-flex flex-wrap align-items-center gap-2">
                    <span className="font-display fw-semibold">{v.version}</span>
                    <Chip tone={v.status === "current" ? "up" : v.status === "rolled-back" ? "warn" : "muted"}>{v.status}</Chip>
                    <span className="dx-help">{v.message}</span>
                    <span className="dx-help ms-auto font-display">
                      {v.hash} · +{v.added}/−{v.removed} · {v.tests} tests {v.checks}
                    </span>
                    <span className="d-flex gap-2">
                      <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "version-diff", a: v.id, b: scriptVersions[0].id })}>Diff</button>
                      <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "rollback", id: v.id })} disabled={v.status === "current"}>Rollback</button>
                    </span>
                  </div>
                ))
              ) : (
                <EmptyState icon={<History size={18} />} title="No local commits yet" message="Save the working copy to start a version history for this script." action={<button type="button" className="dx-btn dx-btn-primary" onClick={() => onSave({})} disabled={analysis.blocked}>Save now</button>} />
              )}
              <div className="d-flex flex-wrap align-items-center gap-2">
                <span className="dx-help">Working copy vs {meta?.version ?? "v1"}: {dirty ? `${code.split("\n").length - applied.split("\n").length >= 0 ? "+" : ""}${code.split("\n").length - applied.split("\n").length} lines` : "identical"}</span>
                <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "version-diff", a: scriptVersions[0]?.id ?? "sv_01", b: "working" })}>Diff working copy</button>
                <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "branch-create" })}><GitBranch size={12} /> New branch</button>
                {SCRIPT_BRANCHES.filter((b) => b.scriptId === script.id).slice(0, 1).map((b) => (
                  <button key={b.id} type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "branch-merge", id: b.id })}><GitBranch size={12} /> Merge {b.name}</button>
                ))}
              </div>
              {profileTop.length ? (
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <span className="dx-help">Hotspots:</span>
                  {profileTop.map((f) => (
                    <button key={f.id} type="button" className="dx-btn dx-btn-sm" onClick={() => { setActiveLine(f.line); setMode("read"); }}>
                      {f.fn} line {f.line} · {f.avgMs.toFixed(2)} ms/call
                    </button>
                  ))}
                  <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setOverlay({ kind: "profiler" })}>Open profiler</button>
                </div>
              ) : null}
            </div>
          </div>

          {/* runs + tests ---------------------------------------------------- */}
          <div className="dx-card">
            <div className="dx-card-head d-flex flex-wrap align-items-center gap-2">
              <CheckCircle2 size={14} />
              <span className="dx-card-title">Runs &amp; test suite</span>
              <Chip tone={failing ? "down" : "up"}>{failing ? `${failing} failing` : "all green"}</Chip>
              <span className="ms-auto d-flex flex-wrap gap-2">
                <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "test-suite" })}>Run all tests</button>
                <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "test-case", id: SCRIPT_TESTS.find((t) => t.scriptId === script.id)?.id ?? SCRIPT_TESTS[0].id })}>Scenario detail</button>
                <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => goScript(script.id)}>Refresh</button>
              </span>
            </div>
            <Tabs
              tabs={[
                { id: "tsuite", label: "Tests", icon: <CheckCircle2 size={13} />, badge: SCRIPT_TESTS.filter((t) => t.scriptId === script.id).length },
                { id: "truns", label: "My runs", icon: <Play size={13} />, badge: myRuns.length },
              ]}
              active={filter === "tsuite" || filter === "truns" ? filter : "tsuite"}
              onChange={setFilter}
            />
            <div className="dx-card-body">
              {filter === "truns" ? (
                myRuns.length ? (
                  <RunsTable runs={myRuns} ariaLabel={`Runs for ${script.name}`} pageSize={5} onRowClick={(id) => setOverlay({ kind: "run-detail", id })} />
                ) : (
                  <EmptyState icon={<Play size={18} />} title="No recorded runs" message="Runs appear here after you press Test or a bot executes the script." action={<button type="button" className="dx-btn dx-btn-primary" onClick={startInlineRun}>Start a run</button>} />
                )
              ) : SCRIPT_TESTS.filter((t) => t.scriptId === script.id).length ? (
                <div className="table-responsive">
                  <table className="dx-table">
                    <caption className="visually-hidden">Declared test scenarios for this script</caption>
                    <thead>
                      <tr>
                        <th scope="col">Scenario</th>
                        <th scope="col">Layer</th>
                        <th scope="col">Assertion</th>
                        <th scope="col" className="text-end">Line</th>
                        <th scope="col" className="text-end">Status</th>
                        <th scope="col" />
                      </tr>
                    </thead>
                    <tbody>
                      {SCRIPT_TESTS.filter((t) => t.scriptId === script.id).map((t) => (
                        <tr key={t.id}>
                          <td>{t.scenario}</td>
                          <td><Chip tone="muted">{t.layer}</Chip></td>
                          <td className="dx-help">{t.assertion}</td>
                          <td className="text-end font-display">{t.line}</td>
                          <td className="text-end"><Chip tone={t.status === "pass" ? "up" : t.status === "fail" ? "down" : "warn"}>{t.status}</Chip></td>
                          <td className="text-end">
                            <button type="button" className="dx-btn dx-btn-sm" onClick={() => setOverlay({ kind: "test-case", id: t.id })}>Open</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  icon={<CheckCircle2 size={18} />}
                  title="No test scenarios declared"
                  message="Add // @test { scenario: '5 wins in a row' } above a function to register a scenario, then run the suite on every save."
                  action={<button type="button" className="dx-btn dx-btn-primary" onClick={() => onChangeCode(`${code}\n// @test { scenario: 'flat market, no trade after 3 attempts' }\n`)}>Insert a @test annotation</button>}
                />
              )}
            </div>
          </div>
        </div>

        {/* right sidebar ----------------------------------------------------- */}
        <div className="col-12 col-xl-4">
          <div className="dx-card">
            <div className="dx-card-head">
              <BookOpen size={14} />
              <span className="dx-card-title">Script workspace</span>
              <button type="button" className="dx-btn dx-btn-sm ms-auto" onClick={() => setOverlay({ kind: "api-reference" })}>Full reference</button>
            </div>
            <div className="dx-card-body">
              <EditorSidebar
                script={script}
                apiQuery={apiQuery}
                setApiQuery={setApiQuery}
                apiGroup={apiGroup}
                setApiGroup={setApiGroup}
                snippetQuery={snippetQuery}
                setSnippetQuery={setSnippetQuery}
                onPickApi={(name) => setOverlay({ kind: "api-reference" })}
                onPickSnippet={(snippet) => { onChangeCode(`${code}\n${snippet}`); }}
                breakpoints={breakpoints}
                consoleLines={consoleLines}
                consolePaused={consolePaused}
                setConsolePaused={setConsolePaused}
                onInsertParam={() => setOverlay({ kind: "params" })}
                onOpenDebugger={() => setOverlay({ kind: "debugger" })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* status bar ---------------------------------------------------------- */}
      <div className="dx-statusbar d-flex flex-wrap align-items-center gap-3">
        <span className="dx-help">Ln <span className="font-display">{activeLine ?? 1}</span>, Col <span className="font-display">1</span></span>
        <span className="dx-help">Spaces: 2 · UTF-8 · {script.language}</span>
        <span className="dx-help">Branch <span className="font-display">{meta?.branch ?? "main"}</span> · {meta?.version ?? "v1"}</span>
        <span className="dx-help">Coverage <span className="font-display">{meta?.coveragePct ?? 0}%</span> · complexity <span className="font-display">{meta?.complexity ?? 0}</span></span>
        <span className="dx-help">Engine slots free: <span className="font-display">{freeEngineSlots().length} / 12</span></span>
        <span className="dx-help">
          Autosave {dirty ? `in ${Math.max(0, Math.round(prefs.autosaveMs / 1000))}s` : "idle"} · last commit {savedAgo}s ago
        </span>
        <span className="dx-help ms-auto">
          Sandbox: {meta?.sandboxTimeoutMs ?? 100} ms/tick · {meta?.memoryLimitMb ?? 128} MB · no fs/network/process
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// ROUTE ENTRY POINTS
// =============================================================================
export function ScriptsListPage() {
  return (
    <AppShell title="Script Studio" subtitle="Write, sandbox-test and ship DerivX strategy scripts. Every byte below is mock data.">
      <ScriptStudioInner />
    </AppShell>
  );
}

export function ScriptDetailPage({ scriptId }: { scriptId: string }) {
  const named = scriptById(scriptId);
  return (
    <AppShell
      title={named ? `${named.name} · Script Studio` : "Script Studio"}
      subtitle="Script editor, sandbox worker and CI suite — mock data only, no backend calls."
    >
      <ScriptStudioInner scriptId={scriptId} />
    </AppShell>
  );
}

export default ScriptsListPage;
