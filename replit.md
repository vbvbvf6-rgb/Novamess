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

## Architecture decisions

- Current user is hardcoded to user ID 1 (no auth system yet). All routes use `CURRENT_USER_ID = 1`.
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

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After changing `openapi.yaml`, always run `pnpm --filter @workspace/api-spec run codegen` before touching backend or frontend code.
- The orval zod config uses `mode: "single"` and `target: "generated/api.ts"` to avoid duplicate type export conflicts.
- `lib/api-zod/src/index.ts` must only export from `./generated/api` (not `./generated/types` which no longer exists).
- The API server MUST be rebuilt after route changes (`pnpm --filter @workspace/api-server run build`).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
