// =============================================================================
// ROUTE: "/auth/reset-password" — A-5 Reset Password (blueprint heading).
// ?token carries the single-use reset token from the email link (A-4).
// See docs/MASTER_THEME.md §14 for the createFileRoute alias workaround;
// the page component stays a STATIC import.
// =============================================================================
import { createFileRoute as routeFactory } from "@tanstack/react-router";
import { ResetPasswordPage } from "../../components/auth/ResetPasswordPage";

function ResetRoute() {
  const { token } = Route.useSearch();
  return <ResetPasswordPage token={token} />;
}

export const Route = routeFactory("/auth/reset-password")({
  validateSearch: (search: Record<string, unknown>): { token?: string } => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  head: () => ({
    meta: [
      { title: "DerivX — Set new password | Reset password" },
      {
        name: "description",
        content:
          "A-5 reset password: set a new DerivX password from your single-use reset link. Completing the reset signs out every other session.",
      },
      { property: "og:title", content: "DerivX — Set new password" },
      { property: "og:description", content: "Min 8 characters, uppercase, digit and symbol — then back to sign in." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ResetRoute,
});
