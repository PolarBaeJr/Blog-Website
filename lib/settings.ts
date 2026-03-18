import prisma from './prisma';
import type { SiteSettings } from '@prisma/client';

/**
 * Fetch the singleton SiteSettings record.
 * If none exists, creates one with defaults and returns it.
 * Used by Header, Footer, and other server components.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
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

  return settings;
}
