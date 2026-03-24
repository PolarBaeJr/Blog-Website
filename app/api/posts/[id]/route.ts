import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth-helpers';
import { updatePostSchema } from '@/lib/validation';
import { sanitizeHtml } from '@/lib/sanitize';
import { generateSlug, ensureUniqueSlug } from '@/lib/slug';

/**
 * GET /api/posts/[id] — Get a single post by ID (public).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const post = await prisma.post.findUnique({
      where: { id: params.id },
      include: {
        author: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, slug: true } },
        tags: {
          select: {
            tag: { select: { id: true, name: true, slug: true } },
          },
        },
        comments: {
          where: { approved: true },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            authorName: true,
            content: true,
            createdAt: true,
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Flatten tags
    const formattedPost = {
      ...post,
      tags: post.tags.map((pt) => pt.tag),
    };

    return NextResponse.json(formattedPost);
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json(
      { error: 'Failed to fetch post' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/posts/[id] — Update a post (auth required, author only).
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Find the existing post
    const existingPost = await prisma.post.findUnique({
      where: { id: params.id },
      select: { id: true, authorId: true, title: true, slug: true },
    });

    if (!existingPost) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Authorization: only the author can edit
    if (existingPost.authorId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only edit your own posts' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = updatePostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { title, content, excerpt, coverImage, published, categoryId, tagIds } = parsed.data;

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (title !== undefined) {
      updateData.title = title;
      // Update slug if title changed
      if (title !== existingPost.title) {
        const baseSlug = generateSlug(title);
        updateData.slug = await ensureUniqueSlug(baseSlug, existingPost.id);
      }
    }

    if (content !== undefined) {
      updateData.content = sanitizeHtml(content);
    }

    if (excerpt !== undefined) {
      updateData.excerpt = excerpt || null;
    }

    if (coverImage !== undefined) {
      // Validate coverImage is a safe relative path
      if (coverImage && coverImage !== '' && !coverImage.startsWith('/uploads/')) {
        return NextResponse.json(
          { error: 'Cover image must be an uploaded file' },
          { status: 400 }
        );
      }
      updateData.coverImage = coverImage || null;
    }

    if (published !== undefined) {
      updateData.published = published;
    }

    if (categoryId !== undefined) {
      updateData.categoryId = categoryId || null;
    }

    // Handle tag updates atomically: delete old and create new in one transaction
    if (tagIds !== undefined) {
      await prisma.$transaction([
        prisma.postTag.deleteMany({ where: { postId: existingPost.id } }),
        ...(tagIds.length > 0
          ? [prisma.postTag.createMany({
              data: tagIds.map((tagId) => ({ postId: existingPost.id, tagId })),
            })]
          : []),
      ]);
    }

    const updatedPost = await prisma.post.update({
      where: { id: params.id },
      data: updateData,
      include: {
        author: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, slug: true } },
        tags: {
          select: {
            tag: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    // Flatten tags
    const formattedPost = {
      ...updatedPost,
      tags: updatedPost.tags.map((pt) => pt.tag),
    };

    return NextResponse.json(formattedPost);
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json(
      { error: 'Failed to update post' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/posts/[id] — Delete a post (auth required, author only).
 * Cascade deletes PostTag and Comment records (handled by Prisma schema).
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const post = await prisma.post.findUnique({
      where: { id: params.id },
      select: { id: true, authorId: true },
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Authorization: only the author can delete
    if (post.authorId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own posts' },
        { status: 403 }
      );
    }

    await prisma.post.delete({
      where: { id: params.id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    );
  }
}
