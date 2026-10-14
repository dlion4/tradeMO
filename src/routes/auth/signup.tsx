// =============================================================================
// ROUTE: "/auth/signup" — A-1 Sign Up (blueprint heading).
// The page-scoped stylesheet is imported HERE ONLY, so it code-splits with the
// signup route chunk (injected on enter, removed on leave).
// =============================================================================
import { createFileRoute as routeFactory } from "@tanstack/react-router";
import { SignupPage } from "../../components/auth/SignupPage";
import "../../styles/pages/auth-signup.scss";

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

export const Route = routeFactory("/auth/signup")({
  head: () => ({
    meta: [
      { title: "DerivX — Create your account | Sign up free, link Deriv after" },
      {
        name: "description",
        content:
          "A-1 sign up: create a DerivX account with email and password, verify your email, choose a starter bot preset (R_10, R_25, frxEURUSD, cryBTCUSD) and set risk caps — then link Deriv over OAuth2. Free tier, no card required.",
      },
      { property: "og:title", content: "DerivX — Create your account" },
      { property: "og:description", content: "Join 18,420 automated traders on Deriv. Virtual first, real when ready." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: SignupPage,
});
