import { Metadata } from 'next';
import { requireAuth } from '@/lib/auth-helpers';
import { getSiteSettings } from '@/lib/settings';
import SettingsForm from '@/components/SettingsForm';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage your blog settings',
};

/**
 * Settings page — protected, requires authentication.
 * Editors can update blog title, description, footer text,
 * and manage editor invitations.
 */
export default async function SettingsPage() {
  // Redirect to /login if not authenticated
  await requireAuth();

  const settings = await getSiteSettings();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <SettingsForm
            initialSettings={{
              blogTitle: settings.blogTitle,
              blogDescription: settings.blogDescription,
              footerText: settings.footerText,
            }}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
