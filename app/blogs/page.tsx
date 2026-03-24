export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Blogs',
};

export default async function BlogsPage() {
  const authors = await prisma.user.findMany({
    where: {
      posts: { some: { published: true } },
      slug: { not: null },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { posts: { where: { published: true } } } },
    },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Blogs</h1>
          <p className="text-gray-600 mb-8">Browse posts by author</p>

          {authors.length === 0 ? (
            <p className="text-gray-500 text-center py-12">No published posts yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {authors.map((author) => (
                <Link
                  key={author.id}
                  href={`/blogs/${author.slug!}`}
                  className="block rounded-xl border border-gray-200 bg-white p-6 hover:shadow-md hover:border-blue-300 transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                      {author.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{author.name}</p>
                      <p className="text-xs text-gray-500">@{author.slug}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    {author._count.posts} {author._count.posts === 1 ? 'post' : 'posts'}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
