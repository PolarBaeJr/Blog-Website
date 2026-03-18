import Link from 'next/link';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  basePath = '/',
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageUrl = (page: number) => {
    const separator = basePath.includes('?') ? '&' : '?';
    return page === 1 ? basePath : `${basePath}${separator}page=${page}`;
  };

  // Generate page numbers to show (max 5 pages around current)
  const pages: number[] = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <nav className="flex items-center justify-center gap-2 py-8" aria-label="Pagination">
      {currentPage > 1 ? (
        <Link
          href={getPageUrl(currentPage - 1)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Previous
        </Link>
      ) : (
        <span className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-400 cursor-not-allowed">
          Previous
        </span>
      )}

      {start > 1 && (
        <>
          <Link
            href={getPageUrl(1)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            1
          </Link>
          {start > 2 && (
            <span className="px-2 text-gray-400">&hellip;</span>
          )}
        </>
      )}

      {pages.map((page) => (
        <Link
          key={page}
          href={getPageUrl(page)}
          className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
            page === currentPage
              ? 'border-blue-600 bg-blue-600 text-white'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {page}
        </Link>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && (
            <span className="px-2 text-gray-400">&hellip;</span>
          )}
          <Link
            href={getPageUrl(totalPages)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {totalPages}
          </Link>
        </>
      )}

      {currentPage < totalPages ? (
        <Link
          href={getPageUrl(currentPage + 1)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Next
        </Link>
      ) : (
        <span className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-400 cursor-not-allowed">
          Next
        </span>
      )}
    </nav>
  );
}
