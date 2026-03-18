'use client';

import { useState } from 'react';
import InviteForm from './InviteForm';

interface SettingsFormProps {
  initialSettings: {
    blogTitle: string;
    blogDescription: string;
    footerText: string;
  };
}

export default function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [blogTitle, setBlogTitle] = useState(initialSettings.blogTitle);
  const [blogDescription, setBlogDescription] = useState(initialSettings.blogDescription);
  const [footerText, setFooterText] = useState(initialSettings.footerText);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blogTitle, blogDescription, footerText }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update settings');
        return;
      }

      // Update form with the sanitized values from the server
      setBlogTitle(data.settings.blogTitle);
      setBlogDescription(data.settings.blogDescription);
      setFooterText(data.settings.footerText);
      setSuccess('Settings updated successfully!');

      // Clear success message after a few seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Site Settings Section */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Site Settings</h2>
        <p className="mt-1 text-sm text-gray-600">
          Configure your blog&apos;s title, description, and footer text.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
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

          <div className="space-y-1">
            <label htmlFor="blogTitle" className="block text-sm font-medium text-gray-700">
              Blog Title
            </label>
            <input
              id="blogTitle"
              type="text"
              value={blogTitle}
              onChange={(e) => setBlogTitle(e.target.value)}
              placeholder="My Blog"
              maxLength={100}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500">{blogTitle.length}/100 characters</p>
          </div>

          <div className="space-y-1">
            <label htmlFor="blogDescription" className="block text-sm font-medium text-gray-700">
              Blog Description
            </label>
            <textarea
              id="blogDescription"
              value={blogDescription}
              onChange={(e) => setBlogDescription(e.target.value)}
              placeholder="A brief description of your blog"
              maxLength={500}
              rows={3}
              className="w-full resize-vertical rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500">{blogDescription.length}/500 characters</p>
          </div>

          <div className="space-y-1">
            <label htmlFor="footerText" className="block text-sm font-medium text-gray-700">
              Footer Text
            </label>
            <input
              id="footerText"
              type="text"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="Optional footer text (e.g., copyright notice)"
              maxLength={500}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500">{footerText.length}/500 characters</p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Divider */}
      <hr className="border-gray-200" />

      {/* Invite Editors Section */}
      <InviteForm />
    </div>
  );
}
