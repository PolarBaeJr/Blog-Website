import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/auth-helpers';
import { categorySchema } from '@/lib/validation';
import { generateSlug } from '@/lib/slug';

/**
 * PUT /api/categories/[id] — Update a category's name and slug (auth required).
 *
 * Body: { name: string } (1-50 chars)
 * Returns updated category, or 404 if not found, 409 if name conflicts.
 */
export const PUT = withAuth(
  async (req: NextRequest) => {
    try {
      const id = req.nextUrl.pathname.split('/').pop();
      if (!id) {
        return NextResponse.json(
          { error: 'Category ID is required' },
          { status: 400 }
        );
      }

      const body = await req.json();
      const parsed = categorySchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      // Check category exists
      const existingCategory = await prisma.category.findUnique({ where: { id } });
      if (!existingCategory) {
        return NextResponse.json(
          { error: 'Category not found' },
          { status: 404 }
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

      // Check for name/slug conflict with a different category
      const conflict = await prisma.category.findFirst({
        where: {
          id: { not: id },
          OR: [
            { name: { equals: name, mode: 'insensitive' } },
            { slug },
          ],
        },
      });

      if (conflict) {
        return NextResponse.json(
          { error: 'A category with this name already exists' },
          { status: 409 }
        );
      }

      const category = await prisma.category.update({
        where: { id },
        data: { name, slug },
      });

      return NextResponse.json({ category });
    } catch (error) {
      console.error('Error updating category:', error);
      return NextResponse.json(
        { error: 'Failed to update category' },
        { status: 500 }
      );
    }
  }
);

/**
 * DELETE /api/categories/[id] — Delete a category (auth required).
 *
 * Posts using this category will have their categoryId set to null
 * (no cascade delete — posts are preserved, just uncategorized).
 * Returns 204 on success, 404 if not found.
 */
export const DELETE = withAuth(
  async (req: NextRequest) => {
    try {
      const id = req.nextUrl.pathname.split('/').pop();
      if (!id) {
        return NextResponse.json(
          { error: 'Category ID is required' },
          { status: 400 }
        );
      }

      // Check category exists
      const existingCategory = await prisma.category.findUnique({ where: { id } });
      if (!existingCategory) {
        return NextResponse.json(
          { error: 'Category not found' },
          { status: 404 }
        );
      }

      // Nullify categoryId on posts that reference this category, then delete
      await prisma.$transaction([
        prisma.post.updateMany({
          where: { categoryId: id },
          data: { categoryId: null },
        }),
        prisma.category.delete({ where: { id } }),
      ]);

      return new NextResponse(null, { status: 204 });
    } catch (error) {
      console.error('Error deleting category:', error);
      return NextResponse.json(
        { error: 'Failed to delete category' },
        { status: 500 }
      );
    }
  }
);
