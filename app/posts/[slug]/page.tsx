import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import prisma from '@/lib/prisma';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TagBadge from '@/components/TagBadge';
import CommentSection from '@/components/CommentSection';

interface PostPageProps {
  params: { slug: string };
}

async function getPost(slug: string) {
  const post = await prisma.post.findUnique({
    where: { slug },
    include: {
      author: {
        select: { name: true },
      },
      category: {
        select: { name: true, slug: true },
      },
      tags: {
        include: {
          tag: {
            select: { name: true, slug: true },
          },
        },
      },
      comments: {
        where: { approved: true },
        select: {
          id: true,
          authorName: true,
          content: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  });

  return post;
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const post = await getPost(params.slug);

  if (!post || !post.published) {
    return { title: 'Post Not Found' };
  }

  return {
    title: post.title,
    description: post.excerpt || `Read "${post.title}" on our blog`,
  };
}

export async function generateStaticParams() {
  const posts = await prisma.post.findMany({
    where: { published: true },
    select: { slug: true },
  });

  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function PostPage({ params }: PostPageProps) {
  const post = await getPost(params.slug);

  if (!post || !post.published) {
    notFound();
  }

  const formattedDate = format(new Date(post.createdAt), 'MMMM d, yyyy');

  // Serialize comments for client component
  const serializedComments = post.comments.map((comment) => ({
    id: comment.id,
    authorName: comment.authorName,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
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
                  href={`/?category=${encodeURIComponent(post.category.slug)}`}
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

          {/* Post Content — sanitized at write time by Post CRUD API (task-008) */}
          <div
            className="prose prose-lg mt-8 max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-img:rounded-lg"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Comments */}
          <CommentSection
            postId={post.id}
            initialComments={serializedComments}
          />
        </article>
      </main>
      <Footer />
    </div>
  );
}
