export const RegistryABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "instance",
        "type": "address"
      },
      {
        "indexed": true,
        "name": "version",
        "type": "uint256"
      }
    ],
    "name": "CanonicalRollupUpdated",
    "type": "event"
  }
] as const;
