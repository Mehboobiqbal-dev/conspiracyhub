'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, Compass, Home as HomeIcon, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function NotFound() {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center px-4 py-12">
      <div className="max-w-3xl w-full">
        <Card className="border-none shadow-xl bg-background/80 backdrop-blur">
          <CardContent className="px-8 py-10 md:px-12 md:py-12">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
              <div className="space-y-4 md:space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Compass className="h-3.5 w-3.5" />
                  <span>Page not found</span>
                </div>

                <div>
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-2">
                    This conspiracy doesn&apos;t exist.
                  </h1>
                  <p className="text-muted-foreground text-sm md:text-base max-w-xl">
                    The page you&apos;re looking for has been removed, moved to a different universe,
                    or never existed in the first place. Double‑check the URL or head back to safer
                    territory.
                  </p>
                </div>

                {pathname && (
                  <p className="text-xs md:text-sm text-muted-foreground/80">
                    Tried to open:{' '}
                    <span className="font-mono text-foreground break-all">{pathname}</span>
                  </p>
                )}

                <div className="flex flex-wrap gap-3 pt-2">
                  <Button asChild size="sm">
                    <Link href="/">
                      <HomeIcon className="h-4 w-4 mr-2" />
                      Go to feed
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/search">
                      <Search className="h-4 w-4 mr-2" />
                      Search posts
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (typeof window !== 'undefined' && window.history.length > 1) {
                        window.history.back();
                      } else {
                        window.location.href = '/';
                      }
                    }}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Go back
                  </Button>
                </div>
              </div>

              <div className="relative mx-auto md:mx-0">
                <div className="relative h-40 w-40 md:h-52 md:w-52 rounded-full bg-gradient-to-tr from-primary/10 via-primary/5 to-secondary/20 border border-dashed border-primary/30 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <div className="text-5xl md:text-6xl font-extrabold tracking-tighter text-primary">
                      404
                    </div>
                    <p className="text-xs text-muted-foreground max-w-[8rem] mx-auto">
                      You&apos;ve reached the edge of the network.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


