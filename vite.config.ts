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
    // The HMR endpoint is left to Vite's inference (it follows the page's
    // protocol/host), which is what the proxy expects.
    allowedHosts: true,
  },
  plugins: [
    // autoCodeSplitting is disabled: the router-plugin transform emits a
    // TSRSplitComponent global that Vite 8's module runner cannot resolve in dev.
    // Route modules are still lazy-loaded by the router itself.
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tanstackStart(),
  ],
})
