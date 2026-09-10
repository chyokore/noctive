import crypto from 'crypto';
import { MarketContext, ExternalInputProvenance } from '@/types/domain';
import { IMarketDataProvider } from './marketDataProvider';

export interface LiveMarketConfig {
  baseUrl?: string;
  timeoutMs?: number;
}

const BITGET_TICKERS_URL = 'https://api.bitget.com/api/v2/spot/market/tickers';

export interface RTokenEquityMapping {
  rToken: string;
  exchangeMarketSymbol: string;
  name: string;
  issuerTicker: string;
}

// Explicit verified market mapping
export const RTOKEN_EQUITY_MAPPINGS: Record<string, RTokenEquityMapping> = {
  rNVDA: {
    rToken: 'rNVDA',
    exchangeMarketSymbol: 'NVDAUSDT',
    name: 'NVIDIA Corp (Tokenized Equity)',
    issuerTicker: 'NVDA',
  },
  rAAPL: {
    rToken: 'rAAPL',
    exchangeMarketSymbol: 'AAPLUSDT',
    name: 'Apple Inc (Tokenized Equity)',
    issuerTicker: 'AAPL',
  },
  rMSFT: {
    rToken: 'rMSFT',
    exchangeMarketSymbol: 'MSFTUSDT',
    name: 'Microsoft Corp (Tokenized Equity)',
    issuerTicker: 'MSFT',
  },
  rTSLA: {
    rToken: 'rTSLA',
    exchangeMarketSymbol: 'TSLAUSDT',
    name: 'Tesla Inc (Tokenized Equity)',
    issuerTicker: 'TSLA',
  },
  rSPY: {
    rToken: 'rSPY',
    exchangeMarketSymbol: 'SPYUSDT',
    name: 'SPDR S&P 500 ETF (Tokenized Equity)',
    issuerTicker: 'SPY',
  },
  rQQQ: {
    rToken: 'rQQQ',
    exchangeMarketSymbol: 'QQQUSDT',
    name: 'Invesco QQQ Trust (Tokenized Equity)',
    issuerTicker: 'QQQ',
  },
};

// Map exchange market symbol (e.g. NVDAUSDT) -> RTokenEquityMapping
export const EXCHANGE_SYMBOL_LOOKUP: Record<string, RTokenEquityMapping> = Object.values(RTOKEN_EQUITY_MAPPINGS).reduce(
  (acc, mapping) => {
    acc[mapping.exchangeMarketSymbol.toUpperCase()] = mapping;
    return acc;
  },
  {} as Record<string, RTokenEquityMapping>
);

export interface MarketContextWithProvenance extends MarketContext {
  externalProvenance: ExternalInputProvenance;
  confirmedMarketSymbol: string;
}

export class LiveMarketDataProvider implements IMarketDataProvider {
  private baseUrl: string;
  private timeoutMs: number;

  constructor(config: LiveMarketConfig = {}) {
    this.baseUrl = config.baseUrl || BITGET_TICKERS_URL;
    this.timeoutMs = config.timeoutMs || 6000;
  }

  async getWatchlist(): Promise<MarketContext[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const rawRetrievalTimestamp = new Date().toISOString();

    try {
      const res = await fetch(this.baseUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'NoctiveIntelligenceAgent/1.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`Bitget public tickers API HTTP ${res.status}`);
      }

      const body = await res.json();
      if (!body || body.code !== '00000' || !Array.isArray(body.data)) {
        throw new Error(`Bitget API error or invalid format: ${body?.msg || 'unknown'}`);
      }

      const items: MarketContext[] = [];

      for (const item of body.data) {
        const rawSymbolUpper = (item.symbol || '').toUpperCase();

        // Exact match against verified exchange market symbols (NVDAUSDT, AAPLUSDT, MSFTUSDT, TSLAUSDT, SPYUSDT, QQQUSDT)
        const mapping = EXCHANGE_SYMBOL_LOOKUP[rawSymbolUpper];
        if (!mapping) continue;

        // Confirm returned symbol matches expected exchange market symbol
        if (rawSymbolUpper !== mapping.exchangeMarketSymbol.toUpperCase()) continue;

        const currentPrice = parseFloat(item.lastPr || '0');
        const change24hPct = parseFloat(item.change24h || '0') * 100;
        const bidPrice = parseFloat(item.bidPr || item.lastPr || '0');
        const askPrice = parseFloat(item.askPr || item.lastPr || '0');
        const volume24hUsd = parseFloat(item.usdtVolume || '0');

        const prevClose = change24hPct !== 0 ? currentPrice / (1 + change24hPct / 100) : currentPrice;
        const spreadPct = askPrice > 0 ? Math.max(0, ((askPrice - bidPrice) / askPrice) * 100) : 0.1;
        const liquidityDepthIndex = Math.min(100, Math.max(10, Math.round(Math.log10(volume24hUsd + 1) * 15)));

        const contentHash = crypto
          .createHash('sha256')
          .update(JSON.stringify(item))
          .digest('hex')
          .substring(0, 16);

        const externalProvenance: ExternalInputProvenance = {
          sourceUrl: `${this.baseUrl}?symbol=${item.symbol}`,
          publisherName: 'Bitget Public Spot Tickers API',
          retrievedAtTimestamp: rawRetrievalTimestamp,
          publishedAtTimestamp: rawRetrievalTimestamp,
          symbolMapping: `Conceptual rToken: ${mapping.rToken} -> Confirmed Bitget Exchange Symbol: ${mapping.exchangeMarketSymbol}`,
          conceptualRTokenSymbol: mapping.rToken,
          exchangeMarketSymbol: mapping.exchangeMarketSymbol,
          contentHash,
          dataMode: 'LIVE_EXTERNAL',
        };

        const ctx: MarketContextWithProvenance = {
          symbol: mapping.rToken,
          name: mapping.name,
          currentPrice: currentPrice > 0 ? currentPrice : 1.0,
          prevClose: prevClose > 0 ? prevClose : 1.0,
          change24hPct: parseFloat(change24hPct.toFixed(2)),
          bidPrice: bidPrice > 0 ? bidPrice : currentPrice,
          askPrice: askPrice > 0 ? askPrice : currentPrice,
          spreadPct: parseFloat(spreadPct.toFixed(3)),
          volume24hUsd,
          liquidityDepthIndex,
          sessionStatus: 'OVERNIGHT_ACTIVE',
          isDemoData: false,
          externalProvenance,
          confirmedMarketSymbol: item.symbol,
        };

        items.push(ctx);
      }

      return items;
    } catch (err: any) {
      clearTimeout(timer);
      console.warn(`[LiveMarketDataProvider] Failed to query Bitget tickers (${err.message}). Fail closed.`);
      return [];
    }
  }

  async getMarketContext(symbol: string): Promise<MarketContext | null> {
    const watchlist = await this.getWatchlist();
    return watchlist.find((item) => item.symbol === symbol) || null;
  }
}
