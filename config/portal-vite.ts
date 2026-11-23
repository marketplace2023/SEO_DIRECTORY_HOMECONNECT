import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import "../server/config/env.ts";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { sep, extname } from "node:path";
import { createReadStream, statSync, cpSync, existsSync } from "node:fs";
import { clientOrigins } from "./origins.ts";

export const projectRoot = fileURLToPath(new URL("../", import.meta.url));
export function portalConfig(name: "contractor" | "admin", port: number) {
  return defineConfig(() => ({
    root: resolve(projectRoot, "apps", name),
    base: "/",
    publicDir: false,
    cacheDir: resolve(
      projectRoot,
      "node_modules/.vite",
      process.env.SERVINEXO_VITE_CACHE === "e2e"
        ? `${name}-e2e`
        : `${name}-dev`,
    ),
    plugins: [
      {
        name: "servinexo-shared-public",
        closeBundle() {
          const destination = resolve(projectRoot, "apps", name, "dist");
          for (const asset of [
            "images",
            "maps",
            "category-art",
            "CATEGORY_PICS",
            "demo-seed.json",
          ]) {
            const source = resolve(projectRoot, "public", asset);
            if (existsSync(source))
              cpSync(source, resolve(destination, asset), { recursive: true });
          }
        },
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const pathname = req.url?.split("?")[0] || "";
            if (
              !/^\/(images|maps|category-art|CATEGORY_PICS)\//.test(pathname) &&
              pathname !== "/demo-seed.json"
            )
              return next();
            try {
              const publicRoot = resolve(projectRoot, "public");
              const path = resolve(
                publicRoot,
                `.${decodeURIComponent(pathname)}`,
              );
              if (
                !path.startsWith(publicRoot + sep) ||
                !statSync(path).isFile()
              )
                return next();
              const types: Record<string, string> = {
                ".jpg": "image/jpeg",
                ".png": "image/png",
                ".webp": "image/webp",
                ".svg": "image/svg+xml",
                ".json": "application/json",
                ".geojson": "application/geo+json",
              };
              res.setHeader(
                "Content-Type",
                types[extname(path)] || "application/octet-stream",
              );
              createReadStream(path).pipe(res);
            } catch {
              next();
            }
          });
        },
      },
      react(),
      tailwindcss(),
    ],
    define: {
      ...clientOrigins(),
      "import.meta.env.VITE_APPLICATION": JSON.stringify(name),
    },
    resolve: { alias: { "@": resolve(projectRoot, "src") } },
    optimizeDeps: { include: ["leaflet", "react-leaflet"] },
    server: { port, strictPort: true, fs: { allow: [projectRoot] } },
    build: {
      outDir: resolve(projectRoot, "apps", name, "dist"),
      emptyOutDir: true,
    },
  }));
}
