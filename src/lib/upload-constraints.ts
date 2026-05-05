/**
 * Shared upload constraints used by both client and server validation.
 * Keep this file dependency-free so it can be imported from any context.
 */

export const MAX_FILES = 5;
export const MAX_SIZE_MB = 10;
export const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

/** MIME prefixes / exact types allowed for attachment upload. */
export const ALLOWED_MIME_PREFIXES = ["image/"] as const;
export const ALLOWED_MIME_EXACT = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "text/plain",
  "text/csv",
] as const;

/** Friendly label for the allowed file types (UI hint). */
export const ALLOWED_HINT = "Ảnh, PDF, Word, Excel, TXT/CSV";

/** `accept` attribute string for <input type="file"> */
export const ACCEPT_ATTR = [
  "image/*",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".txt",
  ".csv",
].join(",");

export function isAllowedMime(type: string): boolean {
  if (!type) return false;
  if (ALLOWED_MIME_PREFIXES.some((p) => type.startsWith(p))) return true;
  return (ALLOWED_MIME_EXACT as readonly string[]).includes(type);
}
