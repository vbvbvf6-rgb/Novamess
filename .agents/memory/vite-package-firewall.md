---
name: Vite package firewall retry
description: How to recover an imported workspace when pnpm cannot fetch its pinned Vite tarball
---

If pnpm receives a 403 for a pinned Vite tarball while metadata queries still work, check the latest patch in the same major, update the workspace catalog and lockfile, then retry installation. Avoid a major-version change unless compatibility requires it.

**Why:** Vite 7.3.2 could not be fetched through the Replit package firewall, but 7.3.8 installed successfully and the app built.

**How to apply:** Keep the runtime within the existing Vite major, confirm the lockfile is current with a frozen install, and run the workspace typecheck and build before resuming workflows.
