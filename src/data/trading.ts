// =============================================================================
// src/data/trading.ts — Deriv trading-domain mock data (trades, positions,
// bots, scripts, traders, testimonials, plans, API health, legal docs).
// FRONT-END ONLY: shapes mirror the Deriv WS API payloads so a later swap to
// the live socket only replaces the fetch layer.
// =============================================================================
import {
  MARKET_SYMBOLS,
  type ContractTypeId,
  type DurationUnit,
} from "./market";

export const NOW_REF = Date.UTC(2026, 9, 13, 11, 30, 0);
const min = (n: number) => NOW_REF - n * 60_000;

// -----------------------------------------------------------------------------
// Deriv account identities (CR = real, VRTC = virtual, MX = multi-account)
// -----------------------------------------------------------------------------
export interface DerivAccount {
  loginId: string;
  type: "real" | "virtual";
  currency: "USD";
  balance: number;
  equity: number;
  label: string;
  connected: boolean;
  scopes: string[];
  lastSeen: number;
}

export const DERIV_ACCOUNTS: DerivAccount[] = [
  {
    loginId: "CR8842197",
    type: "real",
    currency: "USD",
    balance: 4820.55,
    equity: 4891.32,
    label: "Main — Real",
    connected: true,
    scopes: ["read", "trade", "admin"],
    lastSeen: min(1),
  },
  {
    loginId: "VRTC9031442",
    type: "virtual",
    currency: "USD",
    balance: 10000,
    equity: 10428.94,
    label: "Demo — Virtual",
    connected: true,
    scopes: ["read", "trade"],
    lastSeen: min(6),
  },
  {
    loginId: "MX5510883",
    type: "virtual",
    currency: "USD",
    balance: 2500,
    equity: 2381.4,
    label: "Strategy Lab — Virtual",
    connected: true,
    scopes: ["read", "trade", "payments"],
    lastSeen: min(41),
  },
  {
    loginId: "VRTC7745001",
    type: "virtual",
    currency: "USD",
    balance: 500,
    equity: 512.28,
    label: "Backtest Sandbox",
    connected: false,
    scopes: ["read"],
    lastSeen: min(2880),
  },
];

// -----------------------------------------------------------------------------
// Trades (contract history — mirrors the `profit_table` / `statement` payloads)
// -----------------------------------------------------------------------------
export interface Trade {
  id: string;
  contractId: string;
  symbol: string;
  contractType: ContractTypeId;
  direction: "rise" | "fall" | "higher" | "lower" | "match" | "differ" | "even" | "odd" | "up" | "down";
  stake: number;
  payout: number;
  profit: number;
  entrySpot: number;
  exitSpot: number;
  duration: number;
  durationUnit: DurationUnit;
  openedAt: number;
  closedAt: number;
  status: "won" | "lost" | "sold" | "open";
  loginId: string;
  botId?: string;
  barrier?: string;
}

const tradeRow = (
  i: number,
  symbol: string,
  contractType: ContractTypeId,
  direction: Trade["direction"],
  stake: number,
  profit: number,
  duration: number,
  durationUnit: DurationUnit,
  status: Trade["status"],
  minutesAgo: number,
  entrySpot: number,
  exitSpot: number,
  botId?: string,
  loginId = "VRTC9031442",
): Trade => ({
  id: `trd_${(1000 + i).toString()}`,
  contractId: `${3_400_000 + i * 7919}`,
  symbol,
  contractType,
  direction,
  stake,
  payout: Math.round((stake + profit) * 100) / 100,
  profit,
  entrySpot,
  exitSpot,
  duration,
  durationUnit,
  openedAt: min(minutesAgo + duration),
  closedAt: min(minutesAgo),
  status,
  loginId,
  botId,
  barrier: contractType === "higher_lower" ? `+${(entrySpot * 0.0006).toFixed(2)}` : undefined,
});

export const TRADES: Trade[] = [
  tradeRow(0, "R_10", "rise_fall", "rise", 0.35, 0.33, 5, "ticks", "won", 4, 6423.752, 6424.19, "bot_mart_10"),
  tradeRow(1, "R_10", "rise_fall", "rise", 0.35, -0.35, 5, "ticks", "lost", 9, 6424.19, 6424.06, "bot_mart_10"),
  tradeRow(2, "R_25", "digits", "match", 1, 8.6, 3, "ticks", "won", 13, 3287.146, 3287.472, "bot_digit_hunter"),
  tradeRow(3, "frxEURUSD", "rise_fall", "rise", 25, 23.65, 15, "minutes", "won", 22, 1.08421, 1.08472, "bot_fx_breakout"),
  tradeRow(4, "cryBTCUSD", "higher_lower", "higher", 10, -10, 60, "minutes", "lost", 34, 67432.18, 67310.44),
  tradeRow(5, "R_100", "rise_fall", "fall", 5, 4.75, 1, "minutes", "won", 47, 1683.42, 1682.88, "bot_dca_trend"),
  tradeRow(6, "R_75", "touch", "up", 2, 5.4, 2, "hours", "won", 58, 486213.14872, 486402.51),
  tradeRow(7, "frxXAUUSD", "rise_fall", "rise", 15, -15, 30, "minutes", "lost", 71, 2412.65, 2411.92, "bot_fx_breakout", "CR8842197"),
  tradeRow(8, "1HZ10V", "accumulator", "up", 3, 1.05, 5, "ticks", "won", 84, 7821.564, 7821.902, "bot_acc_sniper"),
  tradeRow(9, "frxGBPUSD", "rise_fall", "fall", 8, 7.52, 1, "hours", "won", 96, 1.27184, 1.27118),
  tradeRow(10, "R_50", "over_under", "lower", 4, 3.8, 10, "ticks", "won", 108, 245.6321, 245.6305, "bot_digit_hunter"),
  tradeRow(11, "cryETHUSD", "rise_fall", "rise", 12, -12, 45, "minutes", "lost", 121, 3241.56, 3239.08),
  tradeRow(12, "R_10", "rise_fall", "rise", 0.7, 0.67, 5, "ticks", "won", 132, 6423.11, 6423.58, "bot_mart_10"),
  tradeRow(13, "OTC_NDX", "higher_lower", "higher", 20, 18.4, 1, "days", "won", 148, 19842.36, 19914.22, "bot_dca_trend", "CR8842197"),
  tradeRow(14, "frxUSDJPY", "rise_fall", "fall", 6, 5.64, 20, "minutes", "sold", 162, 157.482, 157.441),
  tradeRow(15, "R_100", "even_odd", "even", 2, 1.92, 1, "ticks", "won", 175, 1683.42, 1682.9, "bot_digit_hunter"),
];

// -----------------------------------------------------------------------------
// Positions (open contracts — mirrors `portfolio`)
// -----------------------------------------------------------------------------
export interface Position {
  id: string;
  contractId: string;
  symbol: string;
  contractType: ContractTypeId;
  direction: "rise" | "fall" | "higher" | "lower" | "up" | "down";
  stake: number;
  multiplier?: number;
  currentPnl: number;
  entrySpot: number;
  currentSpot: number;
  payout: number;
  barrier?: string;
  openedAt: number;
  expiresAt: number;
  loginId: string;
  risk: "low" | "medium" | "high";
  botId?: string;
  status: "open" | "pending" | "barrier-hit";
}

export const POSITIONS: Position[] = [
  {
    id: "pos_001",
    contractId: "34015201",
    symbol: "R_10",
    contractType: "rise_fall",
    direction: "rise",
    stake: 0.7,
    currentPnl: 0.32,
    entrySpot: 6423.752,
    currentSpot: 6424.118,
    payout: 1.37,
    openedAt: min(3),
    expiresAt: NOW_REF + 4 * 2000,
    loginId: "VRTC9031442",
    risk: "low",
    botId: "bot_mart_10",
    status: "open",
  },
  {
    id: "pos_002",
    contractId: "34015266",
    symbol: "R_75",
    contractType: "multiplier",
    direction: "rise",
    stake: 150,
    multiplier: 100,
    currentPnl: 42.18,
    entrySpot: 486213.14872,
    currentSpot: 486329.4182,
    payout: 192.18,
    openedAt: min(212),
    expiresAt: NOW_REF + 86400_000,
    loginId: "CR8842197",
    risk: "high",
    status: "open",
  },
  {
    id: "pos_003",
    contractId: "34015310",
    symbol: "frxEURUSD",
    contractType: "higher_lower",
    direction: "higher",
    stake: 25,
    currentPnl: 6.4,
    entrySpot: 1.08421,
    currentSpot: 1.08512,
    payout: 48.65,
    barrier: "+0.00065",
    openedAt: min(46),
    expiresAt: NOW_REF + 22 * 60_000,
    loginId: "VRTC9031442",
    risk: "medium",
    botId: "bot_fx_breakout",
    status: "open",
  },
  {
    id: "pos_004",
    contractId: "34015388",
    symbol: "cryBTCUSD",
    contractType: "rise_fall",
    direction: "fall",
    stake: 12,
    currentPnl: -3.84,
    entrySpot: 67432.18,
    currentSpot: 67548.02,
    payout: 23.22,
    openedAt: min(18),
    expiresAt: NOW_REF + 27 * 60_000,
    loginId: "VRTC9031442",
    risk: "medium",
    status: "open",
  },
  {
    id: "pos_005",
    contractId: "34015404",
    symbol: "1HZ10V",
    contractType: "accumulator",
    direction: "rise",
    stake: 3,
    currentPnl: 0.94,
    entrySpot: 7821.564,
    currentSpot: 7821.902,
    payout: 3.94,
    barrier: "±0.1%",
    openedAt: min(7),
    expiresAt: NOW_REF + 6 * 2000,
    loginId: "MX5510883",
    risk: "low",
    botId: "bot_acc_sniper",
    status: "open",
  },
  {
    id: "pos_006",
    contractId: "34015477",
    symbol: "frxXAUUSD",
    contractType: "touch",
    direction: "up",
    stake: 20,
    currentPnl: 3.2,
    entrySpot: 2412.65,
    currentSpot: 2416.42,
    payout: 52.4,
    barrier: "2418.00",
    openedAt: min(95),
    expiresAt: NOW_REF + 8 * 3600_000,
    loginId: "CR8842197",
    risk: "medium",
    status: "open",
  },
  {
    id: "pos_007",
    contractId: "34015512",
    symbol: "R_100",
    contractType: "digits",
    direction: "rise",
    stake: 1,
    currentPnl: -1,
    entrySpot: 1683.42,
    currentSpot: 1682.98,
    payout: 9.6,
    openedAt: min(2),
    expiresAt: NOW_REF + 2 * 2000,
    loginId: "VRTC9031442",
    risk: "high",
    botId: "bot_digit_hunter",
    status: "barrier-hit",
  },
  {
    id: "pos_008",
    contractId: "34015590",
    symbol: "R_50",
    contractType: "stays_between",
    direction: "up",
    stake: 5,
    currentPnl: 1.15,
    entrySpot: 245.6321,
    currentSpot: 245.6648,
    payout: 9.35,
    barrier: "244.90 / 246.40",
    openedAt: min(38),
    expiresAt: NOW_REF + 3 * 3600_000,
    loginId: "VRTC9031442",
    risk: "low",
    status: "open",
  },
  {
    id: "pos_009",
    contractId: "34015633",
    symbol: "OTC_NDX",
    contractType: "rise_fall",
    direction: "rise",
    stake: 40,
    currentPnl: -12.8,
    entrySpot: 19842.36,
    currentSpot: 19788.14,
    payout: 77.6,
    openedAt: min(320),
    expiresAt: NOW_REF + 6 * 3600_000,
    loginId: "CR8842197",
    risk: "high",
    botId: "bot_dca_trend",
    status: "open",
  },
  {
    id: "pos_010",
    contractId: "34015701",
    symbol: "frxGBPUSD",
    contractType: "lookback",
    direction: "fall",
    stake: 7.5,
    currentPnl: 2.06,
    entrySpot: 1.27184,
    currentSpot: 1.27136,
    payout: 15.9,
    openedAt: min(64),
    expiresAt: NOW_REF + 55 * 60_000,
    loginId: "VRTC9031442",
    risk: "medium",
    status: "open",
  },
  {
    id: "pos_011",
    contractId: "34015744",
    symbol: "R_25",
    contractType: "rise_fall",
    direction: "rise",
    stake: 2.8,
    currentPnl: 0.55,
    entrySpot: 3287.146,
    currentSpot: 3287.512,
    payout: 5.47,
    openedAt: min(1),
    expiresAt: NOW_REF + 8 * 2000,
    loginId: "MX5510883",
    risk: "low",
    status: "pending",
  },
  {
    id: "pos_012",
    contractId: "34015822",
    symbol: "cryETHUSD",
    contractType: "multiplier",
    direction: "rise",
    stake: 60,
    multiplier: 50,
    currentPnl: 18.72,
    entrySpot: 3241.56,
    currentSpot: 3254.66,
    payout: 78.72,
    openedAt: min(410),
    expiresAt: NOW_REF + 2 * 86400_000,
    loginId: "CR8842197",
    risk: "high",
    status: "open",
  },
];

// -----------------------------------------------------------------------------
// Bots (bot engine summaries — mirrors the bot_jobs table)
// -----------------------------------------------------------------------------
export interface Bot {
  id: string;
  name: string;
  strategy: "martingale" | "dca" | "scalping" | "swing" | "fixed" | "accumulator" | "digit";
  symbol: string;
  contractType: ContractTypeId;
  stake: number;
  duration: number;
  durationUnit: DurationUnit;
  martingale: number;
  status: "running" | "paused" | "stopped" | "error";
  pnl: number;
  trades: number;
  winRate: number;
  maxStake: number;
  stopLoss: number;
  takeProfit: number;
  loginId: string;
  risk: "low" | "medium" | "high";
  runtimeMinutes: number;
  lastTradeAt: number;
  owner: string;
}

export const BOTS: Bot[] = [
  {
    id: "bot_mart_10",
    name: "Vol10 Martingale Core",
    strategy: "martingale",
    symbol: "R_10",
    contractType: "rise_fall",
    stake: 0.35,
    duration: 5,
    durationUnit: "ticks",
    martingale: 2.1,
    status: "running",
    pnl: 128.4,
    trades: 1620,
    winRate: 68.4,
    maxStake: 50,
    stopLoss: 250,
    takeProfit: 150,
    loginId: "VRTC9031442",
    risk: "medium",
    runtimeMinutes: 1284,
    lastTradeAt: min(4),
    owner: "Ade F.",
  },
  {
    id: "bot_dca_trend",
    name: "DCA Trend Rider",
    strategy: "dca",
    symbol: "OTC_NDX",
    contractType: "higher_lower",
    stake: 20,
    duration: 1,
    durationUnit: "days",
    martingale: 1.25,
    status: "running",
    pnl: 412.18,
    trades: 214,
    winRate: 61.7,
    maxStake: 120,
    stopLoss: 400,
    takeProfit: 600,
    loginId: "CR8842197",
    risk: "high",
    runtimeMinutes: 4320,
    lastTradeAt: min(148),
    owner: "Ade F.",
  },
  {
    id: "bot_digit_hunter",
    name: "Digit Hunter 7",
    strategy: "digit",
    symbol: "R_25",
    contractType: "digits",
    stake: 1,
    duration: 3,
    durationUnit: "ticks",
    martingale: 1,
    status: "running",
    pnl: 46.22,
    trades: 948,
    winRate: 11.9,
    maxStake: 1,
    stopLoss: 60,
    takeProfit: 120,
    loginId: "VRTC9031442",
    risk: "high",
    runtimeMinutes: 640,
    lastTradeAt: min(13),
    owner: "Mina L.",
  },
  {
    id: "bot_fx_breakout",
    name: "FX London Breakout",
    strategy: "scalping",
    symbol: "frxEURUSD",
    contractType: "rise_fall",
    stake: 25,
    duration: 15,
    durationUnit: "minutes",
    martingale: 1.6,
    status: "paused",
    pnl: 96.75,
    trades: 132,
    winRate: 57.6,
    maxStake: 150,
    stopLoss: 300,
    takeProfit: 500,
    loginId: "VRTC9031442",
    risk: "medium",
    runtimeMinutes: 512,
    lastTradeAt: min(22),
    owner: "Ade F.",
  },
  {
    id: "bot_acc_sniper",
    name: "Accu Sniper 1HZ",
    strategy: "accumulator",
    symbol: "1HZ10V",
    contractType: "accumulator",
    stake: 3,
    duration: 5,
    durationUnit: "ticks",
    martingale: 1,
    status: "running",
    pnl: 31.4,
    trades: 386,
    winRate: 82.1,
    maxStake: 3,
    stopLoss: 80,
    takeProfit: 160,
    loginId: "MX5510883",
    risk: "low",
    runtimeMinutes: 398,
    lastTradeAt: min(7),
    owner: "Mina L.",
  },
  {
    id: "bot_swing_gold",
    name: "Gold Swing Basket",
    strategy: "swing",
    symbol: "frxXAUUSD",
    contractType: "touch",
    stake: 20,
    duration: 8,
    durationUnit: "hours",
    martingale: 1.5,
    status: "stopped",
    pnl: -88.6,
    trades: 74,
    winRate: 41.9,
    maxStake: 90,
    stopLoss: 200,
    takeProfit: 400,
    loginId: "CR8842197",
    risk: "high",
    runtimeMinutes: 2880,
    lastTradeAt: min(1450),
    owner: "Tobi R.",
  },
  {
    id: "bot_btc_grid",
    name: "BTC Grid Runner",
    strategy: "fixed",
    symbol: "cryBTCUSD",
    contractType: "rise_fall",
    stake: 12,
    duration: 30,
    durationUnit: "minutes",
    martingale: 1.35,
    status: "running",
    pnl: 218.4,
    trades: 402,
    winRate: 59.2,
    maxStake: 80,
    stopLoss: 350,
    takeProfit: 700,
    loginId: "VRTC9031442",
    risk: "medium",
    runtimeMinutes: 2160,
    lastTradeAt: min(34),
    owner: "Kwame B.",
  },
  {
    id: "bot_vol100_night",
    name: "Vol100 Night Shift",
    strategy: "martingale",
    symbol: "R_100",
    contractType: "rise_fall",
    stake: 2,
    duration: 1,
    durationUnit: "minutes",
    martingale: 2.4,
    status: "error",
    pnl: -184.2,
    trades: 268,
    winRate: 52.6,
    maxStake: 120,
    stopLoss: 200,
    takeProfit: 500,
    loginId: "MX5510883",
    risk: "high",
    runtimeMinutes: 720,
    lastTradeAt: min(58),
    owner: "Tobi R.",
  },
  {
    id: "bot_gbp_mean_rev",
    name: "GBP Mean Reversion",
    strategy: "scalping",
    symbol: "frxGBPUSD",
    contractType: "rise_fall",
    stake: 8,
    duration: 1,
    durationUnit: "hours",
    martingale: 1.4,
    status: "running",
    pnl: 64.32,
    trades: 186,
    winRate: 63.4,
    maxStake: 64,
    stopLoss: 200,
    takeProfit: 300,
    loginId: "VRTC9031442",
    risk: "medium",
    runtimeMinutes: 1640,
    lastTradeAt: min(96),
    owner: "Mina L.",
  },
  {
    id: "bot_silver_fade",
    name: "Silver Fade",
    strategy: "swing",
    symbol: "frxXAGUSD",
    contractType: "higher_lower",
    stake: 6,
    duration: 4,
    durationUnit: "hours",
    martingale: 1,
    status: "paused",
    pnl: 12.6,
    trades: 58,
    winRate: 55.2,
    maxStake: 6,
    stopLoss: 100,
    takeProfit: 180,
    loginId: "MX5510883",
    risk: "low",
    runtimeMinutes: 420,
    lastTradeAt: min(210),
    owner: "Kwame B.",
  },
  {
    id: "bot_eth_momentum",
    name: "ETH Momentum 50x",
    strategy: "dca",
    symbol: "cryETHUSD",
    contractType: "multiplier",
    stake: 60,
    duration: 2,
    durationUnit: "days",
    martingale: 1.2,
    status: "running",
    pnl: 302.55,
    trades: 46,
    winRate: 60.9,
    maxStake: 240,
    stopLoss: 500,
    takeProfit: 900,
    loginId: "CR8842197",
    risk: "high",
    runtimeMinutes: 5640,
    lastTradeAt: min(410),
    owner: "Ade F.",
  },
  {
    id: "bot_vol75_sniper",
    name: "Vol75 Touch Sniper",
    strategy: "fixed",
    symbol: "R_75",
    contractType: "touch",
    stake: 2,
    duration: 2,
    durationUnit: "hours",
    martingale: 1.8,
    status: "running",
    pnl: 74.9,
    trades: 152,
    winRate: 48.7,
    maxStake: 32,
    stopLoss: 150,
    takeProfit: 260,
    loginId: "VRTC9031442",
    risk: "medium",
    runtimeMinutes: 890,
    lastTradeAt: min(58),
    owner: "Tobi R.",
  },
];

// -----------------------------------------------------------------------------
// Scripts (strategy scripts for the sandboxed JS engine)
// -----------------------------------------------------------------------------
export interface Script {
  id: string;
  name: string;
  language: "JavaScript" | "TypeScript";
  symbol: string;
  status: "deployed" | "draft" | "error" | "archived";
  runs: number;
  winRate: number;
  pnl: number;
  lines: number;
  author: string;
  updatedAt: number;
  tags: string[];
  code: string;
}

const martingaleCode = `// DerivX script engine — sandboxed strategy (VM2)
const { api, risk, log } = DerivX;
const STATE = require("state");

api.onTick("R_10", (tick) => {
  const streak = STATE.get("lossStreak", 0);
  const stake = Math.min(0.35 * Math.pow(2.1, streak), 50);
  risk.assert(stake <= STATE.get("maxStake", 50));

  if (tick.quote > api.sma("R_10", 20)) {
    api.buy({
      symbol: "R_10",
      contract_type: "CALL",
      amount: stake,
      duration: 5,
      duration_unit: "t",
      currency: "USD",
    });
  } else {
    log.info("skip tick " + tick.epoch + " — below SMA20");
  }
});`;

const breakoutCode = `// London-session breakout, GBPUSD + EURUSD basket
const { api, risk, schedule } = DerivX;

schedule.onlyDuring({ from: "07:00", to: "10:30", tz: "UTC" });

const range = api.range("frxEURUSD", { lookback: "4h" });
api.onBreakout(range, (dir, level) => {
  risk.assert(api.openStakes() <= 150, "exposure cap");
  api.buy({
    symbol: "frxEURUSD",
    contract_type: dir === "up" ? "CALL" : "PUT",
    amount: 25,
    duration: 15,
    duration_unit: "m",
    barrier: level.toFixed(5),
  });
});`;

export const SCRIPTS: Script[] = [
  {
    id: "scr_01",
    name: "Martingale Core v7",
    language: "JavaScript",
    symbol: "R_10",
    status: "deployed",
    runs: 1284,
    winRate: 68.4,
    pnl: 128.4,
    lines: 42,
    author: "Ade F.",
    updatedAt: min(140),
    tags: ["martingale", "synthetics", "ticks"],
    code: martingaleCode,
  },
  {
    id: "scr_02",
    name: "London Breakout FX",
    language: "TypeScript",
    symbol: "frxEURUSD",
    status: "deployed",
    runs: 512,
    winRate: 57.6,
    pnl: 96.75,
    lines: 68,
    author: "Ade F.",
    updatedAt: min(320),
    tags: ["breakout", "forex", "session"],
    code: breakoutCode,
  },
  {
    id: "scr_03",
    name: "Digit Sniper (Differs)",
    language: "JavaScript",
    symbol: "R_25",
    status: "draft",
    runs: 96,
    winRate: 84.2,
    pnl: 24.9,
    lines: 31,
    author: "Mina L.",
    updatedAt: min(58),
    tags: ["digits", "ticks"],
    code: `const { api } = DerivX;\napi.onTick("R_25", (t) => {\n  const d = api.lastDigit(t.quote);\n  if (d !== 5 && d !== 0) {\n    api.buy({ symbol: "R_25", contract_type: "DIGITDIFF", barrier: 5, amount: 1, duration: 3, duration_unit: "t" });\n  }\n});`,
  },
  {
    id: "scr_04",
    name: "Accumulator Range Keeper",
    language: "TypeScript",
    symbol: "1HZ10V",
    status: "deployed",
    runs: 386,
    winRate: 82.1,
    pnl: 31.4,
    lines: 54,
    author: "Mina L.",
    updatedAt: min(190),
    tags: ["accumulator", "ticks", "range"],
    code: `const { api, risk } = DerivX;\nconst growth = 0.03;\napi.onTick("1HZ10V", (t) => {\n  const inRange = api.within(t.quote, 0.001);\n  if (!inRange) { risk.halt("range break"); return; }\n  api.buy({ symbol: "1HZ10V", contract_type: "ACCU", amount: 3, growth_rate: growth, duration: 5, duration_unit: "t" });\n});`,
  },
  {
    id: "scr_05",
    name: "Gold Touch Ladder",
    language: "JavaScript",
    symbol: "frxXAUUSD",
    status: "error",
    runs: 74,
    winRate: 41.9,
    pnl: -88.6,
    lines: 47,
    author: "Tobi R.",
    updatedAt: min(1450),
    tags: ["touch", "commodities", "ladder"],
    code: `const { api } = DerivX;\n// note: barrier ladder recalibration (engine v3 syntax)\napi.buy({ symbol: "frxXAUUSD", contract_type: "ONETOUCH", amount: 20, barrier: api.spot("frxXAUUSD") + 5.4, duration: 8, duration_unit: "h" });`,
  },
  {
    id: "scr_06",
    name: "BTC Grid Fixed Stake",
    language: "JavaScript",
    symbol: "cryBTCUSD",
    status: "deployed",
    runs: 402,
    winRate: 59.2,
    pnl: 218.4,
    lines: 39,
    author: "Kwame B.",
    updatedAt: min(410),
    tags: ["grid", "crypto", "fixed"],
    code: `const { api } = DerivX;\napi.onBar("cryBTCUSD", "30m", (bar) => {\n  const dir = bar.close > bar.open ? "CALL" : "PUT";\n  api.buy({ symbol: "cryBTCUSD", contract_type: dir, amount: 12, duration: 30, duration_unit: "m" });\n});`,
  },
  {
    id: "scr_07",
    name: "Vol100 Night Martingale",
    language: "TypeScript",
    symbol: "R_100",
    status: "error",
    runs: 268,
    winRate: 52.6,
    pnl: -184.2,
    lines: 61,
    author: "Tobi R.",
    updatedAt: min(760),
    tags: ["martingale", "synthetics"],
    code: `const { api, risk } = DerivX;\n// risk.assert(maxStake) removed during refactor — throws at runtime\napi.onTick("R_100", () => api.buy({ symbol: "R_100", contract_type: "CALL", amount: 2, duration: 1, duration_unit: "m" }));`,
  },
  {
    id: "scr_08",
    name: "GBP Mean Reversion",
    language: "JavaScript",
    symbol: "frxGBPUSD",
    status: "deployed",
    runs: 186,
    winRate: 63.4,
    pnl: 64.32,
    lines: 44,
    author: "Mina L.",
    updatedAt: min(220),
    tags: ["mean-reversion", "forex"],
    code: `const { api } = DerivX;\napi.onTick("frxGBPUSD", (t) => {\n  const z = api.zscore("frxGBPUSD", 60);\n  if (z > 1.5) api.buy({ symbol: "frxGBPUSD", contract_type: "PUT", amount: 8, duration: 1, duration_unit: "h" });\n  if (z < -1.5) api.buy({ symbol: "frxGBPUSD", contract_type: "CALL", amount: 8, duration: 1, duration_unit: "h" });\n});`,
  },
  {
    id: "scr_09",
    name: "Silver Fade Swing",
    language: "TypeScript",
    symbol: "frxXAGUSD",
    status: "draft",
    runs: 58,
    winRate: 55.2,
    pnl: 12.6,
    lines: 36,
    author: "Kwame B.",
    updatedAt: min(680),
    tags: ["swing", "commodities"],
    code: `const { api } = DerivX;\napi.onBar("frxXAGUSD", "4h", (bar) => {\n  if (bar.bodyPct > 70) api.buy({ symbol: "frxXAGUSD", contract_type: "PUT", amount: 6, duration: 4, duration_unit: "h" });\n});`,
  },
  {
    id: "scr_10",
    name: "ETH Momentum DCA",
    language: "JavaScript",
    symbol: "cryETHUSD",
    status: "deployed",
    runs: 46,
    winRate: 60.9,
    pnl: 302.55,
    lines: 52,
    author: "Ade F.",
    updatedAt: min(900),
    tags: ["dca", "crypto", "multiplier"],
    code: `const { api } = DerivX;\napi.onDayStart("cryETHUSD", () => {\n  api.buy({ symbol: "cryETHUSD", contract_type: "MULTUP", amount: 60, multiplier: 50, stop_loss: 0.5, take_profit: 1.5 });\n});`,
  },
  {
    id: "scr_11",
    name: "USDJPY Carry Scalp",
    language: "JavaScript",
    symbol: "frxUSDJPY",
    status: "archived",
    runs: 214,
    winRate: 54.1,
    pnl: 41.8,
    lines: 29,
    author: "Ade F.",
    updatedAt: min(4300),
    tags: ["scalping", "forex"],
    code: `const { api } = DerivX;\napi.onTick("frxUSDJPY", (t) => {\n  if (api.rsi("frxUSDJPY", 14) < 30) api.buy({ symbol: "frxUSDJPY", contract_type: "CALL", amount: 6, duration: 20, duration_unit: "m" });\n});`,
  },
  {
    id: "scr_12",
    name: "Vol75 Sniper Touch",
    language: "TypeScript",
    symbol: "R_75",
    status: "deployed",
    runs: 152,
    winRate: 48.7,
    pnl: 74.9,
    lines: 57,
    author: "Tobi R.",
    updatedAt: min(600),
    tags: ["touch", "synthetics"],
    code: `const { api } = DerivX;\napi.onTick("R_75", (t) => {\n  const spot = t.quote;\n  api.buy({ symbol: "R_75", contract_type: "ONETOUCH", amount: 2, barrier: (spot * 1.0004).toFixed(2), duration: 2, duration_unit: "h" });\n});`,
  },
];

// -----------------------------------------------------------------------------
// Leaderboard traders (social proof + D-9 social monitoring preview)
// -----------------------------------------------------------------------------
export interface Trader {
  id: string;
  rank: number;
  displayName: string;
  loginId: string;
  country: string;
  flag: string;
  winRate: number;
  pnl30d: number;
  pnlAllTime: number;
  trades30d: number;
  volume30d: number;
  strategy: "martingale" | "dca" | "scalping" | "swing" | "fixed" | "accumulator" | "digit";
  copies: number;
  followers: number;
  risk: "low" | "medium" | "high";
  streak: number;
  avgDuration: string;
  favouriteSymbol: string;
  joinedAt: string;
  bio: string;
}

export const TRADERS: Trader[] = [
  {
    id: "trd_ade",
    rank: 1,
    displayName: "Ade F.",
    loginId: "CR8842197",
    country: "Nigeria",
    flag: "🇳🇬",
    winRate: 71.4,
    pnl30d: 4821.65,
    pnlAllTime: 41280.4,
    trades30d: 1284,
    volume30d: 96420,
    strategy: "dca",
    copies: 218,
    followers: 3410,
    risk: "medium",
    streak: 12,
    avgDuration: "1d",
    favouriteSymbol: "OTC_NDX",
    joinedAt: "2023-02-14",
    bio: "Index trend follower. Risk capped at 3% per basket, no overnight martingale.",
  },
  {
    id: "trd_mina",
    rank: 2,
    displayName: "Mina L.",
    loginId: "VRTC9031442",
    country: "Indonesia",
    flag: "🇮🇩",
    winRate: 66.8,
    pnl30d: 3145.2,
    pnlAllTime: 28904.12,
    trades30d: 2140,
    volume30d: 41280,
    strategy: "digit",
    copies: 176,
    followers: 2890,
    risk: "high",
    streak: 9,
    avgDuration: "3t",
    favouriteSymbol: "R_25",
    joinedAt: "2023-06-02",
    bio: "Tick-scalper on Volatility 25. Digit-differ edge over 10k-tick samples.",
  },
  {
    id: "trd_kwame",
    rank: 3,
    displayName: "Kwame B.",
    loginId: "CR7714906",
    country: "Ghana",
    flag: "🇬🇭",
    winRate: 64.2,
    pnl30d: 2760.9,
    pnlAllTime: 19845.55,
    trades30d: 402,
    volume30d: 112400,
    strategy: "fixed",
    copies: 131,
    followers: 2140,
    risk: "medium",
    streak: 6,
    avgDuration: "30m",
    favouriteSymbol: "cryBTCUSD",
    joinedAt: "2022-11-08",
    bio: "Fixed-stake crypto grid. Grid spacing recalculated weekly from ATR.",
  },
  {
    id: "trd_tobi",
    rank: 4,
    displayName: "Tobi R.",
    loginId: "MX5510883",
    country: "Kenya",
    flag: "🇰🇪",
    winRate: 58.1,
    pnl30d: 1892.35,
    pnlAllTime: 12470.8,
    trades30d: 892,
    volume30d: 74300,
    strategy: "swing",
    copies: 84,
    followers: 1320,
    risk: "high",
    streak: 3,
    avgDuration: "8h",
    favouriteSymbol: "frxXAUUSD",
    joinedAt: "2023-09-19",
    bio: "Metals swing trader. Two-bar confirmation, no trades during CPI prints.",
  },
  {
    id: "trd_lucy",
    rank: 5,
    displayName: "Lucy N.",
    loginId: "VRTC4471902",
    country: "South Africa",
    flag: "🇿🇦",
    winRate: 62.7,
    pnl30d: 1640.1,
    pnlAllTime: 9820.4,
    trades30d: 512,
    volume30d: 38900,
    strategy: "scalping",
    copies: 76,
    followers: 1180,
    risk: "medium",
    streak: 5,
    avgDuration: "15m",
    favouriteSymbol: "frxEURUSD",
    joinedAt: "2024-01-27",
    bio: "London-session FX scalper. One setup, one risk unit, hard daily stop.",
  },
  {
    id: "trd_ravi",
    rank: 6,
    displayName: "Ravi S.",
    loginId: "CR3310452",
    country: "India",
    flag: "🇮🇳",
    winRate: 61.3,
    pnl30d: 1408.75,
    pnlAllTime: 15320.9,
    trades30d: 688,
    volume30d: 51200,
    strategy: "accumulator",
    copies: 64,
    followers: 980,
    risk: "low",
    streak: 8,
    avgDuration: "5t",
    favouriteSymbol: "1HZ10V",
    joinedAt: "2023-04-11",
    bio: "1s-index accumulator specialist. Range width scaled to realised vol.",
  },
  {
    id: "trd_sofia",
    rank: 7,
    displayName: "Sofía M.",
    loginId: "VRTC1180233",
    country: "Colombia",
    flag: "🇨🇴",
    winRate: 60.4,
    pnl30d: 1245.6,
    pnlAllTime: 8642.3,
    trades30d: 356,
    volume30d: 29800,
    strategy: "dca",
    copies: 58,
    followers: 870,
    risk: "low",
    streak: 4,
    avgDuration: "2d",
    favouriteSymbol: "cryETHUSD",
    joinedAt: "2024-03-05",
    bio: "Weekly DCA on crypto multipliers. Max 2 live positions at a time.",
  },
  {
    id: "trd_hassan",
    rank: 8,
    displayName: "Hassan A.",
    loginId: "CR5598321",
    country: "Egypt",
    flag: "🇪🇬",
    winRate: 59.8,
    pnl30d: 1098.4,
    pnlAllTime: 11240.6,
    trades30d: 604,
    volume30d: 44100,
    strategy: "martingale",
    copies: 47,
    followers: 760,
    risk: "high",
    streak: 2,
    avgDuration: "5t",
    favouriteSymbol: "R_10",
    joinedAt: "2023-08-23",
    bio: "Volatility 10 martingale with 2.1x step and hard 50 USD cap per leg.",
  },
  {
    id: "trd_elena",
    rank: 9,
    displayName: "Elena K.",
    loginId: "VRTC6620417",
    country: "Romania",
    flag: "🇷🇴",
    winRate: 63.9,
    pnl30d: 962.15,
    pnlAllTime: 7218.4,
    trades30d: 288,
    volume30d: 26400,
    strategy: "swing",
    copies: 41,
    followers: 690,
    risk: "medium",
    streak: 7,
    avgDuration: "4h",
    favouriteSymbol: "frxGBPUSD",
    joinedAt: "2024-05-16",
    bio: "Mean-reversion on GBP crosses. Bollinger band edges only, no news trades.",
  },
  {
    id: "trd_diego",
    rank: 10,
    displayName: "Diego P.",
    loginId: "CR9023774",
    country: "Brazil",
    flag: "🇧🇷",
    winRate: 57.4,
    pnl30d: 788.9,
    pnlAllTime: 9840.25,
    trades30d: 742,
    volume30d: 39600,
    strategy: "scalping",
    copies: 33,
    followers: 540,
    risk: "medium",
    streak: 1,
    avgDuration: "20m",
    favouriteSymbol: "frxUSDJPY",
    joinedAt: "2023-12-02",
    bio: "Carry scalp on USD/JPY around Tokyo fix. Flat by London open.",
  },
  {
    id: "trd_amara",
    rank: 11,
    displayName: "Amara O.",
    loginId: "VRTC3390018",
    country: "Nigeria",
    flag: "🇳🇬",
    winRate: 55.9,
    pnl30d: 612.4,
    pnlAllTime: 5128.9,
    trades30d: 466,
    volume30d: 22100,
    strategy: "fixed",
    copies: 29,
    followers: 430,
    risk: "low",
    streak: 2,
    avgDuration: "1h",
    favouriteSymbol: "OTC_SPC",
    joinedAt: "2024-07-21",
    bio: "Passive fixed-stake index basket. Biweekly review, no discretionary adds.",
  },
  {
    id: "trd_jonas",
    rank: 12,
    displayName: "Jonas W.",
    loginId: "VRTC8801422",
    country: "Germany",
    flag: "🇩🇪",
    winRate: 68.2,
    pnl30d: 540.7,
    pnlAllTime: 18420.6,
    trades30d: 128,
    volume30d: 18900,
    strategy: "dca",
    copies: 22,
    followers: 390,
    risk: "low",
    streak: 11,
    avgDuration: "1d",
    favouriteSymbol: "OTC_DJI",
    joinedAt: "2022-09-30",
    bio: "Low-frequency index DCA. Sharpe-first, 0.5% risk per day maximum.",
  },
  {
    id: "trd_yuki",
    rank: 13,
    displayName: "Yuki T.",
    loginId: "CR1120876",
    country: "Japan",
    flag: "🇯🇵",
    winRate: 61.1,
    pnl30d: 488.25,
    pnlAllTime: 6390.4,
    trades30d: 214,
    volume30d: 16400,
    strategy: "digit",
    copies: 18,
    followers: 320,
    risk: "high",
    streak: 4,
    avgDuration: "10t",
    favouriteSymbol: "R_50",
    joinedAt: "2024-02-08",
    bio: "Over/Under digit model on Volatility 50. Only trades 9-tick windows.",
  },
  {
    id: "trd_priya",
    rank: 14,
    displayName: "Priya R.",
    loginId: "MX2290455",
    country: "India",
    flag: "🇮🇳",
    winRate: 59.2,
    pnl30d: 402.1,
    pnlAllTime: 4180.15,
    trades30d: 306,
    volume30d: 14800,
    strategy: "accumulator",
    copies: 14,
    followers: 260,
    risk: "medium",
    streak: 3,
    avgDuration: "5t",
    favouriteSymbol: "1HZ100V",
    joinedAt: "2024-09-12",
    bio: "Accumulator growth-rate tuner on 1s indices. Stops at 5 consecutive wins.",
  },
];

// -----------------------------------------------------------------------------
// Testimonials (social proof section — 12 records, filterable + paginated)
// -----------------------------------------------------------------------------
export interface Testimonial {
  id: string;
  name: string;
  role: string;
  country: string;
  flag: string;
  loginId: string;
  quote: string;
  rating: number;
  verified: boolean;
  winRate: number;
  monthlyPnl: number;
  automationHours: number;
  botsRunning: number;
  joinedAt: string;
  segment: "beginner" | "pro" | "algo" | "educator";
  detail: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "tst_01",
    name: "Adeola Fashola",
    role: "Index trend trader",
    country: "Nigeria",
    flag: "🇳🇬",
    loginId: "CR8842197",
    quote:
      "I moved my DCA baskets off the browser tab and onto DerivX. The bot restarts itself after a disconnect and the drawdown guard actually fires.",
    rating: 5,
    verified: true,
    winRate: 71.4,
    monthlyPnl: 4821.65,
    automationHours: 128,
    botsRunning: 3,
    joinedAt: "2023-02-14",
    segment: "pro",
    detail:
      "Runs three DCA bots across US Tech 100 and Wall Street 30. Uses the exposure cap to keep total open stake under $400 and exports the daily statement into his own bookkeeping sheet.",
  },
  {
    id: "tst_02",
    name: "Mina Larasati",
    role: "Tick scalper",
    country: "Indonesia",
    flag: "🇮🇩",
    loginId: "VRTC9031442",
    quote:
      "The script editor + backtester combo is what kept me. I can test a digit-differ edge over 10,000 ticks before a single cent goes live.",
    rating: 5,
    verified: true,
    winRate: 66.8,
    monthlyPnl: 3145.2,
    automationHours: 96,
    botsRunning: 2,
    joinedAt: "2023-06-02",
    segment: "algo",
    detail:
      "Power user of the sandboxed JS engine — writes her own digit models, runs them in the backtest runner with a 0.35 USD fixed stake, then deploys to a VRTC account first.",
  },
  {
    id: "tst_03",
    name: "Kwame Boateng",
    role: "Crypto grid trader",
    country: "Ghana",
    flag: "🇬🇭",
    loginId: "CR7714906",
    quote:
      "Live portfolio plus per-contract detail in one panel. I stopped keeping a separate spreadsheet for BTC grid legs.",
    rating: 5,
    verified: true,
    winRate: 64.2,
    monthlyPnl: 2760.9,
    automationHours: 72,
    botsRunning: 2,
    joinedAt: "2022-11-08",
    segment: "pro",
    detail:
      "Recalculates grid spacing weekly from ATR, keeps fixed $12 legs on BTC/USD and closes the whole grid before major macro prints.",
  },
  {
    id: "tst_04",
    name: "Tobi Rotimi",
    role: "Metals swing trader",
    country: "Kenya",
    flag: "🇰🇪",
    loginId: "MX5510883",
    quote:
      "Touch contracts used to be guesswork for me. Barrier preview before buying changed how I size gold positions.",
    rating: 4,
    verified: true,
    winRate: 58.1,
    monthlyPnl: 1892.35,
    automationHours: 54,
    botsRunning: 1,
    joinedAt: "2023-09-19",
    segment: "pro",
    detail:
      "Two-bar confirmation on XAU/USD with 8-hour Touch contracts. Uses the stop-loss preview to cap worst-case basket loss before entering.",
  },
  {
    id: "tst_05",
    name: "Lucy Nkosi",
    role: "London-session scalper",
    country: "South Africa",
    flag: "🇿🇦",
    loginId: "VRTC4471902",
    quote:
      "Session scheduler is the killer feature. My EUR/USD breakout bot only arms between 07:00 and 10:30 UTC — no more late-night fills.",
    rating: 5,
    verified: true,
    winRate: 62.7,
    monthlyPnl: 1640.1,
    automationHours: 41,
    botsRunning: 1,
    joinedAt: "2024-01-27",
    segment: "algo",
    detail:
      "Runs one setup with one risk unit and a hard daily stop. Tracks payout percentage per contract to pick the best window each morning.",
  },
  {
    id: "tst_06",
    name: "Ravi Shankar",
    role: "Accumulator specialist",
    country: "India",
    flag: "🇮🇳",
    loginId: "CR3310452",
    quote:
      "I trade the 1s volatility indices. Sub-second tick rendering and the growth-rate calculator make accumulators readable.",
    rating: 5,
    verified: true,
    winRate: 61.3,
    monthlyPnl: 1408.75,
    automationHours: 88,
    botsRunning: 2,
    joinedAt: "2023-04-11",
    segment: "algo",
    detail:
      "Scales the accumulator range width to realised volatility, stops after five consecutive wins and never runs more than one accumulator at a time.",
  },
  {
    id: "tst_07",
    name: "Sofía Marín",
    role: "Weekly DCA investor",
    country: "Colombia",
    flag: "🇨🇴",
    loginId: "VRTC1180233",
    quote:
      "It's the first automation tool I actually understood as a non-programmer. Presets, sane defaults, and a plain-English risk cap.",
    rating: 4,
    verified: false,
    winRate: 60.4,
    monthlyPnl: 1245.6,
    automationHours: 22,
    botsRunning: 1,
    joinedAt: "2024-03-05",
    segment: "beginner",
    detail:
      "Started on the virtual account with the fixed-stake preset, graduated to a small real allocation after 60 days of consistent results.",
  },
  {
    id: "tst_08",
    name: "Hassan Abdel",
    role: "Volatility martingale",
    country: "Egypt",
    flag: "🇪🇬",
    loginId: "CR5598321",
    quote:
      "The martingale table shows exactly how deep the ladder can go. I set the cap at $50 and the bot physically cannot exceed it.",
    rating: 4,
    verified: true,
    winRate: 59.8,
    monthlyPnl: 1098.4,
    automationHours: 63,
    botsRunning: 1,
    joinedAt: "2023-08-23",
    segment: "pro",
    detail:
      "2.1x step on Volatility 10 with a hard per-leg ceiling. Prefers tick-duration Rise/Fall because everything settles in seconds.",
  },
  {
    id: "tst_09",
    name: "Elena Kovács",
    role: "GBP mean-reversion",
    country: "Romania",
    flag: "🇷🇴",
    loginId: "VRTC6620417",
    quote:
      "Backtests let me kill two bad ideas in an afternoon. That alone paid for the Pro tier in a week.",
    rating: 5,
    verified: true,
    winRate: 63.9,
    monthlyPnl: 962.15,
    automationHours: 36,
    botsRunning: 1,
    joinedAt: "2024-05-16",
    segment: "algo",
    detail:
      "Runs Bollinger-edge entries on GBP/USD with a 4-hour window, evaluates each strategy on 90-day samples before going live.",
  },
  {
    id: "tst_10",
    name: "Diego Pires",
    role: "JPY carry scalper",
    country: "Brazil",
    flag: "🇧🇷",
    loginId: "CR9023774",
    quote:
      "Statement export is clean and the payout column matches Deriv to the cent. Reconciles without manual cleanup.",
    rating: 4,
    verified: true,
    winRate: 57.4,
    monthlyPnl: 788.9,
    automationHours: 29,
    botsRunning: 1,
    joinedAt: "2023-12-02",
    segment: "pro",
    detail:
      "Scalps USD/JPY around the Tokyo fix, flat by the London open. Uses the statement export to reconcile against broker records weekly.",
  },
  {
    id: "tst_11",
    name: "Amara Okonkwo",
    role: "Index basket investor",
    country: "Nigeria",
    flag: "🇳🇬",
    loginId: "VRTC3390018",
    quote:
      "I leave one fixed-stake basket running and check it twice a month. Quiet, boring, exactly what I wanted.",
    rating: 4,
    verified: false,
    winRate: 55.9,
    monthlyPnl: 612.4,
    automationHours: 12,
    botsRunning: 1,
    joinedAt: "2024-07-21",
    segment: "beginner",
    detail:
      "Passive fixed-stake exposure on US 500 with a biweekly review. Values the low-noise notification policy above all else.",
  },
  {
    id: "tst_12",
    name: "Jonas Weber",
    role: "Systematic index DCA",
    country: "Germany",
    flag: "🇩🇪",
    loginId: "VRTC8801422",
    quote:
      "Sharpe-first sizing, 0.5% daily risk, no discretion. DerivX is the only retail platform where I could enforce that cleanly.",
    rating: 5,
    verified: true,
    winRate: 68.2,
    monthlyPnl: 540.7,
    automationHours: 168,
    botsRunning: 4,
    joinedAt: "2022-09-30",
    segment: "educator",
    detail:
      "Runs four low-frequency DCA bots on Wall Street 30 and US 500, publishes a monthly risk report to a small private group.",
  },
];

// -----------------------------------------------------------------------------
// Pricing plans (H-3 preview — reused for the landing pricing dialog)
// -----------------------------------------------------------------------------
export interface Plan {
  id: string;
  name: string;
  price: number;
  cadence: "forever" | "monthly" | "yearly";
  blurb: string;
  bots: number;
  connections: number;
  backtestsPerDay: number;
  features: string[];
  popular: boolean;
  tier: "free" | "pro" | "desk" | "institutional";
}

export const PLANS: Plan[] = [
  {
    id: "plan_free",
    name: "Starter",
    price: 0,
    cadence: "forever",
    blurb: "Manual trading plus one automation slot — no card required.",
    bots: 1,
    connections: 1,
    backtestsPerDay: 3,
    features: [
      "1 live bot",
      "1 Deriv connection (virtual or real)",
      "Full market access: synthetics, forex, crypto, indices",
      "3 backtests per day",
      "Community leaderboard access",
    ],
    popular: false,
    tier: "free",
  },
  {
    id: "plan_pro",
    name: "Pro Trader",
    price: 29,
    cadence: "monthly",
    blurb: "Unlimited bots, the script engine and priority tick streaming.",
    bots: 20,
    connections: 5,
    backtestsPerDay: 100,
    features: [
      "20 live bots + unlimited saved scripts",
      "5 Deriv connections (real + virtual)",
      "Script engine with sandboxed JS + presets",
      "100 backtests per day, 2-year tick history",
      "Copy-trade up to 5 traders",
      "CSV / PDF statement export",
    ],
    popular: true,
    tier: "pro",
  },
  {
    id: "plan_desk",
    name: "Trading Desk",
    price: 79,
    cadence: "monthly",
    blurb: "For funded traders running multiple strategies and accounts.",
    bots: 100,
    connections: 15,
    backtestsPerDay: 1000,
    features: [
      "100 live bots across 15 connections",
      "Automation hub: schedules, triggers, webhooks",
      "Pooled risk engine with desk-level exposure caps",
      "Unlimited backtests + walk-forward optimiser",
      "Team seats (3) with audit log",
      "Priority WebSocket lane (sub-100ms tick relay)",
    ],
    popular: false,
    tier: "desk",
  },
  {
    id: "plan_institutional",
    name: "Institutional",
    price: 249,
    cadence: "monthly",
    blurb: "Investor module, API keys and dedicated infrastructure.",
    bots: 500,
    connections: 60,
    backtestsPerDay: 10000,
    features: [
      "Investor module: pools, schedules, payouts, KYC",
      "Public API keys + webhook stream",
      "Dedicated bot workers (no shared queue)",
      "SLA 99.95% + incident channel",
      "Unlimited team seats, SSO-ready",
      "Custom contract-type extensions",
    ],
    popular: false,
    tier: "institutional",
  },
];

// -----------------------------------------------------------------------------
// FAQ (accordion + modal content on H-1)
// -----------------------------------------------------------------------------
export interface Faq {
  id: string;
  category: "getting-started" | "trading" | "automation" | "security" | "billing";
  question: string;
  answer: string;
}

export const FAQS: Faq[] = [
  {
    id: "faq_01",
    category: "getting-started",
    question: "Do I need a Deriv account to use DerivX?",
    answer:
      "Yes. DerivX is a third-party interface that connects to your existing Deriv account through Deriv's OAuth2 flow. You can start on a virtual account (VRTC) and switch to a real account (CR) later without losing your bots or scripts.",
  },
  {
    id: "faq_02",
    category: "getting-started",
    question: "Is DerivX affiliated with Deriv?",
    answer:
      "No. DerivX is an independent platform that trades through Deriv's public WebSocket API. Contract pricing, settlement and payouts are always executed by Deriv — DerivX never holds your funds.",
  },
  {
    id: "faq_03",
    category: "trading",
    question: "Which markets and contract types can I trade?",
    answer:
      "All Deriv contract types: Rise/Fall, Higher/Lower, Touch/No Touch, Digits, Ends Between/Outside, Stays Between/Goes Outside, Even/Odd, Over/Under, Lookback, Accumulator and Multiplier — across synthetics (R_10…R_100, 1HZ indices), forex, crypto, commodities and OTC indices.",
  },
  {
    id: "faq_04",
    category: "trading",
    question: "What are realistic durations?",
    answer:
      "1–10 ticks, 15 seconds to 60 minutes, 1–24 hours, or 1–365 days depending on the contract type. Tick durations settle fastest and are only available on the synthetics indices.",
  },
  {
    id: "faq_05",
    category: "automation",
    question: "How does the bot engine execute trades?",
    answer:
      "Each bot is a stateful worker on an isolated queue. It receives ticks over a dedicated WebSocket, evaluates your strategy, requests a proposal, then buys the contract. If the socket drops, the bot reconnects with the same idempotency key so a contract is never bought twice.",
  },
  {
    id: "faq_06",
    category: "automation",
    question: "Can I write my own strategy code?",
    answer:
      "Yes — the script engine runs sandboxed JavaScript (VM2) with a small DerivX API surface: tick/bar subscriptions, indicators, buy, sell, risk assertions and schedules. Scripts cannot make network calls or read the filesystem.",
  },
  {
    id: "faq_07",
    category: "automation",
    question: "What happens if my risk limit is breached?",
    answer:
      "The risk engine evaluates exposure before every proposal. If a stake would breach your cap, the order is rejected, the bot pauses and you get one notification. Nothing is force-closed without your confirmation.",
  },
  {
    id: "faq_08",
    category: "security",
    question: "Where are my Deriv tokens stored?",
    answer:
      "OAuth tokens are encrypted at rest with a per-user key and used only for the API calls your bot needs. You can revoke access from Deriv's app manager or from Settings → Connections at any time, which immediately halts all bots.",
  },
  {
    id: "faq_09",
    category: "security",
    question: "Do you support 2FA and session controls?",
    answer:
      "Yes — TOTP two-factor authentication, per-device sessions with revoke, IP allow-listing on paid tiers, and an audit log of every connection, script deploy and bot action.",
  },
  {
    id: "faq_10",
    category: "billing",
    question: "Do you take a cut of my profits?",
    answer:
      "Never. DerivX is a flat subscription. Your contracts settle directly in your Deriv account, and the platform has no access to profit share or commissions beyond what Deriv pays its own IB programme.",
  },
  {
    id: "faq_11",
    category: "billing",
    question: "Can I cancel or switch tiers mid-cycle?",
    answer:
      "Yes. Downgrades take effect at the end of the billing period and your bots keep running on the current limits until then. Upgrades apply instantly and are pro-rated to the day.",
  },
  {
    id: "faq_12",
    category: "trading",
    question: "What is the minimum stake?",
    answer:
      "Deriv's minimum stake is $0.35 for most synthetic Rise/Fall contracts, which makes tick-duration strategies testable at very low cost. Payouts are quoted as a percentage of stake before you confirm.",
  },
];

// -----------------------------------------------------------------------------
// API health (live status drawer on H-1, reused on D-11)
// -----------------------------------------------------------------------------
export interface ApiEndpoint {
  id: string;
  request: string;
  channel: "auth" | "market" | "trading" | "portfolio" | "utility";
  latencyMs: number;
  uptimePct: number;
  calls24h: number;
  status: "operational" | "degraded" | "maintenance";
}

export const API_ENDPOINTS: ApiEndpoint[] = [
  { id: "ep_01", request: "active_symbols", channel: "market", latencyMs: 38, uptimePct: 99.99, calls24h: 128400, status: "operational" },
  { id: "ep_02", request: "ticks_history", channel: "market", latencyMs: 74, uptimePct: 99.97, calls24h: 86210, status: "operational" },
  { id: "ep_03", request: "tick (stream)", channel: "market", latencyMs: 12, uptimePct: 99.99, calls24h: 8420000, status: "operational" },
  { id: "ep_04", request: "proposal", channel: "trading", latencyMs: 61, uptimePct: 99.95, calls24h: 394120, status: "operational" },
  { id: "ep_05", request: "buy", channel: "trading", latencyMs: 88, uptimePct: 99.93, calls24h: 128940, status: "operational" },
  { id: "ep_06", request: "sell", channel: "trading", latencyMs: 92, uptimePct: 99.9, calls24h: 41208, status: "degraded" },
  { id: "ep_07", request: "portfolio (stream)", channel: "portfolio", latencyMs: 26, uptimePct: 99.98, calls24h: 1204000, status: "operational" },
  { id: "ep_08", request: "statement", channel: "portfolio", latencyMs: 142, uptimePct: 99.88, calls24h: 28740, status: "operational" },
  { id: "ep_09", request: "authorize", channel: "auth", latencyMs: 118, uptimePct: 99.96, calls24h: 18420, status: "operational" },
  { id: "ep_10", request: "balance (stream)", channel: "portfolio", latencyMs: 21, uptimePct: 99.99, calls24h: 640200, status: "operational" },
  { id: "ep_11", request: "website_status", channel: "utility", latencyMs: 9, uptimePct: 100, calls24h: 96200, status: "operational" },
  { id: "ep_12", request: "time", channel: "utility", latencyMs: 8, uptimePct: 100, calls24h: 48200, status: "maintenance" },
];

// -----------------------------------------------------------------------------
// Legal / policy documents (footer links must open real content)
// -----------------------------------------------------------------------------
export interface LegalDoc {
  id: string;
  title: string;
  updated: string;
  summary: string;
  sections: { heading: string; body: string }[];
}

export const LEGAL_DOCS: LegalDoc[] = [
  {
    id: "terms",
    title: "Terms of Service",
    updated: "2026-09-02",
    summary: "How the DerivX platform may be used, and the limits of our liability.",
    sections: [
      {
        heading: "1. What DerivX is",
        body: "DerivX is a software interface that places orders on your behalf through Deriv's public WebSocket API. We are not a broker, dealer, exchange or investment adviser. Every contract is issued, priced and settled by Deriv under your own Deriv account.",
      },
      {
        heading: "2. Your account and credentials",
        body: "You authenticate by granting DerivX OAuth2 access to your Deriv account. You are responsible for keeping your Deriv credentials private and for reviewing the scopes you grant. You may revoke access at any time from Deriv's app manager or from Settings → Connections.",
      },
      {
        heading: "3. Automated trading risk",
        body: "Bots and scripts execute without human confirmation. A defect in a strategy, a misinterpreted parameter or a connectivity failure can cause repeated losses. You must set stake caps and stop-loss limits appropriate to your capital, and you accept that all automated orders are yours.",
      },
      {
        heading: "4. Subscriptions and refunds",
        body: "Paid tiers are billed in advance. Upgrades are pro-rated; downgrades apply at the end of the current period. Unused subscription time is refundable within 14 days of purchase provided fewer than 200 automated orders were executed in that period.",
      },
      {
        heading: "5. Availability and liability",
        body: "We target 99.9% platform availability but do not guarantee uninterrupted service. To the maximum extent permitted by law our aggregate liability is limited to the subscription fees you paid in the preceding three months.",
      },
      {
        heading: "6. Acceptable use",
        body: "You may not use DerivX to place orders for third parties without written consent, to manipulate market data, to circumvent Deriv's own terms, or to run strategies that target platform latency artefacts.",
      },
    ],
  },
  {
    id: "privacy",
    title: "Privacy Policy",
    updated: "2026-08-18",
    summary: "What we collect, why, how long we keep it, and how to get it deleted.",
    sections: [
      {
        heading: "Data we collect",
        body: "Account identifiers (Deriv login ID, email), OAuth tokens (encrypted at rest), your platform configuration (bots, scripts, risk limits), order and settlement records mirrored from Deriv, and technical telemetry (session, device, IP).",
      },
      {
        heading: "What we never collect",
        body: "We never ask for or store your Deriv password, card details, bank credentials, or the private keys of any wallet. Payments are handled by our PCI-DSS compliant processor.",
      },
      {
        heading: "Why we process it",
        body: "To execute your orders, reconcile statements, run backtests, enforce risk limits, provide support, and meet our legal and tax obligations. We do not sell personal data, and we do not run third-party advertising pixels on authenticated pages.",
      },
      {
        heading: "Retention",
        body: "Order records are kept for 7 years for regulatory reasons. Telemetry is kept for 90 days. Deleting your account removes configuration, scripts and tokens within 30 days, except records we are legally required to retain.",
      },
      {
        heading: "Your rights",
        body: "You can export a complete data bundle (JSON + CSV) at any time from Settings → Data, and you can request erasure from the same screen. Requests are acknowledged within 72 hours and completed within 30 days.",
      },
    ],
  },
  {
    id: "risk",
    title: "Risk Disclosure",
    updated: "2026-07-30",
    summary: "Leverage, digital options and automated strategies can lose money quickly.",
    sections: [
      {
        heading: "Options carry defined but repeatable risk",
        body: "Digital options either settle at the payout or expire worthless. A strategy with a 70% win rate still produces long losing runs: at 5,000 trades, a 12-trade losing streak is expected. Size stakes against the streak, not the average.",
      },
      {
        heading: "Leverage magnifies losses",
        body: "Multiplier contracts can lose more than the initial stake if stop-out is not configured. Always set a stop-out at or below the stake you are willing to lose, and never disable it on a running contract.",
      },
      {
        heading: "Volatility indices are synthetic",
        body: "Synthetic indices (R_10 … R_100, 1HZ series) are generated by Deriv's random number generator, not by any underlying market. They are available 24/7 and can move faster than real instruments.",
      },
      {
        heading: "Automation failures are possible",
        body: "Connectivity drops, host restarts and strategy defects can all interrupt automation. Keep a manual kill switch, set a maximum number of open concurrent contracts, and monitor your open stake.",
      },
      {
        heading: "Not investment advice",
        body: "Nothing on this platform constitutes investment advice or a recommendation to trade any contract. Past performance, backtests and leaderboard statistics are not indicative of future results.",
      },
    ],
  },
  {
    id: "cookies",
    title: "Cookie & Storage Policy",
    updated: "2026-06-11",
    summary: "Strictly necessary storage plus opt-in analytics.",
    sections: [
      {
        heading: "Strictly necessary",
        body: "Session cookie (authenticated routes), CSRF token, theme preference and the local storage entry that keeps bot drafts in the editor. These cannot be disabled while you are signed in.",
      },
      {
        heading: "Analytics (opt-in)",
        body: "Aggregated page performance and error reporting, set only after you enable it in the cookie banner. No cross-site identifiers, no advertising profiles, no data sold to third parties.",
      },
      {
        heading: "Trading telemetry",
        body: "Latency samples from proposal and buy round-trips are recorded to show you the execution quality panel. They contain contract IDs, never stake amounts tied to your identity.",
      },
      {
        heading: "Managing storage",
        body: "You can clear platform storage from Settings → Privacy. Clearing the strictly necessary cookie signs you out; clearing drafts is permanent.",
      },
    ],
  },
];

// -----------------------------------------------------------------------------
// Strategy presets (bot gallery + wizard content)
// -----------------------------------------------------------------------------
export interface StrategyPreset {
  id: string;
  name: string;
  kind: Bot["strategy"];
  symbol: string;
  contractType: ContractTypeId;
  stake: number;
  duration: number;
  durationUnit: DurationUnit;
  risk: "low" | "medium" | "high";
  winRate: number;
  avgPnl: number;
  description: string;
  rules: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
}

export const STRATEGY_PRESETS: StrategyPreset[] = [
  {
    id: "pre_mart_vol10",
    name: "Volatility 10 Martingale",
    kind: "martingale",
    symbol: "R_10",
    contractType: "rise_fall",
    stake: 0.35,
    duration: 5,
    durationUnit: "ticks",
    risk: "medium",
    winRate: 68.4,
    avgPnl: 12.4,
    description: "Doubles stake on a loss, resets on a win, hard cap at $50 per leg. The classic Deriv starter bot.",
    rules: ["5-tick Rise/Fall on R_10", "2.1x step after a loss, reset after a win", "Hard stake cap $50 · stop-loss $250"],
    difficulty: "beginner",
  },
  {
    id: "pre_dca_index",
    name: "Index DCA Basket",
    kind: "dca",
    symbol: "OTC_NDX",
    contractType: "higher_lower",
    stake: 20,
    duration: 1,
    durationUnit: "days",
    risk: "medium",
    winRate: 61.7,
    avgPnl: 48.2,
    description: "Adds one leg per day while price stays above the 20-day mean; scales out at target.",
    rules: ["Daily Higher/Lower at +0.15% barrier", "1.25x add step, maximum 4 legs", "Scales out at +12% basket P&L"],
    difficulty: "intermediate",
  },
  {
    id: "pre_digit_differ",
    name: "Digit Differ 5",
    kind: "digit",
    symbol: "R_25",
    contractType: "digits",
    stake: 1,
    duration: 3,
    durationUnit: "ticks",
    risk: "high",
    winRate: 88.9,
    avgPnl: 8.6,
    description: "Differ contracts excluding the two least frequent digits in the last 1,000 ticks.",
    rules: ["DIGITDIFFER on barrier 5", "3-tick duration, flat stake $1", "Recalibrates digit frequency every 1,000 ticks"],
    difficulty: "advanced",
  },
  {
    id: "pre_accu_1hz",
    name: "1s Accumulator Sniper",
    kind: "accumulator",
    symbol: "1HZ10V",
    contractType: "accumulator",
    stake: 3,
    duration: 5,
    durationUnit: "ticks",
    risk: "low",
    winRate: 82.1,
    avgPnl: 1.05,
    description: "Rides the ±0.1% range on the 1-second index, taking profit after 5 consecutive in-range ticks.",
    rules: ["5-tick Accumulator, 3% growth rate", "Exit on first range break", "Max 1 live accumulator at a time"],
    difficulty: "beginner",
  },
  {
    id: "pre_breakout_fx",
    name: "London FX Breakout",
    kind: "scalping",
    symbol: "frxEURUSD",
    contractType: "rise_fall",
    stake: 25,
    duration: 15,
    durationUnit: "minutes",
    risk: "medium",
    winRate: 57.6,
    avgPnl: 34.1,
    description: "Arms only in the 07:00–10:30 UTC window and trades the first break of the 4-hour Asian range.",
    rules: ["Session 07:00–10:30 UTC", "15-minute Rise/Fall at the range break", "1.6x recovery step, exposure cap $150"],
    difficulty: "intermediate",
  },
  {
    id: "pre_touch_gold",
    name: "Gold Touch Ladder",
    kind: "swing",
    symbol: "frxXAUUSD",
    contractType: "touch",
    stake: 20,
    duration: 8,
    durationUnit: "hours",
    risk: "high",
    winRate: 48.7,
    avgPnl: 52.4,
    description: "Eight-hour one-touch contracts at $5.40 above spot, laddered while the daily bias holds.",
    rules: ["One-touch barrier spot +5.40", "8-hour expiry, 1.5x ladder", "Disabled during CPI/NFP windows"],
    difficulty: "advanced",
  },
  {
    id: "pre_grid_btc",
    name: "BTC Fixed Grid",
    kind: "fixed",
    symbol: "cryBTCUSD",
    contractType: "rise_fall",
    stake: 12,
    duration: 30,
    durationUnit: "minutes",
    risk: "medium",
    winRate: 59.2,
    avgPnl: 18.9,
    description: "Fixed-stake 30-minute Rise/Fall grid recalculated weekly from ATR.",
    rules: ["30-minute Rise/Fall, $12 flat", "Grid spacing from 14-day ATR", "Halts if drawdown exceeds $350"],
    difficulty: "intermediate",
  },
  {
    id: "pre_mult_eth",
    name: "ETH Multiplier Trend",
    kind: "dca",
    symbol: "cryETHUSD",
    contractType: "multiplier",
    stake: 60,
    duration: 2,
    durationUnit: "days",
    risk: "high",
    winRate: 60.9,
    avgPnl: 96.4,
    description: "50x multiplier with stop-out at half the stake and take-profit at 1.5x.",
    rules: ["50x multiplier, 2-day horizon", "Stop-out 0.5x stake · TP 1.5x", "Maximum 2 concurrent legs"],
    difficulty: "advanced",
  },
  {
    id: "pre_meanrev_gbp",
    name: "GBP Mean Reversion",
    kind: "scalping",
    symbol: "frxGBPUSD",
    contractType: "rise_fall",
    stake: 8,
    duration: 1,
    durationUnit: "hours",
    risk: "medium",
    winRate: 63.4,
    avgPnl: 11.2,
    description: "Fades 1.5-sigma deviations from the 60-tick mean on GBP/USD.",
    rules: ["z-score > 1.5 → PUT, < -1.5 → CALL", "1-hour duration, $8 flat", "Daily stop at -$120"],
    difficulty: "intermediate",
  },
  {
    id: "pre_night_vol100",
    name: "Vol100 Night Shift",
    kind: "martingale",
    symbol: "R_100",
    contractType: "rise_fall",
    stake: 2,
    duration: 1,
    durationUnit: "minutes",
    risk: "high",
    winRate: 52.6,
    avgPnl: -14.6,
    description: "Aggressive 2.4x ladder on 1-minute Rise/Fall — included as a cautionary preset.",
    rules: ["1-minute Rise/Fall on R_100", "2.4x step, cap $120", "Example of a preset that breached its stop-loss"],
    difficulty: "advanced",
  },
];

// -----------------------------------------------------------------------------
// Platform activity feed + community + trust stats
// -----------------------------------------------------------------------------
export interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  target: string;
  epoch: number;
  tone: "up" | "info" | "warn" | "accent";
}

export const ACTIVITY_FEED: ActivityItem[] = [
  { id: "act_01", actor: "Ade F.", action: "closed a winning basket on", target: "OTC_NDX · +$412.18", epoch: min(3), tone: "up" },
  { id: "act_02", actor: "system", action: "deployed script", target: "Accumulator Range Keeper v4", epoch: min(11), tone: "accent" },
  { id: "act_03", actor: "Mina L.", action: "hit a 9-trade win streak on", target: "R_25 Digits", epoch: min(16), tone: "up" },
  { id: "act_04", actor: "risk engine", action: "paused bot after exposure cap", target: "Vol100 Night Shift", epoch: min(28), tone: "warn" },
  { id: "act_05", actor: "Kwame B.", action: "started copying", target: "Ade F. (0.5x size)", epoch: min(47), tone: "info" },
  { id: "act_06", actor: "system", action: "backtest finished", target: "GBP Mean Reversion · 186 trades · 63.4%", epoch: min(58), tone: "accent" },
  { id: "act_07", actor: "Lucy N.", action: "opened a London breakout on", target: "frxEURUSD · $25 stake", epoch: min(72), tone: "info" },
  { id: "act_08", actor: "Tobi R.", action: "sold an open contract early on", target: "frxXAUUSD · -$3.20 slippage", epoch: min(96), tone: "warn" },
  { id: "act_09", actor: "Ravi S.", action: "reached +$1,408 in 30-day P&L", target: "1HZ10V Accumulators", epoch: min(140), tone: "up" },
  { id: "act_10", actor: "system", action: "added a new market", target: "Japan 225 (OTC)", epoch: min(184), tone: "accent" },
  { id: "act_11", actor: "Sofía M.", action: "graduated to a real account", target: "VRTC1180233 → CR9034118", epoch: min(220), tone: "info" },
  { id: "act_12", actor: "risk engine", action: "sent a margin-call warning on", target: "ETH Multiplier 50x", epoch: min(268), tone: "warn" },
];

export interface CommunityChannel {
  id: string;
  name: string;
  members: number;
  messages24h: number;
  description: string;
  topics: string[];
  moderated: boolean;
}

export const COMMUNITY_CHANNELS: CommunityChannel[] = [
  {
    id: "com_general",
    name: "Trading Floor",
    members: 18420,
    messages24h: 1284,
    description: "General market chatter, session opens, volatility warnings.",
    topics: ["#session-open", "#volatility", "#payouts"],
    moderated: true,
  },
  {
    id: "com_bots",
    name: "Bots & Strategies",
    members: 9640,
    messages24h: 812,
    description: "Bot configs, martingale safety, preset reviews and share links.",
    topics: ["#martingale", "#dca", "#presets"],
    moderated: true,
  },
  {
    id: "com_scripts",
    name: "Script Engine Dev",
    members: 5210,
    messages24h: 402,
    description: "Sandboxed JS API questions, indicator adapters, backtest results.",
    topics: ["#api", "#indicators", "#backtests"],
    moderated: true,
  },
  {
    id: "com_investors",
    name: "Pool & Investors",
    members: 2180,
    messages24h: 168,
    description: "Investor module: pool plans, schedules, payouts and compliance.",
    topics: ["#pools", "#payouts", "#kyc"],
    moderated: true,
  },
  {
    id: "com_help",
    name: "Support & Onboarding",
    members: 24180,
    messages24h: 1640,
    description: "OAuth issues, connection errors, stake caps and account questions.",
    topics: ["#oauth", "#connections", "#risk-limits"],
    moderated: true,
  },
];

export interface TrustStat {
  id: string;
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  note: string;
}

export const TRUST_STATS: TrustStat[] = [
  { id: "ts_api", label: "Powered by Deriv API", value: 99.99, suffix: "% uptime", decimals: 2, note: "ws.derivws.com relay, 12ms median tick latency" },
  { id: "ts_enc", label: "256-bit Encryption", value: 256, suffix: "-bit AES", note: "OAuth tokens encrypted at rest, TLS 1.3 in transit" },
  { id: "ts_traders", label: "Registered traders", value: 18420, note: "+412 this week across 46 countries" },
  { id: "ts_auto", label: "Automation runtime", value: 24, suffix: "/7", note: "Bots keep trading while you sleep — 4,180 bots live now" },
];

export interface TourSlide {
  id: string;
  title: string;
  blurb: string;
  bullets: string[];
  screen: "trade" | "bots" | "portfolio" | "analytics" | "social";
  durationLabel: string;
}

export const TOUR_SLIDES: TourSlide[] = [
  {
    id: "tour_trade",
    title: "Place a contract in four clicks",
    blurb:
      "Pick a symbol, choose the contract type, set stake and duration, then review the Deriv proposal before you confirm — payout, entry spot and barrier all shown up front.",
    bullets: [
      "All 11 Deriv contract types with barrier preview",
      "Live payout % that updates with every tick",
      "Idempotency key on every buy — no duplicate contracts",
    ],
    screen: "trade",
    durationLabel: "0:42",
  },
  {
    id: "tour_bots",
    title: "Run bots without babysitting them",
    blurb:
      "Start from a preset, tune stake and risk caps, then let the worker handle proposals, buys and restarts. Every action lands in the bot log with a timestamp.",
    bullets: ["10 preset strategies, from martingale to accumulators", "Hard stake cap + stop-loss enforced in the engine", "Auto-reconnect with the same idempotency key"],
    screen: "bots",
    durationLabel: "1:05",
  },
  {
    id: "tour_portfolio",
    title: "See every open contract in one tape",
    blurb:
      "Open stakes, floating P&L, barriers and expiry countdowns across all your Deriv connections — drill into any row for the full contract receipt.",
    bullets: ["Live floating P&L with tick-level updates", "Barrier distance and time-to-expiry columns", "Close early with a confirm dialog, never by accident"],
    screen: "portfolio",
    durationLabel: "0:51",
  },
  {
    id: "tour_analytics",
    title: "Prove the edge before you scale",
    blurb:
      "Equity curves, win-rate by contract type, payout efficiency and drawdown recovery — plus a backtest runner over two years of tick history.",
    bullets: ["Equity curve + drawdown bands", "Win rate split by symbol and duration", "Walk-forward backtests on 2-year tick history"],
    screen: "analytics",
    durationLabel: "0:58",
  },
  {
    id: "tour_social",
    title: "Follow the crowd, copy what works",
    blurb:
      "Ranked leaderboard with verified statements, per-trader risk profile and one-click copy trade that mirrors positions at your own stake ratio.",
    bullets: ["Verified P&L, not screenshots", "Copy with an independent stake multiplier", "Kill switch closes every copied leg instantly"],
    screen: "social",
    durationLabel: "0:47",
  },
];

// -----------------------------------------------------------------------------
// Demo console + backtest results
// -----------------------------------------------------------------------------
export interface BacktestResult {
  id: string;
  preset: string;
  symbol: string;
  contractType: ContractTypeId;
  period: string;
  trades: number;
  winRate: number;
  pnl: number;
  maxDrawdown: number;
  sharpe: number;
  avgDuration: string;
  status: "complete" | "running" | "queued";
}

export const BACKTESTS: BacktestResult[] = [
  { id: "bt_01", preset: "Volatility 10 Martingale", symbol: "R_10", contractType: "rise_fall", period: "2026-04-01 → 2026-10-01", trades: 4218, winRate: 68.4, pnl: 1284.6, maxDrawdown: -318.4, sharpe: 1.42, avgDuration: "5t", status: "complete" },
  { id: "bt_02", preset: "Index DCA Basket", symbol: "OTC_NDX", contractType: "higher_lower", period: "2025-10-01 → 2026-10-01", trades: 412, winRate: 61.7, pnl: 4128.2, maxDrawdown: -642.9, sharpe: 1.18, avgDuration: "1d", status: "complete" },
  { id: "bt_03", preset: "Digit Differ 5", symbol: "R_25", contractType: "digits", period: "2026-07-01 → 2026-10-01", trades: 9840, winRate: 88.9, pnl: 862.4, maxDrawdown: -188.2, sharpe: 2.06, avgDuration: "3t", status: "complete" },
  { id: "bt_04", preset: "1s Accumulator Sniper", symbol: "1HZ10V", contractType: "accumulator", period: "2026-08-01 → 2026-10-01", trades: 2864, winRate: 82.1, pnl: 314.8, maxDrawdown: -82.4, sharpe: 1.88, avgDuration: "5t", status: "complete" },
  { id: "bt_05", preset: "London FX Breakout", symbol: "frxEURUSD", contractType: "rise_fall", period: "2026-04-01 → 2026-10-01", trades: 268, winRate: 57.6, pnl: 968.4, maxDrawdown: -412.6, sharpe: 0.94, avgDuration: "15m", status: "complete" },
  { id: "bt_06", preset: "Gold Touch Ladder", symbol: "frxXAUUSD", contractType: "touch", period: "2026-01-01 → 2026-10-01", trades: 146, winRate: 48.7, pnl: -286.4, maxDrawdown: -684.2, sharpe: -0.38, avgDuration: "8h", status: "complete" },
  { id: "bt_07", preset: "BTC Fixed Grid", symbol: "cryBTCUSD", contractType: "rise_fall", period: "2026-04-01 → 2026-10-01", trades: 802, winRate: 59.2, pnl: 2184.2, maxDrawdown: -386.4, sharpe: 1.24, avgDuration: "30m", status: "complete" },
  { id: "bt_08", preset: "ETH Multiplier Trend", symbol: "cryETHUSD", contractType: "multiplier", period: "2025-10-01 → 2026-10-01", trades: 92, winRate: 60.9, pnl: 3025.5, maxDrawdown: -742.8, sharpe: 1.06, avgDuration: "2d", status: "complete" },
  { id: "bt_09", preset: "GBP Mean Reversion", symbol: "frxGBPUSD", contractType: "rise_fall", period: "2026-07-01 → 2026-10-01", trades: 372, winRate: 63.4, pnl: 643.2, maxDrawdown: -196.4, sharpe: 1.36, avgDuration: "1h", status: "complete" },
  { id: "bt_10", preset: "Vol100 Night Shift", symbol: "R_100", contractType: "rise_fall", period: "2026-07-01 → 2026-10-01", trades: 536, winRate: 52.6, pnl: -1842.4, maxDrawdown: -1928.6, sharpe: -1.12, avgDuration: "1m", status: "complete" },
  { id: "bt_11", preset: "Vol75 Touch Sniper", symbol: "R_75", contractType: "touch", period: "2026-08-01 → 2026-10-01", trades: 304, winRate: 48.7, pnl: 749.2, maxDrawdown: -284.4, sharpe: 1.02, avgDuration: "2h", status: "running" },
  { id: "bt_12", preset: "Japan 225 Range Fade", symbol: "OTC_N225", contractType: "stays_between", period: "2026-09-01 → 2026-10-01", trades: 0, winRate: 0, pnl: 0, maxDrawdown: 0, sharpe: 0, avgDuration: "2h", status: "queued" },
];

/** Equity curve for analytics previews (deterministic). */
export function equityCurve(points = 40, seed = 20261013, start = 1000, drift = 4.2): number[] {
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out: number[] = [];
  let value = start;
  for (let i = 0; i < points; i++) {
    value += drift + (rand() - 0.5) * 26;
    out.push(Math.max(200, Math.round(value * 100) / 100));
  }
  return out;
}

export const STATS = {
  traders: 18420,
  botsLive: 4180,
  countries: 46,
  contractsSettled: 12_842_119,
  avgTickLatencyMs: 12,
  medPayoutPct: 95.2,
  assets: MARKET_SYMBOLS.length,
  contractTypes: 11,
};
