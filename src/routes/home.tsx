// =============================================================================
// ROUTE: "/home" — the H-1 landing page served on the ROUTE named in the build
// config (ROUTE = /home). Same component tree and stylesheet as "/".
// =============================================================================
import { createFileRoute as routeFactory, lazyRouteComponent } from "@tanstack/react-router";
import "../styles/pages/home.scss";

// -----------------------------------------------------------------------------
// DEV-SERVER WORKAROUND (see docs/MASTER_THEME.md §14)
// The router plugin's auto code splitter matches a route file with the regex
// /\bcreateFileRoute\s*\(/ and re-emits its Vite HMR scaffolding. Under Vite 8
// that transform runs twice on these modules and the second pass hits the first
// pass's `const hot = import.meta.hot`, so the dev server answers
// "500 Duplicate declaration \"hot\"" and the client bundle never loads.
// Importing the factory under a local name keeps this file out of that filter.
// Route-level code splitting is declared by hand below (lazyRouteComponent).
// -----------------------------------------------------------------------------

const LandingPage = lazyRouteComponent(
  () => import("../components/marketing/LandingPage"),
  "LandingPage",
);

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
});
