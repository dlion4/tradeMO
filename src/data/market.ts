// =============================================================================
// src/data/market.ts — Deriv market mock data + shared formatters.
// FRONT-END ONLY: these shapes mirror wss://ws.derivws.com/websockets/v3
// responses (active_symbols / tick / proposal) so the fetch layer can be
// swapped for the live WebSocket later without touching any page.
// =============================================================================

export type MarketKind = "synthetics" | "forex" | "crypto" | "commodities" | "indices";
export type ContractTypeId =
  | "rise_fall"
  | "higher_lower"
  | "touch"
  | "digits"
  | "accumulator"
  | "multiplier"
  | "lookback"
  | "ends_between"
  | "stays_between"
  | "even_odd"
  | "over_under";

export type DurationUnit = "ticks" | "seconds" | "minutes" | "hours" | "days";

export interface Symbol {
  code: string;
  name: string;
  short: string;
  market: MarketKind;
  pipSize: number;
  basePrice: number;
  spread: number;
  payoutPct: number;
  changePct: number;
  open: boolean;
  popularity: number;
  minStake: number;
  maxStake: number;
  contractTypes: ContractTypeId[];
  openTime: string;
  closeTime: string;
}

export interface Tick {
  symbol: string;
  quote: number;
  epoch: number;
  dir: "up" | "down" | "flat";
}

export interface ContractType {
  id: ContractTypeId;
  label: string;
  markets: MarketKind[];
  units: DurationUnit[];
  minDuration: number;
  maxDuration: number;
  payoutLow: number;
  payoutHigh: number;
  blurb: string;
  barrier: string;
}

export interface Proposal {
  id: string;
  symbol: string;
  contractType: ContractTypeId;
  direction: "rise" | "fall" | "higher" | "lower" | "match" | "differ" | "up" | "down";
  stake: number;
  duration: number;
  durationUnit: DurationUnit;
  barrier?: string;
  currency: "USD";
  payout: number;
  profit: number;
  entrySpot: number;
  askPrice: number;
  expiresAt: number;
  idempotencyKey: string;
}

// -----------------------------------------------------------------------------
// "WebSocket" catalog (active_symbols)
// -----------------------------------------------------------------------------
export const MARKETS: { id: MarketKind; label: string; note: string }[] = [
  { id: "synthetics", label: "Synthetics", note: "24/7 · ticks 1s–2s" },
  { id: "forex", label: "Forex", note: "Sun 21:00 – Fri 21:00 UTC" },
  { id: "crypto", label: "Crypto", note: "24/7 · 1s granularity" },
  { id: "commodities", label: "Commodities", note: "Metals, energy" },
  { id: "indices", label: "Stock Indices", note: "OTC cash indices" },
];

export const MARKET_SYMBOLS: Symbol[] = [
  {
    code: "R_10",
    name: "Volatility 10 Index",
    short: "Vol 10",
    market: "synthetics",
    pipSize: 3,
    basePrice: 6423.752,
    spread: 0.014,
    payoutPct: 95.4,
    changePct: 0.42,
    open: true,
    popularity: 94,
    minStake: 0.35,
    maxStake: 50000,
    contractTypes: ["rise_fall", "higher_lower", "touch", "digits", "even_odd", "over_under", "accumulator", "lookback"],
    openTime: "00:00",
    closeTime: "24:00",
  },
  {
    code: "R_25",
    name: "Volatility 25 Index",
    short: "Vol 25",
    market: "synthetics",
    pipSize: 3,
    basePrice: 3287.146,
    spread: 0.038,
    payoutPct: 95.2,
    changePct: -0.87,
    open: true,
    popularity: 76,
    minStake: 0.35,
    maxStake: 40000,
    contractTypes: ["rise_fall", "higher_lower", "touch", "digits", "even_odd", "over_under", "accumulator", "multiplier"],
    openTime: "00:00",
    closeTime: "24:00",
  },
  {
    code: "R_50",
    name: "Volatility 50 Index",
    short: "Vol 50",
    market: "synthetics",
    pipSize: 4,
    basePrice: 245.6321,
    spread: 0.0062,
    payoutPct: 95.1,
    changePct: 1.24,
    open: true,
    popularity: 81,
    minStake: 0.35,
    maxStake: 35000,
    contractTypes: ["rise_fall", "higher_lower", "touch", "digits", "even_odd", "over_under", "accumulator"],
    openTime: "00:00",
    closeTime: "24:00",
  },
  {
    code: "R_75",
    name: "Volatility 75 Index",
    short: "Vol 75",
    market: "synthetics",
    pipSize: 5,
    basePrice: 486213.14872,
    spread: 8.42,
    payoutPct: 95.0,
    changePct: -1.63,
    open: true,
    popularity: 88,
    minStake: 0.35,
    maxStake: 20000,
    contractTypes: ["rise_fall", "higher_lower", "touch", "digits", "even_odd", "over_under", "accumulator", "multiplier"],
    openTime: "00:00",
    closeTime: "24:00",
  },
  {
    code: "R_100",
    name: "Volatility 100 Index",
    short: "Vol 100",
    market: "synthetics",
    pipSize: 2,
    basePrice: 1683.42,
    spread: 0.11,
    payoutPct: 94.9,
    changePct: 2.08,
    open: true,
    popularity: 97,
    minStake: 0.35,
    maxStake: 30000,
    contractTypes: ["rise_fall", "higher_lower", "touch", "digits", "even_odd", "over_under", "accumulator", "lookback"],
    openTime: "00:00",
    closeTime: "24:00",
  },
  {
    code: "1HZ10V",
    name: "Volatility 10 (1s) Index",
    short: "Vol 10 (1s)",
    market: "synthetics",
    pipSize: 3,
    basePrice: 7821.564,
    spread: 0.021,
    payoutPct: 95.3,
    changePct: 0.31,
    open: true,
    popularity: 62,
    minStake: 0.35,
    maxStake: 25000,
    contractTypes: ["rise_fall", "higher_lower", "digits", "accumulator", "multiplier"],
    openTime: "00:00",
    closeTime: "24:00",
  },
  {
    code: "1HZ100V",
    name: "Volatility 100 (1s) Index",
    short: "Vol 100 (1s)",
    market: "synthetics",
    pipSize: 2,
    basePrice: 942.18,
    spread: 0.19,
    payoutPct: 94.8,
    changePct: -0.54,
    open: true,
    popularity: 58,
    minStake: 0.35,
    maxStake: 25000,
    contractTypes: ["rise_fall", "higher_lower", "digits", "accumulator"],
    openTime: "00:00",
    closeTime: "24:00",
  },
  {
    code: "frxEURUSD",
    name: "EUR/USD",
    short: "EUR/USD",
    market: "forex",
    pipSize: 5,
    basePrice: 1.08421,
    spread: 0.00012,
    payoutPct: 94.6,
    changePct: 0.18,
    open: true,
    popularity: 92,
    minStake: 0.35,
    maxStake: 60000,
    contractTypes: ["rise_fall", "higher_lower", "touch", "lookback", "multiplier"],
    openTime: "21:00",
    closeTime: "21:00",
  },
  {
    code: "frxGBPUSD",
    name: "GBP/USD",
    short: "GBP/USD",
    market: "forex",
    pipSize: 5,
    basePrice: 1.27184,
    spread: 0.00016,
    payoutPct: 94.2,
    changePct: -0.26,
    open: true,
    popularity: 84,
    minStake: 0.35,
    maxStake: 50000,
    contractTypes: ["rise_fall", "higher_lower", "touch", "multiplier"],
    openTime: "21:00",
    closeTime: "21:00",
  },
  {
    code: "frxUSDJPY",
    name: "USD/JPY",
    short: "USD/JPY",
    market: "forex",
    pipSize: 3,
    basePrice: 157.482,
    spread: 0.014,
    payoutPct: 94.4,
    changePct: 0.62,
    open: true,
    popularity: 79,
    minStake: 0.35,
    maxStake: 50000,
    contractTypes: ["rise_fall", "higher_lower", "touch", "multiplier"],
    openTime: "21:00",
    closeTime: "21:00",
  },
  {
    code: "frxAUDUSD",
    name: "AUD/USD",
    short: "AUD/USD",
    market: "forex",
    pipSize: 5,
    basePrice: 0.66312,
    spread: 0.00014,
    payoutPct: 93.9,
    changePct: -0.09,
    open: false,
    popularity: 51,
    minStake: 0.35,
    maxStake: 40000,
    contractTypes: ["rise_fall", "higher_lower", "multiplier"],
    openTime: "21:00",
    closeTime: "21:00",
  },
  {
    code: "frxUSDCAD",
    name: "USD/CAD",
    short: "USD/CAD",
    market: "forex",
    pipSize: 5,
    basePrice: 1.37142,
    spread: 0.00015,
    payoutPct: 94.0,
    changePct: 0.11,
    open: true,
    popularity: 47,
    minStake: 0.35,
    maxStake: 40000,
    contractTypes: ["rise_fall", "higher_lower", "multiplier"],
    openTime: "21:00",
    closeTime: "21:00",
  },
  {
    code: "cryBTCUSD",
    name: "BTC/USD",
    short: "BTC/USD",
    market: "crypto",
    pipSize: 2,
    basePrice: 67432.18,
    spread: 12.4,
    payoutPct: 93.5,
    changePct: -1.42,
    open: true,
    popularity: 90,
    minStake: 0.35,
    maxStake: 15000,
    contractTypes: ["rise_fall", "higher_lower", "touch", "multiplier", "lookback"],
    openTime: "00:00",
    closeTime: "24:00",
  },
  {
    code: "cryETHUSD",
    name: "ETH/USD",
    short: "ETH/USD",
    market: "crypto",
    pipSize: 2,
    basePrice: 3241.56,
    spread: 1.84,
    payoutPct: 93.2,
    changePct: 0.96,
    open: true,
    popularity: 71,
    minStake: 0.35,
    maxStake: 15000,
    contractTypes: ["rise_fall", "higher_lower", "touch", "multiplier"],
    openTime: "00:00",
    closeTime: "24:00",
  },
  {
    code: "frxXAUUSD",
    name: "Gold/USD",
    short: "XAU/USD",
    market: "commodities",
    pipSize: 2,
    basePrice: 2412.65,
    spread: 0.42,
    payoutPct: 93.8,
    changePct: 0.74,
    open: true,
    popularity: 86,
    minStake: 0.35,
    maxStake: 25000,
    contractTypes: ["rise_fall", "higher_lower", "touch", "multiplier"],
    openTime: "23:00",
    closeTime: "22:00",
  },
  {
    code: "frxXAGUSD",
    name: "Silver/USD",
    short: "XAG/USD",
    market: "commodities",
    pipSize: 3,
    basePrice: 30.842,
    spread: 0.021,
    payoutPct: 93.4,
    changePct: -0.31,
    open: true,
    popularity: 44,
    minStake: 0.35,
    maxStake: 20000,
    contractTypes: ["rise_fall", "higher_lower", "multiplier"],
    openTime: "23:00",
    closeTime: "22:00",
  },
  {
    code: "OTC_NDX",
    name: "US Tech 100 (OTC)",
    short: "US Tech 100",
    market: "indices",
    pipSize: 2,
    basePrice: 19842.36,
    spread: 3.2,
    payoutPct: 93.6,
    changePct: 1.18,
    open: true,
    popularity: 68,
    minStake: 0.35,
    maxStake: 20000,
    contractTypes: ["rise_fall", "higher_lower", "touch", "multiplier"],
    openTime: "00:00",
    closeTime: "24:00",
  },
  {
    code: "OTC_SPC",
    name: "US 500 (OTC)",
    short: "US 500",
    market: "indices",
    pipSize: 2,
    basePrice: 5632.18,
    spread: 0.9,
    payoutPct: 93.5,
    changePct: 0.52,
    open: true,
    popularity: 63,
    minStake: 0.35,
    maxStake: 20000,
    contractTypes: ["rise_fall", "higher_lower", "touch"],
    openTime: "00:00",
    closeTime: "24:00",
  },
  {
    code: "OTC_DJI",
    name: "Wall Street 30 (OTC)",
    short: "Wall St 30",
    market: "indices",
    pipSize: 2,
    basePrice: 42186.44,
    spread: 5.6,
    payoutPct: 93.3,
    changePct: -0.22,
    open: true,
    popularity: 55,
    minStake: 0.35,
    maxStake: 20000,
    contractTypes: ["rise_fall", "higher_lower", "touch"],
    openTime: "00:00",
    closeTime: "24:00",
  },
  {
    code: "OTC_N225",
    name: "Japan 225 (OTC)",
    short: "Japan 225",
    market: "indices",
    pipSize: 1,
    basePrice: 38412.6,
    spread: 6.4,
    payoutPct: 93.1,
    changePct: 0.36,
    open: false,
    popularity: 39,
    minStake: 0.35,
    maxStake: 15000,
    contractTypes: ["rise_fall", "higher_lower"],
    openTime: "00:00",
    closeTime: "24:00",
  },
];

export const SYMBOL_MAP: Record<string, Symbol> = Object.fromEntries(MARKET_SYMBOLS.map((s) => [s.code, s]));

/** Ticker strip symbols for H-1 (blueprint: top 6 pairs). */
export const TICKER_SYMBOLS = ["frxEURUSD", "cryBTCUSD", "R_10", "R_75", "frxGBPUSD", "frxXAUUSD"];

export const CONTRACT_TYPES: ContractType[] = [
  {
    id: "rise_fall",
    label: "Rise/Fall",
    markets: ["synthetics", "forex", "crypto", "commodities", "indices"],
    units: ["ticks", "seconds", "minutes", "hours", "days"],
    minDuration: 1,
    maxDuration: 365,
    payoutLow: 85,
    payoutHigh: 95.4,
    blurb: "Predict whether the exit spot will be strictly higher or lower than the entry spot.",
    barrier: "No barrier — spot vs spot",
  },
  {
    id: "higher_lower",
    label: "Higher/Lower",
    markets: ["synthetics", "forex", "crypto", "commodities", "indices"],
    units: ["ticks", "seconds", "minutes", "hours", "days"],
    minDuration: 1,
    maxDuration: 365,
    payoutLow: 60,
    payoutHigh: 220,
    blurb: "Set an absolute barrier; win if the exit spot settles above (Higher) or below (Lower) it.",
    barrier: "Absolute (e.g. +0.2500 offset)",
  },
  {
    id: "touch",
    label: "Touch/No Touch",
    markets: ["synthetics", "forex", "crypto", "commodities", "indices"],
    units: ["minutes", "hours", "days"],
    minDuration: 1,
    maxDuration: 365,
    payoutLow: 40,
    payoutHigh: 480,
    blurb: "Win if the market touches (Touch) or never touches (No Touch) the barrier before expiry.",
    barrier: "Absolute one-touch / two-touch barrier",
  },
  {
    id: "digits",
    label: "Digits",
    markets: ["synthetics"],
    units: ["ticks"],
    minDuration: 1,
    maxDuration: 10,
    payoutLow: 9.6,
    payoutHigh: 950,
    blurb: "Match / Differ / Over / Under on the last digit of the quoted price, over 1–10 ticks.",
    barrier: "Last-digit 0–9",
  },
  {
    id: "accumulator",
    label: "Accumulator",
    markets: ["synthetics"],
    units: ["ticks"],
    minDuration: 1,
    maxDuration: 10,
    payoutLow: 1,
    payoutHigh: 5,
    blurb: "Grow the stake by a fixed growth rate for every consecutive tick that stays inside the range.",
    barrier: "±0.1% range around spot",
  },
  {
    id: "multiplier",
    label: "Multiplier",
    markets: ["synthetics", "forex", "crypto", "commodities", "indices"],
    units: ["days"],
    minDuration: 1,
    maxDuration: 365,
    payoutLow: 1,
    payoutHigh: 1000,
    blurb: "Leveraged directional exposure with automated stop-out and take-profit, no expiry pressure.",
    barrier: "Stop-out at stake, take profit optional",
  },
  {
    id: "lookback",
    label: "Lookback",
    markets: ["synthetics", "forex", "crypto"],
    units: ["ticks", "minutes", "hours", "days"],
    minDuration: 1,
    maxDuration: 365,
    payoutLow: 45,
    payoutHigh: 320,
    blurb: "Price the contract off the highest or lowest tick over the duration rather than the exit spot.",
    barrier: "High/Low watermark pricing",
  },
  {
    id: "ends_between",
    label: "Ends Between/Outside",
    markets: ["synthetics", "forex", "crypto", "commodities", "indices"],
    units: ["minutes", "hours", "days"],
    minDuration: 1,
    maxDuration: 365,
    payoutLow: 25,
    payoutHigh: 90,
    blurb: "Two barriers — win if the exit spot ends between them (or outside them).",
    barrier: "Lower + upper barrier pair",
  },
  {
    id: "stays_between",
    label: "Stays Between/Goes Outside",
    markets: ["synthetics", "forex", "crypto", "commodities", "indices"],
    units: ["minutes", "hours", "days"],
    minDuration: 1,
    maxDuration: 365,
    payoutLow: 20,
    payoutHigh: 88,
    blurb: "Two barriers — win if the market stays inside the range for the whole contract term.",
    barrier: "Lower + upper barrier pair",
  },
  {
    id: "even_odd",
    label: "Even/Odd",
    markets: ["synthetics"],
    units: ["ticks"],
    minDuration: 1,
    maxDuration: 10,
    payoutLow: 92,
    payoutHigh: 96,
    blurb: "Predict whether the last digit of the exit tick is even or odd.",
    barrier: "Last-digit parity",
  },
  {
    id: "over_under",
    label: "Over/Under",
    markets: ["synthetics"],
    units: ["ticks"],
    minDuration: 1,
    maxDuration: 10,
    payoutLow: 60,
    payoutHigh: 480,
    blurb: "Predict whether the last digit will be over or under a chosen digit (0–9).",
    barrier: "Last-digit threshold",
  },
];

export const CONTRACT_TYPE_MAP: Record<ContractTypeId, ContractType> = Object.fromEntries(
  CONTRACT_TYPES.map((c) => [c.id, c]),
) as Record<ContractTypeId, ContractType>;

export const DURATION_UNITS: { id: DurationUnit; label: string; short: string }[] = [
  { id: "ticks", label: "Ticks", short: "t" },
  { id: "seconds", label: "Seconds", short: "s" },
  { id: "minutes", label: "Minutes", short: "m" },
  { id: "hours", label: "Hours", short: "h" },
  { id: "days", label: "Days", short: "d" },
];

/** Realistic Deriv-style minimum stake steps for synthetics/forex. */
export const QUICK_STAKES = [0.35, 1, 2, 5, 10, 25, 50, 100];

// -----------------------------------------------------------------------------
// Formatters (shared by every page — never re-implement in a route)
// -----------------------------------------------------------------------------
export function usd(value: number, decimals = 2, options?: { sign?: boolean; compact?: boolean }): string {
  const sign = options?.sign && value > 0 ? "+" : value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (options?.compact && abs >= 1000) {
    const units: [number, string][] = [
      [1_000_000, "M"],
      [1_000, "K"],
    ];
    for (const [div, suffix] of units) {
      if (abs >= div) return `${sign}$${(abs / div).toFixed(abs / div >= 100 ? 0 : 1)}${suffix}`;
    }
  }
  return `${sign}$${abs.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export function pnl(value: number, decimals = 2): string {
  return usd(value, decimals, { sign: true });
}

export function pnlTone(value: number): "up" | "down" | "flat" {
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "flat";
}

export function fmtPrice(quote: number, pipSize = 2): string {
  return quote.toLocaleString("en-US", { minimumFractionDigits: pipSize, maximumFractionDigits: pipSize });
}

export function fmtDur(duration: number, unit: DurationUnit): string {
  const units: Record<DurationUnit, string> = {
    ticks: duration === 1 ? "tick" : "ticks",
    seconds: "s",
    minutes: "m",
    hours: "h",
    days: "d",
  };
  return `${duration} ${units[unit]}`;
}

export function fmtDurLong(duration: number, unit: DurationUnit): string {
  const label: Record<DurationUnit, [string, string]> = {
    ticks: ["tick", "ticks"],
    seconds: ["second", "seconds"],
    minutes: ["minute", "minutes"],
    hours: ["hour", "hours"],
    days: ["day", "days"],
  };
  return `${duration} ${duration === 1 ? label[unit][0] : label[unit][1]}`;
}

export function pct(value: number, decimals = 2, signed = false): string {
  const sign = signed && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

export function fmtTime(epoch: number): string {
  return new Date(epoch).toISOString().slice(11, 19);
}

export function fmtClock(epoch: number): string {
  return new Date(epoch).toISOString().slice(11, 16);
}

export function fmtDate(epoch: number): string {
  return new Date(epoch).toISOString().slice(0, 10);
}

export function timeAgo(epoch: number, now = Date.now()): string {
  const diff = Math.max(0, Math.floor((now - epoch) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function payoutFor(stake: number, payoutPct: number): number {
  return Math.round(stake * (1 + payoutPct / 100) * 100) / 100;
}

// -----------------------------------------------------------------------------
// Tick simulation (mirrors the public `tick` stream; seeded so SSR == client)
// -----------------------------------------------------------------------------
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Advance one tick for a symbol — volatility scaled by market + pip size. */
export function nextTick(symbol: Symbol, quote: number, rand: () => number): Tick {
  const vol =
    symbol.market === "synthetics"
      ? (symbol.pipSize === 5 ? 42 : symbol.pipSize === 4 ? 0.9 : 0.14) * 0.02
      : symbol.market === "crypto"
        ? symbol.basePrice * 0.0004
        : symbol.market === "forex"
          ? 0.00006
          : symbol.basePrice * 0.00012;
  const drift = (rand() - 0.5) * 2 * vol;
  const next = Math.max(symbol.pipSize === 5 ? 0.00001 : 0.01, quote + drift);
  return {
    symbol: symbol.code,
    quote: next,
    epoch: Date.now(),
    dir: next > quote ? "up" : next < quote ? "down" : "flat",
  };
}

/** Build the initial tick series for a symbol (deterministic). */
export function seedSpark(code: string, points = 24): number[] {
  const symbol = SYMBOL_MAP[code];
  const rand = mulberry32(seedFrom(code));
  let price = symbol.basePrice;
  const out: number[] = [];
  for (let i = 0; i < points; i++) {
    price = nextTick(symbol, price, rand).quote;
    out.push(price);
  }
  return out;
}

/** Deriv-style proposal (proposal / proposal_array response shape). */
export function buildProposal(input: {
  symbol: string;
  contractType: ContractTypeId;
  direction: Proposal["direction"];
  stake: number;
  duration: number;
  durationUnit: DurationUnit;
  barrier?: string;
  entrySpot?: number;
}): Proposal {
  const symbol = SYMBOL_MAP[input.symbol] ?? MARKET_SYMBOLS[0];
  const rand = mulberry32(seedFrom(`${input.symbol}${input.contractType}${input.stake}${input.duration}`));
  const payoutPct = input.contractType === "higher_lower" || input.contractType === "touch" ? symbol.payoutPct * 1.9 : symbol.payoutPct;
  const slippage = 1 - rand() * 0.004;
  const payout = Math.round(input.stake * (1 + (payoutPct / 100) * slippage) * 100) / 100;
  const entrySpot = input.entrySpot ?? symbol.basePrice;
  return {
    id: `prop_${Math.floor(rand() * 1e6)
      .toString(36)
      .padStart(5, "0")}`,
    symbol: symbol.code,
    contractType: input.contractType,
    direction: input.direction,
    stake: input.stake,
    duration: input.duration,
    durationUnit: input.durationUnit,
    barrier: input.barrier,
    currency: "USD",
    payout,
    profit: Math.round((payout - input.stake) * 100) / 100,
    entrySpot,
    askPrice: Math.round(input.stake * 100) / 100,
    expiresAt: Date.now() + input.duration * (input.durationUnit === "ticks" ? 2000 : input.durationUnit === "seconds" ? 1000 : 60000),
    idempotencyKey: `idem_${seedFrom(`${input.symbol}${input.stake}${input.duration}`).toString(16).slice(0, 10)}`,
  };
}
