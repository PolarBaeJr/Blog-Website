import { Metadata } from 'next';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import RegisterForm from '@/components/RegisterForm';

export const metadata: Metadata = {
  title: 'Accept Invitation',
  description: 'Create your editor account',
};

interface InvitePageProps {
  params: { token: string };
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = params;

  // Look up the invite by token
  const invite = await prisma.invite.findUnique({
    where: { token },
    select: {
      id: true,
      email: true,
      used: true,
      expiresAt: true,
      createdBy: {
        select: { name: true },
      },
    },
  });

  // Determine invite validity
  const isInvalid = !invite;
  const isUsed = invite?.used === true;
  const isExpired = invite ? invite.expiresAt < new Date() : false;

  // Show error state for invalid, used, or expired invites
  if (isInvalid || isUsed || isExpired) {
    let title = 'Invalid Invitation';
    let message = 'This invite link is not valid. Please contact the person who sent it.';

    if (isUsed) {
      title = 'Invitation Already Used';
      message = 'This invite has already been used to create an account. If this was you, you can log in below.';
    } else if (isExpired) {
      title = 'Invitation Expired';
      message = 'This invite link has expired. Please ask the sender for a new invitation.';
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md">
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            <p className="mt-2 text-gray-600">{message}</p>
            <Link
              href="/login"
              className="mt-6 inline-block text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Valid invite — show registration form
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <svg
                className="h-6 w-6 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Accept Invitation</h1>
            <p className="mt-2 text-gray-600">
              <span className="font-medium">{invite.createdBy.name}</span> has invited you to become an editor.
              Create your account below.
            </p>
          </div>

          <RegisterForm token={token} email={invite.email} />

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 hover:text-blue-800">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
