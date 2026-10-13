// =============================================================================
// live.ts — client-side tick simulation hooks.
// Mirrors the Deriv public `tick` stream: deterministic on first paint (so SSR
// markup matches hydration) then advancing on an interval once mounted.
// Swap the body of these hooks for a real WebSocket subscription later.
// =============================================================================
import { useEffect, useRef, useState } from "react";
import { SYMBOL_MAP, mulberry32, nextTick, seedSpark, type Tick } from "../data/market";

export interface LiveQuote {
  code: string;
  quote: number;
  prevQuote: number;
  dir: Tick["dir"];
  changePct: number;
}

function seedQuotes(codes: string[]): Record<string, LiveQuote> {
  const out: Record<string, LiveQuote> = {};
  codes.forEach((code) => {
    const symbol = SYMBOL_MAP[code];
    if (!symbol) return;
    out[code] = {
      code,
      quote: symbol.basePrice,
      prevQuote: symbol.basePrice,
      dir: "flat",
      changePct: symbol.changePct,
    };
  });
  return out;
}

/** Live quotes for a set of Deriv symbols (advances every `intervalMs`). */
export function useTicks(codes: string[], intervalMs = 1800) {
  const [quotes, setQuotes] = useState<Record<string, LiveQuote>>(() => seedQuotes(codes));
  const randRef = useRef(mulberry32(20261013));

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = window.setInterval(() => {
      setQuotes((prev) => {
        const next = { ...prev };
        codes.forEach((code, i) => {
          const symbol = SYMBOL_MAP[code];
          if (!symbol) return;
          const current = next[code];
          // stagger symbols so the strip does not tick in lock-step
          if ((Math.floor(Date.now() / intervalMs) + i) % codes.length !== 0) return;
          const tick = nextTick(symbol, current.quote, randRef.current);
          next[code] = {
            code,
            quote: tick.quote,
            prevQuote: current.quote,
            dir: tick.dir,
            changePct: ((tick.quote - symbol.basePrice) / symbol.basePrice) * 100,
          };
        });
        return next;
      });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [codes, intervalMs]);

  return quotes;
}

/** Live sparkline series for one symbol (used in preview widgets). */
export function useLiveSeries(code: string, points = 28, intervalMs = 2200) {
  const [series, setSeries] = useState<number[]>(() => seedSpark(code, points));
  const randRef = useRef(mulberry32(77123));

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = window.setInterval(() => {
      setSeries((prev) => {
        const symbol = SYMBOL_MAP[code];
        if (!symbol) return prev;
        const tick = nextTick(symbol, prev[prev.length - 1], randRef.current);
        return [...prev.slice(1), tick.quote];
      });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [code, intervalMs]);

  return series;
}

/** Floating P&L drift for open positions in preview widgets. */
export function usePnlDrift(base: number, intervalMs = 2400) {
  const [value, setValue] = useState(base);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const rand = mulberry32(Math.abs(Math.round(base * 100)) + 7);
    const id = window.setInterval(() => {
      setValue((prev) => Math.round((prev + (rand() - 0.48) * Math.max(0.4, Math.abs(base) * 0.06)) * 100) / 100);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [base, intervalMs]);
  return value;
}

/** Countdown label for a contract expiry (client-only, starts after mount). */
export function useCountdown(target: number) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (now === null) return null;
  const diff = Math.max(0, target - now);
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
