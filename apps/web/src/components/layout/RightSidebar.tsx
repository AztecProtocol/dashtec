'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  XMarkIcon,
  HomeIcon,
  ShieldCheckIcon,
  PresentationChartLineIcon,
  MagnifyingGlassIcon,
  RectangleStackIcon,
  QueueListIcon,
  DocumentDuplicateIcon,
  StarIcon,
  BuildingOffice2Icon,
  ChevronDownIcon,
  ScaleIcon,
  CubeIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';
import { ThemeToggleButton } from '../ui/ThemeToggleButton';
import { ConnectWallet } from '../ui/ConnectWallet';
import { Z_INDEX } from '@/utils/constants';
import { useWatchlist } from '@/hooks/useWatchlist';

interface RightSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSearchClick: () => void;
}

interface NavLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface NavGroup {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  links: NavLink[];
}

type NavItem = NavLink | NavGroup;

const isNavGroup = (item: NavItem): item is NavGroup => {
  return 'links' in item;
};

export const RightSidebar: React.FC<RightSidebarProps> = ({ isOpen, onClose, onSearchClick }) => {
  const pathname = usePathname();
  const { watchlist } = useWatchlist();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Sequencer', 'Epoch', 'Governance', 'Prover']);

  const navItems: NavItem[] = [
    { href: "/", label: "Dashboard", icon: HomeIcon },
    {
      label: "Sequencer",
      icon: CubeIcon,
      links: [
        { href: "/sequencers", label: "Registry", icon: ShieldCheckIcon },
        { href: '/providers', label: 'Providers', icon: BuildingOffice2Icon },
        { href: '/queue', label: 'Queue', icon: QueueListIcon },
        { href: '/watchlist', label: 'Watchlist', icon: StarIcon },
      ],
    },
    {
      label: "Epoch",
      icon: RectangleStackIcon,
      links: [
        { href: "/epoch-performance", label: "Live Epoch", icon: PresentationChartLineIcon },
        { href: '/epochs', label: 'History', icon: RectangleStackIcon },
      ],
    },
    {
      label: "Slashing History",
      icon: ScaleIcon,
      href: '/slashing-history'
    },
    {
      label: "Governance Signals",
      icon: ScaleIcon,
      href: '/governance'
    },
    {
      label: "Prover",
      icon: CpuChipIcon,
      links: [
        { href: "/prover/network", label: "Network Overview", icon: CpuChipIcon },
        { href: "/prover", label: "Prover Lookup", icon: CpuChipIcon },
      ],
    },
  ];

  const toggleGroup = (groupLabel: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupLabel)
        ? prev.filter(g => g !== groupLabel)
        : [...prev, groupLabel]
    );
  };

  const handleSearchAndClose = () => {
    onSearchClick();
    onClose();
  };

  const isLinkActive = (href: string) => pathname === href;

  const isGroupActive = (group: NavGroup) =>
    group.links.some(link => pathname === link.href);

  const renderNavLink = (link: NavLink, nested = false) => {
    const isActive = isLinkActive(link.href);
    const isWatchlist = link.href === '/watchlist';
    const watchlistCount = watchlist.length;

    return (
      <Link
        key={link.href}
        href={link.href}
        onClick={onClose}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative
          ${nested ? 'ml-4' : ''}
          ${isActive
            ? 'bg-brand-violet text-white shadow-sm'
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }
        `}
      >
        <link.icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-brand-violet dark:text-accent-purple-light'}`} />
        <span className="flex-1">{link.label}</span>
        {isWatchlist && watchlistCount > 0 && (
          <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${isActive
            ? 'bg-white/20 text-white'
            : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'
            }`}>
            {watchlistCount}
          </span>
        )}
      </Link>
    );
  };

  const renderNavGroup = (group: NavGroup) => {
    const isExpanded = expandedGroups.includes(group.label);
    const isActive = isGroupActive(group);

    return (
      <div key={group.label} className="space-y-1">
        <button
          onClick={() => toggleGroup(group.label)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 
            ${isActive && !isExpanded
              ? 'text-brand-violet dark:text-accent-purple-light'
              : 'text-slate-700 dark:text-slate-200'
            }
          `}
        >
          <group.icon className={`h-4 w-4 flex-shrink-0 text-brand-violet dark:text-accent-purple-light`} />
          <span className="flex-1 text-left">{group.label}</span>
          <ChevronDownIcon
            className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="space-y-1 pt-1">
                {group.links.map(link => renderNavLink(link, true))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.05, ease: 'easeOut' }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            style={{ zIndex: Z_INDEX.RIGHT_SIDEBAR }}
            aria-hidden="true"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: '0%' }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.1, ease: 'easeOut' }}
            className="fixed top-0 right-0 h-full w-80 bg-white/95 dark:bg-slate-900/95 border-l border-slate-200/50 dark:border-slate-700/50 shadow-xl flex flex-col"
            style={{ zIndex: Z_INDEX.RIGHT_SIDEBAR }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-amber-50/10 dark:from-slate-800/30 dark:via-transparent dark:to-slate-900/10"></div>

            {/* Header */}
            <div className="relative flex items-center justify-between p-5 border-b border-slate-200/50 dark:border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-violet/10 rounded-lg">
                  <svg className="w-5 h-5 text-brand-violet dark:text-accent-purple-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-bold text-lg text-slate-900 dark:text-slate-100">Menu</h2>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200"
              >
                <XMarkIcon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            {/* Mobile Actions */}
            <div className="relative p-5 space-y-3 border-b border-slate-200/50 dark:border-slate-700/50 md:hidden">
              <button
                onClick={handleSearchAndClose}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200"
              >
                <MagnifyingGlassIcon className="h-4 w-4 text-brand-violet dark:text-accent-purple-light" />
                <span className="text-slate-700 dark:text-slate-200">Search Sequencers</span>
              </button>
              <div className="w-full">
                <ConnectWallet />
              </div>
            </div>

            {/* Navigation */}
            <nav className="relative p-5 space-y-2 flex-grow overflow-y-auto custom-scrollbar">
              {navItems.map((item) =>
                isNavGroup(item) ? renderNavGroup(item) : renderNavLink(item)
              )}
            </nav>

            {/* Footer */}
            <div className="relative p-5 border-t border-slate-200/50 dark:border-slate-700/50">
              <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Theme</span>
                </div>
                <ThemeToggleButton />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};