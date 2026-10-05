import { NextPage } from 'next';
import Head from 'next/head';
import { Suspense } from 'react';
import PageTransitionWrapper from '@/components/layout/PageTransitionWrapper';
import { MigrationPageContent } from '@/components/features/migration/MigrationPageContent';

/**
 * Migration page
 * Shows how far sequencers have moved from a previous rollup version to the current one
 */
const MigrationPage: NextPage = () => {
  return (
    <div className="min-h-screen flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Head>
        <title>Migration | Dashtec</title>
        <meta name="description" content="Track which sequencers have moved to the latest rollup version and which are still on the previous one." />
      </Head>
      <PageTransitionWrapper>
        <Suspense fallback={null}>
          <MigrationPageContent />
        </Suspense>
      </PageTransitionWrapper>
    </div>
  );
};

export default MigrationPage;
