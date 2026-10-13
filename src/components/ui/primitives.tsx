// =============================================================================
// primitives.tsx — the shared UI kit (docs/MASTER_THEME.md §10-§13)
// Every page composes these. Never re-implement them inside a route.
// =============================================================================
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Copy,
  Inbox,
  Search,
  Moon,
  Sun,
  X,
} from "lucide-react";

// -----------------------------------------------------------------------------
// hooks
// -----------------------------------------------------------------------------
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

// -----------------------------------------------------------------------------
// Theme — light is the DEFAULT. The palette lives in tokens.scss (`:root` = light,
// `[data-bs-theme="dark"]` = dark). A pre-paint script in __root.tsx restores a
// stored dark preference before first paint; React never renders the attribute,
// so hydration cannot clash with it.
// -----------------------------------------------------------------------------
export type ThemeName = "light" | "dark";
export const THEME_STORAGE_KEY = "dx-theme";

export function readTheme(): ThemeName {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-bs-theme") === "dark" ? "dark" : "light";
}

export function applyTheme(theme: ThemeName, persist = true): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") root.setAttribute("data-bs-theme", "dark");
  else root.removeAttribute("data-bs-theme");
  root.setAttribute("data-dx-theme", theme);
  if (!persist) return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* storage blocked (private mode) — the theme still applies for this session */
  }
}

export function useTheme(): [ThemeName, (theme: ThemeName) => void] {
  // SSR and the first client render are always light; the effect then adopts
  // whatever the pre-paint script restored from storage.
  const [theme, setTheme] = useState<ThemeName>("light");
  useEffect(() => setTheme(readTheme()), []);
  const update = useCallback(
    (next: ThemeName) => {
      applyTheme(next);
      setTheme(next);
    },
    [],
  );
  return [theme, update];
}

/**
 * Light/dark switch. Rendered in the marketing nav and footer; the FOUC-free
 * restore path lives in __root.tsx, persistence in localStorage("dx-theme").
 */
export function ThemeToggle({
  className = "",
  labelled = false,
}: {
  className?: string;
  labelled?: boolean;
}) {
  const [theme, setTheme] = useTheme();
  const next: ThemeName = theme === "dark" ? "light" : "dark";
  const Icon = theme === "dark" ? Sun : Moon;
  return (
    <button
      type="button"
      className={`dx-btn dx-btn-sm dx-btn-ghost ${className}`.trim()}
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      data-dx-theme-state={theme}
    >
      <Icon size={15} />
      {labelled ? <span>Switch to {next} theme</span> : null}
    </button>
  );
}

/** Deterministic-ish PRNG for simulated feeds (client-only usage). */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Interval that starts only on the client (keeps SSR markup deterministic). */
export function useInterval(callback: () => void, ms: number | null) {
  const ref = useRef(callback);
  ref.current = callback;
  useEffect(() => {
    if (ms === null) return;
    const id = window.setInterval(() => ref.current(), ms);
    return () => window.clearInterval(id);
  }, [ms]);
}

export function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}

export function useOnEscape(handler: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handler();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, handler]);
}

/** Simple scroll-reveal observer (honours prefers-reduced-motion via CSS). */
/**
 * Visibility hook used by Reveal/CountUp.
 * Robustness contract: content must NEVER stay hidden. If the observer is
 * missing, throws, or simply never reports (clipped/zero-height containers, a
 * scaled preview iframe, reduced-motion browsers), a 1.6 s fallback flips the
 * flag so the section/stat always becomes visible.
 */
export function useInView<T extends HTMLElement>(once = true, fallbackMs = 1600) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    let io: IntersectionObserver | null = null;
    const fallback = window.setTimeout(() => setInView(true), fallbackMs);

    if (!node || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return () => window.clearTimeout(fallback);
    }

    try {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setInView(true);
              window.clearTimeout(fallback);
              if (once) io?.unobserve(entry.target);
            } else if (!once) {
              setInView(false);
            }
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
      );
      io.observe(node);
    } catch {
      setInView(true);
    }

    return () => {
      window.clearTimeout(fallback);
      io?.disconnect();
    };
  }, [once, fallbackMs]);

  return { ref, inView };
}

// -----------------------------------------------------------------------------
// Reveal / SectionHead / typography helpers
// -----------------------------------------------------------------------------
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li";
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <Tag
      ref={ref as never}
      className={`dx-reveal ${inView ? "is-visible" : ""} ${className}`.trim()}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

export function SectionHead({
  eyebrow,
  title,
  lead,
  actions,
  center = false,
  id,
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  center?: boolean;
  id?: string;
}) {
  return (
    <div className={`dx-section-head ${center ? "justify-content-center text-center" : ""}`}>
      <div className={center ? "mx-auto" : ""} style={center ? { maxWidth: 720 } : undefined}>
        {eyebrow ? <div className="dx-eyebrow mb-2">{eyebrow}</div> : null}
        <h2 className="dx-h-section" id={id}>
          {title}
        </h2>
        {lead ? <p className="dx-lead mt-3">{lead}</p> : null}
      </div>
      {actions ? <div className="d-flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

// -----------------------------------------------------------------------------
// CountUp / StatCard / Sparkline / Progress / Meter
// -----------------------------------------------------------------------------
export function CountUp({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 900,
  className = "",
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  // Starts at the FINAL value so SSR output and the first paint are correct
  // (never "0 traders" / "0 ms"). The roll-up runs client-side once the stat
  // scrolls into view, and only ever replaces the final value with itself.
  const [display, setDisplay] = useState(value);
  const animatedFor = useRef<number | null>(null);
  const { ref, inView } = useInView<HTMLSpanElement>();

  useEffect(() => {
    if (!inView || reduced) return;
    if (animatedFor.current === value) return;
    animatedFor.current = value;
    let raf = 0;
    const start = performance.now();
    setDisplay(0);
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setDisplay(value);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      setDisplay(value);
    };
  }, [inView, value, duration, reduced]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

export function Sparkline({
  data,
  tone = "accent",
  height = 40,
  width = 160,
  className = "",
  ariaLabel,
}: {
  data: number[];
  tone?: "accent" | "up" | "down" | "info";
  height?: number;
  width?: number;
  className?: string;
  ariaLabel?: string;
}) {
  const { line, area } = useMemo(() => {
    if (!data.length) return { line: "", area: "" };
    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = max - min || 1;
    const stepX = width / Math.max(1, data.length - 1);
    const pts = data.map((d, i) => {
      const x = i * stepX;
      const y = height - 2 - ((d - min) / span) * (height - 6);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    return {
      line: `M${pts.join(" L")}`,
      area: `M0,${height} L${pts.join(" L")} L${width},${height} Z`,
    };
  }, [data, height, width]);

  const stroke =
    tone === "down" ? "var(--dx-down)" : tone === "info" ? "var(--dx-info)" : tone === "up" ? "var(--dx-up)" : "var(--dx-accent)";
  const gid = `spark-${tone}-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <svg
      className={`dx-spark ${className}`}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ height, width: "100%" }}
      role="img"
      aria-label={ariaLabel ?? "Trend sparkline"}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {area ? <path d={area} fill={`url(#${gid})`} /> : null}
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function Progress({ value, max = 100, tone = "accent" }: { value: number; max?: number; tone?: "accent" | "down" }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="dx-progress" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`dx-progress-bar ${tone === "down" ? "dx-progress-bar-down" : ""}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Meter({ label, value, display }: { label: string; value: number; display?: string }) {
  return (
    <div className="dx-meter">
      <div className="dx-meter-head">
        <span>{label}</span>
        <span className="dx-meter-val">{display ?? `${value}%`}</span>
      </div>
      <div className="dx-meter-track">
        <div className="dx-meter-bar" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  trend,
  trendDir = "up",
  spark,
  live = false,
  action,
  footnote,
}: {
  label: string;
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  trend?: string;
  trendDir?: "up" | "down" | "flat";
  spark?: number[];
  live?: boolean;
  action?: ReactNode;
  footnote?: string;
}) {
  return (
    <div className="dx-card dx-card-pad">
      <div className="dx-kpi">
        <div className="dx-kpi-top">
          <span className="dx-kpi-label">{label}</span>
          {live ? <span className="dx-pulse" aria-label="live" /> : null}
        </div>
        <div className="dx-kpi-value">
          <CountUp value={value} decimals={decimals} prefix={prefix} suffix={suffix} />
        </div>
        {trend ? (
          <div className={`dx-kpi-trend ${trendDir === "up" ? "is-up" : trendDir === "down" ? "is-down" : ""}`}>
            {trendDir === "up" ? <ArrowUpRight size={13} /> : trendDir === "down" ? <ArrowDownRight size={13} /> : null}
            <span>{trend}</span>
          </div>
        ) : null}
        {spark ? <Sparkline data={spark} tone={trendDir === "down" ? "down" : "accent"} height={34} ariaLabel={`${label} trend`} /> : null}
        {footnote ? <div className="dx-help">{footnote}</div> : null}
        {action ? <div className="dx-kpi-foot">{action}</div> : null}
      </div>
    </div>
  );
}

export function Chip({
  children,
  tone = "muted",
  pulse = false,
  title,
}: {
  children: ReactNode;
  tone?: "muted" | "up" | "down" | "warn" | "info" | "accent";
  pulse?: boolean;
  title?: string;
}) {
  return (
    <span className={`dx-chip dx-chip-${tone}`} title={title}>
      {pulse ? <span className="dx-pulse" /> : null}
      {children}
    </span>
  );
}

export function Avatar({ name, size = "md", tone = "blue" }: { name: string; size?: "sm" | "md" | "lg"; tone?: "blue" | "teal" }) {
  const initials = name
    .replace(/[^A-Za-z ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <span className={`dx-avatar ${size === "lg" ? "dx-avatar-lg" : ""} ${tone === "teal" ? "dx-avatar-teal" : ""}`} aria-hidden="true">
      {initials || "DX"}
    </span>
  );
}

export function PriceFlash({ value, dir, className = "" }: { value: string; dir: "up" | "down" | "flat"; className?: string }) {
  const [flashKey, setFlashKey] = useState(0);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setFlashKey((k) => k + 1);
    }
  }, [value]);
  return (
    <span
      key={flashKey}
      className={`font-display ${dir === "up" ? "dx-flash-up dx-up" : dir === "down" ? "dx-flash-down dx-down" : ""} ${className}`.trim()}
    >
      {value}
    </span>
  );
}

export function EmptyState({
  title,
  message,
  action,
  icon,
}: {
  title: string;
  message: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="dx-empty">
      <span className="dx-empty-ico">{icon ?? <Inbox size={22} />}</span>
      <div>
        <h4 className="dx-h-card">{title}</h4>
        <p className="dx-help mb-0 mt-1">{message}</p>
      </div>
      {action}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Dialog
// -----------------------------------------------------------------------------
export type DialogSize = "sm" | "md" | "lg" | "xl" | "full";

export function Dialog({
  open,
  onClose,
  title,
  subtitle,
  size = "md",
  footer,
  children,
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  size?: DialogSize;
  footer?: ReactNode;
  children: ReactNode;
  labelledBy?: string;
}) {
  const mounted = useMounted();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();

  useLockBodyScroll(open);
  useOnEscape(onClose, open);

  useEffect(() => {
    if (!open || !panelRef.current) return;
    const node = panelRef.current.querySelector<HTMLElement>(
      "input:not([type=hidden]), select, textarea, button:not([data-autofocus-skip])",
    );
    node?.focus();
  }, [open]);

  if (!mounted || !open) return null;

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return createPortal(
    <div className="dx-overlay" onMouseDown={onClose} role="presentation">
      <div
        ref={panelRef}
        className={`dx-dialog dx-dialog-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy ?? titleId}
        onMouseDown={stop}
      >
        <div className="dx-dialog-head">
          <div>
            <h3 className="dx-dialog-title" id={labelledBy ?? titleId}>
              {title}
            </h3>
            {subtitle ? <p className="dx-dialog-sub">{subtitle}</p> : null}
          </div>
          <button type="button" className="dx-x-btn" onClick={onClose} aria-label="Close dialog">
            <X size={16} />
          </button>
        </div>
        <div className="dx-dialog-body">{children}</div>
        {footer ? <div className="dx-dialog-foot">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

// -----------------------------------------------------------------------------
// Drawer (offcanvas)
// -----------------------------------------------------------------------------
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  side = "end",
  wide = false,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  side?: "start" | "end";
  wide?: boolean;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const mounted = useMounted();
  useLockBodyScroll(open);
  useOnEscape(onClose, open);
  if (!mounted || !open) return null;

  return createPortal(
    <>
      <div className="dx-drawer-overlay" onMouseDown={onClose} role="presentation" />
      <aside
        className={`dx-drawer dx-drawer-${side} ${wide ? "dx-drawer-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : "Detail panel"}
      >
        <div className="dx-dialog-head">
          <div>
            <h3 className="dx-dialog-title">{title}</h3>
            {subtitle ? <p className="dx-dialog-sub">{subtitle}</p> : null}
          </div>
          <button type="button" className="dx-x-btn" onClick={onClose} aria-label="Close panel">
            <X size={16} />
          </button>
        </div>
        <div className="dx-dialog-body">{children}</div>
        {footer ? <div className="dx-dialog-foot">{footer}</div> : null}
      </aside>
    </>,
    document.body,
  );
}

// -----------------------------------------------------------------------------
// Stepper / Tabs / MiniTabs
// -----------------------------------------------------------------------------
export interface StepDef {
  id: string;
  label: string;
}

export function Stepper({
  steps,
  active,
  onStepClick,
  className = "",
}: {
  steps: StepDef[];
  active: number;
  onStepClick?: (index: number) => void;
  className?: string;
}) {
  return (
    <div className={`dx-stepper ${className}`} role="list" aria-label="Progress">
      {steps.map((step, i) => {
        const state = i === active ? "dx-step-active" : i < active ? "dx-step-done" : "";
        return (
          <div key={step.id} className="d-flex align-items-center gap-2" role="listitem">
            <button
              type="button"
              className={`dx-step ${state}`}
              onClick={() => onStepClick?.(i)}
              disabled={!onStepClick || i > active}
              aria-current={i === active ? "step" : undefined}
              aria-label={`Step ${i + 1}: ${step.label}`}
            >
              <span className="dx-step-dot">{i < active ? <Check size={13} /> : i + 1}</span>
              <span className="dx-step-label">{step.label}</span>
            </button>
            {i < steps.length - 1 ? <span className="dx-step-line" aria-hidden="true" /> : null}
          </div>
        );
      })}
    </div>
  );
}

export function Tabs({
  tabs,
  active,
  onChange,
  className = "",
}: {
  tabs: { id: string; label: string; icon?: ReactNode; badge?: number }[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={`dx-tabs ${className}`} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={active === t.id}
          className={`dx-tab ${active === t.id ? "is-active" : ""}`}
          onClick={() => onChange(t.id)}
        >
          {t.icon}
          {t.label}
          {typeof t.badge === "number" ? <span className="dx-badge-count">{t.badge}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function MiniTabs({
  options,
  value,
  onChange,
  className = "",
  ariaLabel = "Period",
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div className={`dx-minitabs ${className}`} role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          className={`dx-minitab ${value === o.id ? "is-active" : ""}`}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Dropdown / Toggle / Search / FilterChips
// -----------------------------------------------------------------------------
export interface DropdownItem {
  id: string;
  label: string;
  icon?: ReactNode;
  hint?: string;
  danger?: boolean;
  active?: boolean;
  onSelect?: () => void;
  keepOpen?: boolean;
}

export type DropdownEntry = DropdownItem | { type: "divider" } | { type: "label"; label?: string };

export function Dropdown({
  trigger,
  items,
  label,
  align = "end",
  className = "",
}: {
  trigger: ReactNode;
  items: DropdownEntry[];
  label?: string;
  align?: "start" | "end";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`dx-dd ${className}`} ref={wrapRef}>
      <button
        type="button"
        className="dx-btn dx-btn-sm"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {trigger}
        <ChevronDown size={14} />
      </button>
      {open ? (
        <div className={`dx-dd-menu dx-dd-${align}`} role="menu" aria-label={label ?? "Menu"}>
          {items.map((item, i) => {
            if ("type" in item) {
              if (item.type === "divider") return <div key={`d-${i}`} className="dx-dd-divider" role="separator" />;
              return (
                <div key={`l-${i}`} className="dx-dd-label">
                  {item.label}
                </div>
              );
            }
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                className={`dx-dd-item ${item.active ? "is-active" : ""} ${item.danger ? "is-danger" : ""}`}
                onClick={() => {
                  item.onSelect?.();
                  if (!item.keepOpen) setOpen(false);
                }}
              >
                {item.icon}
                <span className="flex-grow-1">{item.label}</span>
                {item.hint ? <span className="dx-help">{item.hint}</span> : null}
                {item.active ? <Check size={13} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="dx-switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="dx-switch-track" aria-hidden="true" />
      <span>
        <span className="dx-switch-label d-block">{label}</span>
        {hint ? <span className="dx-help">{hint}</span> : null}
      </span>
    </label>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`dx-search ${className}`}>
      <span className="dx-search-ico">
        <Search size={14} />
      </span>
      <input
        className="dx-input"
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {value ? (
        <button
          type="button"
          className="dx-x-btn"
          style={{ position: "absolute", right: 4, width: 26, height: 26 }}
          onClick={() => onChange("")}
          aria-label="Clear search"
        >
          <X size={13} />
        </button>
      ) : null}
    </div>
  );
}

export function FilterChips({
  options,
  value,
  onChange,
  allLabel = "All",
  includeAll = true,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  allLabel?: string;
  includeAll?: boolean;
}) {
  return (
    <div className="dx-filter-bar" role="group" aria-label="Filters">
      {includeAll ? (
        <button
          type="button"
          className={`dx-filter-chip ${value === "all" ? "is-active" : ""}`}
          aria-pressed={value === "all"}
          onClick={() => onChange("all")}
        >
          {allLabel}
        </button>
      ) : null}
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className={`dx-filter-chip ${value === o.id ? "is-active" : ""}`}
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Pagination
// -----------------------------------------------------------------------------
export function Pagination({
  page,
  pageCount,
  onPageChange,
  total,
  pageSize,
  onPageSizeChange,
  label = "rows",
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  total: number;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  label?: string;
}) {
  const from = total === 0 ? 0 : (page - 1) * (pageSize ?? 10) + 1;
  const to = pageSize ? Math.min(total, page * pageSize) : total;
  const pages = useMemo(() => {
    const out: (number | "gap")[] = [];
    for (let i = 1; i <= pageCount; i++) {
      if (i === 1 || i === pageCount || Math.abs(i - page) <= 1) out.push(i);
      else if (out[out.length - 1] !== "gap") out.push("gap");
    }
    return out;
  }, [page, pageCount]);

  return (
    <div className="dx-pager">
      <div className="dx-help">
        {from}–{to} of <span className="font-display">{total}</span> {label}
      </div>
      <div className="d-flex align-items-center gap-2 flex-wrap">
        {onPageSizeChange ? (
          <select
            className="dx-select dx-input-num"
            style={{ width: 84, minHeight: 34 }}
            value={pageSize}
            aria-label="Rows per page"
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {[5, 10, 25].map((s) => (
              <option key={s} value={s}>
                {s} / pg
              </option>
            ))}
          </select>
        ) : null}
        <button
          type="button"
          className="dx-page-btn"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label="Previous page"
          data-autofocus-skip
        >
          <ChevronLeft size={14} />
        </button>
        {pages.map((p, i) =>
          p === "gap" ? (
            <span key={`gap-${i}`} className="dx-help px-1">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={`dx-page-btn ${p === page ? "is-active" : ""}`}
              onClick={() => onPageChange(p)}
              aria-label={`Page ${p}`}
              aria-current={p === page ? "page" : undefined}
              data-autofocus-skip
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          className="dx-page-btn"
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
          disabled={page >= pageCount}
          aria-label="Next page"
          data-autofocus-skip
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Copy / Code / Field helpers
// -----------------------------------------------------------------------------
export function CopyButton({ text, label = "Copy", small = true }: { text: string; label?: string; small?: boolean }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(id);
  }, [copied]);
  return (
    <button
      type="button"
      className={`dx-btn ${small ? "dx-btn-sm" : ""}`}
      onClick={() => {
        void navigator.clipboard?.writeText(text).catch(() => undefined);
        setCopied(true);
      }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? "Copied" : label}
    </button>
  );
}

export function CodeBlock({ code, maxHeight = 320 }: { code: string; maxHeight?: number }) {
  return (
    <pre className="dx-code dx-scroll-y" style={{ maxHeight }}>
      <code>{code}</code>
    </pre>
  );
}

export function Field({
  label,
  required,
  error,
  help,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  help?: string;
  children: ReactNode;
}) {
  return (
    <div className="dx-field">
      <label className="dx-label">
        {label} {required ? <span className="dx-req">*</span> : null}
      </label>
      {children}
      {error ? <span className="dx-error">{error}</span> : null}
      {!error && help ? <span className="dx-help">{help}</span> : null}
    </div>
  );
}

export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warn" | "danger" | "up";
  title?: string;
  children?: ReactNode;
}) {
  const color =
    tone === "danger" ? "var(--dx-down)" : tone === "warn" ? "var(--dx-warn)" : tone === "up" ? "var(--dx-up)" : "var(--dx-info)";
  return (
    <div
      className="dx-card-inset d-flex gap-3 align-items-start"
      style={{ borderLeft: `3px solid ${color}` }}
      role={tone === "danger" ? "alert" : undefined}
    >
      <AlertTriangle size={16} style={{ color, flex: "0 0 auto", marginTop: 2 }} />
      <div>
        {title ? (
          <div className="fw-semibold" style={{ fontSize: "0.86rem" }}>
            {title}
          </div>
        ) : null}
        <div className="dx-help">{children}</div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Toasts — page budget: ≤4 distinct triggers, fired only after completed actions
// -----------------------------------------------------------------------------
export interface ToastItem {
  id: number;
  title: string;
  body?: string;
  tone: "success" | "error" | "info" | "warn";
}

interface ToastCtx {
  push: (t: Omit<ToastItem, "id">) => void;
}

const ToastContext = createContext<ToastCtx>({ push: () => undefined });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((t: Omit<ToastItem, "id">) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setItems((list) => [...list.slice(-2), { ...t, id }]);
    window.setTimeout(() => setItems((list) => list.filter((i) => i.id !== id)), 5200);
  }, []);
  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="dx-toast-wrap" aria-live="polite" aria-atomic="false">
        {items.map((t) => (
          <div key={t.id} className={`dx-toast dx-toast-${t.tone}`} role="status">
            <span className="dx-dot" style={{ background: "currentColor", marginTop: 6 }} />
            <div className="flex-grow-1">
              <p className="dx-toast-title">{t.title}</p>
              {t.body ? <p className="dx-toast-body">{t.body}</p> : null}
            </div>
            <button
              type="button"
              className="dx-x-btn"
              style={{ width: 24, height: 24 }}
              onClick={() => setItems((list) => list.filter((i) => i.id !== t.id))}
              aria-label="Dismiss notification"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
