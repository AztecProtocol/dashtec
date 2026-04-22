import { Metadata } from 'next';
import { Suspense } from 'react';
import { ValidatorQueuePageContent } from '@/components/features/validator-queue/ValidatorQueuePageContent';

export const metadata: Metadata = {
  title: 'Sequencer Queue | Aztec Dashboard',
  description: 'Live tracking of sequencers waiting for activation in the Aztec network',
};

function QueuePageFallback() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-violet"></div>
      </div>
    </div>
  );
}

export default function QueuePage() {
  return (
    <Suspense fallback={<QueuePageFallback />}>
      <ValidatorQueuePageContent />
    </Suspense>
  );
}