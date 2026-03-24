export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = { title: 'Browse by Category' };

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    where: { posts: { some: { published: true } } },
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse by Category</h1>
          <p className="text-gray-600 mb-8">Filter posts by topic</p>
          {categories.length === 0 ? (
            <p className="text-gray-500 text-center py-12">No categories with published posts yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/posts?category=${cat.slug}`}
                  className="block rounded-xl border border-gray-200 bg-white p-6 hover:shadow-md hover:border-green-300 transition-all"
                >
                  <p className="font-semibold text-gray-900 text-lg">{cat.name}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {cat._count.posts} {cat._count.posts === 1 ? 'post' : 'posts'}
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
