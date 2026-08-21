# ─── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:24-slim AS builder

WORKDIR /workspace

RUN npm install -g pnpm@10

# ── Workspace manifests first (layer cache) ──
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY lib/db/package.json                ./lib/db/
COPY lib/api-spec/package.json          ./lib/api-spec/
COPY lib/api-zod/package.json           ./lib/api-zod/
COPY lib/api-client-react/package.json  ./lib/api-client-react/
COPY artifacts/api-server/package.json  ./artifacts/api-server/
COPY artifacts/pulse/package.json       ./artifacts/pulse/
COPY artifacts/mockup-sandbox/package.json ./artifacts/mockup-sandbox/
COPY scripts/package.json              ./scripts/

RUN pnpm install --frozen-lockfile --force

# Keep both Linux libc bindings available. Some Pxxl builders run on glibc
# while their runtime image uses musl, and npm/pnpm can otherwise omit the
# optional package that lightningcss selects at runtime.
RUN cd artifacts/pulse \
  && node -e "require.resolve('lightningcss-linux-x64-gnu')" \
  && node -e "require.resolve('lightningcss-linux-x64-musl')"

COPY tsconfig.json tsconfig.base.json* ./
COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/
COPY artifacts/pulse/ ./artifacts/pulse/

# Build the API server (esbuild)
RUN pnpm --filter @workspace/api-server run build

# Build the React frontend
# BASE_PATH=/ serves the app at the root.
# No VITE_TURN_* needed — ICE servers are now fetched at runtime from /api/calls/ice-servers
RUN BASE_PATH=/ pnpm --filter @workspace/pulse run build


# ─── Stage 2: Runner ───────────────────────────────────────────────────────────
FROM node:24-slim AS runner

WORKDIR /app

# nodemailer is not bundled by esbuild — must be present at runtime
RUN npm install --omit=dev nodemailer@^8

COPY --from=builder /workspace/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=builder /workspace/artifacts/pulse/dist ./artifacts/pulse/dist
COPY --from=builder /workspace/lib/db/drizzle ./migrations

ENV NODE_ENV=production

# PORT задаётся хостингом (Pxxl, Render, Fly.io и т.д.) через env.
# Значение по умолчанию 8080 для Docker-окружений где PORT не задан.
ENV PORT=8080
EXPOSE 8080

# Required env vars at runtime:
#   DATABASE_URL   — Postgres connection string (e.g. from Supabase)
#   JWT_SECRET     — Long random string for signing JWT tokens
# Optional:
#   TURN_URL       — e.g. turn:relay.metered.ca:80
#   TURN_USER      — TURN username
#   TURN_CRED      — TURN credential

CMD ["node", "--enable-source-maps", "./artifacts/api-server/dist/index.mjs"]
