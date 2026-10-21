"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { OverlayKind, RightDrawerState } from "@/lib/dashboard/types";

export interface DeskToast {
  id: string;
  tone: "success" | "info" | "warning" | "error";
  title: string;
  detail?: string;
}

interface OperatorUIContextValue {
  overlay: OverlayKind | null;
  openOverlay: (next: OverlayKind) => void;
  closeOverlay: () => void;

  drawer: RightDrawerState;
  openDrawerTab: (tab: "feed" | "bots" | "queue" | "alerts") => void;
  inspectEntity: (
    entity: NonNullable<Extract<RightDrawerState, { open: true }>["entity"]>,
  ) => void;
  closeDrawer: () => void;

  flashTradeId: string | null;
  markFlashedTrade: (tradeId: string) => void;

  toasts: DeskToast[];
  pushToast: (toast: Omit<DeskToast, "id">) => void;
  dismissToast: (id: string) => void;

  theme: "light" | "dark";
  toggleTheme: () => void;
}

const OperatorUIContext = createContext<OperatorUIContextValue | null>(null);

export function OperatorUIProvider({ children }: { children: ReactNode }) {
  const [overlay, setOverlay] = useState<OverlayKind | null>(null);
  const [drawer, setDrawer] = useState<RightDrawerState>({ open: false });
  const [flashTradeId, setFlashTradeId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<DeskToast[]>([]);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Always default to light mode on mount unless explicitly toggled in session
  useEffect(() => {
    const saved = window.sessionStorage.getItem("trademo.desk.theme");
    const initial = saved === "dark" ? "dark" : "light";
    setTheme(initial);
    document.documentElement.setAttribute("data-bs-theme", initial);
    return () => {
      document.documentElement.setAttribute("data-bs-theme", "light");
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-bs-theme", next);
      window.sessionStorage.setItem("trademo.desk.theme", next);
      return next;
    });
  }, []);

  // Global ⌘K / Ctrl+K shortcut for Command Palette + Escape handling
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOverlay((curr) => (curr?.type === "command-palette" ? null : { type: "command-palette" }));
      } else if (e.key === "Escape") {
        setOverlay((curr) => {
          if (curr) return null;
          setDrawer({ open: false });
          return null;
        });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const openOverlay = useCallback((next: OverlayKind) => setOverlay(next), []);
  const closeOverlay = useCallback(() => setOverlay(null), []);

  const openDrawerTab = useCallback((tab: "feed" | "bots" | "queue" | "alerts") => {
    setDrawer({ open: true, tab });
  }, []);

  const inspectEntity = useCallback(
    (entity: NonNullable<Extract<RightDrawerState, { open: true }>["entity"]>) => {
      setDrawer({ open: true, tab: "feed", entity });
    },
    [],
  );

  const closeDrawer = useCallback(() => setDrawer({ open: false }), []);

  const markFlashedTrade = useCallback((tradeId: string) => {
    setFlashTradeId(tradeId);
    window.setTimeout(() => {
      setFlashTradeId((curr) => (curr === tradeId ? null : curr));
    }, 1800);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback((toast: Omit<DeskToast, "id">) => {
    const id = `tst_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [{ ...toast, id }, ...prev.slice(0, 3)]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const value = useMemo<OperatorUIContextValue>(
    () => ({
      overlay,
      openOverlay,
      closeOverlay,
      drawer,
      openDrawerTab,
      inspectEntity,
      closeDrawer,
      flashTradeId,
      markFlashedTrade,
      toasts,
      pushToast,
      dismissToast,
      theme,
      toggleTheme,
    }),
    [
      overlay,
      openOverlay,
      closeOverlay,
      drawer,
      openDrawerTab,
      inspectEntity,
      closeDrawer,
      flashTradeId,
      markFlashedTrade,
      toasts,
      pushToast,
      dismissToast,
      theme,
      toggleTheme,
    ],
  );

  return <OperatorUIContext.Provider value={value}>{children}</OperatorUIContext.Provider>;
}

export function useOperatorUI(): OperatorUIContextValue {
  const ctx = useContext(OperatorUIContext);
  if (!ctx) throw new Error("useOperatorUI must be used inside OperatorUIProvider");
  return ctx;
}
