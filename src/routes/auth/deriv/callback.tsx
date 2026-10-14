// =============================================================================
// ROUTE: "/auth/deriv/callback" — A-3 Deriv OAuth Callback (blueprint heading).
// Search params mirror the real OAuth return leg (?code & ?state, or ?error
// when Deriv reports a denial). See MASTER_THEME §14 for the createFileRoute
// alias workaround; the page component stays a STATIC import.
// =============================================================================
import { createFileRoute as routeFactory } from "@tanstack/react-router";
import { DerivCallbackPage } from "../../../components/auth/DerivCallbackPage";

function CallbackRoute() {
  const { code, error } = Route.useSearch();
  return <DerivCallbackPage code={code} error={error} />;
}

export const Route = routeFactory("/auth/deriv/callback")({
  validateSearch: (search: Record<string, unknown>): { code?: string; state?: string; error?: string } => ({
    code: typeof search.code === "string" ? search.code : undefined,
    state: typeof search.state === "string" ? search.state : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  head: () => ({
    meta: [
      { title: "DerivX — Connecting to Deriv | OAuth callback" },
      {
        name: "description",
        content:
          "A-3 Deriv OAuth callback: the authorization code is exchanged, a WebSocket authorize handshake runs, and the Deriv account is linked to DerivX with an encrypted token.",
      },
      { property: "og:title", content: "DerivX — Connecting to Deriv" },
      { property: "og:description", content: "OAuth2 return leg — code in, encrypted connection out." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: CallbackRoute,
});
