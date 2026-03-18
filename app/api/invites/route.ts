import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';
import { inviteSchema } from '@/lib/validation';
import { generateInviteToken } from '@/lib/tokens';
import { sendInviteEmail } from '@/lib/email';

/**
 * POST /api/invites — Create a new invite (auth required)
 *
 * Body: { email: string }
 * Returns 201 with invite data including the invite URL for manual sharing.
 */
export const POST = withAuth(async (req, session) => {
  try {
    const body = await req.json();
    const parsed = inviteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    // Check if an active (unused, unexpired) invite already exists for this email
    const existingInvite = await prisma.invite.findFirst({
      where: {
        email,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvite) {
      return NextResponse.json(
        { error: 'An active invite already exists for this email address' },
        { status: 409 }
      );
    }

    // Check if a user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    const token = generateInviteToken();
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    const invite = await prisma.invite.create({
      data: {
        email,
        token,
        expiresAt,
        createdById: session.user.id,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    // Build invite URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/invite/${token}`;

    // Send invite email (fire-and-forget — does not block response)
    sendInviteEmail(email, inviteUrl, session.user.name);

    return NextResponse.json(
      {
        invite: {
          ...invite,
          inviteUrl,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[api/invites] POST error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to create invite' },
      { status: 500 }
    );
  }
});

/**
 * GET /api/invites — List all invites (auth required)
 *
 * Returns all invites created by any user, with used/expired status.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = withAuth(async (req, session) => {
  try {
    const invites = await prisma.invite.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        used: true,
        createdAt: true,
        expiresAt: true,
        createdBy: {
          select: {
            name: true,
          },
        },
      },
    });

    // Add computed status field
    const now = new Date();
    const invitesWithStatus = invites.map((invite) => ({
      ...invite,
      status: invite.used
        ? 'used' as const
        : invite.expiresAt < now
          ? 'expired' as const
          : 'pending' as const,
    }));

    return NextResponse.json({ invites: invitesWithStatus });
  } catch (error) {
    console.error('[api/invites] GET error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to fetch invites' },
      { status: 500 }
    );
  }
});
