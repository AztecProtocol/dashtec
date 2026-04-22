/**
 * Shared table icons used across provider and validator tables
 */

export const SearchIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="8" cy="8" r="6" />
    <path d="M14 14l4 4" strokeLinecap="round" />
  </svg>
);

export const ChevronLeft = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 4l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ChevronRight = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const DoubleChevronLeft = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4l-6 6 6 6M17 4l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const DoubleChevronRight = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 4l6 6-6 6M3 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ArrowUp = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 12V4M4 8l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ArrowDown = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 4v8M12 8l-4 4-4-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const FilterIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 5h14M5 10h10M7 15h6" strokeLinecap="round" />
  </svg>
);

export const ListIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 6h12M4 10h12M4 14h12" strokeLinecap="round" />
  </svg>
);

export const GridIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="4" width="5" height="5" rx="1" />
    <rect x="11" y="4" width="5" height="5" rx="1" />
    <rect x="4" y="11" width="5" height="5" rx="1" />
    <rect x="11" y="11" width="5" height="5" rx="1" />
  </svg>
);
