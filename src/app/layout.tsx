import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/contexts/auth-context';
import { LocaleProvider } from '@/contexts/locale-context';
import { NextIntlProviderWrapper } from '@/components/next-intl-provider';
import { MainNav } from '@/components/main-nav';
import { ReduxProvider } from '@/store/provider';

// Using CSS variables for fonts to avoid Turbopack issues
// Fonts are loaded via globals.css


export const metadata: Metadata = {
  title: 'ConspiracyHub - Conspiracy Theories & Opinions Platform',
  description: 'Explore conspiracy theories and opinions on current and historical topics. AI-generated and user-submitted content.',
  keywords: ['conspiracy theories', 'opinions', 'debate', 'discussion', 'current events', 'history'],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'ConspiracyHub',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("antialiased")}>
        <ReduxProvider>
          <LocaleProvider>
            <NextIntlProviderWrapper>
              <AuthProvider>
                <MainNav />
                <main>{children}</main>
                <Toaster />
              </AuthProvider>
            </NextIntlProviderWrapper>
          </LocaleProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
