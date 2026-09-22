import { EventItem, MarketContext, RealityMarketSnapshot, RealityMarketPulse, RealityDiagnosticsSummary } from '@/types/domain';
import { MarketContextWithRwaProvenance } from '@/lib/adapters/bitgetWalletRwaMarketProvider';

export type { RealityMarketPulse, RealityDiagnosticsSummary };

/**
 * Trigger 1: 30-Minute Snapshot Interval Pulse (SNAPSHOT_30M)
 * Compares current quote with snapshot at least 30 minutes prior. Requires >= 1.5% move.
 */
export function evaluateRealityPulse(
  prevSnapshot: RealityMarketSnapshot | null,
  currentQuote: MarketContextWithRwaProvenance
): RealityMarketPulse | null {
  if (!prevSnapshot || !currentQuote) {
    return null;
  }

  const prevIsReality = (prevSnapshot.dataSource || '').toLowerCase() === 'reality';
  const currentIsReality = (currentQuote.externalProvenance?.dataSource || '').toLowerCase() === 'reality';
  if (!prevIsReality || !currentIsReality) {
    return null;
  }

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

  const pulseId = `pulse-snap-${ticker}-${Date.now()}`;

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
    triggerType: 'SNAPSHOT_30M',
    traceId,
  };
}

/**
 * Trigger 2: Native 24-Hour Change Ratio Pulse (API_24H_CHANGE)
 * Uses Bitget Wallet stockInfo's native price_24h_change_ratio / change24hPct. Requires >= 1.5% move.
 */
export function evaluate24hRealityPulse(
  currentQuote: MarketContextWithRwaProvenance
): RealityMarketPulse | null {
  if (!currentQuote || !currentQuote.externalProvenance) {
    return null;
  }

  const currentIsReality = (currentQuote.externalProvenance.dataSource || '').toLowerCase() === 'reality';
  if (!currentIsReality) {
    return null;
  }

  const isMarketOpen = currentQuote.sessionStatus === 'OVERNIGHT_ACTIVE';
  if (!isMarketOpen) {
    return null;
  }

  const change24hPct =
    currentQuote.externalProvenance.raw24hChangePct ??
    currentQuote.change24hPct;

  if (change24hPct === undefined || change24hPct === null || isNaN(change24hPct)) {
    return null;
  }

  const absPct = Math.abs(change24hPct);
  // Requirement: Preserve 1.5% threshold
  if (absPct < 1.5) {
    return null;
  }

  const direction: 'UP' | 'DOWN' = change24hPct >= 0 ? 'UP' : 'DOWN';
  const ticker = (currentQuote.externalProvenance.underlyingStockSymbol || currentQuote.symbol).toUpperCase().replace(/^R/, '');
  const rTokenSymbol = currentQuote.symbol;
  const chain = currentQuote.chain;
  const contract = currentQuote.contractAddress;
  const traceId = currentQuote.externalProvenance.traceId;
  const currentTimestamp = currentQuote.externalProvenance.retrievedAtTimestamp || new Date().toISOString();

  const pulseId = `pulse-24h-${ticker}-${Date.now()}`;

  return {
    id: pulseId,
    ticker,
    rTokenSymbol,
    chain,
    contract,
    direction,
    percentageMovePct: parseFloat(change24hPct.toFixed(2)),
    prevPrice: currentQuote.prevClose || currentQuote.currentPrice,
    currentPrice: currentQuote.currentPrice,
    prevTimestamp: currentTimestamp,
    currentTimestamp,
    intervalMinutes: 1440,
    triggerType: 'API_24H_CHANGE',
    raw24hChangePct: change24hPct,
    traceId,
  };
}

export function createPulseEventItem(pulse: RealityMarketPulse): EventItem {
  const absPct = Math.abs(pulse.percentageMovePct).toFixed(2);
  const is24h = pulse.triggerType === 'API_24H_CHANGE';

  const title = is24h
    ? `Reality 24H Market Pulse: ${pulse.ticker} ${pulse.direction} ${absPct}%`
    : `Reality Market Pulse: ${pulse.ticker} ${pulse.direction} ${absPct}%`;

  const source = is24h ? 'BITGET_REALITY_24H_PULSE' : 'BITGET_REALITY_PULSE';

  const snippet = is24h
    ? `[Reality 24H Market Pulse] ${pulse.ticker} (${pulse.rTokenSymbol} on ${pulse.chain}) observed native 24-hour price change of ${pulse.direction} ${absPct}% (current price $${pulse.currentPrice.toFixed(2)}). Trigger: Bitget Wallet API 24H Change Ratio (API_24H_CHANGE). Verified data source: Bitget Wallet Reality Protocol. Contract: ${pulse.contract}. Trace ID: ${pulse.traceId || 'N/A'}.`
    : `[Reality Market Pulse] ${pulse.ticker} (${pulse.rTokenSymbol} on ${pulse.chain}) observed price move ${pulse.direction} by ${absPct}% (from $${pulse.prevPrice.toFixed(2)} to $${pulse.currentPrice.toFixed(2)}) over ${pulse.intervalMinutes} minutes window (${pulse.prevTimestamp} to ${pulse.currentTimestamp}). Trigger: Snapshot 30-Minute Interval (SNAPSHOT_30M). Verified data source: Bitget Wallet Reality Protocol. Contract: ${pulse.contract}. Trace ID: ${pulse.traceId || 'N/A'}.`;

  return {
    id: pulse.id,
    title,
    source,
    timestamp: pulse.currentTimestamp,
    category: 'MACRO',
    affectedSymbol: pulse.ticker,
    impactScore: pulse.direction === 'UP' ? 7.5 : -7.5,
    rawSnippet: snippet,
    isDemoData: false,
  };
}

/**
 * Collects auditable Reality market diagnostics across sampled quotes & snapshot histories.
 */
export function collectRealityDiagnostics(
  quotes: MarketContextWithRwaProvenance[],
  prevSnapshotsMap: Map<string, RealityMarketSnapshot | null>,
  reasonIfNoQuotes?: string
): RealityDiagnosticsSummary {
  const sampledCount = quotes.length;
  if (sampledCount === 0) {
    return {
      sampledCount: 0,
      tickersWith24hChangeCount: 0,
      reasonIfNoQuotes: reasonIfNoQuotes || 'Bitget Wallet RWA API returned 0 quotes',
    };
  }

  let tickersWith24hChangeCount = 0;
  let max24hObj: { ticker: string; direction: 'UP' | 'DOWN'; percentageMovePct: number; thresholdMet: boolean } | undefined;
  let highestAbs24h = -1;

  let max30mObj: { ticker: string; direction: 'UP' | 'DOWN'; percentageMovePct: number; thresholdMet: boolean } | undefined;
  let highestAbs30m = -1;

  for (const quote of quotes) {
    if (!quote) continue;
    const ticker = (quote.externalProvenance?.underlyingStockSymbol || quote.symbol).toUpperCase().replace(/^R/, '');

    // 24h Native Change Check
    const change24hPct =
      quote.externalProvenance?.raw24hChangePct ?? quote.change24hPct;

    if (change24hPct !== undefined && change24hPct !== null && !isNaN(change24hPct)) {
      tickersWith24hChangeCount++;
      const abs24h = Math.abs(change24hPct);
      if (abs24h > highestAbs24h) {
        highestAbs24h = abs24h;
        max24hObj = {
          ticker,
          direction: change24hPct >= 0 ? 'UP' : 'DOWN',
          percentageMovePct: parseFloat(abs24h.toFixed(2)),
          thresholdMet: abs24h >= 1.5,
        };
      }
    }

    // 30m Snapshot Change Check
    const prevSnap = prevSnapshotsMap.get(ticker);
    if (prevSnap && prevSnap.price > 0 && quote.currentPrice > 0) {
      const prevTimeMs = new Date(prevSnap.timestamp).getTime();
      const currentTimeMs = new Date(quote.externalProvenance?.retrievedAtTimestamp || new Date()).getTime();

      if (!isNaN(prevTimeMs) && !isNaN(currentTimeMs) && currentTimeMs > prevTimeMs) {
        const intervalMinutes = (currentTimeMs - prevTimeMs) / 60000;
        if (intervalMinutes >= 30.0) {
          const rawRatio = (quote.currentPrice - prevSnap.price) / prevSnap.price;
          const abs30m = Math.abs(rawRatio * 100);
          if (abs30m > highestAbs30m) {
            highestAbs30m = abs30m;
            max30mObj = {
              ticker,
              direction: rawRatio >= 0 ? 'UP' : 'DOWN',
              percentageMovePct: parseFloat(abs30m.toFixed(2)),
              thresholdMet: abs30m >= 1.5,
            };
          }
        }
      }
    }
  }

  return {
    sampledCount,
    tickersWith24hChangeCount,
    max24hChange: max24hObj,
    max30mChange: max30mObj,
    reasonIfNoQuotes: reasonIfNoQuotes,
  };
}

/**
 * Formats RealityDiagnosticsSummary into compact judge-readable wording.
 */
export function formatRealityDiagnosticsText(summary: RealityDiagnosticsSummary): string {
  if (summary.sampledCount === 0) {
    const reason = summary.reasonIfNoQuotes || 'Bitget Wallet RWA API returned 0 quotes';
    return `Reality Diagnostics: 0 quotes sampled (${reason}).`;
  }

  const parts: string[] = [];
  parts.push(`Reality Diagnostics: ${summary.sampledCount}/6 quotes sampled (${summary.tickersWith24hChangeCount} with valid 24h change).`);

  if (summary.max24hChange) {
    const metStr = summary.max24hChange.thresholdMet ? 'THRESHOLD MET (>=1.5%)' : 'threshold >=1.5% NOT MET';
    parts.push(`Max 24h: ${summary.max24hChange.ticker} ${summary.max24hChange.direction} ${summary.max24hChange.percentageMovePct.toFixed(2)}% (${metStr}).`);
  } else {
    parts.push(`Max 24h: None (no valid 24h change field reported).`);
  }

  if (summary.max30mChange) {
    const metStr = summary.max30mChange.thresholdMet ? 'THRESHOLD MET (>=1.5%)' : 'threshold >=1.5% NOT MET';
    parts.push(`Max 30m: ${summary.max30mChange.ticker} ${summary.max30mChange.direction} ${summary.max30mChange.percentageMovePct.toFixed(2)}% (${metStr}).`);
  } else {
    parts.push(`Max 30m: None (snapshot interval <30m or initial baseline).`);
  }

  return parts.join(' ');
}

