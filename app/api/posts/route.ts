import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth, getSession } from '@/lib/auth-helpers';
import { createPostSchema } from '@/lib/validation';
import { sanitizeHtml } from '@/lib/sanitize';
import { generateSlug, ensureUniqueSlug } from '@/lib/slug';

/**
 * GET /api/posts — List published posts (public) or user's posts (auth).
 *
 * Query params:
 * - page (default 1)
 * - limit (default 10, max 50)
 * - tag (slug) — filter by tag
 * - category (slug) — filter by category
 * - search — search in title
 * - my=true — fetch current user's posts (auth required)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const tag = searchParams.get('tag');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const my = searchParams.get('my') === 'true';
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    // If fetching user's posts, require auth and filter by authorId
    if (my) {
      const session = await getSession();
      if (!session?.user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      where.authorId = session.user.id;
    } else {
      // Otherwise, only show published posts
      where.published = true;
    }

    if (tag) {
      where.tags = {
        some: {
          tag: { slug: tag },
        },
      };
    }

    if (category) {
      where.category = { slug: category };
    }

    if (search) {
      where.title = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: limit,
        orderBy: my ? { updatedAt: 'desc' } : { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          coverImage: true,
          published: true,
          createdAt: true,
          updatedAt: true,
          author: {
            select: { id: true, name: true },
          },
          category: {
            select: { id: true, name: true, slug: true },
          },
          tags: {
            select: {
              tag: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
          coAuthors: { select: { id: true, name: true } },
        },
      }),
      prisma.post.count({ where }),
    ]);

    // Flatten tag structure for cleaner response
    const formattedPosts = posts.map((post) => ({
      ...post,
      tags: post.tags.map((pt) => pt.tag),
      coAuthors: post.coAuthors,
    }));

    return NextResponse.json({
      posts: formattedPosts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/posts — Create a new post (auth required).
 */
export const POST = withAuth(async (req, session) => {
  try {
    const body = await req.json();
    const parsed = createPostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { title, content, excerpt, coverImage, published, categoryId, tagIds, coAuthors } = parsed.data;

    // Sanitize HTML content
    const sanitizedContent = sanitizeHtml(content);

    // Generate unique slug
    const baseSlug = generateSlug(title);
    const slug = await ensureUniqueSlug(baseSlug);

    // Validate coverImage is a safe relative path under /uploads/
    if (coverImage && coverImage !== '' && !coverImage.startsWith('/uploads/')) {
      return NextResponse.json(
        { error: 'Cover image must be an uploaded file' },
        { status: 400 }
      );
    }

    // Build post data
    const post = await prisma.post.create({
      data: {
        title,
        slug,
        content: sanitizedContent,
        excerpt: excerpt || null,
        coverImage: coverImage || null,
        published,
        authorId: session.user.id,
        categoryId: categoryId || null,
        tags: {
          create: (tagIds || []).map((tagId) => ({
            tag: { connect: { id: tagId } },
          })),
        },
        coAuthors: {
          create: (coAuthors || []).map((name) => ({ name })),
        },
      },
      include: {
        author: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, slug: true } },
        tags: {
          select: {
            tag: { select: { id: true, name: true, slug: true } },
          },
        },
        coAuthors: { select: { id: true, name: true } },
      },
    });

    // Flatten tags in response
    const formattedPost = {
      ...post,
      tags: post.tags.map((pt) => pt.tag),
      coAuthors: post.coAuthors,
    };

    return NextResponse.json(formattedPost, { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
});
