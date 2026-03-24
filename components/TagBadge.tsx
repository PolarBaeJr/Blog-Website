import Link from 'next/link';

interface TagBadgeProps {
  name: string;
  slug: string;
}

export default function TagBadge({ name, slug }: TagBadgeProps) {
  return (
    <Link
      href={`/posts?tag=${slug}`}
      className="inline-block bg-gray-100 text-gray-700 rounded-full px-3 py-1 text-sm hover:bg-gray-200 transition-colors"
    >
      {name}
    </Link>
  );
}
