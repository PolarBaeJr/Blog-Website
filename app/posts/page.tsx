import { Metadata } from 'next';
import prisma from '@/lib/prisma';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PostCard from '@/components/PostCard';
import Pagination from '@/components/Pagination';

export const dynamic = 'force-dynamic';

const POSTS_PER_PAGE = 10;

interface PostsPageProps {
  searchParams: { page?: string; tag?: string; category?: string; author?: string; search?: string };
}

async function getSiteSettings() {
  const settings = await prisma.siteSettings.findFirst({
    where: { id: 'singleton' },
  });
  return settings ?? { blogTitle: 'PolarDev', blogDescription: 'A simple blog' };
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: `Blog — ${settings.blogTitle}`,
    description: settings.blogDescription,
  };
}

export default async function PostsPage({ searchParams }: PostsPageProps) {
  const page = Math.max(parseInt(searchParams.page || '1', 10) || 1, 1);
  const tagSlug = searchParams.tag || null;
  const categorySlug = searchParams.category || null;
  const authorSlug = searchParams.author || null;
  const search = searchParams.search || null;

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

  if (authorSlug) {
    where.author = { slug: authorSlug };
  }

  if (search) {
    where.title = { contains: search, mode: 'insensitive' };
  }

  const [posts, total, authors, categories, activeTag, activeCategory] = await Promise.all([
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
          select: { name: true, slug: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: POSTS_PER_PAGE,
      skip: (page - 1) * POSTS_PER_PAGE,
    }),
    prisma.post.count({ where }),
    prisma.user.findMany({
      where: { posts: { some: { published: true } } },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { posts: { where: { published: true } } } },
      },
    }),
    prisma.category.findMany({
      where: { posts: { some: { published: true } } },
      select: { id: true, name: true, slug: true, _count: { select: { posts: { where: { published: true } } } } },
      orderBy: { name: 'asc' },
    }),
    // active tag name (only if filtering by tag)
    tagSlug ? prisma.tag.findUnique({ where: { slug: tagSlug }, select: { name: true } }) : null,
    // active category name (only if filtering by category)
    categorySlug ? prisma.category.findUnique({ where: { slug: categorySlug }, select: { name: true } }) : null,
  ]);

  // Fetch tags separately to avoid ARM64 composite-key join table panic
  const postIds = posts.map((p) => p.id);
  const postTags = postIds.length > 0
    ? await prisma.postTag.findMany({
        where: { postId: { in: postIds } },
        select: { postId: true, tag: { select: { name: true, slug: true } } },
      })
    : [];
  const tagsByPostId = postTags.reduce<Record<string, { name: string; slug: string }[]>>(
    (acc, pt) => {
      if (!acc[pt.postId]) acc[pt.postId] = [];
      acc[pt.postId].push(pt.tag);
      return acc;
    },
    {}
  );
  const postCoAuthors = postIds.length > 0
    ? await prisma.postCoAuthor.findMany({
        where: { postId: { in: postIds } },
        select: { postId: true, name: true },
      })
    : [];
  const coAuthorsByPostId = postCoAuthors.reduce<Record<string, { name: string }[]>>(
    (acc, pc) => {
      if (!acc[pc.postId]) acc[pc.postId] = [];
      acc[pc.postId].push({ name: pc.name });
      return acc;
    },
    {}
  );
  const postsWithTags = posts.map((p) => ({ ...p, tags: tagsByPostId[p.id] ?? [], coAuthors: coAuthorsByPostId[p.id] ?? [] }));

  const totalPages = Math.ceil(total / POSTS_PER_PAGE);

  // Build base path for pagination (preserves filter params)
  let basePath = '/posts';
  const filterParams: string[] = [];
  if (tagSlug) filterParams.push(`tag=${encodeURIComponent(tagSlug)}`);
  if (categorySlug) filterParams.push(`category=${encodeURIComponent(categorySlug)}`);
  if (authorSlug) filterParams.push(`author=${encodeURIComponent(authorSlug)}`);
  if (search) filterParams.push(`search=${encodeURIComponent(search)}`);
  if (filterParams.length > 0) {
    basePath = `/posts?${filterParams.join('&')}`;
  }

  // Resolve active filter names for display
  const activeTagName: string | null = activeTag?.name ?? null;
  const activeCategoryName: string | null = activeCategory?.name ?? null;
  let activeAuthorName: string | null = null;

  if (authorSlug) {
    const author = authors.find((a) => a.slug === authorSlug);
    activeAuthorName = author?.name ?? null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-8">
          {/* Search bar */}
          <form method="GET" action="/posts" className="mb-6">
            <div className="flex gap-2">
              <input
                type="text"
                name="search"
                defaultValue={search || ''}
                placeholder="Search posts..."
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                Search
              </button>
              {search && <a href="/posts" className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Clear</a>}
            </div>
          </form>

          {/* Author filter cards */}
          {authors.length > 0 && (
            <div className="mb-8 flex flex-wrap gap-3">
              {authors.map((author) => (
                <a
                  key={author.id}
                  href={`/posts?author=${encodeURIComponent(author.slug ?? '')}`}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    authorSlug === author.slug
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {author.name} ({author._count.posts})
                </a>
              ))}
            </div>
          )}

          {/* Category filters */}
          {categories.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Category</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <a
                    key={cat.id}
                    href={`/posts?category=${encodeURIComponent(cat.slug)}`}
                    className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                      categorySlug === cat.slug
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {cat.name} ({cat._count.posts})
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Active filters */}
          {(activeTagName || activeCategoryName || activeAuthorName || search) && (
            <div className="mb-6 flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-500">Filtering by:</span>
              {activeAuthorName && (
                <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800">
                  Author: {activeAuthorName}
                </span>
              )}
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
              {search && (
                <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-sm text-purple-800">
                  Search: &quot;{search}&quot;
                </span>
              )}
              <a
                href="/posts"
                className="ml-2 text-sm text-red-500 hover:text-red-700 transition-colors"
              >
                Clear all filters
              </a>
            </div>
          )}

          {/* Post list */}
          {postsWithTags.length === 0 ? (
            <div className="py-20 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No posts found</h2>
              <p className="text-gray-600">
                {activeTagName || activeCategoryName || activeAuthorName || search
                  ? 'No posts match the current filters. Try removing some filters.'
                  : 'No posts have been published yet. Check back soon!'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {postsWithTags.map((post) => (
                <PostCard
                  key={post.id}
                  postSlug={post.slug}
                  title={post.title}

                  excerpt={post.excerpt}
                  authorName={post.author.name}
                  authorSlug={post.author.slug ?? ''}
                  date={post.createdAt}
                  tags={post.tags}
                  coverImage={post.coverImage}
                  coAuthors={post.coAuthors}
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
