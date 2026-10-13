// =============================================================================
// ROUTE: "/home" — the H-1 landing page served on the ROUTE named in the build
// config (ROUTE = /home). Same component tree and stylesheet as "/".
// =============================================================================
import { createFileRoute as routeFactory } from "@tanstack/react-router";
import { LandingPage } from "../components/marketing/LandingPage";
import "../styles/pages/home.scss";

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

export const Route = routeFactory("/home")({
  head: () => ({
    meta: [
      { title: "DerivX — Landing page | Live ticker, bots and copy trading" },
      {
        name: "description",
        content:
          "H-1 landing page on /home: live tick stream, 20 covered symbols, strategy presets, backtests, leaderboard and an interactive paper-trading console.",
      },
    ],
  }),
  component: LandingPage,
});
