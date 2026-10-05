import { NextRequest, NextResponse } from 'next/server';
import {
  BitgetWalletRwaMarketProvider,
  APPROVED_EQUITY_WATCHLIST,
  MarketContextWithRwaProvenance,
} from '@/lib/adapters/bitgetWalletRwaMarketProvider';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const activeTicker = (searchParams.get('ticker') || 'NVDA').toUpperCase().replace(/^R/, '');

  const rwaProvider = new BitgetWalletRwaMarketProvider();
  let watchlistQuotes: MarketContextWithRwaProvenance[] = [];
  let providerStatus: string = 'HEALTHY';

  try {
    watchlistQuotes = (await rwaProvider.getWatchlist()) as MarketContextWithRwaProvenance[];
    if (watchlistQuotes.length === 0) {
      providerStatus = 'NO_QUOTES';
    }
  } catch (err: any) {
    console.warn('[MarketPulseAPI] Watchlist fetch error:', err?.message || err);
    providerStatus = 'UNAVAILABLE';
  }

  // Active token quote lookup
  const activeQuote =
    watchlistQuotes.find(
      (q) =>
        (q.externalProvenance?.underlyingStockSymbol || q.symbol)
          .toUpperCase()
          .replace(/^R/, '') === activeTicker
    ) || watchlistQuotes[0] || null;

  // Active Kline check
  let activeKline: {
    ticker: string;
    isAvailable: boolean;
    candles: any[];
    errorReason?: string;
    fallbackMessage: string;
  } = {
    ticker: activeTicker,
    isAvailable: false,
    candles: [],
    fallbackMessage: 'Verified historical Reality candles are currently unavailable.',
  };

  if (activeQuote && activeQuote.externalProvenance) {
    const ticker = activeQuote.externalProvenance.underlyingStockSymbol || activeTicker;
    const chain = activeQuote.externalProvenance.chain || activeQuote.chain || 'ethereum';
    const contract = activeQuote.externalProvenance.contractAddress || activeQuote.contractAddress || '';

    try {
      const klineResult = await rwaProvider.fetchStockKline(ticker, chain, contract);
      if (klineResult.success && klineResult.candles.length > 0) {
        activeKline = {
          ticker,
          isAvailable: true,
          candles: klineResult.candles,
          fallbackMessage: 'Verified historical Reality candles are currently unavailable.',
        };
      } else {
        activeKline.errorReason = klineResult.errorReason || 'No valid candles';
      }
    } catch (klineErr: any) {
      activeKline.errorReason = klineErr?.message || 'Kline fetch error';
    }
  }

  return NextResponse.json(
    {
      success: true,
      providerStatus,
      allowlistedTickers: APPROVED_EQUITY_WATCHLIST,
      quotes: watchlistQuotes,
      activeKline,
      provenanceLabels: ['Read-only live market context', 'Not a trade signal'],
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    }
  );
}
