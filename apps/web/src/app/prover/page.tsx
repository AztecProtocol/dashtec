import { Suspense } from 'react';
import { ProverPageContent } from './ProverPageContent';

export default function ProverPage() {
  return (
    <Suspense>
      <ProverPageContent />
    </Suspense>
  );
}
