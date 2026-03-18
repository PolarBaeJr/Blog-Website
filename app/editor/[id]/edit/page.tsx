import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';
import EditPostClient from './EditPostClient';

interface PageProps {
  params: { id: string };
}

/**
 * Edit post page.
 * Fetches the post from database, validates ownership,
 * and passes data to the client component for editing.
 */
export default async function EditPostPage({ params }: PageProps) {
  const session = await requireAuth();

  // Fetch post with category and tags
  const post = await prisma.post.findUnique({
    where: { id: params.id },
    include: {
      category: {
        select: { id: true, name: true, slug: true },
      },
      tags: {
        select: {
          tag: {
            select: { id: true, name: true, slug: true },
          },
        },
      },
    },
  });

  // Post not found
  if (!post) {
    notFound();
  }

  // User is not the author
  if (post.authorId !== session.user.id) {
    return (
      <div className="rounded-md bg-red-50 border border-red-200 p-6">
        <h2 className="text-lg font-semibold text-red-900 mb-2">Access Denied</h2>
        <p className="text-sm text-red-700">
          You do not have permission to edit this post. Only the author can edit their posts.
        </p>
      </div>
    );
  }

  // Flatten tags from { tag: { id, name, slug } }[] to { id, name, slug }[]
  const flattenedPost = {
    id: post.id,
    title: post.title,
    content: post.content,
    excerpt: post.excerpt,
    coverImage: post.coverImage,
    published: post.published,
    categoryId: post.categoryId,
    tags: post.tags.map((pt) => pt.tag),
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Edit Post</h1>
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <EditPostClient post={flattenedPost} />
      </div>
    </div>
  );
}
