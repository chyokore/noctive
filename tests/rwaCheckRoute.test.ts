import { describe, it, expect, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../src/app/api/rwa-check/route';
import { BitgetWalletRwaMarketProvider } from '../src/lib/adapters/bitgetWalletRwaMarketProvider';

describe('Protected RWA Diagnostic Endpoint (/api/rwa-check)', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('should return HTTP 401 when Bearer CRON_SECRET is missing or invalid', async () => {
    process.env.CRON_SECRET = 'valid-cron-secret-123';

    const reqUnauth = new NextRequest('http://localhost:3000/api/rwa-check', {
      headers: { authorization: 'Bearer wrong-secret' },
    });
    const resUnauth = await GET(reqUnauth);
    expect(resUnauth.status).toBe(401);
    const jsonUnauth = await resUnauth.json();
    expect(jsonUnauth.success).toBe(false);
    expect(jsonUnauth.error).toContain('Unauthorized');
  });

  it('should execute RWA provider check only and return sanitized contracts list when authorized', async () => {
    process.env.CRON_SECRET = 'valid-cron-secret-123';

    const mockWatchlist = [
      {
        symbol: 'rNVDA',
        name: 'NVIDIA Corp Tokenized Stock',
        currentPrice: 135.5,
        externalProvenance: {
          underlyingStockSymbol: 'NVDA',
          chain: 'ethereum',
          contractAddress: '0x1111111111111111111111111111111111111111',
          dataSource: 'reality',
        },
      },
      {
        symbol: 'rAAPL',
        name: 'Apple Inc Tokenized Stock',
        currentPrice: 228.0,
        externalProvenance: {
          underlyingStockSymbol: 'AAPL',
          chain: 'ethereum',
          contractAddress: '0x2222222222222222222222222222222222222222',
          dataSource: 'reality',
        },
      },
    ];

    vi.spyOn(BitgetWalletRwaMarketProvider.prototype, 'getWatchlist').mockResolvedValue(mockWatchlist as any);

    const reqAuth = new NextRequest('http://localhost:3000/api/rwa-check', {
      headers: { authorization: 'Bearer valid-cron-secret-123' },
    });

    const res = await GET(reqAuth);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.providerStatus).toBe('HEALTHY');
    expect(data.realityContractsCount).toBe(2);
    expect(data.sampleContracts.length).toBe(2);
    expect(data.sampleContracts[0]).toEqual({
      ticker: 'NVDA',
      chain: 'ethereum',
      symbol: 'rNVDA',
    });

    // Verify zero credential leakage in JSON output
    const rawJson = JSON.stringify(data);
    expect(rawJson).not.toContain('valid-cron-secret-123');
    expect(rawJson).not.toContain('x-api-key');
    expect(rawJson).not.toContain('x-api-signature');
  });

  it('should return sanitized HTTP 403 diagnostics on provider error', async () => {
    process.env.CRON_SECRET = 'valid-cron-secret-123';

    vi.spyOn(BitgetWalletRwaMarketProvider.prototype, 'getWatchlist').mockImplementation(async function (this: BitgetWalletRwaMarketProvider) {
      this.lastError = {
        httpStatus: 403,
        code: 40301,
        message: 'Invalid IP address or HMAC signature',
        traceId: 'trace-403-xyz',
      };
      return [];
    });

    const req = new NextRequest('http://localhost:3000/api/rwa-check', {
      method: 'POST',
      headers: { authorization: 'Bearer valid-cron-secret-123' },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.providerStatus).toBe('HTTP_403');
    expect(data.httpStatus).toBe(403);
    expect(data.code).toBe(40301);
    expect(data.message).toBe('Invalid IP address or HMAC signature');
    expect(data.traceId).toBe('trace-403-xyz');
    expect(data.realityContractsCount).toBe(0);
  });
});
