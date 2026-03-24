import { Metadata } from 'next';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const dynamic = 'force-dynamic';

async function getSiteSettings() {
  const settings = await prisma.siteSettings.findFirst({
    where: { id: 'singleton' },
  });
  return settings ?? { blogTitle: 'PolarDev', blogDescription: 'A simple blog' };
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: settings.blogTitle,
    description: settings.blogDescription,
  };
}

export default async function HomePage() {
  const settings = await getSiteSettings();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">{settings.blogTitle}</h1>
        <p className="text-xl text-gray-600 mb-8 max-w-xl">{settings.blogDescription}</p>
        <Link href="/posts" className="rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition-colors">
          Read the Blog
        </Link>
      </main>
      <Footer />
    </div>
  );
}
