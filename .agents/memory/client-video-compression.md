---
name: Client-side video compression before upload
description: How this app shrinks video attachments in the browser before sending, since it has no external object storage and everything lands in Postgres as base64.
---

Chat image attachments were already compressed client-side (resize + JPEG quality), but video attachments were uploaded raw — the biggest single contributor to database bloat when no S3-compatible object storage is configured (see no-card-object-storage.md).

Fix: `artifacts/pulse/src/lib/mediaCompression.ts` re-encodes video in-browser before upload:
- Draws video frames onto a downscaled `<canvas>` (max 640px dimension), captures the canvas as a `MediaStream` via `captureStream()`, combines it with the original audio track (via `video.captureStream()`/`mozCaptureStream()`), and records the result with `MediaRecorder` at ~800kbps.
- Only uses the compressed result if it's smaller than 85% of the original size; otherwise falls back to the original file untouched.
- Has a 45s safety timeout and try/catch around every step, so unsupported browsers (notably older/iOS Safari, which has weaker `captureStream`/`MediaRecorder` support) silently fall back to uploading the raw file instead of hanging or erroring.

**Why:** without this, "no object storage" + "phone camera videos are huge" is close to a Postgres storage foot-gun. This is best-effort, not guaranteed — always keep an absolute raw-file size cap (currently 200MB in ChatInput.tsx) as a hard backstop regardless of compression outcome.

**How to apply:** if adding new video upload surfaces (e.g. stories, group avatars), reuse `prepareVideoForUpload()` from this file rather than uploading raw video, unless object storage has since been added.
