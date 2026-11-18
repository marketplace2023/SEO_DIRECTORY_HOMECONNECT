import type { Plugin } from "vite";
import { request } from "node:http";
export function localSeoProxy(): Plugin {
  const configure = (server: any) => {
    server.middlewares.use((req: any, res: any, next: any) => {
      if (
        !/^\/(georgia(?:\/|$|\?)|contractors\/|robots\.txt(?:\?|$)|sitemap\.xml(?:\?|$))/.test(
          req.url || "",
        )
      )
        return next();
      const endpoint = new URL(
        req.url,
        process.env.SERVINEXO_API_ORIGIN || "http://127.0.0.1:5190",
      );
      const upstream = request(endpoint, { method: "GET" }, (response) => {
        res.writeHead(response.statusCode || 502, response.headers);
        response.pipe(res);
      });
      upstream.on("error", () => {
        res.writeHead(503, {
          "Content-Type": "text/html; charset=utf-8",
          "X-Robots-Tag": "noindex",
        });
        res.end(
          "<h1>HOME CONNECT</h1><p>Local directory temporarily unavailable.</p>",
        );
      });
      upstream.end();
    });
  };
  return {
    name: "home-connect-local-seo",
    transformIndexHtml() {
      const origin = process.env.PUBLIC_SITE_URL?.replace(/\/$/, "");
      return [
        {
          tag: "meta",
          attrs: {
            name: "robots",
            content:
              process.env.SEO_INDEXING_ENABLED === "true" &&
              origin?.startsWith("https://")
                ? "index,follow"
                : "noindex,follow",
          },
          injectTo: "head" as const,
        },
        ...(origin
          ? [
              {
                tag: "link",
                attrs: { rel: "canonical", href: origin + "/" },
                injectTo: "head" as const,
              },
            ]
          : []),
        ...(process.env.GOOGLE_SITE_VERIFICATION
          ? [
              {
                tag: "meta",
                attrs: {
                  name: "google-site-verification",
                  content: process.env.GOOGLE_SITE_VERIFICATION,
                },
                injectTo: "head" as const,
              },
            ]
          : []),
      ];
    },
    configureServer: configure,
    configurePreviewServer: configure,
  };
}
