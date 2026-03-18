import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import TagBadge from './TagBadge';

interface PostCardTag {
  name: string;
  slug: string;
}

interface PostCardProps {
  title: string;
  slug: string;
  excerpt?: string | null;
  authorName: string;
  date: Date | string;
  tags?: PostCardTag[];
  coverImage?: string | null;
}

export default function PostCard({
  title,
  slug,
  excerpt,
  authorName,
  date,
  tags = [],
  coverImage,
}: PostCardProps) {
  const formattedDate = format(new Date(date), 'MMMM d, yyyy');

  return (
    <article className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      {coverImage && (
        <Link href={`/posts/${slug}`} className="block">
          <div className="relative h-48 w-full">
            <Image
              src={coverImage}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          </div>
        </Link>
      )}
      <div className="p-6">
        <Link href={`/posts/${slug}`}>
          <h2 className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
            {title}
          </h2>
        </Link>
        {excerpt && (
          <p className="mt-2 text-gray-700 leading-relaxed line-clamp-3">
            {excerpt}
          </p>
        )}
        <div className="mt-4 flex items-center text-sm text-gray-500">
          <span>{authorName}</span>
          <span className="mx-2">&middot;</span>
          <time dateTime={new Date(date).toISOString()}>{formattedDate}</time>
        </div>
        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <TagBadge key={tag.slug} name={tag.name} slug={tag.slug} />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
