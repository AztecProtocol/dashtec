'use client';

import { useState } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { RightSidebar } from './RightSidebar';
import { SearchModal } from '../features/search/SearchModal';
import { TopProgressBar } from '../ui/TopProgressBar';
import { SearchModalProvider, useSearchModal } from '@/context/SearchModalContext';
import { WatchlistProvider } from '@/context/WatchlistContext';
/** Inner layout that consumes SearchModalContext */
function ClientLayoutInner({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isSearchOpen, setIsSearchOpen } = useSearchModal();

  return (
    <WatchlistProvider>
      <div className="relative min-h-screen w-full overflow-x-hidden bg-slate-100 dark:bg-slate-900">
        <TopProgressBar />
        <RightSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} onSearchClick={() => setIsSearchOpen(true)} />
        <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

        <div
          className="flex flex-col min-h-screen relative"
        >
          <Header
            onMenuClick={() => setIsSidebarOpen(true)}
            onSearchClick={() => setIsSearchOpen(true)}
          />
          <main className="flex-grow">
            {children}
          </main>
          <Footer />
        </div>
      </div>
    </WatchlistProvider>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <SearchModalProvider>
      <ClientLayoutInner>{children}</ClientLayoutInner>
    </SearchModalProvider>
  );
}