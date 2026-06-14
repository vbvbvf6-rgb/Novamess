---
name: TypeScript TS6305 pre-existing errors
description: TS6305 build errors from api-client-react dist not built — pre-existing, harmless at runtime
---

The `lib/api-client-react` package has its dist not pre-built, causing TS6305 errors like:
> "Output file '/home/runner/workspace/lib/api-client-react/dist/index.d.ts' has not been built from source file"

**Why:** Vite resolves the workspace package via its source (`src/`) directly at dev time through the `paths` alias in tsconfig, so no dist is needed for runtime. TypeScript strict mode still complains about missing output files.

**How to apply:** When running `typecheck`, filter for real errors only:
```
pnpm --filter @workspace/pulse run typecheck 2>&1 | grep "error TS70\|error TS20\|error TS23\|error TS24"
```
These TS6305 lines are NOT regressions introduced by code changes — ignore them. Real errors to fix are TS7006 (implicit any), TS2345 (type mismatch), TS2344 (constraint), TS2339 (property missing).
