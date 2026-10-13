// =============================================================================
// __root.tsx — document shell + global style layer (Bootstrap 5.3, then tokens).
// Page-scoped styles are imported by the individual route modules.
// =============================================================================
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import type { ReactNode } from "react";
import bootstrapCss from "bootstrap/dist/css/bootstrap.min.css?url";
import globalCss from "../styles/global.scss?url";
import { ToastProvider } from "../components/ui/primitives";

export const Route = createRootRoute({
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
