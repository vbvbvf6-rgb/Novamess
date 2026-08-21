---
name: PXXL Docker workspace manifests
description: PXXL Docker installs with pnpm frozen-lockfile and needs every workspace package manifest copied before dependency installation.
---

PXXL/Docker builds must copy the `package.json` for every workspace included by `pnpm-workspace.yaml` before running `pnpm install --frozen-lockfile`; otherwise the install can fail in the remote sandbox even when local production builds pass.

**Why:** The remote build resolves workspace importers from the lockfile before source files are copied, so omitted workspace manifests are only exposed in the container build.

**How to apply:** When adding a workspace package or changing `pnpm-workspace.yaml`, update the manifest-copy layer in `Dockerfile` and validate `scripts/build-prod.sh`.