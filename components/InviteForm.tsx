'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';

interface Invite {
  id: string;
  email: string;
  used: boolean;
  createdAt: string;
  expiresAt: string;
  status: 'used' | 'expired' | 'pending';
  createdBy: {
    name: string;
  };
}

export default function InviteForm() {
  const [email, setEmail] = useState('');
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingInvites, setFetchingInvites] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchInvites = useCallback(async () => {
    try {
      const res = await fetch('/api/invites');
      if (res.ok) {
        const data = await res.json();
        setInvites(data.invites);
      }
    } catch {
      console.error('Failed to fetch invites');
    } finally {
      setFetchingInvites(false);
    }
  }, []);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to send invite');
        return;
      }

      setSuccess(`Invite sent to ${email}`);
      setEmail('');
      // Refresh invite list
      fetchInvites();
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'used':
        return (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
            Registered
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
            Expired
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
            Pending
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Invite Editors</h3>
        <p className="mt-1 text-sm text-gray-600">
          Send email invitations to new editors. They will receive a link to create their account.
          Invitations expire after 72 hours.
        </p>
      </div>

      {/* Invite form */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="invite-email" className="sr-only">
            Email address
          </label>
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email address"
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send Invite'}
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Invites list */}
      <div>
        <h4 className="mb-3 text-sm font-medium text-gray-700">Sent Invitations</h4>
        {fetchingInvites ? (
          <div className="flex justify-center py-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : invites.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">
            No invitations sent yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Invited By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {invites.map((invite) => (
                  <tr key={invite.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {invite.email}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {invite.createdBy.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {format(new Date(invite.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {getStatusBadge(invite.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
