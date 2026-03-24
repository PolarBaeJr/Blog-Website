import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { registerSchema } from '@/lib/validation';
import { slugifyName } from '@/lib/slugify';

/**
 * In-memory rate limiting for registration endpoint.
 * Tracks registration attempts by IP to prevent brute-force attacks.
 * Key: IP address, Value: timestamp of last attempt.
 */
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute between registration attempts

// Clean up rate limit map every 5 minutes
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((timestamp, ip) => {
    if (now - timestamp > RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.delete(ip);
    }
  });
}, 5 * 60 * 1000);

/**
 * POST /api/invites/register — Register a new user with an invite token
 *
 * Body: { token: string, name: string, email: string, password: string }
 * Returns 201 on success.
 * No authentication required (this IS the registration endpoint).
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting by IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               req.headers.get('x-real-ip') ||
               'unknown';

    const lastAttempt = rateLimitMap.get(ip);
    if (lastAttempt && Date.now() - lastAttempt < RATE_LIMIT_WINDOW_MS) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429 }
      );
    }
    rateLimitMap.set(ip, Date.now());

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { token, name, email, password } = parsed.data;

    // Find the invite by token
    const invite = await prisma.invite.findUnique({
      where: { token },
    });

    if (!invite) {
      return NextResponse.json(
        { error: 'Invalid invite token' },
        { status: 400 }
      );
    }

    // Check if invite is already used
    if (invite.used) {
      return NextResponse.json(
        { error: 'This invite has already been used' },
        { status: 400 }
      );
    }

    // Check if invite has expired
    if (invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'This invite has expired' },
        { status: 400 }
      );
    }

    // Validate email matches the invite email (case-insensitive)
    if (invite.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Email does not match the invite' },
        { status: 400 }
      );
    }

    // Check if a user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password with bcrypt cost factor 12
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate unique slug
    let slug = slugifyName(name);
    const existingSlug = await prisma.user.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${crypto.randomBytes(2).toString('hex')}`;
    }

    // Create user and mark invite as used in a transaction
    await prisma.$transaction([
      prisma.user.create({
        data: {
          email: email.toLowerCase(),
          name,
          slug,
          passwordHash,
        },
      }),
      prisma.invite.update({
        where: { id: invite.id },
        data: { used: true },
      }),
    ]);

    return NextResponse.json(
      { message: 'Registration successful. You can now log in.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('[api/invites/register] POST error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}
