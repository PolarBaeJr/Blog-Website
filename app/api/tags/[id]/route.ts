import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/auth-helpers';
import { tagSchema } from '@/lib/validation';
import { generateSlug } from '@/lib/slug';

/**
 * PUT /api/tags/[id] — Update a tag's name and slug (auth required).
 *
 * Body: { name: string } (1-50 chars)
 * Returns updated tag, or 404 if not found, 409 if name conflicts.
 */
export const PUT = withAuth(
  async (req: NextRequest, _session) => {
    try {
      const id = req.nextUrl.pathname.split('/').pop();
      if (!id) {
        return NextResponse.json(
          { error: 'Tag ID is required' },
          { status: 400 }
        );
      }

      const body = await req.json();
      const parsed = tagSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      // Check tag exists
      const existingTag = await prisma.tag.findUnique({ where: { id } });
      if (!existingTag) {
        return NextResponse.json(
          { error: 'Tag not found' },
          { status: 404 }
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

      // Check for name/slug conflict with a different tag
      const conflict = await prisma.tag.findFirst({
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
          { error: 'A tag with this name already exists' },
          { status: 409 }
        );
      }

      const tag = await prisma.tag.update({
        where: { id },
        data: { name, slug },
      });

      return NextResponse.json({ tag });
    } catch (error) {
      console.error('Error updating tag:', error);
      return NextResponse.json(
        { error: 'Failed to update tag' },
        { status: 500 }
      );
    }
  }
);

/**
 * DELETE /api/tags/[id] — Delete a tag (auth required).
 *
 * Cascades to PostTag records (handled by Prisma schema onDelete: Cascade).
 * Returns 204 on success, 404 if not found.
 */
export const DELETE = withAuth(
  async (req: NextRequest) => {
    try {
      const id = req.nextUrl.pathname.split('/').pop();
      if (!id) {
        return NextResponse.json(
          { error: 'Tag ID is required' },
          { status: 400 }
        );
      }

      // Check tag exists
      const existingTag = await prisma.tag.findUnique({ where: { id } });
      if (!existingTag) {
        return NextResponse.json(
          { error: 'Tag not found' },
          { status: 404 }
        );
      }

      await prisma.tag.delete({ where: { id } });

      return new NextResponse(null, { status: 204 });
    } catch (error) {
      console.error('Error deleting tag:', error);
      return NextResponse.json(
        { error: 'Failed to delete tag' },
        { status: 500 }
      );
    }
  }
);
