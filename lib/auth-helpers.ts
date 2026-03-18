import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from './auth';

/**
 * Get the current server-side session.
 * Use in server components and API routes.
 */
export async function getSession() {
  return getServerSession(authOptions);
}

/**
 * Require authentication in server components.
 * Redirects to /login if not authenticated.
 * Returns the session (with user data) if authenticated.
 */
export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    redirect('/login');
  }
  return session;
}

/**
 * Higher-order function wrapper for API route handlers that require authentication.
 * Returns 401 if not authenticated, otherwise calls the handler with the session.
 *
 * Usage:
 * ```ts
 * export const POST = withAuth(async (req, session) => {
 *   // session.user.id is available
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function withAuth(
  handler: (
    req: NextRequest,
    session: { user: { id: string; email: string; name: string } }
  ) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    return handler(req, session as { user: { id: string; email: string; name: string } });
  };
}
