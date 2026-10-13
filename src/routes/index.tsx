// =============================================================================
// ROUTE: "/" — H-1 Landing Page (blueprint heading). Also served on /home.
// The page-scoped stylesheet is imported HERE ONLY, so it code-splits with the
// landing route chunk (injected on enter, removed on leave).
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

export const Route = routeFactory("/")({
  head: () => ({
    meta: [
      { title: "DerivX — Trade Smarter on Deriv | Automate bots, scripts & copy trading" },
      {
        name: "description",
        content:
          "Connect your Deriv account with OAuth2, automate Rise/Fall, Digits, Touch, Accumulator and Multiplier contracts, and follow verified traders. 20 symbols, 11 contract types, 12 ms tick relay.",
      },
      { property: "og:title", content: "DerivX — Trade Smarter on Deriv" },
      { property: "og:description", content: "Automate strategies. Build bots. Monitor the crowd." },
      { property: "og:type", content: "website" },
    ],
  }),
});
