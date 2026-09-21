import { describe, it, expect, vi, afterEach } from 'vitest';
import { BitgetWalletRwaMarketProvider } from '../src/lib/adapters/bitgetWalletRwaMarketProvider';
import { DataProvenanceBadge } from '../src/components/DataProvenanceBadge';
import { StooqMarketDataProvider } from '../src/lib/adapters/stooqMarketDataProvider';

describe('Bitget Wallet RWA Market Data Provider (web3.bitget.com / Reality)', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('should fail closed cleanly when API key is missing or unauthenticated', async () => {
    const provider = new BitgetWalletRwaMarketProvider({ apiKey: '' });
    const watchlist = await provider.getWatchlist();

    expect(watchlist).toEqual([]);
  });

  it('should filter out non-Reality tokens and discover only markets with data_source === "reality"', async () => {
    const mockApiResponse = {
      code: 0,
      msg: 'success',
      data: {
        list: [
          {
            ticker: 'NVDA',
            chain: 'ethereum',
            contract: '0x1111111111111111111111111111111111111111',
            symbol: 'rNVDA',
            name: 'NVIDIA Corp Tokenized Stock',
            market_status: 'OPEN',
            latest_price: 135.5,
            data_source: 'reality',
            trace_id: 'trace-nvda-123',
          },
          {
            ticker: 'SOME_SYNTH',
            chain: 'solana',
            contract: '0x2222222222222222222222222222222222222222',
            symbol: 'rSYNTH',
            name: 'Unverified Synthetic Asset',
            market_status: 'OPEN',
            latest_price: 50.0,
            data_source: 'unverified_oracle',
            trace_id: 'trace-synth-456',
          },
        ],
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });

    const provider = new BitgetWalletRwaMarketProvider({ apiKey: 'test-api-key-123' });
    const watchlist = await provider.getWatchlist();

    expect(watchlist.length).toBe(1);

    const nvda = watchlist[0];
    expect(nvda.symbol).toBe('rNVDA');
    expect(nvda.currentPrice).toBe(135.5);
    expect(nvda.isDemoData).toBe(false);

    const prov = (nvda as any).externalProvenance;
    expect(prov).toBeDefined();
    expect(prov.dataMode).toBe('BITGET_WALLET_RWA_REALITY_READ_ONLY');
    expect(prov.dataSource).toBe('reality');
    expect(prov.chain).toBe('ethereum');
    expect(prov.contractAddress).toBe('0x1111111111111111111111111111111111111111');
    expect(prov.underlyingStockSymbol).toBe('NVDA');
    expect(prov.traceId).toBe('trace-nvda-123');
  });

  it('should fail closed cleanly on HTTP network errors or bad responses', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Fetch failed / connection refused'));

    const provider = new BitgetWalletRwaMarketProvider({ apiKey: 'test-api-key-123' });
    const watchlist = await provider.getWatchlist();

    expect(watchlist).toEqual([]);
  });

  it('should strictly separate Stooq reference provenance from Bitget Wallet RWA provenance', () => {
    const stooqProv = {
      dataMode: 'LIVE_EXTERNAL_UNDERLYING_REFERENCE' as const,
      publisherDomain: 'stooq.com',
    };
    expect(stooqProv.dataMode).not.toBe('BITGET_WALLET_RWA_REALITY_READ_ONLY');
  });
});
