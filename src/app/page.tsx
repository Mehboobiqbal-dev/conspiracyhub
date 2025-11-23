import { Metadata } from 'next';
import { PostFeed } from '@/components/post-feed';
import { HomeHeader } from '@/components/home-header';

export const metadata: Metadata = {
  title: 'ConspiracyHub - Latest Conspiracy Theories & Opinions',
  description: 'Explore conspiracy theories and opinions on current and historical topics. AI-generated and user-submitted content. Read without login, share your theories and opinions.',
  keywords: ['conspiracy theories', 'opinions', 'debate', 'discussion', 'current events', 'history', 'AI generated content'],
  openGraph: {
    title: 'ConspiracyHub - Conspiracy Theories & Opinions Platform',
    description: 'Explore conspiracy theories and opinions on current and historical topics. AI-generated and user-submitted content.',
    type: 'website',
    siteName: 'ConspiracyHub',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ConspiracyHub',
    description: 'Explore conspiracy theories and opinions on current and historical topics.',
  },
};

export default async function HomePage() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://conspiracyhub.com';

  // Structured data for SEO
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'ConspiracyHub',
    description: 'Explore conspiracy theories and opinions on current and historical topics. AI-generated and user-submitted content.',
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <HomeHeader />
        <PostFeed feedType="public" />
      </div>
    </div>
  );
}
