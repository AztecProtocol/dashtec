import { NextPage } from 'next';
import Head from 'next/head';
import { Suspense } from 'react';
import PageTransitionWrapper from '@/components/layout/PageTransitionWrapper';
import { SlashingHistoryPageContent } from '@/components/features/slashing-history/SlashingHistoryPageContent';


function SlashingHistoryPageFallback() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-violet"></div>
      </div>
    </div>
  );
}

const SlashingHistoryPage: NextPage = () => {
  return (
    <div className="min-h-screen flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Head>
        <title>Slashing History | Dashtec</title>
        <meta name="description" content="View slashing history with payload data and proposer votes." />
      </Head>
      <PageTransitionWrapper>
        <Suspense fallback={<SlashingHistoryPageFallback />}>
          <SlashingHistoryPageContent />
        </Suspense>
      </PageTransitionWrapper>
    </div>
  );
};

export default SlashingHistoryPage;