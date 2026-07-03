---
name: JWT TTL and session persistence
description: Token lifetime and why users get logged out after browser restart
---

## Rule
`TOKEN_TTL` in `artifacts/api-server/src/routes/auth.ts` is set to `"90d"`.

## Auto-restore flow
On browser restart, `sessionStorage` clears. `App.tsx` `useState` initializer reads `getSavedAccounts()[0].token` from `localStorage` (`pulse-accounts` key) and restores it to `sessionStorage`. This means users stay logged in for up to 90 days without any action.

**Why 90d:** 30d caused too-frequent logouts for regular users. 365d was flagged as a security risk (long compromise window). 90d is a standard "remember me" duration.

## 401 handler behaviour
The `pulse:unauthorized` handler in App.tsx only clears `sessionStorage`, NOT `localStorage`. So `pulse-accounts` persists across browser restarts and the auto-restore can try again. Users only truly get logged out if their token has expired (>90d) or was explicitly revoked.

## Known limitation
Some token paths (`signToken` without `sid`) are not session-revocable. Extending TTL amplifies impact of token exfiltration. Full fix requires short-lived access tokens + refresh token rotation.
