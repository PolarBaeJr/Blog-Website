import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { cache } from 'react';
import prisma from '@/lib/prisma';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TagBadge from '@/components/TagBadge';
import CommentSection from '@/components/CommentSection';
import { sanitizeHtml } from '@/lib/sanitize';

export const revalidate = 60;

interface PostPageProps {
  params: { slug: string; postSlug: string };
}

const getPost = cache(async function getPost(postSlug: string) {
  return prisma.post.findFirst({
    where: { slug: postSlug, published: true },
    select: {
      id: true,
      title: true,
      content: true,
      excerpt: true,
      coverImage: true,
      createdAt: true,
      author: {
        select: { name: true, slug: true },
      },
      category: {
        select: { name: true, slug: true },
      },
      tags: {
        select: {
          tag: {
            select: { name: true, slug: true },
          },
        },
      },
    },
  });
});

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const post = await getPost(params.postSlug);
  if (!post || post.author.slug !== params.slug) {
    return { title: 'Not Found' };
  }
  return { title: post.title };
}

export default async function BlogPostPage({ params }: PostPageProps) {
  const post = await getPost(params.postSlug);

  if (!post || post.author.slug !== params.slug) {
    notFound();
  }

  const formattedDate = format(new Date(post.createdAt), 'MMMM d, yyyy');
  const sanitizedContent = sanitizeHtml(post.content);

  const rawComments = await prisma.comment.findMany({
    where: { postId: post.id, approved: true },
    select: { id: true, authorName: true, content: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  const initialComments = rawComments.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-4 py-8">
          {/* Cover Image */}
          {post.coverImage && (
            <div className="relative mb-8 h-64 w-full overflow-hidden rounded-lg sm:h-80 md:h-96">
              <Image
                src={post.coverImage}
                alt={post.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 768px"
                priority
              />
            </div>
          )}

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            {post.title}
          </h1>

          {/* Meta: author, date, category */}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <span>{post.author.name}</span>
            <span>&middot;</span>
            <time dateTime={post.createdAt.toISOString()}>{formattedDate}</time>
            {post.category && (
              <>
                <span>&middot;</span>
                <Link
                  href={`/posts?category=${encodeURIComponent(post.category.slug)}`}
                  className="inline-flex items-center rounded-full bg-green-100 px-3 py-0.5 text-xs font-medium text-green-800 hover:bg-green-200 transition-colors"
                >
                  {post.category.name}
                </Link>
              </>
            )}
          </div>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {post.tags.map((pt) => (
                <TagBadge key={pt.tag.slug} name={pt.tag.name} slug={pt.tag.slug} />
              ))}
            </div>
          )}

          {/* Post Content */}
          <div
            className="prose prose-lg mt-8 max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-img:rounded-lg"
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />
        </article>

        {/* Comments */}
        <div className="mx-auto max-w-3xl px-4 pb-12">
          <CommentSection postId={post.id} initialComments={initialComments} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
