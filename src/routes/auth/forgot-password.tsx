// =============================================================================
// ROUTE: "/auth/forgot-password" — A-4 Forgot Password (blueprint heading).
// See docs/MASTER_THEME.md §14 for the createFileRoute alias workaround;
// the page component stays a STATIC import.
// =============================================================================
import { createFileRoute as routeFactory } from "@tanstack/react-router";
import { ForgotPasswordPage } from "../../components/auth/ForgotPasswordPage";

export const Route = routeFactory("/auth/forgot-password")({
  head: () => ({
    meta: [
      { title: "DerivX — Reset your password | Forgot password" },
      {
        name: "description",
        content:
          "A-4 forgot password: request a single-use reset link (60-minute expiry, hashed at rest). Resetting revokes every other session.",
      },
      { property: "og:title", content: "DerivX — Reset your password" },
      { property: "og:description", content: "One link, one hour, one use." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ForgotPasswordPage,
});
