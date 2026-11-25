export const MAX_PROFILE_PHOTOS = 10;

export function parsePhotoUrls(value: unknown): string[] {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return [...new Set(parsed.filter(isGalleryPhoto))].slice(0, MAX_PROFILE_PHOTOS);
}

export function includeActivePhoto(urls: string[], activeUrl: unknown): string[] {
  if (!isGalleryPhoto(activeUrl) || urls.includes(activeUrl)) return urls;
  return [activeUrl, ...urls].slice(0, MAX_PROFILE_PHOTOS);
}

export function isAllowedPhotoUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2_000_000) return false;
  if (/^data:image\/(?:jpeg|jpg|png|webp|gif|avif);base64,/i.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isGalleryPhoto(value: unknown): value is string {
  if (!isAllowedPhotoUrl(value)) return false;
  if (value.startsWith("data:")) return true;
  try {
    return !/\.(?:mp4|webm|mov|m4v|avi)$/i.test(new URL(value).pathname);
  } catch {
    return false;
  }
}
