import { NextPage } from 'next';
import Head from 'next/head';
import { Suspense } from 'react';
import PageTransitionWrapper from '@/components/layout/PageTransitionWrapper';
import { WatchlistPageContent } from '@/components/features/watchlist/WatchlistPageContent';

/**
 * Watchlist page component
 * Displays user's watchlisted sequencers with status counts
 */
function WatchlistPageFallback() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-violet"></div>
      </div>
    </div>
  );
}

const WatchlistPage: NextPage = () => {
  return (
    <div className="min-h-screen flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Head>
        <title>Watchlist | Dashtec</title>
        <meta name="description" content="Track your watchlisted sequencers and monitor their performance." />
      </Head>
      <PageTransitionWrapper>
        <Suspense fallback={<WatchlistPageFallback />}>
          <WatchlistPageContent />
        </Suspense>
      </PageTransitionWrapper>
    </div>
  );
};

export default WatchlistPage;
