import Head from 'next/head';
import { Suspense } from 'react';
import PageTransitionWrapper from '@/components/layout/PageTransitionWrapper';
import { ValidatorDetailPageContent } from '@/components/features/validator-detail/ValidatorDetailPageContent';
import { Skeleton } from '@/components/ui/Skeleton';
import { getValidatorSlashingData } from '@/services/props/validatorProps';
import { DashboardProvider } from '@/context/DashboardContext';

const ValidatorDetailSkeleton: React.FC = () => (
  <div className="space-y-6 ">
    {/* Header Skeleton */}
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
      <div className="flex justify-between items-start">
        <div className="w-1/2 space-y-3">
          <Skeleton heightClass="h-8" widthClass="w-2/3" />
          <Skeleton heightClass="h-5" widthClass="w-full" />
        </div>
        <Skeleton heightClass="h-9" widthClass="w-24" />
      </div>
    </div>

    {/* Mobile-only Sidebar Skeleton */}
    <div className="block lg:hidden bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 space-y-4">
      <Skeleton heightClass="h-6" widthClass="w-1/3" />
      <Skeleton heightClass="h-20" widthClass="w-full" />
      <Skeleton heightClass="h-6" widthClass="w-1/3" />
      <Skeleton heightClass="h-20" widthClass="w-full" />
    </div>

    {/* Main Grid Skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <div className="lg:col-span-2 space-y-6">
        {/* Filter Bar Skeleton */}
        <div className="flex justify-between items-center rounded-lg p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <Skeleton heightClass="h-6" widthClass="w-1/3" />
          <Skeleton heightClass="h-9" widthClass="w-36" />
        </div>
        {/* StatsGrid Skeleton */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 space-y-4">
          <Skeleton heightClass="h-7" widthClass="w-1/4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton heightClass="h-24" widthClass="w-full" />
            <Skeleton heightClass="h-24" widthClass="w-full" />
            <Skeleton heightClass="h-24" widthClass="w-full" />
          </div>
        </div>
        {/* Graph Card Skeleton */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 space-y-4">
          <Skeleton heightClass="h-7" widthClass="w-1/3" />
          <Skeleton heightClass="h-96" widthClass="w-full" />
        </div>
        {/* History Card Skeleton */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 space-y-4">
          <Skeleton heightClass="h-7" widthClass="w-1/3" />
          <Skeleton heightClass="h-32" widthClass="w-full" />
        </div>
      </div>
      {/* Desktop-only Sidebar Skeleton */}
      <div className="lg:col-span-1 lg:block hidden bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 space-y-4">
        <Skeleton heightClass="h-6" widthClass="w-1/3" />
        <Skeleton heightClass="h-20" widthClass="w-full" />
        <Skeleton heightClass="h-6" widthClass="w-1/3" />
        <Skeleton heightClass="h-32" widthClass="w-full" />
        <Skeleton heightClass="h-6" widthClass="w-1/3" />
        <Skeleton heightClass="h-32" widthClass="w-full" />
      </div>
    </div>
  </div>
);

interface ValidatorDetailPageProps {
  params: Promise<{ id: string }>;
}

const ValidatorDetailPage = async ({ params }: ValidatorDetailPageProps) => {
  const { id } = await params;

  // Fetch slashing data using props service
  const slashingData = await getValidatorSlashingData(id);

  return (
    <div className="min-h-screen flex flex-col">
      <Head>
        <title>Sequencer Details | Dashtec</title>
      </Head>
      <PageTransitionWrapper>
        <Suspense fallback={
          <main className='flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8'>
            <div className="mb-6"><Skeleton heightClass="h-5" widthClass="w-48" /></div>
            <ValidatorDetailSkeleton />
          </main>
        }>
          <DashboardProvider>
            <ValidatorDetailPageContent slashingData={slashingData} />
          </DashboardProvider>
        </Suspense>
      </PageTransitionWrapper>
    </div>
  );
};

export default ValidatorDetailPage;