---
name: Maintenance mode enforcement
description: Maintenance mode used to be cosmetic only — how real enforcement was added.
---

`MaintenanceScreen.tsx` is a pure overlay; historically nothing on the backend rejected requests during maintenance, so already-logged-in users kept working — only new page loads saw the screen.

**Why:** maintenance mode must actually lock non-admin users out, not just show a banner they can dismiss by already having a session open.
**How to apply:** `app.ts` has an `/api` middleware (after auth, before routes) that reads the `app_settings` row with key `maintenance` (JSON: `{active, endsAt, ...}`), and returns 503 for any non-admin request once `active` is true and not expired. Admins are always let through (checked via `users.is_admin`). A short allowlist (`/maintenance`, `/auth/login`, `/auth/logout`, `/events`) stays open so the maintenance screen itself and logout still work. Frontend poll interval for the overlay was tightened from 60s to 15s for snappier UX, but the real lockout is server-side and instant.
