// smoke/entry.tsx — client-renders the landing page through a memory router in
// a DOM pre-filled with the SSR markup (shell stripped), then drives every
// primary control. Uncaught errors, React warnings and SSR/CSR text differences
// are reported back through window.__smokeResult.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Outlet, RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { LandingPage } from "../../src/components/marketing/LandingPage";
import { ToastProvider } from "../../src/components/ui/primitives";

interface SmokeResult {
  ok: boolean;
  errors: string[];
  dialogs: string[];
  textDiff: string[];
  controls: number;
  labels?: string[];
  fuzzLog?: string[];
}

declare global {
  interface Window {
    __SSR_HTML__?: string;
    __smokeResult?: SmokeResult;
    __firstPaint?: { same: boolean; firstDiff: string[]; ssrLen: number; clientLen: number };
  }
}

const errors: string[] = [];
const originalError = console.error;
console.error = (...args: unknown[]) => {
  errors.push(args.map((a) => (a instanceof Error ? a.message : String(a))).join(" ").slice(0, 400));
  originalError(...args);
};
window.addEventListener("error", (e) => errors.push(`[uncaught] ${e.message}`));
window.addEventListener("unhandledrejection", (e) => errors.push(`[rejection] ${String(e.reason).slice(0, 200)}`));

const container = document.getElementById("app-root")!;

// root + index only: the production shellComponent renders <html>, which cannot
// be mounted inside a div in this headless harness.
const rootRoute = createRootRoute({
  component: () => (
    <ToastProvider>
      <Outlet />
    </ToastProvider>
  ),
});
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: LandingPage });
const router = createRouter({
  routeTree: rootRoute.addChildren([indexRoute]),
  history: createMemoryHistory({ initialEntries: ["/"] }),
  defaultPreload: false,
  scrollRestoration: false,
});

function normalize(html: string) {
  const el = window.document.createElement("div");
  el.innerHTML = html;
  return (el.textContent ?? "").replace(/\s+/g, " ").trim();
}

const ssrText = normalize(window.__SSR_HTML__ ?? "");

try {
  createRoot(container).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
} catch (error) {
  errors.push(`RENDER THREW: ${(error as Error).message}`);
}

// first-paint snapshot: compared against the SSR markup to expose hydration
// mismatches (the live tick intervals start at 1400 ms+, so this is safe).
let firstPaintText = "";

const click = (label: string) => {
  const nodes = Array.from(window.document.querySelectorAll<HTMLElement>("button, a"));
  const target = nodes.find((n) => (n.textContent ?? "").toLowerCase().includes(label.toLowerCase()) && !n.hasAttribute("disabled"));
  if (!target) {
    errors.push(`CONTROL NOT FOUND: ${label}`);
    return;
  }
  try {
    target.click();
  } catch (error) {
    errors.push(`CLICK THREW (${label}): ${(error as Error).message}`);
  }
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function drive() {
  const dialogs: string[] = [];
  const record = (why: string) => {
    const overlays = window.document.querySelectorAll(".dx-overlay, .dx-drawer-overlay");
    const title = window.document.querySelector(".dx-dialog-title, .dx-drawer-title");
    dialogs.push(`${why}: overlay=${overlays.length} title=${title?.textContent?.trim().slice(0, 50) ?? "—"}`);
  };
  const controls = ["Connect to Deriv", "Watch Demo", "Features", "Pricing", "Community", "How it works", "Skip the tour", "Get started"];

  for (const label of controls) {
    click(label);
    await wait(150);
    record(label);
    window.document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await wait(150);
  }

  // deep drive: open the demo console and walk its tabs
  click("open the live console");
  await wait(300);
  record("console:open");
  for (const tab of ["Bots", "Portfolio", "Analytics", "Social", "Trade"]) {
    const tabNodes = Array.from(container.querySelectorAll<HTMLElement>("button"));
    const t = tabNodes.find((n) => (n.textContent ?? "").trim() === tab);
    t?.click();
    await wait(250);
  }
  record("console:tab-walk");

  const textDiff: string[] = [];
  const clientText = (container.textContent ?? "").replace(/\s+/g, " ").trim();
  if (ssrText && ssrText !== clientText) {
    textDiff.push(`ssr ${ssrText.length} chars vs client ${clientText.length} chars`);
    let offset = 0;
    let found = 0;
    while (found < 6 && offset < Math.min(ssrText.length, clientText.length)) {
      let i = offset;
      while (i < Math.min(ssrText.length, clientText.length) && ssrText[i] === clientText[i]) i++;
      if (i >= Math.min(ssrText.length, clientText.length)) break;
      textDiff.push(`diff @${i}: ssr "${ssrText.slice(i, i + 70)}" | client "${clientText.slice(i, i + 70)}"`);
      found++;
      offset = i + 40;
    }
  }

  // ---- fuzz phase: open each primary overlay, then click every control inside it
  const FUZZ = [
    "Connect to Deriv",
    "Watch Demo",
    "Skip the tour — open the live console",
    "Pricing",
    "Community",
    "Get started",
    "Browse 10 presets",
    "Backtest runner",
    "API status",
    "Help & FAQ",
    "About DerivX",
    "Changelog",
    "Sitemap (39 pages)",
    "Open full leaderboard",
    "Full story",
    "Explore Bot Builder",
    "Start step 1",
    "Book a walkthrough",
    "Contact support",
    "Log in",
  ];
  const fuzzLog: string[] = [];
  for (const label of FUZZ) {
    click(label);
    await wait(200);
    const panel = window.document.querySelector(".dx-dialog, .dx-drawer");
    if (!panel) {
      fuzzLog.push(`${label}: no panel`);
      continue;
    }
    const inner = Array.from(panel.querySelectorAll<HTMLElement>("button")).filter(
      (b) => !b.hasAttribute("disabled") && !b.classList.contains("dx-x-btn"),
    );
    let acted = 0;
    for (const btn of inner.slice(0, 14)) {
      const text = (btn.textContent ?? "").trim().slice(0, 24);
      try {
        btn.click();
      } catch (error) {
        errors.push(`FUZZ CLICK THREW (${label} → ${text}): ${(error as Error).message}`);
      }
      acted++;
      await wait(90);
      if (!window.document.querySelector(".dx-dialog, .dx-drawer")) break;
    }
    fuzzLog.push(`${label}: ${acted} controls driven, panel still open=${Boolean(window.document.querySelector(".dx-dialog, .dx-drawer"))}`);
    window.document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await wait(120);
  }

  const labels = Array.from(new Set(Array.from(window.document.querySelectorAll("button, a")).map((n) => (n.textContent ?? "").trim().slice(0, 32)).filter(Boolean)));
  window.__smokeResult = {
    ok: errors.length === 0,
    errors,
    dialogs: [...new Set(dialogs)],
    textDiff,
    controls: window.document.querySelectorAll("button, a").length,
    labels,
    fuzzLog,
  };
}

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    firstPaintText = (container.textContent ?? "").replace(/\s+/g, " ").trim();
    const firstDiff: string[] = [];
    if (ssrText && ssrText !== firstPaintText) {
      let i = 0;
      while (i < Math.min(ssrText.length, firstPaintText.length) && ssrText[i] === firstPaintText[i]) i++;
      firstDiff.push(`@${i}: ssr "${ssrText.slice(i, i + 90)}" | client "${firstPaintText.slice(i, i + 90)}"`);
    }
    window.__firstPaint = { same: ssrText === firstPaintText, firstDiff, ssrLen: ssrText.length, clientLen: firstPaintText.length };
  });
});

setTimeout(() => {
  drive().catch((error) => {
    errors.push(`DRIVE THREW: ${(error as Error).message}`);
    window.__smokeResult = { ok: false, errors, dialogs: [], textDiff: [], controls: 0 };
  });
}, 400);
