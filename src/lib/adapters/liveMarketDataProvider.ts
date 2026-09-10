import crypto from 'crypto';
import { MarketContext, ExternalInputProvenance } from '@/types/domain';
import { IMarketDataProvider } from './marketDataProvider';

export interface LiveMarketConfig {
  baseUrl?: string;
  timeoutMs?: number;
}

const BITGET_TICKERS_URL = 'https://api.bitget.com/api/v2/spot/market/tickers';

export interface SupportedEquityDef {
  rToken: string;
  name: string;
  issuerTicker: string;
  candidateSymbols: string[];
}

export const SUPPORTED_EQUITIES: Record<string, SupportedEquityDef> = {
  NVDA: {
    rToken: 'rNVDA',
    name: 'NVIDIA Corp (Tokenized Equity)',
    issuerTicker: 'NVDA',
    candidateSymbols: ['RNVDAUSDT', 'NVDAUSDT', 'RNVDA_USDT', 'NVDA_USDT'],
  },
  AAPL: {
    rToken: 'rAAPL',
    name: 'Apple Inc (Tokenized Equity)',
    issuerTicker: 'AAPL',
    candidateSymbols: ['RAAPLUSDT', 'AAPLUSDT', 'RAAPL_USDT', 'AAPL_USDT'],
  },
  MSFT: {
    rToken: 'rMSFT',
    name: 'Microsoft Corp (Tokenized Equity)',
    issuerTicker: 'MSFT',
    candidateSymbols: ['RMSFTUSDT', 'MSFTUSDT', 'RMSFT_USDT', 'MSFT_USDT'],
  },
  TSLA: {
    rToken: 'rTSLA',
    name: 'Tesla Inc (Tokenized Equity)',
    issuerTicker: 'TSLA',
    candidateSymbols: ['RTSLAUSDT', 'TSLAUSDT', 'RTSLA_USDT', 'TSLA_USDT'],
  },
  SPY: {
    rToken: 'rSPY',
    name: 'SPDR S&P 500 ETF (Tokenized Equity)',
    issuerTicker: 'SPY',
    candidateSymbols: ['RSPYUSDT', 'SPYUSDT', 'RSPY_USDT', 'SPY_USDT'],
  },
  QQQ: {
    rToken: 'rQQQ',
    name: 'Invesco QQQ Trust (Tokenized Equity)',
    issuerTicker: 'QQQ',
    candidateSymbols: ['RQQQUSDT', 'QQQUSDT', 'RQQQ_USDT', 'QQQ_USDT'],
  },
};

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

        // Match against explicit supported tokenized equity candidate symbols only (NO CRYPTO)
        let matchedEquityKey: string | null = null;
        for (const [key, def] of Object.entries(SUPPORTED_EQUITIES)) {
          if (def.candidateSymbols.includes(rawSymbolUpper)) {
            matchedEquityKey = key;
            break;
          }
        }

        if (!matchedEquityKey) continue;

        const equityDef = SUPPORTED_EQUITIES[matchedEquityKey];
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
          symbolMapping: `Confirmed Bitget Listed Symbol: ${item.symbol} -> Equity rToken: ${equityDef.rToken}`,
          contentHash,
          dataMode: 'LIVE_EXTERNAL',
        };

        const ctx: MarketContextWithProvenance = {
          symbol: equityDef.rToken,
          name: equityDef.name,
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
