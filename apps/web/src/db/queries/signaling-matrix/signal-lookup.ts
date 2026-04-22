export function buildSignalLookup(
  signals: Array<{ signaler_address: string; payload_address: string }>
): Map<string, Map<string, number>> {
  const signalLookup = new Map<string, Map<string, number>>();

  signals.forEach(signal => {
    if (!signalLookup.has(signal.signaler_address)) {
      signalLookup.set(signal.signaler_address, new Map());
    }
    const payloadMap = signalLookup.get(signal.signaler_address)!;
    payloadMap.set(signal.payload_address, (payloadMap.get(signal.payload_address) || 0) + 1);
  });

  return signalLookup;
}
