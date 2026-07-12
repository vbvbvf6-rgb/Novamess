import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "node:crypto";
import { logger } from "./logger";

// ── S3-compatible object storage ────────────────────────────────────────────
// Works with any S3-compatible provider: Cloudflare R2, Backblaze B2, AWS S3,
// Supabase Storage (S3 mode), Wasabi, MinIO, etc. Swapping providers later is
// just a matter of changing these 5 env vars — no code or database changes,
// and no user data is lost, since only new uploads write to whichever
// provider is configured. Old files stay wherever they were uploaded.
//
// Required env vars (all-or-nothing — if any is missing, storage falls back
// to keeping media inline in Postgres, which is the pre-existing behavior):
//   S3_ENDPOINT           e.g. https://<account_id>.r2.cloudflarestorage.com
//   S3_BUCKET             bucket name
//   S3_ACCESS_KEY_ID
//   S3_SECRET_ACCESS_KEY
//   S3_PUBLIC_URL_BASE    public base URL the bucket is served from
//                         (R2 public bucket URL, a custom domain, or a CDN in front of it)
// Optional:
//   S3_REGION             defaults to "auto" (correct for R2; set explicitly for AWS S3)

const {
  S3_ENDPOINT,
  S3_BUCKET,
  S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY,
  S3_REGION,
  S3_PUBLIC_URL_BASE,
} = process.env;

export const objectStorageEnabled = !!(
  S3_ENDPOINT && S3_BUCKET && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY && S3_PUBLIC_URL_BASE
);

if (!objectStorageEnabled) {
  logger.warn(
    "[storage] Object storage not configured (S3_ENDPOINT/S3_BUCKET/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY/S3_PUBLIC_URL_BASE) — media will be stored inline in Postgres as base64. This fills up the database quickly; configure object storage for production."
  );
}

let client: S3Client | null = null;
function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      region: S3_REGION || "auto",
      endpoint: S3_ENDPOINT,
      credentials: {
        accessKeyId: S3_ACCESS_KEY_ID!,
        secretAccessKey: S3_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true, // required by R2 and most non-AWS S3-compatible providers
    });
  }
  return client;
}

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "audio/webm": ".webm",
  "audio/mpeg": ".mp3",
  "audio/mp4": ".m4a",
  "audio/ogg": ".ogg",
  "audio/wav": ".wav",
  "application/pdf": ".pdf",
};

const DATA_URL_RE = /^data:([^;,]+)(?:;[^,]*)?,(.+)$/s;

/**
 * Given a value that may be a `data:<mime>;base64,<data>` URL, uploads it to
 * object storage and returns a public URL instead. If object storage isn't
 * configured, or the value isn't a base64 data URL (already a URL, empty,
 * plain text, etc.), the value is returned unchanged.
 *
 * `keyPrefix` groups uploads by feature, e.g. "messages", "avatars", "stories".
 */
export async function offloadDataUrl(
  input: string | null | undefined,
  keyPrefix: string
): Promise<string | null | undefined> {
  if (!input || !objectStorageEnabled) return input;

  // Albums are stored as a JSON array of data URLs/URLs in a single string field.
  if (input.startsWith("[")) {
    try {
      const arr = JSON.parse(input);
      if (Array.isArray(arr)) {
        const offloaded = await Promise.all(
          arr.map((item) => (typeof item === "string" ? offloadDataUrl(item, keyPrefix) : item))
        );
        return JSON.stringify(offloaded);
      }
    } catch {
      // not JSON — fall through and treat as a single value
    }
  }

  const match = DATA_URL_RE.exec(input);
  if (!match) return input;
  const [, mime, base64] = match;

  try {
    const buffer = Buffer.from(base64, "base64");
    const ext = MIME_TO_EXT[mime] || "";
    const key = `${keyPrefix}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}${ext}`;
    await getClient().send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mime,
      })
    );
    return `${S3_PUBLIC_URL_BASE!.replace(/\/$/, "")}/${key}`;
  } catch (err) {
    logger.error({ err }, "[storage] Failed to upload to object storage, keeping inline as fallback");
    return input;
  }
}
