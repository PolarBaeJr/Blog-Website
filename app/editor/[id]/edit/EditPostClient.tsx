'use client';

import { useRouter } from 'next/navigation';
import PostForm from '@/components/PostForm';

interface Tag {
  id: string;
  name: string;
  slug: string;
}

interface PostData {
  id: string;
  title: string;
  content: string;
  excerpt?: string | null;
  coverImage?: string | null;
  published: boolean;
  categoryId?: string | null;
  tags: Tag[];
}

interface EditPostClientProps {
  post: PostData;
}

/**
 * Client wrapper for editing posts.
 * Handles navigation after successful update.
 */
export default function EditPostClient({ post }: EditPostClientProps) {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/editor');
  };

  return <PostForm post={post} onSuccess={handleSuccess} />;
}
