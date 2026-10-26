/**
 * How a rollup version is shown next to its label. Being replaced does not stop
 * a rollup: testnet's V5 kept producing blocks for weeks after V6, so a
 * replaced version is "live" while it still does and "stopped" once it doesn't.
 */
export type RollupVersionState = 'current' | 'live' | 'stopped';

export function rollupVersionState(
  version: { address: string; deprecated: boolean; isLive?: boolean },
  activeRollup: string,
): RollupVersionState {
  if (version.address === activeRollup || !version.deprecated) return 'current';
  return version.isLive ? 'live' : 'stopped';
}

export const ROLLUP_VERSION_STATE_TEXT: Record<RollupVersionState, string> = {
  current: 'current',
  live: 'live',
  stopped: 'stopped',
};

export const ROLLUP_VERSION_STATE_TITLE: Record<RollupVersionState, string> = {
  current: 'The rollup the registry currently points to',
  live: 'Replaced, but still producing blocks',
  stopped: 'Replaced and no longer producing blocks; history only',
};

/** Dot colour: green for the current version, amber for a replaced one still producing, grey once stopped. */
export const ROLLUP_VERSION_STATE_DOT: Record<RollupVersionState, string> = {
  current: 'bg-emerald-500',
  live: 'bg-amber-500',
  stopped: 'bg-slate-400',
};
