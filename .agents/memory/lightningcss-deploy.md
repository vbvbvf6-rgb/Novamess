---
name: LightningCSS deployment binaries
description: Native optional dependency handling for Vite/Tailwind builds on glibc and musl hosts.
---

The workspace must keep both glibc and musl Linux optional packages for `lightningcss`. Do not exclude the musl packages in pnpm overrides when the app may be deployed to Alpine-style hosting.

**Why:** A deployment can fail while loading `vite.config.ts` with `Cannot find module '../lightningcss.linux-x64-musl.node'` even though the build works on a glibc development image. The missing file is an optional native package omitted during install, not a frontend source error.

**How to apply:** Keep `supportedArchitectures.libc` set to both `glibc` and `musl` in the workspace package configuration, verify the lockfile includes the matching Linux native packages, and declare the x64 bindings as direct optional dependencies when a Docker host still omits transitive optional packages.