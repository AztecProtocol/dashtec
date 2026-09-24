// Matches GSE.sol as deployed for Aztec V5 (and unchanged since v4.0.3):
//
//   event Deposit(address indexed instance, address indexed attester, address withdrawer);
//
// An earlier version of this file declared a seven-parameter Deposit carrying the
// BLS public keys, proof of possession and a moveWithLatestRollup flag. That is a
// different topic0, so Ponder matched no logs at all and gse_deposit stayed empty —
// which starved ValidatorRollup and hid every GSE-staked validator from the
// registry. The BLS material is only ever emitted by the Rollup's own Deposit
// event; moveWithLatestRollup is recoverable because the GSE records such
// attesters against BONUS_INSTANCE_ADDRESS (see ../gse.ts).
export const GseABI = [
  {
    "type": "event",
    "name": "Deposit",
    "inputs": [
      {
        "name": "instance",
        "type": "address",
        "indexed": true
      },
      {
        "name": "attester",
        "type": "address",
        "indexed": true
      },
      {
        "name": "withdrawer",
        "type": "address",
        "indexed": false
      }
    ],
    "anonymous": false
  }
] as const;
