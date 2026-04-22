import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  heightClass?: string;
  widthClass?: string;
  className?: string;
}

/**
 * Skeleton loading component with shimmer animation
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  heightClass = 'h-4',
  widthClass = 'w-full',
  className = '',
  ...props
}) => {
  return (
    <div
      className={`relative overflow-hidden rounded-lg ${heightClass} ${widthClass} ${className}`}
      {...props}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700" />
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 dark:via-white/10 to-transparent" />
    </div>
  );
};

interface SkeletonTableRowProps {
  columns: number;
  columnWidths?: string[];
}
export const SkeletonTableRow: React.FC<SkeletonTableRowProps> = ({ columns, columnWidths }) => (
  <tr> 
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-4 py-4 whitespace-nowrap">
        <Skeleton heightClass="h-5" widthClass={columnWidths && columnWidths[i] ? columnWidths[i] : 'w-3/4'} />
      </td>
    ))}
  </tr>
);