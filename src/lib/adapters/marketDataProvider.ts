import { MarketContext } from '@/types/domain';

export interface IMarketDataProvider {
  getWatchlist(): Promise<MarketContext[]>;
  getMarketContext(symbol: string): Promise<MarketContext | null>;
}

export const MOCK_WATCHLIST: Record<string, MarketContext> = {
  rNVDA: {
    symbol: 'rNVDA',
    name: 'NVIDIA Corp (Tokenized)',
    currentPrice: 128.45,
    prevClose: 124.10,
    change24hPct: 3.51,
    bidPrice: 128.38,
    askPrice: 128.52,
    spreadPct: 0.11, // Very low spread = high liquidity
    volume24hUsd: 14200000,
    liquidityDepthIndex: 88,
    sessionStatus: 'OVERNIGHT_ACTIVE',
    isDemoData: true,
  },
  rTSLA: {
    symbol: 'rTSLA',
    name: 'Tesla Inc (Tokenized)',
    currentPrice: 218.90,
    prevClose: 212.00,
    change24hPct: 3.25,
    bidPrice: 216.50,
    askPrice: 221.30,
    spreadPct: 2.19, // High spread = low liquidity noise!
    volume24hUsd: 850000,
    liquidityDepthIndex: 32, // Low depth index
    sessionStatus: 'OVERNIGHT_ACTIVE',
    isDemoData: true,
  },
  rAAPL: {
    symbol: 'rAAPL',
    name: 'Apple Inc (Tokenized)',
    currentPrice: 221.10,
    prevClose: 226.40,
    change24hPct: -2.34,
    bidPrice: 220.95,
    askPrice: 221.25,
    spreadPct: 0.14,
    volume24hUsd: 9800000,
    liquidityDepthIndex: 82,
    sessionStatus: 'OVERNIGHT_ACTIVE',
    isDemoData: true,
  },
  rMSFT: {
    symbol: 'rMSFT',
    name: 'Microsoft Corp (Tokenized)',
    currentPrice: 448.60,
    prevClose: 436.20,
    change24hPct: 2.84,
    bidPrice: 448.20,
    askPrice: 449.00,
    spreadPct: 0.18,
    volume24hUsd: 11500000,
    liquidityDepthIndex: 85,
    sessionStatus: 'OVERNIGHT_ACTIVE',
    isDemoData: true,
  },
  rSPY: {
    symbol: 'rSPY',
    name: 'SPDR S&P 500 ETF (Tokenized)',
    currentPrice: 551.20,
    prevClose: 556.80,
    change24hPct: -1.01,
    bidPrice: 551.05,
    askPrice: 551.35,
    spreadPct: 0.05,
    volume24hUsd: 22000000,
    liquidityDepthIndex: 94,
    sessionStatus: 'OVERNIGHT_ACTIVE',
    isDemoData: true,
  },
  rAMD: {
    symbol: 'rAMD',
    name: 'Advanced Micro Devices (Tokenized)',
    currentPrice: 154.30,
    prevClose: 152.10,
    change24hPct: 1.45,
    bidPrice: 154.00,
    askPrice: 154.60,
    spreadPct: 0.39,
    volume24hUsd: 5400000,
    liquidityDepthIndex: 71,
    sessionStatus: 'OVERNIGHT_ACTIVE',
    isDemoData: true,
  },
  rAMZN: {
    symbol: 'rAMZN',
    name: 'Amazon.com Inc (Tokenized)',
    currentPrice: 178.50,
    prevClose: 177.20,
    change24hPct: 0.73,
    bidPrice: 178.30,
    askPrice: 178.70,
    spreadPct: 0.22,
    volume24hUsd: 8100000,
    liquidityDepthIndex: 79,
    sessionStatus: 'OVERNIGHT_ACTIVE',
    isDemoData: true,
  },
};

export class MockMarketDataProvider implements IMarketDataProvider {
  async getWatchlist(): Promise<MarketContext[]> {
    return Object.values(MOCK_WATCHLIST);
  }

  async getMarketContext(symbol: string): Promise<MarketContext | null> {
    return MOCK_WATCHLIST[symbol] || null;
  }
}
