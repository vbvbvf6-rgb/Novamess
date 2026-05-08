import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import http from "node:http";
import router from "./routes";
import { logger } from "./lib/logger";

declare global {
  namespace Express {
    interface Request {
      currentUserId: number;
    }
  }
}

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

app.use((req: Request, _res: Response, next: NextFunction) => {
  const headerVal = req.headers["x-user-id"];
  const parsed = headerVal ? Number(headerVal) : NaN;
  req.currentUserId = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  next();
});

app.use("/api", router);

// Proxy all non-API requests to Vite dev server (frontend)
const VITE_PORT = 23821;
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

export default app;
