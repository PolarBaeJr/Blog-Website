'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

/**
 * Layout component for the editor section.
 * Provides top navigation with links to editor pages, settings, and logout.
 */
export default function EditorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const navLinks = [
    { href: '/editor', label: 'Dashboard' },
    { href: '/editor/new', label: 'New Post' },
    { href: '/settings', label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex h-14 items-center justify-between">
            {/* Left: Nav links */}
            <div className="flex items-center gap-1">
              <Link
                href="/"
                className="mr-4 text-lg font-bold text-gray-900 hover:text-blue-600"
              >
                Blog
              </Link>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Right: User info + Logout */}
            <div className="flex items-center gap-4">
              {session?.user?.name && (
                <span className="text-sm text-gray-600">
                  {session.user.name}
                </span>
              )}
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
