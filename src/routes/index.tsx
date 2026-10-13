// =============================================================================
// ROUTE: "/" — H-1 Landing Page (blueprint heading). Also served on /home.
// The page-scoped stylesheet is imported HERE ONLY, so it code-splits with the
// landing route chunk (injected on enter, removed on leave).
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
  component: LandingPage,
});
