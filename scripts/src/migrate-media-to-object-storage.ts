/**
 * One-off migration: moves media already stored inline in Postgres as
 * base64 (`data:<mime>;base64,...`) out to S3-compatible object storage,
 * and rewrites the DB column to hold just the resulting URL.
 *
 * Run this AFTER setting S3_ENDPOINT / S3_BUCKET / S3_ACCESS_KEY_ID /
 * S3_SECRET_ACCESS_KEY / S3_PUBLIC_URL_BASE (see artifacts/api-server/src/lib/objectStorage.ts).
 * It is safe to re-run — rows that no longer start with "data:" are skipped.
 *
 * Usage:
 *   DATABASE_URL=... S3_ENDPOINT=... S3_BUCKET=... S3_ACCESS_KEY_ID=... \
 *   S3_SECRET_ACCESS_KEY=... S3_PUBLIC_URL_BASE=... pnpm --filter @workspace/scripts run migrate-media
 */
import { Pool } from "pg";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "node:crypto";

const {
  DATABASE_URL,
  S3_ENDPOINT,
  S3_BUCKET,
  S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY,
  S3_REGION,
  S3_PUBLIC_URL_BASE,
} = process.env;

if (!DATABASE_URL) throw new Error("DATABASE_URL is required");
if (!S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY || !S3_PUBLIC_URL_BASE) {
  throw new Error(
    "S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY and S3_PUBLIC_URL_BASE are all required to run this migration."
  );
}

const s3 = new S3Client({
  region: S3_REGION || "auto",
  endpoint: S3_ENDPOINT,
  credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
  forcePathStyle: true,
});

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg", "image/jpg": ".jpg", "image/png": ".png", "image/webp": ".webp",
  "image/gif": ".gif", "image/avif": ".avif", "video/mp4": ".mp4", "video/webm": ".webm",
  "video/quicktime": ".mov", "audio/webm": ".webm", "audio/mpeg": ".mp3", "audio/mp4": ".m4a",
  "audio/ogg": ".ogg", "audio/wav": ".wav", "application/pdf": ".pdf",
};
const DATA_URL_RE = /^data:([^;,]+)(?:;[^,]*)?,(.+)$/s;

async function offload(value: string, keyPrefix: string): Promise<string> {
  if (value.startsWith("[")) {
    try {
      const arr = JSON.parse(value);
      if (Array.isArray(arr)) {
        const out = await Promise.all(arr.map((v) => (typeof v === "string" ? offload(v, keyPrefix) : v)));
        return JSON.stringify(out);
      }
    } catch {
      // not JSON, fall through
    }
  }
  const match = DATA_URL_RE.exec(value);
  if (!match) return value;
  const [, mime, base64] = match;
  const buffer = Buffer.from(base64, "base64");
  const ext = MIME_TO_EXT[mime] || "";
  const key = `${keyPrefix}/migrated/${crypto.randomUUID()}${ext}`;
  await s3.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, Body: buffer, ContentType: mime }));
  return `${S3_PUBLIC_URL_BASE!.replace(/\/$/, "")}/${key}`;
}

interface TargetColumn {
  table: string;
  idCol: string;
  col: string;
  keyPrefix: string;
}

const TARGETS: TargetColumn[] = [
  { table: "messages", idCol: "id", col: "media_url", keyPrefix: "messages" },
  { table: "users", idCol: "id", col: "avatar_url", keyPrefix: "avatars" },
  { table: "chats", idCol: "id", col: "avatar_url", keyPrefix: "chat-avatars" },
  { table: "stories", idCol: "id", col: "media_url", keyPrefix: "stories" },
  { table: "bug_reports", idCol: "id", col: "screenshot_url", keyPrefix: "support" },
];

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  let totalMigrated = 0;
  let totalBytesFreed = 0;

  for (const { table, idCol, col, keyPrefix } of TARGETS) {
    const exists = await pool.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
      [table, col]
    );
    if (exists.rows.length === 0) {
      console.log(`skip ${table}.${col} (column doesn't exist)`);
      continue;
    }

    const { rows } = await pool.query(
      `SELECT ${idCol} AS id, ${col} AS val, length(${col}) AS len FROM ${table} WHERE ${col} LIKE 'data:%' OR ${col} LIKE '[%data:%'`
    );
    console.log(`${table}.${col}: ${rows.length} row(s) to migrate`);

    for (const row of rows) {
      try {
        const newVal = await offload(row.val, keyPrefix);
        if (newVal !== row.val) {
          await pool.query(`UPDATE ${table} SET ${col} = $1 WHERE ${idCol} = $2`, [newVal, row.id]);
          totalMigrated++;
          totalBytesFreed += Number(row.len) - newVal.length;
          console.log(`  ${table}#${row.id}: ${row.len} bytes -> ${newVal.length} bytes`);
        }
      } catch (err) {
        console.error(`  FAILED ${table}#${row.id}:`, err);
      }
    }
  }

  console.log(`\nDone. Migrated ${totalMigrated} row(s), freed ~${(totalBytesFreed / 1024 / 1024).toFixed(1)} MB in Postgres (run VACUUM afterwards to reclaim disk space).`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
