'use client';

import { Tooltip } from '@/components/ui/Tooltip';
import { formatAddress } from '@/utils/formatters';
import type { Payload } from '@/types/signaling-matrix';

interface MatrixTableHeaderProps {
  payloads: Payload[];
}

/**
 * Table header row showing column labels
 */
export const MatrixTableHeader: React.FC<MatrixTableHeaderProps> = ({
  payloads,
}) => {
  return (
    <>
      {/* Table Column Headers — hidden on mobile, cards are self-descriptive */}
      <div className="hidden lg:block bg-slate-50 dark:bg-slate-900/50 px-6 py-3 border-b border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-12 gap-4 items-center text-sm font-medium text-slate-600 dark:text-slate-400">
          <div className="col-span-3">Provider</div>
          <div className="col-span-7">
            <div className="flex items-center gap-4 overflow-x-auto">
              {payloads.map((payload) => (
                <div key={payload.address} className="flex-shrink-0 min-w-[150px] text-center">
                  <span className="text-xs font-mono">{formatAddress(payload.address)}</span>
                </div>
              ))}
            </div>
          </div>
        <div className="col-span-2 text-right flex justify-end">
          <Tooltip
            content={
              <div className="space-y-2">
                <div>
                  <div className="font-semibold">Managed</div>
                  <div className="text-slate-300">How well provider's sequencers participate</div>
                </div>
                <div className="border-t border-slate-600 pt-2">
                  <div className="font-semibold">Network</div>
                  <div className="text-slate-300">Provider's contribution to total network signals</div>
                </div>
              </div>
            }
          >
            <div className="space-y-0.5 cursor-help text-right">
              <div>Participation</div>
              <div className="text-xs font-normal text-slate-400">Managed / Network</div>
            </div>
          </Tooltip>
        </div>
        </div>
      </div>
    </>
  );
};