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
        "indexed": true
      },
      {
        "name": "publicKeyInG1",
        "type": "tuple",
        "indexed": false,
        "components": [
          { "name": "x", "type": "uint256" },
          { "name": "y", "type": "uint256" }
        ]
      },
      {
        "name": "publicKeyInG2",
        "type": "tuple",
        "indexed": false,
        "components": [
          { "name": "x0", "type": "uint256" },
          { "name": "x1", "type": "uint256" },
          { "name": "y0", "type": "uint256" },
          { "name": "y1", "type": "uint256" }
        ]
      },
      {
        "name": "proofOfPossession",
        "type": "tuple",
        "indexed": false,
        "components": [
          { "name": "x", "type": "uint256" },
          { "name": "y", "type": "uint256" }
        ]
      },
      {
        "name": "moveWithLatestRollup",
        "type": "bool",
        "indexed": false
      }
    ],
    "anonymous": false
  }
] as const;
