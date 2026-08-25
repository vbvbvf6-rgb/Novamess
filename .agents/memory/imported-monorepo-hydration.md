---
name: Imported monorepo hydration
description: Dependency installation behavior to check first when an imported workspace's workflows fail at command resolution
---

An imported pnpm workspace can retain its lockfile while lacking all installed packages. In that state, frontend and backend workflows fail with command-not-found or module-not-found errors before application code runs.

**Why:** A fresh GitHub import does not necessarily include the workspace's ignored node_modules tree, so startup errors can look like broken app code even when the lockfile is valid.

**How to apply:** Check for node_modules and the lockfile before debugging application behavior. If the lockfile is present, hydrate with a frozen pnpm install, then restart only the workflows needed for the requested artifact and verify its HTTP response and preview.