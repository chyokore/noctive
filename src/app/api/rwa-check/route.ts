import { NextRequest, NextResponse } from 'next/server';
import { BitgetWalletRwaMarketProvider } from '@/lib/adapters/bitgetWalletRwaMarketProvider';

async function handleRwaCheck(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized: Invalid or missing Bearer CRON_SECRET authorization header.',
      },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const targetTicker = searchParams.get('ticker');

  const rwaProvider = new BitgetWalletRwaMarketProvider();

  if (targetTicker) {
    const singleQuote = await rwaProvider.getSingleQuote(targetTicker);
    const schemaDiagnostic = rwaProvider.schemaDiagnostic || undefined;
    if (singleQuote) {
      const ext = (singleQuote as any).externalProvenance || {};
      return NextResponse.json({
        success: true,
        providerStatus: 'HEALTHY',
        targetTicker: targetTicker.toUpperCase(),
        quote: {
          symbol: singleQuote.symbol,
          underlyingTicker: ext.underlyingStockSymbol || targetTicker.toUpperCase(),
          chain: ext.chain || singleQuote.chain,
          contract: ext.contractAddress || singleQuote.contractAddress,
          latestPrice: singleQuote.currentPrice,
          marketStatus: singleQuote.sessionStatus === 'OVERNIGHT_ACTIVE' ? 'OPEN' : singleQuote.sessionStatus,
          dataSource: ext.dataSource || 'reality',
          traceId: ext.traceId || undefined,
          retrievedAtTimestamp: ext.retrievedAtTimestamp || new Date().toISOString(),
        },
        schemaDiagnostic,
        timestamp: new Date().toISOString(),
      });
    }
  }

  const watchlist = await rwaProvider.getWatchlist();
  const schemaDiagnostic = rwaProvider.schemaDiagnostic || undefined;

  if (watchlist.length > 0) {
    const sampleContracts = watchlist.slice(0, 3).map((item) => {
      const ext = (item as any).externalProvenance || {};
      return {
        ticker: ext.underlyingStockSymbol || item.symbol.replace(/^r/, ''),
        chain: ext.chain || 'ethereum',
        symbol: item.symbol,
      };
    });

    const targetQuoteItem = watchlist.find((item) => {
      const ext = (item as any).externalProvenance || {};
      return (ext.underlyingStockSymbol || '').toUpperCase() === 'NVDA' || item.symbol.toUpperCase() === 'RNVDA';
    }) || watchlist[0];

    const extQuote = targetQuoteItem ? (targetQuoteItem as any).externalProvenance || {} : {};

    return NextResponse.json({
      success: true,
      providerStatus: 'HEALTHY',
      targetTicker: 'NVDA',
      quote: targetQuoteItem
        ? {
            symbol: targetQuoteItem.symbol,
            underlyingTicker: extQuote.underlyingStockSymbol || 'NVDA',
            chain: extQuote.chain || (targetQuoteItem as any).chain || 'morph',
            contract: extQuote.contractAddress || (targetQuoteItem as any).contractAddress || '',
            latestPrice: targetQuoteItem.currentPrice,
            marketStatus: targetQuoteItem.sessionStatus === 'OVERNIGHT_ACTIVE' ? 'OPEN' : targetQuoteItem.sessionStatus,
            dataSource: extQuote.dataSource || 'reality',
            traceId: extQuote.traceId || undefined,
            retrievedAtTimestamp: extQuote.retrievedAtTimestamp || new Date().toISOString(),
          }
        : null,
      realityContractsCount: watchlist.length,
      sampleContracts,
      schemaDiagnostic,
      timestamp: new Date().toISOString(),
    });
  }

  const lastErr = rwaProvider.lastError;
  if (lastErr) {
    return NextResponse.json({
      success: false,
      providerStatus: lastErr.httpStatus ? `HTTP_${lastErr.httpStatus}` : 'CONFIG_ERROR',
      httpStatus: lastErr.httpStatus,
      code: lastErr.code,
      message: lastErr.message,
      traceId: lastErr.traceId,
      realityContractsCount: 0,
      sampleContracts: [],
      schemaDiagnostic,
      timestamp: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    success: false,
    providerStatus: 'UNAVAILABLE_OR_EMPTY',
    realityContractsCount: 0,
    sampleContracts: [],
    schemaDiagnostic,
    timestamp: new Date().toISOString(),
  });
}

export async function GET(request: NextRequest) {
  return handleRwaCheck(request);
}

export async function POST(request: NextRequest) {
  return handleRwaCheck(request);
}
