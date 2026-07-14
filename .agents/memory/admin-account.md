---
name: Admin account
description: Where the admin account comes from and how it's protected from duplication.
---

Admin user is seeded from `artifacts/api-server/src/seed.ts` (`SYSTEM_USERS`, username `creater_messenger`, password `pulse2024` — hash comment says "never change this automatically"). `isAdminUser()` checks the DB `is_admin` column (not a hardcoded ID list).

**Why:** seed used to look up the seed user by fixed username on every restart; if the real admin renamed their account, seed couldn't find it and inserted a second admin row.
**How to apply:** seed logic now checks "does any `is_admin = true` row exist" before inserting the seed admin — skip insertion if one already exists, regardless of username. Any admin row also gets `has_prime = true` / far-future `prime_expires_at` on every seed run, so admins are never gated behind Prime-only features (e.g. online-status visibility toggle).
