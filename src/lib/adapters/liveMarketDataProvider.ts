import crypto from 'crypto';
import { MarketContext } from '@/types/domain';
import { IMarketDataProvider } from './marketDataProvider';

export interface LiveMarketConfig {
  baseUrl?: string;
  timeoutMs?: number;
}

const BITGET_TICKERS_URL = 'https://api.bitget.com/api/v2/spot/market/tickers';

const SYMBOL_MAP: Record<string, { symbol: string; name: string }> = {
  BGBUSDT: { symbol: 'rBGB', name: 'Bitget Token (Tokenized rToken)' },
  BTCUSDT: { symbol: 'rBTC', name: 'Bitcoin (Tokenized rToken)' },
  ETHUSDT: { symbol: 'rETH', name: 'Ethereum (Tokenized rToken)' },
  SOLUSDT: { symbol: 'rSOL', name: 'Solana (Tokenized rToken)' },
};

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
        const mapping = SYMBOL_MAP[item.symbol];
        if (!mapping) continue;

        const currentPrice = parseFloat(item.lastPr || '0');
        const change24hPct = parseFloat(item.change24h || '0') * 100;
        const bidPrice = parseFloat(item.bidPr || item.lastPr || '0');
        const askPrice = parseFloat(item.askPr || item.lastPr || '0');
        const volume24hUsd = parseFloat(item.usdtVolume || '0');

        const prevClose = change24hPct !== 0 ? currentPrice / (1 + change24hPct / 100) : currentPrice;
        const spreadPct = askPrice > 0 ? Math.max(0, ((askPrice - bidPrice) / askPrice) * 100) : 0.1;
        const liquidityDepthIndex = Math.min(100, Math.max(10, Math.round(Math.log10(volume24hUsd + 1) * 15)));

        items.push({
          symbol: mapping.symbol,
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
        });
      }

      return items;
    } catch (err: any) {
      clearTimeout(timer);
      console.warn(`[LiveMarketDataProvider] Failed to fetch live tickers (${err.message}). Returning empty array (fail closed).`);
      return [];
    }
  }

  async getMarketContext(symbol: string): Promise<MarketContext | null> {
    const watchlist = await this.getWatchlist();
    return watchlist.find((item) => item.symbol === symbol) || null;
  }
}
