---
name: Workflow hydration after import
description: How to interpret stale workflow failures after restoring dependencies in an imported monorepo.
---

After hydrating dependencies in an imported monorepo, artifact-specific workflows can run successfully while older duplicate import workflows still show the pre-install command-not-found failure.

**Why:** Workflow logs belong to each process instance; installing packages does not rewrite historical logs or make duplicate processes the canonical preview target.

**How to apply:** Restart the workflow attached to the artifact being verified, use that workflow's port for checks, and treat older duplicate failures as cleanup/configuration work rather than application errors.