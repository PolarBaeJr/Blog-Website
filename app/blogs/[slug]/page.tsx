export const revalidate = 60;

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PostCard from '@/components/PostCard';
import Pagination from '@/components/Pagination';

const POSTS_PER_PAGE = 10;

interface BlogPageProps {
  params: { slug: string };
  searchParams: { page?: string };
}

export async function generateMetadata({ params }: BlogPageProps): Promise<Metadata> {
  const author = await prisma.user.findUnique({ where: { slug: params.slug }, select: { name: true } });
  if (!author) return { title: 'Not Found' };
  return { title: `${author.name}'s Blog` };
}

export default async function AuthorBlogPage({ params, searchParams }: BlogPageProps) {
  const author = await prisma.user.findUnique({
    where: { slug: params.slug },
    select: { id: true, name: true, slug: true },
  });

  if (!author) notFound();

  const page = Math.max(parseInt(searchParams.page || '1', 10) || 1, 1);

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where: { published: true, authorId: author.id },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        coverImage: true,
        createdAt: true,
        author: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: POSTS_PER_PAGE,
      skip: (page - 1) * POSTS_PER_PAGE,
    }),
    prisma.post.count({ where: { published: true, authorId: author.id } }),
  ]);

  // Fetch tags separately to avoid ARM64 Prisma panic
  const postIds = posts.map((p) => p.id);
  const postTags = postIds.length > 0
    ? await prisma.postTag.findMany({
        where: { postId: { in: postIds } },
        select: { postId: true, tag: { select: { name: true, slug: true } } },
      })
    : [];
  const tagsByPostId = postTags.reduce<Record<string, { name: string; slug: string }[]>>(
    (acc, pt) => { if (!acc[pt.postId]) acc[pt.postId] = []; acc[pt.postId].push(pt.tag); return acc; },
    {}
  );
  const postsWithTags = posts.map((p) => ({ ...p, tags: tagsByPostId[p.id] ?? [] }));
  const totalPages = Math.ceil(total / POSTS_PER_PAGE);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-12">
          {/* Author header */}
          <div className="flex items-center gap-4 mb-10">
            <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-2xl">
              {author.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{author.name}</h1>
              <p className="text-gray-500">@{author.slug ?? params.slug}</p>
            </div>
          </div>

          {postsWithTags.length === 0 ? (
            <p className="text-center text-gray-500 py-12">No published posts yet.</p>
          ) : (
            <div className="space-y-6">
              {postsWithTags.map((post) => (
                <PostCard
                  key={post.id}
                  postSlug={post.slug}
                  title={post.title}

                  excerpt={post.excerpt}
                  authorName={author.name}
                  authorSlug={author.slug ?? params.slug}
                  date={post.createdAt}
                  tags={post.tags}
                  coverImage={post.coverImage}
                />
              ))}
            </div>
          )}

          <Pagination currentPage={page} totalPages={totalPages} basePath={`/blogs/${author.slug ?? params.slug}`} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
