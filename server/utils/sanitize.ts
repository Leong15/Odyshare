export function sanitizeString(str: any): string {
  if (typeof str !== "string") return ""
  return str
    .replace(/<[^>]*>/g, "")
    .trim()
}
