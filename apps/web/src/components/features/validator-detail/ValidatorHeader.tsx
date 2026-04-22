import React, { useState } from 'react';
import { Validator } from '@/types';
import { CopyButton } from '@/components/ui/CopyButton';
import { ValidatorAvatar } from '@/components/ui/ValidatorAvatar';
import { XIcon } from '@/components/features/dashboard/Links';
import { CircleStackIcon, InformationCircleIcon, PencilSquareIcon, StarIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { useSignMessage } from 'wagmi';
import { Modal } from '@/components/ui/Modal';
import { generateValidatorRenameMessage } from '@/services/auth/signatureService';
import { useNotification } from '@/context/NotificationContext';
import { useWatchlist } from '@/hooks/useWatchlist';
import { getAddressUrl, getExplorerName } from '@/utils/blockExplorer';

interface ValidatorHeaderProps {
  validator: Validator;
  isOwner: boolean;
  showInfoToggle: boolean;
  onInfoClick: () => void;
  onNameUpdate: (name: string) => void;
}

export const ValidatorHeader: React.FC<ValidatorHeaderProps> = ({ validator, isOwner, showInfoToggle, onInfoClick, onNameUpdate }) => {
  const validatorUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/sequencers/${validator.address}`;
  const shareText = `I'm running a node on @aztecnetwork Testnet, a fully decentralized, privacy-preserving network built on Ethereum.\n\nCheck out my node performance and get live insights into the current state of the network:\n\n${validatorUrl}`;
  const xShareLink = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
  const { signMessageAsync } = useSignMessage();
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [newName, setNewName] = useState(validator.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const { addNotification } = useNotification();
  const { isWatchlisted, toggleWatchlist } = useWatchlist();

  const handleSaveName = async () => {
    if (!newName.trim() || newName.length > 25) {
      addNotification("Name must be between 1 and 25 characters.", 'error');
      return;
    }
    setIsSaving(true);
    try {
      const message = generateValidatorRenameMessage(newName);
      const signature = await signMessageAsync({ message });

      const response = await fetch(`/api/validators/${validator.address}/rename`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, signature }),
      });

      if (!response.ok) throw new Error((await response.json()).error || 'Failed to save name.');

      onNameUpdate(newName); // Update parent state on success
      setIsRenameModalOpen(false);
      addNotification('Sequencer renamed successfully!', 'success');
    } catch (err: any) {
      addNotification(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleWatchlistToggle = () => {
    const wasWatchlisted = isWatchlisted(validator.address);
    toggleWatchlist(validator.address);

    if (wasWatchlisted) {
      addNotification('Sequencer removed from watchlist', 'warning');
    } else {
      addNotification('Sequencer added to watchlist', 'success');
    }
  };


  return (
    <>
      <div className="relative overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-800/80  border border-white/20 dark:border-slate-700/50 shadow-2xl">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-brand-violet to-amber-600 dark:from-slate-100 dark:via-accent-purple-light dark:to-amber-400 bg-clip-text text-transparent">
                  {validator.name || `Sequencer ${validator.index}`}
                </h1>
              </div>
              <div className="flex flex-col sm:flex-row justify-start sm:justify-between items-start sm:items-center mt-3 gap-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-mono break-all">{validator.address}</p>
                  <CopyButton textToCopy={validator.address} size="sm" />
                </div>
                {showInfoToggle && (
                  <button
                    onClick={onInfoClick}
                    className="group relative inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-brand-violet/10 to-amber-500/10 text-brand-violet dark:text-accent-purple-light rounded-lg border border-brand-violet/20 hover:from-brand-violet/20 hover:to-amber-500/20 hover:border-brand-violet/30 transition-all duration-300 "
                  >
                    <InformationCircleIcon className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
                    Get Verified
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 self-start">
              <button
                onClick={handleWatchlistToggle}
                className={`group relative inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${isWatchlisted(validator.address)
                  ? 'bg-gradient-to-r from-yellow-100/80 to-yellow-200/60 dark:from-yellow-900/40 dark:to-yellow-800/30 text-yellow-700 dark:text-yellow-300 border-yellow-300/50 dark:border-yellow-700/50 hover:from-yellow-200 dark:hover:from-yellow-800/60 hover:to-yellow-200/80 dark:hover:to-yellow-700/60'
                  : 'bg-gradient-to-r from-white/80 to-white/60 dark:from-slate-800/80 dark:to-slate-900/60 text-slate-700 dark:text-slate-200 border-white/30 dark:border-slate-600/30 hover:from-white dark:hover:from-slate-700 hover:to-white/80 dark:hover:to-slate-800/80'
                  }`}
                title={isWatchlisted(validator.address) ? 'Remove from watchlist' : 'Add to watchlist'}
              >
                {isWatchlisted(validator.address) ? (
                  <StarIconSolid className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
                ) : (
                  <StarIcon className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
                )}
                {isWatchlisted(validator.address) ? 'Watchlisted' : 'Watchlist'}
              </button>
              {isOwner && (
                <button
                  onClick={() => setIsRenameModalOpen(true)}
                  className="group relative inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-gradient-to-r from-white/80 to-white/60 dark:from-slate-800/80 dark:to-slate-900/60 text-slate-700 dark:text-slate-200 rounded-xl border border-white/30 dark:border-slate-600/30  hover:from-white dark:hover:from-slate-700 hover:to-white/80 dark:hover:to-slate-800/80 hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                  title="Rename sequencer"
                >
                  <PencilSquareIcon className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
                  Rename
                </button>
              )}
              <a
                href={xShareLink}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-gradient-to-r from-slate-100/80 to-slate-200/60 dark:from-slate-700/80 dark:to-slate-800/60 text-slate-700 dark:text-slate-200 rounded-xl border border-white/30 dark:border-slate-600/30  hover:from-slate-200 dark:hover:from-slate-600 hover:to-slate-200/80 dark:hover:to-slate-700/80 hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                title="Share on X"
              >
                <XIcon className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
                Share
              </a>
            </div>
          </div>
        </div>
      </div>
      <Modal isOpen={isRenameModalOpen} onClose={() => setIsRenameModalOpen(false)} title="Rename Sequencer">
        <div className="space-y-6">
          <div className="text-center">
            <div className="relative mx-auto flex h-16 w-16 items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-violet/30 to-amber-500/20 rounded-2xl blur-lg "></div>
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-800/80 dark:to-slate-900/60  border border-white/20 dark:border-slate-700/50 shadow-xl">
                <PencilSquareIcon className="h-8 w-8 text-brand-violet dark:text-accent-purple-light" />
              </div>
            </div>
            <h3 className="mt-4 text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
              Set a Custom Name
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Give your sequencer a memorable name that will be displayed publicly.
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-brand-violet/20 to-amber-500/20 rounded-xl blur opacity-0 focus-within:opacity-100 transition-opacity duration-300"></div>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="relative w-full px-4 py-3 text-center text-lg font-medium bg-white/80 dark:bg-slate-700/80  border border-white/20 dark:border-slate-600/50 rounded-xl text-slate-900 dark:text-slate-50 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-brand-violet focus:border-brand-violet focus:outline-none transition-all duration-300 shadow-lg"
              placeholder="My Awesome Sequencer"
            />
          </div>

          <div className="flex flex-col sm:flex-row-reverse gap-3">
            <button
              type="button"
              onClick={handleSaveName}
              disabled={isSaving}
              className="group relative w-full px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-brand-violet to-amber-600 hover:from-amber-600 hover:to-amber-700 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-300 transform hover:scale-105 hover:shadow-xl shadow-lg"
            >
              <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center gap-2">
                {isSaving && <CircleStackIcon className="h-4 w-4 animate-spin" />}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </div>
            </button>
            <button
              type="button"
              onClick={() => setIsRenameModalOpen(false)}
              className="w-full px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-600/80  border border-white/20 dark:border-slate-500/50 rounded-xl hover:bg-white dark:hover:bg-slate-500 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};