/**
 * Convert a display name to a URL-safe slug.
 * e.g. "Matthew Cheng" -> "matthew-cheng"
 */
export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
