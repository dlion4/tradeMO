import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Bundles smoke/entry.tsx as a plain IIFE for jsdom (no TanStack Start here).
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "tools/smoke/out",
    emptyOutDir: true,
    minify: false,
    lib: { entry: "tools/smoke/entry.tsx", formats: ["iife"], name: "Smoke", fileName: () => "smoke.js" },
    rollupOptions: { external: [] },
  },
  define: { "process.env.NODE_ENV": '"development"' },
});
