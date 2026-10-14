// smoke/entry.tsx — client-renders the landing page through a memory router in
// a DOM pre-filled with the SSR markup (shell stripped), then drives every
// primary control. Uncaught errors, React warnings and SSR/CSR text differences
// are reported back through window.__smokeResult.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Outlet, RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { LandingPage } from "../../src/components/marketing/LandingPage";
import { FeaturesPage } from "../../src/components/marketing/FeaturesPage";
import { SignupPage } from "../../src/components/auth/SignupPage";
import { SigninPage } from "../../src/components/auth/SigninPage";
import { DerivCallbackPage } from "../../src/components/auth/DerivCallbackPage";
import { ForgotPasswordPage } from "../../src/components/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "../../src/components/auth/ResetPasswordPage";
import { VerifyEmailPage } from "../../src/components/auth/VerifyEmailPage";
import { TwoFactorPage } from "../../src/components/auth/TwoFactorPage";
import DashboardPage from "../../src/components/dashboard/DashboardPage";
import MarketsPage from "../../src/components/dashboard/MarketsPage";
import TradePage from "../../src/components/dashboard/TradePage";
import { BOTS } from "../../src/data/trading";
import { ToastProvider } from "../../src/components/ui/primitives";

interface SmokeResult {
  ok: boolean;
  errors: string[];
  dialogs: string[];
  textDiff: string[];
  controls: number;
  labels?: string[];
  fuzzLog?: string[];
  themeLog?: string[];
  featuresLog?: string[];
  signupLog?: string[];
  authLog?: string[];
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
const featuresRoute = createRoute({ getParentRoute: () => rootRoute, path: "/features", component: FeaturesPage });
const signupRoute = createRoute({ getParentRoute: () => rootRoute, path: "/auth/signup", component: SignupPage });
const signinRoute = createRoute({ getParentRoute: () => rootRoute, path: "/auth/signin", component: SigninPage });
const callbackRoute = createRoute({ getParentRoute: () => rootRoute, path: "/auth/deriv/callback", component: () => <DerivCallbackPage /> });
const forgotRoute = createRoute({ getParentRoute: () => rootRoute, path: "/auth/forgot-password", component: ForgotPasswordPage });
const resetRoute = createRoute({ getParentRoute: () => rootRoute, path: "/auth/reset-password", component: () => <ResetPasswordPage /> });
const verifyRoute = createRoute({ getParentRoute: () => rootRoute, path: "/auth/verify-email", component: () => <VerifyEmailPage /> });
const twoFactorRoute = createRoute({ getParentRoute: () => rootRoute, path: "/auth/2fa", component: () => <TwoFactorPage /> });
const dashboardRoute = createRoute({ getParentRoute: () => rootRoute, path: "/dashboard", component: DashboardPage });
const marketsRoute = createRoute({ getParentRoute: () => rootRoute, path: "/dashboard/markets", component: () => <MarketsPage /> });
const tradeRoute = createRoute({ getParentRoute: () => rootRoute, path: "/dashboard/trade", component: TradePage });
const router = createRouter({
  routeTree: rootRoute.addChildren([indexRoute, featuresRoute, signupRoute, signinRoute, callbackRoute, forgotRoute, resetRoute, verifyRoute, twoFactorRoute, dashboardRoute, marketsRoute, tradeRoute]),
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

  // Auth CTAs are real routes now (nav Log in → /auth/signin, Get started →
  // /auth/signup): if a click left the landing page, walk back before driving on.
  const backHomeIfAuth = async () => {
    if (window.document.querySelector(".page-auth-signin, .page-auth-signup, .page-auth-2fa, .page-auth-forgot, .page-auth-reset, .page-auth-verify, .page-auth-callback")) {
      await router.navigate({ to: "/" });
      await wait(350);
    }
  };

  for (const label of controls) {
    click(label);
    await wait(150);
    record(label);
    window.document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await wait(150);
    // "Features" is a real route since H-2: the click navigates to /features,
    // so return home before driving the remaining landing controls.
    if (label === "Features") {
      click("Home");
      await wait(300);
    }
    if (label === "Get started") {
      const onSignup = Boolean(window.document.querySelector(".page-auth-signup"));
      dialogs.push(`Get started: navigated to /auth/signup = ${onSignup}`);
      if (!onSignup) errors.push("NAV: Get started did not reach /auth/signup");
    }
    await backHomeIfAuth();
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
    "Sitemap (36 pages)",
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
      // No panel may be correct: Log in / Get started are real route links now.
      const onAuth = Boolean(window.document.querySelector(".page-auth-signin, .page-auth-signup"));
      fuzzLog.push(`${label}: no panel${onAuth ? " (navigated to auth route)" : ""}`);
      await backHomeIfAuth();
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
    // Inner controls can navigate too (e.g. sitemap "open" links) — walk back.
    await backHomeIfAuth();
  }

  // ---- H-2 features phase: navigate to /features and open its signature overlays
  const featuresLog: string[] = [];
  click("Features");
  await wait(400);
  for (const label of ["Configure your first bot", "Open script studio", "New automation rule", "Full leaderboard"]) {
    click(label);
    await wait(250);
    const panel = window.document.querySelector(".dx-dialog, .dx-drawer");
    const title = panel?.querySelector(".dx-dialog-title")?.textContent?.trim().slice(0, 44) ?? "drawer";
    featuresLog.push(`${label}: ${panel ? `panel "${title}"` : "NO PANEL"}`);
    if (!panel) errors.push(`FEATURES CONTROL DEAD: ${label}`);
    window.document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await wait(150);
  }
  const cmpRow = Array.from(window.document.querySelectorAll<HTMLElement>("tr")).find((n) =>
    (n.textContent ?? "").includes("JavaScript strategy engine"),
  );
  cmpRow?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await wait(250);
  const cmpPanel = window.document.querySelector(".dx-dialog, .dx-drawer");
  featuresLog.push(`comparison row click: ${cmpPanel ? `panel "${cmpPanel.querySelector(".dx-dialog-title")?.textContent?.trim().slice(0, 44) ?? "drawer"}"` : "NO PANEL"}`);
  if (!cmpPanel) errors.push("FEATURES CONTROL DEAD: comparison row");
  window.document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await wait(150);
  click("Home");
  await wait(350);

  // ---- A-1 signup phase: navigate to /auth/signup and open its overlays -----
  const signupLog: string[] = [];
  await router.navigate({ to: "/auth/signup" });
  await wait(400);
  const signupRoot = window.document.querySelector(".page-auth-signup");
  signupLog.push(`route render: ${signupRoot ? ".page-auth-signup mounted" : "MISSING"}`);
  if (!signupRoot) errors.push("SIGNUP: .page-auth-signup did not render at /auth/signup");
  for (const label of ["Google", "Change"]) {
    click(label);
    await wait(250);
    const panel = window.document.querySelector(".dx-dialog, .dx-drawer");
    const title = panel?.querySelector(".dx-dialog-title, .dx-drawer-title")?.textContent?.trim().slice(0, 44) ?? "—";
    signupLog.push(`${label}: ${panel ? `panel "${title}"` : "NO PANEL"}`);
    if (!panel) errors.push(`SIGNUP CONTROL DEAD: ${label}`);
    window.document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await wait(150);
  }
  // "Sign In →" is a real route link since A-2 shipped: assert the navigation.
  click("Sign In");
  await wait(400);
  const landedSignin = Boolean(window.document.querySelector(".page-auth-signin"));
  signupLog.push(`Sign In →: ${landedSignin ? "navigated to /auth/signin" : "DID NOT NAVIGATE"}`);
  if (!landedSignin) errors.push("SIGNUP: Sign In link did not reach /auth/signin");
  await router.navigate({ to: "/auth/signup" });
  await wait(350);

  // ---- A-2…A-7 auth family phase -------------------------------------------
  const authLog: string[] = [];
  const expectPanel = async (label: string) => {
    await wait(250);
    const panel = window.document.querySelector(".dx-dialog, .dx-drawer");
    const title = panel?.querySelector(".dx-dialog-title, .dx-drawer-title")?.textContent?.trim().slice(0, 44) ?? "—";
    authLog.push(`${label}: ${panel ? `panel "${title}"` : "NO PANEL"}`);
    if (!panel) errors.push(`AUTH CONTROL DEAD: ${label}`);
    window.document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await wait(150);
  };
  const visitAuth = async (to: string, rootClass: string, label: string) => {
    await router.navigate({ to: to as never });
    await wait(400);
    const root = window.document.querySelector(rootClass);
    authLog.push(`${label}: ${root ? `${rootClass} rendered` : "MISSING"}`);
    if (!root) errors.push(`AUTH: ${rootClass} did not render at ${to}`);
  };
  const clickExact = (text: string) => {
    const nodes = Array.from(window.document.querySelectorAll<HTMLElement>("button, a"));
    const target = nodes.find((n) => (n.textContent ?? "").trim() === text && !n.hasAttribute("disabled"));
    if (!target) {
      errors.push(`CONTROL NOT FOUND (exact): ${text}`);
      return;
    }
    target.click();
  };
  await visitAuth("/auth/signin", ".page-auth-signin", "A-2 signin");
  clickExact("Google");
  await expectPanel("A-2 Google chooser");
  click("Use a demo account");
  await wait(250);
  const demoPanel = window.document.querySelector("#dx-demo-accounts");
  const pwField = () => window.document.querySelector<HTMLInputElement>('input[autocomplete="current-password"]');
  authLog.push(`A-2 demo panel: visible=${Boolean(demoPanel)} password prefilled=${(pwField()?.value ?? "") === "Rise$2024"}`);
  if (!demoPanel) errors.push("AUTH: demo accounts panel did not open on /auth/signin");
  if ((pwField()?.value ?? "") !== "Rise$2024") errors.push("AUTH: demo autofill did not prefill the password field");
  click("brian@derivx.app");
  await wait(200);
  authLog.push(`A-2 demo switch: email input=${(window.document.querySelector('input[type="email"]') as HTMLInputElement | null)?.value ?? "?"} password=${pwField()?.value ?? "?"}`);
  if ((pwField()?.value ?? "") !== "Fall#7788") errors.push("AUTH: switching demo account did not refill the password field");
  click("trader@derivx.app");
  await wait(200);
  authLog.push(`A-2 demo autofill: email input=${(window.document.querySelector('input[type="email"]') as HTMLInputElement | null)?.value ?? "?"}`);
  // full sign-in with the no-2FA demo account; the success panel's primary
  // CTA ("Open dashboard") must land on the real D-1 page
  click("brian@derivx.app");
  await wait(200);
  clickExact("Sign In");
  await wait(1400);
  clickExact("Open dashboard");
  await wait(450);
  const onDashA2 = Boolean(window.document.querySelector(".page-dashboard"));
  authLog.push(`A-2 sign-in → Open dashboard: /dashboard rendered=${onDashA2}`);
  if (!onDashA2) errors.push("AUTH: A-2 Open dashboard did not reach D-1 /dashboard");
  await visitAuth("/auth/deriv/callback", ".page-auth-callback", "A-3 callback");
  await wait(5200);
  authLog.push(`A-3 exchange: success card=${window.document.body.textContent?.includes("Deriv account connected") ?? false}`);
  click("Manage connections");
  await expectPanel("A-3 connections");
  clickExact("Open dashboard");
  await wait(450);
  const onDashA3 = Boolean(window.document.querySelector(".page-dashboard"));
  authLog.push(`A-3 → Open dashboard: /dashboard rendered=${onDashA3}`);
  if (!onDashA3) errors.push("AUTH: A-3 Open dashboard did not reach D-1 /dashboard");
  await visitAuth("/auth/forgot-password", ".page-auth-forgot", "A-4 forgot");
  click("Help & FAQ");
  await expectPanel("A-4 FAQ");
  await visitAuth("/auth/reset-password", ".page-auth-reset", "A-5 reset");
  click("Open demo inbox");
  await expectPanel("A-5 inbox");
  await visitAuth("/auth/verify-email", ".page-auth-verify", "A-6 verify");
  click("Open demo inbox");
  await expectPanel("A-6 inbox");
  await visitAuth("/auth/2fa", ".page-auth-2fa", "A-7 2fa");
  click("More help");
  await expectPanel("A-7 trouble dialog");
  click("Use backup code");
  await wait(200);
  authLog.push(`A-7 backup mode: verify button=${Array.from(window.document.querySelectorAll("button")).some((b) => (b.textContent ?? "").includes("Verify Backup Code"))}`);

  // ---- D-1/D-2 dashboard phase ----------------------------------------------
  const dashLog: string[] = [];
  const BUILT_HREFS = new Set(["/", "/features", "/auth/signup", "/auth/signin", "/auth/deriv/callback", "/auth/forgot-password", "/auth/reset-password", "/auth/verify-email", "/auth/2fa", "/dashboard", "/dashboard/markets", "/dashboard/trade"]);
  const auditLinks = (label: string) => {
    const bad = Array.from(window.document.querySelectorAll<HTMLAnchorElement>("a[href]"))
      .map((a) => a.getAttribute("href") ?? "")
      .filter((h) => h.startsWith("/") && !BUILT_HREFS.has(h.split("?")[0]));
    dashLog.push(`${label}: illegal hrefs=${bad.length}${bad.length ? ` (${[...new Set(bad)].join(", ")})` : ""}`);
    if (bad.length) errors.push(`DASH LINKS (${label}): ${[...new Set(bad)].join(", ")}`);
  };
  const expectDashPanel = async (label: string) => {
    await wait(250);
    const panel = window.document.querySelector(".dx-dialog, .dx-drawer");
    const title = panel?.querySelector(".dx-dialog-title")?.textContent?.trim().slice(0, 44) ?? "drawer";
    dashLog.push(`${label}: ${panel ? `panel "${title}"` : "NO PANEL"}`);
    if (!panel) errors.push(`DASH CONTROL DEAD: ${label}`);
    window.document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await wait(150);
  };
  const visitDash = async (to: string, rootClass: string, label: string) => {
    await router.navigate({ to: to as never });
    await wait(400);
    const root = window.document.querySelector(rootClass);
    dashLog.push(`${label}: ${root ? `${rootClass} rendered` : "MISSING"}`);
    if (!root) errors.push(`DASH: ${rootClass} did not render at ${to}`);
  };

  await visitDash("/dashboard", ".page-dashboard", "D-1 dashboard");
  auditLinks("D-1");
  // shell topbar: notifications drawer, account switcher, user menu
  const bell = window.document.querySelector<HTMLButtonElement>('button[aria-label^="Notifications"]');
  bell?.click();
  await expectDashPanel("shell notifications drawer");
  const switcherBtn = window.document.querySelector<HTMLButtonElement>('button[aria-label="Switch Deriv account"]');
  switcherBtn?.click();
  await expectDashPanel("shell account switcher");
  clickExact("AO Amara");
  await wait(200);
  const menu = window.document.querySelector(".dx-dd-menu");
  dashLog.push(`shell user menu: ${menu ? "opened" : "MISSING"}`);
  if (!menu) errors.push("DASH: user dropdown menu did not open");
  window.document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await wait(120);
  clickExact("Read my dashboard");
  await expectDashPanel("D-1 voice overview");
  clickExact("Shortcuts");
  await expectDashPanel("D-1 shortcuts");
  click(`All bots (${BOTS.length})`);
  await expectDashPanel("D-1 fleet dialog");
  clickExact("Open feed");
  await expectDashPanel("D-1 community");
  click("Buy Rise");
  await expectDashPanel("D-1 quick-trade ticket");
  // a trades-table row opens the contract detail drawer
  const tradeRow = Array.from(window.document.querySelectorAll<HTMLElement>("tbody tr")).find((n) => (n.textContent ?? "").includes("R_"));
  tradeRow?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await expectDashPanel("D-1 trade row detail");
  // keyboard shortcut g→m lands on Markets
  window.document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "g", bubbles: true }));
  await wait(120);
  window.document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "m", bubbles: true }));
  await wait(450);
  const onMarkets = Boolean(window.document.querySelector(".page-markets"));
  dashLog.push(`D-1 shortcut g+m: on /dashboard/markets = ${onMarkets}`);
  if (!onMarkets) errors.push("DASH: g+m shortcut did not reach /dashboard/markets");

  auditLinks("D-2 (via shortcut)");
  clickExact("Economic calendar");
  await expectDashPanel("D-2 econ calendar");
  clickExact("Heatmap");
  await wait(250);
  const tiles = window.document.querySelectorAll(".dx-mk-tile").length;
  dashLog.push(`D-2 heatmap: ${tiles} tiles`);
  if (tiles === 0) errors.push("DASH: heatmap rendered no tiles");
  clickExact("Movers");
  await wait(250);
  clickExact("Grid");
  await wait(250);
  // scoped: the sidebar now also has a "Trade" link (D-3) — hit the card's button
  const cardTradeBtn = Array.from(window.document.querySelectorAll<HTMLElement>(".page-markets button")).find((n) => (n.textContent ?? "").trim() === "Trade" && !n.hasAttribute("disabled"));
  if (!cardTradeBtn) errors.push("CONTROL NOT FOUND: D-2 grid Trade button");
  cardTradeBtn?.click();
  await expectDashPanel("D-2 card trade ticket");
  click(`Watchlists (`);
  await expectDashPanel("D-2 watchlists drawer");
  await visitDash("/dashboard/markets", ".page-markets", "D-2 markets (direct)");
  auditLinks("D-2 (direct)");

  // ---- D-3 trade page --------------------------------------------------------
  await visitDash("/dashboard/trade", ".page-trade", "D-3 trade");
  auditLinks("D-3");
  click("Indicators (");
  await expectDashPanel("D-3 indicators dialog");
  // full buy flow: order panel -> proposal -> confirm -> receipt -> track
  click("Buy Rise");
  await wait(300);
  click("Confirm buy");
  await wait(1400);
  const receiptPanel = window.document.querySelector(".dx-dialog");
  dashLog.push(`D-3 buy flow: panel after confirm=${receiptPanel ? `"${receiptPanel.querySelector(".dx-dialog-title")?.textContent?.trim().slice(0, 30) ?? ""}"` : "MISSING"}`);
  if (!receiptPanel) errors.push("DASH: D-3 buy flow did not reach the receipt dialog");
  clickExact("Track in open contracts");
  await wait(350);
  clickExact("Multi-leg builder");
  await expectDashPanel("D-3 multi-leg builder");
  click("Symbol list");
  await expectDashPanel("D-3 symbol drawer");
  click("Pause feed");
  await wait(250);
  const pausedOverlay = Boolean(window.document.querySelector(".dx-chart-paused"));
  dashLog.push(`D-3 feed pause: overlay=${pausedOverlay}`);
  if (!pausedOverlay) errors.push("DASH: D-3 pause feed did not show the paused overlay");
  click("Resume feed");
  await wait(200);

  // ---- theme toggle round-trip ---------------------------------------------
  // Light is the default, so the toggle must move <html> light → dark → light
  // and persist the choice under localStorage("dx-theme").
  const themeLog: string[] = [];
  const themeBtn = () =>
    window.document.querySelector<HTMLButtonElement>('button[aria-label^="Switch to"][data-dx-theme-state]');
  try {
    if (!themeBtn()) {
      themeLog.push("toggle missing");
      errors.push("THEME: no theme toggle rendered in the marketing shell");
    } else {
      const root = window.document.documentElement;
      const before = root.getAttribute("data-bs-theme");
      themeBtn()!.click();
      await wait(80);
      const dark = root.getAttribute("data-bs-theme");
      const stored = window.localStorage.getItem("dx-theme");
      themeLog.push(`click 1: data-bs-theme ${before ?? "(none)"} → ${dark}, localStorage dx-theme=${stored}`);
      if (dark !== "dark") errors.push(`THEME: first click left data-bs-theme=${dark ?? "(none)"}, expected dark`);
      if (stored !== "dark") errors.push(`THEME: first click did not persist dx-theme=dark (got ${stored})`);
      themeBtn()!.click();
      await wait(80);
      const light = root.getAttribute("data-bs-theme");
      themeLog.push(`click 2: data-bs-theme → ${light ?? "(none)"}, localStorage dx-theme=${window.localStorage.getItem("dx-theme")}`);
      if (light !== null) errors.push(`THEME: second click left data-bs-theme=${light}, expected it removed (light default)`);
      if (window.localStorage.getItem("dx-theme") !== "light")
        errors.push("THEME: second click did not persist dx-theme=light");
    }
  } catch (error) {
    errors.push(`THEME THREW: ${(error as Error).message}`);
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
    themeLog,
    featuresLog,
    signupLog,
    authLog,
    dashLog,
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
