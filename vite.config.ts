import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import "./server/config/env.ts";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";
import { clientOrigins } from "./config/origins.ts";
import { localSeoProxy } from "./config/local-seo.ts";

export default defineConfig({
  cacheDir:
    process.env.SERVINEXO_VITE_CACHE === "e2e"
      ? "node_modules/.vite/e2e"
      : "node_modules/.vite/dev",
  plugins: [
    localSeoProxy(),
    {
      name: "redirect-old-portals",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const path = req.url?.split("?")[0] || "";
          const origin = /^\/contractor(?:\/|$)/.test(path)
            ? process.env.SERVINEXO_CONTRACTOR_ORIGIN || "http://127.0.0.1:5180"
            : /^\/admin(?:\/|$)/.test(path)
              ? process.env.SERVINEXO_ADMIN_ORIGIN || "http://127.0.0.1:5181"
              : "";
          if (origin) {
            res.writeHead(302, { Location: origin + "/" });
            res.end();
            return;
          }
          next();
        });
      },
    },
    react(),
    tailwindcss(),
  ],
  define: clientOrigins(),
  server: { port: 5175, strictPort: true },
  build: { outDir: "dist/web" },
  optimizeDeps: {
    entries: ["index.html"],
    include: ["leaflet", "react-leaflet"],
  },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});
