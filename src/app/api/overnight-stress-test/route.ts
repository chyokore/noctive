import { NextRequest, NextResponse } from 'next/server';
import {
  BitgetWalletRwaMarketProvider,
  MarketContextWithRwaProvenance,
} from '@/lib/adapters/bitgetWalletRwaMarketProvider';
import { StooqMarketDataProvider } from '@/lib/adapters/stooqMarketDataProvider';
import {
  OvernightStressTestEngine,
  OvernightStressTestAssessment,
} from '@/lib/engine/overnightStressTestEngine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const activeTicker = (searchParams.get('ticker') || 'NVDA').toUpperCase().replace(/^R/, '');

  const rwaProvider = new BitgetWalletRwaMarketProvider();
  const stooqProvider = new StooqMarketDataProvider();

  let watchlistQuotes: MarketContextWithRwaProvenance[] = [];
  let stooqQuotes: any[] = [];
  let providerStatus = 'HEALTHY';

  try {
    watchlistQuotes = (await rwaProvider.getWatchlist()) as MarketContextWithRwaProvenance[];
    if (!watchlistQuotes || watchlistQuotes.length === 0) {
      providerStatus = 'NO_QUOTES';
    }
  } catch (err: any) {
    console.warn('[OvernightStressTestAPI] Bitget Wallet Reality provider error:', err?.message || err);
    providerStatus = 'UNAVAILABLE';
  }

  // Non-blocking Stooq underlying stock reference fetch
  try {
    stooqQuotes = await stooqProvider.getWatchlist();
  } catch {
    stooqQuotes = [];
  }

  // Fail closed if required Reality data is unavailable
  if (providerStatus === 'UNAVAILABLE' || watchlistQuotes.length === 0) {
    return NextResponse.json(
      {
        success: false,
        providerStatus,
        activeAssessment: null,
        watchlistAssessments: [],
        errorMessage:
          'Verified Reality market data is currently unavailable for Overnight Collateral Stress Test.',
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  }

  // Generate stress test assessments for all watchlist quotes
  const assessments: OvernightStressTestAssessment[] = watchlistQuotes.map((quote) => {
    const ticker = (quote.externalProvenance?.underlyingStockSymbol || quote.symbol)
      .toUpperCase()
      .replace(/^R/, '');
    const matchingStooq = stooqQuotes.find(
      (s) =>
        s.symbol?.toUpperCase().replace('.US', '') === ticker ||
        s.externalProvenance?.underlyingStockSymbol?.toUpperCase().replace('.US', '') === ticker
    );
    return OvernightStressTestEngine.evaluateQuote(quote, matchingStooq);
  });

  const activeAssessment =
    assessments.find((a) => a.ticker.toUpperCase() === activeTicker) ||
    assessments[0] ||
    null;

  return NextResponse.json(
    {
      success: true,
      providerStatus,
      activeAssessment,
      watchlistAssessments: assessments,
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    }
  );
}
