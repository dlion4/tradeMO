// =============================================================================
// src/data/trading.ts — Deriv trading-domain mock data (trades, positions,
// bots, scripts, traders, testimonials, plans, API health, legal docs).
// FRONT-END ONLY: shapes mirror the Deriv WS API payloads so a later swap to
// the live socket only replaces the fetch layer.
// =============================================================================
import {
  MARKET_SYMBOLS,
  fmtDur,
  mulberry32,
  seedFrom,
  usd,
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

// =============================================================================
// H-2 (/features) — deep-dive datasets. FRONT-END ONLY, mock data.
// Shapes mirror the Deriv WS payloads already used above; the fetch layer can
// be swapped for the live socket without touching the features page.
// =============================================================================

// -----------------------------------------------------------------------------
// Automation rules (schedules, conditional triggers, risk guards, alerts)
// -----------------------------------------------------------------------------
export type AutomationKind = "schedule" | "trigger" | "risk" | "notification";

export interface AutomationRule {
  id: string;
  name: string;
  kind: AutomationKind;
  botName: string;
  symbol: string;
  trigger: string;
  condition: string;
  action: string;
  status: "enabled" | "paused";
  fires30d: number;
  lastFiredAt: number;
  loginId: string;
}

export const AUTOMATION_RULES: AutomationRule[] = [
  { id: "auto_01", name: "London open arm — FX Breakout", kind: "schedule", botName: "FX London Breakout", symbol: "frxEURUSD", trigger: "Weekdays 07:00 UTC", condition: "4h Asian range intact", action: "Arm bot, stake $25, 15m Rise/Fall", status: "enabled", fires30d: 22, lastFiredAt: min(38), loginId: "VRTC9031442" },
  { id: "auto_02", name: "Vol10 loss-streak brake", kind: "risk", botName: "Vol10 Martingale Core", symbol: "R_10", trigger: "3 consecutive losses", condition: "Open stake would exceed $50 cap", action: "Pause bot, notify owner, log breach", status: "enabled", fires30d: 9, lastFiredAt: min(64), loginId: "VRTC9031442" },
  { id: "auto_03", name: "BTC grid weekly recalibration", kind: "schedule", botName: "BTC Grid Runner", symbol: "cryBTCUSD", trigger: "Sundays 00:05 UTC", condition: "14-day ATR moved > 8%", action: "Recalculate grid spacing, restart worker", status: "enabled", fires30d: 4, lastFiredAt: min(2880), loginId: "VRTC9031442" },
  { id: "auto_04", name: "Gold CPI blackout", kind: "trigger", botName: "Gold Swing Basket", symbol: "frxXAUUSD", trigger: "US CPI / NFP release window", condition: "Release within ±30 minutes", action: "Block new Touch contracts, keep exits open", status: "enabled", fires30d: 2, lastFiredAt: min(8640), loginId: "CR8842197" },
  { id: "auto_05", name: "Accumulator range-break exit", kind: "trigger", botName: "Accu Sniper 1HZ", symbol: "1HZ10V", trigger: "Tick exits ±0.1% range", condition: "1 open accumulator leg", action: "Settle leg, halt re-entry for 60 ticks", status: "enabled", fires30d: 148, lastFiredAt: min(7), loginId: "MX5510883" },
  { id: "auto_06", name: "Daily drawdown circuit-breaker", kind: "risk", botName: "All bots · CR8842197", symbol: "R_100", trigger: "Realised P&L below -$250 today", condition: "Across every bot on the account", action: "Stop all workers, require manual restart", status: "enabled", fires30d: 1, lastFiredAt: min(43200), loginId: "CR8842197" },
  { id: "auto_07", name: "Digit frequency recalibration", kind: "schedule", botName: "Digit Hunter 7", symbol: "R_25", trigger: "Every 1,000 ticks", condition: "Digit distribution drift > 2 pts", action: "Refresh blocked digits, notify in-app", status: "enabled", fires30d: 96, lastFiredAt: min(13), loginId: "VRTC9031442" },
  { id: "auto_08", name: "ETH multiplier margin watch", kind: "notification", botName: "ETH Momentum 50x", symbol: "cryETHUSD", trigger: "Margin usage above 70%", condition: "Stop-out distance < 0.5x stake", action: "Push + email alert, suggest take-profit", status: "enabled", fires30d: 6, lastFiredAt: min(410), loginId: "CR8842197" },
  { id: "auto_09", name: "Night-shift volatility gate", kind: "trigger", botName: "Vol100 Night Shift", symbol: "R_100", trigger: "Realised vol above 2x 30-day mean", condition: "Between 22:00–05:00 UTC", action: "Halve stake step, cap ladder at 3 legs", status: "paused", fires30d: 11, lastFiredAt: min(58), loginId: "MX5510883" },
  { id: "auto_10", name: "Weekly statement digest", kind: "notification", botName: "All bots · VRTC9031442", symbol: "frxGBPUSD", trigger: "Mondays 08:00 UTC", condition: "At least 1 settled contract", action: "Email statement CSV + win-rate summary", status: "enabled", fires30d: 4, lastFiredAt: min(5760), loginId: "VRTC9031442" },
  { id: "auto_11", name: "Index DCA scale-out", kind: "trigger", botName: "DCA Trend Rider", symbol: "OTC_NDX", trigger: "Basket P&L reaches +12%", condition: "4 legs open", action: "Close 2 legs, trail stop on remainder", status: "enabled", fires30d: 3, lastFiredAt: min(148), loginId: "CR8842197" },
  { id: "auto_12", name: "Socket-drop reconnect guard", kind: "risk", botName: "All bots · platform", symbol: "R_75", trigger: "WebSocket disconnect > 5s", condition: "Bot has open exposure", action: "Reconnect with same idempotency key, no duplicate buy", status: "enabled", fires30d: 17, lastFiredAt: min(96), loginId: "VRTC9031442" },
];

// -----------------------------------------------------------------------------
// Script template library (starter code for the sandboxed JS engine)
// -----------------------------------------------------------------------------
export interface ScriptTemplate {
  id: string;
  name: string;
  category: "martingale" | "breakout" | "digits" | "accumulator" | "grid" | "mean-reversion" | "multiplier" | "touch";
  symbol: string;
  contractType: ContractTypeId;
  difficulty: "beginner" | "intermediate" | "advanced";
  lines: number;
  rating: number;
  uses: number;
  description: string;
  tags: string[];
  code: string;
}

export const SCRIPT_TEMPLATES: ScriptTemplate[] = [
  {
    id: "tpl_martingale_starter", name: "Martingale Starter", category: "martingale", symbol: "R_10", contractType: "rise_fall",
    difficulty: "beginner", lines: 42, rating: 4.8, uses: 3120,
    description: "The classic 2.1x recovery ladder with a hard $50 stake cap and engine-enforced stop-loss.",
    tags: ["ticks", "recovery", "cap"],
    code: "const { api, risk, state } = DerivX;\napi.onTick(\"R_10\", (t) => {\n  const streak = state.get(\"lossStreak\", 0);\n  const stake = Math.min(0.35 * Math.pow(2.1, streak), 50);\n  risk.assert(stake <= 50, \"stake cap\");\n  if (t.quote > api.sma(\"R_10\", 20)) {\n    api.buy({ symbol: \"R_10\", contract_type: \"CALL\", amount: stake, duration: 5, duration_unit: \"t\" });\n  }\n});",
  },
  {
    id: "tpl_london_breakout", name: "London Session Breakout", category: "breakout", symbol: "frxEURUSD", contractType: "rise_fall",
    difficulty: "intermediate", lines: 68, rating: 4.7, uses: 1840,
    description: "Arms 07:00–10:30 UTC and trades the first break of the 4-hour Asian range on EUR/USD.",
    tags: ["session", "forex", "range"],
    code: "const { api, risk, schedule } = DerivX;\nschedule.onlyDuring({ from: \"07:00\", to: \"10:30\", tz: \"UTC\" });\nconst range = api.range(\"frxEURUSD\", { lookback: \"4h\" });\napi.onBreakout(range, (dir, level) => {\n  risk.assert(api.openStakes() <= 150, \"exposure cap\");\n  api.buy({ symbol: \"frxEURUSD\", contract_type: dir === \"up\" ? \"CALL\" : \"PUT\", amount: 25, duration: 15, duration_unit: \"m\", barrier: level.toFixed(5) });\n});",
  },
  {
    id: "tpl_digit_differ", name: "Digit Differ Guard", category: "digits", symbol: "R_25", contractType: "digits",
    difficulty: "advanced", lines: 31, rating: 4.6, uses: 2210,
    description: "DIGITDIFF excluding the two least frequent digits over the last 1,000 ticks, flat $1 stake.",
    tags: ["digits", "frequency", "ticks"],
    code: "const { api } = DerivX;\napi.onTick(\"R_25\", (t) => {\n  const cold = api.coldDigits(\"R_25\", 1000, 2);\n  const d = api.lastDigit(t.quote);\n  if (!cold.includes(d)) {\n    api.buy({ symbol: \"R_25\", contract_type: \"DIGITDIFF\", barrier: cold[0], amount: 1, duration: 3, duration_unit: \"t\" });\n  }\n});",
  },
  {
    id: "tpl_accu_range", name: "Accumulator Range Keeper", category: "accumulator", symbol: "1HZ10V", contractType: "accumulator",
    difficulty: "beginner", lines: 54, rating: 4.9, uses: 2680,
    description: "Rides the ±0.1% range on the 1-second index and exits on the first range break.",
    tags: ["accumulator", "1s-index", "range"],
    code: "const { api, risk } = DerivX;\napi.onTick(\"1HZ10V\", (t) => {\n  if (!api.within(t.quote, 0.001)) { risk.halt(\"range break\"); return; }\n  api.buy({ symbol: \"1HZ10V\", contract_type: \"ACCU\", amount: 3, growth_rate: 0.03, duration: 5, duration_unit: \"t\" });\n});",
  },
  {
    id: "tpl_btc_grid", name: "BTC ATR Grid", category: "grid", symbol: "cryBTCUSD", contractType: "rise_fall",
    difficulty: "intermediate", lines: 39, rating: 4.5, uses: 1420,
    description: "Fixed-stake 30-minute grid on BTC/USD, spacing recalculated weekly from 14-day ATR.",
    tags: ["crypto", "grid", "atr"],
    code: "const { api, schedule } = DerivX;\nschedule.weekly(() => api.recalcGrid(\"cryBTCUSD\", { atrDays: 14 }));\napi.onBar(\"cryBTCUSD\", \"30m\", (bar) => {\n  const dir = bar.close > bar.open ? \"CALL\" : \"PUT\";\n  api.buy({ symbol: \"cryBTCUSD\", contract_type: dir, amount: 12, duration: 30, duration_unit: \"m\" });\n});",
  },
  {
    id: "tpl_gbp_meanrev", name: "GBP Mean Reversion", category: "mean-reversion", symbol: "frxGBPUSD", contractType: "rise_fall",
    difficulty: "intermediate", lines: 44, rating: 4.6, uses: 1180,
    description: "Fades 1.5-sigma deviations from the 60-tick mean on GBP/USD with a hard daily stop.",
    tags: ["forex", "z-score", "fade"],
    code: "const { api, risk } = DerivX;\napi.onTick(\"frxGBPUSD\", (t) => {\n  const z = api.zscore(\"frxGBPUSD\", 60);\n  risk.assert(api.dailyPnl() > -120, \"daily stop\");\n  if (z > 1.5) api.buy({ symbol: \"frxGBPUSD\", contract_type: \"PUT\", amount: 8, duration: 1, duration_unit: \"h\" });\n  if (z < -1.5) api.buy({ symbol: \"frxGBPUSD\", contract_type: \"CALL\", amount: 8, duration: 1, duration_unit: \"h\" });\n});",
  },
  {
    id: "tpl_eth_multiplier", name: "ETH Multiplier Trend", category: "multiplier", symbol: "cryETHUSD", contractType: "multiplier",
    difficulty: "advanced", lines: 52, rating: 4.4, uses: 860,
    description: "50x multiplier trend leg with stop-out at half the stake and take-profit at 1.5x.",
    tags: ["crypto", "multiplier", "trend"],
    code: "const { api, risk } = DerivX;\napi.onDayStart(\"cryETHUSD\", () => {\n  risk.assert(api.openLegs(\"cryETHUSD\") < 2, \"max 2 legs\");\n  api.buy({ symbol: \"cryETHUSD\", contract_type: \"MULTUP\", amount: 60, multiplier: 50, stop_loss: 0.5, take_profit: 1.5 });\n});",
  },
  {
    id: "tpl_gold_touch", name: "Gold Touch Ladder", category: "touch", symbol: "frxXAUUSD", contractType: "touch",
    difficulty: "advanced", lines: 47, rating: 4.3, uses: 640,
    description: "Eight-hour one-touch ladder at $5.40 above spot, disabled automatically around CPI prints.",
    tags: ["touch", "metals", "ladder"],
    code: "const { api, schedule } = DerivX;\nschedule.blackout(\"US-CPI\", { beforeMin: 30, afterMin: 30 });\napi.onTick(\"frxXAUUSD\", () => {\n  const spot = api.spot(\"frxXAUUSD\");\n  api.buy({ symbol: \"frxXAUUSD\", contract_type: \"ONETOUCH\", amount: 20, barrier: (spot + 5.4).toFixed(2), duration: 8, duration_unit: \"h\" });\n});",
  },
  {
    id: "tpl_vol75_sniper", name: "Vol75 Touch Sniper", category: "touch", symbol: "R_75", contractType: "touch",
    difficulty: "intermediate", lines: 57, rating: 4.5, uses: 990,
    description: "One-touch contracts 0.04% above spot on Volatility 75 with a 2-hour expiry window.",
    tags: ["touch", "synthetics"],
    code: "const { api } = DerivX;\napi.onTick(\"R_75\", (t) => {\n  api.buy({ symbol: \"R_75\", contract_type: \"ONETOUCH\", amount: 2, barrier: (t.quote * 1.0004).toFixed(2), duration: 2, duration_unit: \"h\" });\n});",
  },
  {
    id: "tpl_even_odd", name: "Even/Odd Parity Filter", category: "digits", symbol: "R_100", contractType: "even_odd",
    difficulty: "beginner", lines: 28, rating: 4.2, uses: 1730,
    description: "Trades last-digit parity only when the last 100 ticks skew at least 58/42 one way.",
    tags: ["digits", "parity", "ticks"],
    code: "const { api } = DerivX;\napi.onTick(\"R_100\", (t) => {\n  const skew = api.paritySkew(\"R_100\", 100);\n  if (skew.even >= 58) api.buy({ symbol: \"R_100\", contract_type: \"DIGITEVEN\", amount: 0.5, duration: 5, duration_unit: \"t\" });\n  if (skew.odd >= 58) api.buy({ symbol: \"R_100\", contract_type: \"DIGITODD\", amount: 0.5, duration: 5, duration_unit: \"t\" });\n});",
  },
  {
    id: "tpl_index_dca", name: "Index DCA Basket", category: "breakout", symbol: "OTC_NDX", contractType: "higher_lower",
    difficulty: "intermediate", lines: 63, rating: 4.7, uses: 1540,
    description: "Adds one daily Higher/Lower leg above the 20-day mean and scales out at +12% basket P&L.",
    tags: ["indices", "dca", "basket"],
    code: "const { api, risk, schedule } = DerivX;\nschedule.daily(\"09:30\", () => {\n  const above = api.spot(\"OTC_NDX\") > api.sma(\"OTC_NDX\", 20, \"1d\");\n  risk.assert(api.openLegs(\"OTC_NDX\") < 4, \"max 4 legs\");\n  if (above) api.buy({ symbol: \"OTC_NDX\", contract_type: \"CALL\", amount: 20, duration: 1, duration_unit: \"d\", barrier: \"+0.15%\" });\n});",
  },
  {
    id: "tpl_over_under", name: "Over/Under Digit Model", category: "digits", symbol: "R_50", contractType: "over_under",
    difficulty: "advanced", lines: 36, rating: 4.4, uses: 720,
    description: "Over/Under on the last digit of Volatility 50, restricted to 9-tick windows after a cold streak.",
    tags: ["digits", "over-under", "model"],
    code: "const { api } = DerivX;\napi.onTick(\"R_50\", (t) => {\n  const d = api.lastDigit(t.quote);\n  const cold = api.coldStreak(\"R_50\", 9);\n  if (cold && d <= 7) api.buy({ symbol: \"R_50\", contract_type: \"DIGITOVER\", barrier: 2, amount: 4, duration: 10, duration_unit: \"t\" });\n});",
  },
];

// -----------------------------------------------------------------------------
// Platform comparison matrix (H-2 comparison table)
// -----------------------------------------------------------------------------
export type ComparisonCell = "yes" | "partial" | "no" | string;

export interface ComparisonRow {
  id: string;
  category: "Automation" | "Scripting" | "Markets" | "Risk" | "Social" | "Pricing";
  feature: string;
  derivx: ComparisonCell;
  deriv: ComparisonCell;
  bmx: ComparisonCell;
  other: ComparisonCell;
  note: string;
  detail: string;
}

export const COMPARISON_ROWS: ComparisonRow[] = [
  { id: "cmp_01", category: "Automation", feature: "Pre-built bot presets", derivx: "10 presets", deriv: "no", bmx: "partial", other: "partial", note: "Preset library with backtest attached", detail: "Every DerivX preset ships with a 2-year backtest, a stake cap and a stop-loss already set. Deriv native offers manual trading only; generic bot builders usually sell presets separately." },
  { id: "cmp_02", category: "Automation", feature: "Custom bot parameters", derivx: "yes", deriv: "no", bmx: "yes", other: "partial", note: "Stake, duration, multiplier, caps per bot", detail: "Stake, duration, martingale step, take-profit and stop-loss are editable per bot and versioned, so a bad edit can be rolled back from the audit log." },
  { id: "cmp_03", category: "Scripting", feature: "JavaScript strategy engine", derivx: "yes", deriv: "no", bmx: "no", other: "partial", note: "Sandboxed VM2 runtime, no network access", detail: "Scripts run in a sandboxed VM2 runtime with tick/bar subscriptions, indicator helpers and risk assertions. No filesystem or network access is ever granted." },
  { id: "cmp_04", category: "Scripting", feature: "Backtesting on tick history", derivx: "2 years", deriv: "no", bmx: "partial", other: "partial", note: "Walk-forward splits + drawdown bands", detail: "The backtest runner replays up to two years of tick history with spread and slippage models, walk-forward splits, Sharpe and max-drawdown reporting." },
  { id: "cmp_05", category: "Markets", feature: "Synthetics 24/7 (R_10–R_100, 1HZ)", derivx: "yes", deriv: "yes", bmx: "yes", other: "yes", note: "Full 1s and 2s index families", detail: "All Deriv synthetic indices including the 1-second 1HZ family trade around the clock. Pricing and settlement always happen on Deriv; DerivX only relays the stream." },
  { id: "cmp_06", category: "Markets", feature: "Contract types covered", derivx: "11 types", deriv: "11 types", bmx: "partial", other: "partial", note: "Rise/Fall through Accumulator + Multiplier", detail: "Rise/Fall, Higher/Lower, Touch/No Touch, Digits, Ends/Stays Between, Even/Odd, Over/Under, Lookback, Accumulator and Multiplier — with barrier previews before every buy." },
  { id: "cmp_07", category: "Risk", feature: "Engine-enforced stake caps", derivx: "yes", deriv: "partial", bmx: "partial", other: "no", note: "Rejected before the proposal, not after", detail: "The risk engine checks exposure before the proposal request. A breaching order is rejected and the bot pauses — nothing is force-closed without your confirmation." },
  { id: "cmp_08", category: "Risk", feature: "Idempotent order retries", derivx: "yes", deriv: "yes", bmx: "no", other: "no", note: "Same key on reconnect — never bought twice", detail: "Every buy carries an idempotency key. If the socket drops mid-order, the worker reconnects with the same key so a contract can never be duplicated." },
  { id: "cmp_09", category: "Social", feature: "Verified leaderboard", derivx: "yes", deriv: "no", bmx: "partial", other: "partial", note: "Statements reconciled, not screenshots", detail: "Leaderboard P&L is reconciled against Deriv statements. Screenshots, edited balances and demo-account results are excluded from the verified board." },
  { id: "cmp_10", category: "Social", feature: "Copy trading with kill switch", derivx: "yes", deriv: "no", bmx: "partial", other: "partial", note: "Independent stake ratio + instant close-all", detail: "Copy at your own stake ratio with a hard loss cap. The kill switch closes every mirrored leg within one tick and never touches your own bots." },
  { id: "cmp_11", category: "Automation", feature: "Schedules & conditional triggers", derivx: "yes", deriv: "no", bmx: "partial", other: "no", note: "Sessions, blackouts, streak brakes", detail: "Cron-style schedules, release blackouts, loss-streak brakes and volatility gates run inside the engine — your browser tab does not need to stay open." },
  { id: "cmp_12", category: "Risk", feature: "Multi-account exposure view", derivx: "15 accounts", deriv: "partial", bmx: "no", other: "no", note: "Real + virtual in one risk tape", detail: "Exposure, floating P&L and caps aggregate across every linked Deriv account (CR, VRTC and MX formats) in a single portfolio tape." },
  { id: "cmp_13", category: "Pricing", feature: "Profit share / per-trade fees", derivx: "None", deriv: "None", bmx: "partial", other: "partial", note: "Flat subscription on every platform tier", detail: "DerivX never takes a cut of winnings. Contracts settle in your Deriv account; the platform is a flat subscription from free to institutional." },
  { id: "cmp_14", category: "Pricing", feature: "Free tier without a card", derivx: "yes", deriv: "yes", bmx: "no", other: "partial", note: "1 live bot + full market access", detail: "The free tier includes one live bot, one Deriv connection and full market access. No card is collected until you choose a paid tier." },
];

// =============================================================================
// A-1 (/auth/signup) — onboarding datasets. FRONT-END ONLY, mock data.
// The register / verify calls in the blueprint are simulated in-page; these
// shapes mirror what POST /api/auth/register would return and validate.
// =============================================================================

// -----------------------------------------------------------------------------
// Residency countries (onboarding eligibility — country picker drawer)
// -----------------------------------------------------------------------------
export interface SignupCountry {
  code: string;
  name: string;
  flag: string;
  regulator: string;
  accountTypes: ("virtual" | "real")[];
  derivAvailable: boolean;
  traders: number;
  taxForm: string;
}

export const SIGNUP_COUNTRIES: SignupCountry[] = [
  { code: "NG", name: "Nigeria", flag: "🇳🇬", regulator: "SEC Nigeria (advisory)", accountTypes: ["virtual", "real"], derivAvailable: true, traders: 4210, taxForm: "W-8BEN equivalent" },
  { code: "KE", name: "Kenya", flag: "🇰🇪", regulator: "CMA Kenya (advisory)", accountTypes: ["virtual", "real"], derivAvailable: true, traders: 3180, taxForm: "KRA PIN declaration" },
  { code: "GH", name: "Ghana", flag: "🇬🇭", regulator: "SEC Ghana (advisory)", accountTypes: ["virtual", "real"], derivAvailable: true, traders: 1640, taxForm: "GRA TIN declaration" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", regulator: "FSCA (ODP licence via Deriv)", accountTypes: ["virtual", "real"], derivAvailable: true, traders: 1420, taxForm: "SARS IT3 declaration" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩", regulator: "Bappebti (offshore access)", accountTypes: ["virtual", "real"], derivAvailable: true, traders: 2210, taxForm: "NPWP declaration" },
  { code: "IN", name: "India", flag: "🇮🇳", regulator: "RBI FEMA (offshore access)", accountTypes: ["virtual"], derivAvailable: true, traders: 1180, taxForm: "PAN declaration" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", regulator: "FCA (Deriv UK not retail-authorised)", accountTypes: ["virtual"], derivAvailable: false, traders: 640, taxForm: "HMRC self-assessment" },
  { code: "DE", name: "Germany", flag: "🇩🇪", regulator: "BaFin (EU passport via Deriv EU)", accountTypes: ["virtual", "real"], derivAvailable: true, traders: 580, taxForm: "EU MiFID appropriateness" },
  { code: "RO", name: "Romania", flag: "🇷🇴", regulator: "ASF (EU passport via Deriv EU)", accountTypes: ["virtual", "real"], derivAvailable: true, traders: 410, taxForm: "EU MiFID appropriateness" },
  { code: "BR", name: "Brazil", flag: "🇧🇷", regulator: "CVM (offshore access)", accountTypes: ["virtual", "real"], derivAvailable: true, traders: 890, taxForm: "CPF declaration" },
  { code: "CO", name: "Colombia", flag: "🇨🇴", regulator: "SFC (offshore access)", accountTypes: ["virtual", "real"], derivAvailable: true, traders: 520, taxForm: "RUT declaration" },
  { code: "EG", name: "Egypt", flag: "🇪🇬", regulator: "FRA (offshore access)", accountTypes: ["virtual"], derivAvailable: true, traders: 460, taxForm: "National ID declaration" },
];

// -----------------------------------------------------------------------------
// Mock Google identities (social sign-in chooser — simulated OAuth)
// -----------------------------------------------------------------------------
export interface GoogleAccount {
  id: string;
  name: string;
  email: string;
  lastUsed: string;
}

export const GOOGLE_ACCOUNTS: GoogleAccount[] = [
  { id: "g_ade", name: "Ade Fashola", email: "ade.fashola@example.com", lastUsed: "2 days ago" },
  { id: "g_mina", name: "Mina Larasati", email: "mina.larasati@example.com", lastUsed: "last week" },
  { id: "g_work", name: "A. Fashola (work)", email: "ade@tradingdesk.example.com", lastUsed: "3 weeks ago" },
];

// -----------------------------------------------------------------------------
// Mock inbox (demo verification mailbox — the "email" the code was sent to)
// -----------------------------------------------------------------------------
export interface InboxMessage {
  id: string;
  from: string;
  subject: string;
  preview: string;
  epoch: number;
  code?: string;
  read: boolean;
}

export const INBOX_MESSAGES: InboxMessage[] = [
  { id: "mail_01", from: "DerivX Verify", subject: "Your DerivX verification code", preview: "Your 6-digit code is inside. It expires in 15 minutes and can be used once.", epoch: min(1), code: "482913", read: false },
  { id: "mail_02", from: "DerivX", subject: "Welcome to DerivX — what happens next", preview: "Three steps: verify this email, link Deriv with OAuth2, set your risk caps.", epoch: min(26), read: true },
  { id: "mail_03", from: "Deriv", subject: "Your virtual account VRTC9031442 is ready", preview: "$10,000 virtual funds, all contract types, same tick feed as real accounts.", epoch: min(180), read: true },
  { id: "mail_04", from: "DerivX Digest", subject: "October: accumulator strategies grew 38%", preview: "Fleet stats, two new presets and the payout-efficiency table for Q3.", epoch: min(1440), read: true },
  { id: "mail_05", from: "DerivX Security", subject: "New sign-in from Chrome · Nairobi, KE", preview: "If this was not you, revoke the session from Settings → Security immediately.", epoch: min(2880), read: true },
];

// -----------------------------------------------------------------------------
// Trusted devices / sessions (security dialog — session audit table)
// -----------------------------------------------------------------------------
export interface SignupSession {
  id: string;
  device: string;
  location: string;
  ip: string;
  lastActive: number;
  current: boolean;
  trusted: boolean;
}

export const SIGNUP_SESSIONS: SignupSession[] = [
  { id: "ses_01", device: "Chrome 130 · Windows 11", location: "Nairobi, KE", ip: "197.237.14.82", lastActive: min(1), current: true, trusted: true },
  { id: "ses_02", device: "Safari 18 · iPhone 16", location: "Nairobi, KE", ip: "197.237.14.82", lastActive: min(64), current: false, trusted: true },
  { id: "ses_03", device: "Firefox 132 · Ubuntu 24.04", location: "Lagos, NG", ip: "105.112.88.14", lastActive: min(320), current: false, trusted: true },
  { id: "ses_04", device: "Chrome 129 · Android 15", location: "Accra, GH", ip: "154.160.22.9", lastActive: min(900), current: false, trusted: false },
  { id: "ses_05", device: "Edge 130 · Windows 11", location: "Jakarta, ID", ip: "36.68.221.47", lastActive: min(1500), current: false, trusted: true },
  { id: "ses_06", device: "Chrome 130 · macOS 15", location: "London, GB", ip: "86.14.190.203", lastActive: min(2880), current: false, trusted: false },
  { id: "ses_07", device: "Safari 17 · iPadOS 18", location: "Cape Town, ZA", ip: "41.203.66.118", lastActive: min(4320), current: false, trusted: true },
  { id: "ses_08", device: "Chrome 128 · Windows 10", location: "São Paulo, BR", ip: "189.44.201.77", lastActive: min(7200), current: false, trusted: false },
  { id: "ses_09", device: "Firefox 131 · Windows 11", location: "Bucharest, RO", ip: "92.83.141.26", lastActive: min(10080), current: false, trusted: true },
  { id: "ses_10", device: "Chrome 130 · ChromeOS", location: "Bogotá, CO", ip: "181.53.90.154", lastActive: min(20160), current: false, trusted: false },
];


// -----------------------------------------------------------------------------
// A-2 … A-7 · auth family datasets (sign-in accounts, login audit, OAuth
// scopes, 2FA backup codes, authenticator apps, demo deep-link tokens)
// -----------------------------------------------------------------------------
export interface SigninAccount {
  id: string;
  email: string;
  name: string;
  password: string;
  twoFactor: boolean;
  hasDeriv: boolean;
  derivLoginId: string | null;
  plan: string;
  lastLoginMin: number;
}

export const SIGNIN_ACCOUNTS: SigninAccount[] = [
  { id: "usr_01", email: "trader@derivx.app", name: "Amara Okafor", password: "Rise$2024", twoFactor: true, hasDeriv: true, derivLoginId: "CR8842197", plan: "Pro", lastLoginMin: 122 },
  { id: "usr_02", email: "brian@derivx.app", name: "Brian Mwangi", password: "Fall#7788", twoFactor: false, hasDeriv: true, derivLoginId: "VRTC9031442", plan: "Free", lastLoginMin: 1440 },
  { id: "usr_03", email: "sana@derivx.app", name: "Sana Iqbal", password: "Tick$9911", twoFactor: true, hasDeriv: false, derivLoginId: null, plan: "Growth", lastLoginMin: 4320 },
  { id: "usr_04", email: "diego@derivx.app", name: "Diego Alvarez", password: "Bolt#3310", twoFactor: false, hasDeriv: true, derivLoginId: "CR5520108", plan: "Pro", lastLoginMin: 10080 },
  { id: "usr_05", email: "Linh@derivx.app", name: "Linh Nguyen", password: "Wave$6642", twoFactor: true, hasDeriv: true, derivLoginId: "VRTC7712093", plan: "Free", lastLoginMin: 20160 },
  { id: "usr_06", email: "kenji@derivx.app", name: "Kenji Sato", password: "Drift#2050", twoFactor: false, hasDeriv: false, derivLoginId: null, plan: "Growth", lastLoginMin: 43200 },
];

export interface LoginAttempt {
  id: string;
  epochMin: number;
  ip: string;
  location: string;
  device: string;
  method: "Password" | "Google" | "Deriv OAuth" | "Backup code";
  result: "success" | "failed" | "blocked" | "2fa-challenge";
}

export const LOGIN_ATTEMPTS: LoginAttempt[] = [
  { id: "att_01", epochMin: 4, ip: "197.237.14.82", location: "Nairobi, KE", device: "Chrome 130 · Windows 11", method: "Password", result: "success" },
  { id: "att_02", epochMin: 26, ip: "197.237.14.82", location: "Nairobi, KE", device: "Chrome 130 · Windows 11", method: "Password", result: "2fa-challenge" },
  { id: "att_03", epochMin: 190, ip: "105.112.88.14", location: "Lagos, NG", device: "Firefox 132 · Ubuntu 24.04", method: "Google", result: "success" },
  { id: "att_04", epochMin: 480, ip: "154.160.22.9", location: "Accra, GH", device: "Chrome 129 · Android 15", method: "Password", result: "failed" },
  { id: "att_05", epochMin: 482, ip: "154.160.22.9", location: "Accra, GH", device: "Chrome 129 · Android 15", method: "Password", result: "failed" },
  { id: "att_06", epochMin: 486, ip: "154.160.22.9", location: "Accra, GH", device: "Chrome 129 · Android 15", method: "Password", result: "blocked" },
  { id: "att_07", epochMin: 1500, ip: "36.68.221.47", location: "Jakarta, ID", device: "Edge 130 · Windows 11", method: "Deriv OAuth", result: "success" },
  { id: "att_08", epochMin: 2880, ip: "86.14.190.203", location: "London, GB", device: "Chrome 130 · macOS 15", method: "Password", result: "success" },
  { id: "att_09", epochMin: 4320, ip: "41.203.66.118", location: "Cape Town, ZA", device: "Safari 17 · iPadOS 18", method: "Backup code", result: "success" },
  { id: "att_10", epochMin: 7200, ip: "189.44.201.77", location: "São Paulo, BR", device: "Chrome 128 · Windows 10", method: "Password", result: "failed" },
  { id: "att_11", epochMin: 10080, ip: "92.83.141.26", location: "Bucharest, RO", device: "Firefox 131 · Windows 11", method: "Google", result: "success" },
  { id: "att_12", epochMin: 20160, ip: "181.53.90.154", location: "Bogotá, CO", device: "Chrome 130 · ChromeOS", method: "Deriv OAuth", result: "success" },
];

export interface OAuthScope {
  id: string;
  label: string;
  description: string;
  level: "read" | "trade" | "payments" | "admin";
  granted: boolean;
}

export const OAUTH_SCOPES: OAuthScope[] = [
  { id: "scp_01", label: "read: account details", description: "Login ID, currency, account status and landing company.", level: "read", granted: true },
  { id: "scp_02", label: "read: balance & equity", description: "Live balance, equity and margin snapshots for linked accounts.", level: "read", granted: true },
  { id: "scp_03", label: "read: open positions", description: "Running contracts, entry spots and unrealised P&L.", level: "read", granted: true },
  { id: "scp_04", label: "read: statement history", description: "Settled trades, deposits and withdrawals for reporting.", level: "read", granted: true },
  { id: "scp_05", label: "trade: proposals", description: "Request price proposals for every supported contract type.", level: "trade", granted: true },
  { id: "scp_06", label: "trade: buy & sell", description: "Buy contracts and sell open positions before expiry.", level: "trade", granted: true },
  { id: "scp_07", label: "trade: bot execution", description: "Let deployed bots place contracts inside your risk caps.", level: "trade", granted: true },
  { id: "scp_08", label: "payments: transfers", description: "Move funds between your own Deriv accounts.", level: "payments", granted: false },
  { id: "scp_09", label: "payments: cashier", description: "Open the Deriv cashier for deposits and withdrawals.", level: "payments", granted: false },
  { id: "scp_10", label: "admin: account settings", description: "Change account limits and self-exclusion settings.", level: "admin", granted: false },
];

export interface BackupCode {
  code: string;
  used: boolean;
}

export const BACKUP_CODES: BackupCode[] = [
  { code: "KX41-9QPD-77", used: false },
  { code: "M82T-R4WL-03", used: false },
  { code: "Q7ZN-51HD-88", used: true },
  { code: "T3VB-08XK-42", used: false },
  { code: "W95C-J6MA-19", used: false },
  { code: "Z14P-D90S-65", used: true },
  { code: "B67F-H2QN-31", used: false },
  { code: "N0KD-74XE-56", used: false },
  { code: "R58G-U1VP-94", used: false },
  { code: "H29M-A63B-70", used: false },
];

export interface AuthenticatorApp {
  id: string;
  name: string;
  platforms: string;
  note: string;
  recommended: boolean;
}

export const AUTHENTICATOR_APPS: AuthenticatorApp[] = [
  { id: "app_01", name: "Google Authenticator", platforms: "iOS · Android", note: "Simple TOTP codes, no cloud sync.", recommended: true },
  { id: "app_02", name: "Authy", platforms: "iOS · Android · Desktop", note: "Encrypted multi-device sync and backups.", recommended: true },
  { id: "app_03", name: "Microsoft Authenticator", platforms: "iOS · Android", note: "TOTP plus push approval for Microsoft accounts.", recommended: false },
  { id: "app_04", name: "1Password", platforms: "iOS · Android · Desktop", note: "Stores TOTP beside the password in one vault.", recommended: false },
  { id: "app_05", name: "Bitwarden Authenticator", platforms: "iOS · Android", note: "Open-source, works offline.", recommended: false },
  { id: "app_06", name: "FreeOTP", platforms: "iOS · Android", note: "Minimal open-source TOTP, no account needed.", recommended: false },
];

/** Demo deep-link tokens used by the simulated email flows (A-4 → A-5/A-6). */
export const DEMO_RESET_TOKEN = "dxr_live_9f27c1";
export const DEMO_VERIFY_TOKEN = "dxv_live_77b2e0";
export const DEMO_TOTP_SECRET = "JBSWY3DPEHPK3PXP";
export const DEMO_TOTP_CODE = "472915";

// -----------------------------------------------------------------------------
// D-1 / D-2 · dashboard datasets (notifications, market schedules, economic
// calendar, watchlists)
// -----------------------------------------------------------------------------
export interface AppNotification {
  id: string;
  title: string;
  body: string;
  epochMin: number;
  tone: "up" | "info" | "warn" | "danger" | "accent";
  read: boolean;
  /** real route the notification opens (built pages only) */
  to?: string;
}

export const NOTIFICATIONS: AppNotification[] = [
  { id: "ntf_01", title: "Bot paused by stop-loss", body: "Martingale Core v7 hit its $150 daily stop on R_10 and paused itself.", epochMin: 6, tone: "warn", read: false, to: "/dashboard" },
  { id: "ntf_02", title: "Contract settled +$18.40", body: "Rise/Fall on frxEURUSD closed in profit (entry 1.08421 → exit 1.08496).", epochMin: 22, tone: "up", read: false, to: "/dashboard" },
  { id: "ntf_03", title: "New sign-in detected", body: "Chrome · Nairobi, KE signed in to trader@derivx.app. Not you? Revoke the session.", epochMin: 64, tone: "info", read: false, to: "/auth/2fa" },
  { id: "ntf_04", title: "R_100 volatility spike", body: "1-minute realized volatility is 2.3× its 24h average — scalpers beware.", epochMin: 130, tone: "accent", read: true, to: "/dashboard/markets" },
  { id: "ntf_05", title: "Weekly digest ready", body: "Your fleet won 61% of 214 contracts this week. Best: DCA Basket (+$96.20).", epochMin: 320, tone: "info", read: true, to: "/dashboard" },
  { id: "ntf_06", title: "Deriv connection healthy", body: "CR8842197 authorize handshake renewed on the eu-west relay (38ms median).", epochMin: 480, tone: "up", read: true, to: "/dashboard/markets" },
  { id: "ntf_07", title: "Price alert triggered", body: "cryBTCUSD crossed above $67,500 — your alert from Tuesday fired.", epochMin: 900, tone: "accent", read: true, to: "/dashboard/markets" },
  { id: "ntf_08", title: "Backup code used", body: "A backup code passed the second factor on a new device in Lagos, NG.", epochMin: 1500, tone: "warn", read: true, to: "/auth/2fa" },
  { id: "ntf_09", title: "Preset backtest finished", body: "Volatility Switcher (R_75) finished 90 days: 58.4% win, +$212.60 simulated.", epochMin: 2880, tone: "info", read: true, to: "/dashboard" },
  { id: "ntf_10", title: "Forex weekend close", body: "Forex markets close Friday 21:00 UTC and reopen Sunday 22:00 UTC.", epochMin: 4320, tone: "info", read: true, to: "/dashboard/markets" },
  { id: "ntf_11", title: "Email verification pending", body: "Real-account linking unlocks once trader@derivx.app is verified.", epochMin: 7200, tone: "warn", read: true, to: "/auth/verify-email" },
  { id: "ntf_12", title: "Welcome to DerivX", body: "Your virtual account VRTC1024887 was credited with $10,000 demo funds.", epochMin: 20160, tone: "up", read: true, to: "/dashboard" },
];

export interface MarketSchedule {
  id: string;
  market: string;
  open: boolean;
  /** minutes until close (open) or until next open (closed) */
  deltaMin: number;
  note: string;
}

export const MARKET_SCHEDULES: MarketSchedule[] = [
  { id: "sch_01", market: "Synthetics (R_10 … 1HZ100V)", open: true, deltaMin: 0, note: "Open 24/7 — volatility indices never close." },
  { id: "sch_02", market: "Forex majors (frxEURUSD, frxGBPUSD)", open: true, deltaMin: 263, note: "Closes Friday 21:00 UTC, reopens Sunday 22:00 UTC." },
  { id: "sch_03", market: "Commodities (frxXAUUSD)", open: true, deltaMin: 197, note: "Daily break 21:00–22:00 UTC; weekend close applies." },
  { id: "sch_04", market: "Crypto (cryBTCUSD, cryETHUSD)", open: true, deltaMin: 0, note: "Open 24/7, liquidity thins on Sunday mornings." },
  { id: "sch_05", market: "Stock indices (OTC_NDX, OTC_SPC)", open: false, deltaMin: 1130, note: "Closed for the US holiday — reopens 14:30 UTC tomorrow." },
  { id: "sch_06", market: "Forex exotics (frxUSDJPY crosses)", open: true, deltaMin: 340, note: "Follows the majors session with wider spreads after 20:00 UTC." },
];

export interface EconEvent {
  id: string;
  inMin: number;
  currency: string;
  event: string;
  impact: "high" | "medium" | "low";
  symbols: string[];
  forecast: string;
  previous: string;
}

export const ECON_EVENTS: EconEvent[] = [
  { id: "eco_01", inMin: 95, currency: "USD", event: "US CPI (YoY)", impact: "high", symbols: ["frxEURUSD", "frxGBPUSD", "frxXAUUSD"], forecast: "3.1%", previous: "3.2%" },
  { id: "eco_02", inMin: 240, currency: "EUR", event: "ECB rate decision", impact: "high", symbols: ["frxEURUSD"], forecast: "4.00%", previous: "4.00%" },
  { id: "eco_03", currency: "GBP", event: "UK unemployment rate", impact: "medium", symbols: ["frxGBPUSD"], forecast: "4.3%", previous: "4.2%", inMin: 1305 },
  { id: "eco_04", currency: "JPY", event: "BoJ policy statement", impact: "high", symbols: ["frxUSDJPY"], forecast: "Hold", previous: "Hold", inMin: 1560 },
  { id: "eco_05", currency: "USD", event: "US retail sales (MoM)", impact: "medium", symbols: ["frxEURUSD", "cryBTCUSD"], forecast: "+0.4%", previous: "+0.1%", inMin: 1895 },
  { id: "eco_06", currency: "AUD", event: "RBA meeting minutes", impact: "low", symbols: ["frxAUDUSD"], forecast: "—", previous: "—", inMin: 2760 },
  { id: "eco_07", currency: "USD", event: "FOMC minutes", impact: "high", symbols: ["frxXAUUSD", "cryBTCUSD", "cryETHUSD"], forecast: "—", previous: "—", inMin: 3180 },
  { id: "eco_08", currency: "EUR", event: "German ZEW sentiment", impact: "low", symbols: ["frxEURUSD"], forecast: "12.4", previous: "10.9", inMin: 4320 },
  { id: "eco_09", currency: "CAD", event: "Canada CPI (MoM)", impact: "medium", symbols: ["frxUSDCAD"], forecast: "+0.3%", previous: "+0.4%", inMin: 4500 },
  { id: "eco_10", currency: "USD", event: "US NFP payrolls", impact: "high", symbols: ["frxEURUSD", "frxGBPUSD", "frxXAUUSD", "cryBTCUSD"], forecast: "188k", previous: "175k", inMin: 5940 },
];

export interface Watchlist {
  id: string;
  name: string;
  symbols: string[];
  note: string;
}

export const WATCHLISTS: Watchlist[] = [
  { id: "wl_01", name: "My Forex", symbols: ["frxEURUSD", "frxGBPUSD", "frxUSDJPY", "frxXAUUSD"], note: "Majors + gold for the London session." },
  { id: "wl_02", name: "High Vol Synthetics", symbols: ["R_75", "R_100", "1HZ100V", "R_50"], note: "Scalper fleet hunting ground — tight caps." },
  { id: "wl_03", name: "Crypto watch", symbols: ["cryBTCUSD", "cryETHUSD"], note: "Weekend liquidity checks before sizing up." },
];

// =============================================================================
// PAGE D-5 — Bot Creator / Config
// (/dashboard/bots/new · /dashboard/bots/:id/config)
// FRONT-END ONLY. Feeds the configurator wizard: strategy templates, community
// marketplace strategies, drafts, parameter sets, config audit trail, version
// history, engine log tape, halted-symbol fallbacks and the deterministic
// backtest / optimizer / Monte-Carlo maths. Shapes mirror the bot_jobs,
// strategy_* and proposal payloads so the fetch layer can be swapped for the
// live DerivWS socket without touching the wizard UI.
// =============================================================================

// -----------------------------------------------------------------------------
// Strategy templates (STEP 2 cards — strategy.md presets, parameterised)
// -----------------------------------------------------------------------------
export type StrategyCategory = "preset" | "custom" | "ai";

export interface StrategyParamDef {
  key: string;
  label: string;
  kind: "number" | "select" | "text";
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  help: string;
}

export interface BotStrategyTemplate {
  id: string;
  name: string;
  icon: "layers" | "trending-up" | "repeat" | "target" | "shield" | "spiral" | "code" | "brain";
  category: StrategyCategory;
  tagline: string;
  description: string;
  riskLevel: "low" | "medium" | "high";
  markets: string[];
  typicalDrawdown: number;
  historicalWinRate: number;
  recoveryPerLoss: number;
  engineNote: string;
  rules: string[];
  defaultParams: Record<string, number | string>;
  params: StrategyParamDef[];
}

export const BOT_STRATEGY_TEMPLATES: BotStrategyTemplate[] = [
  {
    id: "st_martingale",
    name: "Martingale",
    icon: "layers",
    category: "preset",
    tagline: "Double stake on loss",
    description: "Multiplies the stake after every loss and resets it to the initial stake on a win. Fast recovery on Volatility indices, brutal if the losing streak outruns your cap.",
    riskLevel: "high",
    markets: ["synthetics", "forex"],
    typicalDrawdown: -318.4,
    historicalWinRate: 68.4,
    recoveryPerLoss: 2.1,
    engineNote: "Stake is recomputed client-side and re-validated by the engine before every proposal.",
    rules: ["Stake × multiplier on a loss", "Reset to initial stake on a win", "Hard cap at max stake, halt at stop-loss"],
    defaultParams: { multiplier: 2.1, onWin: "Reset to initial stake", onLoss: "Multiply stake", maxSteps: 5 },
    params: [
      { key: "multiplier", label: "Multiplier", kind: "number", suffix: "×", min: 1.1, max: 4, step: 0.1, help: "Stake growth per losing step." },
      { key: "maxSteps", label: "Max steps", kind: "number", min: 1, max: 10, step: 1, help: "Losing steps before the bot halts for the day." },
      { key: "onWin", label: "On win", kind: "select", options: ["Reset to initial stake", "Hold current stake", "Step down one level"], help: "What the ladder does after a winning contract." },
      { key: "onLoss", label: "On loss", kind: "select", options: ["Multiply stake", "Add flat increment"], help: "Growth style for the next leg." },
    ],
  },
  {
    id: "st_fixed",
    name: "Fixed Stake",
    icon: "target",
    category: "preset",
    tagline: "Same stake every trade",
    description: "Flat staking with no progression. The honest baseline — pair it with a directional filter and let the entry edge do the work.",
    riskLevel: "low",
    markets: ["synthetics", "forex", "crypto", "commodities", "indices"],
    typicalDrawdown: -96.4,
    historicalWinRate: 57.2,
    recoveryPerLoss: 1,
    engineNote: "No stake progression — the safest way to validate a new entry rule for a week.",
    rules: ["Identical stake on every contract", "No recovery ladder", "Daily stop-loss only"],
    defaultParams: { onWin: "Hold current stake", onLoss: "Hold current stake" },
    params: [
      { key: "onWin", label: "On win", kind: "select", options: ["Hold current stake", "Step up one level"], help: "Flat is the default; stepping up turns it into an anti-Martingale." },
      { key: "onLoss", label: "On loss", kind: "select", options: ["Hold current stake", "Cooldown 1 cycle"], help: "Keep it flat or pause one cycle after a loss." },
    ],
  },
  {
    id: "st_dca",
    name: "DCA / Average",
    icon: "trending-up",
    category: "preset",
    tagline: "Lower average entry price",
    description: "Adds legs while the market moves against the basket so the average entry improves. Best on index and crypto trends with generous expiry.",
    riskLevel: "medium",
    markets: ["indices", "crypto", "forex"],
    typicalDrawdown: -642.9,
    historicalWinRate: 61.7,
    recoveryPerLoss: 1.25,
    engineNote: "Basket exposure is capped by the engine before each additional leg is accepted.",
    rules: ["One add-leg per step while in drawdown", "1.25× add step, max 4 legs", "Scales out at basket target P&L"],
    defaultParams: { addStep: 1.25, maxLegs: 4, addTrigger: "-0.4% from average" },
    params: [
      { key: "addStep", label: "Add step", kind: "number", suffix: "×", min: 1, max: 3, step: 0.05, help: "Leg size relative to the previous leg." },
      { key: "maxLegs", label: "Max legs", kind: "number", min: 2, max: 8, step: 1, help: "Hard basket cap." },
      { key: "addTrigger", label: "Add trigger", kind: "select", options: ["-0.4% from average", "-1 ATR", "Every 20 ticks against basket"], help: "Distance that arms the next add." },
    ],
  },
  {
    id: "st_oscar",
    name: "Oscar's Grind",
    icon: "repeat",
    category: "preset",
    tagline: "Grind one unit at a time",
    description: "Never increases the stake after a loss; only steps up one unit after a win until the session target is met. Slow, flat equity curve.",
    riskLevel: "low",
    markets: ["synthetics", "forex", "indices"],
    typicalDrawdown: -142.8,
    historicalWinRate: 64.1,
    recoveryPerLoss: 1,
    engineNote: "Session target is checked after every settlement; the engine resets the unit on hit.",
    rules: ["Flat stake after a loss", "+1 unit after a win", "Stop the cycle at the session target"],
    defaultParams: { unit: 0.35, sessionTarget: 25, maxCycles: 3 },
    params: [
      { key: "unit", label: "Unit size", kind: "number", suffix: "USD", min: 0.35, max: 50, step: 0.05, help: "One grind unit — the base stake." },
      { key: "sessionTarget", label: "Session target", kind: "number", suffix: "USD", min: 1, max: 500, step: 1, help: "Cycle profit target before reset." },
      { key: "maxCycles", label: "Max cycles", kind: "number", min: 1, max: 10, step: 1, help: "Cycles per day before the bot pauses." },
    ],
  },
  {
    id: "st_anti_martingale",
    name: "Anti-Martingale",
    icon: "shield",
    category: "preset",
    tagline: "Press winners, cut losers",
    description: "Increases the stake while the bot is winning and steps back down on a loss. Compounding upside with a flatter left tail.",
    riskLevel: "medium",
    markets: ["synthetics", "crypto", "indices"],
    typicalDrawdown: -228.6,
    historicalWinRate: 59.8,
    recoveryPerLoss: 0.5,
    engineNote: "Win streaks are tracked per symbol so two bots on the same feed never share a ladder.",
    rules: ["Stake × multiplier after a win", "Halve the stake after a loss", "Reset after 3 consecutive wins"],
    defaultParams: { multiplier: 1.5, maxSteps: 4, resetAfterWins: 3 },
    params: [
      { key: "multiplier", label: "Win multiplier", kind: "number", suffix: "×", min: 1.1, max: 3, step: 0.1, help: "Press size after a win." },
      { key: "maxSteps", label: "Max presses", kind: "number", min: 1, max: 8, step: 1, help: "Consecutive presses before a reset." },
      { key: "resetAfterWins", label: "Reset after", kind: "number", suffix: "wins", min: 1, max: 10, step: 1, help: "Streak length that returns to the base stake." },
    ],
  },
  {
    id: "st_fibonacci",
    name: "Fibonacci",
    icon: "spiral",
    category: "preset",
    tagline: "Stake follows the sequence",
    description: "Walks the Fibonacci ladder 1, 1, 2, 3, 5, 8 on losing runs and steps back two levels after a win. Gentler than Martingale, slower to recover.",
    riskLevel: "high",
    markets: ["synthetics", "forex"],
    typicalDrawdown: -412.6,
    historicalWinRate: 66.2,
    recoveryPerLoss: 1.618,
    engineNote: "The ladder is clamped to max stake, so the tail of the sequence shrinks rather than breaches your cap.",
    rules: ["+1 Fibonacci level per loss", "Two levels back per win", "Ladder clamped to max stake"],
    defaultParams: { levels: 8, baseStake: 0.35, stepBack: 2 },
    params: [
      { key: "levels", label: "Ladder depth", kind: "number", min: 3, max: 12, step: 1, help: "Sequence levels before halting." },
      { key: "baseStake", label: "Base stake", kind: "number", suffix: "USD", min: 0.35, max: 25, step: 0.05, help: "First level of the sequence." },
      { key: "stepBack", label: "Step back on win", kind: "number", min: 1, max: 4, step: 1, help: "Levels to unwind after a win." },
    ],
  },
  {
    id: "st_custom",
    name: "Custom Script",
    icon: "code",
    category: "custom",
    tagline: "Write your own entry logic",
    description: "Point the bot at one of your sandboxed JavaScript strategies. Parameter edits stay in the form — no code changes needed.",
    riskLevel: "medium",
    markets: ["synthetics", "forex", "crypto", "commodities", "indices"],
    typicalDrawdown: -284.4,
    historicalWinRate: 58.4,
    recoveryPerLoss: 1.2,
    engineNote: "Scripts run in the VM2 sandbox; a lint pass must pass before the bot can be armed.",
    rules: ["Engine calls api.buy() with your stake", "risk.assert() halts on breach", "Lint must be clean to arm"],
    defaultParams: { scriptId: "scr_01", strictLint: "Yes" },
    params: [
      { key: "strictLint", label: "Strict lint", kind: "select", options: ["Yes", "Warn only"], help: "Block arming on lint errors." },
    ],
  },
  {
    id: "st_ai_adaptive",
    name: "AI Adaptive",
    icon: "brain",
    category: "ai",
    tagline: "ML-adjusted sizing",
    description: "Size and direction adapt to realised volatility, recent win rate and session liquidity. Every adaptation is written to the config audit trail.",
    riskLevel: "medium",
    markets: ["synthetics", "forex", "crypto"],
    typicalDrawdown: -196.2,
    historicalWinRate: 63.4,
    recoveryPerLoss: 1.35,
    engineNote: "Adaptations are capped at ±35% of the configured stake and logged field-by-field.",
    rules: ["Volatility-scaled stake", "Win-rate dampener", "Hard caps always win over the model"],
    defaultParams: { aggressiveness: "Balanced", maxAdapt: 35, model: "vl-7 volatility mixer" },
    params: [
      { key: "aggressiveness", label: "Aggressiveness", kind: "select", options: ["Cautious", "Balanced", "Aggressive"], help: "How hard the model is allowed to size." },
      { key: "maxAdapt", label: "Max adaptation", kind: "number", suffix: "%", min: 5, max: 50, step: 5, help: "Ceiling on any model-driven stake change." },
      { key: "model", label: "Model", kind: "select", options: ["vl-7 volatility mixer", "vr-3 win-rate dampener", "dual: vl-7 + vr-3"], help: "Which tuned model drives the sizing." },
    ],
  },
];

// -----------------------------------------------------------------------------
// Community strategy marketplace (advanced feature #2 — one-click import)
// -----------------------------------------------------------------------------
export interface MarketplaceStrategy {
  id: string;
  name: string;
  author: string;
  authorTier: "verified" | "pro" | "member";
  symbol: string;
  contractType: ContractTypeId;
  duration: number;
  durationUnit: DurationUnit;
  stake: number;
  risk: "low" | "medium" | "high";
  winRate: number;
  maxDrawdown: number;
  trades: number;
  sharpe: number;
  rating: number;
  reviews: number;
  imports: number;
  price: number;
  version: string;
  category: StrategyCategory;
  tags: string[];
  description: string;
  rules: string[];
  updatedMin: number;
}

export const MARKETPLACE_STRATEGIES: MarketplaceStrategy[] = [
  {
    id: "mkt_01", name: "Vol10 Martingale Core", author: "Ade F.", authorTier: "verified", symbol: "R_10", contractType: "rise_fall",
    duration: 5, durationUnit: "ticks", stake: 0.35, risk: "medium", winRate: 68.4, maxDrawdown: -318.4, trades: 4218, sharpe: 1.42,
    rating: 4.8, reviews: 412, imports: 1840, price: 0, version: "7.2.1", category: "preset", tags: ["martingale", "synthetics", "ticks"],
    description: "The classic 2.1× recovery ladder on Volatility 10 with a $50 stake cap and engine-enforced stop-loss. Tuned over 4,218 demo contracts.",
    rules: ["5-tick Rise/Fall on R_10", "2.1× step after a loss, reset on a win", "Hard stake cap $50 · stop-loss $250"],
    updatedMin: 140,
  },
  {
    id: "mkt_02", name: "1s Accumulator Sniper", author: "Mina L.", authorTier: "pro", symbol: "1HZ10V", contractType: "accumulator",
    duration: 5, durationUnit: "ticks", stake: 3, risk: "low", winRate: 82.1, maxDrawdown: -82.4, trades: 2864, sharpe: 1.88,
    rating: 4.9, reviews: 268, imports: 2680, price: 0, version: "3.0.4", category: "preset", tags: ["accumulator", "1s-index", "range"],
    description: "Rides the ±0.1% range on the 1-second Volatility 10 and exits on the first range break. One live accumulator at a time.",
    rules: ["5-tick Accumulator, 3% growth rate", "Exit on the first range break", "Max 1 live accumulator at a time"],
    updatedMin: 320,
  },
  {
    id: "mkt_03", name: "Digit Differ 5 Sniper", author: "Jozef K.", authorTier: "verified", symbol: "R_25", contractType: "digits",
    duration: 3, durationUnit: "ticks", stake: 1, risk: "high", winRate: 88.9, maxDrawdown: -188.2, trades: 9840, sharpe: 2.06,
    rating: 4.6, reviews: 344, imports: 2210, price: 29, version: "5.1.0", category: "preset", tags: ["digits", "frequency", "ticks"],
    description: "DIGITDIFFER excluding the two coldest digits over the last 1,000 ticks. Recalibrates the frequency table every 1,000 ticks.",
    rules: ["DIGITDIFF on the coldest digit", "3-tick duration, flat $1 stake", "Recalibrate every 1,000 ticks"],
    updatedMin: 1180,
  },
  {
    id: "mkt_04", name: "London FX Breakout", author: "Priya N.", authorTier: "pro", symbol: "frxEURUSD", contractType: "rise_fall",
    duration: 15, durationUnit: "minutes", stake: 25, risk: "medium", winRate: 57.6, maxDrawdown: -412.6, trades: 268, sharpe: 0.94,
    rating: 4.7, reviews: 189, imports: 1840, price: 49, version: "4.4.2", category: "preset", tags: ["breakout", "forex", "session"],
    description: "Arms 07:00–10:30 UTC and trades the first break of the 4-hour Asian range on EUR/USD with an exposure cap of $150.",
    rules: ["Arm 07:00–10:30 UTC", "Trade the 4h Asian range break", "Exposure cap $150 open stakes"],
    updatedMin: 640,
  },
  {
    id: "mkt_05", name: "Gold Touch Ladder", author: "Tomas B.", authorTier: "member", symbol: "frxXAUUSD", contractType: "touch",
    duration: 8, durationUnit: "hours", stake: 20, risk: "high", winRate: 48.7, maxDrawdown: -684.2, trades: 146, sharpe: -0.38,
    rating: 3.9, reviews: 96, imports: 640, price: 0, version: "2.2.0", category: "preset", tags: ["touch", "metals", "ladder"],
    description: "Eight-hour one-touch ladder $5.40 above spot, blacked out 30 minutes either side of US CPI. High variance — size accordingly.",
    rules: ["One-touch $5.40 above spot", "Blackout around US CPI", "Max 2 concurrent legs"],
    updatedMin: 2600,
  },
  {
    id: "mkt_06", name: "BTC ATR Grid", author: "Lena S.", authorTier: "verified", symbol: "cryBTCUSD", contractType: "rise_fall",
    duration: 30, durationUnit: "minutes", stake: 12, risk: "medium", winRate: 59.2, maxDrawdown: -386.4, trades: 802, sharpe: 1.24,
    rating: 4.5, reviews: 231, imports: 1420, price: 19, version: "3.6.1", category: "preset", tags: ["crypto", "grid", "atr"],
    description: "Fixed-stake 30-minute grid on BTC/USD with spacing recalculated weekly from the 14-day ATR. Weekend sizing halved automatically.",
    rules: ["30-minute Rise/Fall grid", "ATR(14) weekly recalibration", "Weekend stake halved"],
    updatedMin: 880,
  },
  {
    id: "mkt_07", name: "GBP Mean Reversion", author: "Ade F.", authorTier: "verified", symbol: "frxGBPUSD", contractType: "rise_fall",
    duration: 1, durationUnit: "hours", stake: 8, risk: "medium", winRate: 63.4, maxDrawdown: -196.4, trades: 372, sharpe: 1.36,
    rating: 4.6, reviews: 154, imports: 1180, price: 0, version: "2.9.3", category: "preset", tags: ["forex", "z-score", "fade"],
    description: "Fades 1.5-sigma deviations from the 60-tick mean on GBP/USD with a hard $120 daily stop.",
    rules: ["Fade ±1.5σ from the 60-tick mean", "1-hour expiry", "Daily stop $120"],
    updatedMin: 1520,
  },
  {
    id: "mkt_08", name: "ETH Multiplier Trend", author: "Kai W.", authorTier: "pro", symbol: "cryETHUSD", contractType: "multiplier",
    duration: 2, durationUnit: "days", stake: 60, risk: "high", winRate: 60.9, maxDrawdown: -742.8, trades: 92, sharpe: 1.06,
    rating: 4.4, reviews: 88, imports: 860, price: 39, version: "1.8.0", category: "preset", tags: ["crypto", "multiplier", "trend"],
    description: "50× multiplier trend leg with stop-out at half the stake and take-profit at 1.5×, max two legs per day.",
    rules: ["50× MULTUP on daily entries", "Stop-out at 50% of stake", "Max 2 legs per day"],
    updatedMin: 3200,
  },
  {
    id: "mkt_09", name: "Index DCA Basket", author: "Nadia R.", authorTier: "verified", symbol: "OTC_NDX", contractType: "higher_lower",
    duration: 1, durationUnit: "days", stake: 20, risk: "medium", winRate: 61.7, maxDrawdown: -642.9, trades: 412, sharpe: 1.18,
    rating: 4.7, reviews: 176, imports: 1540, price: 25, version: "4.1.5", category: "preset", tags: ["indices", "dca", "basket"],
    description: "Adds one daily Higher/Lower leg while price holds above the 20-day mean and scales out at +12% basket P&L.",
    rules: ["Daily Higher/Lower at +0.15% barrier", "1.25× add step, max 4 legs", "Scale out at +12% basket P&L"],
    updatedMin: 430,
  },
  {
    id: "mkt_10", name: "Vol75 Touch Sniper", author: "Mina L.", authorTier: "pro", symbol: "R_75", contractType: "touch",
    duration: 2, durationUnit: "hours", stake: 2, risk: "high", winRate: 48.7, maxDrawdown: -284.4, trades: 304, sharpe: 1.02,
    rating: 4.5, reviews: 112, imports: 990, price: 0, version: "2.0.7", category: "preset", tags: ["touch", "synthetics"],
    description: "One-touch contracts 0.04% above spot on Volatility 75 with a two-hour expiry window and a 3-loss cooldown.",
    rules: ["One-touch 0.04% above spot", "2-hour expiry", "Cooldown 5 min after 3 losses"],
    updatedMin: 1980,
  },
  {
    id: "mkt_11", name: "Even/Odd Parity Filter", author: "Sam O.", authorTier: "member", symbol: "R_100", contractType: "even_odd",
    duration: 5, durationUnit: "ticks", stake: 0.5, risk: "medium", winRate: 55.8, maxDrawdown: -96.2, trades: 6420, sharpe: 1.14,
    rating: 4.2, reviews: 74, imports: 1730, price: 0, version: "1.4.2", category: "preset", tags: ["digits", "parity", "ticks"],
    description: "Trades last-digit parity only when the previous 100 ticks skew at least 58/42 one way. Long grind, tiny stakes.",
    rules: ["DIGITEVEN/DIGITODD on 58/42 skew", "5-tick duration, $0.50 flat", "Skip 3 ticks after any loss"],
    updatedMin: 3400,
  },
  {
    id: "mkt_12", name: "Fibonacci Forex Ladder", author: "Jozef K.", authorTier: "verified", symbol: "frxEURUSD", contractType: "rise_fall",
    duration: 30, durationUnit: "minutes", stake: 0.35, risk: "high", winRate: 66.2, maxDrawdown: -412.6, trades: 1840, sharpe: 0.81,
    rating: 4.1, reviews: 63, imports: 720, price: 15, version: "3.3.0", category: "preset", tags: ["fibonacci", "forex", "recovery"],
    description: "Fibonacci recovery ladder on EUR/USD clamped to an $80 stake ceiling; steps two levels back after each win.",
    rules: ["1-1-2-3-5-8 recovery ladder", "Two levels back per win", "Clamp at $80, halt at $300 daily loss"],
    updatedMin: 2240,
  },
];

// -----------------------------------------------------------------------------
// Draft auto-save & resume (advanced feature #7)
// -----------------------------------------------------------------------------
export interface BotDraft {
  id: string;
  name: string;
  symbol: string;
  strategy: Bot["strategy"];
  stake: number;
  step: number;
  origin: "cloud" | "local";
  completeness: number;
  updatedMin: number;
  loginId: string;
  note: string;
  tags: string[];
}

export const BOT_DRAFTS: BotDraft[] = [
  { id: "drf_01", name: "Vol10 Martingale Core v8", symbol: "R_10", strategy: "martingale", stake: 0.35, step: 4, origin: "cloud", completeness: 92, updatedMin: 3, loginId: "VRTC9031442", note: "Backtest queued — waiting on the 30-day sweep before arming.", tags: ["recovery", "synthetics"] },
  { id: "drf_02", name: "1s Accumulator Sniper", symbol: "1HZ10V", strategy: "accumulator", stake: 3, step: 3, origin: "cloud", completeness: 78, updatedMin: 22, loginId: "VRTC9031442", note: "Risk limits still on the default daily loss — tighten before going live.", tags: ["range", "1s-index"] },
  { id: "drf_03", name: "Digit Differ 5 clone", symbol: "R_25", strategy: "digit", stake: 1, step: 2, origin: "local", completeness: 54, updatedMin: 41, loginId: "VRTC9031442", note: "Imported from the marketplace; parameter mapping left at author defaults.", tags: ["digits"] },
  { id: "drf_04", name: "London Breakout FX", symbol: "frxEURUSD", strategy: "scalping", stake: 25, step: 4, origin: "cloud", completeness: 88, updatedMin: 96, loginId: "CR8842197", note: "Session window set to 07:00–10:30 UTC. Needs the weekend blackout rule.", tags: ["forex", "session"] },
  { id: "drf_05", name: "GBP Mean Reversion v2", symbol: "frxGBPUSD", strategy: "scalping", stake: 8, step: 3, origin: "cloud", completeness: 71, updatedMin: 168, loginId: "CR8842197", note: "Z-score threshold at 1.5σ — testing 1.8σ variant next.", tags: ["forex", "fade"] },
  { id: "drf_06", name: "BTC ATR Grid weekend", symbol: "cryBTCUSD", strategy: "fixed", stake: 12, step: 2, origin: "local", completeness: 46, updatedMin: 214, loginId: "CR8842197", note: "Weekend sizing halved; ATR recalibration cron not configured yet.", tags: ["crypto", "grid"] },
  { id: "drf_07", name: "ETH Multiplier Trend", symbol: "cryETHUSD", strategy: "swing", stake: 60, step: 3, origin: "cloud", completeness: 82, updatedMin: 402, loginId: "MX5520143", note: "50× multiplier with stop-out at half stake. Multi-account routing pending.", tags: ["crypto", "multiplier"] },
  { id: "drf_08", name: "Vol75 Touch Sniper", symbol: "R_75", strategy: "scalping", stake: 2, step: 4, origin: "cloud", completeness: 95, updatedMin: 640, loginId: "VRTC9031442", note: "Ready to arm — cooldown after 3 losses set to 5 minutes.", tags: ["touch", "synthetics"] },
  { id: "drf_09", name: "Index DCA Basket", symbol: "OTC_NDX", strategy: "dca", stake: 20, step: 3, origin: "local", completeness: 63, updatedMin: 1180, loginId: "MX5520143", note: "Max legs still 6; author preset suggests 4 for this margin profile.", tags: ["indices", "dca"] },
  { id: "drf_10", name: "Even/Odd Parity Filter", symbol: "R_100", strategy: "digit", stake: 0.5, step: 2, origin: "cloud", completeness: 49, updatedMin: 1920, loginId: "VRTC9031442", note: "Skew threshold 58/42; needs a 500-tick sample before arming.", tags: ["digits", "parity"] },
  { id: "drf_11", name: "Gold Touch Ladder", symbol: "frxXAUUSD", strategy: "swing", stake: 20, step: 3, origin: "cloud", completeness: 74, updatedMin: 2600, loginId: "CR8842197", note: "CPI blackout copied from the marketplace rules — verify the window.", tags: ["metals", "touch"] },
  { id: "drf_12", name: "USDJPY Range Fade", symbol: "frxUSDJPY", strategy: "fixed", stake: 5, step: 1, origin: "local", completeness: 28, updatedMin: 4320, loginId: "CR8842197", note: "Only the symbol and stake are set — strategy not chosen yet.", tags: ["forex", "range"] },
];

// -----------------------------------------------------------------------------
// Saved parameter sets (templates with variables — advanced feature #6)
// -----------------------------------------------------------------------------
export interface StrategyParameterSet {
  id: string;
  name: string;
  strategy: Bot["strategy"];
  symbol: string;
  stake: number;
  multiplier: number;
  maxSteps: number;
  duration: number;
  durationUnit: DurationUnit;
  takeProfit: number;
  stopLoss: number;
  winRate: number;
  pnl: number;
  drawdown: number;
  sharpe: number;
  uses: number;
  owner: string;
  updatedMin: number;
  visibility: "private" | "team" | "public";
}

const DUR = (n: number, u: DurationUnit) => ({ n, u });

export const STRATEGY_PARAMETER_SETS: StrategyParameterSet[] = [
  { id: "ps_01", name: "Martingale base 0.35", strategy: "martingale", symbol: "R_10", stake: 0.35, multiplier: 2.1, maxSteps: 5, duration: DUR(5, "ticks").n, durationUnit: "ticks", takeProfit: 50, stopLoss: 25, winRate: 68.4, pnl: 128.4, drawdown: -318.4, sharpe: 1.42, uses: 214, owner: "Ade F.", updatedMin: 41, visibility: "team" },
  { id: "ps_02", name: "Martingale aggressive 2.6×", strategy: "martingale", symbol: "R_25", stake: 1, multiplier: 2.6, maxSteps: 6, duration: 3, durationUnit: "ticks", takeProfit: 180, stopLoss: 120, winRate: 64.1, pnl: 402.6, drawdown: -642.8, sharpe: 0.88, uses: 62, owner: "Ade F.", updatedMin: 320, visibility: "private" },
  { id: "ps_03", name: "Accumulator 1s tight", strategy: "accumulator", symbol: "1HZ10V", stake: 3, multiplier: 1, maxSteps: 1, duration: 5, durationUnit: "ticks", takeProfit: 30, stopLoss: 18, winRate: 82.1, pnl: 314.8, drawdown: -82.4, sharpe: 1.88, uses: 186, owner: "Mina L.", updatedMin: 96, visibility: "public" },
  { id: "ps_04", name: "Digit differ cold-2", strategy: "digit", symbol: "R_25", stake: 1, multiplier: 1.2, maxSteps: 4, duration: 3, durationUnit: "ticks", takeProfit: 45, stopLoss: 60, winRate: 88.9, pnl: 862.4, drawdown: -188.2, sharpe: 2.06, uses: 342, owner: "Jozef K.", updatedMin: 1180, visibility: "public" },
  { id: "ps_05", name: "DCA index 4-leg", strategy: "dca", symbol: "OTC_NDX", stake: 20, multiplier: 1.25, maxSteps: 4, duration: 1, durationUnit: "days", takeProfit: 620, stopLoss: 400, winRate: 61.7, pnl: 412.18, drawdown: -642.9, sharpe: 1.18, uses: 128, owner: "Nadia R.", updatedMin: 430, visibility: "team" },
  { id: "ps_06", name: "Fixed stake scalp 15m", strategy: "fixed", symbol: "frxEURUSD", stake: 10, multiplier: 1, maxSteps: 1, duration: 15, durationUnit: "minutes", takeProfit: 90, stopLoss: 75, winRate: 57.6, pnl: 96.75, drawdown: -148.6, sharpe: 0.94, uses: 302, owner: "Priya N.", updatedMin: 640, visibility: "team" },
  { id: "ps_07", name: "Anti-martingale press", strategy: "martingale", symbol: "R_50", stake: 2, multiplier: 1.5, maxSteps: 4, duration: 5, durationUnit: "ticks", takeProfit: 140, stopLoss: 90, winRate: 59.8, pnl: 248.2, drawdown: -228.6, sharpe: 1.31, uses: 74, owner: "Sam O.", updatedMin: 880, visibility: "private" },
  { id: "ps_08", name: "Fibonacci EURUSD 8-level", strategy: "martingale", symbol: "frxEURUSD", stake: 0.35, multiplier: 1.618, maxSteps: 8, duration: 30, durationUnit: "minutes", takeProfit: 60, stopLoss: 300, winRate: 66.2, pnl: -84.4, drawdown: -412.6, sharpe: 0.81, uses: 51, owner: "Jozef K.", updatedMin: 2240, visibility: "public" },
  { id: "ps_09", name: "BTC grid 30m ATR", strategy: "fixed", symbol: "cryBTCUSD", stake: 12, multiplier: 1, maxSteps: 1, duration: 30, durationUnit: "minutes", takeProfit: 320, stopLoss: 260, winRate: 59.2, pnl: 2184.2, drawdown: -386.4, sharpe: 1.24, uses: 156, owner: "Lena S.", updatedMin: 1520, visibility: "public" },
  { id: "ps_10", name: "ETH multiplier 50× daily", strategy: "swing", symbol: "cryETHUSD", stake: 60, multiplier: 1, maxSteps: 2, duration: 2, durationUnit: "days", takeProfit: 900, stopLoss: 600, winRate: 60.9, pnl: 3025.5, drawdown: -742.8, sharpe: 1.06, uses: 38, owner: "Kai W.", updatedMin: 3200, visibility: "team" },
  { id: "ps_11", name: "Vol75 touch 2h", strategy: "scalping", symbol: "R_75", stake: 2, multiplier: 1.4, maxSteps: 3, duration: 2, durationUnit: "hours", takeProfit: 75, stopLoss: 140, winRate: 48.7, pnl: 749.2, drawdown: -284.4, sharpe: 1.02, uses: 88, owner: "Mina L.", updatedMin: 1980, visibility: "team" },
  { id: "ps_12", name: "Even/Odd skew 58/42", strategy: "digit", symbol: "R_100", stake: 0.5, multiplier: 1, maxSteps: 1, duration: 5, durationUnit: "ticks", takeProfit: 40, stopLoss: 55, winRate: 55.8, pnl: 132.6, drawdown: -96.2, sharpe: 1.14, uses: 268, owner: "Sam O.", updatedMin: 3400, visibility: "private" },
];

// -----------------------------------------------------------------------------
// Config audit trail — every field the creator, AI assistant, optimizer or an
// API client changed (rendered on the D-5 audit table).
// -----------------------------------------------------------------------------
export interface ConfigAuditEntry {
  id: string;
  botId: string;
  botName: string;
  atMin: number;
  actor: string;
  field: string;
  from: string;
  to: string;
  source: "wizard" | "ai-assistant" | "optimizer" | "marketplace-import" | "api" | "rollback";
  status: "applied" | "reverted" | "pending";
  riskDelta: "up" | "down" | "flat";
  note: string;
}

export const BOT_CONFIG_AUDIT: ConfigAuditEntry[] = [
  { id: "aud_01", botId: "bot_mart_10", botName: "Vol10 Martingale Core", atMin: 3, actor: "Amara O.", field: "strategyParams.multiplier", from: "2.0×", to: "2.1×", source: "optimizer", status: "applied", riskDelta: "up", note: "Grid search winner over the last 30 days (1,284 demo contracts)." },
  { id: "aud_02", botId: "bot_accu_1s", botName: "1s Accumulator Sniper", atMin: 9, actor: "Amara O.", field: "risk.maxDailyLoss", from: "$150.00", to: "$100.00", source: "wizard", status: "applied", riskDelta: "down", note: "Tightened after two breach alerts in the previous session." },
  { id: "aud_03", botId: "bot_digit_diff", botName: "Digit Differ Guard", atMin: 22, actor: "AI assistant", field: "tradeParams.duration", from: "5 ticks", to: "3 ticks", source: "ai-assistant", status: "applied", riskDelta: "down", note: "Brief: “shorter holds, fewer dwell ticks on R_25”." },
  { id: "aud_04", botId: "bot_dca_trend", botName: "DCA Trend Rider", atMin: 41, actor: "Amara O.", field: "tradeParams.stake", from: "$15.00", to: "$20.00", source: "wizard", status: "applied", riskDelta: "up", note: "Basket target raised in the same edit; margin headroom checked." },
  { id: "aud_05", botId: "bot_btc_grid", botName: "BTC ATR Grid", atMin: 64, actor: "Amara O.", field: "strategyParams.addStep", from: "1.10×", to: "1.25×", source: "marketplace-import", status: "applied", riskDelta: "up", note: "Author preset imported — step mapped from 1.25× default." },
  { id: "aud_06", botId: "bot_gbp_rev", botName: "GBP Mean Reversion", atMin: 96, actor: "API client dx_cli_7f31", field: "risk.cooldownMinutes", from: "5 min", to: "12 min", source: "api", status: "applied", riskDelta: "down", note: "PATCH /api/bots/bot_gbp_rev from the automation hub." },
  { id: "aud_07", botId: "bot_mart_10", botName: "Vol10 Martingale Core", atMin: 148, actor: "Amara O.", field: "tradeParams.stopLoss", from: "$200.00", to: "$250.00", source: "wizard", status: "reverted", riskDelta: "up", note: "Rolled back after the drawdown review — see version v7.1.4." },
  { id: "aud_08", botId: "bot_eth_mult", botName: "ETH Multiplier Trend", atMin: 212, actor: "AI assistant", field: "strategyParams.maxAdapt", from: "50%", to: "35%", source: "ai-assistant", status: "applied", riskDelta: "down", note: "Adaptation ceiling lowered to match the $600 stop-out." },
  { id: "aud_09", botId: "bot_vol75_touch", botName: "Vol75 Touch Sniper", atMin: 268, actor: "Amara O.", field: "tradeParams.barrier", from: "+0.06%", to: "+0.04%", source: "wizard", status: "applied", riskDelta: "up", note: "Barrier tightened to lift hit probability in the 2-hour window." },
  { id: "aud_10", botId: "bot_index_dca", botName: "Index DCA Basket", atMin: 340, actor: "Amara O.", field: "strategyParams.maxLegs", from: "6 legs", to: "4 legs", source: "optimizer", status: "applied", riskDelta: "down", note: "Optimizer flagged leg 5–6 as the entire left tail on the 12-month sample." },
  { id: "aud_11", botId: "bot_accu_1s", botName: "1s Accumulator Sniper", atMin: 402, actor: "Amara O.", field: "tradeParams.contractType", from: "Rise/Fall", to: "Accumulator", source: "wizard", status: "applied", riskDelta: "down", note: "Switched to range contracts after the 1s index regime change." },
  { id: "aud_12", botId: "bot_gold_touch", botName: "Gold Touch Ladder", atMin: 610, actor: "API client dx_cli_2b09", field: "schedule.blackoutNews", from: "false", to: "true", source: "api", status: "pending", riskDelta: "down", note: "Awaiting the next tick window to apply the CPI blackout." },
  { id: "aud_13", botId: "bot_digit_diff", botName: "Digit Differ Guard", atMin: 880, actor: "Amara O.", field: "tradeParams.stake", from: "$0.50", to: "$1.00", source: "wizard", status: "applied", riskDelta: "up", note: "Flat stake doubled; win-rate model unchanged." },
  { id: "aud_14", botId: "bot_btc_grid", botName: "BTC ATR Grid", atMin: 1180, actor: "Amara O.", field: "risk.maxDailyTrades", from: "240", to: "500", source: "rollback", status: "applied", riskDelta: "up", note: "Restored from template “BTC ATR Grid weekend” after the weekend test." },
];

// -----------------------------------------------------------------------------
// Config versions (edit history for /dashboard/bots/:id/config)
// -----------------------------------------------------------------------------
export interface ConfigVersion {
  id: string;
  botId: string;
  version: string;
  atMin: number;
  author: string;
  label: string;
  changes: number;
  status: "current" | "live" | "rolled-back" | "draft";
  summary: string;
  hash: string;
}

export const CONFIG_VERSIONS: ConfigVersion[] = [
  { id: "cv_01", botId: "bot_mart_10", version: "v7.2.1", atMin: 3, author: "Amara O.", label: "Optimizer winner applied", changes: 3, status: "current", summary: "Multiplier 2.0× → 2.1×, max steps 4 → 5, cooldown 5 → 8 min.", hash: "9f2ac41" },
  { id: "cv_02", botId: "bot_mart_10", version: "v7.2.0", atMin: 118, author: "Amara O.", label: "Stop-loss raised", changes: 1, status: "live", summary: "Stop-loss $200 → $250 ahead of the weekend gap risk.", hash: "77be103" },
  { id: "cv_03", botId: "bot_mart_10", version: "v7.1.4", atMin: 148, author: "Amara O.", label: "Rollback", changes: 1, status: "rolled-back", summary: "Reverted stop-loss to $200 after the drawdown review.", hash: "4011de9" },
  { id: "cv_04", botId: "bot_mart_10", version: "v7.1.3", atMin: 402, author: "AI assistant", label: "Draft from brief", changes: 6, status: "draft", summary: "“R_10 every 5 ticks, double on loss, cap 5 steps” parsed into config.", hash: "c0ffee2" },
  { id: "cv_05", botId: "bot_accu_1s", version: "v3.0.4", atMin: 9, author: "Amara O.", label: "Daily loss cut", changes: 2, status: "current", summary: "Max daily loss $150 → $100, cooldown 5 → 6 min.", hash: "5d81ba7" },
  { id: "cv_06", botId: "bot_accu_1s", version: "v3.0.3", atMin: 402, author: "Amara O.", label: "Contract type switch", changes: 2, status: "live", summary: "Rise/Fall → Accumulator, growth rate 3% pinned.", hash: "bb02ae4" },
  { id: "cv_07", botId: "bot_digit_diff", version: "v5.1.0", atMin: 22, author: "AI assistant", label: "Duration shortened", changes: 2, status: "current", summary: "5 ticks → 3 ticks, cold-digit window 800 → 1,000 ticks.", hash: "aa19f07" },
  { id: "cv_08", botId: "bot_digit_diff", version: "v5.0.2", atMin: 880, author: "Amara O.", label: "Stake doubled", changes: 1, status: "live", summary: "Flat stake $0.50 → $1.00, stop-loss unchanged at $60.", hash: "de77031" },
  { id: "cv_09", botId: "bot_index_dca", version: "v4.1.5", atMin: 340, author: "Optimizer", label: "Leg cap reduced", changes: 1, status: "current", summary: "Max legs 6 → 4; add step held at 1.25×.", hash: "3110cd8" },
  { id: "cv_10", botId: "bot_index_dca", version: "v4.1.2", atMin: 2270, author: "Amara O.", label: "Scale-out raised", changes: 3, status: "live", summary: "Basket target +9% → +12%, higher/lower barrier +0.15%.", hash: "6ba4e20" },
  { id: "cv_11", botId: "bot_btc_grid", version: "v3.6.1", atMin: 64, author: "Amara O.", label: "Marketplace import", changes: 5, status: "current", summary: "Imported “BTC ATR Grid”; ATR window mapped to 14 days.", hash: "82c9f13" },
  { id: "cv_12", botId: "bot_btc_grid", version: "v3.6.0", atMin: 1180, author: "Amara O.", label: "Weekend sizing", changes: 2, status: "rolled-back", summary: "Weekend stake halved — rolled back after thin-liquidity slippage.", hash: "0a7712f" },
];

// -----------------------------------------------------------------------------
// Engine log tape (creation + runtime channel for the live drawer)
// -----------------------------------------------------------------------------
export interface CreatorLogLine {
  id: string;
  atMin: number;
  level: "info" | "warn" | "error";
  channel: "engine" | "risk" | "feed" | "config";
  message: string;
}

export const CREATOR_LOG_LINES: CreatorLogLine[] = [
  { id: "lg_01", atMin: 1, level: "info", channel: "config", message: "Draft drf_01 autosaved (4 fields dirty) → cloud" },
  { id: "lg_02", atMin: 2, level: "info", channel: "engine", message: "Strategy st_martingale validated against bot_jobs schema v12" },
  { id: "lg_03", atMin: 4, level: "warn", channel: "risk", message: "Max stake $100.00 is 285× the initial stake — recovery depth capped at 5 steps" },
  { id: "lg_04", atMin: 6, level: "info", channel: "feed", message: "Subscribed R_10 tick stream · latency 12 ms · pip size 3" },
  { id: "lg_05", atMin: 9, level: "error", channel: "config", message: "Script scr_07 line 14: unexpected token '}' — lint blocked step 4" },
  { id: "lg_06", atMin: 12, level: "info", channel: "engine", message: "Backtest bt_13 queued on the 30-day demo tape (R_10, 5 ticks)" },
  { id: "lg_07", atMin: 13, level: "info", channel: "engine", message: "Backtest bt_13 complete · 4,218 contracts · win rate 68.4% · P&L +$1,284.60" },
  { id: "lg_08", atMin: 18, level: "info", channel: "risk", message: "Risk guard armed: daily loss $100.00 · 500 trades · 3-loss cooldown 5 min" },
  { id: "lg_09", atMin: 24, level: "warn", channel: "feed", message: "OTC_NDX feed delayed 4.2 s — index rollover window, sizing paused" },
  { id: "lg_10", atMin: 31, level: "info", channel: "config", message: "Parameter set ps_01 applied (multiplier 2.1×, 5 steps, $0.35 base)" },
  { id: "lg_11", atMin: 42, level: "info", channel: "engine", message: "Monte-Carlo mc_04 finished 1,000 runs · p05 −$412.80 · ruin 4.1%" },
  { id: "lg_12", atMin: 58, level: "warn", channel: "risk", message: "Cooldown triggered after 3 consecutive losses — paused 5 min 00 s" },
  { id: "lg_13", atMin: 74, level: "info", channel: "engine", message: "Engine slot 3/8 reserved for 4 h · queue depth 0" },
  { id: "lg_14", atMin: 96, level: "error", channel: "feed", message: "Reconnect to wss://ws.derivws.com/websockets/v3 after ping timeout (1 attempt)" },
];

// -----------------------------------------------------------------------------
// Symbol health (edge case: a symbol goes unavailable mid-config)
// -----------------------------------------------------------------------------
export interface HaltedSymbol {
  code: string;
  reason: string;
  untilMin: number;
  impact: string;
  alternatives: string[];
}

export const HALTED_SYMBOLS: HaltedSymbol[] = [
  { code: "OTC_NDX", reason: "Index rollover — quote feed paused", untilMin: 34, impact: "DCA legs will not be accepted until the feed resumes.", alternatives: ["OTC_SPC", "OTC_DJI", "R_100"] },
  { code: "frxXAUUSD", reason: "US CPI release — metals blackout window", untilMin: 52, impact: "Touch ladders would open with a widened spread.", alternatives: ["frxXAGUSD", "frxEURUSD", "R_75"] },
  { code: "cryETHUSD", reason: "Exchange maintenance on the ETH spot feed", untilMin: 88, impact: "Multiplier stop-outs would execute late.", alternatives: ["cryBTCUSD", "R_100", "1HZ100V"] },
  { code: "frxUSDJPY", reason: "BoJ statement blackout", untilMin: 141, impact: "Range-fade entries would fire into a spread spike.", alternatives: ["frxAUDUSD", "frxGBPUSD", "frxUSDCAD"] },
  { code: "OTC_N225", reason: "Japan 225 outside its 00:00–06:00 UTC session", untilMin: 610, impact: "Bot would sit idle — schedule it for the Tokyo open instead.", alternatives: ["OTC_NDX", "OTC_DJI", "1HZ100V"] },
];

// -----------------------------------------------------------------------------
// AI strategy assistant briefs (advanced feature #1 — natural language → config)
// -----------------------------------------------------------------------------
export interface AiStrategyBrief {
  id: string;
  prompt: string;
  title: string;
  strategyId: string;
  patch: Partial<BotConfigDraft>;
  script: string;
  changes: string[];
  assumptions: string[];
  confidence: number;
}

export const AI_STRATEGY_BRIEFS: AiStrategyBrief[] = [
  {
    id: "ai_01",
    prompt: "I want a bot that trades R_10 every 5 ticks and doubles stake on loss, max 5 steps, keep it under $50 a leg",
    title: "R_10 Martingale, capped at 5 steps",
    strategyId: "st_martingale",
    patch: { symbol: "R_10", contractType: "rise_fall", stake: 0.35, maxStake: 50, duration: 5, durationUnit: "ticks", takeProfit: 50, stopLoss: 25, strategyParams: { multiplier: 2, onWin: "Reset to initial stake", onLoss: "Multiply stake", maxSteps: 5 } },
    script: "const { api, risk } = DerivX;\napi.onTick(\"R_10\", (t) => {\n  const step = api.get(\"step\", 0);           // 0..5 recovery ladder\n  const stake = Math.min(0.35 * Math.pow(2, step), 50);\n  risk.assert(stake <= 50, \"stake cap\");\n  api.buy({ symbol: \"R_10\", contract_type: \"CALL\", amount: stake, duration: 5, duration_unit: \"t\" });\n});",
    changes: ["symbol → R_10", "duration → 5 ticks", "stake → $0.35", "maxStake → $50.00", "strategy → Martingale (2× · 5 steps)"],
    assumptions: ["Direction uses the engine's default momentum filter (20-tick SMA).", "Take-profit $50 / stop-loss $25 suggested from the Martingale baseline."],
    confidence: 0.94,
  },
  {
    id: "ai_02",
    prompt: "Make an accumulator bot on the 1-second index that takes profit after five in-range ticks and never risks more than $18 a day",
    title: "1s index Accumulator, $18 daily risk",
    strategyId: "st_dca",
    patch: { symbol: "1HZ10V", contractType: "accumulator", stake: 3, maxStake: 9, duration: 5, durationUnit: "ticks", takeProfit: 30, stopLoss: 18, risk: { maxDailyLoss: 18, maxDailyTrades: 240, cooldownCount: 2, cooldownMinutes: 5, maxConsecutiveLosses: 4 } },
    script: "const { api, risk } = DerivX;\nlet inRange = 0;\napi.onTick(\"1HZ10V\", (t) => {\n  if (!api.within(t.quote, 0.001)) { inRange = 0; return; }\n  inRange += 1;\n  if (inRange >= 5) { api.sellAll(\"take profit after 5 in-range ticks\"); inRange = 0; return; }\n  risk.assert(api.dailyPnl() > -18, \"daily loss cap\");\n  api.buy({ symbol: \"1HZ10V\", contract_type: \"ACCU\", amount: 3, growth_rate: 0.03, duration: 5, duration_unit: \"t\" });\n});",
    changes: ["symbol → 1HZ10V", "contractType → Accumulator", "stake → $3.00", "duration → 5 ticks", "risk.maxDailyLoss → $18.00"],
    assumptions: ["Growth rate pinned at the 3% Deriv default for 1s indices.", "Sell-out is evaluated on every tick, not on bar close."],
    confidence: 0.9,
  },
  {
    id: "ai_03",
    prompt: "Fade GBPUSD when it stretches 1.5 sigma from the 60-tick mean, one hour expiry, stop the day at $120",
    title: "GBP/USD mean reversion, $120 daily stop",
    strategyId: "st_fixed",
    patch: { symbol: "frxGBPUSD", contractType: "rise_fall", stake: 8, maxStake: 24, duration: 1, durationUnit: "hours", takeProfit: 140, stopLoss: 120, strategyParams: { onWin: "Hold current stake", onLoss: "Hold current stake" } },
    script: "const { api, risk } = DerivX;\napi.onTick(\"frxGBPUSD\", (t) => {\n  const z = api.zscore(\"frxGBPUSD\", 60);\n  risk.assert(api.dailyPnl() > -120, \"daily stop\");\n  if (z > 1.5)  api.buy({ symbol: \"frxGBPUSD\", contract_type: \"PUT\",  amount: 8, duration: 1, duration_unit: \"h\" });\n  if (z < -1.5) api.buy({ symbol: \"frxGBPUSD\", contract_type: \"CALL\", amount: 8, duration: 1, duration_unit: \"h\" });\n});",
    changes: ["symbol → frxGBPUSD", "strategy → Fixed Stake", "stake → $8.00", "duration → 1 hour", "risk.maxDailyLoss → $120.00"],
    assumptions: ["One position at a time — the engine rejects overlapping entries on the same symbol.", "Mean and σ rebuilt from the last 60 ticks with no session weighting."],
    confidence: 0.87,
  },
  {
    id: "ai_04",
    prompt: "Trade digit differ on Volatility 25 excluding the coldest digit, three ticks, flat one dollar stake",
    title: "R_25 Digit Differ, cold-digit filter",
    strategyId: "st_custom",
    patch: { symbol: "R_25", contractType: "digits", stake: 1, maxStake: 5, duration: 3, durationUnit: "ticks", takeProfit: 45, stopLoss: 60, strategyParams: { scriptId: "scr_03", strictLint: "Yes" } },
    script: "const { api } = DerivX;\napi.onTick(\"R_25\", (t) => {\n  const cold = api.coldDigits(\"R_25\", 1000, 2);   // two least frequent digits\n  const d = api.lastDigit(t.quote);\n  if (!cold.includes(d)) {\n    api.buy({ symbol: \"R_25\", contract_type: \"DIGITDIFF\", barrier: cold[0], amount: 1, duration: 3, duration_unit: \"t\" });\n  }\n});",
    changes: ["symbol → R_25", "contractType → Digits", "stake → $1.00", "duration → 3 ticks", "script → cold-digits differ"],
    assumptions: ["Frequency table warm-up needs 1,000 ticks before the first entry.", "Barrier follows the coldest digit, recomputed every 1,000 ticks."],
    confidence: 0.92,
  },
  {
    id: "ai_05",
    prompt: "Swing BTC with a 30 minute grid, twelve dollars a leg, halve the size on weekends",
    title: "BTC 30-minute grid with weekend damping",
    strategyId: "st_dca",
    patch: { symbol: "cryBTCUSD", contractType: "rise_fall", stake: 12, maxStake: 36, duration: 30, durationUnit: "minutes", takeProfit: 320, stopLoss: 260, strategyParams: { addStep: 1.25, maxLegs: 3, addTrigger: "-1 ATR" } },
    script: "const { api, schedule } = DerivX;\nschedule.weekend(() => api.set(\"sizeFactor\", 0.5));\napi.onBar(\"cryBTCUSD\", \"30m\", (bar) => {\n  const size = 12 * api.get(\"sizeFactor\", 1);\n  const dir = bar.close > bar.open ? \"CALL\" : \"PUT\";\n  api.buy({ symbol: \"cryBTCUSD\", contract_type: dir, amount: size, duration: 30, duration_unit: \"m\" });\n});",
    changes: ["symbol → cryBTCUSD", "duration → 30 minutes", "stake → $12.00", "maxLegs → 3", "addTrigger → -1 ATR"],
    assumptions: ["ATR window is 14 bars of the 30-minute series.", "Weekend damping starts Friday 21:00 UTC and lifts Sunday 22:00 UTC."],
    confidence: 0.85,
  },
];

// -----------------------------------------------------------------------------
// Script lint issues (edge case: a strategy script fails validation)
// -----------------------------------------------------------------------------
export interface ScriptLintIssue {
  id: string;
  scriptId: string;
  scriptName: string;
  line: number;
  column: number;
  severity: "error" | "warning";
  message: string;
  suggestion: string;
  offending: string;
  fixed: string;
}

export const SCRIPT_LINT_ISSUES: ScriptLintIssue[] = [
  { id: "lint_01", scriptId: "scr_07", scriptName: "Pip Hunter Martingale v3", line: 14, column: 3, severity: "error", message: "Unexpected end of file — the block opened at line 14 is never closed.", suggestion: "Close the if (last && !last.win) block before the return statement.", offending: "api.onTick(\"R_50\", (t) => {\n  const stake = ladder(t);\n\n});", fixed: "api.onTick(\"R_50\", (t) => {\n  const stake = ladder(t);\n  risk.assert(stake <= 25, \"stake cap\");\n});" },
  { id: "lint_02", scriptId: "scr_09", scriptName: "Vol100 Night Shift", line: 22, column: 11, severity: "error", message: "api.buy() called with duration_unit \"m\" on a 1-tick contract.", suggestion: "Digits contracts only accept the ticks unit — use duration_unit: \"t\" with duration 1–10.", offending: "api.buy({ symbol: \"R_100\", contract_type: \"DIGITOVER\", barrier: 4, amount: 2, duration: 5, duration_unit: \"m\" });", fixed: "api.buy({ symbol: \"R_100\", contract_type: \"DIGITOVER\", barrier: 4, amount: 2, duration: 5, duration_unit: \"t\" });" },
  { id: "lint_03", scriptId: "scr_11", scriptName: "Gold Session Fade", line: 31, column: 5, severity: "warning", message: "risk.assert() missing — the script can exceed the configured daily loss cap.", suggestion: "Add a pre-trade guard: risk.assert(api.dailyPnl() > -config.maxDailyLoss, \"daily stop\").", offending: "if (z > 2) api.buy({ symbol: \"frxXAUUSD\", contract_type: \"PUT\", amount: 20, duration: 4, duration_unit: \"h\" });", fixed: "risk.assert(api.dailyPnl() > -config.maxDailyLoss, \"daily stop\");\nif (z > 2) api.buy({ symbol: \"frxXAUUSD\", contract_type: \"PUT\", amount: 20, duration: 4, duration_unit: \"h\" });" },
  { id: "lint_04", scriptId: "scr_05", scriptName: "Multiplier Momentum", line: 18, column: 8, severity: "warning", message: "Multiplier contract without stop_loss — an unhedged gap can exceed the stake.", suggestion: "Pass stop_loss: 0.5 (50% of stake) so the engine flattens before the loss grows.", offending: "api.buy({ symbol: \"cryETHUSD\", contract_type: \"MULTUP\", amount: 60, multiplier: 50 });", fixed: "api.buy({ symbol: \"cryETHUSD\", contract_type: \"MULTUP\", amount: 60, multiplier: 50, stop_loss: 0.5, take_profit: 1.5 });" },
  { id: "lint_05", scriptId: "scr_12", scriptName: "Touch Ladder Pro", line: 27, column: 1, severity: "warning", message: "Barrier computed from a stale quote — cache is 3 bars old.", suggestion: "Re-read api.spot() inside the buy call so the barrier uses the live tick.", offending: "const spot = api.spot(\"R_75\");   // cached at script load\napi.buy({ symbol: \"R_75\", contract_type: \"ONETOUCH\", amount: 2, barrier: (spot * 1.0004).toFixed(2) });", fixed: "api.buy({ symbol: \"R_75\", contract_type: \"ONETOUCH\", amount: 2, barrier: (api.spot(\"R_75\") * 1.0004).toFixed(2) });" },
];

// -----------------------------------------------------------------------------
// Engine slots (concurrent bot capacity per account)
// -----------------------------------------------------------------------------
export interface EngineSlot {
  id: string;
  index: number;
  state: "free" | "reserved" | "running";
  botName: string;
  loginId: string;
  cpuPct: number;
  memoryMb: number;
  region: string;
  sinceMin: number;
}

export const ENGINE_SLOTS: EngineSlot[] = [
  { id: "slot_1", index: 1, state: "running", botName: "Vol10 Martingale Core", loginId: "VRTC9031442", cpuPct: 12, memoryMb: 184, region: "eu-west-1", sinceMin: 1284 },
  { id: "slot_2", index: 2, state: "running", botName: "DCA Trend Rider", loginId: "CR8842197", cpuPct: 9, memoryMb: 168, region: "eu-west-1", sinceMin: 4320 },
  { id: "slot_3", index: 3, state: "running", botName: "1s Accumulator Sniper", loginId: "VRTC9031442", cpuPct: 18, memoryMb: 212, region: "eu-west-1", sinceMin: 640 },
  { id: "slot_4", index: 4, state: "reserved", botName: "Draft · Vol75 Touch Sniper", loginId: "VRTC9031442", cpuPct: 0, memoryMb: 24, region: "eu-west-1", sinceMin: 42 },
  { id: "slot_5", index: 5, state: "running", botName: "Digit Differ Guard", loginId: "VRTC9031442", cpuPct: 6, memoryMb: 156, region: "eu-west-1", sinceMin: 880 },
  { id: "slot_6", index: 6, state: "free", botName: "—", loginId: "—", cpuPct: 0, memoryMb: 0, region: "eu-west-1", sinceMin: 0 },
  { id: "slot_7", index: 7, state: "free", botName: "—", loginId: "—", cpuPct: 0, memoryMb: 0, region: "eu-west-1", sinceMin: 0 },
  { id: "slot_8", index: 8, state: "free", botName: "—", loginId: "—", cpuPct: 0, memoryMb: 0, region: "ap-south-1", sinceMin: 0 },
];

// -----------------------------------------------------------------------------
// Wizard state + deterministic engine maths
// -----------------------------------------------------------------------------
export interface BotConfigDraft {
  name: string;
  description: string;
  market: string;
  symbol: string;
  loginId: string;
  strategyId: string;
  scriptId: string | null;
  contractType: ContractTypeId;
  stake: number;
  maxStake: number;
  duration: number;
  durationUnit: DurationUnit;
  takeProfit: number;
  stopLoss: number;
  maxConcurrent: number;
  paper: boolean;
  strategyParams: Record<string, number | string>;
  risk: {
    maxDailyLoss: number;
    maxDailyTrades: number;
    cooldownCount: number;
    cooldownMinutes: number;
    maxConsecutiveLosses: number;
  };
  schedule: { days: string[]; from: string; to: string; blackoutNews: boolean };
  tags: string[];
}

export function defaultBotConfig(loginId?: string): BotConfigDraft {
  const account = loginId ?? DERIV_ACCOUNTS[0]?.loginId ?? "VRTC9031442";
  return {
    name: "",
    description: "",
    market: "synthetics",
    symbol: "R_10",
    loginId: account,
    strategyId: "st_martingale",
    scriptId: null,
    contractType: "rise_fall",
    stake: 0.35,
    maxStake: 50,
    duration: 5,
    durationUnit: "ticks",
    takeProfit: 50,
    stopLoss: 25,
    maxConcurrent: 1,
    paper: true,
    strategyParams: { ...BOT_STRATEGY_TEMPLATES[0].defaultParams },
    risk: { maxDailyLoss: 100, maxDailyTrades: 500, cooldownCount: 3, cooldownMinutes: 5, maxConsecutiveLosses: 4 },
    schedule: { days: ["Mon", "Tue", "Wed", "Thu", "Fri"], from: "00:00", to: "23:59", blackoutNews: true },
    tags: [],
  };
}

/** Seed the wizard from an existing bot (D-5 config route). */
export function configFromBot(bot: Bot): BotConfigDraft {
  const template = BOT_STRATEGY_TEMPLATES.find((t) =>
    (bot.strategy === "martingale" && t.id === "st_martingale") ||
    (bot.strategy === "dca" && t.id === "st_dca") ||
    (bot.strategy === "fixed" && t.id === "st_fixed") ||
    (bot.strategy === "digit" && t.id === "st_custom") ||
    (bot.strategy === "accumulator" && t.id === "st_dca") ||
    (bot.strategy === "scalping" && t.id === "st_fixed") ||
    (bot.strategy === "swing" && t.id === "st_dca"),
  ) ?? BOT_STRATEGY_TEMPLATES[0];
  const symbol = MARKET_SYMBOLS.find((s) => s.code === bot.symbol);
  return {
    ...defaultBotConfig(bot.loginId),
    name: bot.name,
    description: `${bot.strategy.toUpperCase()} strategy on ${bot.symbol} · owned by ${bot.owner}.`,
    market: symbol?.market ?? "synthetics",
    symbol: bot.symbol,
    strategyId: template.id,
    contractType: bot.contractType,
    stake: bot.stake,
    maxStake: bot.maxStake,
    duration: bot.duration,
    durationUnit: bot.durationUnit,
    takeProfit: bot.takeProfit,
    stopLoss: bot.stopLoss,
    strategyParams: { ...template.defaultParams, multiplier: bot.martingale },
  };
}

export interface CompletenessItem {
  id: string;
  label: string;
  step: number;
  done: boolean;
  hint: string;
}

export function assessCompleteness(config: BotConfigDraft): { pct: number; items: CompletenessItem[] } {
  const template = BOT_STRATEGY_TEMPLATES.find((t) => t.id === config.strategyId);
  const needsScript = config.strategyId === "st_custom";
  const hasRiskTuned = config.risk.maxDailyLoss !== 100 || config.risk.maxDailyTrades !== 500;
  const items: CompletenessItem[] = [
    { id: "c1", label: "Bot name", step: 0, done: config.name.trim().length >= 4, hint: "At least 4 characters so the fleet list stays readable." },
    { id: "c2", label: "Symbol + market", step: 0, done: Boolean(config.symbol) && Boolean(config.market), hint: "Pick a tradable symbol from the Deriv catalog." },
    { id: "c3", label: "Funding account", step: 0, done: Boolean(config.loginId), hint: "Real (CR/MX) or virtual (VRTC) Deriv account." },
    { id: "c4", label: "Strategy selected", step: 1, done: Boolean(template), hint: "Martingale, DCA, Fixed, Fibonacci, custom script or AI adaptive." },
    { id: "c5", label: "Script chosen", step: 1, done: !needsScript || Boolean(config.scriptId), hint: "Custom strategies must point at a linted script." },
    { id: "c6", label: "Stake + duration", step: 2, done: config.stake > 0 && config.duration > 0, hint: "Duration must sit inside the contract type's allowed range." },
    { id: "c7", label: "Take-profit / stop-loss", step: 2, done: config.takeProfit > 0 && config.stopLoss > 0, hint: "Both caps are required before arming." },
    { id: "c8", label: "Daily risk limits", step: 2, done: hasRiskTuned || true, hint: "Max daily loss, trade count and cooldown reviewed." },
    { id: "c9", label: "Backtest or optimizer evidence", step: 3, done: false, hint: "Run at least one 30-day simulation before arming." },
  ];
  const weight = 100 / items.length;
  const pct = Math.round(items.filter((i) => i.done).length * weight);
  return { pct, items };
}

export interface RiskPart {
  label: string;
  points: number;
  max: number;
  note: string;
}

export interface RiskAssessment {
  score: number;
  band: "low" | "medium" | "high";
  parts: RiskPart[];
  worstCasePerCycle: number;
  dailyExposure: number;
  mcRuin: number;
}

export function assessRisk(config: BotConfigDraft): RiskAssessment {
  const template = BOT_STRATEGY_TEMPLATES.find((t) => t.id === config.strategyId);
  const symbol = MARKET_SYMBOLS.find((s) => s.code === config.symbol);
  const multiplier = Number(config.strategyParams.multiplier ?? template?.recoveryPerLoss ?? 1);
  const maxSteps = Number(config.strategyParams.maxSteps ?? 5);
  const ladderCap = config.stake * Math.pow(Math.max(1, multiplier), Math.max(0, maxSteps - 1));
  const worstCasePerCycle = Math.min(config.maxStake * 2, Math.round(ladderCap * 100) / 100);
  const stakeRatio = config.stake / Math.max(0.35, config.maxStake);
  const ladderPart = Math.min(28, (worstCasePerCycle / Math.max(10, config.stopLoss * 2.4)) * 28);
  const stopPart = Math.min(24, (config.stopLoss / Math.max(1, config.risk.maxDailyLoss)) * 24);
  const dailyPart = Math.min(22, (config.risk.maxDailyLoss / Math.max(50, config.maxStake * 6)) * 22);
  const concurrentPart = Math.min(14, config.maxConcurrent * 4.6);
  const typePart = config.contractType === "accumulator" || config.contractType === "multiplier" ? 6 : config.contractType === "rise_fall" ? 12 : 10;
  const raw = ladderPart + stopPart + dailyPart + concurrentPart + typePart;
  const score = Math.max(8, Math.min(100, Math.round(raw)));
  const band = score >= 68 ? "high" : score >= 38 ? "medium" : "low";
  return {
    score,
    band,
    worstCasePerCycle,
    dailyExposure: Math.round(config.risk.maxDailyLoss * 1.2 * 100) / 100,
    mcRuin: Math.round(Math.min(72, Math.max(1.2, (score / 100) * 46 + (1 - stakeRatio) * 12)) * 10) / 10,
    parts: [
      { label: "Recovery ladder depth", points: Math.round(ladderPart), max: 28, note: `${maxSteps} steps at ${multiplier}× reaches $${worstCasePerCycle.toFixed(2)} a cycle` },
      { label: "Stop-loss vs daily cap", points: Math.round(stopPart), max: 24, note: `${usd(config.stopLoss)} stop against a ${usd(config.risk.maxDailyLoss)} daily loss cap` },
      { label: "Daily loss vs max stake", points: Math.round(dailyPart), max: 22, note: `${usd(config.risk.maxDailyLoss)} cap on a ${usd(config.maxStake)} maximum leg` },
      { label: "Concurrent positions", points: Math.round(concurrentPart), max: 14, note: `${config.maxConcurrent} live contract${config.maxConcurrent === 1 ? "" : "s"} at a time` },
      { label: "Contract type volatility", points: typePart, max: 12, note: `${CONTRACT_TYPE_MAP_LABELS[config.contractType] ?? config.contractType} on ${symbol?.short ?? config.symbol}` },
    ],
  };
}

const CONTRACT_TYPE_MAP_LABELS: Record<string, string> = {
  rise_fall: "Rise/Fall",
  higher_lower: "Higher/Lower",
  touch: "Touch/No Touch",
  digits: "Digits",
  accumulator: "Accumulator",
  multiplier: "Multiplier",
  lookback: "Lookback",
  ends_between: "Ends Between",
  stays_between: "Stays Between",
  even_odd: "Even/Odd",
  over_under: "Over/Under",
};

export interface ProjectionScenario {
  id: "conservative" | "expected" | "optimistic";
  label: string;
  monthlyPnl: number;
  tradesPerMonth: number;
  winRate: number;
  drawdown: number;
  note: string;
}

export function projectMonthly(config: BotConfigDraft): {
  scenarios: ProjectionScenario[];
  contractsPerDay: number;
  monthlyTurnover: number;
  capBreachDays: number;
  assumptions: string[];
} {
  const risk = assessRisk(config);
  const secondsPerContract = config.durationUnit === "ticks" ? config.duration * 2 : config.durationUnit === "seconds" ? config.duration : config.durationUnit === "minutes" ? config.duration * 60 : config.durationUnit === "hours" ? config.duration * 3600 : config.duration * 86_400;
  const sessionSeconds = 6 * 3600 * config.maxConcurrent;
  const contractsPerDay = Math.max(1, Math.min(config.risk.maxDailyTrades, Math.round(sessionSeconds / Math.max(4, secondsPerContract))));
  const tradesPerMonth = contractsPerDay * 21;
  const edge = config.paper ? 0.9 : 1;
  const base = Math.round((((config.stake * (70 / 100)) * tradesPerMonth) / 100) * edge * 100) / 100;
  const drawdownScale = Math.max(1, risk.score / 45);
  const scenarios: ProjectionScenario[] = [
    { id: "conservative", label: "Conservative (p20)", monthlyPnl: Math.round(base * 0.42 * 100) / 100, tradesPerMonth: Math.round(tradesPerMonth * 0.8), winRate: 54.2, drawdown: Math.round(-config.stopLoss * drawdownScale * 3.2 * 100) / 100, note: "Slow tape, wider spreads, two losing runs inside the month." },
    { id: "expected", label: "Expected (p50)", monthlyPnl: base, tradesPerMonth: tradesPerMonth, winRate: 62.6, drawdown: Math.round(-config.stopLoss * drawdownScale * 1.8 * 100) / 100, note: "Baseline from the last 30-day demo tape for this strategy family." },
    { id: "optimistic", label: "Optimistic (p80)", monthlyPnl: Math.round(base * 1.74 * 100) / 100, tradesPerMonth: Math.round(tradesPerMonth * 1.15), winRate: 71.4, drawdown: Math.round(-config.stopLoss * drawdownScale * 0.9 * 100) / 100, note: "Favourable volatility regime with the ladder rarely past step 3." },
  ];
  return {
    scenarios,
    contractsPerDay,
    monthlyTurnover: Math.round(contractsPerDay * 21 * config.stake * 100) / 100,
    capBreachDays: risk.score >= 68 ? 4 : risk.score >= 38 ? 2 : 1,
    assumptions: [
      `Session modelled at 6 h/day on ${config.maxConcurrent} concurrent slot${config.maxConcurrent === 1 ? "" : "s"}.`,
      `Contract length ${fmtDur(config.duration, config.durationUnit)} → about ${contractsPerDay} settlements per day.`,
      config.paper ? "Sizing uses virtual funds — the projection assumes the strategy is unchanged when it goes live." : "Sizing uses real CR funds; commission-free Deriv pricing assumed.",
      "Projections ignore news blackouts unless the schedule rule is enabled in step 3.",
    ],
  };
}

export interface SimTrade {
  id: string;
  seq: number;
  atMin: number;
  side: string;
  stake: number;
  payout: number;
  pnl: number;
  result: "win" | "loss";
  step: number;
  exitSpot: number;
  balance: number;
}

export interface SimBacktest {
  id: string;
  trades: SimTrade[];
  equity: number[];
  metrics: {
    total: number;
    wins: number;
    losses: number;
    winRate: number;
    pnl: number;
    maxDrawdown: number;
    sharpe: number;
    avgStake: number;
    maxStep: number;
    bestTrade: number;
    worstTrade: number;
    period: string;
  };
}

/** Deterministic 30-day demo backtest for the wizard's live preview. */
export function runBacktestSim(config: BotConfigDraft, opts?: { seed?: number; trades?: number; horizonLabel?: string }): SimBacktest {
  const seed = opts?.seed ?? seedFrom(`${config.symbol}${config.strategyId}${config.stake}${config.duration}${config.strategyParams.multiplier ?? ""}`);
  const rand = mulberry32(seed);
  const symbol = MARKET_SYMBOLS.find((s) => s.code === config.symbol) ?? MARKET_SYMBOLS[0];
  const template = BOT_STRATEGY_TEMPLATES.find((t) => t.id === config.strategyId);
  const multiplier = Number(config.strategyParams.multiplier ?? template?.recoveryPerLoss ?? 1);
  const maxSteps = Math.max(1, Number(config.strategyParams.maxSteps ?? 5));
  const total = opts?.trades ?? 48;
  const payoutPct = symbol.payoutPct;
  const peakWin = 0.52 + (template?.historicalWinRate ?? 60) / 260;
  const trades: SimTrade[] = [];
  let balance = 1000;
  let step = 0;
  let stake = config.stake;
  const equity: number[] = [balance];
  for (let i = 0; i < total; i++) {
    const win = rand() < (config.contractType === "accumulator" ? peakWin + 0.16 : peakWin);
    const capped = Math.min(config.maxStake, Math.max(symbol.minStake, stake));
    const payout = Math.round(capped * (1 + payoutPct / 100) * 100) / 100;
    const pnl = win ? Math.round((payout - capped) * 100) / 100 : -capped;
    balance = Math.round((balance + pnl) * 100) / 100;
    trades.push({
      id: `sim_${String(i + 1).padStart(3, "0")}`,
      seq: i + 1,
      atMin: 30 * 24 * 60 - (total - i) * 615,
      side: config.contractType === "digits" ? (i % 2 ? "Differ 5" : "Match 5") : config.contractType === "higher_lower" ? (win ? "Higher" : "Lower") : win ? "Rise" : "Fall",
      stake: capped,
      payout,
      pnl,
      result: win ? "win" : "loss",
      step: win ? 0 : step,
      exitSpot: Math.round((symbol.basePrice * (1 + (rand() - 0.5) * 0.012)) * 1000) / 1000,
      balance,
    });
    equity.push(balance);
    if (win) {
      step = 0;
      stake = config.stake;
    } else {
      step = Math.min(maxSteps, step + 1);
      stake = capped * multiplier;
    }
    if (balance <= 1000 - config.risk.maxDailyLoss * 8) break;
  }
  const wins = trades.filter((t) => t.result === "win").length;
  const pnlTotal = Math.round((trades.reduce((a, t) => a + t.pnl, 0)) * 100) / 100;
  let peak = equity[0];
  let maxDrawdown = 0;
  equity.forEach((v) => {
    peak = Math.max(peak, v);
    maxDrawdown = Math.min(maxDrawdown, v - peak);
  });
  const returns = trades.map((t) => t.pnl / 1000);
  const mean = returns.reduce((a, v) => a + v, 0) / Math.max(1, returns.length);
  const variance = returns.reduce((a, v) => a + (v - mean) ** 2, 0) / Math.max(1, returns.length);
  const sharpe = Math.round((mean / Math.max(0.0001, Math.sqrt(variance))) * Math.sqrt(252) * 0.42 * 100) / 100;
  return {
    id: `bt_${seed.toString(16).slice(0, 6)}`,
    trades,
    equity,
    metrics: {
      total: trades.length,
      wins,
      losses: trades.length - wins,
      winRate: Math.round((wins / Math.max(1, trades.length)) * 1000) / 10,
      pnl: pnlTotal,
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      sharpe,
      avgStake: Math.round((trades.reduce((a, t) => a + t.stake, 0) / Math.max(1, trades.length)) * 100) / 100,
      maxStep: trades.reduce((a, t) => Math.max(a, t.step), 0),
      bestTrade: trades.reduce((a, t) => Math.max(a, t.pnl), 0),
      worstTrade: trades.reduce((a, t) => Math.min(a, t.pnl), 0),
      period: opts?.horizonLabel ?? "30-day demo tape · 2026-09-13 → 2026-10-13",
    },
  };
}

export interface OptimizerCandidate {
  id: string;
  multiplier: number;
  maxSteps: number;
  duration: number;
  durationUnit: DurationUnit;
  stake: number;
  winRate: number;
  pnl: number;
  maxDrawdown: number;
  sharpe: number;
  score: number;
  note: string;
}

/** Grid search over multiplier × maxSteps × duration (advanced feature #4). */
export function runParameterOptimizer(config: BotConfigDraft, limit = 5): OptimizerCandidate[] {
  const multipliers = [1.4, 1.6, 1.8, 2, 2.1, 2.4, 2.8];
  const steps = [2, 3, 4, 5, 6];
  const durations = config.durationUnit === "ticks" ? [1, 3, 5, 8, 10] : [1, 5, 15, 30, 60];
  const grid: OptimizerCandidate[] = [];
  const baseWin = BOT_STRATEGY_TEMPLATES.find((t) => t.id === config.strategyId)?.historicalWinRate ?? 60;
  multipliers.forEach((m) => {
    steps.forEach((s) => {
      durations.forEach((d) => {
        const seed = seedFrom(`${config.symbol}${m}${s}${d}${config.stake}`);
        const rand = mulberry32(seed);
        const drawdownPenalty = 1 - (m - 1) * 0.06 - (s - 2) * 0.012;
        const winRate = Math.max(34, Math.min(92, Math.round((baseWin * drawdownPenalty + (rand() - 0.5) * 3.2) * 10) / 10));
        const pnl = Math.round((config.stake * 210 * ((winRate - 52) / 100) * (2.4 - m * 0.32) + (rand() - 0.5) * 40) * 100) / 100;
        const maxDrawdown = Math.round(-Math.max(18, config.stake * (m * 22 + s * 14) * (1 + (rand() - 0.5) * 0.3)) * 100) / 100;
        const sharpe = Math.round((pnl / Math.max(1, Math.abs(maxDrawdown))) * 1.6 * 100) / 100;
        const score = Math.round((pnl / Math.max(1, Math.abs(maxDrawdown) / 2) + sharpe * 12 + winRate * 0.24) * 100) / 100;
        grid.push({
          id: `opt_${m}_${s}_${d}`,
          multiplier: m,
          maxSteps: s,
          duration: d,
          durationUnit: config.durationUnit,
          stake: config.stake,
          winRate,
          pnl,
          maxDrawdown,
          sharpe,
          score,
          note: m >= 2.4 ? "Steep ladder — needs a wide stop-loss to survive a 6-loss run." : s >= 5 ? "Deep ladder — capital sits longer between recoveries." : "Balanced ladder for this symbol's payout profile.",
        });
      });
    });
  });
  return grid.sort((a, b) => b.score - a.score).slice(0, limit);
}

export interface MonteCarloResult {
  runs: number;
  p05: number;
  p50: number;
  p95: number;
  ruinProbability: number;
  avgDrawdown: number;
  worstCase: number;
  histogram: { label: string; count: number; from: number; to: number }[];
}

/** 1,000-sequence Monte-Carlo over the configured stake ladder (advanced feature #5). */
export function runMonteCarlo(config: BotConfigDraft, runs = 1000): MonteCarloResult {
  const rand = mulberry32(seedFrom(`mc${config.symbol}${config.stake}${config.strategyParams.multiplier ?? 2}${config.stopLoss}`));
  const template = BOT_STRATEGY_TEMPLATES.find((t) => t.id === config.strategyId);
  const multiplier = Number(config.strategyParams.multiplier ?? template?.recoveryPerLoss ?? 1);
  const maxSteps = Math.max(1, Number(config.strategyParams.maxSteps ?? 5));
  const tradesPerRun = 60;
  const outcomes: number[] = [];
  let ruin = 0;
  let drawdownSum = 0;
  for (let r = 0; r < runs; r++) {
    let balance = 0;
    let stake = config.stake;
    let step = 0;
    let worst = 0;
    const winChance = (template?.historicalWinRate ?? 62) / 100;
    for (let t = 0; t < tradesPerRun; t++) {
      const win = rand() < winChance;
      const capped = Math.min(config.maxStake, Math.max(0.35, stake));
      balance += win ? capped * 0.95 : -capped;
      if (win) {
        step = 0;
        stake = config.stake;
      } else {
        step += 1;
        stake = capped * multiplier;
      }
      worst = Math.min(worst, balance);
      if (step > maxSteps || balance <= -config.risk.maxDailyLoss * 2 || balance <= -config.stopLoss * 5) {
        if (balance <= -config.stopLoss * 5) ruin += 1;
        break;
      }
    }
    outcomes.push(Math.round(balance * 100) / 100);
    drawdownSum += Math.abs(worst);
  }
  outcomes.sort((a, b) => a - b);
  const at = (p: number) => outcomes[Math.min(outcomes.length - 1, Math.max(0, Math.floor(p * outcomes.length)))];
  const spread = Math.max(40, (at(0.95) - at(0.05)) / 6);
  const startBucket = Math.floor(at(0.02) / spread) * spread;
  const histogram = Array.from({ length: 7 }, (_, i) => {
    const from = Math.round((startBucket + i * spread) * 100) / 100;
    const to = Math.round((startBucket + (i + 1) * spread) * 100) / 100;
    return {
      label: from >= 0 ? `+$${from.toFixed(0)}` : `-$${Math.abs(from).toFixed(0)}`,
      from,
      to,
      count: outcomes.filter((v) => v >= from && v < to).length,
    };
  });
  return {
    runs,
    p05: at(0.05),
    p50: at(0.5),
    p95: at(0.95),
    ruinProbability: Math.round((ruin / runs) * 1000) / 10,
    avgDrawdown: Math.round((drawdownSum / runs) * 100) / 100,
    worstCase: outcomes[0],
    histogram,
  };
}

/**
 * Similar-symbol fallbacks for a halted feed — same market first, then the
 * closest volatility profile by payout and pip size.
 */
export function similarSymbolsOf(code: string, limit = 4): string[] {
  const source = MARKET_SYMBOLS.find((s) => s.code === code);
  if (!source) return MARKET_SYMBOLS.slice(0, limit).map((s) => s.code);
  const halted = new Set(HALTED_SYMBOLS.map((h) => h.code));
  return MARKET_SYMBOLS.filter((s) => s.code !== code && !halted.has(s.code) && s.open)
    .map((s) => ({
      code: s.code,
      score:
        (s.market === source.market ? 100 : 0) +
        (100 - Math.abs(s.payoutPct - source.payoutPct) * 12) +
        (s.pipSize === source.pipSize ? 18 : 0) +
        s.popularity / 8,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.code);
}

export function haltedSymbolOf(code: string): HaltedSymbol | undefined {
  return HALTED_SYMBOLS.find((h) => h.code === code);
}

// -----------------------------------------------------------------------------
// Config diff (review step + version compare/rollback)
// -----------------------------------------------------------------------------
export interface ConfigDiffRow {
  field: string;
  from: string;
  to: string;
  tone: "up" | "down" | "flat";
}

function cfgValue(v: string | number | boolean | undefined): string {
  if (typeof v === "number") return `$${v.toFixed(2)}`;
  if (typeof v === "boolean") return v ? "enabled" : "disabled";
  return v === undefined || v === "" ? "—" : String(v);
}

export function diffConfigs(before: BotConfigDraft, after: BotConfigDraft): ConfigDiffRow[] {
  const rows: ConfigDiffRow[] = [];
  const push = (field: string, a: string, b: string) => {
    if (a !== b) rows.push({ field, from: a, to: b, tone: "flat" });
  };
  push("Name", cfgValue(before.name), cfgValue(after.name));
  push("Symbol", before.symbol, after.symbol);
  push("Strategy", BOT_STRATEGY_TEMPLATES.find((t) => t.id === before.strategyId)?.name ?? before.strategyId, BOT_STRATEGY_TEMPLATES.find((t) => t.id === after.strategyId)?.name ?? after.strategyId);
  push("Contract type", CONTRACT_TYPE_MAP_LABELS[before.contractType] ?? before.contractType, CONTRACT_TYPE_MAP_LABELS[after.contractType] ?? after.contractType);
  push("Initial stake", usd(before.stake), usd(after.stake));
  push("Max stake", usd(before.maxStake), usd(after.maxStake));
  push("Duration", fmtDur(before.duration, before.durationUnit), fmtDur(after.duration, after.durationUnit));
  push("Take profit", usd(before.takeProfit), usd(after.takeProfit));
  push("Stop loss", usd(before.stopLoss), usd(after.stopLoss));
  push("Max concurrent", String(before.maxConcurrent), String(after.maxConcurrent));
  push("Max daily loss", usd(before.risk.maxDailyLoss), usd(after.risk.maxDailyLoss));
  push("Max daily trades", String(before.risk.maxDailyTrades), String(after.risk.maxDailyTrades));
  push("Cooldown", `${before.risk.cooldownCount} losses → ${before.risk.cooldownMinutes} min`, `${after.risk.cooldownCount} losses → ${after.risk.cooldownMinutes} min`);
  push("Max consecutive losses", String(before.risk.maxConsecutiveLosses), String(after.risk.maxConsecutiveLosses));
  push("Paper trading", cfgValue(before.paper), cfgValue(after.paper));
  const keys = new Set([...Object.keys(before.strategyParams), ...Object.keys(after.strategyParams)]);
  keys.forEach((k) => push(`Strategy · ${k}`, String(before.strategyParams[k] ?? "—"), String(after.strategyParams[k] ?? "—")));
  push("Schedule", `${before.schedule.days.join(", ")} ${before.schedule.from}–${before.schedule.to}`, `${after.schedule.days.join(", ")} ${after.schedule.from}–${after.schedule.to}`);
  push("News blackout", cfgValue(before.schedule.blackoutNews), cfgValue(after.schedule.blackoutNews));
  return rows.map((r) => ({ ...r, tone: r.field.includes("Stop") || r.field.includes("stake") || r.field.includes("Multiplier") || r.field.includes("multiplier") ? "up" : "flat" }));
}

/** JSON-safe export payload (config-only, never runtime data). */
export function exportableConfig(config: BotConfigDraft): Record<string, unknown> {
  return {
    schema: "derivx.bot_config.v12",
    exportedAt: new Date(NOW_REF).toISOString(),
    name: config.name || "untitled-bot",
    account: config.loginId,
    symbol: config.symbol,
    market: config.market,
    strategy: config.strategyId,
    scriptId: config.scriptId,
    contractType: config.contractType,
    tradeParams: {
      stake: config.stake,
      maxStake: config.maxStake,
      duration: config.duration,
      durationUnit: config.durationUnit,
      takeProfit: config.takeProfit,
      stopLoss: config.stopLoss,
      maxConcurrent: config.maxConcurrent,
    },
    strategyParams: config.strategyParams,
    riskLimits: config.risk,
    schedule: config.schedule,
    paper: config.paper,
    tags: config.tags,
  };
}

// =============================================================================
// PAGE D-6 — Script Editor / Script Studio (/dashboard/scripts & /:id)
// Front-end only: the engine below is the shape tradeMO.md documents for the
// sandboxed JS runtime (onTick → TradeDecision). Everything here is mock data
// plus pure helpers, so a backend can hydrate it without touching the UI.
// =============================================================================
export type ScriptGroup = "lifecycle" | "context" | "decision" | "tick" | "result" | "params" | "sandbox";
export type ScriptRunStatus = "ok" | "timeout" | "forbidden" | "memory" | "syntax" | "queued";
export type ScriptHealth = "healthy" | "warning" | "error";
export type DiffKind = "same" | "add" | "remove";
export type CodeTokenKind = "plain" | "comment" | "string" | "number" | "keyword" | "fn" | "punct" | "ai";

export interface ScriptEditorRow {
  id: string;
  scriptId: string;
  version: string;
  usedByBots: string[];
  health: ScriptHealth;
  sandboxTimeoutMs: number;
  peakMemoryMb: number;
  memoryLimitMb: number;
  autosave: boolean;
  autosaveDelayMs: number;
  lastTestAtMin: number;
  coveragePct: number;
  complexity: number;
  dependencyCount: number;
  ciStatus: "passing" | "failing" | "pending";
  branch: string;
  owner: string;
}

/** One row per script in the library — joins SCRIPTS (source of truth) with the editor metadata. */
export const SCRIPT_EDITOR_ROWS: ScriptEditorRow[] = [
  { id: "ser_01", scriptId: "scr_01", version: "v7.3", usedByBots: ["Vol10 Martingale Core", "Vol75 Touch Sniper"], health: "healthy", sandboxTimeoutMs: 100, peakMemoryMb: 34, memoryLimitMb: 128, autosave: true, autosaveDelayMs: 2000, lastTestAtMin: 12, coveragePct: 86, complexity: 9, dependencyCount: 2, ciStatus: "passing", branch: "main", owner: "Ade F." },
  { id: "ser_02", scriptId: "scr_02", version: "v3.1", usedByBots: ["FX London Breakout"], health: "healthy", sandboxTimeoutMs: 100, peakMemoryMb: 41, memoryLimitMb: 128, autosave: true, autosaveDelayMs: 2000, lastTestAtMin: 64, coveragePct: 74, complexity: 12, dependencyCount: 3, ciStatus: "passing", branch: "main", owner: "Ade F." },
  { id: "ser_03", scriptId: "scr_03", version: "v2.8", usedByBots: ["Digit Hunter 7", "Digit Hunter 7 (paper)"], health: "warning", sandboxTimeoutMs: 80, peakMemoryMb: 58, memoryLimitMb: 128, autosave: true, autosaveDelayMs: 2000, lastTestAtMin: 22, coveragePct: 68, complexity: 14, dependencyCount: 1, ciStatus: "failing", branch: "digits-tuning", owner: "Mina L." },
  { id: "ser_04", scriptId: "scr_04", version: "v1.9", usedByBots: ["Accu Sniper 1HZ"], health: "healthy", sandboxTimeoutMs: 100, peakMemoryMb: 27, memoryLimitMb: 128, autosave: true, autosaveDelayMs: 2000, lastTestAtMin: 140, coveragePct: 81, complexity: 8, dependencyCount: 1, ciStatus: "passing", branch: "main", owner: "Kwame B." },
  { id: "ser_05", scriptId: "scr_05", version: "v4.2", usedByBots: ["Gold Swing Basket"], health: "healthy", sandboxTimeoutMs: 100, peakMemoryMb: 36, memoryLimitMb: 128, autosave: true, autosaveDelayMs: 2000, lastTestAtMin: 300, coveragePct: 79, complexity: 10, dependencyCount: 2, ciStatus: "passing", branch: "main", owner: "Kwame B." },
  { id: "ser_06", scriptId: "scr_06", version: "v2.2", usedByBots: ["BTC Grid Runner"], health: "healthy", sandboxTimeoutMs: 120, peakMemoryMb: 44, memoryLimitMb: 128, autosave: false, autosaveDelayMs: 2000, lastTestAtMin: 410, coveragePct: 71, complexity: 11, dependencyCount: 2, ciStatus: "passing", branch: "grid-v2", owner: "Tobi R." },
  { id: "ser_07", scriptId: "scr_07", version: "v5.0", usedByBots: ["Vol100 Night Shift"], health: "error", sandboxTimeoutMs: 100, peakMemoryMb: 122, memoryLimitMb: 128, autosave: true, autosaveDelayMs: 2000, lastTestAtMin: 3, coveragePct: 49, complexity: 19, dependencyCount: 4, ciStatus: "failing", branch: "hotfix/night-shift", owner: "Tobi R." },
  { id: "ser_08", scriptId: "scr_08", version: "v3.6", usedByBots: ["GBP Mean Reversion"], health: "healthy", sandboxTimeoutMs: 100, peakMemoryMb: 31, memoryLimitMb: 128, autosave: true, autosaveDelayMs: 2000, lastTestAtMin: 180, coveragePct: 88, complexity: 9, dependencyCount: 2, ciStatus: "passing", branch: "main", owner: "Mina L." },
  { id: "ser_09", scriptId: "scr_09", version: "v2.4", usedByBots: ["Silver Fade"], health: "warning", sandboxTimeoutMs: 100, peakMemoryMb: 63, memoryLimitMb: 128, autosave: true, autosaveDelayMs: 2000, lastTestAtMin: 55, coveragePct: 64, complexity: 13, dependencyCount: 1, ciStatus: "pending", branch: "mean-reversion", owner: "Ade F." },
  { id: "ser_10", scriptId: "scr_10", version: "v1.4", usedByBots: ["ETH Momentum 50x"], health: "healthy", sandboxTimeoutMs: 100, peakMemoryMb: 29, memoryLimitMb: 128, autosave: true, autosaveDelayMs: 2000, lastTestAtMin: 620, coveragePct: 76, complexity: 10, dependencyCount: 1, ciStatus: "passing", branch: "main", owner: "Tobi R." },
  { id: "ser_11", scriptId: "scr_11", version: "v2.0", usedByBots: [], health: "warning", sandboxTimeoutMs: 100, peakMemoryMb: 22, memoryLimitMb: 128, autosave: true, autosaveDelayMs: 2000, lastTestAtMin: 940, coveragePct: 58, complexity: 7, dependencyCount: 2, ciStatus: "pending", branch: "carry-scalp", owner: "Kwame B." },
  { id: "ser_12", scriptId: "scr_12", version: "v3.3", usedByBots: ["Vol75 Touch Sniper"], health: "healthy", sandboxTimeoutMs: 90, peakMemoryMb: 38, memoryLimitMb: 128, autosave: true, autosaveDelayMs: 2000, lastTestAtMin: 31, coveragePct: 83, complexity: 12, dependencyCount: 2, ciStatus: "passing", branch: "main", owner: "Mina L." },
];

export interface ScriptVersion {
  id: string;
  scriptId: string;
  version: string;
  atMin: number;
  author: string;
  message: string;
  added: number;
  removed: number;
  hash: string;
  status: "current" | "published" | "rolled-back" | "merged" | "branch";
  branch: string;
  checks: "passed" | "failed" | "pending";
  tests: number;
}

export const SCRIPT_VERSIONS: ScriptVersion[] = [
  { id: "sv_01", scriptId: "scr_01", version: "v7.3", atMin: 12, author: "Ade F.", message: "Cap ladder at config.maxStake before the 5th step", added: 6, removed: 3, hash: "9f4c1ab", status: "current", branch: "main", checks: "passed", tests: 14 },
  { id: "sv_02", scriptId: "scr_01", version: "v7.2", atMin: 1480, author: "Ade F.", message: "Read multiplier from @param instead of the hard-coded 2.1", added: 4, removed: 4, hash: "b31d07e", status: "published", branch: "main", checks: "passed", tests: 13 },
  { id: "sv_03", scriptId: "scr_01", version: "v7.1", atMin: 4020, author: "Mina L.", message: "Log skip reason on flat ticks (engine channel: info)", added: 3, removed: 1, hash: "77ac512", status: "published", branch: "main", checks: "passed", tests: 12 },
  { id: "sv_04", scriptId: "scr_01", version: "v7.0", atMin: 9860, author: "Ade F.", message: "Port to engine v12: onResult() replaces the polling loop", added: 22, removed: 31, hash: "1de9f20", status: "published", branch: "main", checks: "passed", tests: 12 },
  { id: "sv_05", scriptId: "scr_01", version: "v6.9", atMin: 21400, author: "Ade F.", message: "Cooldown after 3 consecutive losses", added: 9, removed: 2, hash: "c40b8aa", status: "rolled-back", branch: "main", checks: "failed", tests: 11 },
  { id: "sv_06", scriptId: "scr_07", version: "v5.0", atMin: 3, author: "Tobi R.", message: "WIP: night-shift scaling — unclosed block at line 14", added: 18, removed: 6, hash: "ee02c71", status: "current", branch: "hotfix/night-shift", checks: "failed", tests: 6 },
  { id: "sv_07", scriptId: "scr_07", version: "v4.9", atMin: 620, author: "Tobi R.", message: "Restore last green build before the Digits refactor", added: 2, removed: 24, hash: "3ab77d9", status: "rolled-back", branch: "hotfix/night-shift", checks: "passed", tests: 11 },
  { id: "sv_08", scriptId: "scr_03", version: "v2.8", atMin: 22, author: "Mina L.", message: "Digit barrier 4 → 5 after the weekend distribution shift", added: 5, removed: 5, hash: "58d21fe", status: "current", branch: "digits-tuning", checks: "failed", tests: 9 },
  { id: "sv_09", scriptId: "scr_03", version: "v2.7", atMin: 2610, author: "Mina L.", message: "Merge main: shared indicators module now pinned to 2.4.0", added: 3, removed: 1, hash: "a1f3c80", status: "merged", branch: "digits-tuning", checks: "passed", tests: 9 },
  { id: "sv_10", scriptId: "scr_02", version: "v3.1", atMin: 64, author: "Ade F.", message: "Session window widened to 07:00–10:30 UTC", added: 2, removed: 2, hash: "d7e4411", status: "current", branch: "main", checks: "passed", tests: 16 },
  { id: "sv_11", scriptId: "scr_06", version: "v2.2", atMin: 410, author: "Tobi R.", message: "Grid spacing follows ATR instead of fixed 0.4%", added: 11, removed: 7, hash: "6c9b1d3", status: "current", branch: "grid-v2", checks: "passed", tests: 10 },
  { id: "sv_12", scriptId: "scr_08", version: "v3.6", atMin: 180, author: "Mina L.", message: "RSI period 14 → 9 on the 1m tape", added: 1, removed: 1, hash: "f2a9077", status: "current", branch: "main", checks: "passed", tests: 15 },
  { id: "sv_13", scriptId: "scr_12", version: "v3.3", atMin: 31, author: "Mina L.", message: "Touch barrier spreads with realised volatility", added: 7, removed: 4, hash: "0b5ce12", status: "current", branch: "main", checks: "passed", tests: 13 },
  { id: "sv_14", scriptId: "scr_05", version: "v4.2", atMin: 300, author: "Kwame B.", message: "Accumulator growth rate 3% → 2% for gold", added: 2, removed: 2, hash: "40dd8f1", status: "current", branch: "main", checks: "passed", tests: 12 },
];

export interface ScriptRun {
  id: string;
  scriptId: string;
  runLabel: string;
  botName: string;
  loginId: string;
  symbol: string;
  contractType: string;
  startedMin: number;
  durationMs: number;
  ticks: number;
  trades: number;
  winRate: number;
  pnl: number;
  peakMemoryMb: number;
  status: ScriptRunStatus;
  note: string;
}

export const SCRIPT_RUNS: ScriptRun[] = [
  { id: "srn_01", scriptId: "scr_01", runLabel: "test #1841", botName: "Vol10 Martingale Core", loginId: "VRTC9031442", symbol: "R_10", contractType: "Rise/Fall", startedMin: 6, durationMs: 2140, ticks: 500, trades: 41, winRate: 63.4, pnl: 12.85, peakMemoryMb: 34, status: "ok", note: "5-step ladder capped correctly at maxStake." },
  { id: "srn_02", scriptId: "scr_01", runLabel: "test #1840", botName: "Vol10 Martingale Core", loginId: "VRTC9031442", symbol: "R_10", contractType: "Rise/Fall", startedMin: 41, durationMs: 2205, ticks: 500, trades: 38, winRate: 60.5, pnl: 9.4, peakMemoryMb: 33, status: "ok", note: "Cooldown fired twice, no duplicate proposals." },
  { id: "srn_03", scriptId: "scr_07", runLabel: "test #1839", botName: "Vol100 Night Shift", loginId: "CR8842197", symbol: "R_100", contractType: "Digits", startedMin: 3, durationMs: 100, ticks: 27, trades: 0, winRate: 0, pnl: 0, peakMemoryMb: 122, status: "syntax", note: "Unexpected token '}' at line 14 — execution never started." },
  { id: "srn_04", scriptId: "scr_07", runLabel: "test #1838", botName: "Vol100 Night Shift", loginId: "CR8842197", symbol: "R_100", contractType: "Digits", startedMin: 18, durationMs: 100, ticks: 41, trades: 0, winRate: 0, pnl: 0, peakMemoryMb: 127, status: "memory", note: "Heap peaked at 127 MB of the 128 MB sandbox ceiling." },
  { id: "srn_05", scriptId: "scr_03", runLabel: "test #1837", botName: "Digit Hunter 7", loginId: "VRTC9031442", symbol: "R_75", contractType: "Digits", startedMin: 22, durationMs: 1810, ticks: 400, trades: 52, winRate: 57.7, pnl: -3.2, peakMemoryMb: 58, status: "ok", note: "Barrier 5 under-performs the 4 tape on the weekend feed." },
  { id: "srn_06", scriptId: "scr_02", runLabel: "test #1836", botName: "FX London Breakout", loginId: "CR8842197", symbol: "frxGBPUSD", contractType: "Higher/Lower", startedMin: 64, durationMs: 2460, ticks: 360, trades: 24, winRate: 62.5, pnl: 41.6, peakMemoryMb: 41, status: "ok", note: "Range lookback stable; 2 ticks late on the 07:00 open." },
  { id: "srn_07", scriptId: "scr_11", runLabel: "test #1835", botName: "—", loginId: "MX5520143", symbol: "frxUSDJPY", contractType: "Rise/Fall", startedMin: 96, durationMs: 100, ticks: 63, trades: 0, winRate: 0, pnl: 0, peakMemoryMb: 22, status: "timeout", note: "Timeout at line 31 — while(true) poll inside onTick()." },
  { id: "srn_08", scriptId: "scr_11", runLabel: "test #1834", botName: "—", loginId: "MX5520143", symbol: "frxUSDJPY", contractType: "Rise/Fall", startedMin: 108, durationMs: 40, ticks: 0, trades: 0, winRate: 0, pnl: 0, peakMemoryMb: 18, status: "forbidden", note: "process.exit() is not allowed in the sandbox." },
  { id: "srn_09", scriptId: "scr_04", runLabel: "test #1833", botName: "Accu Sniper 1HZ", loginId: "CR8842197", symbol: "1HZ10V", contractType: "Accumulator", startedMin: 140, durationMs: 1620, ticks: 300, trades: 9, winRate: 77.8, pnl: 26.4, peakMemoryMb: 27, status: "ok", note: "Growth rate guard held through 3 vol spikes." },
  { id: "srn_10", scriptId: "scr_05", runLabel: "test #1832", botName: "Gold Swing Basket", loginId: "CR8842197", symbol: "frxXAUUSD", contractType: "Touch", startedMin: 300, durationMs: 1980, ticks: 420, trades: 18, winRate: 55.6, pnl: 14.9, peakMemoryMb: 36, status: "ok", note: "Barrier respected the 4h range on both legs." },
  { id: "srn_11", scriptId: "scr_06", runLabel: "test #1831", botName: "BTC Grid Runner", loginId: "MX5520143", symbol: "cryBTCUSD", contractType: "Multiplier", startedMin: 410, durationMs: 2680, ticks: 520, trades: 33, winRate: 51.5, pnl: -6.1, peakMemoryMb: 44, status: "ok", note: "ATR spacing opens fewer legs than the fixed grid." },
  { id: "srn_12", scriptId: "scr_08", runLabel: "test #1830", botName: "GBP Mean Reversion", loginId: "VRTC9031442", symbol: "frxGBPUSD", contractType: "Rise/Fall", startedMin: 180, durationMs: 1880, ticks: 440, trades: 37, winRate: 64.9, pnl: 22.3, peakMemoryMb: 31, status: "ok", note: "RSI-9 reduces drawdown versus the 14-period build." },
  { id: "srn_13", scriptId: "scr_06", runLabel: "test #1829", botName: "BTC Grid Runner", loginId: "MX5520143", symbol: "cryETHUSD", contractType: "Multiplier", startedMin: 1880, durationMs: 60, ticks: 0, trades: 0, winRate: 0, pnl: 0, peakMemoryMb: 17, status: "forbidden", note: "require('fs') blocked — network/filesystem access denied." },
  { id: "srn_14", scriptId: "scr_12", runLabel: "queued #1828", botName: "Vol75 Touch Sniper", loginId: "CR8842197", symbol: "R_75", contractType: "Touch", startedMin: 2, durationMs: 0, ticks: 0, trades: 0, winRate: 0, pnl: 0, peakMemoryMb: 0, status: "queued", note: "Waiting for a sandbox worker — 2 runs ahead in the queue." },
];

// -----------------------------------------------------------------------------
// D-6 script sources — engine v12 sandbox API (onTick / onResult / onComplete).
// Kept as separate consts to satisfy the file-size budget; SCRIPT_SOURCES joins
// them onto the SCRIPTS library below.
// -----------------------------------------------------------------------------
const SRC_01 = `/**
 * Martingale Core v7 — engine v12
 * @param {number} initStake=0.35 Base stake restored after a win
 * @param {number} multiplier=2.1 Multiplier applied after a loss
 * @param {number} maxSteps=5 Deepest ladder step before the cap applies
 * @param {number} maxStake=50 Hard ceiling enforced by risk.assert()
 */
const STATE = require("state.js"); // pinned 1.4.2

let stake = initStake;

function onTick(tick) {
  const last = getLastResult();
  if (last === null) {
    log("cold start on " + tick.symbol + " at " + tick.price);
  } else if (last.win) {
    stake = initStake;
  } else if (getHistory(maxSteps).length >= maxSteps) {
    stake = initStake; // ladder exhausted — reset instead of doubling
  } else {
    stake = Math.min(stake * multiplier, maxStake);
  }

  if (tick.price <= 0) return null; // never trade a stale feed

  return {
    contract: "CALL",
    stake: Number(stake.toFixed(2)),
    duration: 5,
    durationUnit: "t",
    basis: "stake",
  };
}

function onResult(result) {
  log(result.win ? "WIN +" + result.profit : "LOSS " + result.profit);
}

function onComplete(summary) {
  log("session closed at " + getBalance() + " after " + summary.trades + " contracts");
}

// @test { scenario: '5 wins in a row resets the ladder' }
// @test { scenario: 'ladder caps at maxStake on the 6th loss' }
// @test { scenario: 'stale tick (price <= 0) returns null' }`;

const SRC_02 = `/**
 * London Breakout FX — EURUSD + GBPUSD basket
 * @param {number} rangeHours=4 Lookback used to size the opening range
 * @param {number} stake=25 Stake per breakout leg
 * @param {number} bufferPips=1.2 Pips added beyond the range edge
 */
const ind = require("indicators.js"); // pinned 2.4.0
const session = require("session_filter.js"); // pinned 1.1.0

const levels = { frxEURUSD: null, frxGBPUSD: null };

function onTick(tick) {
  session.onlyDuring({ from: "07:00", to: "10:30", tz: "UTC" });

  const range = ind.range(tick.symbol, { hours: rangeHours });
  if (!range.ready) return null;

  const edge = tick.symbol === "frxEURUSD" ? range.high : range.low;
  const dist = Math.abs(tick.price - edge) / ind.pipSize(tick.symbol);

  if (dist > bufferPips) levels[tick.symbol] = null; // reset once price retreats
  if (dist <= bufferPips && levels[tick.symbol] === null) {
    levels[tick.symbol] = tick.epoch;
    log("breakout armed on " + tick.symbol + " at " + edge.toFixed(5));
  }

  if (levels[tick.symbol] === null) return null;
  if (getOpenContracts().length >= 2) return null; // one leg per symbol

  return {
    contract: tick.price > edge ? "CALL" : "PUT",
    stake: stake,
    duration: 15,
    durationUnit: "m",
    barrier: edge.toFixed(5),
  };
}

function onResult(result) {
  log("leg settled: " + result.contractType + " " + result.entrySpot + " -> " + result.exitSpot);
}

// @test { scenario: 'outside the session window no trade is proposed' }
// @test { scenario: 'second leg is skipped while one contract is open' }`;

const SRC_03 = `/**
 * Digit Sniper (Differs) — R_75 / R_100 digits
 * @param {number} barrier=5 Digit threshold for DIGITOVER
 * @param {number} stake=1 Stake per digit contract
 * @param {number} minSample=80 Ticks required before the distribution is trusted
 */
const dist = require("digit_stats.js"); // pinned 1.0.7

let seen = 0;

function onTick(tick) {
  if (tick.symbol !== "R_75" && tick.symbol !== "R_100") return null;
  const last = String(tick.price).slice(-1);
  dist.push(Number(last));
  seen += 1;

  if (seen < minSample) return null;

  const pct = dist.pctOver(barrier); // % of recent ticks above the barrier
  if (pct < 55) return null;

  return {
    contract: "DIGITOVER",
    stake: stake,
    duration: 1,
    durationUnit: "t",
    barrier: barrier,
  };
}

function onResult(result) {
  log("digit " + result.exitSpot + " vs barrier " + barrier + " → " + (result.win ? "over" : "under"));
}

// @test { scenario: 'no trade before minSample ticks have been collected' }
// @test { scenario: 'barrier 5 fires only above a 55% skew' }`;

const SRC_04 = `/**
 * Accumulator Range Keeper — 1HZ10V
 * @param {number} growthRate=0.02 Accumulator growth per step
 * @param {number} stake=3 Stake per accumulator
 * @param {number} maxSteps=4 Steps before the contract is closed
 */
let step = 0;
let openedAt = null;

function onTick(tick) {
  if (tick.symbol !== "1HZ10V") return null;

  if (openedAt === null) {
    openedAt = tick.epoch;
    step = 0;
    return {
      contract: "ACCU",
      stake: stake,
      duration: 1,
      durationUnit: "t",
    };
  }

  step += 1;
  if (step >= maxSteps) {
    log("range keeper releasing contract after " + step + " steps");
    openedAt = null;
    return null;
  }
  return null; // accumulator rides on its own schedule
}

function onResult(result) {
  log("accumulator step payout " + result.payout + " (growth " + growthRate + ")");
}

function onComplete(summary) {
  log("accumulator session: " + summary.trades + " runs, balance " + getBalance());
}

// @test { scenario: 'contract opens on the first eligible tick only' }
// @test { scenario: 'release after maxSteps without re-entering' }`;

const SRC_05 = `/**
 * Gold Touch Ladder — frxXAUUSD touch contracts
 * @param {number} stake=20 Stake per ladder rung
 * @param {number} ladderGap=4.5 USD between rungs
 * @param {number} rungs=3 Concurrent touch legs
 */
const levels = [];

function onTick(tick) {
  if (tick.symbol !== "frxXAUUSD") return null;
  const open = getOpenContracts();
  if (open.length >= rungs) return null;

  const last = levels.length ? levels[levels.length - 1] : tick.price;
  if (Math.abs(tick.price - last) < ladderGap) return null;

  levels.push(tick.price);
  log("touch rung " + levels.length + " armed at " + tick.price.toFixed(2));

  return {
    contract: "TOUCH",
    stake: stake,
    duration: 4,
    durationUnit: "h",
    barrier: (tick.price + ladderGap).toFixed(2),
    basis: "stake",
  };
}

function onResult(result) {
  if (!result.win) levels.shift(); // drop the failed rung, keep the ladder tight
  log("gold leg " + (result.win ? "touched" : "expired") + " at " + result.exitSpot);
}

// @test { scenario: 'three rungs maximum are held at once' }
// @test { scenario: 'failed rung is released back into the pool' }`;

const SRC_06 = `/**
 * BTC Grid Fixed Stake — cryBTCUSD multiplier grid
 * @param {number} stake=5 Stake per grid leg
 * @param {number} atrPeriod=14 ATR window used for grid spacing
 * @param {number} maxLegs=6 Deepest grid before entries pause
 */
const ind = require("indicators.js"); // pinned 2.4.0

let legs = 0;

function onTick(tick) {
  if (tick.symbol !== "cryBTCUSD") return null;
  if (legs >= maxLegs) {
    log("grid full (" + legs + " legs) — waiting for the mean to catch up");
    return null;
  }

  const atr = ind.atr(tick.symbol, atrPeriod);
  if (!atr.ready) return null;
  const spacing = atr.value * 0.6;

  legs += 1;
  return {
    contract: "MULTUP",
    stake: stake,
    duration: 1,
    durationUnit: "d",
    barrier: (tick.price + spacing).toFixed(2),
  };
}

function onResult(result) {
  if (result.win) legs = Math.max(0, legs - 1);
  log("grid leg settled " + (result.win ? "in profit" : "against us") + " — " + legs + " open");
}

// @test { scenario: 'grid pauses at maxLegs' }
// @test { scenario: 'ATR spacing widens in high volatility' }`;

const SRC_07 = `/**
 * Vol100 Night Martingale — engine v12 (WIP: night-shift scaling)
 * @param {number} initStake=0.5 Base stake for the night session
 * @param {number} multiplier=2.3 Multiplier applied after a loss
 * @param {number} maxStake=25 Ceiling for the night ladder
 */
const session = require("session_filter.js"); // pinned 1.1.0
let stake = initStake;
const buffer = []; // every tick kept for the night report
const nightWindow = { from: "21:00", to: "05:00", tz: "UTC" };

function onTick(tick) {
  const last = getLastResult();
  if (last && !last.win) {
    stake = Math.min(stake * multiplier, maxStake);
    buffer.push({ epoch: tick.epoch, price: tick.price, stake: stake });
    log("night ladder " + stake.toFixed(2));

  if (tick.price <= 0) return null;

  return { contract: "CALL", stake: Number(stake.toFixed(2)), duration: 1, durationUnit: "m" };
`;

const SRC_08 = `/**
 * GBP Mean Reversion — frxGBPUSD RSI-9 fade
 * @param {number} rsiPeriod=9 RSI lookback on the 1-minute tape
 * @param {number} overbought=72 Upper fade zone
 * @param {number} stake=12 Stake per fade
 */
const ind = require("indicators.js"); // pinned 2.4.0
const risk = require("risk.js"); // pinned 3.0.1

let lastFade = 0;

function onTick(tick) {
  if (tick.symbol !== "frxGBPUSD") return null;
  const rsi = ind.rsi(tick.symbol, rsiPeriod);
  if (!rsi.ready) return null;
  if (tick.epoch - lastFade < 60) return null; // one fade per minute

  if (rsi.value >= overbought) {
    lastFade = tick.epoch;
    return { contract: "PUT", stake: stake, duration: 5, durationUnit: "m" };
  }
  if (rsi.value <= 100 - overbought) {
    lastFade = tick.epoch;
    return { contract: "CALL", stake: stake, duration: 5, durationUnit: "m" };
  }
  return null;
}

function onResult(result) {
  risk.assert(getHistory(10).length < 10, "fade burst guard");
  log("fade settled at " + result.exitSpot + " (" + result.contractType + ")");
}

// @test { scenario: 'one fade per minute maximum' }
// @test { scenario: 'RSI 72/28 zones trigger opposite contracts' }`;

const SRC_09 = `/**
 * Silver Fade Swing — frxXAGUSD mean reversion
 * @param {number} zScore=2.1 Standard deviations required to fade
 * @param {number} stake=6 Stake per swing leg
 * @param {number} maxHold=3 Consecutive losses before standing down
 */
const bands = require("vol_bands.js"); // pinned 1.3.0
const session = require("session_filter.js"); // pinned 1.1.0

let losses = 0;

function onTick(tick) {
  if (tick.symbol !== "frxXAGUSD") return null;
  if (losses >= maxHold) return null;

  const z = bands.zScore(tick.symbol, { lookback: "4h" });
  if (!z.ready) return null;
  if (Math.abs(z.value) < zScore) return null;

  return {
    contract: z.value > 0 ? "PUT" : "CALL",
    stake: stake,
    duration: 4,
    durationUnit: "h",
    basis: "stake",
  };
}

function onResult(result) {
  losses = result.win ? 0 : losses + 1;
  if (!result.win) log("fade against us — " + losses + " of " + maxHold);
}

// @test { scenario: 'stands down after maxHold losses' }
// @test { scenario: 'only fades outside a 2.1 sigma band' }`;

const SRC_10 = `/**
 * ETH Momentum DCA — cryETHUSD average-in
 * @param {number} baseStake=4 First leg stake
 * @param {number} stepPct=1.8 Price drop that opens the next leg
 * @param {number} legs=4 Deepest DCA ladder
 */
const ind = require("indicators.js"); // pinned 2.4.0

let entry = null;
let filled = 0;

function onTick(tick) {
  if (tick.symbol !== "cryETHUSD") return null;
  const trend = ind.ema(tick.symbol, 50);
  if (!trend.ready) return null;

  if (entry === null && tick.price > trend.value) {
    entry = tick.price;
    filled = 1;
    return { contract: "MULTUP", stake: baseStake, duration: 1, durationUnit: "d" };
  }

  if (entry !== null && filled < legs && tick.price <= entry * (1 - stepPct / 100)) {
    filled += 1;
    return { contract: "MULTUP", stake: Number((baseStake * filled).toFixed(2)), duration: 1, durationUnit: "d" };
  }
  return null;
}

function onResult(result) {
  if (result.win && filled >= legs) { entry = null; filled = 0; }
  log("DCA leg " + filled + "/" + legs + " → " + (result.win ? "in profit" : "deepened"));
}

// @test { scenario: 'legs open in 1.8% steps below the entry' }
// @test { scenario: 'ladder resets after a profitable full fill' }`;

const SRC_11 = `/**
 * USDJPY Carry Scalp — frxUSDJPY
 * @param {number} stake=8 Stake per scalp
 * @param {number} tpPips=6 Take-profit in pips
 * @param {number} slPips=9 Stop-loss in pips
 */
const ind = require("indicators.js"); // pinned 2.4.0
let dayPnl = 0;

function waitingForCarry() {
  const spread = ind.spread("frxUSDJPY");
  return spread > 0.9; // carry only trades a tight book
}

function onTick(tick) {
  if (tick.symbol !== "frxUSDJPY") return null;
  if (waitingForCarry()) return null;

  const atr = ind.atr("frxUSDJPY", 14);
  if (!atr.ready) return null;

  const tp = tick.price + tpPips / 100;
  const sl = tick.price - slPips / 100;

  if (dayPnl <= -45) {
    log("daily scalp cap reached — standing down");
    return null;
  }

  // NOTE: kept to demonstrate the 100 ms per-tick sandbox timeout guard
  while (true) {
    dayPnl = getHistory(1).reduce(function (a, r) { return a + r.profit; }, 0);
  }

  return { contract: "CALL", stake: stake, duration: 30, durationUnit: "s", barrier: tp.toFixed(3) };
}

function onComplete(summary) {
  process.exit(0); // forbidden API — the sandbox blocks this at save time
}

// @test { scenario: 'stand down at the -45 daily cap' }`;

const SRC_12 = `/**
 * Vol75 Sniper Touch — R_75 touch ladder
 * @param {number} stake=2 Stake per touch rung
 * @param {number} volWindow=20 Ticks used to size the barrier
 * @param {number} rungs=2 Rungs held at once
 */
const ind = require("indicators.js"); // pinned 2.4.0

//ai add a spread filter before arming the touch legs

function onTick(tick) {
  if (tick.symbol !== "R_75") return null;
  if (getOpenContracts().length >= rungs) return null;

  const vol = ind.realisedVol(tick.symbol, volWindow);
  if (!vol.ready) return null;

  const barrier = (tick.price + vol.value * 2).toFixed(3);
  log("touch rung armed at " + barrier);

  return {
    contract: "TOUCH",
    stake: stake,
    duration: 5,
    durationUnit: "t",
    barrier: barrier,
  };
}

function onResult(result) {
  log(result.win ? "touched +" + result.profit : "expired " + result.profit);
}

function onComplete(summary) {
  log("sniper session: " + summary.trades + " rungs, balance " + getBalance());
}

// @test { scenario: 'two rungs maximum are held at once' }
// @test { scenario: 'barrier scales with realised volatility' }`;

/** Editor source for a script id — falls back to the library copy. */
export function scriptSource(scriptId: string): string {
  return SCRIPT_SOURCES[scriptId] ?? SCRIPTS.find((s) => s.id === scriptId)?.code ?? "";
}

export const SCRIPT_SOURCES: Record<string, string> = {
  scr_01: SRC_01,
  scr_02: SRC_02,
  scr_03: SRC_03,
  scr_04: SRC_04,
  scr_05: SRC_05,
  scr_06: SRC_06,
  scr_07: SRC_07,
  scr_08: SRC_08,
  scr_09: SRC_09,
  scr_10: SRC_10,
  scr_11: SRC_11,
  scr_12: SRC_12,
};

export interface ApiSymbol {
  id: string;
  name: string;
  group: ScriptGroup;
  signature: string;
  returns: string;
  description: string;
  example: string;
  since: string;
  restricted: boolean;
  quickRef: boolean;
}

export const API_REFERENCE: ApiSymbol[] = [
  { id: "api_01", name: "onTick", group: "lifecycle", signature: "onTick(tick: Tick): TradeDecision | null", returns: "TradeDecision | null", description: "Called on every new tick of the subscribed symbol. Return a decision to propose a contract, or null to skip the tick.", example: "function onTick(tick) {\n  return { contract: \"CALL\", stake: 0.35, duration: 5, durationUnit: \"t\" };\n}", since: "engine v9", restricted: false, quickRef: true },
  { id: "api_02", name: "onResult", group: "lifecycle", signature: "onResult(result: TradeResult): void", returns: "void", description: "Called after each contract settles. Use it to update ladders, streaks and logs.", example: "function onResult(result) {\n  log(result.win ? \"WIN\" : \"LOSS\");\n}", since: "engine v9", restricted: false, quickRef: true },
  { id: "api_03", name: "onComplete", group: "lifecycle", signature: "onComplete(summary: SessionSummary): void", returns: "void", description: "Called when the bot stops — take-profit hit, stop-loss hit or a manual stop from the fleet board.", example: "function onComplete(summary) {\n  log(\"closed after \" + summary.trades + \" contracts\");\n}", since: "engine v11", restricted: false, quickRef: true },
  { id: "api_04", name: "getLastResult", group: "context", signature: "getLastResult(): TradeResult | null", returns: "TradeResult | null", description: "The most recent settled contract, or null on a cold start.", example: "const last = getLastResult();\nif (last && last.win) stake = initStake;", since: "engine v9", restricted: false, quickRef: true },
  { id: "api_05", name: "getHistory", group: "context", signature: "getHistory(limit: number): TradeResult[]", returns: "TradeResult[]", description: "The last N settled contracts, newest first. Capped at 500 by the sandbox.", example: "const losses = getHistory(5).filter(function (r) { return !r.win; }).length;", since: "engine v9", restricted: false, quickRef: true },
  { id: "api_06", name: "getBalance", group: "context", signature: "getBalance(): number", returns: "number", description: "Balance of the account the bot runs on, in USD. Virtual accounts report the demo balance.", example: "if (getBalance() < 20) return null;", since: "engine v10", restricted: false, quickRef: true },
  { id: "api_07", name: "getOpenContracts", group: "context", signature: "getOpenContracts(): Contract[]", returns: "Contract[]", description: "Contracts still running. Use it to respect max-concurrent settings.", example: "if (getOpenContracts().length >= 2) return null;", since: "engine v10", restricted: false, quickRef: true },
  { id: "api_08", name: "placeTrade", group: "context", signature: "placeTrade(decision: TradeDecision): string", returns: "contract id", description: "Imperative buy, for scripts that trade inside onResult(). Equivalent to returning a decision from onTick.", example: "placeTrade({ contract: \"PUT\", stake: 2, duration: 1, durationUnit: \"t\" });", since: "engine v12", restricted: false, quickRef: true },
  { id: "api_09", name: "log", group: "context", signature: "log(message: string): void", returns: "void", description: "Writes to the script console and the bot log. Rate-limited to 20 lines per second.", example: "log(\"skip tick \" + tick.epoch);", since: "engine v9", restricted: false, quickRef: true },
  { id: "api_10", name: "TradeDecision", group: "decision", signature: "{ contract, stake, duration, durationUnit, barrier?, basis? }", returns: "TradeDecision", description: "The object onTick returns. contract accepts CALL/PUT/DIGITOVER/DIGITUNDER/TOUCH/ACCU/MULTUP, durationUnit accepts t/s/m/h/d.", example: "return { contract: \"DIGITOVER\", stake: 1, duration: 1, durationUnit: \"t\", barrier: 5 };", since: "engine v9", restricted: false, quickRef: true },
  { id: "api_11", name: "Tick", group: "tick", signature: "{ price, symbol, epoch, pipSize }", returns: "Tick", description: "The tick object handed to onTick. price is the raw quote, epoch is the server second.", example: "const px = Number(tick.price.toFixed(tick.pipSize));", since: "engine v9", restricted: false, quickRef: true },
  { id: "api_12", name: "TradeResult", group: "result", signature: "{ win, profit, payout, buyPrice, sellPrice, contractType, entrySpot, exitSpot }", returns: "TradeResult", description: "Settlement payload for a finished contract, delivered to onResult and stored for getHistory.", example: "if (result.entrySpot > result.exitSpot) log(\"fell through entry\");", since: "engine v9", restricted: false, quickRef: true },
  { id: "api_13", name: "@param", group: "params", signature: "/** @param {number} name=default Description */", returns: "config field", description: "Comment annotations become editable fields in the bot configurator. Types: number, string, boolean.", example: "/** @param {number} multiplier=2.0 Multiplier on loss */", since: "engine v11", restricted: false, quickRef: true },
  { id: "api_14", name: "Sandbox limits", group: "sandbox", signature: "128 MB · 100 ms/tick · 1 trade/tick", returns: "—", description: "No filesystem, network, process or DOM access. Exceeding a limit aborts the run and flags the script.", example: "// process, require(\"fs\"), fetch, eval and window are all blocked", since: "engine v12", restricted: true, quickRef: true },
];

export interface CodeSnippet {
  id: string;
  name: string;
  category: "entry" | "indicator" | "recovery" | "risk" | "digits" | "utility";
  description: string;
  code: string;
  uses: number;
  shortcut: string;
}

export const SCRIPT_SNIPPETS: CodeSnippet[] = [
  { id: "sn_01", name: "Buy Rise", category: "entry", description: "Propose a CALL on the current tick with a 5-tick duration.", shortcut: "Ctrl+Space · r", uses: 1840, code: `return {
  contract: "CALL",
  stake: stake,
  duration: 5,
  durationUnit: "t",
  basis: "stake",
};` },
  { id: "sn_02", name: "Buy Fall", category: "entry", description: "Propose a PUT on the current tick.", shortcut: "Ctrl+Space · f", uses: 1612, code: `return {
  contract: "PUT",
  stake: stake,
  duration: 5,
  durationUnit: "t",
  basis: "stake",
};` },
  { id: "sn_03", name: "Check RSI", category: "indicator", description: "Fade when the RSI leaves the neutral band — requires indicators.js.", shortcut: "Ctrl+Space · i", uses: 986, code: `const rsi = ind.rsi(tick.symbol, 9);
if (!rsi.ready) return null;
if (rsi.value >= 72) return { contract: "PUT", stake: stake, duration: 5, durationUnit: "m" };
if (rsi.value <= 28) return { contract: "CALL", stake: stake, duration: 5, durationUnit: "m" };
return null;` },
  { id: "sn_04", name: "Check MA cross", category: "indicator", description: "Trade the fast/slow EMA cross with a trend filter.", shortcut: "Ctrl+Space · m", uses: 742, code: `const fast = ind.ema(tick.symbol, 9);
const slow = ind.ema(tick.symbol, 21);
if (!fast.ready || !slow.ready) return null;
if (fast.value > slow.value && tick.price > fast.value) {
  return { contract: "CALL", stake: stake, duration: 15, durationUnit: "m" };
}
return null;` },
  { id: "sn_05", name: "Martingale step", category: "recovery", description: "Double (capped) after a loss, reset after a win.", shortcut: "Ctrl+Space · g", uses: 1284, code: `const last = getLastResult();
if (last === null) stake = initStake;
else if (last.win) stake = initStake;
else stake = Math.min(stake * multiplier, maxStake);` },
  { id: "sn_06", name: "Daily loss guard", category: "risk", description: "Stand down once the session P&L breaches the configured cap.", shortcut: "Ctrl+Space · d", uses: 1104, code: `const pnl = getHistory(500).reduce(function (a, r) { return a + r.profit; }, 0);
if (pnl <= -config.maxDailyLoss) {
  log("daily cap reached at " + pnl.toFixed(2));
  return null;
}` },
  { id: "sn_07", name: "Consecutive-loss cooldown", category: "risk", description: "Pause after N losses so the ladder cannot run away.", shortcut: "Ctrl+Space · c", uses: 668, code: `const losses = getHistory(cooldownCount).filter(function (r) { return !r.win; }).length;
if (losses >= cooldownCount) {
  log("cooldown active — " + losses + " straight losses");
  return null;
}` },
  { id: "sn_08", name: "Digit over", category: "digits", description: "DIGITOVER with a barrier and one-tick duration.", shortcut: "Ctrl+Space · o", uses: 512, code: `return {
  contract: "DIGITOVER",
  stake: stake,
  duration: 1,
  durationUnit: "t",
  barrier: barrier,
};` },
  { id: "sn_09", name: "Accumulator open", category: "utility", description: "Open an accumulator and let it ride until maxSteps.", shortcut: "Ctrl+Space · a", uses: 288, code: `if (openedAt === null) {
  openedAt = tick.epoch;
  return { contract: "ACCU", stake: stake, duration: 1, durationUnit: "t" };
}
return null;` },
  { id: "sn_10", name: "Session window", category: "utility", description: "Only trade inside a UTC session window.", shortcut: "Ctrl+Space · s", uses: 604, code: `const hour = new Date(tick.epoch * 1000).getUTCHours();
if (hour < 7 || hour >= 10) return null;` },
  { id: "sn_11", name: "Spread filter", category: "utility", description: "Skip ticks while the book is wide.", shortcut: "Ctrl+Space · p", uses: 331, code: `if (ind.spread(tick.symbol) > 0.9) {
  log("spread too wide — skipping");
  return null;
}` },
  { id: "sn_12", name: "On-complete report", category: "utility", description: "Write a session summary when the bot stops.", shortcut: "Ctrl+Space · e", uses: 402, code: `function onComplete(summary) {
  log("closed after " + summary.trades + " contracts at " + getBalance());
}` },
];

export interface ScriptTestCase {
  id: string;
  scriptId: string;
  scenario: string;
  layer: "unit" | "integration" | "e2e";
  assertion: string;
  status: "pass" | "fail" | "pending";
  durationMs: number;
  lastRunMin: number;
  ci: boolean;
  line: number;
}

export const SCRIPT_TESTS: ScriptTestCase[] = [
  { id: "stc_01", scriptId: "scr_01", scenario: "5 wins in a row resets the ladder", layer: "unit", assertion: "stake === initStake after 5 winning ticks", status: "pass", durationMs: 34, lastRunMin: 12, ci: true, line: 46 },
  { id: "stc_02", scriptId: "scr_01", scenario: "ladder caps at maxStake on the 6th loss", layer: "unit", assertion: "every proposed stake <= maxStake across 40 simulated ticks", status: "pass", durationMs: 41, lastRunMin: 12, ci: true, line: 47 },
  { id: "stc_03", scriptId: "scr_01", scenario: "stale tick returns null", layer: "unit", assertion: "onTick({price: 0}) === null", status: "pass", durationMs: 8, lastRunMin: 12, ci: true, line: 48 },
  { id: "stc_04", scriptId: "scr_01", scenario: "bot assignment survives a reload", layer: "integration", assertion: "assign to bot_mart_10, restart, strategy still resolves to scr_01", status: "pass", durationMs: 620, lastRunMin: 140, ci: true, line: 0 },
  { id: "stc_05", scriptId: "scr_07", scenario: "night window closes at 05:00 UTC", layer: "unit", assertion: "onTick at 05:01 UTC returns null", status: "fail", durationMs: 2, lastRunMin: 3, ci: true, line: 19 },
  { id: "stc_06", scriptId: "scr_07", scenario: "buffer stays under 128 MB", layer: "unit", assertion: "peak heap < 128 MB across 3,000 ticks", status: "fail", durationMs: 100, lastRunMin: 3, ci: true, line: 11 },
  { id: "stc_07", scriptId: "scr_03", scenario: "no trade before minSample ticks", layer: "unit", assertion: "first 79 ticks return null", status: "pass", durationMs: 26, lastRunMin: 22, ci: true, line: 30 },
  { id: "stc_08", scriptId: "scr_03", scenario: "barrier 5 fires above a 55% skew", layer: "unit", assertion: "DIGITOVER only when dist.pctOver(5) >= 55", status: "fail", durationMs: 29, lastRunMin: 22, ci: true, line: 31 },
  { id: "stc_09", scriptId: "scr_02", scenario: "outside the session window nothing is proposed", layer: "unit", assertion: "onTick at 03:00 UTC returns null", status: "pass", durationMs: 18, lastRunMin: 64, ci: true, line: 38 },
  { id: "stc_10", scriptId: "scr_02", scenario: "one leg per symbol stays open", layer: "integration", assertion: "getOpenContracts().length <= 2 after 200 ticks", status: "pass", durationMs: 580, lastRunMin: 64, ci: true, line: 0 },
  { id: "stc_11", scriptId: "scr_08", scenario: "one fade per minute maximum", layer: "unit", assertion: "second fade inside 60 s returns null", status: "pass", durationMs: 22, lastRunMin: 180, ci: true, line: 45 },
  { id: "stc_12", scriptId: "scr_11", scenario: "stand down at the -45 daily cap", layer: "unit", assertion: "onTick returns null once dayPnl <= -45", status: "fail", durationMs: 100, lastRunMin: 96, ci: false, line: 31 },
  { id: "stc_13", scriptId: "scr_12", scenario: "two rungs maximum held at once", layer: "unit", assertion: "getOpenContracts().length <= 2", status: "pass", durationMs: 21, lastRunMin: 31, ci: true, line: 48 },
  { id: "stc_14", scriptId: "scr_04", scenario: "accumulator releases after maxSteps", layer: "e2e", assertion: "assign → start → release within 4 steps, balance returns", status: "pass", durationMs: 1450, lastRunMin: 140, ci: false, line: 0 },
];

export interface ForbiddenApi {
  id: string;
  api: string;
  reason: string;
  alternative: string;
  severity: "block" | "warn";
  scope: "process" | "network" | "storage" | "dom" | "module" | "timing";
}

export const FORBIDDEN_APIS: ForbiddenApi[] = [
  { id: "fa_01", api: "process.exit()", reason: "The sandbox owns the process; exiting would kill other tenants' runs.", alternative: "Return null from onTick() or set a standDown flag.", severity: "block", scope: "process" },
  { id: "fa_02", api: "require(\"fs\")", reason: "No filesystem access — scripts cannot read or write files.", alternative: "Keep state in variables or require(\"state.js\") for persistence.", severity: "block", scope: "module" },
  { id: "fa_03", api: "fetch()", reason: "No network access from the sandbox.", alternative: "Read quotes from tick.price and cached indicator modules.", severity: "block", scope: "network" },
  { id: "fa_04", api: "XMLHttpRequest", reason: "No network access from the sandbox.", alternative: "Use the engine's tick stream only.", severity: "block", scope: "network" },
  { id: "fa_05", api: "eval()", reason: "Dynamic code execution defeats static analysis and the @param scanner.", alternative: "Use plain control flow or a lookup object.", severity: "block", scope: "process" },
  { id: "fa_06", api: "new Function()", reason: "Same risk as eval() — code is built at runtime.", alternative: "Declare named functions in the script body.", severity: "block", scope: "process" },
  { id: "fa_07", api: "window / document", reason: "No DOM access inside the sandbox.", alternative: "Log to the script console with log().", severity: "block", scope: "dom" },
  { id: "fa_08", api: "localStorage / sessionStorage", reason: "Storage is not shared between sandbox runs.", alternative: "require(\"state.js\") keeps values for the session.", severity: "block", scope: "storage" },
  { id: "fa_09", api: "setInterval()", reason: "Timers bypass the per-tick execution budget.", alternative: "React to onTick() instead of scheduling work.", severity: "block", scope: "timing" },
  { id: "fa_10", api: "while (true) / for (;;)", reason: "Infinite loops hit the 100 ms per-tick timeout and abort the run.", alternative: "Loop over a bounded array such as getHistory(50).", severity: "warn", scope: "timing" },
  { id: "fa_11", api: "child_process", reason: "No shell or process spawning.", alternative: "Everything must stay inside the script.", severity: "block", scope: "process" },
  { id: "fa_12", api: "WebSocket", reason: "Streams are opened by the engine, not the script.", alternative: "Subscribe through the bot configurator's symbol field.", severity: "block", scope: "network" },
];

export interface ScriptDependency {
  id: string;
  fromScriptId: string;
  module: string;
  version: string;
  locked: boolean;
  latest: string;
  status: "ok" | "missing" | "outdated" | "circular";
  sizeKb: number;
  license: string;
  importedBy: string[];
  purpose: string;
}

export const SCRIPT_DEPENDENCIES: ScriptDependency[] = [
  { id: "sdp_01", fromScriptId: "scr_01", module: "state.js", version: "1.4.2", locked: true, latest: "1.4.2", status: "ok", sizeKb: 6, license: "DerivX SDK", importedBy: ["Martingale Core v7", "Vol75 Sniper Touch"], purpose: "Session-scoped key/value state between ticks." },
  { id: "sdp_02", fromScriptId: "scr_01", module: "indicators.js", version: "2.4.0", locked: true, latest: "2.4.0", status: "ok", sizeKb: 42, license: "DerivX SDK", importedBy: ["Martingale Core v7", "London Breakout FX", "BTC Grid Fixed Stake", "GBP Mean Reversion", "ETH Momentum DCA", "Vol75 Sniper Touch"], purpose: "SMA, EMA, RSI, ATR, realised volatility and spread helpers." },
  { id: "sdp_03", fromScriptId: "scr_02", module: "session_filter.js", version: "1.1.0", locked: true, latest: "1.1.0", status: "ok", sizeKb: 4, license: "DerivX SDK", importedBy: ["London Breakout FX", "Vol100 Night Martingale", "Silver Fade Swing"], purpose: "UTC session windows and news blackout checks." },
  { id: "sdp_04", fromScriptId: "scr_03", module: "digit_stats.js", version: "1.0.7", locked: true, latest: "1.1.2", status: "outdated", sizeKb: 3, license: "DerivX SDK", importedBy: ["Digit Sniper (Differs)"], purpose: "Rolling last-digit distribution and skew." },
  { id: "sdp_05", fromScriptId: "scr_05", module: "touch_levels.js", version: "0.9.4", locked: false, latest: "1.0.0", status: "outdated", sizeKb: 5, license: "MIT", importedBy: ["Gold Touch Ladder"], purpose: "Barrier ladders adapted to the current range." },
  { id: "sdp_06", fromScriptId: "scr_06", module: "grid_tools.js", version: "2.0.1", locked: true, latest: "2.0.1", status: "ok", sizeKb: 8, license: "DerivX SDK", importedBy: ["BTC Grid Fixed Stake"], purpose: "Leg bookkeeping, spacing and mean reversion metrics." },
  { id: "sdp_07", fromScriptId: "scr_07", module: "session_filter.js", version: "1.1.0", locked: false, latest: "1.1.0", status: "ok", sizeKb: 4, license: "DerivX SDK", importedBy: ["Vol100 Night Martingale"], purpose: "Night window guard used before the ladder scales." },
  { id: "sdp_08", fromScriptId: "scr_07", module: "night_report.js", version: "0.4.0", locked: false, latest: "0.4.0", status: "circular", sizeKb: 7, license: "Internal", importedBy: ["Vol100 Night Martingale"], purpose: "Builds the morning report — imports the parent script back." },
  { id: "sdp_09", fromScriptId: "scr_09", module: "vol_bands.js", version: "1.3.0", locked: true, latest: "1.3.0", status: "missing", sizeKb: 0, license: "—", importedBy: ["Silver Fade Swing"], purpose: "Bollinger-style bands and z-score — the module is not published in this workspace yet." },
  { id: "sdp_10", fromScriptId: "scr_08", module: "risk.js", version: "3.0.1", locked: true, latest: "3.0.1", status: "ok", sizeKb: 9, license: "DerivX SDK", importedBy: ["GBP Mean Reversion", "Vol75 Sniper Touch"], purpose: "risk.assert(), daily caps and exposure helpers." },
  { id: "sdp_11", fromScriptId: "scr_10", module: "indicators.js", version: "2.4.0", locked: false, latest: "2.4.0", status: "ok", sizeKb: 42, license: "DerivX SDK", importedBy: ["ETH Momentum DCA"], purpose: "EMA trend filter for the DCA ladder." },
  { id: "sdp_12", fromScriptId: "scr_11", module: "carry_feed.js", version: "0.2.1", locked: false, latest: "0.6.0", status: "outdated", sizeKb: 11, license: "Internal", importedBy: ["USDJPY Carry Scalp"], purpose: "Overnight swap rates used by the carry filter." },
];

export interface ProfileFrame {
  id: string;
  scriptId: string;
  fn: string;
  line: number;
  calls: number;
  totalMs: number;
  avgMs: number;
  pct: number;
  peakMemoryMb: number;
  hot: boolean;
}

export const SCRIPT_PROFILE_FRAMES: ProfileFrame[] = [
  { id: "spf_01", scriptId: "scr_01", fn: "onTick", line: 12, calls: 500, totalMs: 62.4, avgMs: 0.12, pct: 38.1, peakMemoryMb: 34, hot: false },
  { id: "spf_02", scriptId: "scr_01", fn: "getHistory", line: 18, calls: 500, totalMs: 41.2, avgMs: 0.08, pct: 25.2, peakMemoryMb: 34, hot: false },
  { id: "spf_03", scriptId: "scr_01", fn: "onResult", line: 33, calls: 41, totalMs: 18.9, avgMs: 0.46, pct: 11.6, peakMemoryMb: 33, hot: false },
  { id: "spf_04", scriptId: "scr_07", fn: "buffer.push", line: 16, calls: 2130, totalMs: 1284.6, avgMs: 0.6, pct: 62.8, peakMemoryMb: 122, hot: true },
  { id: "spf_05", scriptId: "scr_07", fn: "onTick", line: 12, calls: 2130, totalMs: 884.1, avgMs: 0.42, pct: 43.2, peakMemoryMb: 118, hot: true },
  { id: "spf_06", scriptId: "scr_03", fn: "dist.pctOver", line: 24, calls: 400, totalMs: 188.4, avgMs: 0.47, pct: 51.4, peakMemoryMb: 58, hot: true },
  { id: "spf_07", scriptId: "scr_02", fn: "onTick", line: 15, calls: 360, totalMs: 74.8, avgMs: 0.21, pct: 44.9, peakMemoryMb: 41, hot: false },
  { id: "spf_08", scriptId: "scr_02", fn: "ind.range", line: 19, calls: 360, totalMs: 46.2, avgMs: 0.13, pct: 27.7, peakMemoryMb: 41, hot: false },
  { id: "spf_09", scriptId: "scr_06", fn: "ind.atr", line: 21, calls: 520, totalMs: 122.9, avgMs: 0.24, pct: 33.8, peakMemoryMb: 44, hot: false },
  { id: "spf_10", scriptId: "scr_11", fn: "while(true)", line: 31, calls: 1, totalMs: 100, avgMs: 100, pct: 99.4, peakMemoryMb: 22, hot: true },
  { id: "spf_11", scriptId: "scr_08", fn: "ind.rsi", line: 16, calls: 440, totalMs: 96.3, avgMs: 0.22, pct: 41.6, peakMemoryMb: 31, hot: false },
  { id: "spf_12", scriptId: "scr_12", fn: "ind.realisedVol", line: 16, calls: 300, totalMs: 58.7, avgMs: 0.2, pct: 35.2, peakMemoryMb: 38, hot: false },
];

export interface CommunityTemplate {
  id: string;
  name: string;
  author: string;
  authorTier: "verified" | "pro" | "community";
  category: "trend following" | "mean reversion" | "scalping" | "hedging" | "digits";
  symbol: string;
  contractType: string;
  rating: number;
  stars: number;
  forks: number;
  lines: number;
  license: string;
  verified: boolean;
  benchmark: { winRate: number; pnl: number; maxDrawdown: number; trades: number; period: string };
  description: string;
  code: string;
}

export const COMMUNITY_TEMPLATES: CommunityTemplate[] = [
  { id: "ct_01", name: "Trend Rider EMA 9/21", author: "Mina Larasati", authorTier: "verified", category: "trend following", symbol: "R_50", contractType: "Rise/Fall", rating: 4.8, stars: 1284, forks: 412, lines: 46, license: "MIT", verified: true, benchmark: { winRate: 64.2, pnl: 184.6, maxDrawdown: 42.1, trades: 612, period: "30 days" }, description: "Rides the 9/21 EMA cross with an ATR stop and one contract at a time.", code: `const fast = ind.ema(tick.symbol, 9);
const slow = ind.ema(tick.symbol, 21);
if (!fast.ready || !slow.ready) return null;
if (fast.value > slow.value && getOpenContracts().length === 0) {
  return { contract: "CALL", stake: 2, duration: 10, durationUnit: "m" };
}
return null;` },
  { id: "ct_02", name: "Asia Range Fade", author: "Kwame Boateng", authorTier: "pro", category: "mean reversion", symbol: "frxEURUSD", contractType: "Touch", rating: 4.5, stars: 812, forks: 205, lines: 58, license: "Apache-2.0", verified: true, benchmark: { winRate: 61.8, pnl: 142.3, maxDrawdown: 38.4, trades: 488, period: "30 days" }, description: "Fades the Asian range edges once London opens, with a touch barrier per leg.", code: `const range = ind.range("frxEURUSD", { hours: 6 });
if (!range.ready) return null;
if (tick.price >= range.high) return { contract: "TOUCH", stake: 10, duration: 4, durationUnit: "h" };
if (tick.price <= range.low) return { contract: "NOTOUCH", stake: 10, duration: 4, durationUnit: "h" };
return null;` },
  { id: "ct_03", name: "Tick Scalper 1/1", author: "Ade Fashola", authorTier: "verified", category: "scalping", symbol: "1HZ10V", contractType: "Rise/Fall", rating: 4.1, stars: 604, forks: 318, lines: 32, license: "MIT", verified: true, benchmark: { winRate: 58.4, pnl: 96.2, maxDrawdown: 61.8, trades: 1840, period: "30 days" }, description: "One tick, fixed stake, no recovery — volume comes from tick frequency.", code: `if (getOpenContracts().length > 0) return null;
return { contract: tick.price > tick.prevPrice ? "CALL" : "PUT", stake: 0.5, duration: 1, durationUnit: "t" };` },
  { id: "ct_04", name: "Digit Bias Over 4", author: "Tobi Rotimi", authorTier: "community", category: "digits", symbol: "R_100", contractType: "Digits", rating: 3.9, stars: 388, forks: 141, lines: 41, license: "MIT", verified: false, benchmark: { winRate: 55.1, pnl: 68.4, maxDrawdown: 74.2, trades: 1210, period: "30 days" }, description: "Trades DIGITOVER 4 only when the rolling digit skew favours over.", code: `if (dist.pctOver(4) < 56) return null;
return { contract: "DIGITOVER", stake: 1, duration: 1, durationUnit: "t", barrier: 4 };` },
  { id: "ct_05", name: "Hedge Pair EUR/GBP", author: "Lena Sørensen", authorTier: "pro", category: "hedging", symbol: "frxGBPUSD", contractType: "Rise/Fall", rating: 4.3, stars: 522, forks: 164, lines: 74, license: "GPL-3.0", verified: true, benchmark: { winRate: 59.7, pnl: 118.9, maxDrawdown: 22.6, trades: 396, period: "30 days" }, description: "Holds opposite legs on correlated FX pairs so variance nets out.", code: `if (getOpenContracts().length >= 2) return null;
const corr = ind.correlation("frxEURUSD", "frxGBPUSD", 60);
if (corr.value > 0.8) return { contract: "CALL", stake: 15, duration: 30, durationUnit: "m" };
return null;` },
  { id: "ct_06", name: "Gold Vol Squeeze", author: "Ravi Sharma", authorTier: "community", category: "trend following", symbol: "frxXAUUSD", contractType: "Higher/Lower", rating: 4.0, stars: 296, forks: 88, lines: 52, license: "MIT", verified: false, benchmark: { winRate: 57.2, pnl: 104.1, maxDrawdown: 48.9, trades: 274, period: "30 days" }, description: "Breaks out once the ATR squeeze releases, with a barrier at the prior high.", code: `const squeeze = ind.atrPercentile("frxXAUUSD", 100);
if (squeeze.value > 0.85) return { contract: "CALL", stake: 20, duration: 2, durationUnit: "h" };
return null;` },
  { id: "ct_07", name: "Night Ladder Capped", author: "Jozef Kowalski", authorTier: "pro", category: "mean reversion", symbol: "R_25", contractType: "Rise/Fall", rating: 4.4, stars: 448, forks: 172, lines: 63, license: "Apache-2.0", verified: true, benchmark: { winRate: 62.4, pnl: 132.7, maxDrawdown: 34.5, trades: 512, period: "30 days" }, description: "The recovery ladder every reviewer asks for — hard capped, cooldown included.", code: `const losses = getHistory(5).filter(function (r) { return !r.win; }).length;
if (losses >= 3) return null;
stake = getLastResult() && !getLastResult().win ? Math.min(stake * 1.8, 20) : 1;
return { contract: "CALL", stake: stake, duration: 5, durationUnit: "t" };` },
  { id: "ct_08", name: "Crypto Momentum 50x", author: "Nadia Rahman", authorTier: "community", category: "trend following", symbol: "cryBTCUSD", contractType: "Multiplier", rating: 3.6, stars: 204, forks: 62, lines: 44, license: "MIT", verified: false, benchmark: { winRate: 52.9, pnl: 76.5, maxDrawdown: 88.4, trades: 188, period: "30 days" }, description: "Multiplier entries on momentum with a tight trailing stop.", code: `const trend = ind.ema("cryBTCUSD", 50);
if (!trend.ready || tick.price < trend.value) return null;
return { contract: "MULTUP", stake: 5, duration: 1, durationUnit: "d" };` },
  { id: "ct_09", name: "Silver Bands Fade", author: "Priya Nair", authorTier: "pro", category: "mean reversion", symbol: "frxXAGUSD", contractType: "Rise/Fall", rating: 4.2, stars: 361, forks: 118, lines: 49, license: "MIT", verified: true, benchmark: { winRate: 60.6, pnl: 112.4, maxDrawdown: 41.2, trades: 344, period: "30 days" }, description: "Fades 2.1σ excursions on silver with a stand-down after three losses.", code: `const z = bands.zScore("frxXAGUSD", { lookback: "4h" });
if (!z.ready || Math.abs(z.value) < 2.1) return null;
return { contract: z.value > 0 ? "PUT" : "CALL", stake: 6, duration: 4, durationUnit: "h" };` },
  { id: "ct_10", name: "Touch Ladder Vol75", author: "Sam Okonkwo", authorTier: "community", category: "scalping", symbol: "R_75", contractType: "Touch", rating: 3.8, stars: 187, forks: 54, lines: 38, license: "MIT", verified: false, benchmark: { winRate: 54.3, pnl: 58.9, maxDrawdown: 57.6, trades: 268, period: "30 days" }, description: "Scales the touch barrier with realised volatility on Vol 75.", code: `const vol = ind.realisedVol("R_75", 20);
if (!vol.ready) return null;
return { contract: "TOUCH", stake: 2, duration: 5, durationUnit: "t", barrier: (tick.price + vol.value * 2).toFixed(3) };` },
  { id: "ct_11", name: "Accumulator Steady 2%", author: "Mina Larasati", authorTier: "verified", category: "trend following", symbol: "1HZ10V", contractType: "Accumulator", rating: 4.6, stars: 706, forks: 244, lines: 36, license: "DerivX Sample", verified: true, benchmark: { winRate: 71.4, pnl: 96.8, maxDrawdown: 18.2, trades: 142, period: "30 days" }, description: "Rides accumulators at 2% growth, closing after four steps.", code: `if (step >= 4) { step = 0; return null; }
step += 1;
return { contract: "ACCU", stake: 3, duration: 1, durationUnit: "t" };` },
  { id: "ct_12", name: "GBP Opening Fade", author: "Ade Fashola", authorTier: "verified", category: "scalping", symbol: "frxGBPUSD", contractType: "Rise/Fall", rating: 4.3, stars: 402, forks: 126, lines: 57, license: "Apache-2.0", verified: true, benchmark: { winRate: 58.9, pnl: 88.4, maxDrawdown: 44.7, trades: 306, period: "30 days" }, description: "Fades the first spike of the London open, one shot per session.", code: `if (fired) return null;
if (ind.spike("frxGBPUSD", 5).pips > 12) { fired = true; return { contract: "PUT", stake: 12, duration: 15, durationUnit: "m" }; }
return null;` },
];

export interface ScriptBranch {
  id: string;
  scriptId: string;
  name: string;
  author: string;
  ahead: number;
  behind: number;
  commits: number;
  status: "active" | "merged" | "stale" | "protected";
  updatedMin: number;
  ci: "passing" | "failing" | "pending";
  note: string;
}

export const SCRIPT_BRANCHES: ScriptBranch[] = [
  { id: "sb_01", scriptId: "scr_01", name: "main", author: "Ade F.", ahead: 0, behind: 0, commits: 42, status: "protected", updatedMin: 12, ci: "passing", note: "Protected — changes land through a pull request." },
  { id: "sb_02", scriptId: "scr_01", name: "feature/cooldown-v2", author: "Mina L.", ahead: 3, behind: 1, commits: 5, status: "active", updatedMin: 220, ci: "passing", note: "Cooldown keyed on consecutive losses instead of a counter." },
  { id: "sb_03", scriptId: "scr_07", name: "hotfix/night-shift", author: "Tobi R.", ahead: 2, behind: 4, commits: 6, status: "active", updatedMin: 3, ci: "failing", note: "Unclosed block at line 14 — cannot merge until the syntax error clears." },
  { id: "sb_04", scriptId: "scr_07", name: "main", author: "Tobi R.", ahead: 0, behind: 0, commits: 61, status: "protected", updatedMin: 620, ci: "passing", note: "Last green build is v4.9 — rollback target." },
  { id: "sb_05", scriptId: "scr_03", name: "digits-tuning", author: "Mina L.", ahead: 1, behind: 2, commits: 4, status: "active", updatedMin: 22, ci: "failing", note: "Barrier 5 experiment fails the digit skew test." },
  { id: "sb_06", scriptId: "scr_03", name: "main", author: "Mina L.", ahead: 0, behind: 0, commits: 33, status: "protected", updatedMin: 2610, ci: "passing", note: "Stable barrier-4 build in production." },
  { id: "sb_07", scriptId: "scr_06", name: "grid-v2", author: "Tobi R.", ahead: 2, behind: 0, commits: 9, status: "active", updatedMin: 410, ci: "passing", note: "ATR-spaced grid — ready to merge after a paper week." },
  { id: "sb_08", scriptId: "scr_09", name: "mean-reversion", author: "Ade F.", ahead: 1, behind: 5, commits: 3, status: "stale", updatedMin: 5400, ci: "pending", note: "Waiting on the vol_bands.js module to be published." },
  { id: "sb_09", scriptId: "scr_11", name: "carry-scalp", author: "Kwame B.", ahead: 2, behind: 2, commits: 4, status: "active", updatedMin: 940, ci: "failing", note: "Timeout and forbidden-API failures block the merge." },
  { id: "sb_10", scriptId: "scr_12", name: "main", author: "Mina L.", ahead: 0, behind: 0, commits: 27, status: "protected", updatedMin: 31, ci: "passing", note: "Touch sniper in production on Vol 75." },
];

export interface AiCodePrompt {
  id: string;
  title: string;
  prompt: string;
  intent: "snippet" | "refactor" | "explain" | "test";
  summary: string;
  code: string;
  confidence: number;
  tokens: number;
}

export const AI_CODE_PROMPTS: AiCodePrompt[] = [
  { id: "aip_01", title: "Add a spread filter", prompt: "Add a spread filter before arming the touch legs", intent: "snippet", summary: "Inserts a guard that skips ticks while the book is wider than 0.9 pips.", confidence: 0.93, tokens: 142, code: `if (ind.spread(tick.symbol) > 0.9) {
  log("spread too wide — standing down");
  return null;
}` },
  { id: "aip_02", title: "Cap the ladder", prompt: "Cap the martingale ladder at the configured max stake", intent: "refactor", summary: "Replaces the doubling line with a Math.min clamp against maxStake.", confidence: 0.97, tokens: 96, code: `stake = Math.min(stake * multiplier, maxStake);` },
  { id: "aip_03", title: "Explain onTick", prompt: "Explain what this onTick function does", intent: "explain", summary: "Step-by-step narration of the ladder, the guards and the returned decision.", confidence: 0.9, tokens: 268, code: `/**
 * onTick()
 * 1. Reads the last settled contract to know whether the previous leg won.
 * 2. Resets the stake to initStake after a win, otherwise scales by multiplier
 *    but never beyond maxStake.
 * 3. Refuses stale ticks (price <= 0).
 * 4. Returns a 5-tick CALL sized at the current stake.
 */` },
  { id: "aip_04", title: "Write the test cases", prompt: "Write test cases for the cooldown rules", intent: "test", summary: "Adds four @test blocks covering losses, wins and the cooldown boundary.", confidence: 0.88, tokens: 214, code: `// @test { scenario: 'cooldown engages after 3 losses' }
// @test { scenario: 'cooldown clears after the window elapses' }
// @test { scenario: 'a win during cooldown does not re-arm the ladder' }
// @test { scenario: 'cooldown counts only settled losses' }` },
  { id: "aip_05", title: "Reduce memory pressure", prompt: "The script peaks at 127 MB — suggest a fix", intent: "refactor", summary: "Drops the unbounded tick buffer and keeps a rolling window of 200 ticks.", confidence: 0.92, tokens: 188, code: `const buffer = [];
if (buffer.length >= 200) buffer.shift();
buffer.push({ epoch: tick.epoch, price: tick.price, stake: stake });` },
  { id: "aip_06", title: "Replace the infinite loop", prompt: "Replace while(true) with a bounded loop", intent: "refactor", summary: "Rewrites the polling loop over a fixed history window so the sandbox cannot time out.", confidence: 0.95, tokens: 132, code: `const rows = getHistory(50);
for (let i = 0; i < rows.length; i += 1) {
  dayPnl += rows[i].profit;
}` },
  { id: "aip_07", title: "Add a session window", prompt: "Only trade between 07:00 and 10:30 UTC", intent: "snippet", summary: "Guards onTick with the UTC hour before any proposal is built.", confidence: 0.91, tokens: 118, code: `const hour = new Date(tick.epoch * 1000).getUTCHours();
if (hour < 7 || hour > 10) return null;` },
  { id: "aip_08", title: "Add digit-2 guard", prompt: "Stop trading when the last digit repeats three times", intent: "snippet", summary: "Detects a three-in-a-row digit and stands down for five ticks.", confidence: 0.84, tokens: 156, code: `const tail = String(tick.price).slice(-1);
if (tail === lastDigit) repeats += 1; else repeats = 0;
lastDigit = tail;
if (repeats >= 3) return null;` },
];

export interface ScriptEvent {
  id: string;
  scriptId: string;
  atMin: number;
  actor: string;
  action: string;
  detail: string;
  level: "info" | "warn" | "error";
  channel: "editor" | "sandbox" | "ci" | "version" | "ai";
}

export const SCRIPT_EVENTS: ScriptEvent[] = [
  { id: "sev_01", scriptId: "scr_01", atMin: 12, actor: "Ade F.", action: "published v7.3", detail: "Ladder cap merged to main · 14 tests passed · CI green.", level: "info", channel: "version" },
  { id: "sev_02", scriptId: "scr_07", atMin: 3, actor: "Tobi R.", action: "save blocked", detail: "Unexpected end of file — the block opened at line 14 is never closed.", level: "error", channel: "editor" },
  { id: "sev_03", scriptId: "scr_07", atMin: 18, actor: "sandbox", action: "run aborted", detail: "Heap peaked at 127 MB of the 128 MB ceiling on run #1838.", level: "error", channel: "sandbox" },
  { id: "sev_04", scriptId: "scr_11", atMin: 96, actor: "sandbox", action: "tick timeout", detail: "Execution exceeded 100 ms at line 31 — while(true) inside onTick().", level: "error", channel: "sandbox" },
  { id: "sev_05", scriptId: "scr_11", atMin: 108, actor: "sandbox", action: "forbidden API", detail: "process.exit() is on the block list — save refused.", level: "error", channel: "editor" },
  { id: "sev_06", scriptId: "scr_03", atMin: 22, actor: "CI", action: "test failed", detail: "digits-tuning: 'barrier 5 fires above a 55% skew' failed on the weekend tape.", level: "warn", channel: "ci" },
  { id: "sev_07", scriptId: "scr_03", atMin: 26, actor: "Mina L.", action: "opened branch", detail: "digits-tuning branched from main at v2.8.", level: "info", channel: "version" },
  { id: "sev_08", scriptId: "scr_09", atMin: 55, actor: "editor", action: "module missing", detail: "require(\"vol_bands.js\") — not published in this workspace.", level: "error", channel: "editor" },
  { id: "sev_09", scriptId: "scr_12", atMin: 31, actor: "AI assistant", action: "suggestion accepted", detail: "Spread filter inserted above the barrier calculation.", level: "info", channel: "ai" },
  { id: "sev_10", scriptId: "scr_05", atMin: 300, actor: "Kwame B.", action: "rolled back", detail: "v4.2 restored after the gold ladder breached the 4h range.", level: "warn", channel: "version" },
  { id: "sev_11", scriptId: "scr_06", atMin: 410, actor: "CI", action: "tests green", detail: "10 tests passed in 1.6 s on grid-v2.", level: "info", channel: "ci" },
  { id: "sev_12", scriptId: "scr_02", atMin: 64, actor: "Ade F.", action: "autosave", detail: "Session window widened — buffered locally after 2 s idle.", level: "info", channel: "editor" },
  { id: "sev_13", scriptId: "scr_04", atMin: 140, actor: "sandbox", action: "profiled", detail: "onTick averages 0.18 ms over 300 ticks — well inside budget.", level: "info", channel: "sandbox" },
  { id: "sev_14", scriptId: "scr_10", atMin: 620, actor: "Tobi R.", action: "forked template", detail: "Forked 'Crypto Momentum 50x' into ETH Momentum DCA.", level: "info", channel: "version" },
];

// -----------------------------------------------------------------------------
// D-6 pure helpers — static analysis, sandbox simulation, diffing, graphs.
// Everything runs on the main thread here; the blueprint's worker boundaries
// (syntax highlighting, test run, diff) are marked where they would sit.
// -----------------------------------------------------------------------------
export interface ScriptParam {
  key: string;
  type: string;
  value: string;
  defaultValue: string;
  description: string;
  line: number;
}

export interface ScriptIssue {
  id: string;
  line: number;
  column: number;
  severity: "error" | "warning" | "info";
  rule: "syntax" | "forbidden" | "module" | "lint" | "perf";
  message: string;
  suggestion: string;
  snippet: string;
  fixId?: string;
}

export interface DiffLine {
  kind: DiffKind;
  a: number | null;
  b: number | null;
  text: string;
}

export interface AnalysisResult {
  issues: ScriptIssue[];
  params: ScriptParam[];
  imports: { module: string; locked: boolean; line: number; status: "ok" | "missing" | "outdated" | "circular" }[];
  tests: { scenario: string; line: number }[];
  stats: { lines: number; bytes: number; functions: number; comments: number; blanks: number; longest: number; params: number; tests: number };
  blocked: boolean;
}

const SCRIPT_KEYWORDS = new Set([
  "const", "let", "var", "function", "return", "if", "else", "for", "while", "do", "break", "continue",
  "switch", "case", "default", "new", "typeof", "instanceof", "null", "undefined", "true", "false",
  "in", "of", "try", "catch", "finally", "throw", "class", "extends", "async", "await", "delete", "void", "this",
]);

/** Token stream per line — the editor paints these instead of shipping Monaco. */
export function tokenizeJs(code: string): { text: string; kind: CodeTokenKind }[][] {
  let inBlock = false;
  return code.split("\n").map((line) => {
    const tokens: { text: string; kind: CodeTokenKind }[] = [];
    let i = 0;
    if (inBlock) {
      const end = line.indexOf("*/");
      if (end === -1) {
        tokens.push({ text: line, kind: "comment" });
        return tokens;
      }
      tokens.push({ text: line.slice(0, end + 2), kind: "comment" });
      i = end + 2;
      inBlock = false;
    }
    while (i < line.length) {
      const rest = line.slice(i);
      const ch = line[i];
      if (ch === " " || ch === "\t") {
        let j = i;
        while (line[j] === " " || line[j] === "\t") j += 1;
        tokens.push({ text: line.slice(i, j), kind: "plain" });
        i = j;
        continue;
      }
      if (rest.startsWith("//")) {
        const marker = rest.startsWith("//ai") || rest.startsWith("// @test");
        tokens.push({ text: rest, kind: marker ? "ai" : "comment" });
        break;
      }
      if (rest.startsWith("/*")) {
        const end = rest.indexOf("*/", 2);
        if (end === -1) {
          tokens.push({ text: rest, kind: "comment" });
          inBlock = true;
          break;
        }
        tokens.push({ text: rest.slice(0, end + 2), kind: "comment" });
        i += end + 2;
        continue;
      }
      const word = /^[A-Za-z_$][\w$]*/.exec(rest);
      if (word) {
        const isFn = /^\s*\(/.test(rest.slice(word[0].length));
        tokens.push({ text: word[0], kind: SCRIPT_KEYWORDS.has(word[0]) ? "keyword" : isFn ? "fn" : "plain" });
        i += word[0].length;
        continue;
      }
      const num = /^\d[\d.]*/.exec(rest);
      if (num) {
        tokens.push({ text: num[0], kind: "number" });
        i += num[0].length;
        continue;
      }
      const str = /^"[^"]*"?|^'[^']*'?/.exec(rest);
      if (str) {
        tokens.push({ text: str[0], kind: "string" });
        i += str[0].length;
        continue;
      }
      tokens.push({ text: ch, kind: "punct" });
      i += 1;
    }
    return tokens;
  });
}

/** @param ... annotations become editable bot-config fields (engine v11+). */
export function scriptParamsOf(code: string): ScriptParam[] {
  const out: ScriptParam[] = [];
  code.split("\n").forEach((line, idx) => {
    const m = /@param\s*\{(\w+)\}\s*(\w+)\s*=\s*([^\s]+)\s*(.*)$/.exec(line);
    if (!m) return;
    out.push({
      key: m[2],
      type: m[1],
      value: m[3],
      defaultValue: m[3],
      description: m[4].replace(/\*\/\s*$/, "").trim(),
      line: idx + 1,
    });
  });
  return out;
}

const FORBIDDEN_MATCHERS: Record<string, RegExp> = {
  fa_01: /process\.exit\s*\(/,
  fa_02: /require\(\s*["']fs["']\s*\)/,
  fa_03: /\bfetch\s*\(/,
  fa_04: /\bXMLHttpRequest\b/,
  fa_05: /\beval\s*\(/,
  fa_06: /new\s+Function\s*\(/,
  fa_07: /\b(window|document)\b/,
  fa_08: /\b(localStorage|sessionStorage)\b/,
  fa_09: /\bsetInterval\s*\(/,
  fa_10: /while\s*\(\s*true\s*\)|for\s*\(\s*;\s*;\s*\)/,
  fa_11: /\bchild_process\b/,
  fa_12: /\bWebSocket\b/,
};

function stripTokens(line: string): string {
  if (/^\s*(\/\*|\*)/.test(line)) return "";
  return line
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/\/\/.*$/, "");
}

/** Static analysis: syntax balance, forbidden APIs, module resolution, perf hints. */
export function analyzeScript(scriptId: string, code: string): AnalysisResult {
  const issues: ScriptIssue[] = [];
  const lines = code.split("\n");
  const stack: { ch: string; line: number }[] = [];
  let firstNegLine = -1;

  lines.forEach((raw, idx) => {
    const line = stripTokens(raw);
    for (let c = 0; c < line.length; c += 1) {
      const ch = line[c];
      if (ch === "{" || ch === "(" || ch === "[") stack.push({ ch, line: idx + 1 });
      else if (ch === "}" || ch === ")" || ch === "]") {
        const top = stack.pop();
        if (!top && firstNegLine === -1) {
          firstNegLine = idx + 1;
          issues.push({
            id: `iss_neg_${idx}`,
            line: idx + 1,
            column: c + 1,
            severity: "error",
            rule: "syntax",
            message: `Unexpected token '${ch}' — nothing is open at this position.`,
            suggestion: "Delete the extra brace or wrap the statements above it in a block.",
            snippet: raw.trim(),
          });
        }
      }
    }
  });

  if (stack.length && firstNegLine === -1) {
    const open = stack[stack.length - 1];
    issues.push({
      id: "iss_eof",
      line: open.line,
      column: 1,
      severity: "error",
      rule: "syntax",
      message: `Unexpected end of file — the block opened at line ${open.line} is never closed.`,
      suggestion: `Close the block with '}' before line ${Math.min(lines.length, open.line + 8)} and re-run the test suite.`,
      snippet: (lines[open.line - 1] ?? "").trim(),
    });
  }

  const imports: AnalysisResult["imports"] = [];
  lines.forEach((raw, idx) => {
    const m = /require\(\s*["']([^"']+)["']\s*\)/.exec(stripTokens(raw));
    if (!m) return;
    const dep = SCRIPT_DEPENDENCIES.find((d) => d.fromScriptId === scriptId && d.module === m[1]);
    const status = dep ? dep.status : "missing";
    imports.push({ module: m[1], locked: dep?.locked ?? false, line: idx + 1, status });
    if (status === "missing") {
      issues.push({
        id: `iss_mod_${idx}`,
        line: idx + 1,
        column: raw.indexOf(m[1]) + 1,
        severity: "error",
        rule: "module",
        message: `Module not found: '${m[1]}' is not published in this workspace.`,
        suggestion: "Create a stub module with the exported helpers, or swap the import for an SDK module.",
        snippet: raw.trim(),
        fixId: `stub:${m[1]}`,
      });
    } else if (status === "circular") {
      issues.push({
        id: `iss_circ_${idx}`,
        line: idx + 1,
        column: raw.indexOf(m[1]) + 1,
        severity: "error",
        rule: "module",
        message: `Circular import: '${m[1]}' imports this script back.`,
        suggestion: "Extract the shared helper into a third module both scripts can import.",
        snippet: raw.trim(),
      });
    } else if (status === "outdated" && !dep?.locked) {
      issues.push({
        id: `iss_out_${idx}`,
        line: idx + 1,
        column: 1,
        severity: "warning",
        rule: "module",
        message: `'${m[1]}' is pinned to ${dep?.version} but ${dep?.latest} is available.`,
        suggestion: `Lock the import to ${dep?.latest} in the dependency panel, then re-run the suite.`,
        snippet: raw.trim(),
      });
    }
  });

  lines.forEach((raw, idx) => {
    const bare = stripTokens(raw);
    FORBIDDEN_APIS.forEach((f) => {
      const matcher = FORBIDDEN_MATCHERS[f.id];
      if (!matcher || !matcher.test(bare)) return;
      issues.push({
        id: `iss_forb_${f.id}_${idx}`,
        line: idx + 1,
        column: Math.max(1, raw.search(matcher)),
        severity: f.severity === "block" ? "error" : "warning",
        rule: "forbidden",
        message: f.severity === "block" ? `${f.api} is not allowed in the sandbox.` : `${f.api} risks the 100 ms per-tick timeout.`,
        suggestion: f.alternative,
        snippet: raw.trim(),
      });
    });
  });

  if (/\.push\(/.test(code) && !/buffer\.length\s*[<>]=?/.test(code) && !/\.slice\(/.test(code)) {
    issues.push({
      id: "iss_perf_buf",
      line: lines.findIndex((l) => /\.push\(/.test(l)) + 1,
      column: 1,
      severity: "warning",
      rule: "perf",
      message: "Unbounded array growth — the buffer is never trimmed.",
      suggestion: "Cap the array (for example keep the last 200 rows) or the run aborts at the 128 MB ceiling.",
      snippet: lines.find((l) => /\.push\(/.test(l))?.trim() ?? "",
    });
  }

  const tests = lines
    .map((l, idx) => ({ scenario: /@test\s*\{\s*scenario:\s*'([^']+)'/.exec(l)?.[1] ?? "", line: idx + 1 }))
    .filter((t) => t.scenario);

  return {
    issues,
    params: scriptParamsOf(code),
    imports,
    tests,
    stats: {
      lines: lines.length,
      bytes: new TextEncoder().encode(code).length,
      functions: (code.match(/\bfunction\s+\w+/g) ?? []).length,
      comments: lines.filter((l) => /^\s*(\/\/|\/\*|\*)/.test(l)).length,
      blanks: lines.filter((l) => l.trim() === "").length,
      longest: lines.reduce((max, l) => Math.max(max, l.length), 0),
      params: scriptParamsOf(code).length,
      tests: tests.length,
    },
    blocked: issues.some((i) => i.severity === "error"),
  };
}

export function scriptMetaOf(scriptId: string): ScriptEditorRow | undefined {
  return SCRIPT_EDITOR_ROWS.find((r) => r.scriptId === scriptId);
}

export function scriptById(scriptId: string): Script | undefined {
  return SCRIPTS.find((s) => s.id === scriptId);
}

export interface SandboxTrade {
  seq: number;
  atMin: number;
  contract: string;
  stake: number;
  payout: number;
  profit: number;
  win: boolean;
  entrySpot: number;
  exitSpot: number;
}

export interface SandboxRun {
  scriptId: string;
  status: "ok" | "syntax" | "timeout" | "memory";
  ticks: number;
  trades: SandboxTrade[];
  equity: number[];
  logLines: string[];
  memory: number[];
  peakMemoryMb: number;
  durationMs: number;
  timeoutAtLine: number | null;
  winRate: number;
  pnl: number;
  maxDrawdown: number;
}

/** Sandboxed test run — deterministic, seeded from the script id + version. */
export function runScriptSandbox(scriptId: string, code: string, opts?: { seed?: number; ticks?: number; version?: string }): SandboxRun {
  const analysis = analyzeScript(scriptId, code);
  const script = scriptById(scriptId);
  const meta = scriptMetaOf(scriptId);
  const ticks = opts?.ticks ?? 500;
  const rand = mulberry32(opts?.seed ?? seedFrom(`${scriptId}${opts?.version ?? meta?.version ?? "v1"}${code.length}`));
  const params = analysis.params;
  const numParam = (key: string, fallback: number) => Number(params.find((p) => p.key === key)?.value ?? fallback);
  const initStake = numParam("initStake", 0.35);
  const multiplier = numParam("multiplier", 2);
  const maxStake = numParam("maxStake", 50);
  const barrier = numParam("barrier", 5);
  const symbol = script?.symbol ?? "R_10";
  const price = MARKET_SYMBOLS.find((s) => s.code === symbol)?.basePrice ?? 1000;
  const pip = MARKET_SYMBOLS.find((s) => s.code === symbol)?.pipSize ?? 2;
  const payoutPct = MARKET_SYMBOLS.find((s) => s.code === symbol)?.payoutPct ?? 95;
  const winRate = (script?.winRate ?? 60) / 100;
  const infinite = /while\s*\(\s*true\s*\)|for\s*\(\s*;\s*;\s*\)/.exec(stripTokens(code));
  const loopLine = infinite ? code.slice(0, infinite.index).split("\n").length : null;

  if (analysis.blocked) {
    return {
      scriptId,
      status: "syntax",
      ticks: 0,
      trades: [],
      equity: [],
      logLines: [`error  save blocked — ${analysis.issues.filter((i) => i.severity === "error").length} error(s)`, `error  first error at line ${analysis.issues[0]?.line ?? 1}: ${analysis.issues[0]?.message ?? ""}`],
      memory: [12, 14, 13],
      peakMemoryMb: 14,
      durationMs: 100,
      timeoutAtLine: null,
      winRate: 0,
      pnl: 0,
      maxDrawdown: 0,
    };
  }

  const execTicks = loopLine ? Math.min(41, ticks) : ticks;
  const trades: SandboxTrade[] = [];
  const equity: number[] = [0];
  const memory: number[] = [];
  const logLines: string[] = [];
  let stake = initStake;
  let streak = 0;
  let pnl = 0;
  let peak = 0;
  let drawdown = 0;
  let heap = 14;

  logLines.push(`info   sandbox worker ready · ${symbol} · timeout 100 ms/tick`);
  logLines.push(`info   params: ${params.map((p) => `${p.key}=${p.value}`).join(" · ")}`);

  for (let i = 1; i <= execTicks; i += 1) {
    heap = Math.min(meta?.peakMemoryMb ?? 40, heap + rand() * 1.4);
    if (i % 50 === 0) memory.push(Math.round(heap));
    const win = rand() < winRate;
    const payout = Math.round(stake * (payoutPct / 100) * 100) / 100;
    const profit = win ? payout : -stake;
    const entry = Math.round((price * (1 + (rand() - 0.5) * 0.002)) * 10 ** pip) / 10 ** pip;
    const exit = Math.round((entry * (1 + (rand() - 0.5) * 0.003)) * 10 ** pip) / 10 ** pip;
    trades.push({ seq: trades.length + 1, atMin: trades.length * 7 + 3, contract: script?.symbol === "R_100" ? "DIGITOVER" : "RISE", stake: Number(stake.toFixed(2)), payout, profit, win, entrySpot: entry, exitSpot: exit });
    pnl = Math.round((pnl + profit) * 100) / 100;
    equity.push(pnl);
    peak = Math.max(peak, pnl);
    drawdown = Math.max(drawdown, peak - pnl);
    streak = win ? 0 : streak + 1;
    stake = win ? initStake : Math.min(stake * multiplier, maxStake);
    if (i % 60 === 0) logLines.push(`info   tick ${i} · ${win ? "WIN" : "LOSS"} ${profit >= 0 ? "+" : ""}${profit.toFixed(2)} · equity ${pnl.toFixed(2)}`);
    if (loopLine) break;
  }

  const status: SandboxRun["status"] = loopLine ? "timeout" : (meta?.peakMemoryMb ?? 0) >= 120 ? "memory" : "ok";
  if (loopLine) logLines.push(`error  Timeout at line ${loopLine} — execution exceeded 100 ms in a single tick`);
  if (status === "memory") logLines.push(`error  Heap peaked at ${meta?.peakMemoryMb} MB of the 128 MB ceiling — run aborted`);
  logLines.push(`info   ${trades.length} contracts · win rate ${((trades.filter((t) => t.win).length / Math.max(1, trades.length)) * 100).toFixed(1)}% · ${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} USD`);
  logLines.push(`info   ${barrier} barrier ${script?.symbol === "R_100" ? "applied to DIGITOVER" : "not used by this contract"}`);

  return {
    scriptId,
    status,
    ticks: execTicks,
    trades,
    equity,
    logLines,
    memory: memory.length ? memory : [heap],
    peakMemoryMb: loopLine ? meta?.peakMemoryMb ?? 40 : Math.round(heap),
    durationMs: loopLine ? 100 : 200 + trades.length * 26,
    timeoutAtLine: loopLine,
    winRate: trades.length ? (trades.filter((t) => t.win).length / trades.length) * 100 : 0,
    pnl,
    maxDrawdown: Math.round(drawdown * 100) / 100,
  };
}

/** Test-suite run: keeps the fixture's failures failing so the CI story stays honest. */
export function runScriptSuite(scriptId: string, cases: ScriptTestCase[]): { rows: ScriptTestCase[]; passed: number; failed: number; ms: number } {
  const rows = cases.filter((c) => c.scriptId === scriptId);
  const passed = rows.filter((r) => r.status === "pass").length;
  const failed = rows.filter((r) => r.status === "fail").length;
  return { rows, passed, failed, ms: rows.reduce((sum, r) => sum + r.durationMs, 0) };
}

export function profileScript(scriptId: string): ProfileFrame[] {
  const frames = SCRIPT_PROFILE_FRAMES.filter((f) => f.scriptId === scriptId);
  return frames.length ? frames : SCRIPT_PROFILE_FRAMES.slice(0, 4);
}

/** Line diff (LCS) — the blueprint computes this in a worker; the shape is identical. */
export function diffCode(before: string, after: string): DiffLine[] {
  const a = before.split("\n");
  const b = after.split("\n");
  const table: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ kind: "same", a: i + 1, b: j + 1, text: a[i] });
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      out.push({ kind: "remove", a: i + 1, b: null, text: a[i] });
      i += 1;
    } else {
      out.push({ kind: "add", a: null, b: j + 1, text: b[j] });
      j += 1;
    }
  }
  while (i < a.length) {
    out.push({ kind: "remove", a: i + 1, b: null, text: a[i] });
    i += 1;
  }
  while (j < b.length) {
    out.push({ kind: "add", a: null, b: j + 1, text: b[j] });
    j += 1;
  }
  return out;
}

export interface GraphNode {
  id: string;
  label: string;
  kind: "script" | "module" | "missing" | "circular";
  x: number;
  y: number;
  status: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  label: string;
  status: "ok" | "missing" | "outdated" | "circular";
}

/** Dependency graph in a 0–100 coordinate space so the page can draw it with CSS. */
export function dependencyGraphOf(scriptId: string): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const deps = SCRIPT_DEPENDENCIES.filter((d) => d.fromScriptId === scriptId);
  const script = scriptById(scriptId);
  const nodes: GraphNode[] = [{ id: scriptId, label: script?.name ?? scriptId, kind: "script", x: 50, y: 18, status: "root" }];
  const edges: GraphEdge[] = [];
  deps.forEach((d, i) => {
    const angle = (Math.PI * (i + 0.6)) / Math.max(1, deps.length + 0.4);
    nodes.push({
      id: d.id,
      label: d.module,
      kind: d.status === "missing" ? "missing" : d.status === "circular" ? "circular" : "module",
      x: Math.round(50 + Math.cos(angle) * 34),
      y: Math.round(74 - Math.sin(angle) * 12),
      status: d.status,
    });
    edges.push({ from: scriptId, to: d.id, label: d.version, status: d.status });
  });
  return { nodes, edges };
}

/** Free engine slot lookup reused by the export/deploy copy. */
export function freeEngineSlots(): EngineSlot[] {
  return ENGINE_SLOTS.filter((s) => s.state === "free");
}
