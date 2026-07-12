---
name: Render + pnpm monorepo deploy
description: Why esbuild-externalized scoped packages (e.g. @aws-sdk/*) fail at runtime on Render, and the fix.
---

## The rule
For a pnpm-workspace Node API bundled with esbuild (see `artifacts/api-server/build.mjs`), any externalized package that is actually imported by app code (not just present "in case") must be bundled instead, if it's pure JS with no native bindings.

**Why:** The build.mjs external list blanket-externalizes many scoped packages (`@aws-sdk/*`, `@azure/*`, etc.) defensively, assuming they might have native/dynamic-load requirements. But `@aws-sdk/client-s3` is pure JS. Externalizing it means the runtime `import` resolves through `node_modules` — and Render (build stage vs. runtime stage handoff) does not reliably preserve pnpm's `node_modules` layout in a way that keeps it resolvable, producing `ERR_MODULE_NOT_FOUND` even though the package installs fine during `pnpm install` and the build succeeds.

**How to apply:**
- If `ERR_MODULE_NOT_FOUND` for a scoped package shows up only on a non-Replit host (Render, Railway, Fly, etc.) and not locally, suspect this pattern first.
- Fix: remove that specific package from the esbuild `external` array in `artifacts/api-server/build.mjs` so it gets bundled directly into `dist/index.mjs`. Confirmed safe for `@aws-sdk/client-s3`.
- Secondary/defensive layer: `.npmrc` sets `node-linker=hoisted` project-wide so pnpm produces a flat (non-symlinked) `node_modules`, which also helps any other externalized deps survive the same build→runtime handoff.
- On Render specifically, a plain redeploy can reuse cached `node_modules` — after a fix like this, tell the user to do "Manual Deploy → Clear build cache & deploy", not just a normal redeploy.
