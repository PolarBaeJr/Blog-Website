import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { commentSchema } from '@/lib/validation';

// ─── In-Memory Rate Limiter ──────────────────────────────────────────────────
// Maps IP address to last comment timestamp.
// Cleared every 5 minutes to prevent memory leaks.

const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 30 * 1000; // 30 seconds
const RATE_LIMIT_CLEANUP_MS = 5 * 60 * 1000; // 5 minutes

// Periodic cleanup of stale entries
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    rateLimitMap.forEach((timestamp, ip) => {
      if (now - timestamp > RATE_LIMIT_WINDOW_MS) {
        rateLimitMap.delete(ip);
      }
    });
  }, RATE_LIMIT_CLEANUP_MS);
}

/**
 * Strip all HTML tags from a string, leaving only plain text.
 */
function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Get client IP from request headers (supports proxied setups).
 */
function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    // Take the first IP in the chain (the original client)
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  // Fallback — in production behind Nginx this should not be reached
  return 'unknown';
}

// ─── GET /api/comments ───────────────────────────────────────────────────────
// List approved comments for a specific post.
// Query params: postId (required), limit (default 50), offset (default 0)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json(
        { error: 'postId query parameter is required' },
        { status: 400 }
      );
    }

    const limit = Math.min(
      Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1),
      50
    );
    const offset = Math.max(
      parseInt(searchParams.get('offset') || '0', 10) || 0,
      0
    );

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: {
          postId,
          approved: true,
        },
        select: {
          id: true,
          authorName: true,
          content: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.comment.count({
        where: {
          postId,
          approved: true,
        },
      }),
    ]);

    return NextResponse.json({ comments, total, limit, offset });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

// ─── POST /api/comments ──────────────────────────────────────────────────────
// Create a new comment on a published post.
// Body: { authorName, authorEmail?, content, postId, website? (honeypot) }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Honeypot check — if the hidden "website" field is filled, silently reject.
    // Bots typically fill all form fields including hidden ones.
    if (body.website) {
      // Return 201 to avoid tipping off the bot that it was caught
      return NextResponse.json(
        { comment: { id: 'ok', authorName: body.authorName || '', content: '', createdAt: new Date() } },
        { status: 201 }
      );
    }

    // Validate input with Zod schema
    const parseResult = commentSchema.safeParse(body);
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    const { authorName, authorEmail, content, postId } = parseResult.data;

    // Rate limiting by IP
    const clientIp = getClientIp(req);
    const lastCommentTime = rateLimitMap.get(clientIp);
    if (lastCommentTime && Date.now() - lastCommentTime < RATE_LIMIT_WINDOW_MS) {
      return NextResponse.json(
        { error: 'Please wait before posting another comment' },
        { status: 429 }
      );
    }

    // Verify the post exists and is published
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, published: true },
    });

    if (!post || !post.published) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Strip HTML from comment content (plain text only)
    const sanitizedContent = stripHtml(content);

    if (sanitizedContent.trim().length === 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: [{ field: 'content', message: 'Comment content cannot be empty' }] },
        { status: 400 }
      );
    }

    // Create the comment
    const comment = await prisma.comment.create({
      data: {
        authorName,
        authorEmail: authorEmail || null,
        content: sanitizedContent,
        postId,
        approved: true, // Auto-approve for now
      },
      select: {
        id: true,
        authorName: true,
        content: true,
        createdAt: true,
      },
    });

    // Record the rate limit timestamp after successful creation
    rateLimitMap.set(clientIp, Date.now());

    return NextResponse.json({ comment }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}
