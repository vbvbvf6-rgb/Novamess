import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import http from "node:http";
import path from "node:path";
import rateLimit from "express-rate-limit";
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

export const JWT_SECRET = process.env.JWT_SECRET || "pulse-messenger-jwt-secret-please-change-in-production";

const app: Express = express();

app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  message: { error: "Слишком много попыток. Подождите 15 минут." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.ip === "::1" || req.ip === "127.0.0.1",
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

app.use((req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
      if (Number.isFinite(payload.userId) && payload.userId > 0) {
        req.currentUserId = payload.userId;
        return next();
      }
    } catch {}
  }

  const headerVal = req.headers["x-user-id"];
  const parsed = headerVal ? Number(headerVal) : NaN;
  req.currentUserId = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  next();
});

app.use("/api", router);
app.use("/bot", botApiRouter);

if (process.env.NODE_ENV === "production") {
  const staticDir = path.join(process.cwd(), "artifacts/pulse/dist/public");
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
