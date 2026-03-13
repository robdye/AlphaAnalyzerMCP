import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// Build a fully self-contained single HTML file.
// All JS/CSS is inlined so the widget works inside the M365
// widget-renderer iframe without any cross-origin asset fetches.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
  },
});