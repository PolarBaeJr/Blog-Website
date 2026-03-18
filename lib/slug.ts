import slugify from 'slugify';
import prisma from './prisma';

/**
 * Generate a URL-safe slug from a title string.
 * Uses strict mode to only allow alphanumeric characters and hyphens.
 */
export function generateSlug(title: string): string {
  return slugify(title, {
    lower: true,
    strict: true,
    trim: true,
  });
}

/**
 * Ensure a slug is unique in the Post table.
 * If the slug already exists, appends -1, -2, etc. until unique.
 *
 * @param slug - The base slug to check
 * @param existingId - Optional post ID to exclude (for updates)
 * @returns A unique slug string
 */
export async function ensureUniqueSlug(
  slug: string,
  existingId?: string
): Promise<string> {
  let candidate = slug;
  let counter = 0;

  while (true) {
    const existing = await prisma.post.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    // Slug is available if no post uses it, or it belongs to the post being updated
    if (!existing || existing.id === existingId) {
      return candidate;
    }

    counter++;
    candidate = `${slug}-${counter}`;
  }
}
