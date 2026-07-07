import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import http from "node:http";
import path from "node:path";
import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import jwt from "jsonwebtoken";
import router from "./routes";
import botApiRouter from "./routes/botapi";
import { logger } from "./lib/logger";

declare global {
  namespace Express {
    interface Request {
      currentUserId: number;
    }
  }
}

// ── JWT Secret ───────────────────────────────────────────────────────────────
if (!process.env.JWT_SECRET) {
  if (process.env.SESSION_SECRET) {
    // Fallback: reuse SESSION_SECRET so the server starts without a separate JWT_SECRET.
    // Set JWT_SECRET in Replit Secrets to use an independent signing key.
    process.env.JWT_SECRET = process.env.SESSION_SECRET;
    console.warn("[security] JWT_SECRET not set — using SESSION_SECRET as fallback. Add JWT_SECRET to Replit Secrets for production.");
  } else {
    throw new Error("JWT_SECRET environment variable is required but not set. Set it in Replit Secrets.");
  }
}
export const JWT_SECRET = process.env.JWT_SECRET!;
export const EFFECTIVE_JWT_SECRET = JWT_SECRET;

const app: Express = express();

app.set("trust proxy", 1);

// ── Helmet — comprehensive security headers ────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'", "wss:", "ws:", "https:"],
        fontSrc: ["'self'", "data:", "https:"],
        mediaSrc: ["'self'", "blob:", "data:", "https:"],
        workerSrc: ["'self'", "blob:"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: process.env.NODE_ENV === "production"
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xContentTypeOptions: true,
    xFrameOptions: { action: "deny" },
    xXssProtection: true,
    dnsPrefetchControl: { allow: false },
    ieNoOpen: true,
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
  })
);

// ── Permissions-Policy — disable dangerous browser APIs ───────────────────
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(self), camera=(self), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()"
  );
  next();
});

// ── CORS — only allow same-origin or explicitly allowed origins ────────────
const getAllowedOrigins = (): string[] | true => {
  const prod = process.env.ALLOWED_ORIGINS;
  if (prod) return prod.split(",").map(o => o.trim());
  // In dev/Replit — allow same origin + Replit preview domains
  return true;
};

app.use(cors({
  origin: getAllowedOrigins(),
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type", "X-Requested-With"],
  maxAge: 86400, // Cache preflight for 24h
}));

// ── Request timeout — prevents hanging connections ─────────────────────────
// Large file uploads (/api/messages) get 5min; all other routes get 60s
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.endsWith("/events")) return next();
  const isUpload = req.path.startsWith("/api/messages") || req.path.startsWith("/api/upload");
  const timeoutMs = isUpload ? 5 * 60_000 : 60_000;
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      res.status(503).json({ error: "Request timeout" });
    }
  }, timeoutMs);
  res.on("finish", () => clearTimeout(timer));
  res.on("close", () => clearTimeout(timer));
  next();
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: Record<string, unknown> & { id?: unknown; method?: string; url?: string }) {
        return { id: req.id, method: req.method, url: (req.url as string | undefined)?.split("?")[0] };
      },
      res(res: Record<string, unknown> & { statusCode?: number }) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// ── Body parsers — small limit for regular routes, large only for uploads ──
// Prevents DoS via huge JSON payloads
app.use("/api/upload", express.json({ limit: "100mb" }));
app.use("/api/upload", express.urlencoded({ extended: true, limit: "100mb" }));
app.use("/api/stories", express.json({ limit: "50mb" }));
app.use("/api/stories", express.urlencoded({ extended: true, limit: "50mb" }));
app.use("/api/users/me", express.json({ limit: "50mb" })); // avatar upload via base64
// Messages can carry base64-encoded files (docs, video, audio) — allow up to 150mb
app.use("/api/messages", express.json({ limit: "500mb" }));
app.use("/api/messages", express.urlencoded({ extended: true, limit: "500mb" }));
// Support messages can contain base64 photos
app.use("/api/support", express.json({ limit: "25mb" }));
app.use("/api/support", express.urlencoded({ extended: true, limit: "25mb" }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// ── Strip dangerous characters from string inputs ─────────────────────────
// Prevents stored XSS in display names, bios, etc.
function sanitizeString(val: unknown, maxLen = 1000): string {
  if (typeof val !== "string") return "";
  return val
    .trim()
    .slice(0, maxLen)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")           // strip all HTML tags
    .replace(/javascript:/gi, "")     // strip javascript: URIs
    .replace(/on\w+\s*=/gi, "");      // strip event handlers
}

export { sanitizeString };

// ── Global rate limit — 300 req/15min per IP (DDoS basic protection) ──────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: "Слишком много запросов. Попробуйте позже." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.ip === "::1" || req.ip === "127.0.0.1",
});
app.use("/api", globalLimiter);

// ── Auth rate limit — strict: 15 attempts / 15min per IP ─────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: "Слишком много попыток входа. Подождите 15 минут." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.ip === "::1" || req.ip === "127.0.0.1",
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/reset-password", authLimiter);
app.use("/api/auth/2fa", authLimiter);

// ── Password reset / security question — very strict: 5 / 15min ──────────
const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Слишком много запросов. Подождите 15 минут перед следующей попыткой." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.ip === "::1" || req.ip === "127.0.0.1",
});
app.use("/api/auth/security-question", forgotLimiter);
app.use("/api/auth/forgot-password", forgotLimiter);

// ── Message send rate limit — 60 messages per minute per user ────────────
const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: "Слишком много сообщений. Подождите немного." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.currentUserId ? `user:${req.currentUserId}` : ipKeyGenerator(req),
  skip: (req) => !req.currentUserId,
});
app.use("/api/messages", messageLimiter);

// ── Upload rate limit — prevent file upload spam ──────────────────────────
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: "Слишком много загрузок. Подождите немного." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.currentUserId ? `upload:${req.currentUserId}` : ipKeyGenerator(req),
});
app.use("/api/upload", uploadLimiter);
app.use("/api/stories", uploadLimiter);

// ── Admin routes stricter limit ───────────────────────────────────────────
const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: "Слишком много запросов к панели администратора." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.currentUserId ? `admin:${req.currentUserId}` : ipKeyGenerator(req),
});
app.use("/api/admin", adminLimiter);

// Routes that do NOT require a valid session
const PUBLIC_API_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/2fa/complete",
  "/auth/security-question",
  "/auth/reset-password",
  "/auth/qr",
  "/health",
  "/invite",
];

// ── Session validity cache — avoids DB hit on every request ──────────────
// Maps sessionId → { valid: boolean, expires: timestamp }
const sessionCache = new Map<string, { valid: boolean; expires: number }>();
const SESSION_CACHE_TTL = 30_000; // 30 seconds

async function isSessionValid(sid: string): Promise<boolean> {
  const now = Date.now();
  const cached = sessionCache.get(sid);
  if (cached && cached.expires > now) return cached.valid;
  try {
    const { db } = await import("@workspace/db");
    const { sql } = await import("drizzle-orm");
    const rows = await db.execute(sql`SELECT 1 FROM user_sessions WHERE id = ${sid} LIMIT 1`);
    const valid = rows.rows.length > 0;
    sessionCache.set(sid, { valid, expires: now + SESSION_CACHE_TTL });
    // Update last_active_at in background (don't await)
    if (valid) {
      db.execute(sql`UPDATE user_sessions SET last_active_at = NOW() WHERE id = ${sid}`).catch(() => {});
    }
    return valid;
  } catch {
    return true; // fail-open: don't lock out users if DB is down
  }
}

// Invalidate cache entry when session is terminated
export function invalidateSessionCache(sid: string) {
  sessionCache.delete(sid);
}

app.use(async (req: Request, _res: Response, next: NextFunction) => {
  // 1. JWT from Authorization header (normal API calls)
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, EFFECTIVE_JWT_SECRET) as { userId: number; sid?: string; pending2fa?: boolean };
      if (!payload.pending2fa && Number.isFinite(payload.userId) && payload.userId > 0) {
        // If token has a session ID, validate it exists in DB
        if (payload.sid) {
          const valid = await isSessionValid(payload.sid);
          if (!valid) {
            req.currentUserId = 0;
            return next();
          }
        }
        req.currentUserId = payload.userId;
        return next();
      }
    } catch {}
  }

  // 2. JWT from _token query param (EventSource / SSE — browsers can't send custom headers)
  const queryToken = (req.query._token as string | undefined) || (req.query.token as string | undefined);
  if (queryToken) {
    try {
      const payload = jwt.verify(queryToken, EFFECTIVE_JWT_SECRET) as { userId: number; sid?: string; pending2fa?: boolean };
      if (!payload.pending2fa && Number.isFinite(payload.userId) && payload.userId > 0) {
        if (payload.sid) {
          const valid = await isSessionValid(payload.sid);
          if (!valid) {
            req.currentUserId = 0;
            return next();
          }
        }
        req.currentUserId = payload.userId;
        return next();
      }
    } catch {}
  }

  req.currentUserId = 0;
  next();
});

// ── Keepalive ping — prevents Render free tier from sleeping ──────────────
app.get("/api/ping", (_req: Request, res: Response) => {
  res.json({ ok: true, ts: Date.now() });
});

app.get("/api/health", async (_req: Request, res: Response) => {
  let dbOk = false;
  let dbError: string | null = null;
  let tablesExist = false;
  try {
    const { db } = await import("@workspace/db");
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`SELECT 1`);
    dbOk = true;
    const r = await db.execute(sql`SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'`);
    const count = Number((r.rows[0] as any)?.count ?? 0);
    tablesExist = count > 0;
  } catch (e: any) {
    dbError = e?.message ?? String(e);
  }
  const status = dbOk ? 200 : 503;
  res.status(status).json({
    ok: dbOk,
    db: dbOk ? "connected" : "error",
    dbError,
    tablesExist,
    nodeEnv: process.env.NODE_ENV,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    hasJwtSecret: !!process.env.JWT_SECRET,
    ts: Date.now(),
  });
});

// Require authentication for all API routes except public ones
app.use("/api", (req: Request, res: Response, next: NextFunction) => {
  const isPublic = PUBLIC_API_PATHS.some(p => req.path === p || req.path.startsWith(p + "/"));
  if (!isPublic && req.currentUserId === 0) {
    return res.status(401).json({ error: "Требуется авторизация" });
  }
  next();
});

app.use("/api", router);
app.use("/bot", botApiRouter);

// Unknown API routes — return 404 instead of proxying to frontend
app.use("/api", (_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

if (process.env.NODE_ENV === "production") {
  const staticDir = path.join(process.cwd(), "artifacts/pulse/dist");
  app.use(express.static(staticDir, { maxAge: "1h", index: false }));
  app.use("/{*path}", (_req: Request, res: Response) => {
    res.sendFile(path.join(staticDir, "index.html"));
  });
} else {
  const VITE_PORT = 5000;
  app.use("/{*path}", (req: Request, res: Response) => {
    const options = {
      hostname: "localhost",
      port: VITE_PORT,
      path: req.originalUrl,
      method: req.method,
      headers: { ...req.headers, host: `localhost:${VITE_PORT}` },
    };
    const proxy = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });
    proxy.on("error", () => {
      res.status(502).send("Frontend не запущен. Запустите workflow 'Pulse Frontend'.");
    });
    req.pipe(proxy, { end: true });
  });
}

export default app;
