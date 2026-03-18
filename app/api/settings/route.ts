import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';
import { settingsSchema } from '@/lib/validation';
import { stripHtml } from '@/lib/sanitize';

/**
 * GET /api/settings — Return the singleton SiteSettings record (public)
 *
 * If no record exists, creates one with defaults and returns it.
 */
export async function GET() {
  try {
    const settings = await prisma.siteSettings.upsert({
      where: { id: 'singleton' },
      update: {},
      create: {
        id: 'singleton',
        blogTitle: 'My Blog',
        blogDescription: 'Welcome to our blog',
        footerText: '',
      },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('[api/settings] GET error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings — Update site settings (auth required)
 *
 * Body: { blogTitle?, blogDescription?, footerText? }
 * All fields optional. Text inputs are stripped of HTML tags.
 */
export const PUT = withAuth(async (req) => {
  try {
    const body = await req.json();
    const parsed = settingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { blogTitle, blogDescription, footerText } = parsed.data;

    // Build update data, sanitizing all text inputs by stripping HTML
    const updateData: Record<string, string> = {};

    if (blogTitle !== undefined) {
      updateData.blogTitle = stripHtml(blogTitle);
    }
    if (blogDescription !== undefined) {
      updateData.blogDescription = stripHtml(blogDescription);
    }
    if (footerText !== undefined) {
      updateData.footerText = stripHtml(footerText);
    }

    const settings = await prisma.siteSettings.upsert({
      where: { id: 'singleton' },
      update: updateData,
      create: {
        id: 'singleton',
        blogTitle: updateData.blogTitle || 'My Blog',
        blogDescription: updateData.blogDescription || 'Welcome to our blog',
        footerText: updateData.footerText || '',
      },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('[api/settings] PUT error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
});
