// =============================================================================
// ROUTE: "/home" — the H-1 landing page served on the ROUTE given in the build
// config (ROUTE = /home). Identical component tree and page-scoped styles as "/".
// =============================================================================
import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import "../styles/pages/home.scss";

// Route-level code split written by hand: the plugin's automatic splitting
// emits a TSRSplitComponent binding that Vite 8's dev module runner cannot
// resolve in the SSR environment, so the chunk boundary is declared here.
const LandingPage = lazyRouteComponent(() => import("../components/marketing/LandingPage"), "LandingPage");

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "DerivX — Landing page | Live ticker, bots, copy trading" },
      {
        name: "description",
        content:
          "H-1 landing page on /home: live tick ticker, 19 covered symbols, strategy presets, backtests, leaderboard and an interactive paper-trading console.",
      },
    ],
  }),
});

Route.update({ component: LandingPage });
