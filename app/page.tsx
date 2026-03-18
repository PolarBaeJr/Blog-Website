import { Metadata } from 'next';
import prisma from '@/lib/prisma';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PostCard from '@/components/PostCard';
import Pagination from '@/components/Pagination';

const POSTS_PER_PAGE = 10;

interface HomePageProps {
  searchParams: { page?: string; tag?: string; category?: string };
}

async function getSiteSettings() {
  const settings = await prisma.siteSettings.findFirst({
    where: { id: 'singleton' },
  });
  return settings ?? { blogTitle: 'My Blog', blogDescription: 'A simple blog' };
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: settings.blogTitle,
    description: settings.blogDescription,
  };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const page = Math.max(parseInt(searchParams.page || '1', 10) || 1, 1);
  const tagSlug = searchParams.tag || null;
  const categorySlug = searchParams.category || null;

  // Build query filter for published posts
  const where: Record<string, unknown> = { published: true };

  if (tagSlug) {
    where.tags = {
      some: {
        tag: { slug: tagSlug },
      },
    };
  }

  if (categorySlug) {
    where.category = { slug: categorySlug };
  }

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        coverImage: true,
        createdAt: true,
        author: {
          select: { name: true },
        },
        tags: {
          select: {
            tag: {
              select: { name: true, slug: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: POSTS_PER_PAGE,
      skip: (page - 1) * POSTS_PER_PAGE,
    }),
    prisma.post.count({ where }),
  ]);

  const totalPages = Math.ceil(total / POSTS_PER_PAGE);

  // Build base path for pagination (preserves filter params)
  let basePath = '/';
  const filterParams: string[] = [];
  if (tagSlug) filterParams.push(`tag=${encodeURIComponent(tagSlug)}`);
  if (categorySlug) filterParams.push(`category=${encodeURIComponent(categorySlug)}`);
  if (filterParams.length > 0) {
    basePath = `/?${filterParams.join('&')}`;
  }

  // Fetch active tag/category names for display
  let activeTagName: string | null = null;
  let activeCategoryName: string | null = null;

  if (tagSlug) {
    const tag = await prisma.tag.findUnique({ where: { slug: tagSlug }, select: { name: true } });
    activeTagName = tag?.name ?? null;
  }
  if (categorySlug) {
    const category = await prisma.category.findUnique({ where: { slug: categorySlug }, select: { name: true } });
    activeCategoryName = category?.name ?? null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-8">
          {/* Active filters */}
          {(activeTagName || activeCategoryName) && (
            <div className="mb-6 flex items-center gap-2">
              <span className="text-sm text-gray-500">Filtering by:</span>
              {activeTagName && (
                <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800">
                  Tag: {activeTagName}
                </span>
              )}
              {activeCategoryName && (
                <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm text-green-800">
                  Category: {activeCategoryName}
                </span>
              )}
              <a
                href="/"
                className="ml-2 text-sm text-red-500 hover:text-red-700 transition-colors"
              >
                Clear filters
              </a>
            </div>
          )}

          {/* Post list */}
          {posts.length === 0 ? (
            <div className="py-20 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No posts found</h2>
              <p className="text-gray-600">
                {activeTagName || activeCategoryName
                  ? 'No posts match the current filters. Try removing some filters.'
                  : 'No posts have been published yet. Check back soon!'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  title={post.title}
                  slug={post.slug}
                  excerpt={post.excerpt}
                  authorName={post.author.name}
                  date={post.createdAt}
                  tags={post.tags.map((pt) => pt.tag)}
                  coverImage={post.coverImage}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            basePath={basePath}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
