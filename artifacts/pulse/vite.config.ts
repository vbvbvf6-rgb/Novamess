import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";
const port = Number(process.env.PORT) || 5000;

const basePath = process.env.BASE_PATH ?? "/";

// Build version: git commit short SHA if available, otherwise timestamp
function getBuildVersion(): string {
  try {
    const { execSync } = require("child_process");
    const sha = execSync("git rev-parse --short HEAD", { stdio: ["pipe", "pipe", "pipe"] })
      .toString()
      .trim();
    if (sha) return sha;
  } catch {}
  return Date.now().toString(36);
}

// Vite plugin: after build, stamp sw.js with a unique version so browsers
// detect the new service worker and show the "Обновление доступно" banner.
function swVersionPlugin() {
  const version = getBuildVersion();
  return {
    name: "sw-version-stamp",
    // In dev: serve sw.js with current version replaced in-memory
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.url !== "/sw.js") return next();
        const swPath = path.resolve(import.meta.dirname, "public/sw.js");
        const src = fs.readFileSync(swPath, "utf-8").replace(/__BUILD_VERSION__/g, `dev-${Date.now().toString(36)}`);
        res.setHeader("Content-Type", "application/javascript");
        res.end(src);
      });
    },
    // In build: rewrite the dist/sw.js with the real version
    closeBundle() {
      const swDist = path.resolve(import.meta.dirname, "dist/sw.js");
      if (fs.existsSync(swDist)) {
        const src = fs.readFileSync(swDist, "utf-8").replace(/__BUILD_VERSION__/g, version);
        fs.writeFileSync(swDist, src, "utf-8");
        console.log(`[sw-version-stamp] stamped sw.js → aura-${version}`);
      }
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    swVersionPlugin(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      "Cross-Origin-Embedder-Policy": "unsafe-none",
      "X-Frame-Options": "ALLOWALL",
    },
    fs: {
      strict: true,
    },
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        proxyTimeout: 300000, // 5 minutes for large video uploads
        timeout: 300000,
        configure: (proxy) => {
          proxy.on("error", () => {});
          proxy.on("proxyRes", (proxyRes) => {
            const ct = proxyRes.headers["content-type"] || "";
            if (ct.includes("text/event-stream")) {
              proxyRes.headers["cache-control"] = "no-cache";
              proxyRes.headers["x-accel-buffering"] = "no";
            }
          });
        },
      },
      "/bot": {
        target: "http://localhost:8080",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", () => {});
        },
      },
      "/socket.io": {
        target: "http://localhost:8080",
        changeOrigin: true,
        ws: true,
        configure: (proxy) => {
          proxy.on("error", () => {});
        },
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
