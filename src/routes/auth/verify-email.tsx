// =============================================================================
// ROUTE: "/auth/verify-email" — A-6 Email Verification (blueprint heading).
// ?token carries the verification token from the email link.
// See docs/MASTER_THEME.md §14 for the createFileRoute alias workaround;
// the page component stays a STATIC import.
// =============================================================================
import { createFileRoute as routeFactory } from "@tanstack/react-router";
import { VerifyEmailPage } from "../../components/auth/VerifyEmailPage";

function VerifyRoute() {
  const { token } = Route.useSearch();
  return <VerifyEmailPage token={token} />;
}

export const Route = routeFactory("/auth/verify-email")({
  validateSearch: (search: Record<string, unknown>): { token?: string } => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  head: () => ({
    meta: [
      { title: "DerivX — Verify your email" },
      {
        name: "description",
        content:
          "A-6 email verification: confirm your address from the email link or 6-digit code, resend with a 1-per-minute rate limit, then connect Deriv.",
      },
      { property: "og:title", content: "DerivX — Verify your email" },
      { property: "og:description", content: "One click proves the mailbox is yours." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: VerifyRoute,
});
