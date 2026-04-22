# Multi-Rollup Web Rework Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add multi-rollup version support to apps/web — header selector, per-page chip filters, rollup-scoped API queries, and migration tracking across N rollup versions.

**Architecture:** RollupContext provides global rollup state. Header selector sets default. Per-page chip filter overrides. All API routes accept `?rollup=` param. All React Query hooks include rollup in cache key. Raw SQL CTEs parameterized with `rollup_address`.

**Tech Stack:** Next.js 16 (App Router), React 19, TanStack Query 5, Prisma 7, Tailwind CSS 4, Framer Motion 12, Headless UI 2

**Design doc:** `docs/plans/2026-03-06-multi-rollup-web-rework-design.md`

---

## Task 1: Add Rollup Registry to Config

**Files:**
- Modify: `apps/web/src/config/env.ts`
- Create: `apps/web/src/config/rollup.ts`
- Modify: `apps/web/src/config/index.ts`
- Create: `apps/web/src/types/rollup.ts`

**Step 1: Create rollup types**

```typescript
// apps/web/src/types/rollup.ts
export interface RollupVersion {
  address: string;
  label: string;
  startBlock: number;
  endBlock: number | null;
  deprecated: boolean;
}

export interface RollupRegistry {
  versions: RollupVersion[];
  activeAddress: string;
}
```

**Step 2: Create rollup config loader**

```typescript
// apps/web/src/config/rollup.ts
import { getEnv } from './env';
import type { RollupRegistry, RollupVersion } from '@/types/rollup';

let rollupRegistry: RollupRegistry | null = null;

/** Load rollup registry from ROLLUP_VERSIONS env or fall back to single address */
export function getRollupRegistry(): RollupRegistry {
  if (rollupRegistry) return rollupRegistry;

  const env = getEnv();
  const versionsJson = process.env.ROLLUP_VERSIONS;

  if (versionsJson) {
    try {
      const parsed = JSON.parse(versionsJson) as RollupRegistry;
      rollupRegistry = parsed;
      return parsed;
    } catch {
      // Fall through to single-address fallback
    }
  }

  // Backward compatible: single ROLLUP_CONTRACT_ADDRESS
  rollupRegistry = {
    versions: [{
      address: env.ROLLUP_CONTRACT_ADDRESS.toLowerCase(),
      label: 'v1',
      startBlock: 0,
      endBlock: null,
      deprecated: false,
    }],
    activeAddress: env.ROLLUP_CONTRACT_ADDRESS.toLowerCase(),
  };
  return rollupRegistry;
}

/** Get the active rollup address (latest non-deprecated) */
export function getActiveRollupAddress(): string {
  return getRollupRegistry().activeAddress;
}

/** Check if an address is a known rollup version */
export function isValidRollupAddress(address: string): boolean {
  const registry = getRollupRegistry();
  return registry.versions.some(v => v.address.toLowerCase() === address.toLowerCase());
}
```

**Step 3: Update config index export**

Add to `apps/web/src/config/index.ts`:
```typescript
export * from './rollup';
```

**Step 4: Commit**

```bash
git add apps/web/src/types/rollup.ts apps/web/src/config/rollup.ts apps/web/src/config/index.ts
git commit -m "feat: add rollup registry config with backward-compatible fallback"
```

---

## Task 2: Create Rollup Param Parser for API Routes

**Files:**
- Create: `apps/web/src/lib/rollupParam.ts`

**Step 1: Create the shared helper**

```typescript
// apps/web/src/lib/rollupParam.ts
import { getActiveRollupAddress, getRollupRegistry, isValidRollupAddress } from '@/config/rollup';
import { Prisma } from '@dashtec/database';

/** Parse ?rollup= query param into array of addresses */
export function parseRollupParam(searchParams: URLSearchParams): string[] {
  const rollup = searchParams.get('rollup');

  if (!rollup || rollup === 'active') {
    return [getActiveRollupAddress()];
  }

  if (rollup === 'all') {
    return getRollupRegistry().versions.map(v => v.address);
  }

  const addresses = rollup.split(',').map(a => a.trim().toLowerCase());
  const valid = addresses.filter(isValidRollupAddress);

  return valid.length > 0 ? valid : [getActiveRollupAddress()];
}

/** Create SQL fragment for rollup filtering */
export function rollupWhereClause(rollupAddresses: string[]): Prisma.Sql {
  if (rollupAddresses.length === 1) {
    return Prisma.sql`rollup_address = ${rollupAddresses[0]}`;
  }
  return Prisma.sql`rollup_address = ANY(${rollupAddresses}::varchar[])`;
}

/** Create SQL fragment for table-qualified rollup filtering */
export function rollupWhereClauseFor(table: string, rollupAddresses: string[]): Prisma.Sql {
  if (rollupAddresses.length === 1) {
    return Prisma.sql`${Prisma.raw(table)}.rollup_address = ${rollupAddresses[0]}`;
  }
  return Prisma.sql`${Prisma.raw(table)}.rollup_address = ANY(${rollupAddresses}::varchar[])`;
}
```

**Step 2: Commit**

```bash
git add apps/web/src/lib/rollupParam.ts
git commit -m "feat: add rollup query param parser and SQL helpers"
```

---

## Task 3: Create GET /api/rollups Endpoint

**Files:**
- Create: `apps/web/src/app/api/rollups/route.ts`

**Step 1: Create the endpoint**

```typescript
// apps/web/src/app/api/rollups/route.ts
import { NextResponse } from 'next/server';
import { getRollupRegistry } from '@/config/rollup';
import prisma from '@/lib/prisma';
import { createBenchmark } from '@/services/benchmark';
import { logError } from '@/services/error/errorLogger';

export async function GET() {
  const benchmark = createBenchmark();

  try {
    const registry = getRollupRegistry();

    // Enrich versions with live counts from DB
    const enriched = await Promise.all(
      registry.versions.map(async (version) => {
        const [validatorCount, epochCount] = await Promise.all([
          prisma.validator.count({
            where: { rollup_address: version.address },
          }),
          prisma.epoch.count({
            where: { rollup_address: version.address },
          }),
        ]);

        return {
          ...version,
          validatorCount,
          epochCount,
        };
      })
    );

    return NextResponse.json({
      versions: enriched,
      active: registry.activeAddress,
      benchmark: benchmark.elapsed(),
      status: 'ok',
    });
  } catch (error) {
    logError('rollups', error);
    return NextResponse.json(
      { error: 'Failed to fetch rollup versions', status: 'error' },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add apps/web/src/app/api/rollups/route.ts
git commit -m "feat: add GET /api/rollups metadata endpoint"
```

---

## Task 4: Add Rollup Filter to Validators API Route (Reference Pattern)

This task establishes the pattern for all other API routes.

**Files:**
- Modify: `apps/web/src/app/api/validators/route.ts`
- Modify: `apps/web/src/db/queries/validatorAggregates.ts`
- Modify: `apps/web/src/types/queries/validatorAggregates.ts`

**Step 1: Add rollup to CTE options type**

In `apps/web/src/types/queries/validatorAggregates.ts`, add `rollupAddresses` to `BaseCTEOptions`:

```typescript
export interface BaseCTEOptions {
  targetTable?: string;
  rollupAddresses?: string[]; // Add this
}
```

**Step 2: Add rollup filter to createValidatorAggregatesCTE**

In `apps/web/src/db/queries/validatorAggregates.ts`, modify `createValidatorAggregatesCTE`:

Add after existing JOIN clauses, a WHERE condition on `v.rollup_address`:

```sql
WHERE ${rollupFilter}
```

Where `rollupFilter` is built from `options.rollupAddresses` using the `rollupWhereClauseFor('v', rollupAddresses)` helper.

**Step 3: Parse rollup param in API route**

In `apps/web/src/app/api/validators/route.ts`, add after line 21:

```typescript
import { parseRollupParam } from '@/lib/rollupParam';

// Inside GET handler, after searchParams extraction:
const rollupAddresses = parseRollupParam(searchParams);
```

Pass `rollupAddresses` through to CTE functions.

**Step 4: Commit**

```bash
git add apps/web/src/app/api/validators/route.ts apps/web/src/db/queries/validatorAggregates.ts apps/web/src/types/queries/validatorAggregates.ts
git commit -m "feat: add rollup filter to validators API route and CTE queries"
```

---

## Task 5: Add Rollup Filter to Remaining Tier 1 API Routes

Apply the same pattern from Task 4 to all Tier 1 routes. Each route needs:
1. Import `parseRollupParam` from `@/lib/rollupParam`
2. Extract `rollupAddresses` from `searchParams`
3. Add `WHERE rollup_address` condition to queries

**Routes to update (with query type):**

| Route | Query Type | Key Change |
|-------|-----------|------------|
| `api/dashboard/current-epoch-stats/route.ts` | Raw SQL | Add `AND rollup_address = ANY($1)` to epoch/validator queries |
| `api/dashboard/historical-rates/route.ts` | Raw SQL | Filter `ValidatorEpochPerformance` by rollup |
| `api/dashboard/top-validators/route.ts` | Raw SQL CTE | Pass rollupAddresses to CTE options |
| `api/dashboard/voting-overview/route.ts` | Raw SQL | Filter governance queries by rollup |
| `api/epochs/[epochNumber]/historical/route.ts` | Prisma | Add `rollup_address` to `where` clause |
| `api/epochs/[epochNumber]/live-slot-activity/route.ts` | Sentinel API | Pass rollup context to Sentinel call |
| `api/epochs/integrity/route.ts` | Prisma | Filter `EpochIntegrityStats` by rollup |
| `api/governance/rounds/route.ts` | Raw SQL | Filter by rollup |
| `api/governance/rounds/[roundNumber]/payloads/route.ts` | Raw SQL | Filter by rollup |
| `api/governance/signaling-matrix/route.ts` | Raw SQL CTE | Pass rollup to matrix queries |
| `api/governance/sequencer-signals/route.ts` | Raw SQL | Filter by rollup |
| `api/governance/sequencer-attestations/route.ts` | Raw SQL | Filter by rollup |
| `api/governance/provider-sequencers/route.ts` | Raw SQL | Filter by rollup |
| `api/governance/payloads/[payloadAddress]/signals/route.ts` | Raw SQL | Filter by rollup |
| `api/slashing-history/route.ts` | Raw SQL | Filter `SlashFactoryPayload` by rollup |
| `api/slashing-history/[roundNumber]/route.ts` | Raw SQL | Filter by rollup |
| `api/slashing-history/stats/route.ts` | Raw SQL | Filter by rollup |
| `api/validators/[validatorHexIndex]/route.ts` | Prisma + Raw SQL | Filter performance by rollup |
| `api/validators/[validatorHexIndex]/slashing-details/route.ts` | Raw SQL | Filter by rollup |
| `api/validators/queue/route.ts` | Prisma | Filter `ValidatorQueue` by rollup |
| `api/validators/queue/stats/route.ts` | Prisma + Raw SQL | Filter by rollup |
| `api/validators/watchlist/route.ts` | Prisma | Filter by rollup |
| `api/providers/route.ts` | Prisma | Filter `StakedWithProvider` join by rollup |
| `api/providers/[identifier]/route.ts` | Prisma | Filter attester join by rollup |
| `api/prover/network/health/route.ts` | Raw SQL | Filter by rollup |
| `api/prover/network/leaderboard/route.ts` | Raw SQL | Filter by rollup |
| `api/prover/network/market-share/route.ts` | Raw SQL | Filter by rollup |
| `api/prover/network/activity-timeline/route.ts` | Raw SQL | Filter by rollup |
| `api/prover/[address]/route.ts` | Raw SQL | Filter by rollup |
| `api/prover/[address]/epochs/route.ts` | Raw SQL | Filter by rollup |
| `api/prover/[address]/projections/route.ts` | Raw SQL | Filter by rollup |
| `api/prover/[address]/timeline/route.ts` | Raw SQL | Filter by rollup |
| `api/staking/overview/route.ts` | RPC + Prisma | Rollup-scoped contract calls |
| `api/stats/general/route.ts` | Prisma | Filter counts by rollup |
| `api/search/route.ts` | Prisma | Include rollup in results |

**Pattern for each route:**

```typescript
// At top of GET handler
const rollupAddresses = parseRollupParam(searchParams);

// For Prisma queries
where: { rollup_address: { in: rollupAddresses } }

// For raw SQL
WHERE ${rollupWhereClauseFor('table_alias', rollupAddresses)}
```

**Commit after each batch of ~5 related routes:**

```bash
git commit -m "feat: add rollup filter to dashboard API routes"
git commit -m "feat: add rollup filter to epoch API routes"
git commit -m "feat: add rollup filter to governance API routes"
git commit -m "feat: add rollup filter to slashing API routes"
git commit -m "feat: add rollup filter to validator detail API routes"
git commit -m "feat: add rollup filter to provider API routes"
git commit -m "feat: add rollup filter to prover API routes"
```

---

## Task 6: Create RollupContext Provider

**Files:**
- Create: `apps/web/src/context/RollupContext.tsx`
- Create: `apps/web/src/hooks/queries/useRollupVersions.ts`
- Modify: `apps/web/src/app/layout.tsx:80` — Add `RollupProvider` inside `AppProvider`

**Step 1: Create the query hook**

```typescript
// apps/web/src/hooks/queries/useRollupVersions.ts
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import type { RollupVersion } from '@/types/rollup';

interface RollupVersionsResponse {
  versions: (RollupVersion & { validatorCount: number; epochCount: number })[];
  active: string;
  benchmark: string;
  status: string;
}

/** Fetch rollup versions from /api/rollups */
export function useRollupVersions(): UseQueryResult<RollupVersionsResponse, Error> {
  return useQuery<RollupVersionsResponse, Error>({
    queryKey: ['rollup-versions'],
    queryFn: async () => {
      const res = await fetch('/api/rollups');
      if (!res.ok) throw new Error('Failed to fetch rollup versions');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes — versions rarely change
  });
}
```

**Step 2: Create the context**

```typescript
// apps/web/src/context/RollupContext.tsx
'use client';

import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useRollupVersions } from '@/hooks/queries/useRollupVersions';
import type { RollupVersion } from '@/types/rollup';

interface RollupContextValue {
  versions: (RollupVersion & { validatorCount: number; epochCount: number })[];
  globalRollup: string; // address or 'all'
  setGlobalRollup: (address: string) => void;
  activeRollup: string;
  isAggregate: boolean;
  isLoading: boolean;
}

const RollupContext = createContext<RollupContextValue | undefined>(undefined);

export const RollupProvider = ({ children }: { children: ReactNode }) => {
  const { data, isLoading } = useRollupVersions();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeRollup = data?.active ?? '';
  const versions = data?.versions ?? [];

  // Read initial value from URL param, default to active
  const rollupFromUrl = searchParams.get('rollup');
  const [globalRollup, setGlobalRollupState] = useState<string>(
    rollupFromUrl ?? 'active'
  );

  const setGlobalRollup = useCallback((address: string) => {
    setGlobalRollupState(address);
    const params = new URLSearchParams(searchParams.toString());
    if (address === 'active' || address === activeRollup) {
      params.delete('rollup');
    } else {
      params.set('rollup', address);
    }
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ''}`, { scroll: false });
  }, [searchParams, router, pathname, activeRollup]);

  const effectiveRollup = globalRollup === 'active' ? activeRollup : globalRollup;
  const isAggregate = effectiveRollup === 'all';

  const value = useMemo(() => ({
    versions,
    globalRollup: effectiveRollup,
    setGlobalRollup,
    activeRollup,
    isAggregate,
    isLoading,
  }), [versions, effectiveRollup, setGlobalRollup, activeRollup, isAggregate, isLoading]);

  return <RollupContext.Provider value={value}>{children}</RollupContext.Provider>;
};

export const useRollup = (): RollupContextValue => {
  const context = useContext(RollupContext);
  if (!context) throw new Error('useRollup must be used within RollupProvider');
  return context;
};
```

**Step 3: Add to layout.tsx**

In `apps/web/src/app/layout.tsx`, add import and wrap inside `AppProvider`:

```typescript
import { RollupProvider } from "@/context/RollupContext";

// In the JSX, wrap children inside AppProvider:
<AppProvider>
  <RollupProvider>
    <ClientLayout>
      {children}
    </ClientLayout>
  </RollupProvider>
</AppProvider>
```

**Note:** `RollupProvider` uses `useSearchParams()` which requires Suspense boundary. The `ClientLayout` component already wraps content in `QueryProvider`, so this should work. If not, wrap `RollupProvider` in a Suspense.

**Step 4: Commit**

```bash
git add apps/web/src/context/RollupContext.tsx apps/web/src/hooks/queries/useRollupVersions.ts apps/web/src/app/layout.tsx
git commit -m "feat: add RollupContext provider with URL state sync"
```

---

## Task 7: Add Rollup Selector to Header

**Files:**
- Modify: `apps/web/src/components/layout/Header.tsx`

**Step 1: Create RollupSelector component**

Add a new component inside `Header.tsx` (same pattern as `NetworkSelector`):

```typescript
import { useRollup } from '@/context/RollupContext';

/** RollupSelector — Badge-style dropdown for rollup version selection */
const RollupSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { versions, globalRollup, setGlobalRollup, activeRollup, isLoading } = useRollup();

  // Don't render if only 1 version
  if (versions.length <= 1) return null;

  const currentLabel = globalRollup === 'all'
    ? 'All'
    : versions.find(v => v.address === globalRollup)?.label ?? 'Active';

  const isActive = (address: string) => address === activeRollup;

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
          <span className="text-[10px]">{currentLabel.toUpperCase()}</span>
          <ChevronDownIcon className={`h-2.5 w-2.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-1.5 w-36 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden z-50"
            >
              {versions.map((version) => (
                <button
                  key={version.address}
                  onClick={() => { setGlobalRollup(version.address); setIsOpen(false); }}
                  className={`w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs transition-colors ${
                    globalRollup === version.address
                      ? 'bg-accent-cyan/10 text-accent-cyan font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${isActive(version.address) ? 'bg-green-500' : 'bg-slate-400'}`} />
                  {version.label}
                  {version.deprecated && <span className="text-[9px] text-slate-400 ml-auto">deprecated</span>}
                </button>
              ))}
              <div className="border-t border-slate-200 dark:border-slate-700" />
              <button
                onClick={() => { setGlobalRollup('all'); setIsOpen(false); }}
                className={`w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs transition-colors ${
                  globalRollup === 'all'
                    ? 'bg-accent-cyan/10 text-accent-cyan font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                All Versions
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
```

**Step 2: Add to HeaderContent**

In `HeaderContent`, after the `NetworkSelector` div (line 299), add:

```tsx
<div className="ml-1 self-center">
  <RollupSelector />
</div>
```

**Step 3: Commit**

```bash
git add apps/web/src/components/layout/Header.tsx
git commit -m "feat: add rollup version selector to header"
```

---

## Task 8: Create RollupVersionFilter Chip Component

**Files:**
- Create: `apps/web/src/components/ui/RollupVersionFilter.tsx`
- Create: `apps/web/src/hooks/useRollupFilter.ts`

**Step 1: Create per-page rollup filter hook**

```typescript
// apps/web/src/hooks/useRollupFilter.ts
import { useState, useMemo, useCallback } from 'react';
import { useRollup } from '@/context/RollupContext';

/** Per-page rollup filter that can override the global selection */
export function useRollupFilter() {
  const { globalRollup, versions, activeRollup, isAggregate } = useRollup();
  const [pageOverride, setPageOverride] = useState<string[] | null>(null);

  const effectiveRollups = useMemo(() => {
    if (pageOverride) return pageOverride;
    if (globalRollup === 'all') return versions.map(v => v.address);
    return [globalRollup];
  }, [pageOverride, globalRollup, versions]);

  /** URL param value for API calls */
  const rollupParam = useMemo(() => {
    if (pageOverride) return pageOverride.join(',');
    if (globalRollup === 'all') return 'all';
    return globalRollup;
  }, [pageOverride, globalRollup]);

  /** Toggle a version in the page override */
  const toggleVersion = useCallback((address: string) => {
    setPageOverride(prev => {
      if (!prev) {
        // First override: start with just this version
        return [address];
      }
      if (prev.includes(address)) {
        const next = prev.filter(a => a !== address);
        return next.length === 0 ? null : next; // Reset to global if empty
      }
      return [...prev, address];
    });
  }, []);

  /** Select all versions */
  const selectAll = useCallback(() => {
    setPageOverride(null); // Reset to global (which may be 'all' or specific)
  }, []);

  /** Reset page override to follow global */
  const resetOverride = useCallback(() => {
    setPageOverride(null);
  }, []);

  const hasOverride = pageOverride !== null;

  return {
    effectiveRollups,
    rollupParam,
    toggleVersion,
    selectAll,
    resetOverride,
    hasOverride,
    versions,
    activeRollup,
  };
}
```

**Step 2: Create the chip filter component**

```typescript
// apps/web/src/components/ui/RollupVersionFilter.tsx
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

/** Color palette for rollup versions (cycles if > 8 versions) */
const VERSION_COLORS = [
  'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
  'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30',
  'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
  'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
  'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30',
];

/** Get chart-legend color for a version index */
export const VERSION_CHART_COLORS = [
  '#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b',
  '#10b981', '#f43f5e', '#f97316', '#14b8a6',
];

export function getVersionColor(index: number): string {
  return VERSION_COLORS[index % VERSION_COLORS.length];
}

export function getVersionChartColor(index: number): string {
  return VERSION_CHART_COLORS[index % VERSION_CHART_COLORS.length];
}

interface RollupVersionFilterProps {
  versions: { address: string; label: string; deprecated: boolean }[];
  effectiveRollups: string[];
  activeRollup: string;
  onToggle: (address: string) => void;
  onSelectAll: () => void;
  hasOverride: boolean;
  maxVisible?: number;
}

/** Chip-based rollup version filter for per-page override */
export const RollupVersionFilter: React.FC<RollupVersionFilterProps> = ({
  versions,
  effectiveRollups,
  activeRollup,
  onToggle,
  onSelectAll,
  hasOverride,
  maxVisible = 5,
}) => {
  const [showOverflow, setShowOverflow] = useState(false);

  if (versions.length <= 1) return null;

  // Sort: active first, then by label descending (newest first)
  const sorted = [...versions].sort((a, b) => {
    if (a.address === activeRollup) return -1;
    if (b.address === activeRollup) return 1;
    return b.label.localeCompare(a.label);
  });

  const visible = sorted.slice(0, maxVisible);
  const overflow = sorted.slice(maxVisible);
  const allSelected = !hasOverride || effectiveRollups.length === versions.length;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs text-slate-500 dark:text-slate-400 mr-0.5">Version:</span>

      {/* All chip */}
      <button
        onClick={onSelectAll}
        className={`px-2 py-0.5 rounded-md text-xs font-medium border transition-colors ${
          allSelected
            ? 'bg-slate-700 text-white border-slate-600 dark:bg-slate-200 dark:text-slate-800 dark:border-slate-300'
            : 'bg-transparent text-slate-500 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
        }`}
      >
        All
      </button>

      {/* Version chips */}
      {visible.map((version, idx) => {
        const isSelected = effectiveRollups.includes(version.address);
        const colorClass = getVersionColor(versions.indexOf(version));
        const isActive = version.address === activeRollup;

        return (
          <button
            key={version.address}
            onClick={() => onToggle(version.address)}
            className={`px-2 py-0.5 rounded-md text-xs font-medium border transition-all ${
              isSelected && hasOverride
                ? colorClass
                : 'bg-transparent text-slate-400 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <span className="flex items-center gap-1">
              {isActive && <span className="h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />}
              {version.label}
            </span>
          </button>
        );
      })}

      {/* Overflow dropdown */}
      {overflow.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setShowOverflow(!showOverflow)}
            className="px-2 py-0.5 rounded-md text-xs font-medium border border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-0.5"
          >
            +{overflow.length} more
            <ChevronDownIcon className={`h-3 w-3 transition-transform ${showOverflow ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showOverflow && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowOverflow(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full left-0 mt-1 w-32 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg z-50"
                >
                  {overflow.map((version) => {
                    const isSelected = effectiveRollups.includes(version.address);
                    return (
                      <button
                        key={version.address}
                        onClick={() => onToggle(version.address)}
                        className={`w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs transition-colors ${
                          isSelected
                            ? 'bg-accent-cyan/10 text-accent-cyan font-semibold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${isSelected ? 'bg-accent-cyan' : 'bg-slate-400'}`} />
                        {version.label}
                        {version.deprecated && <span className="text-[9px] text-slate-400 ml-auto">old</span>}
                      </button>
                    );
                  })}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
```

**Step 3: Commit**

```bash
git add apps/web/src/components/ui/RollupVersionFilter.tsx apps/web/src/hooks/useRollupFilter.ts
git commit -m "feat: add RollupVersionFilter chip component and useRollupFilter hook"
```

---

## Task 9: Wire Rollup Param Through Query Hooks

Update every query hook to accept and pass `rollupParam`. This is mechanical but touches 30+ files.

**Pattern for each hook:**

```typescript
// Before
export function useValidators(): UseQueryResult<PaginatedValidatorsResponse, Error> {
  return useQuery({
    queryKey: ['validators'],
    queryFn: () => fetchValidators(),
  });
}

// After
export function useValidators(rollupParam?: string): UseQueryResult<PaginatedValidatorsResponse, Error> {
  return useQuery({
    queryKey: ['validators', rollupParam],
    queryFn: () => fetchValidators(undefined, rollupParam),
  });
}
```

And update the fetch function:

```typescript
// Before
async function fetchValidators(params?: ValidatorsQueryParams): Promise<...> {
  const searchParams = new URLSearchParams();
  // ...
  const url = `/api/validators?${searchParams.toString()}`;

// After
async function fetchValidators(params?: ValidatorsQueryParams, rollupParam?: string): Promise<...> {
  const searchParams = new URLSearchParams();
  if (rollupParam) searchParams.set('rollup', rollupParam);
  // ...
  const url = `/api/validators?${searchParams.toString()}`;
```

**Files to update (all in `apps/web/src/hooks/queries/`):**

1. `useValidators.ts` — add rollupParam to both `useValidators` and `usePaginatedValidators`
2. `useCurrentEpochStats.ts`
3. `useTopValidators.ts`
4. `useVotingOverview.ts`
5. `useEpochsIntegrity.ts`
6. `useEpochHistoricalSlotActivity.ts`
7. `useEpochLiveSlotActivity.ts`
8. `useGovernanceRounds.ts`
9. `useRoundPayloads.ts`
10. `useSignalingMatrix.ts`
11. `useSequencerSignals.ts`
12. `useSequencerAttestations.ts`
13. `usePayloadSignals.ts`
14. `useProviderSequencers.ts`
15. `useSlashingHistory.ts`
16. `useSlashingRoundDetail.ts`
17. `useProviders.ts`
18. `useProviderDetail.ts`
19. `useValidatorQueue.ts`
20. `useStakingData.ts`
21. `useSearch.ts`
22. `prover/useProverData.ts`
23. `prover/useProverLeaderboard.ts`
24. `prover/useProverMarketShare.ts`
25. `prover/useProverActivityTimeline.ts`
26. `prover/useProverEpochs.ts`
27. `prover/useProverProjections.ts`
28. `prover/useProverTimeline.ts`
29. `prover/useNetworkProvingHealth.ts`
30. `prover/useProverGapDetection.ts`
31. `useWatchlistValidators.ts` (if exists in queries/)

Also update the `ValidatorsQueryParams` type in `apps/web/src/types/api.ts` to include `rollup?`:

```typescript
export interface ValidatorsQueryParams {
  rollup?: string; // Add this
  page?: number;
  // ... rest unchanged
}
```

**Commit after each batch:**

```bash
git commit -m "feat: wire rollup param through validator query hooks"
git commit -m "feat: wire rollup param through dashboard query hooks"
git commit -m "feat: wire rollup param through epoch query hooks"
git commit -m "feat: wire rollup param through governance query hooks"
git commit -m "feat: wire rollup param through slashing query hooks"
git commit -m "feat: wire rollup param through provider query hooks"
git commit -m "feat: wire rollup param through prover query hooks"
```

---

## Task 10: Update Tier 1 Page Components

Each page needs to:
1. Import `useRollupFilter` hook
2. Add `<RollupVersionFilter>` to filter bar
3. Pass `rollupParam` to all query hooks
4. Add version column to tables in aggregate mode

**Pages to update:**

### 10a: Dashboard (`apps/web/src/app/page.tsx` + `src/components/features/dashboard/*`)

- Import `useRollup` in dashboard components
- Pass `rollupParam` to `useCurrentEpochStats`, `useTopValidators`, `useVotingOverview`
- No chip filter needed on dashboard (uses global selector only)

### 10b: Validators (`apps/web/src/app/validators/page.tsx` + `src/components/features/validators/*`)

- Add `<RollupVersionFilter>` to `AllValidatorsPageContent.tsx` filter bar
- Pass `rollupParam` to `usePaginatedValidators`
- In aggregate mode, add "Version" column to `ValidatorTableRow.tsx`
- Show "Orphaned" amber badge for validators on deprecated rollups

### 10c: Epochs (`apps/web/src/app/epochs/page.tsx` + `src/components/features/epochs/*`)

- Add `<RollupVersionFilter>` to epoch pages
- Pass `rollupParam` to `useEpochsIntegrity`, `useEpochHistoricalSlotActivity`, `useEpochLiveSlotActivity`
- In aggregate mode, add version boundary markers between different rollup data

### 10d: Slashing (`apps/web/src/app/slashing-history/page.tsx` + `src/components/features/slashing-history/*`)

- Add `<RollupVersionFilter>` to `SlashingHistoryPageContent.tsx`
- Pass `rollupParam` to `useSlashingHistory`, `useSlashingRoundDetail`
- Add "Version" column in aggregate mode

### 10e: Governance (`apps/web/src/app/governance/page.tsx` + `src/components/features/governance/*`)

- Add `<RollupVersionFilter>` to `GovernancePageContentEnhanced.tsx`
- Pass `rollupParam` to `useSignalingMatrix`, `useGovernanceRounds`, `useSequencerSignals`, etc.
- Governance is 1:1 per version, so in single-version mode it's straightforward

### 10f: Queue (`apps/web/src/app/queue/page.tsx` + `src/components/features/validator-queue/*`)

- Add `<RollupVersionFilter>` to `ValidatorQueuePageContent.tsx`
- Pass `rollupParam` to `useValidatorQueue`

**Commit after each page:**

```bash
git commit -m "feat: add rollup filter to dashboard page"
git commit -m "feat: add rollup filter to validators page with orphaned badge"
git commit -m "feat: add rollup filter to epochs page with version boundaries"
git commit -m "feat: add rollup filter to slashing history page"
git commit -m "feat: add rollup filter to governance page"
git commit -m "feat: add rollup filter to validator queue page"
```

---

## Task 11: Update Tier 2 Pages

Same pattern as Task 10 but for lower-priority pages.

### 11a: Providers

- Pass `rollupParam` to `useProviders`, `useProviderDetail`
- Show attester count scoped to selected rollup
- Provider detail `AttesterTable` shows which rollup each attester belongs to

### 11b: Watchlist

- Show rollup version badge next to each watched validator
- Show "Orphaned" badge for validators on deprecated rollups

### 11c: Search + Prover

- Search results include rollup version indicator
- Prover pages pass `rollupParam` to all prover hooks

**Commit after each:**

```bash
git commit -m "feat: add rollup filter to provider pages"
git commit -m "feat: add rollup version display to watchlist"
git commit -m "feat: add rollup filter to search and prover pages"
```

---

## Task 12: Build Tier 3 — Migration Tracker

**Files:**
- Create: `apps/web/src/app/api/validators/[validatorHexIndex]/migration-history/route.ts`
- Create: `apps/web/src/hooks/queries/useValidatorMigrationHistory.ts`
- Create: `apps/web/src/components/features/validator-detail/MigrationTimeline.tsx`
- Modify: `apps/web/src/components/features/validator-detail/ValidatorDetailPageContent.tsx`

**Step 1: Create API endpoint**

Query `ValidatorEpochPerformance` grouped by `rollup_address` to get which versions a validator participated in:

```sql
SELECT
  rollup_address,
  MIN(epoch_number) as first_epoch,
  MAX(epoch_number) as last_epoch,
  COUNT(*) as epoch_count
FROM "ValidatorEpochPerformance"
WHERE validator_address = $1
GROUP BY rollup_address
ORDER BY MIN(epoch_number) ASC
```

Cross-reference with rollup registry for labels and timestamps.

**Step 2: Create query hook**

Standard pattern: `useValidatorMigrationHistory(validatorAddress)`.

**Step 3: Create MigrationTimeline component**

Visual timeline showing version transitions with dates, epoch ranges, and migration/orphaned status.

**Step 4: Add to validator detail page**

Add `<MigrationTimeline>` section to `ValidatorDetailPageContent.tsx`.

**Step 5: Commit**

```bash
git commit -m "feat: add validator migration timeline to detail page"
```

---

## Task 13: Build Tier 3 — Rollups Overview Page

**Files:**
- Create: `apps/web/src/app/rollups/page.tsx`
- Create: `apps/web/src/components/features/rollups/RollupsPageContent.tsx`

Simple page consuming `useRollupVersions` hook, displaying all versions in a table/card layout with metadata.

**Step 1: Create page and component**

**Step 2: Add to navigation**

Add "Rollups" link to `desktopNavItems` in `Header.tsx` and `RightSidebar.tsx`.

**Step 3: Commit**

```bash
git commit -m "feat: add rollups overview page"
```

---

## Task 14: Build Tier 3 — Cross-Version Comparison

**Files:**
- Create: `apps/web/src/components/features/dashboard/VersionComparisonCard.tsx`
- Modify: `apps/web/src/app/page.tsx`

When aggregate mode is active on dashboard, render a comparison card with per-version metrics (attestation rate, validator count, epoch count).

Uses existing data from `useRollupVersions` + per-version stats queries.

**Commit:**

```bash
git commit -m "feat: add cross-version comparison card to dashboard"
```

---

## Task 15: Typecheck and Final Verification

**Step 1: Run typecheck**

```bash
cd apps/web && pnpm typecheck
```

Fix any type errors.

**Step 2: Verify backward compatibility**

- Without `?rollup` param, all APIs default to active rollup
- With single version in registry, header selector is hidden
- All existing URLs continue to work

**Step 3: Final commit**

```bash
git commit -m "chore: fix type errors from multi-rollup integration"
```

---

## Summary

| Task | Description | Est. Files | Dependencies |
|------|-------------|-----------|--------------|
| 1 | Rollup registry config | 4 | None |
| 2 | Rollup param parser | 1 | Task 1 |
| 3 | GET /api/rollups endpoint | 1 | Task 1 |
| 4 | Validators API rollup filter (pattern) | 3 | Task 2 |
| 5 | Remaining API routes | 31 | Task 2 |
| 6 | RollupContext provider | 3 | Task 3 |
| 7 | Header rollup selector | 1 | Task 6 |
| 8 | RollupVersionFilter chips | 2 | Task 6 |
| 9 | Wire query hooks | 31 | Task 6 |
| 10 | Tier 1 page components | ~25 | Tasks 7-9 |
| 11 | Tier 2 page components | ~10 | Tasks 7-9 |
| 12 | Migration tracker (Tier 3) | 4 | Task 10 |
| 13 | Rollups overview page (Tier 3) | 2 | Task 3 |
| 14 | Cross-version comparison (Tier 3) | 2 | Task 10 |
| 15 | Typecheck + verification | 0 | All |
