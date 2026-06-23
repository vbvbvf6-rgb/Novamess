/**
 * Vercel Serverless Function — wraps the Express app.
 * All /api/* and /bot/* requests are routed here by vercel.json.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

// The Express app is pre-built; import from the compiled output.
// During Vercel build: pnpm --filter @workspace/api-server run build
let handler: ((req: any, res: any) => void) | null = null;

async function getHandler() {
  if (!handler) {
    // Dynamic import so the module is loaded once and cached
    const mod = await import("../artifacts/api-server/dist/index.mjs");
    // The compiled bundle exports the Express app as default
    handler = (mod.default as any)?.app ?? mod.default;
  }
  return handler;
}

export default async function (req: VercelRequest, res: VercelResponse) {
  const h = await getHandler();
  if (!h) {
    res.status(503).json({ error: "API server not available" });
    return;
  }
  h(req as any, res as any);
}
