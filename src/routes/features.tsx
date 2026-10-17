// =============================================================================
// ROUTE: "/features" — H-2 Features Page (blueprint heading).
// The page-scoped stylesheet is imported HERE ONLY, so it code-splits with the
// features route chunk (injected on enter, removed on leave).
// =============================================================================
import { createFileRoute as routeFactory } from "@tanstack/react-router";
import { FeaturesPage } from "../components/marketing/FeaturesPage";
import "../styles/pages/features.scss";

// -----------------------------------------------------------------------------
// DEV-SERVER WORKAROUND — read docs/MASTER_THEME.md §14 before editing.
// The router plugin's code splitter matches a route file with the regex
// /\bcreateFileRoute\s*\(/ and re-emits its Vite HMR scaffolding. Under Vite 8
// that transform runs twice over the same module, so the second pass collides
// with the first pass's module-scope `const hot = import.meta.hot`: the dev
// server answers `500 Duplicate declaration "hot"` for every route module and
// the client bundle never loads. Importing the factory under a local name keeps
// this file out of that filter. The route id/path still come from the file name
// via routeTree.gen.ts, and the page component must stay a STATIC import —
// a lazily imported route component is not awaited by the dev SSR stream, which
// ships an empty body.
// -----------------------------------------------------------------------------

export const Route = routeFactory("/features")({
  head: () => ({
    meta: [
      { title: "DerivX — Features | Bot engine, script engine, social trading, automation" },
      {
        name: "description",
        content:
          "H-2 features deep dive: pre-built Deriv bots with backtesting, a sandboxed JavaScript script engine, verified copy trading, schedule/trigger/risk automation, 20 symbols and 11 contract types, plus a DerivX vs Deriv Native vs BMX Bot comparison.",
      },
      { property: "og:title", content: "DerivX — Everything you need to trade on autopilot" },
      { property: "og:description", content: "Bot engine, script engine, social trading, automation and full Deriv market coverage." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: FeaturesPage,
});
