import crypto from 'crypto';
import { MarketContext, ExternalInputProvenance } from '@/types/domain';
import { IMarketDataProvider } from './marketDataProvider';

export interface BitgetWalletRwaConfig {
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
}

export const BITGET_WALLET_DEFAULT_URL = 'https://web3.bitget.com';

export interface BitgetRwaStockItem {
  ticker: string;
  chain: string;
  contract: string;
  symbol: string;
  name?: string;
  market_status?: string;
  latest_price?: number | string;
  data_source?: string;
  trace_id?: string;
}

export interface MarketContextWithRwaProvenance extends MarketContext {
  externalProvenance: ExternalInputProvenance;
  chain: string;
  contractAddress: string;
}

export class BitgetWalletRwaMarketProvider implements IMarketDataProvider {
  private baseUrl: string;
  private apiKey?: string;
  private timeoutMs: number;

  constructor(config: BitgetWalletRwaConfig = {}) {
    this.baseUrl = config.baseUrl || BITGET_WALLET_DEFAULT_URL;
    this.apiKey = config.apiKey || process.env.BITGET_WALLET_API_KEY;
    this.timeoutMs = config.timeoutMs || 5000;
  }

  async getWatchlist(): Promise<MarketContext[]> {
    const retrievedAtTimestamp = new Date().toISOString();
    const endpointUrl = `${this.baseUrl}/bgw-pro/market/v3/rwa/stockList`;

    // Requirement 1 & 7: Check API key requirement
    if (!this.apiKey || this.apiKey.trim() === '') {
      console.warn(
        `[BitgetWalletRwaMarketProvider] Authentication failed: BITGET_WALLET_API_KEY environment variable is not configured. Fail closed.`
      );
      return [];
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-API-KEY': this.apiKey,
          'User-Agent': 'NoctiveRwaAgent/1.0',
        },
        body: JSON.stringify({ page: 1, pageSize: 50 }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`HTTP status ${res.status}`);
      }

      const body = await res.json();
      if (!body || body.code !== 0 || !Array.isArray(body.data?.list || body.data)) {
        throw new Error(body?.msg || body?.message || 'Invalid API response payload');
      }

      const rawList: any[] = Array.isArray(body.data?.list) ? body.data.list : body.data;
      const items: MarketContext[] = [];

      for (const rawItem of rawList) {
        // Requirement 3: Accept a market ONLY when data_source === "reality"
        const dataSource = (rawItem.data_source || rawItem.dataSource || '').toLowerCase();
        if (dataSource !== 'reality') {
          continue;
        }

        const ticker = rawItem.ticker || rawItem.issuerTicker || '';
        const chain = rawItem.chain || 'ethereum';
        const contract = rawItem.contract || rawItem.contractAddress || '';
        const symbol = rawItem.symbol || (ticker ? `r${ticker}` : '');
        const marketStatus = rawItem.market_status || rawItem.marketStatus || 'OPEN';
        const latestPrice = parseFloat(String(rawItem.latest_price || rawItem.latestPrice || rawItem.price || '0'));
        const traceId = (rawItem.trace_id || rawItem.traceId || body.trace_id || body.traceId || '').replace(/[^a-zA-Z0-9_-]/g, '');

        if (!symbol || isNaN(latestPrice) || latestPrice <= 0) {
          continue;
        }

        const prevClose = latestPrice;
        const change24hPct = 0;
        const spreadPct = 0.05;
        const bidPrice = parseFloat((latestPrice * 0.9998).toFixed(2));
        const askPrice = parseFloat((latestPrice * 1.0002).toFixed(2));
        const liquidityDepthIndex = 95;

        const contentHash = crypto
          .createHash('sha256')
          .update(JSON.stringify(rawItem))
          .digest('hex')
          .substring(0, 16);

        // Requirement 3 & 5: Persist Reality contract metadata & provenance
        const externalProvenance: ExternalInputProvenance = {
          sourceUrl: endpointUrl,
          publisherName: 'Bitget Wallet RWA / Reality Protocol',
          retrievedAtTimestamp,
          dataAsOfTimestamp: retrievedAtTimestamp,
          symbolMapping: `SEC Issuer: ${ticker} -> Chain: ${chain} -> Contract: ${contract} -> Symbol: ${symbol} (Source: reality)`,
          conceptualRTokenSymbol: symbol,
          underlyingStockSymbol: ticker,
          chain,
          contractAddress: contract,
          dataSource: 'reality',
          traceId,
          rawPrice: latestPrice,
          contentHash,
          dataMode: 'BITGET_WALLET_RWA_REALITY_READ_ONLY',
        };

        const ctx: MarketContextWithRwaProvenance = {
          symbol,
          name: rawItem.name || `${ticker} Tokenized Stock (Bitget Wallet Reality RWA)`,
          currentPrice: latestPrice,
          prevClose,
          change24hPct,
          bidPrice,
          askPrice,
          spreadPct,
          volume24hUsd: 10000000,
          liquidityDepthIndex,
          sessionStatus: marketStatus === 'OPEN' ? 'OVERNIGHT_ACTIVE' : 'REGULAR_CLOSED',
          isDemoData: false,
          externalProvenance,
          chain,
          contractAddress: contract,
        };

        items.push(ctx);
      }

      return items;
    } catch (err: any) {
      clearTimeout(timer);
      console.warn(`[BitgetWalletRwaMarketProvider] Fail closed: ${err.message}`);
      return [];
    }
  }

  async getMarketContext(symbol: string): Promise<MarketContext | null> {
    const watchlist = await this.getWatchlist();
    return watchlist.find((item) => item.symbol === symbol) || null;
  }
}
