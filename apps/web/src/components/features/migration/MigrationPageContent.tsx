'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  ArrowPathIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowRightStartOnRectangleIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';
import { useRollupMigration, MigrationProvider, RollupMigration } from '@/hooks/queries/useRollupMigration';
import { useDebounce } from '@/hooks/useDebounce';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useApp } from '@/context/AppContext';
import { ValidatorAvatar } from '@/components/ui/ValidatorAvatar';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { getStatusClasses } from '@/hooks/useStatusColor';
import { getValidatorLink } from '@/utils/validatorLinks';
import { formatBalance } from '@/utils/formatters';

const PROVIDERS_COLLAPSED = 8;

/**
 * Migration page — how far validators have moved from a previous rollup
 * version to the one that replaced it, and who is still on the old one.
 */
export const MigrationPageContent: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') ?? undefined;

  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [provider, setProvider] = useState<MigrationProvider | null>(null);
  const debouncedSearch = useDebounce(searchTerm, 400);

  const { data, isLoading, isFetching, error } = useRollupMigration({
    from,
    page,
    search: debouncedSearch || undefined,
    provider: provider ? provider.providerIdentifier ?? 'independent' : undefined,
  });

  const selectVersion = (address: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('from', address);
    router.replace(`${pathname}?${params}`, { scroll: false });
    setPage(1);
    setProvider(null);
  };

  const selectProvider = (next: MigrationProvider | null) => {
    setProvider(next);
    setPage(1);
  };

  if (isLoading) return <MigrationSkeleton />;

  if (error) {
    return (
      <Shell>
        <EmptyCard title="Couldn't load migration progress" body="Please try again in a moment." />
      </Shell>
    );
  }

  const migration = data?.migration;
  if (!migration) {
    return (
      <Shell>
        <EmptyCard
          title="Nothing to migrate"
          body="There is only one rollup version on this network, so every sequencer is already on it."
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <Hero migration={migration} deprecated={data?.deprecated ?? []} onSelectVersion={selectVersion} />

      <div className="space-y-6">
        <ProgressCard migration={migration} />

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <div className="xl:col-span-2">
            <ProviderBreakdown
              migration={migration}
              selected={provider}
              onSelect={selectProvider}
            />
          </div>
          <div className="xl:col-span-3">
            <RemainingList
              migration={migration}
              searchTerm={searchTerm}
              onSearch={(value) => { setSearchTerm(value); setPage(1); }}
              provider={provider}
              onClearProvider={() => selectProvider(null)}
              onPageChange={setPage}
              isFetching={isFetching}
            />
          </div>
        </div>
      </div>
    </Shell>
  );
};

/* ------------------------------------------------------------------------ */

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <main className="flex-grow container mx-auto">
    <div className="mb-6">
      <Link
        href="/"
        className="inline-flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white/60 dark:bg-slate-700/40 backdrop-blur-sm rounded-lg sm:rounded-xl border border-white/30 dark:border-slate-600/30 hover:bg-white/80 dark:hover:bg-slate-700/60 transition-all duration-300 hover:shadow-lg"
      >
        <ArrowLeftIcon className="h-4 w-4 text-brand-violet dark:text-accent-purple-light" />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Back to Dashboard</span>
      </Link>
    </div>
    {children}
  </main>
);

const Hero: React.FC<{
  migration: RollupMigration;
  deprecated: { address: string; label: string }[];
  onSelectVersion: (address: string) => void;
}> = ({ migration, deprecated, onSelectVersion }) => {
  const upgraded = migration.upgradedAt?.timestamp
    ? new Date(migration.upgradedAt.timestamp * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-900/20 border border-slate-200/50 dark:border-slate-700/50 shadow-xl">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-cyan-500/10 to-transparent rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/30 to-cyan-500/20 rounded-lg sm:rounded-xl blur-sm sm:blur-md"></div>
                <div className="relative p-2 sm:p-2.5 bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-800/80 dark:to-slate-900/60 backdrop-blur-sm rounded-lg sm:rounded-xl border border-white/20 dark:border-slate-700/50 shadow-md sm:shadow-lg">
                  <ArrowPathIcon className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <h1 className="flex items-center gap-2 sm:gap-3 text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
                <span>{migration.from.label}</span>
                <ArrowRightIcon className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400" />
                <span className="bg-gradient-to-r from-emerald-600 to-cyan-600 dark:from-emerald-400 dark:to-cyan-400 bg-clip-text text-transparent">
                  {migration.to.label}
                </span>
                <span className="text-slate-400 dark:text-slate-500 font-semibold">migration</span>
              </h1>
            </div>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
              {upgraded ? <>The network moved to {migration.to.label} on {upgraded}. </> : null}
              Sequencers that haven&apos;t moved stay on {migration.from.label} until they exit or stake again on {migration.to.label}.
            </p>
          </div>

          {deprecated.length > 1 && (
            <div className="flex-shrink-0">
              <label htmlFor="migration-version" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Previous version
              </label>
              <select
                id="migration-version"
                value={migration.from.address}
                onChange={(e) => onSelectVersion(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                {[...deprecated].reverse().map((version) => (
                  <option key={version.address} value={version.address}>{version.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ProgressCard: React.FC<{ migration: RollupMigration }> = ({ migration }) => {
  const { networkConfig } = useApp();
  const symbol = networkConfig?.stakingTokenSymbol ?? 'STK';
  const decimals = networkConfig?.stakingTokenDecimals ?? 18;
  const { migrated, active, exiting, exited } = migration.summary;

  // Exited sequencers left the network rather than migrating; they are listed
  // but kept out of the progress so leaving doesn't count as moving.
  const inScope = migrated.count + active.count + exiting.count;
  const percent = inScope > 0 ? (migrated.count / inScope) * 100 : 0;
  const share = (n: number) => (inScope > 0 ? `${(n / inScope) * 100}%` : '0%');

  const tiles = [
    { key: 'migrated', label: `Moved to ${migration.to.label}`, totals: migrated, icon: CheckCircleIcon, dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
    { key: 'active', label: `Still on ${migration.from.label}`, totals: active, icon: ClockIcon, dot: 'bg-slate-400 dark:bg-slate-500', text: 'text-slate-700 dark:text-slate-200' },
    { key: 'exiting', label: `Exiting ${migration.from.label}`, totals: exiting, icon: ArrowRightStartOnRectangleIcon, dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
    { key: 'exited', label: 'Exited', totals: exited, icon: XMarkIcon, dot: 'bg-slate-300 dark:bg-slate-600', text: 'text-slate-500 dark:text-slate-400' },
  ];

  return (
    <section className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg p-4 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Progress</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">{percent.toFixed(1)}%</span>
          <span className="ml-2">of {inScope.toLocaleString()} sequencers have moved</span>
        </p>
      </div>

      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"
        role="img"
        aria-label={`${migrated.count} moved, ${exiting.count} exiting, ${active.count} still on ${migration.from.label}`}
      >
        <div className="bg-emerald-500 transition-all duration-500" style={{ width: share(migrated.count) }} />
        <div className="bg-amber-500 transition-all duration-500" style={{ width: share(exiting.count) }} />
      </div>

      <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map(({ key, label, totals, icon: Icon, dot, text }) => (
          <div key={key} className="rounded-lg bg-slate-50 dark:bg-slate-900/40 ring-1 ring-slate-200/70 dark:ring-slate-700 p-3 sm:p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span className={`w-2 h-2 rounded-full ${dot}`} />
              <span className="truncate">{label}</span>
              <Icon className="ml-auto h-4 w-4 flex-shrink-0 opacity-60" />
            </div>
            <div className={`mt-1.5 text-xl sm:text-2xl font-bold tabular-nums ${text}`}>
              {totals.count.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {formatBalance(totals.stake, decimals, symbol, true)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const ProviderBreakdown: React.FC<{
  migration: RollupMigration;
  selected: MigrationProvider | null;
  onSelect: (provider: MigrationProvider | null) => void;
}> = ({ migration, selected, onSelect }) => {
  const [expanded, setExpanded] = useState(false);
  const providers = migration.providers.filter((p) => p.migrated + p.remaining + p.exiting > 0);
  const visible = expanded ? providers : providers.slice(0, PROVIDERS_COLLAPSED);

  return (
    <section className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
      <header className="px-4 sm:px-5 py-3 border-b border-slate-100 dark:border-slate-700">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">By provider</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Most sequencers still on {migration.from.label} first. Select one to filter the list.
        </p>
      </header>

      {providers.length === 0 ? (
        <p className="px-5 py-8 text-sm text-center text-slate-500 dark:text-slate-400">No sequencers on {migration.from.label}.</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700/70">
          {visible.map((p) => {
            const total = p.migrated + p.remaining + p.exiting;
            const isSelected = selected?.providerIdentifier === p.providerIdentifier;
            return (
              <li key={p.providerIdentifier ?? 'independent'}>
                <button
                  onClick={() => onSelect(isSelected ? null : p)}
                  aria-pressed={isSelected}
                  className={`w-full text-left px-4 sm:px-5 py-3 transition-colors ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-900/20'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 flex-shrink-0 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-700 ring-1 ring-slate-200 dark:ring-slate-600">
                      {p.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.logoUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                          {(p.name ?? 'I').slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                          {p.name ?? (p.providerIdentifier ? `Provider ${p.providerIdentifier}` : 'Independent')}
                        </span>
                        <span className="flex-shrink-0 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                          {p.remaining > 0 ? (
                            <><span className="font-semibold text-slate-800 dark:text-slate-100">{p.remaining}</span> left</>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">all moved</span>
                          )}
                        </span>
                      </div>
                      <div className="mt-1.5 flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                        <div className="bg-emerald-500" style={{ width: `${(p.migrated / total) * 100}%` }} />
                        <div className="bg-amber-500" style={{ width: `${(p.exiting / total) * 100}%` }} />
                      </div>
                      <div className="mt-1 text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                        {p.migrated} of {total} moved{p.exiting > 0 ? ` · ${p.exiting} exiting` : ''}
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {providers.length > PROVIDERS_COLLAPSED && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-5 py-2.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40"
        >
          {expanded ? 'Show fewer' : `Show all ${providers.length} providers`}
        </button>
      )}
    </section>
  );
};

const RemainingList: React.FC<{
  migration: RollupMigration;
  searchTerm: string;
  onSearch: (value: string) => void;
  provider: MigrationProvider | null;
  onClearProvider: () => void;
  onPageChange: (page: number) => void;
  isFetching: boolean;
}> = ({ migration, searchTerm, onSearch, provider, onClearProvider, onPageChange, isFetching }) => {
  const { networkConfig } = useApp();
  const symbol = networkConfig?.stakingTokenSymbol ?? 'STK';
  const decimals = networkConfig?.stakingTokenDecimals ?? 18;
  const { isWatchlisted, toggleWatchlist } = useWatchlist();
  const { items, total, page, totalPages } = migration.remaining;
  const filtered = Boolean(searchTerm || provider);

  const providerLabel = useMemo(
    () => provider ? (provider.name ?? (provider.providerIdentifier ? `Provider ${provider.providerIdentifier}` : 'Independent')) : null,
    [provider],
  );

  return (
    <section className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
      <header className="px-4 sm:px-5 py-3 border-b border-slate-100 dark:border-slate-700 space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Still on {migration.from.label}
            <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400 tabular-nums">{total.toLocaleString()}</span>
          </h2>
          {isFetching && <span className="text-xs text-slate-400">Updating…</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[12rem]">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search address, name or provider"
              aria-label={`Search sequencers still on ${migration.from.label}`}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40 py-2 pl-9 pr-3 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </div>
          {providerLabel && (
            <button
              onClick={onClearProvider}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-700/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
            >
              {providerLabel}
              <XMarkIcon className="h-3.5 w-3.5" aria-label="Clear provider filter" />
            </button>
          )}
        </div>
      </header>

      {items.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <CheckCircleIcon className="mx-auto h-10 w-10 text-emerald-500/70" />
          <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">
            {filtered ? 'No matching sequencers' : `Every sequencer has left ${migration.from.label}`}
          </p>
          {filtered && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Try a different search or clear the provider filter.</p>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/40 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <tr>
                  <th scope="col" className="px-4 sm:px-5 py-2.5 text-left font-medium">Sequencer</th>
                  <th scope="col" className="hidden md:table-cell px-3 py-2.5 text-left font-medium">Provider</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Stake</th>
                  <th scope="col" className="hidden sm:table-cell px-3 py-2.5 text-left font-medium">Status</th>
                  <th scope="col" className="w-10 px-3 py-2.5"><span className="sr-only">Watch</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/70">
                {items.map((v) => {
                  const status = getStatusClasses(v.status);
                  const watched = isWatchlisted(v.address);
                  const displayName = v.name || v.xHandle || v.discordUsername;
                  return (
                    <tr key={v.address} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="px-4 sm:px-5 py-2.5">
                        <Link href={getValidatorLink(v.address)} className="flex items-center gap-2.5 min-w-0 group">
                          <ValidatorAvatar
                            address={v.address}
                            xImageUrl={v.imageUrl}
                            xHandle={v.xHandle}
                            discordUsername={v.discordUsername}
                            name={v.name}
                            index={v.index ?? undefined}
                            size="sm"
                            variant="table"
                          />
                          <span className="min-w-0">
                            {displayName && (
                              <span className="block truncate font-medium text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                                {displayName}
                              </span>
                            )}
                            <span className={`block truncate font-mono text-xs ${displayName ? 'text-slate-500 dark:text-slate-400' : 'text-slate-700 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'}`}>
                              {v.address.slice(0, 10)}…{v.address.slice(-6)}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="hidden md:table-cell px-3 py-2.5 text-slate-600 dark:text-slate-300">
                        <span className="block truncate max-w-[12rem]">{v.provider?.name ?? (v.provider ? v.provider.providerIdentifier : '—')}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-200 whitespace-nowrap">
                        {formatBalance(v.stake, decimals, symbol, true)}
                      </td>
                      <td className="hidden sm:table-cell px-3 py-2.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${status.bg} ${status.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                          {v.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => toggleWatchlist(v.address)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                          title={watched ? 'Remove from watchlist' : 'Add to watchlist'}
                          aria-pressed={watched}
                        >
                          {watched ? <StarSolidIcon className="h-4 w-4" /> : <StarOutlineIcon className="h-4 w-4" />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="px-4 sm:px-5 py-3 border-t border-slate-100 dark:border-slate-700">
              <PaginationControls currentPage={page} totalPages={totalPages} onPageChange={onPageChange} />
            </div>
          )}
        </>
      )}
    </section>
  );
};

const EmptyCard: React.FC<{ title: string; body: string }> = ({ title, body }) => (
  <div className="rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xl text-center py-20 px-6">
    <ArrowPathIcon className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
    <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h2>
    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">{body}</p>
  </div>
);

const MigrationSkeleton: React.FC = () => (
  <main className="flex-grow container mx-auto space-y-6">
    <div className="h-36 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
    <div className="h-48 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <div className="xl:col-span-2 h-96 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
      <div className="xl:col-span-3 h-96 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
    </div>
  </main>
);
