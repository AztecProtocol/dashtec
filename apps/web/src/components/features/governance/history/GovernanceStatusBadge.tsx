import { ComputedStatus } from './types';
import { getTxUrl } from '@/utils/blockExplorer';
import {
  CheckCircleIcon,
  ClockIcon,
  SignalIcon,
  ExclamationCircleIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';

interface GovernanceStatusBadgeProps {
  status: ComputedStatus;
  submittedTx?: string | null;
  submittableTx?: string | null;
}

export const GovernanceStatusBadge: React.FC<GovernanceStatusBadgeProps> = ({
  status,
  submittedTx,
  submittableTx
}) => {
  switch (status) {
    case 'Submitted':
      return submittedTx ? (
        <a
          href={getTxUrl(submittedTx)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <CheckCircleIcon className="h-3.5 w-3.5" />
          Submitted
          <ArrowTopRightOnSquareIcon className="h-3 w-3 opacity-50" />
        </a>
      ) : (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400">
          <CheckCircleIcon className="h-3.5 w-3.5" />
          Submitted
        </span>
      );
    case 'Submittable':
      return submittableTx ? (
        <a
          href={getTxUrl(submittableTx)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <ClockIcon className="h-3.5 w-3.5" />
          Submittable
          <ArrowTopRightOnSquareIcon className="h-3 w-3 opacity-50" />
        </a>
      ) : (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400">
          <ClockIcon className="h-3.5 w-3.5" />
          Submittable
        </span>
      );
    case 'Active':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
          <SignalIcon className="h-3.5 w-3.5" />
          Active
        </span>
      );
    case 'Expired':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-500 dark:text-slate-400">
          <ExclamationCircleIcon className="h-3.5 w-3.5" />
          Expired
        </span>
      );
  }
};
