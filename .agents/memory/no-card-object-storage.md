---
name: No-card object storage options
description: Which S3-compatible free object storage providers actually let you sign up without a credit card, for apps that offload media out of Postgres.
---

Checked in July 2026 while looking for a free tier to offload chat/photo media without a credit card:

- **Cloudflare R2** — advertises a free 10GB tier, but activating R2 on a Cloudflare account requires adding a payment method up front, even if usage stays within the free quota.
- **Backblaze B2** — advertises 10GB free, but new accounts are prompted to view billing history or pay a one-time ~$1 verification charge before the bucket/keys become usable.
- **Supabase Storage** — the only option confirmed to need no card at all, not even for verification. S3-compatible API (works with the same generic S3 client code as R2/B2). Tradeoff: free quota is only 1GB, much smaller than R2/B2's advertised 10GB.

**Why this matters:** users without a card (or unwilling to give one) have very limited free S3-compatible options. Supabase is the fallback recommendation; if even 1GB isn't enough, the realistic alternative is compressing media harder client-side rather than external storage.

**How to apply:** when a user asks for free media offload and has no card, don't default to R2 — offer Supabase Storage first and set expectations on its smaller quota, or lean on client-side compression if they decline external storage entirely.
