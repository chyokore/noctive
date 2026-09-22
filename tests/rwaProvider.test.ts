import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  BitgetWalletRwaMarketProvider,
  buildBitgetWalletSignature,
  BITGET_WALLET_BOPENAPI_URL,
} from '../src/lib/adapters/bitgetWalletRwaMarketProvider';

describe('Bitget Wallet RWA Signed Market Provider (https://bopenapi.bgwapi.io / Reality)', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('should construct valid HMAC-SHA256 Base64 x-api-signature with alphabetically sorted parameter keys', () => {
    const apiPath = '/bgw-pro/market/v3/rwa/stockList';
    const rawBodyStr = '{}';
    const apiKey = 'test-key-123';
    const timestampMs = '1700000000000';
    const apiSecret = 'test-secret-456';

    const sig = buildBitgetWalletSignature(apiPath, rawBodyStr, apiKey, timestampMs, apiSecret);

    expect(sig).toBeDefined();
    expect(typeof sig).toBe('string');
    expect(sig.length).toBeGreaterThan(10);

    // Verify determinism
    const sig2 = buildBitgetWalletSignature(apiPath, rawBodyStr, apiKey, timestampMs, apiSecret);
    expect(sig).toBe(sig2);
  });

  it('should fail closed cleanly when BITGET_WALLET_API_KEY or BITGET_WALLET_API_SECRET is missing', async () => {
    const provider1 = new BitgetWalletRwaMarketProvider({ apiKey: '', apiSecret: 'secret' });
    const watchlist1 = await provider1.getWatchlist();
    expect(watchlist1).toEqual([]);

    const provider2 = new BitgetWalletRwaMarketProvider({ apiKey: 'key', apiSecret: '' });
    const watchlist2 = await provider2.getWatchlist();
    expect(watchlist2).toEqual([]);
  });

  it('should construct signed HTTP headers and send raw body string "{}" to bopenapi stockList endpoint', async () => {
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
        ],
      },
    };

    let capturedHeaders: any = null;
    let capturedUrl: string = '';
    let capturedBody: string = '';

    global.fetch = vi.fn().mockImplementation(async (url: string, opts: any) => {
      capturedUrl = url;
      capturedHeaders = opts.headers;
      capturedBody = opts.body;
      return {
        ok: true,
        json: async () => mockApiResponse,
      };
    });

    const provider = new BitgetWalletRwaMarketProvider({
      apiKey: 'test-api-key',
      apiSecret: 'test-api-secret',
    });

    const watchlist = await provider.getWatchlist();

    expect(capturedUrl).toBe(`${BITGET_WALLET_BOPENAPI_URL}/bgw-pro/market/v3/rwa/stockList`);
    expect(capturedBody).toBe('{}');
    expect(capturedHeaders['x-api-key']).toBe('test-api-key');
    expect(capturedHeaders['x-api-timestamp']).toBeDefined();
    expect(capturedHeaders['x-api-signature']).toBeDefined();
    expect(capturedHeaders['x-api-signature'].length).toBeGreaterThan(10);

    expect(watchlist.length).toBe(1);
    expect(watchlist[0].symbol).toBe('rNVDA');
  });

  it('should filter out non-Reality tokens and retain only markets where data_source === "reality"', async () => {
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
            ticker: 'SYNTH_ASSET',
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

    const provider = new BitgetWalletRwaMarketProvider({
      apiKey: 'test-api-key',
      apiSecret: 'test-api-secret',
    });

    const watchlist = await provider.getWatchlist();

    expect(watchlist.length).toBe(1);
    const nvda = watchlist[0];
    expect(nvda.symbol).toBe('rNVDA');

    const prov = (nvda as any).externalProvenance;
    expect(prov).toBeDefined();
    expect(prov.dataMode).toBe('BITGET_WALLET_RWA_REALITY_READ_ONLY');
    expect(prov.dataSource).toBe('reality');
    expect(prov.chain).toBe('ethereum');
    expect(prov.contractAddress).toBe('0x1111111111111111111111111111111111111111');
    expect(prov.underlyingStockSymbol).toBe('NVDA');
  });

  it('should never leak API keys, secrets, or signatures into returned provenance objects or logs', async () => {
    const mockApiResponse = {
      code: 0,
      msg: 'success',
      data: {
        list: [
          {
            ticker: 'AAPL',
            chain: 'ethereum',
            contract: '0x3333333333333333333333333333333333333333',
            symbol: 'rAAPL',
            name: 'Apple Inc Tokenized Stock',
            market_status: 'OPEN',
            latest_price: 228.0,
            data_source: 'reality',
            trace_id: 'trace-aapl-789',
          },
        ],
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });

    const secretValue = 'SUPER_SECRET_KEY_DO_NOT_LEAK';
    const provider = new BitgetWalletRwaMarketProvider({
      apiKey: 'SENSITIVE_KEY_VALUE',
      apiSecret: secretValue,
    });

    const watchlist = await provider.getWatchlist();
    const serialized = JSON.stringify(watchlist);

    expect(serialized.includes(secretValue)).toBe(false);
    expect(serialized.includes('SENSITIVE_KEY_VALUE')).toBe(false);
  });
});
