// =============================================================================
// ROUTE: "/auth/2fa" — A-7 Two-Factor Authentication (blueprint heading).
// ?email identifies the account mid-sign-in (set by A-2's 2FA branch).
// See docs/MASTER_THEME.md §14 for the createFileRoute alias workaround;
// the page component stays a STATIC import.
// =============================================================================
import { createFileRoute as routeFactory } from "@tanstack/react-router";
import { TwoFactorPage } from "../../components/auth/TwoFactorPage";

function TwoFactorRoute() {
  const { email } = Route.useSearch();
  return <TwoFactorPage email={email} />;
}

export const Route = routeFactory("/auth/2fa")({
  validateSearch: (search: Record<string, unknown>): { email?: string } => ({
    email: typeof search.email === "string" ? search.email : undefined,
  }),
  head: () => ({
    meta: [
      { title: "DerivX — Two-factor authentication" },
      {
        name: "description",
        content:
          "A-7 two-factor challenge: enter the 6-digit authenticator code or a one-time backup code. Rate limited to 5 attempts per 5 minutes.",
      },
      { property: "og:title", content: "DerivX — Two-factor authentication" },
      { property: "og:description", content: "Second factor for a live sign-in." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: TwoFactorRoute,
});
