'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bars3Icon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  HomeIcon,
  CubeIcon,
  RectangleStackIcon,
  ScaleIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConnectWallet } from '../ui/ConnectWallet';
import { Z_INDEX } from '@/utils/constants';
import { useNetworks } from '@/hooks/useNetworks';
import { useRollup } from '@/context/RollupContext';
import { getAddressUrl } from '@/utils/blockExplorer';

/** Warning banner shown when viewing an older (inactive) rollup */
const InactiveRollupBanner: React.FC = () => {
  const { globalRollup, activeRollup, versions } = useRollup();
  if (globalRollup === 'active' || globalRollup === 'all' || globalRollup === activeRollup) return null;

  const label = `${globalRollup.slice(0, 6)}...${globalRollup.slice(-4)}`;
  const version = versions.find(v => v.address === globalRollup);
  const frozenAtBlock = version?.frozenAtBlock;

  return (
    <div className="bg-amber-500/10 border-t border-amber-500/20 px-4 py-1.5 text-center text-xs text-amber-700 dark:text-amber-400">
      You&apos;re viewing an older version of rollup{' '}
      <a
        href={getAddressUrl(globalRollup)}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono font-medium underline decoration-amber-500/30 hover:decoration-amber-500 transition-colors"
      >
        {label}
      </a>
      {frozenAtBlock
        ? <> - data is frozen since block <span className="font-mono font-medium">#{Number(frozenAtBlock).toLocaleString()}</span>.</>
        : <>.</>
      }{' '}
      The information may still be incomplete (beta feature).
    </div>
  );
};

interface HeaderProps {
  onMenuClick: () => void;
  onSearchClick: () => void;
}

/**
 * NetworkSelector component - Badge-style selector with dropdown
 */
const NetworkSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { networks, selectedNetwork, currentNetwork, switchNetwork } = useNetworks();

  const handleNetworkChange = (network: 'mainnet' | 'sepolia') => {
    setIsOpen(false);
    switchNetwork(network);
  };

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05, y: -1 }}
        whileTap={{ scale: 0.95 }}
        className="relative text-white font-bold px-1.5 py-0.5 rounded-md overflow-hidden cursor-pointer touch-manipulation"
      >
        {/* Animated gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background: currentNetwork.gradient.map((color, i, arr) => {
              const nextColor = arr[(i + 1) % arr.length];
              return `linear-gradient(45deg, ${color}, ${nextColor})`;
            }).join(', '),
          }}
        />
        <span className="relative z-10 flex items-center gap-1 leading-none">
          <span className="text-[10px]">{selectedNetwork.toUpperCase()}</span>
          <ChevronDownIcon className={`h-2.5 w-2.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop to close dropdown */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-1.5 w-28 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl backdrop-blur-sm overflow-hidden z-50"
            >
              {networks.map((network) => (
                <button
                  key={network.value}
                  onClick={() => handleNetworkChange(network.value)}
                  className={`w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs transition-colors ${selectedNetwork === network.value
                    ? 'bg-brand-violet/10 dark:bg-accent-purple-light/10 text-brand-violet dark:text-accent-purple-light font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                >
                  {network.label}
                  {selectedNetwork === network.value && (
                    <svg className="ml-auto h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * RollupSelector component - Badge-style selector for rollup version switching
 * Hidden when only a single rollup version exists
 */
const RollupSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { versions, globalRollup, setGlobalRollup, activeRollup } = useRollup();

  if (versions.length <= 1) return null;

  /** Derive display label from current selection */
  const currentLabel = globalRollup === 'all'
    ? 'ALL'
    : versions.find(v => v.address === globalRollup)?.label.toUpperCase() ?? 'ACTIVE';

  /** Handle version selection from dropdown */
  const handleSelect = (address: string) => {
    setIsOpen(false);
    setGlobalRollup(address);
  };

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05, y: -1 }}
        whileTap={{ scale: 0.95 }}
        className="relative text-white font-bold px-1.5 py-0.5 rounded-md overflow-hidden cursor-pointer touch-manipulation"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-accent-cyan to-accent-blue" />
        <span className="relative z-10 flex items-center gap-1 leading-none">
          <span className="text-[10px]">{currentLabel}</span>
          <ChevronDownIcon className={`h-2.5 w-2.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-1.5 w-36 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl backdrop-blur-sm overflow-hidden z-50"
            >
              {/* Individual version options */}
              {versions.map((version) => (
                <button
                  key={version.address}
                  onClick={() => handleSelect(version.address)}
                  className={`w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs transition-colors ${
                    globalRollup === version.address
                      ? 'bg-accent-cyan/10 dark:bg-accent-cyan/10 text-accent-cyan font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  {/* Active/deprecated dot indicator */}
                  <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    version.address === activeRollup ? 'bg-emerald-500' : 'bg-slate-400'
                  }`} />
                  <span>{version.label}</span>
                  {version.deprecated && (
                    <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500">old</span>
                  )}
                  {globalRollup === version.address && (
                    <svg className="ml-auto h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}

            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

/** Desktop navigation item types */
interface DesktopNavLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface DesktopNavGroup {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  links: DesktopNavLink[];
}

type DesktopNavItem = DesktopNavLink | DesktopNavGroup;

const isDesktopNavGroup = (item: DesktopNavItem): item is DesktopNavGroup => 'links' in item;

/** Desktop navigation items — mirrors RightSidebar nav structure */
const desktopNavItems: DesktopNavItem[] = [
  { href: '/', label: 'Dashboard', icon: HomeIcon },
  {
    label: 'Sequencers',
    icon: CubeIcon,
    links: [
      { href: '/sequencers', label: 'Registry', icon: CubeIcon },
      { href: '/providers', label: 'Providers', icon: CubeIcon },
      { href: '/queue', label: 'Queue', icon: CubeIcon },
      { href: '/watchlist', label: 'Watchlist', icon: CubeIcon },
    ],
  },
  {
    label: 'Epochs',
    icon: RectangleStackIcon,
    links: [
      { href: '/epoch-performance', label: 'Live Epoch', icon: RectangleStackIcon },
      { href: '/epochs', label: 'History', icon: RectangleStackIcon },
    ],
  },
  { href: '/slashing-history', label: 'Slashing', icon: ScaleIcon },
  { href: '/governance', label: 'Governance', icon: ScaleIcon },
  {
    label: 'Prover',
    icon: CpuChipIcon,
    links: [
      { href: '/prover/network', label: 'Network Overview', icon: CpuChipIcon },
      { href: '/prover', label: 'Prover Lookup', icon: CpuChipIcon },
    ],
  },
];

/** DesktopNav — Horizontal navigation with hover dropdowns for desktop viewports */
const DesktopNav: React.FC = () => {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (label: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpenDropdown(label);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setOpenDropdown(null), 150);
  };

  const isLinkActive = (href: string) => pathname === href;
  const isGroupActive = (group: DesktopNavGroup) => group.links.some(l => pathname === l.href);

  return (
    <nav className="hidden lg:flex items-center gap-0.5">
      {desktopNavItems.map((item) => {
        if (isDesktopNavGroup(item)) {
          const active = isGroupActive(item);
          return (
            <div
              key={item.label}
              className="relative"
              onMouseEnter={() => handleMouseEnter(item.label)}
              onMouseLeave={handleMouseLeave}
            >
              <button
                onClick={() => setOpenDropdown(openDropdown === item.label ? null : item.label)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'text-brand-violet dark:text-accent-purple-light'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                }`}
              >
                <item.icon className={`hidden xl:block h-4 w-4 flex-shrink-0 ${active ? 'text-brand-violet dark:text-accent-purple-light' : 'text-slate-400 dark:text-slate-500'}`} />
                {item.label}
                <ChevronDownIcon className={`h-3 w-3 transition-transform duration-200 ${openDropdown === item.label ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {openDropdown === item.label && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute top-full left-0 mt-1 w-44 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg z-50"
                    onMouseEnter={() => handleMouseEnter(item.label)}
                    onMouseLeave={handleMouseLeave}
                  >
                    {item.links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setOpenDropdown(null)}
                        className={`block px-3 py-2 text-sm transition-colors ${
                          isLinkActive(link.href)
                            ? 'text-brand-violet dark:text-accent-purple-light bg-brand-violet/5 dark:bg-accent-purple-light/5 font-semibold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        }

        const active = isLinkActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              active
                ? 'text-brand-violet dark:text-accent-purple-light'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700/50'
            }`}
          >
            <item.icon className={`hidden xl:block h-4 w-4 flex-shrink-0 ${active ? 'text-brand-violet dark:text-accent-purple-light' : 'text-slate-400 dark:text-slate-500'}`} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
};

// The header's content, extracted into a component to avoid repetition.
const HeaderContent: React.FC<HeaderProps> = ({ onMenuClick, onSearchClick }) => {
  return (
    <div className="container mx-auto px-3 xs:px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between h-14 xs:h-16 sm:h-20">
        <div className="flex items-center flex-shrink-0">
          <div className='flex items-center'>
            {/* Enhanced Logo Section */}
            <Link href="/" className='cursor-pointer group touch-manipulation'>
              <motion.div
                whileHover={{ scale: 1.05, rotate: [0, -2, 2, 0] }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className='relative w-8 h-8 xs:w-10 xs:h-10 mr-1.5 xs:mr-2 sm:w-12 sm:h-12 sm:mr-3 md:mr-4'
              >
                {/* Animated background glow */}
                <motion.div
                  animate={{
                    rotate: [0, 360],
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-brand-violet/20 via-amber-500/10 to-accent-purple/20 rounded-full  opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                />
                <img
                  src="/logo.png"
                  alt="Aztec Sequencer Dashboard Logo"
                  className="relative object-contain w-full h-full drop-shadow-lg"
                />
              </motion.div>
            </Link>

            {/* Enhanced Brand Section */}
            <div className="flex flex-col">
              <div className="flex items-center">
                <Link href="/" className='cursor-pointer group touch-manipulation'>
                  <motion.span
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    className="font-bold text-xl bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 dark:from-slate-50 dark:via-slate-100 dark:to-slate-50 group-hover:from-brand-violet group-hover:via-amber-600 group-hover:to-accent-purple bg-clip-text text-transparent transition-all duration-300 leading-tight"
                  >
                    <span className="sm:hidden lg:inline">Dashtec</span>
                    <span className="hidden sm:inline lg:hidden">Dashtec - Sequencer Dashboard</span>
                  </motion.span>
                </Link>

                {/* Network & Rollup Selector Badges */}
                <div className="ml-1.5 xs:ml-2 sm:ml-3 self-center sm:self-start flex items-center gap-1">
                  <NetworkSelector />
                  <RollupSelector />
                </div>
              </div>

              {/* Enhanced Subtitle - Hidden on smallest screens */}
              <motion.span
                whileHover={{ y: -0.5 }}
                className="hidden sm:block lg:hidden xl:block font-light text-xs leading-tight sm:leading-normal md:text-sm text-slate-600 dark:text-slate-400"
              >
                Powered by{' '}
                <motion.a
                  href='https://dashnode.org'
                  target="_blank"
                  rel="noopener noreferrer"
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ scale: 1.02 }}
                  className="bg-gradient-to-r from-brand-violet to-amber-600 bg-clip-text text-transparent hover:from-amber-600 hover:to-brand-violet transition-all duration-300 font-semibold touch-manipulation"
                >
                  DashLabs
                </motion.a>
              </motion.span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 xs:gap-2 sm:gap-4">
          <DesktopNav />
          <div className="hidden lg:flex items-center gap-2 sm:gap-4">
            <button
              onClick={onSearchClick}
              className="p-2.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors touch-manipulation active:scale-95"
              aria-label="Open search"
            >
              <MagnifyingGlassIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            <ConnectWallet />
          </div>
          <button
            id="mobile-menu-button"
            onClick={onMenuClick}
            className="lg:hidden p-2 xs:p-2.5 min-w-[40px] min-h-[40px] xs:min-w-[44px] xs:min-h-[44px] flex items-center justify-center rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-violet transition-colors touch-manipulation active:scale-95"
            aria-label="Open menu"
          >
            <Bars3Icon className="h-5 w-5 xs:h-6 xs:w-6 block" />
          </button>
        </div>
      </div>
    </div>
  );
};


export const Header: React.FC<HeaderProps> = (props) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /** Keep spacer height in sync with actual header height */
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setHeaderHeight(entry.contentRect.height));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div style={{ height: headerHeight }} />

      <motion.header
        initial={false}
        animate={{
          y: isScrolled ? 0 : -8,
          opacity: isScrolled ? 1 : 0,
        }}
        transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
        className="fixed top-0 left-0 right-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 shadow-lg"
        style={{ zIndex: Z_INDEX.TOP_NAVBAR + 1, pointerEvents: isScrolled ? 'auto' : 'none' }}
      >
        <HeaderContent {...props} />
        <InactiveRollupBanner />
      </motion.header>

      <header
        ref={headerRef}
        className="bg-white dark:bg-slate-800 shadow-md dark:shadow-dark-card-image absolute top-0 left-0 right-0 border-b border-slate-200 dark:border-slate-700"
        style={{ zIndex: Z_INDEX.TOP_NAVBAR }}
      >
        <HeaderContent {...props} />
        <InactiveRollupBanner />
      </header>
    </>
  );
};