---
name: Startup DDL ordering
description: Protects fresh database bootstraps from schema fixes that execute before migrations create their target tables.
---

Schema changes triggered at route-module import time are not reliable on a fresh database because application modules can load before the migration step. Any column required by request handlers must have a post-migration startup check before the HTTP server begins serving traffic.

**Why:** A module-level `ALTER TABLE ...` can silently fail when its table does not exist yet, leaving the first boot with a schema that the new handlers assume is present.

**How to apply:** Keep legacy drift fixes for existing databases, but repeat critical additions after migrations and await them before starting the server.