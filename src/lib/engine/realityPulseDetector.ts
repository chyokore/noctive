import { EventItem, MarketContext, RealityMarketSnapshot, RealityMarketPulse } from '@/types/domain';
import { MarketContextWithRwaProvenance } from '@/lib/adapters/bitgetWalletRwaMarketProvider';

export type { RealityMarketPulse };

export function evaluateRealityPulse(
  prevSnapshot: RealityMarketSnapshot | null,
  currentQuote: MarketContextWithRwaProvenance
): RealityMarketPulse | null {
  if (!prevSnapshot || !currentQuote) {
    return null;
  }

  // Requirement: Both quotes must be verified Reality data
  const prevIsReality = (prevSnapshot.dataSource || '').toLowerCase() === 'reality';
  const currentIsReality = (currentQuote.externalProvenance?.dataSource || '').toLowerCase() === 'reality';
  if (!prevIsReality || !currentIsReality) {
    return null;
  }

  // Requirement: Market status must be OPEN (or OVERNIGHT_ACTIVE)
  const isMarketOpen =
    currentQuote.sessionStatus === 'OVERNIGHT_ACTIVE' ||
    (prevSnapshot.marketStatus || '').toUpperCase() === 'OPEN';
  if (!isMarketOpen) {
    return null;
  }

  const prevTimeMs = new Date(prevSnapshot.timestamp).getTime();
  const currentTimeMs = new Date(currentQuote.externalProvenance.retrievedAtTimestamp || new Date()).getTime();

  if (isNaN(prevTimeMs) || isNaN(currentTimeMs) || currentTimeMs <= prevTimeMs) {
    return null;
  }

  // Requirement: Observation interval must be at least 30 minutes (1,800,000 ms)
  const intervalMs = currentTimeMs - prevTimeMs;
  const intervalMinutes = intervalMs / 60000;
  if (intervalMinutes < 30.0) {
    return null;
  }

  const prevPrice = prevSnapshot.price;
  const currentPrice = currentQuote.currentPrice;

  if (prevPrice <= 0 || currentPrice <= 0) {
    return null;
  }

  // Requirement: Absolute price movement must be at least 1.5% (0.015)
  const rawRatio = (currentPrice - prevPrice) / prevPrice;
  const absRatio = Math.abs(rawRatio);
  if (absRatio < 0.015) {
    return null;
  }

  const percentageMovePct = rawRatio * 100;
  const direction: 'UP' | 'DOWN' = currentPrice >= prevPrice ? 'UP' : 'DOWN';
  const ticker = (currentQuote.externalProvenance?.underlyingStockSymbol || prevSnapshot.ticker).toUpperCase();
  const rTokenSymbol = currentQuote.symbol;
  const chain = currentQuote.chain || prevSnapshot.chain;
  const contract = currentQuote.contractAddress || prevSnapshot.contract;
  const traceId = currentQuote.externalProvenance?.traceId || prevSnapshot.traceId;

  const pulseId = `pulse-${ticker}-${Date.now()}`;

  return {
    id: pulseId,
    ticker,
    rTokenSymbol,
    chain,
    contract,
    direction,
    percentageMovePct: parseFloat(percentageMovePct.toFixed(2)),
    prevPrice,
    currentPrice,
    prevTimestamp: prevSnapshot.timestamp,
    currentTimestamp: currentQuote.externalProvenance.retrievedAtTimestamp,
    intervalMinutes: parseFloat(intervalMinutes.toFixed(1)),
    traceId,
  };
}

export function createPulseEventItem(pulse: RealityMarketPulse): EventItem {
  const absPct = Math.abs(pulse.percentageMovePct).toFixed(2);
  const title = `Reality Market Pulse: ${pulse.ticker} ${pulse.direction} ${absPct}%`;

  return {
    id: pulse.id,
    title,
    source: 'BITGET_REALITY_PULSE',
    timestamp: pulse.currentTimestamp,
    category: 'MACRO',
    affectedSymbol: pulse.ticker,
    impactScore: pulse.direction === 'UP' ? 7.5 : -7.5,
    rawSnippet: `[Reality Market Pulse] ${pulse.ticker} (${pulse.rTokenSymbol} on ${pulse.chain}) observed price move ${pulse.direction} by ${absPct}% (from $${pulse.prevPrice.toFixed(2)} to $${pulse.currentPrice.toFixed(2)}) over ${pulse.intervalMinutes} minutes window (${pulse.prevTimestamp} to ${pulse.currentTimestamp}). Verified data source: Bitget Wallet Reality Protocol. Contract: ${pulse.contract}. Trace ID: ${pulse.traceId || 'N/A'}.`,
    isDemoData: false,
  };
}
