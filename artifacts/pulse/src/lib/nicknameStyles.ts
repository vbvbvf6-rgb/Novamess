export type NicknameStyleSlug =
  | "gold"
  | "rainbow"
  | "red-black"
  | "black-white"
  | "ocean"
  | "violet";

export function nicknameStyleClass(slug?: string | null): string {
  if (!slug) return "";
  const allowed: NicknameStyleSlug[] = ["gold", "rainbow", "red-black", "black-white", "ocean", "violet"];
  return allowed.includes(slug as NicknameStyleSlug) ? `nickname-style nickname-style-${slug}` : "";
}