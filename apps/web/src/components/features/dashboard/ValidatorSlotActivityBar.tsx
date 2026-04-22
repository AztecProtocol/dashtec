import { SlotActivity, SlotActivityStatus, ProviderMetadata } from '@/types';
import { CHECKPOINT_PROPOSED, CHECKPOINT_MINED, ATTESTATION_SENT, CHECKPOINT_MISSED, BLOCKS_MISSED, ATTESTATION_MISSED } from '@dashtec/shared-types';
import Link from 'next/link';
import { getValidatorLink } from '@/utils/validatorLinks';
import { AtSymbolIcon } from '@heroicons/react/24/outline';
import { ProviderBadge } from '@/components/ui/ProviderBadge';

interface ValidatorSlotActivityBarProps {
  validatorName: string;
  slots: SlotActivity[];
  validatorAddress: string;
  x_handle?: string | null;
  name?: string | null;
  provider?: ProviderMetadata | null;
  totalSlotsInEpoch: number;
  currentSlotInEpoch?: number;
  onSlotClick?: (slotNumber: number) => void;
}

// Updated color mapping to match the new design inspiration
const getStatusColor = (status: SlotActivityStatus): string => {
  switch (status) {
    case CHECKPOINT_PROPOSED:
    case CHECKPOINT_MINED:
      return 'bg-accent-blue';
    case ATTESTATION_SENT:
      return 'bg-green-500/60 dark:bg-green-500/40';
    case CHECKPOINT_MISSED:
      return 'bg-amber-500/90 dark:bg-amber-400/80';
    case BLOCKS_MISSED:
      return 'bg-orange-600/90 dark:bg-orange-500/80';
    case ATTESTATION_MISSED:
      return 'bg-red-500/90 dark:bg-red-400/80';
    case 'no_data':
    default:
      return 'bg-slate-200 dark:bg-slate-700/50';
  }
};

export const ValidatorSlotActivityBar: React.FC<ValidatorSlotActivityBarProps> = ({
  validatorName,
  validatorAddress,
  slots,
  x_handle,
  name,
  provider,
  totalSlotsInEpoch,
  currentSlotInEpoch,
  onSlotClick,
}) => {
  const displaySlots: SlotActivity[] = Array.from({ length: totalSlotsInEpoch }, (_, i) => {
    return slots.find(s => s.slotNumber === i) || { slotNumber: i, status: 'no_data', tooltip: `Slot ${i + 1}: No specific data` };
  });

  return (
    <div className="group relative overflow-hidden rounded-xl bg-white/60 dark:bg-slate-700/40  border border-white/30 dark:border-slate-600/30 hover:bg-white/80 dark:hover:bg-slate-700/60 transition-all duration-300 hover:shadow-lg p-3 mb-2">
      {/* Subtle glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-brand-violet/5 via-transparent to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
            <Link href={getValidatorLink(validatorAddress)} className="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-brand-violet dark:hover:text-accent-purple-light transition-colors truncate">
              {name || validatorName}
            </Link>
            {x_handle && (
              <a
                href={`https://x.com/${x_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 bg-sky-100/80 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-md hover:bg-sky-200/80 dark:hover:bg-sky-900/50 transition-colors text-xs font-medium"
              >
                <AtSymbolIcon className="h-3 w-3" />
                <span>{x_handle}</span>
              </a>
            )}
            {/* Provider Badge */}
            {provider && (
              <ProviderBadge provider={provider} size="xs" variant="minimal" />
            )}
          </div>
          
          {/* Progress indicator */}
          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <div className="w-1.5 h-1.5 bg-brand-violet rounded-full "></div>
            <span className="font-medium">{currentSlotInEpoch !== undefined ? currentSlotInEpoch + 1 : 0}/{totalSlotsInEpoch}</span>
          </div>
        </div>
        
        {/* Enhanced Activity Bar */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-200/50 to-slate-300/30 dark:from-slate-600/30 dark:to-slate-700/50 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

          <div className="relative p-1.5 bg-white/50 dark:bg-slate-800/30 rounded-lg border border-white/30 dark:border-slate-600/30">
            <div className="grid w-full h-5 gap-0.5 rounded-md overflow-visible" style={{ gridTemplateColumns: `repeat(${totalSlotsInEpoch}, minmax(0, 1fr))` }}>
              {displaySlots.map(({ slotNumber, status, tooltip }) => {
                const colorClass = getStatusColor(status);
                const isGloballyCurrentSlot = currentSlotInEpoch === slotNumber;

                return (
                  <div
                    key={slotNumber}
                    className={`h-full w-full rounded-sm relative transition-all duration-200 ease-in-out cursor-pointer hover:scale-[1.2] ${colorClass} hover:opacity-80`}
                    title={tooltip || `Slot ${slotNumber + 1}: ${status.replace(/_/g, ' ')}`}
                    onClick={() => onSlotClick?.(slotNumber)}
                  >
                    {/* Enhanced highlight for current global slot */}
                    {isGloballyCurrentSlot && (
                      <div className="absolute inset-0 ring-2 ring-yellow-400 ring-offset-1 ring-offset-white dark:ring-offset-slate-800 rounded-sm shadow-md " />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};