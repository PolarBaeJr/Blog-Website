import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/auth-helpers';
import { categorySchema } from '@/lib/validation';
import { generateSlug } from '@/lib/slug';

/**
 * GET /api/categories — List all categories with post counts (public).
 *
 * Returns: { categories: [{ id, name, slug, _count: { posts } }] }
 */
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/categories — Create a new category (auth required).
 *
 * Body: { name: string } (1-50 chars)
 * Returns 201 with created category, or 409 if name/slug already exists.
 */
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const parsed = categorySchema.safeParse(body);

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
        { error: 'Could not generate a valid slug from the category name' },
        { status: 400 }
      );
    }

    // Check for existing category with same name or slug
    const existing = await prisma.category.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: 'insensitive' } },
          { slug },
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A category with this name already exists' },
        { status: 409 }
      );
    }

    const category = await prisma.category.create({
      data: { name, slug },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
});
