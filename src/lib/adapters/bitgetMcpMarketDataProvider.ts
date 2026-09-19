import crypto from 'crypto';
import { MarketContext, ExternalInputProvenance } from '@/types/domain';
import { IMarketDataProvider } from './marketDataProvider';

export interface BitgetMcpConfig {
  baseUrl?: string;
  timeoutMs?: number;
}

export const BITGET_MCP_DEFAULT_URL = 'https://agent.bitget.com/mcp';

export interface McpStockMapping {
  rToken: string;
  stockSymbol: string;
  name: string;
  issuerTicker: string;
}

export const BITGET_MCP_STOCK_MAPPINGS: Record<string, McpStockMapping> = {
  rNVDA: {
    rToken: 'rNVDA',
    stockSymbol: 'NVDA',
    name: 'NVIDIA Corp (Bitget MCP Stock Reference)',
    issuerTicker: 'NVDA',
  },
  rAAPL: {
    rToken: 'rAAPL',
    stockSymbol: 'AAPL',
    name: 'Apple Inc (Bitget MCP Stock Reference)',
    issuerTicker: 'AAPL',
  },
  rMSFT: {
    rToken: 'rMSFT',
    stockSymbol: 'MSFT',
    name: 'Microsoft Corp (Bitget MCP Stock Reference)',
    issuerTicker: 'MSFT',
  },
  rTSLA: {
    rToken: 'rTSLA',
    stockSymbol: 'TSLA',
    name: 'Tesla Inc (Bitget MCP Stock Reference)',
    issuerTicker: 'TSLA',
  },
  rSPY: {
    rToken: 'rSPY',
    stockSymbol: 'SPY',
    name: 'SPDR S&P 500 ETF (Bitget MCP Stock Reference)',
    issuerTicker: 'SPY',
  },
  rQQQ: {
    rToken: 'rQQQ',
    stockSymbol: 'QQQ',
    name: 'Invesco QQQ Trust (Bitget MCP Stock Reference)',
    issuerTicker: 'QQQ',
  },
};

export const MCP_SYMBOL_LOOKUP: Record<string, McpStockMapping> = Object.values(
  BITGET_MCP_STOCK_MAPPINGS
).reduce((acc, mapping) => {
  acc[mapping.stockSymbol.toUpperCase()] = mapping;
  return acc;
}, {} as Record<string, McpStockMapping>);

export interface MarketContextWithMcpProvenance extends MarketContext {
  externalProvenance: ExternalInputProvenance;
  underlyingStockSymbol: string;
}

export class BitgetMcpMarketDataProvider implements IMarketDataProvider {
  private baseUrl: string;
  private timeoutMs: number;

  constructor(config: BitgetMcpConfig = {}) {
    this.baseUrl = config.baseUrl || BITGET_MCP_DEFAULT_URL;
    this.timeoutMs = config.timeoutMs || 5000;
  }

  async getWatchlist(): Promise<MarketContext[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const retrievedAtTimestamp = new Date().toISOString();

    try {
      const payload = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'get_us_stock_quote',
          arguments: {
            symbols: ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'SPY', 'QQQ'],
          },
        },
        id: Date.now(),
      };

      const res = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'NoctiveIntelligenceAgent/1.0',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`Bitget MCP HTTP ${res.status}`);
      }

      const body = await res.json();
      if (!body || body.error) {
        throw new Error(`Bitget MCP response error: ${body?.error?.message || 'unknown error'}`);
      }

      // Extract content or result from JSON-RPC 2.0 response
      let quotes: Array<{
        symbol: string;
        price?: number | string;
        close?: number | string;
        open?: number | string;
        changePct?: number | string;
        volume?: number | string;
        timestamp?: string;
      }> = [];

      if (body.result && Array.isArray(body.result.quotes)) {
        quotes = body.result.quotes;
      } else if (body.result && Array.isArray(body.result.content)) {
        // Parse MCP text content if returned as formatted text/json
        const textContent = body.result.content.find((c: any) => c.type === 'text')?.text;
        if (textContent) {
          try {
            const parsed = JSON.parse(textContent);
            if (Array.isArray(parsed)) quotes = parsed;
            else if (Array.isArray(parsed.quotes)) quotes = parsed.quotes;
          } catch {
            // Ignore parse errors
          }
        }
      } else if (Array.isArray(body.data)) {
        quotes = body.data;
      }

      const items: MarketContext[] = [];

      for (const q of quotes) {
        const rawSymbolUpper = (q.symbol || '').toUpperCase();
        const mapping = MCP_SYMBOL_LOOKUP[rawSymbolUpper];
        if (!mapping) continue;

        const currentPrice = typeof q.price === 'number' ? q.price : parseFloat(String(q.price || q.close || '0'));
        const openPrice = typeof q.open === 'number' ? q.open : parseFloat(String(q.open || currentPrice));
        const volumeUsd = typeof q.volume === 'number' ? q.volume : parseFloat(String(q.volume || '50000000'));

        if (isNaN(currentPrice) || currentPrice <= 0) continue;

        const prevClose = openPrice > 0 ? openPrice : currentPrice;
        const change24hPct = prevClose > 0 ? parseFloat((((currentPrice - prevClose) / prevClose) * 100).toFixed(2)) : 0;
        const spreadPct = 0.05;
        const bidPrice = parseFloat((currentPrice * 0.9998).toFixed(2));
        const askPrice = parseFloat((currentPrice * 1.0002).toFixed(2));
        const liquidityDepthIndex = 95;

        const dataAsOf = q.timestamp || retrievedAtTimestamp;

        const contentHash = crypto
          .createHash('sha256')
          .update(JSON.stringify(q))
          .digest('hex')
          .substring(0, 16);

        const externalProvenance: ExternalInputProvenance = {
          sourceUrl: this.baseUrl,
          publisherName: 'Bitget Official MCP US Stock Server (Read-Only)',
          retrievedAtTimestamp,
          dataAsOfTimestamp: dataAsOf,
          symbolMapping: `SEC Issuer: ${mapping.issuerTicker} -> Bitget MCP Tool: get_us_stock_quote -> Conceptual rToken: ${mapping.rToken}`,
          conceptualRTokenSymbol: mapping.rToken,
          underlyingStockSymbol: mapping.stockSymbol,
          rawPrice: currentPrice,
          contentHash,
          dataMode: 'BITGET_MCP_US_STOCKS_READ_ONLY',
        };

        const ctx: MarketContextWithMcpProvenance = {
          symbol: mapping.rToken,
          name: mapping.name,
          currentPrice,
          prevClose,
          change24hPct,
          bidPrice,
          askPrice,
          spreadPct,
          volume24hUsd: volumeUsd * currentPrice,
          liquidityDepthIndex,
          sessionStatus: 'OVERNIGHT_ACTIVE',
          isDemoData: false,
          externalProvenance,
          underlyingStockSymbol: mapping.stockSymbol,
        };

        items.push(ctx);
      }

      return items;
    } catch (err: any) {
      clearTimeout(timer);
      console.warn(`[BitgetMcpMarketDataProvider] MCP query unavailable (${err.message}). Fail closed.`);
      return [];
    }
  }

  async getMarketContext(symbol: string): Promise<MarketContext | null> {
    const watchlist = await this.getWatchlist();
    return watchlist.find((item) => item.symbol === symbol) || null;
  }
}
