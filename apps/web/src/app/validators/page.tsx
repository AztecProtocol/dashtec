import { NextPage } from 'next';
import Head from 'next/head';
import { Suspense } from 'react';
import PageTransitionWrapper from '@/components/layout/PageTransitionWrapper';
import { AllValidatorsPageContent } from '@/components/features/validators/AllValidatorsPageContent';
import { Skeleton } from '@/components/ui/Skeleton';
import { DashboardProvider } from '@/context/DashboardContext';

// A dedicated skeleton component for the page's loading state.
const ValidatorsPageSkeleton = () => (
  <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 _tight  py-8 ">
    <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
      <div>
        <Skeleton heightClass="h-8" widthClass="w-64" />
        <Skeleton heightClass="h-4" widthClass="w-80 mt-2" />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton heightClass="h-10" widthClass="w-48" />
        <Skeleton heightClass="h-10" widthClass="w-32" />
      </div>
    </div>
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
      <Skeleton heightClass="h-[600px]" widthClass="w-full" />
    </div>
  </main>
);

const AllValidatorsPage: NextPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Head>
        <title>All Sequencers | Dashtec</title>
        <meta name="description" content="Comprehensive list of all Aztec sequencers." />
      </Head>
      <DashboardProvider>
        <PageTransitionWrapper>
          <Suspense fallback={<ValidatorsPageSkeleton />}>
            <AllValidatorsPageContent />
          </Suspense>
        </PageTransitionWrapper>
      </DashboardProvider>
    </div>
  );
};

export default AllValidatorsPage;