import { Skeleton } from '@/components/ui/Skeleton';

export function PageSkeleton() {
  return (
    <div>
      {/* Skeleton for page title and description */}
      <div className="mb-8">
        <Skeleton heightClass="h-8" widthClass="w-1/2" className="mb-2" />
        <Skeleton heightClass="h-5" widthClass="w-3/4" />
      </div>

      {/* Skeleton for a grid of key metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
        <Skeleton heightClass="h-32" widthClass="w-full" />
        <Skeleton heightClass="h-32" widthClass="w-full" />
        <Skeleton heightClass="h-32" widthClass="w-full" />
        <Skeleton heightClass="h-32" widthClass="w-full" />
        <Skeleton heightClass="h-32" widthClass="w-full" />
      </div>

      {/* Skeleton for a larger data table or component */}
      <div>
        <Skeleton heightClass="h-96" widthClass="w-full" />
      </div>
    </div>
  );
}