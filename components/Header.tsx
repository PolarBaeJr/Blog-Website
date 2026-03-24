import Link from 'next/link';
import prisma from '@/lib/prisma';

async function getSiteSettings() {
  const settings = await prisma.siteSettings.findFirst({
    where: { id: 'singleton' },
  });
  return settings ?? { blogTitle: 'PolarDev', blogDescription: 'A simple blog' };
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
          <div className="relative group">
            <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Blogs
              <svg className="h-3 w-3 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute left-0 top-full pt-2 hidden group-hover:block z-50 min-w-[160px]">
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 py-1 overflow-hidden">
                <Link href="/posts" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">All Posts</Link>
                <Link href="/blogs" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">By Author</Link>
                <Link href="/categories" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">By Category</Link>
              </div>
            </div>
          </div>
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
