import Link from 'next/link';
import prisma from '@/lib/prisma';

async function getSiteSettings() {
  const settings = await prisma.siteSettings.findFirst({
    where: { id: 'singleton' },
  });
  return settings ?? { blogTitle: 'My Blog', blogDescription: 'A simple blog' };
}

export default async function Header() {
  const settings = await getSiteSettings();

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-bold text-gray-900 hover:text-gray-700 transition-colors">
          {settings.blogTitle}
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Home
          </Link>
          <Link
            href="/editor"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Editor
          </Link>
        </nav>
      </div>
    </header>
  );
}
