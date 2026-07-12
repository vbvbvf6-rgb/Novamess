---
name: Object storage media offload
description: Why and how media uploads were moved from inline Postgres base64 to S3-compatible object storage.
---

Media (message photos/videos/voice, avatars, chat avatars, stories, support screenshots) was originally stored inline in Postgres as `data:<mime>;base64,...` text, which fills the DB (Supabase/Neon/Render Postgres free tiers cap around 0.5–1GB) far faster than the actual file sizes would suggest.

**Why:** No free-tier Postgres provider is "unlimited" — they're all similarly capped. The real fix for long-term scale/portability is to stop storing binary data in the DB at all, not to chase a bigger free tier.

**How to apply:** `offloadDataUrl()` in `artifacts/api-server/src/lib/objectStorage.ts` converts a base64 data URL to an S3-compatible upload (works with Cloudflare R2, Backblaze B2, Supabase Storage, AWS S3 — swap by changing env vars only, no code change) and returns a public URL instead. It's called at every write point that accepts a data URL (messages, stories, user/chat avatars, support screenshots) — search for `offloadDataUrl(` to find all call sites when adding a new media field. If `S3_ENDPOINT`/`S3_BUCKET`/`S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY`/`S3_PUBLIC_URL_BASE` aren't all set, it's a no-op and media stays inline (this is the default/dev state — no object storage is configured in the Replit dev environment).

A one-off backfill script (`scripts/src/migrate-media-to-object-storage.ts`, run via `pnpm --filter @workspace/scripts run migrate-media`) moves already-stored base64 rows to object storage after the env vars are set — needed to actually shrink an already-bloated DB, not just stop future growth.

Switching Postgres providers (not object storage) needs no code changes either — it's a plain `DATABASE_URL` connection string; use `pg_dump`/`pg_restore` to move data across providers.
