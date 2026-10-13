// =============================================================================
// ROUTE: "/" — H-1 Landing Page (blueprint heading). Served on / and /home.
// The page-scoped stylesheet is imported HERE ONLY, so it code-splits with the
// landing route chunk (injected on enter, removed on leave).
//
// NOTE: the route component is attached via Route.update() instead of the
// `component:` option of the createFileRoute() call. The router plugin's dev
// code-splitter (Vite 8 module runner) otherwise rewrites `component` into a
// TSRSplitComponent binding that is not emitted for the SSR environment.
// =============================================================================
import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import "../styles/pages/home.scss";

// Route-level code split written by hand: the plugin's automatic splitting
// emits a TSRSplitComponent binding that Vite 8's dev module runner cannot
// resolve in the SSR environment, so the chunk boundary is declared here.
const LandingPage = lazyRouteComponent(() => import("../components/marketing/LandingPage"), "LandingPage");

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DerivX — Trade Smarter on Deriv | Automate bots, scripts & copy trading" },
      {
        name: "description",
        content:
          "Connect your Deriv account with OAuth2, automate Rise/Fall, Digits, Touch, Accumulator and Multiplier contracts, and follow verified traders. 19 symbols, 11 contract types, 12 ms tick relay.",
      },
      { property: "og:title", content: "DerivX — Trade Smarter on Deriv" },
      { property: "og:description", content: "Automate strategies. Build bots. Monitor the crowd." },
      { property: "og:type", content: "website" },
    ],
  }),
});

Route.update({ component: LandingPage });
