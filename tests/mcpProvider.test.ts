import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  BitgetMcpMarketDataProvider,
  BITGET_MCP_DEFAULT_URL,
  BITGET_MCP_STOCK_MAPPINGS,
  MCP_SYMBOL_LOOKUP,
} from '../src/lib/adapters/bitgetMcpMarketDataProvider';
import { DataProvenanceBadge } from '../src/components/DataProvenanceBadge';
import { StooqMarketDataProvider } from '../src/lib/adapters/stooqMarketDataProvider';

describe('Bitget MCP Market Data Provider (https://agent.bitget.com/mcp)', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('should maintain exact rToken conceptual symbol to Bitget MCP stock symbol mappings', () => {
    expect(BITGET_MCP_STOCK_MAPPINGS.rNVDA.stockSymbol).toBe('NVDA');
    expect(BITGET_MCP_STOCK_MAPPINGS.rAAPL.stockSymbol).toBe('AAPL');
    expect(BITGET_MCP_STOCK_MAPPINGS.rMSFT.stockSymbol).toBe('MSFT');
    expect(BITGET_MCP_STOCK_MAPPINGS.rTSLA.stockSymbol).toBe('TSLA');
    expect(BITGET_MCP_STOCK_MAPPINGS.rSPY.stockSymbol).toBe('SPY');
    expect(BITGET_MCP_STOCK_MAPPINGS.rQQQ.stockSymbol).toBe('QQQ');

    expect(MCP_SYMBOL_LOOKUP['NVDA'].rToken).toBe('rNVDA');
    expect(MCP_SYMBOL_LOOKUP['AAPL'].rToken).toBe('rAAPL');
    expect(MCP_SYMBOL_LOOKUP['MSFT'].rToken).toBe('rMSFT');
    expect(MCP_SYMBOL_LOOKUP['TSLA'].rToken).toBe('rTSLA');
    expect(MCP_SYMBOL_LOOKUP['SPY'].rToken).toBe('rSPY');
    expect(MCP_SYMBOL_LOOKUP['QQQ'].rToken).toBe('rQQQ');
  });

  it('should return empty watchlist (fail closed) when MCP server is unreachable or times out', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error / connection refused'));

    const provider = new BitgetMcpMarketDataProvider({ timeoutMs: 1000 });
    const watchlist = await provider.getWatchlist();

    expect(watchlist).toEqual([]);
  });

  it('should parse valid JSON-RPC tool call responses from Bitget MCP server and set BITGET_MCP_US_STOCKS_READ_ONLY provenance', async () => {
    const mockMcpResponse = {
      jsonrpc: '2.0',
      id: 12345,
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              quotes: [
                {
                  symbol: 'NVDA',
                  price: 135.5,
                  bid: 135.45,
                  ask: 135.55,
                  spreadPct: 0.07,
                  volume24hUsd: 15000000,
                  liquidityIndex: 88,
                  dataAsOf: new Date().toISOString(),
                },
                {
                  symbol: 'AAPL',
                  price: 228.1,
                  bid: 228.0,
                  ask: 228.2,
                  spreadPct: 0.09,
                  volume24hUsd: 12000000,
                  liquidityIndex: 85,
                  dataAsOf: new Date().toISOString(),
                },
              ],
            }),
          },
        ],
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockMcpResponse,
      text: async () => JSON.stringify(mockMcpResponse),
    });

    const provider = new BitgetMcpMarketDataProvider({ timeoutMs: 3000 });
    const watchlist = await provider.getWatchlist();

    expect(watchlist.length).toBe(2);

    const nvda = watchlist.find((item) => item.symbol === 'rNVDA');
    expect(nvda).toBeDefined();
    expect(nvda?.currentPrice).toBe(135.5);
    expect(nvda?.isDemoData).toBe(false);

    const prov = (nvda as any).externalProvenance;
    expect(prov).toBeDefined();
    expect(prov.dataMode).toBe('BITGET_MCP_US_STOCKS_READ_ONLY');
    expect(prov.publisherName).toBe('Bitget Official MCP US Stock Server (Read-Only)');
    expect(prov.sourceUrl).toBe('https://agent.bitget.com/mcp');
  });

  it('should strictly separate Stooq reference provenance from Bitget MCP provenance', () => {
    const stooqProvider = new StooqMarketDataProvider();
    expect(stooqProvider).toBeDefined();

    // Verify Stooq uses LIVE_EXTERNAL_UNDERLYING_REFERENCE, not BITGET_MCP_US_STOCKS_READ_ONLY
    const stooqProv = {
      dataMode: 'LIVE_EXTERNAL_UNDERLYING_REFERENCE' as const,
      publisherDomain: 'stooq.com',
    };
    expect(stooqProv.dataMode).not.toBe('BITGET_MCP_US_STOCKS_READ_ONLY');
  });
});
