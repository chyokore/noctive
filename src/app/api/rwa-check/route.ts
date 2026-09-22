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

  const rwaProvider = new BitgetWalletRwaMarketProvider();
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

    return NextResponse.json({
      success: true,
      providerStatus: 'HEALTHY',
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
