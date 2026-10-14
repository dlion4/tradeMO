// =============================================================================
// ROUTE: "/auth/signin" — A-2 Sign In (blueprint heading).
// See docs/MASTER_THEME.md §14 for the createFileRoute alias workaround —
// the page component must stay a STATIC import (dev SSR does not await lazy
// route components, which ships an empty body).
// =============================================================================
import { createFileRoute as routeFactory } from "@tanstack/react-router";
import { SigninPage } from "../../components/auth/SigninPage";

export const Route = routeFactory("/auth/signin")({
  head: () => ({
    meta: [
      { title: "DerivX — Sign in | Welcome back" },
      {
        name: "description",
        content:
          "A-2 sign in: email and password for DerivX (not Deriv), Google, or Deriv OAuth2. Accounts with two-factor continue to the 2FA challenge; bots keep running under your saved risk caps.",
      },
      { property: "og:title", content: "DerivX — Sign in" },
      { property: "og:description", content: "Welcome back. Reconnect any Deriv account in two clicks." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: SigninPage,
});
