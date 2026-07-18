# Pulse Messenger

A Telegram-inspired messenger app called Pulse, featuring real-time-style chats, voice & video calls, animated gifts, stories, and contacts management.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/pulse run dev` — run the Pulse frontend (port 23821)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + Framer Motion + Wouter (routing)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all API contracts)
- `lib/api-client-react/src/generated/` — Generated React Query hooks
- `lib/api-zod/src/generated/api.ts` — Generated Zod validators
- `lib/db/src/schema/` — Drizzle table definitions (users, chats, messages, calls, gifts, stories)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/pulse/src/` — React frontend (pages, components, contexts)

## Media storage (object storage, optional)

By default, uploaded media (message photos/videos/voice, avatars, chat/group avatars, stories, support screenshots) is stored inline in Postgres as base64 — simple, but it fills up the database fast (one video can weigh more in the DB than the file itself).

Set these env vars to offload new uploads to any S3-compatible object storage (Cloudflare R2, Backblaze B2, Supabase Storage, AWS S3, etc.) instead — the DB then stores only a URL:

- `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL_BASE` (required together; optional `S3_REGION`, defaults to `auto`)
- If any is missing, the app automatically falls back to storing inline (current Replit dev environment has none set — this is expected in dev).
- Logic lives in `artifacts/api-server/src/lib/objectStorage.ts` (`offloadDataUrl`), called from the message/story/avatar/chat-avatar/support-report write paths.
- To move already-stored base64 files out of the DB after configuring storage: `pnpm --filter @workspace/scripts run migrate-media` (see `scripts/src/migrate-media-to-object-storage.ts`).
- Switching Postgres providers later (Supabase → Neon → anywhere) needs no code changes — it's a plain `DATABASE_URL` connection string; use `pg_dump`/`pg_restore` to move data. See `DEPLOY.md` for step-by-step instructions (in Russian, matching the project's existing docs).

## Architecture decisions

- **Auth**: Full JWT auth system. Tokens stored in `sessionStorage` (`pulse-token`). All frontend requests send `Authorization: Bearer <token>`. Account list stored in `localStorage` (`pulse-accounts`) for cross-tab account switching. Each browser tab owns its session independently (`pulse-tab-owned` in sessionStorage). Token TTL: 30 days, bcrypt SALT_ROUNDS=12.
- **Registration**: Open to all — `/auth/register` is a public path, no invite codes needed.
- Direct chat names are derived from `otherUser.displayName` on the frontend (the API returns `otherUser` for direct chats).
- Gift animations use Framer Motion with different animation types per gift rarity.
- Call flow is simulated (no WebRTC) — call state is managed in AppContext and persisted via API.
- Stories expire after 24 hours; story groups are assembled server-side grouped by user.

## Product

- **Chats**: Direct, group, and channel chats with message history, replies, reactions, edit/delete
- **Calls**: Audio and video call UI with accept/decline screens and call history
- **Gifts**: Animated gift catalog with rarity tiers (common/rare/epic/legendary), animated sending celebrations
- **Stories**: 24-hour stories with full-screen viewer and stories bar
- **Contacts**: Contact list with search and add/remove
- **Profile**: User stats dashboard (messages, calls, gifts)
- **Security**: 2FA (TOTP) via auth routes + Settings UI; screen lock PIN; disappearing messages timer per chat (5s–1mo); message search (per-chat and cross-chat via `/api/messages/search`); privacy settings (read receipts, online status) persisted to DB
- **Chat folders**: All / Unread / Groups / Bots tabs in ChatList sidebar

## Vercel + Wispbyte deployment

Frontend is deployed to Vercel; backend runs on Wispbyte.

**Vercel project settings (must match exactly):**

| Setting | Value |
|---------|-------|
| Root Directory | *(empty — repo root, not `artifacts/pulse`)* |
| Framework Preset | Other |
| Install Command | `pnpm install` |
| Build Command | `BASE_PATH=/ pnpm --filter @workspace/pulse run build` |
| Output Directory | `artifacts/pulse/dist` |

These are already encoded in the root `vercel.json`; Vercel picks them up automatically as long as Root Directory is the repo root. If any Build & Output setting is overridden in the Vercel UI, it takes precedence over `vercel.json` — clear all overrides.

**Required environment variable in Vercel** (Settings → Environment Variables):

| Key | Value |
|-----|-------|
| `VITE_API_URL` | Wispbyte backend URL (e.g. `https://your-project.wispbyte.com`) |

Without `VITE_API_URL` the frontend won't know where the API is and all requests will fail.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After changing `openapi.yaml`, always run `pnpm --filter @workspace/api-spec run codegen` before touching backend or frontend code.
- The orval zod config uses `mode: "single"` and `target: "generated/api.ts"` to avoid duplicate type export conflicts.
- `lib/api-zod/src/index.ts` must only export from `./generated/api` (not `./generated/types` which no longer exists).
- The API server MUST be rebuilt after route changes (`pnpm --filter @workspace/api-server run build`).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
