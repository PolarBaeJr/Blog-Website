import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/auth-helpers';
import { tagSchema } from '@/lib/validation';
import { generateSlug } from '@/lib/slug';

/**
 * GET /api/tags — List all tags with post counts (public).
 *
 * Returns: { tags: [{ id, name, slug, _count: { posts } }] }
 */
export async function GET() {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });

    return NextResponse.json({ tags });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tags — Create a new tag (auth required).
 *
 * Body: { name: string } (1-50 chars)
 * Returns 201 with created tag, or 409 if name/slug already exists.
 */
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const parsed = tagSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name } = parsed.data;
    const slug = generateSlug(name);

    if (!slug) {
      return NextResponse.json(
        { error: 'Could not generate a valid slug from the tag name' },
        { status: 400 }
      );
    }

    // Check for existing tag with same name or slug
    const existing = await prisma.tag.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: 'insensitive' } },
          { slug },
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A tag with this name already exists' },
        { status: 409 }
      );
    }

    const tag = await prisma.tag.create({
      data: { name, slug },
    });

    return NextResponse.json({ tag }, { status: 201 });
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 }
    );
  }
});
