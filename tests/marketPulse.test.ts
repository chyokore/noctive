import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as marketPulseHandler } from '../src/app/api/market-pulse/route';
import { BitgetWalletRwaMarketProvider, APPROVED_EQUITY_WATCHLIST } from '../src/lib/adapters/bitgetWalletRwaMarketProvider';

describe('Read-Only Market Pulse API & Provenance Verification', () => {
  it('should include all 6 allowlisted rToken tickers in approved watchlist', () => {
    expect(APPROVED_EQUITY_WATCHLIST).toEqual(['NVDA', 'AAPL', 'MSFT', 'TSLA', 'SPY', 'QQQ']);
  });

  it('should return valid market pulse response with required provenance labels', async () => {
    const req = new NextRequest('http://localhost:3000/api/market-pulse?ticker=rNVDA', {
      method: 'GET',
    });

    const res = await marketPulseHandler(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.provenanceLabels).toContain('Read-only live market context');
    expect(data.provenanceLabels).toContain('Not a trade signal');
    expect(data.activeKline).toBeDefined();
    expect(data.activeKline.fallbackMessage).toBe('Verified historical Reality candles are currently unavailable.');
  });

  it('should display mandatory fallback message when Kline data is unavailable or unauthenticated', async () => {
    const provider = new BitgetWalletRwaMarketProvider();
    const klineResult = await provider.fetchStockKline('NVDA', 'ethereum', '0x1234');

    expect(klineResult.success).toBe(false);
    expect(klineResult.candles).toEqual([]);
    expect(klineResult.errorReason).toBeDefined();
  });
});
