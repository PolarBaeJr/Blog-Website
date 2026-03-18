import { Metadata } from 'next';
import { requireAuth } from '@/lib/auth-helpers';
import EditorLayout from '@/components/EditorLayout';

export const metadata: Metadata = {
  title: 'Editor',
  description: 'Manage your blog posts',
};

/**
 * Editor route layout.
 * Protects all /editor routes with authentication.
 * Wraps children with EditorLayout for consistent navigation.
 */
export default async function Layout({ children }: { children: React.ReactNode }) {
  // Redirect to /login if not authenticated
  await requireAuth();

  return <EditorLayout>{children}</EditorLayout>;
}
