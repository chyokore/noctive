import crypto from 'crypto';
import { MarketContext, ExternalInputProvenance } from '@/types/domain';
import { IMarketDataProvider } from './marketDataProvider';

export interface StooqConfig {
  baseUrl?: string;
  timeoutMs?: number;
}

export const STOOQ_DEFAULT_URL =
  'https://stooq.com/q/l/?s=nvda.us+aapl.us+msft.us+tsla.us+spy.us+qqq.us&f=sd2t2ohlcv&h&e=json';

export interface StockReferenceMapping {
  rToken: string;
  underlyingStockSymbol: string;
  name: string;
  issuerTicker: string;
}

export const STOCK_REFERENCE_MAPPINGS: Record<string, StockReferenceMapping> = {
  rNVDA: {
    rToken: 'rNVDA',
    underlyingStockSymbol: 'NVDA.US',
    name: 'NVIDIA Corp (Underlying Reference)',
    issuerTicker: 'NVDA',
  },
  rAAPL: {
    rToken: 'rAAPL',
    underlyingStockSymbol: 'AAPL.US',
    name: 'Apple Inc (Underlying Reference)',
    issuerTicker: 'AAPL',
  },
  rMSFT: {
    rToken: 'rMSFT',
    underlyingStockSymbol: 'MSFT.US',
    name: 'Microsoft Corp (Underlying Reference)',
    issuerTicker: 'MSFT',
  },
  rTSLA: {
    rToken: 'rTSLA',
    underlyingStockSymbol: 'TSLA.US',
    name: 'Tesla Inc (Underlying Reference)',
    issuerTicker: 'TSLA',
  },
  rSPY: {
    rToken: 'rSPY',
    underlyingStockSymbol: 'SPY.US',
    name: 'SPDR S&P 500 ETF (Underlying Reference)',
    issuerTicker: 'SPY',
  },
  rQQQ: {
    rToken: 'rQQQ',
    underlyingStockSymbol: 'QQQ.US',
    name: 'Invesco QQQ Trust (Underlying Reference)',
    issuerTicker: 'QQQ',
  },
};

export const STOCK_SYMBOL_LOOKUP: Record<string, StockReferenceMapping> = Object.values(
  STOCK_REFERENCE_MAPPINGS
).reduce((acc, mapping) => {
  acc[mapping.underlyingStockSymbol.toUpperCase()] = mapping;
  return acc;
}, {} as Record<string, StockReferenceMapping>);

export interface MarketContextWithStooqProvenance extends MarketContext {
  externalProvenance: ExternalInputProvenance;
  underlyingStockSymbol: string;
}

export class StooqMarketDataProvider implements IMarketDataProvider {
  private baseUrl: string;
  private timeoutMs: number;

  constructor(config: StooqConfig = {}) {
    this.baseUrl = config.baseUrl || STOOQ_DEFAULT_URL;
    this.timeoutMs = config.timeoutMs || 6000;
  }

  async getWatchlist(): Promise<MarketContext[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const retrievedAtTimestamp = new Date().toISOString();

    try {
      const res = await fetch(this.baseUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json, text/plain, */*',
          'User-Agent': 'NoctiveIntelligenceAgent/1.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`Stooq public stock quote API HTTP ${res.status}`);
      }

      const rawText = await res.text();
      let symbolsData: Array<{
        symbol: string;
        date?: string;
        time?: string;
        open?: number | string;
        high?: number | string;
        low?: number | string;
        close?: number | string;
        volume?: number | string;
      }> = [];

      try {
        const parsed = JSON.parse(rawText);
        if (parsed && Array.isArray(parsed.symbols)) {
          symbolsData = parsed.symbols;
        } else if (parsed && Array.isArray(parsed.matrix)) {
          symbolsData = parsed.matrix;
        }
      } catch {
        // Fallback: Parse CSV if endpoint returns CSV text
        const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length > 1) {
          const headers = lines[0].toLowerCase().split(',');
          const symbolIdx = headers.indexOf('symbol');
          const dateIdx = headers.indexOf('date');
          const timeIdx = headers.indexOf('time');
          const closeIdx = headers.indexOf('close');
          const openIdx = headers.indexOf('open');
          const volumeIdx = headers.indexOf('volume');

          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',');
            if (cols.length > Math.max(symbolIdx, closeIdx)) {
              symbolsData.push({
                symbol: cols[symbolIdx]?.trim() || '',
                date: dateIdx >= 0 ? cols[dateIdx]?.trim() : undefined,
                time: timeIdx >= 0 ? cols[timeIdx]?.trim() : undefined,
                open: openIdx >= 0 ? cols[openIdx]?.trim() : undefined,
                close: closeIdx >= 0 ? cols[closeIdx]?.trim() : undefined,
                volume: volumeIdx >= 0 ? cols[volumeIdx]?.trim() : undefined,
              });
            }
          }
        }
      }

      const items: MarketContext[] = [];

      for (const item of symbolsData) {
        const rawSymbolUpper = (item.symbol || '').toUpperCase();
        const mapping = STOCK_SYMBOL_LOOKUP[rawSymbolUpper];
        if (!mapping) continue;

        const closeVal = typeof item.close === 'number' ? item.close : parseFloat(String(item.close || '0'));
        const openVal = typeof item.open === 'number' ? item.open : parseFloat(String(item.open || '0'));
        const volumeVal = typeof item.volume === 'number' ? item.volume : parseFloat(String(item.volume || '0'));

        if (isNaN(closeVal) || closeVal <= 0) continue;

        const prevClose = openVal > 0 ? openVal : closeVal;
        const change24hPct = prevClose > 0 ? parseFloat((((closeVal - prevClose) / prevClose) * 100).toFixed(2)) : 0;
        const spreadPct = 0.05; // Standard tight spread assumption for underlying US stock
        const bidPrice = parseFloat((closeVal * 0.9998).toFixed(2));
        const askPrice = parseFloat((closeVal * 1.0002).toFixed(2));
        const liquidityDepthIndex = 90;

        const dataAsOf = item.date && item.time ? `${item.date}T${item.time}Z` : item.date || retrievedAtTimestamp;

        const contentHash = crypto
          .createHash('sha256')
          .update(JSON.stringify(item))
          .digest('hex')
          .substring(0, 16);

        const externalProvenance: ExternalInputProvenance = {
          sourceUrl: `${this.baseUrl}#${mapping.underlyingStockSymbol}`,
          publisherName: 'Stooq Public Stock Reference',
          retrievedAtTimestamp,
          dataAsOfTimestamp: dataAsOf,
          symbolMapping: `SEC Issuer: ${mapping.issuerTicker} -> Stock Reference: ${mapping.underlyingStockSymbol} -> Conceptual rToken: ${mapping.rToken}`,
          conceptualRTokenSymbol: mapping.rToken,
          underlyingStockSymbol: mapping.underlyingStockSymbol,
          rawPrice: closeVal,
          contentHash,
          dataMode: 'LIVE_EXTERNAL_UNDERLYING_REFERENCE',
        };

        const ctx: MarketContextWithStooqProvenance = {
          symbol: mapping.rToken,
          name: mapping.name,
          currentPrice: closeVal,
          prevClose,
          change24hPct,
          bidPrice,
          askPrice,
          spreadPct,
          volume24hUsd: volumeVal > 0 ? volumeVal * closeVal : 50000000,
          liquidityDepthIndex,
          sessionStatus: 'OVERNIGHT_ACTIVE',
          isDemoData: false,
          externalProvenance,
          underlyingStockSymbol: mapping.underlyingStockSymbol,
        };

        items.push(ctx);
      }

      return items;
    } catch (err: any) {
      clearTimeout(timer);
      console.warn(`[StooqMarketDataProvider] Failed to query Stooq stock quotes (${err.message}). Fail closed.`);
      return [];
    }
  }

  async getMarketContext(symbol: string): Promise<MarketContext | null> {
    const watchlist = await this.getWatchlist();
    return watchlist.find((item) => item.symbol === symbol) || null;
  }
}
