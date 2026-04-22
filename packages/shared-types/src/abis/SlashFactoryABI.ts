export const SlashFactoryABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "payloadAddress",
        "type": "address"
      },
      {
        "indexed": false,
        "name": "validators",
        "type": "address[]"
      },
      {
        "indexed": false,
        "name": "amounts",
        "type": "uint96[]"
      },
      {
        "indexed": false,
        "name": "salt",
        "type": "bytes32"
      }
    ],
    "name": "PayloadCreated",
    "type": "event"
  }
] as const;
