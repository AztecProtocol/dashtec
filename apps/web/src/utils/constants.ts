// Centralized validator status and offense definitions
export {
  VALIDATOR_STATUS,
  VALIDATOR_STATUS_DESCRIPTIONS,
  getValidatorStatusDescription,
  Offense,
  bigIntToOffense,
  getOffenseDescription,
} from '@dashtec/shared-types';

// Z-Index hierarchy constants
export const Z_INDEX = {
  WALLET_MODAL: 99,
  TOOLTIP: 90,
  RIGHT_SIDEBAR: 60,

  SEARCH_MODAL: 50,

  PERFORMANCE_FILTER_MODAL: 40,
  GRAPH_MODAL: 40,

  TOP_NAVBAR: 30,

  DROPDOWN: 15,
  OVERLAY: 10,

  DEFAULT: 1,
  BASE: 0,
}

export const INDEPENDENT_PROVIDER_IDENTIFIER = 'independent';
