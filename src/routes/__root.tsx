// =============================================================================
// __root.tsx — document shell + global style layer (Bootstrap 5.3, then tokens).
// Page-scoped styles are imported by the individual route modules.
// =============================================================================
import { createRootRoute as rootFactory, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import type { ReactNode } from "react";
import bootstrapCss from "bootstrap/dist/css/bootstrap.min.css?url";
import globalCss from "../styles/global.scss?url";
import { ToastProvider } from "../components/ui/primitives";

// -----------------------------------------------------------------------------
// DEV-SERVER WORKAROUND (see docs/MASTER_THEME.md §14)
// The router plugin's auto code splitter matches a route file with the regex
// /\bcreateFileRoute\s*\(/ and re-emits its Vite HMR scaffolding. Under Vite 8
// that transform runs twice over the same module, so the second pass collides
// with the first pass's module-scope `const hot = import.meta.hot`: the dev
// server answers `500 Duplicate declaration "hot"` for every route module and
// the client bundle never loads. Importing the factory under a local name keeps
// this file out of that filter. Page components must stay STATIC imports — a
// lazily imported route component is not awaited by the dev SSR stream, which
// then ships an empty body.
// -----------------------------------------------------------------------------
export const Route = rootFactory({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "DerivX — Trade Smarter on Deriv" },
      {
        name: "description",
        content:
          "DerivX automates Deriv trading: bots, a sandboxed script engine, copy trading and pooled investor tools on top of Deriv's public WebSocket API.",
      },
      { name: "color-scheme", content: "dark" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: bootstrapCss },
      { rel: "stylesheet", href: globalCss },
    ],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-bs-theme="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        <div id="app-root">{children}</div>
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <ToastProvider>
      <Outlet />
    </ToastProvider>
  );
}
