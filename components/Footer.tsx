import prisma from '@/lib/prisma';

async function getSiteSettings() {
  const settings = await prisma.siteSettings.findFirst({
    where: { id: 'singleton' },
  });
  return settings ?? { blogDescription: 'A simple blog', footerText: '' };
}

export default async function Footer() {
  const settings = await getSiteSettings();

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-4xl px-4 py-8 text-center">
        <p className="text-sm text-gray-500">
          {settings.footerText || settings.blogDescription}
        </p>
      </div>
    </footer>
  );
}
