'use client';

import { useRouter } from 'next/navigation';
import PostForm from '@/components/PostForm';

/**
 * New post page.
 * Renders PostForm with no initial data.
 * Redirects to /editor dashboard on successful post creation.
 */
export default function NewPostPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/editor');
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Create New Post</h1>
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <PostForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
