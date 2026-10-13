// =============================================================================
// charts.tsx — dependency-free SVG data widgets (§9 docs/MASTER_THEME.md).
// No chart library: everything is inline SVG so route chunks stay small.
// =============================================================================
import { useId, useMemo, useState } from "react";
import { useInterval } from "./primitives";

// -----------------------------------------------------------------------------
// LineChart — equity curves, P&L series, price history
// -----------------------------------------------------------------------------
export function LineChart({
  data,
  height = 220,
  tone = "accent",
  showGrid = true,
  xLabels,
  yFormat = (v: number) => v.toFixed(2),
  ariaLabel = "Line chart",
}: {
  data: number[];
  height?: number;
  tone?: "accent" | "down" | "info";
  showGrid?: boolean;
  xLabels?: string[];
  yFormat?: (v: number) => string;
  ariaLabel?: string;
}) {
  const width = 720;
  const padX = 44;
  const padY = 16;
  const { path, area, min, max, ticks, points } = useMemo(() => {
    const mn = Math.min(...data);
    const mx = Math.max(...data);
    const span = mx - mn || 1;
    const stepX = (width - padX - 12) / Math.max(1, data.length - 1);
    const pts = data.map((d, i) => ({
      x: padX + i * stepX,
      y: padY + (height - padY * 2) * (1 - (d - mn) / span),
      v: d,
    }));
    const p = pts.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ");
    const a = `${p} L${pts[pts.length - 1]?.x.toFixed(1) ?? padX},${height - padY} L${padX},${height - padY} Z`;
    return {
      path: p,
      area: a,
      min: mn,
      max: mx,
      points: pts,
      ticks: [mx, mn + span / 2, mn],
    };
  }, [data, height]);

  const stroke = tone === "down" ? "var(--dx-down)" : tone === "info" ? "var(--dx-info)" : "var(--dx-accent)";
  const gid = `lc-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", height: "auto" }}
      role="img"
      aria-label={`${ariaLabel}: ${yFormat(min)} to ${yFormat(max)}`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.26" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {showGrid
        ? ticks.map((t, i) => {
            const y = padY + ((height - padY * 2) / 2) * i;
            return (
              <g key={t}>
                <line x1={padX} x2={width - 12} y1={y} y2={y} stroke="var(--dx-border)" strokeDasharray="3 5" />
                <text x={padX - 8} y={y + 4} textAnchor="end" fontSize="10" fill="var(--dx-muted)" fontFamily="var(--dx-font-display)">
                  {yFormat(t)}
                </text>
              </g>
            );
          })
        : null}
      <path d={area} fill={`url(#${gid})`} />
      <path d={path} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {points.length > 1 ? (
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3.5" fill={stroke} />
      ) : null}
      {xLabels
        ? xLabels.map((label, i) => (
            <text
              key={label}
              x={padX + (i * (width - padX - 12)) / Math.max(1, xLabels.length - 1)}
              y={height - 2}
              textAnchor="middle"
              fontSize="10"
              fill="var(--dx-muted)"
              fontFamily="var(--dx-font-display)"
            >
              {label}
            </text>
          ))
        : null}
    </svg>
  );
}

// -----------------------------------------------------------------------------
// BarSeries — P&L by session, volume by day, digit frequency
// -----------------------------------------------------------------------------
export function BarSeries({
  data,
  height = 180,
  labels,
  format = (v: number) => v.toFixed(0),
  positiveOnly = false,
}: {
  data: number[];
  height?: number;
  labels?: string[];
  format?: (v: number) => string;
  positiveOnly?: boolean;
}) {
  const max = Math.max(...data.map((d) => Math.abs(d))) || 1;
  const width = 720;
  const gap = 6;
  const barW = (width - gap * (data.length - 1)) / data.length;
  const zeroY = positiveOnly ? height - 4 : height / 2;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto" }} role="img" aria-label="Bar series">
      {data.map((d, i) => {
        const h = Math.max(2, (Math.abs(d) / max) * (positiveOnly ? height - 34 : height / 2 - 18));
        const x = i * (barW + gap);
        const up = d >= 0;
        return (
          <g key={`${i}-${d}`}>
            <rect
              x={x}
              y={positiveOnly ? zeroY - h : up ? zeroY - h : zeroY}
              width={barW}
              height={h}
              rx="3"
              fill={up ? "var(--dx-up)" : "var(--dx-down)"}
              opacity={up ? 0.85 : 0.8}
            />
            {labels ? (
              <text
                x={x + barW / 2}
                y={height - 2}
                textAnchor="middle"
                fontSize="10"
                fill="var(--dx-muted)"
                fontFamily="var(--dx-font-display)"
              >
                {labels[i]}
              </text>
            ) : null}
            {i % Math.ceil(data.length / 8) === 0 ? (
              <text
                x={x + barW / 2}
                y={positiveOnly ? zeroY - h - 5 : up ? zeroY - h - 5 : zeroY + h + 12}
                textAnchor="middle"
                fontSize="10"
                fill="var(--dx-text-dim)"
                fontFamily="var(--dx-font-display)"
              >
                {format(d)}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

// -----------------------------------------------------------------------------
// DonutStat — win rate / allocation split
// -----------------------------------------------------------------------------
export function DonutStat({
  value,
  label,
  sublabel,
  size = 132,
  tone = "accent",
}: {
  value: number;
  label: string;
  sublabel?: string;
  size?: number;
  tone?: "accent" | "down" | "info";
}) {
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  const stroke = tone === "down" ? "var(--dx-down)" : tone === "info" ? "var(--dx-info)" : "var(--dx-accent)";
  return (
    <div className="d-flex align-items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label}: ${clamped}%`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--dx-surface-3)" strokeWidth="10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(clamped / 100) * c} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x={size / 2}
          y={size / 2 + 2}
          textAnchor="middle"
          fontSize="20"
          fontWeight="600"
          fill="var(--dx-text)"
          fontFamily="var(--dx-font-display)"
        >
          {clamped.toFixed(1)}%
        </text>
        <text
          x={size / 2}
          y={size / 2 + 20}
          textAnchor="middle"
          fontSize="9"
          fill="var(--dx-muted)"
          letterSpacing="1"
        >
          {label.toUpperCase()}
        </text>
      </svg>
      {sublabel ? <p className="dx-help mb-0" style={{ maxWidth: 200 }}>{sublabel}</p> : null}
    </div>
  );
}

// -----------------------------------------------------------------------------
// TerminalPreview — bot logs / script output (animated typing on the last line)
// -----------------------------------------------------------------------------
export function TerminalPreview({
  lines,
  animate = false,
  height = 220,
}: {
  lines: string[];
  animate?: boolean;
  height?: number;
}) {
  const [visible, setVisible] = useState(animate ? Math.max(1, lines.length - 6) : lines.length);
  useInterval(
    () => {
      setVisible((v) => (v >= lines.length ? lines.length : v + 1));
    },
    animate && visible < lines.length ? 900 : null,
  );

  return (
    <div className="dx-card-inset dx-scroll-y" style={{ height, padding: 12 }}>
      {lines.slice(0, visible).map((line, i) => {
        const isError = /ERROR|halt|breach/i.test(line);
        const isWin = /WIN|profit|\+/i.test(line);
        return (
          <div key={`${i}-${line.slice(0, 12)}`} className="dx-terminal-line font-display">
            <span style={{ color: isError ? "var(--dx-down)" : isWin ? "var(--dx-up)" : "var(--dx-text-dim)" }}>{line}</span>
          </div>
        );
      })}
      {visible < lines.length ? <span className="dx-pulse ms-1" aria-hidden="true" /> : null}
    </div>
  );
}

// -----------------------------------------------------------------------------
// DigitBars — last-digit frequency for digit contract previews
// -----------------------------------------------------------------------------
export function DigitBars({ counts, active }: { counts: number[]; active?: number }) {
  const max = Math.max(...counts) || 1;
  return (
    <div className="d-flex align-items-end gap-1" style={{ height: 64 }} role="img" aria-label="Last-digit frequency">
      {counts.map((c, digit) => (
        <div key={digit} className="flex-fill d-flex flex-column align-items-center gap-1">
          <div
            style={{
              width: "100%",
              height: `${Math.max(6, (c / max) * 46)}px`,
              borderRadius: 4,
              background: active === digit ? "var(--dx-accent)" : "var(--dx-surface-3)",
            }}
            title={`Digit ${digit}: ${c}%`}
          />
          <span className="font-display" style={{ fontSize: "0.62rem", color: active === digit ? "var(--dx-accent)" : "var(--dx-muted)" }}>
            {digit}
          </span>
        </div>
      ))}
    </div>
  );
}
