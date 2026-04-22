'use client';

import { Fragment, useState } from 'react';
import { CHECKPOINT_PROPOSED, CHECKPOINT_MINED, CHECKPOINT_MISSED, BLOCKS_MISSED, ATTESTATION_SENT, ATTESTATION_MISSED } from '@dashtec/shared-types';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, CheckCircleIcon, XCircleIcon, MinusCircleIcon, ExclamationCircleIcon, CubeIcon, ChevronDownIcon, ChevronUpIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { Tooltip } from '@/components/ui/Tooltip';
import Link from 'next/link';
import { getValidatorLink } from '@/utils/validatorLinks';
import { ValidatorEpochSlotActivity } from '@/types';

interface SlotDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  slotNumber: number;
  epochNumber: number;
  validators: ValidatorEpochSlotActivity[];
  epochDurationSlots?: number;
}

interface GroupedValidators {
  checkpointProposed: ValidatorEpochSlotActivity[];
  checkpointMissed: ValidatorEpochSlotActivity[];
  blocksMissed: ValidatorEpochSlotActivity[];
  attestationSuccess: ValidatorEpochSlotActivity[];
  attestationMissed: ValidatorEpochSlotActivity[];
  noData: ValidatorEpochSlotActivity[];
}

/**
 * Modal component that displays detailed information about a specific slot
 * Shows validators grouped by their activity status for that slot
 */
export const SlotDetailsModal: React.FC<SlotDetailsModalProps> = ({
  isOpen,
  onClose,
  slotNumber,
  epochNumber,
  validators,
  epochDurationSlots,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Calculate absolute slot number
  const absoluteSlot = epochDurationSlots ? (epochNumber * epochDurationSlots) + slotNumber : null;

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  // Group validators by their slot activity
  const groupedValidators: GroupedValidators = validators.reduce(
    (acc, validator) => {
      const slot = validator.slots.find(s => s.slotNumber === slotNumber);

      if (!slot || slot.status === 'no_data') {
        acc.noData.push(validator);
      } else if (slot.status === CHECKPOINT_PROPOSED || slot.status === CHECKPOINT_MINED) {
        acc.checkpointProposed.push(validator);
      } else if (slot.status === CHECKPOINT_MISSED) {
        acc.checkpointMissed.push(validator);
      } else if (slot.status === BLOCKS_MISSED) {
        acc.blocksMissed.push(validator);
      } else if (slot.status === ATTESTATION_SENT) {
        acc.attestationSuccess.push(validator);
      } else if (slot.status === ATTESTATION_MISSED) {
        acc.attestationMissed.push(validator);
      }

      return acc;
    },
    {
      checkpointProposed: [],
      checkpointMissed: [],
      blocksMissed: [],
      attestationSuccess: [],
      attestationMissed: [],
      noData: [],
    } as GroupedValidators
  );

  const ValidatorGroup = ({
    title,
    tooltip,
    groupName,
    validators,
    icon: Icon,
    colorClass,
    bgClass,
    borderClass
  }: {
    title: string;
    tooltip?: string;
    groupName: string;
    validators: ValidatorEpochSlotActivity[];
    icon: any;
    colorClass: string;
    bgClass: string;
    borderClass: string;
  }) => {
    if (validators.length === 0) return null;

    const isExpanded = expandedGroups.has(groupName);

    return (
      <div>
        <button
          onClick={() => toggleGroup(groupName)}
          className={`w-full flex items-center justify-between p-3 ${bgClass} rounded-lg border ${borderClass} hover:opacity-80 transition-opacity`}
        >
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${colorClass}`} />
            <h3 className={`text-sm font-semibold ${colorClass}`}>
              {title}
            </h3>
            {tooltip && (
              <Tooltip content={tooltip}>
                <InformationCircleIcon className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
              </Tooltip>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${colorClass}`}>
              {validators.length}
            </span>
            {isExpanded ? (
              <ChevronUpIcon className={`h-4 w-4 ${colorClass}`} />
            ) : (
              <ChevronDownIcon className={`h-4 w-4 ${colorClass}`} />
            )}
          </div>
        </button>
        {isExpanded && (
          <div className="mt-2 space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
            {validators.map((validator, idx) => (
              <Link
                key={validator.validatorAddress}
                href={getValidatorLink(validator.validatorAddress)}
                className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
              >
                <div className="min-w-[2rem] h-8 px-2 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-600 flex-shrink-0">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {validator.validatorIndex}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {validator.name || validator.displayName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    {validator.x_handle && (
                      <span>@{validator.x_handle}</span>
                    )}
                    <span className="font-mono truncate">
                      {validator.validatorAddress.substring(0, 8)}...{validator.validatorAddress.substring(validator.validatorAddress.length - 6)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-xl bg-white dark:bg-slate-800 shadow-2xl transition-all border border-slate-200 dark:border-slate-700">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                      <CubeIcon className="h-5 w-5 text-brand-violet dark:text-accent-purple-light" />
                    </div>
                    <div>
                      <Dialog.Title className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                        Slot #{slotNumber} · Epoch #{epochNumber}
                      </Dialog.Title>
                      {absoluteSlot !== null && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Absolute Slot: #{absoluteSlot}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                  </button>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 p-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="text-center">
                    <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Checkpoint</div>
                    <div className="text-xl font-bold text-accent-blue">{groupedValidators.checkpointProposed.length}</div>
                  </div>
                  <div className="text-center">
                    <Tooltip content="Blocks were proposed but checkpoint was not attested" className="justify-center">
                      <div className="text-xs text-slate-600 dark:text-slate-400 mb-1 cursor-help underline decoration-dotted decoration-slate-500/50 underline-offset-2">Checkpoint Missed</div>
                    </Tooltip>
                    <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{groupedValidators.checkpointMissed.length}</div>
                  </div>
                  <div className="text-center">
                    <Tooltip content="No block proposals were sent at all" className="justify-center">
                      <div className="text-xs text-slate-600 dark:text-slate-400 mb-1 cursor-help underline decoration-dotted decoration-slate-500/50 underline-offset-2">Block Missed</div>
                    </Tooltip>
                    <div className="text-xl font-bold text-orange-600 dark:text-orange-400">{groupedValidators.blocksMissed.length}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Attested</div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">{groupedValidators.attestationSuccess.length}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Att. Failed</div>
                    <div className="text-xl font-bold text-red-600 dark:text-red-400">{groupedValidators.attestationMissed.length}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">No Data</div>
                    <div className="text-xl font-bold text-slate-600 dark:text-slate-400">{groupedValidators.noData.length}</div>
                  </div>
                </div>

                {/* Validator Groups */}
                <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                  <ValidatorGroup
                    title="Checkpoint Proposed/Mined"
                    groupName="checkpointProposed"
                    validators={groupedValidators.checkpointProposed}
                    icon={CubeIcon}
                    colorClass="text-accent-blue"
                    bgClass="bg-slate-50 dark:bg-slate-700/50"
                    borderClass="border-slate-200 dark:border-slate-700"
                  />
                  <ValidatorGroup
                    title="Attestation Sent"
                    groupName="attestationSuccess"
                    validators={groupedValidators.attestationSuccess}
                    icon={CheckCircleIcon}
                    colorClass="text-green-600 dark:text-green-400"
                    bgClass="bg-slate-50 dark:bg-slate-700/50"
                    borderClass="border-slate-200 dark:border-slate-700"
                  />
                  <ValidatorGroup
                    title="Checkpoint Missed"
                    tooltip="Blocks were proposed but checkpoint was not attested"
                    groupName="checkpointMissed"
                    validators={groupedValidators.checkpointMissed}
                    icon={MinusCircleIcon}
                    colorClass="text-amber-600 dark:text-amber-400"
                    bgClass="bg-slate-50 dark:bg-slate-700/50"
                    borderClass="border-slate-200 dark:border-slate-700"
                  />
                  <ValidatorGroup
                    title="Block Missed"
                    tooltip="No block proposals were sent at all"
                    groupName="blocksMissed"
                    validators={groupedValidators.blocksMissed}
                    icon={ExclamationCircleIcon}
                    colorClass="text-orange-600 dark:text-orange-400"
                    bgClass="bg-slate-50 dark:bg-slate-700/50"
                    borderClass="border-slate-200 dark:border-slate-700"
                  />
                  <ValidatorGroup
                    title="Attestation Missed"
                    groupName="attestationMissed"
                    validators={groupedValidators.attestationMissed}
                    icon={XCircleIcon}
                    colorClass="text-red-600 dark:text-red-400"
                    bgClass="bg-slate-50 dark:bg-slate-700/50"
                    borderClass="border-slate-200 dark:border-slate-700"
                  />
                  <ValidatorGroup
                    title="No Data"
                    groupName="noData"
                    validators={groupedValidators.noData}
                    icon={MinusCircleIcon}
                    colorClass="text-slate-600 dark:text-slate-400"
                    bgClass="bg-slate-50 dark:bg-slate-700/50"
                    borderClass="border-slate-200 dark:border-slate-700"
                  />
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
