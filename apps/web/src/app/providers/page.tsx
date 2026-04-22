'use client';

import { ProvidersPageContent } from '@/components/features/providers/ProvidersPageContent';
import { DashboardProvider } from '@/context/DashboardContext';

export default function ProvidersPage() {
  return (
    <DashboardProvider>
      <ProvidersPageContent />
    </DashboardProvider>
  );
}
