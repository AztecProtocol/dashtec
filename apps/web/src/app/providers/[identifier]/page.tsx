import { Metadata } from 'next';
import { ProviderDetailPageContent } from '@/components/features/providers/ProviderDetailPageContent';

export const metadata: Metadata = {
  title: 'Provider Detail | Aztec Dashboard',
  description: 'View provider details and managed attesters',
};

export default async function ProviderDetailPage({ params }: { params: Promise<{ identifier: string }> }) {
  const { identifier } = await params;
  return <ProviderDetailPageContent identifier={identifier} />;
}
