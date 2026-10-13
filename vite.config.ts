import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    // The sandbox proxies the dev server through a per-session preview host
    // (*.e2b.app). Allow any host so the proxied preview is not rejected.
    // HMR is left to Vite's inference (it follows the page's protocol/host).
    allowedHosts: true,
  },
  plugins: [
    // tanstackStart() registers its own env-scoped router code splitters
    // (client + server). The composed router plugin additionally registers an
    // UNRESTRICTED splitter, so every route module was transformed twice and
    // the dev HMR scaffolding ("const hot = import.meta.hot") was emitted
    // twice -> Vite failed with `Duplicate declaration "hot"` and served 500
    // for /src/routes/*.tsx, which broke the whole client bundle.
    // With autoCodeSplitting disabled here, only Start's splitters run, and
    // route-level chunking is declared by hand in the route files.
    tanstackRouter({ target: 'react', autoCodeSplitting: false }),
    tanstackStart(),
    react(),
  ],
})
