// smoke/run.mjs — hydrates tools/smoke/out/smoke.js into jsdom using the SSR
// markup served by the dev server, then reports every console error / warning.
// Usage: node tools/smoke/run.mjs [baseUrl]
import { readFile } from "node:fs/promises";
import { JSDOM, VirtualConsole } from "jsdom";

const base = process.argv[2] ?? "http://127.0.0.1:5173";

// ---- 1) module-graph guard ------------------------------------------------
// The TanStack router code splitter can break the dev pipeline itself (it once
// re-emitted its HMR scaffolding and every route module answered
// "500 Duplicate declaration hot", leaving the client bundle dead). Probe the
// modules the browser actually requests before doing anything else.
const MODULES = [
  "/src/routes/__root.tsx",
  "/src/routes/index.tsx",
  "/src/routes/home.tsx",
  "/src/router.tsx",
  "/src/components/marketing/LandingPage.tsx",
  "/src/styles/pages/home.scss",
  "/src/routes/features.tsx",
  "/src/components/marketing/FeaturesPage.tsx",
  "/src/styles/pages/features.scss",
  "/src/routes/auth/signup.tsx",
  "/src/components/auth/SignupPage.tsx",
  "/src/components/auth/SignupDialogs.tsx",
  "/src/components/auth/AuthShell.tsx",
  "/src/styles/pages/auth-signup.scss",
];
const moduleFailures = [];
for (const id of MODULES) {
  const res = await fetch(`${base}${id}`);
  const body = await res.text();
  const broken = /Internal server error|Plugin: tanstack|Duplicate declaration/.test(body.replace(/\/\/ .*/g, ""));
  if (res.status !== 200 || broken) {
    moduleFailures.push(`${id} → HTTP ${res.status}${broken ? " (transform error in body)" : ""}`);
  }
}

const html = await (await fetch(`${base}/`)).text();

// ---- 1b) theme guard: LIGHT IS THE DEFAULT --------------------------------
// The document shell must not hard-code data-bs-theme="dark" (that would make a
// first-time visitor land on the dark palette), must carry the pre-paint
// restore script, and the tokens layer must ship both palettes.
const themeFailures = [];
const htmlTag = html.match(/<html[^>]*>/)?.[0] ?? "";
if (/data-bs-theme="dark"/.test(htmlTag)) themeFailures.push(`document shell renders ${htmlTag} — light must be the default`);
if (!/localStorage\.getItem\("dx-theme"\)/.test(html)) themeFailures.push("pre-paint theme restore script missing from <head>");
const css = await (await fetch(`${base}/src/styles/global.scss?direct`)).text();
const lightAt = css.search(/--dx-bg:\s*#f5f7fb/);
// the CSS pipeline strips the quotes from the attribute selector → allow both
const darkAt = css.search(/\[\s*data-bs-theme=(?:"dark"|dark)\s*\]\s*\{[^}]*--dx-bg:\s*#070b14/);
if (lightAt < 0) themeFailures.push("light --dx-bg token missing from tokens.scss");
if (darkAt < 0) themeFailures.push("dark --dx-bg token missing from the [data-bs-theme=\"dark\"] block");
if (lightAt >= 0 && darkAt >= 0 && lightAt > darkAt) themeFailures.push("dark palette is declared before the light one — the default would flip");
const literalRules = (css.match(/^\s*(background|color|border[\w-]*):\s*(#[0-9a-f]{3,8}|rgba?\()/gim) ?? []).length;
if (literalRules > 0) themeFailures.push(`${literalRules} colour literal(s) outside the palette blocks — tokenise them`);
const start = html.indexOf('<div id="app-root">') + '<div id="app-root">'.length;
const end = html.lastIndexOf("</div><script");
const ssr = html.slice(start, end);

const messages = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (e) => messages.push(`[jsdomError] ${e.message}`));
virtualConsole.on("error", (...a) => messages.push(`[error] ${a.join(" ")}`));
virtualConsole.on("warn", (...a) => messages.push(`[warn] ${a.join(" ")}`));
virtualConsole.on("info", (...a) => messages.push(`[info] ${a.join(" ")}`));

const dom = new JSDOM(`<!doctype html><html><body><div id="app-root"></div></body></html>`, {
  url: base,
  pretendToBeVisual: true,
  runScripts: "outside-only",
  virtualConsole,
});

const { window } = dom;
window.__SSR_HTML__ = ssr;
// minimal browser APIs jsdom lacks that the page touches
window.matchMedia =
  window.matchMedia ??
  ((query) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false }));
window.Element.prototype.scrollIntoView = window.Element.prototype.scrollIntoView ?? function () {};
window.scrollTo = window.scrollTo ?? (() => {});
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
window.IntersectionObserver =
  window.IntersectionObserver ??
  class {
    constructor(cb) {
      this.cb = cb;
    }
    observe(el) {
      this.cb([{ isIntersecting: true, target: el, intersectionRatio: 1 }], this);
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };

const bundle = await readFile(new URL("./out/smoke.js", import.meta.url), "utf8");
try {
  window.eval(bundle);
} catch (error) {
  messages.push(`[bundle] ${error.message}`);
}

for (let i = 0; i < 400 && !window.__smokeResult; i++) await new Promise((r) => setTimeout(r, 250));
const result = window.__smokeResult ?? { ok: false, errors: ["smoke never reached the click phase"], dialogs: [], textDiff: [] };

const significant = messages.filter(
  (m) => !/Not implemented: |Could not parse CSS|jsdom does not|Error: Not implemented/.test(m),
);
if (moduleFailures.length) {
  console.log("MODULE GRAPH BROKEN:");
  for (const f of moduleFailures) console.log(" ✗", f);
} else {
  console.log(`module graph: ${MODULES.length}/${MODULES.length} dev modules served clean`);
}
if (themeFailures.length) {
  console.log("THEME GUARD BROKEN:");
  for (const f of themeFailures) console.log(" ✗", f);
} else {
  console.log("theme: light default + dark override present, pre-paint restore wired");
}
console.log(`console messages: ${significant.length}`);
for (const m of significant.slice(0, 40)) console.log(" •", m.slice(0, 400));
console.log(`\nclick-phase errors: ${result.errors.length}`);
for (const e of result.errors) console.log(" ✗", e.slice(0, 400));
console.log("\ntheme toggle:");
for (const l of result.themeLog ?? []) console.log("   ", l);
console.log(`\ndom: sections=${window.document.querySelectorAll(".dx-section").length} nav=${window.document.querySelectorAll(".dx-nav").length} controls=${result.controls}`);
console.log("overlay opens per control:");
for (const d of result.dialogs) console.log("   ", d);
if (result.fuzzLog) {
  console.log(`\nfuzz walk (${result.fuzzLog.length} overlays):`);
  for (const f of result.fuzzLog) console.log("   ", f);
}
if (result.featuresLog) {
  console.log(`\nfeatures walk (H-2 /features):`);
  for (const f of result.featuresLog) console.log("   ", f);
}
if (result.signupLog) {
  console.log(`\nsignup walk (A-1 /auth/signup):`);
  for (const f of result.signupLog) console.log("   ", f);
}
if (result.labels) {
  console.log(`\ncontrol labels (${result.labels.length}):`);
  console.log("   " + result.labels.join(" | ").slice(0, 3000));
}
const fp = window.__firstPaint;
console.log("\nhydration check (ssr markup vs first client paint):");
console.log("  ", fp ? (fp.same ? `identical (${fp.ssrLen} chars)` : `DIFFERENT — ${fp.firstDiff.join(" | ")}`) : "not captured");
console.log("ssr/csr text check:", result.textDiff.length ? result.textDiff.join("\n") : "identical");
process.exit(significant.length || result.errors.length || moduleFailures.length || themeFailures.length ? 1 : 0);
