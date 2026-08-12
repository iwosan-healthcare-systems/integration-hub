import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// True for images this app itself uploaded and serves (always safe to embed
// as <img>). False for manually pasted external URLs (e.g. a Drive share
// link), which are HTML viewer pages, not raw image bytes, and can't be
// embedded reliably.
export function isOwnUploadUrl(url: string): boolean {
  const apiBase = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
  return !!url && url.startsWith(`${apiBase}/uploads/`);
}

// Converts an ISO (yyyy-mm-dd) date-input value into the display format used
// throughout the app ("April 23, 2026") — handy for previewing unsaved form
// state the same way the backend's fmtDate() formats saved records.
export function fmtFormDate(isoDate: string): string {
  if (!isoDate) return "No date set";
  const d = new Date(`${isoDate}T00:00:00`);
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
