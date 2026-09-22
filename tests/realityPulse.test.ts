import { evaluateRealityPulse, evaluate24hRealityPulse, createPulseEventItem } from '../src/lib/engine/realityPulseDetector';
import { LocalFileLedgerStore, DatabaseLedgerStore, hasOpenPositionForSymbol } from '../src/lib/store/persistentStore';
import { RealityMarketSnapshot, DecisionReceipt } from '../src/types/domain';
import { MarketContextWithRwaProvenance } from '../src/lib/adapters/bitgetWalletRwaMarketProvider';

describe('Reality Market Pulse Detector & Snapshot Store', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.VERCEL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Snapshot Store Persistence (LocalFileLedgerStore)', () => {
    it('should save and retrieve the latest Reality snapshot for a symbol', async () => {
      const store = new LocalFileLedgerStore();
      const snap1: RealityMarketSnapshot = {
        snapshotId: 'snap-nvda-1',
        ticker: 'NVDA',
        rTokenSymbol: 'RNVDA',
        chain: 'morph',
        contract: '0x1111111111111111111111111111111111111111',
        price: 120.0,
        marketStatus: 'OPEN',
        timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
        dataSource: 'reality',
      };

      const snap2: RealityMarketSnapshot = {
        snapshotId: 'snap-nvda-2',
        ticker: 'NVDA',
        rTokenSymbol: 'RNVDA',
        chain: 'morph',
        contract: '0x1111111111111111111111111111111111111111',
        price: 125.0,
        marketStatus: 'OPEN',
        timestamp: new Date().toISOString(),
        dataSource: 'reality',
      };

      await store.saveRealitySnapshot(snap1);
      await store.saveRealitySnapshot(snap2);

      const latest = await store.getLatestRealitySnapshot('NVDA');
      expect(latest).not.toBeNull();
      expect(latest?.snapshotId).toBe('snap-nvda-2');
      expect(latest?.price).toBe(125.0);
    });
  });

  describe('Pulse Detection Thresholds & Filtering', () => {
    it('should REJECT pulse when price change is less than 1.5%', () => {
      const prevTime = new Date(Date.now() - 45 * 60 * 1000).toISOString();
      const prevSnap: RealityMarketSnapshot = {
        snapshotId: 'snap-1',
        ticker: 'NVDA',
        rTokenSymbol: 'RNVDA',
        chain: 'morph',
        contract: '0x111',
        price: 100.0,
        marketStatus: 'OPEN',
        timestamp: prevTime,
        dataSource: 'reality',
      };

      const currentQuote: MarketContextWithRwaProvenance = {
        symbol: 'RNVDA',
        name: 'NVDA Tokenized Stock',
        currentPrice: 101.0, // 1.0% change < 1.5%
        prevClose: 100.0,
        change24hPct: 1.0,
        bidPrice: 100.9,
        askPrice: 101.1,
        spreadPct: 0.05,
        volume24hUsd: 1000000,
        liquidityDepthIndex: 90,
        sessionStatus: 'OVERNIGHT_ACTIVE',
        isDemoData: false,
        chain: 'morph',
        contractAddress: '0x111',
        externalProvenance: {
          sourceUrl: 'https://bopenapi.bgwapi.io/bgw-pro/market/v3/rwa/stockInfo',
          publisherName: 'Bitget Wallet RWA / Reality Protocol',
          retrievedAtTimestamp: new Date().toISOString(),
          underlyingStockSymbol: 'NVDA',
          dataSource: 'reality',
          contentHash: 'hash1',
          dataMode: 'BITGET_WALLET_RWA_REALITY_READ_ONLY',
        },
      };

      const pulse = evaluateRealityPulse(prevSnap, currentQuote);
      expect(pulse).toBeNull();
    });

    it('should REJECT pulse when observation interval is less than 30 minutes', () => {
      const prevTime = new Date(Date.now() - 15 * 60 * 1000).toISOString(); // Only 15 minutes ago
      const prevSnap: RealityMarketSnapshot = {
        snapshotId: 'snap-2',
        ticker: 'AAPL',
        rTokenSymbol: 'RAAPL',
        chain: 'morph',
        contract: '0x222',
        price: 200.0,
        marketStatus: 'OPEN',
        timestamp: prevTime,
        dataSource: 'reality',
      };

      const currentQuote: MarketContextWithRwaProvenance = {
        symbol: 'RAAPL',
        name: 'AAPL Tokenized Stock',
        currentPrice: 206.0, // +3.0% change, but interval < 30m
        prevClose: 200.0,
        change24hPct: 3.0,
        bidPrice: 205.9,
        askPrice: 206.1,
        spreadPct: 0.05,
        volume24hUsd: 1000000,
        liquidityDepthIndex: 90,
        sessionStatus: 'OVERNIGHT_ACTIVE',
        isDemoData: false,
        chain: 'morph',
        contractAddress: '0x222',
        externalProvenance: {
          sourceUrl: 'https://bopenapi.bgwapi.io/bgw-pro/market/v3/rwa/stockInfo',
          publisherName: 'Bitget Wallet RWA / Reality Protocol',
          retrievedAtTimestamp: new Date().toISOString(),
          underlyingStockSymbol: 'AAPL',
          dataSource: 'reality',
          contentHash: 'hash2',
          dataMode: 'BITGET_WALLET_RWA_REALITY_READ_ONLY',
        },
      };

      const pulse = evaluateRealityPulse(prevSnap, currentQuote);
      expect(pulse).toBeNull();
    });

    it('should TRIGGER pulse when price move >= 1.5% and interval >= 30 minutes', () => {
      const prevTime = new Date(Date.now() - 40 * 60 * 1000).toISOString();
      const prevSnap: RealityMarketSnapshot = {
        snapshotId: 'snap-3',
        ticker: 'TSLA',
        rTokenSymbol: 'RTSLA',
        chain: 'arbitrum',
        contract: '0x333',
        price: 200.0,
        marketStatus: 'OPEN',
        timestamp: prevTime,
        dataSource: 'reality',
      };

      const currentQuote: MarketContextWithRwaProvenance = {
        symbol: 'RTSLA',
        name: 'TSLA Tokenized Stock',
        currentPrice: 204.5, // +2.25% change
        prevClose: 200.0,
        change24hPct: 2.25,
        bidPrice: 204.4,
        askPrice: 204.6,
        spreadPct: 0.05,
        volume24hUsd: 1000000,
        liquidityDepthIndex: 90,
        sessionStatus: 'OVERNIGHT_ACTIVE',
        isDemoData: false,
        chain: 'arbitrum',
        contractAddress: '0x333',
        externalProvenance: {
          sourceUrl: 'https://bopenapi.bgwapi.io/bgw-pro/market/v3/rwa/stockInfo',
          publisherName: 'Bitget Wallet RWA / Reality Protocol',
          retrievedAtTimestamp: new Date().toISOString(),
          underlyingStockSymbol: 'TSLA',
          dataSource: 'reality',
          contentHash: 'hash3',
          dataMode: 'BITGET_WALLET_RWA_REALITY_READ_ONLY',
        },
      };

      const pulse = evaluateRealityPulse(prevSnap, currentQuote);
      expect(pulse).not.toBeNull();
      expect(pulse?.ticker).toBe('TSLA');
      expect(pulse?.direction).toBe('UP');
      expect(pulse?.percentageMovePct).toBe(2.25);
      expect(pulse?.intervalMinutes).toBeGreaterThanOrEqual(39);

      const eventItem = createPulseEventItem(pulse!);
      expect(eventItem.source).toBe('BITGET_REALITY_PULSE');
      expect(eventItem.title).toContain('Reality Market Pulse: TSLA UP 2.25%');
      expect(eventItem.affectedSymbol).toBe('TSLA');
      expect(eventItem.isDemoData).toBe(false);
    });

    it('should correctly classify DOWN direction when price drops >= 1.5%', () => {
      const prevTime = new Date(Date.now() - 35 * 60 * 1000).toISOString();
      const prevSnap: RealityMarketSnapshot = {
        snapshotId: 'snap-4',
        ticker: 'MSFT',
        rTokenSymbol: 'RMSFT',
        chain: 'morph',
        contract: '0x444',
        price: 400.0,
        marketStatus: 'OPEN',
        timestamp: prevTime,
        dataSource: 'reality',
      };

      const currentQuote: MarketContextWithRwaProvenance = {
        symbol: 'RMSFT',
        name: 'MSFT Tokenized Stock',
        currentPrice: 390.0, // -2.5% change
        prevClose: 400.0,
        change24hPct: -2.5,
        bidPrice: 389.9,
        askPrice: 390.1,
        spreadPct: 0.05,
        volume24hUsd: 1000000,
        liquidityDepthIndex: 90,
        sessionStatus: 'OVERNIGHT_ACTIVE',
        isDemoData: false,
        chain: 'morph',
        contractAddress: '0x444',
        externalProvenance: {
          sourceUrl: 'https://bopenapi.bgwapi.io/bgw-pro/market/v3/rwa/stockInfo',
          publisherName: 'Bitget Wallet RWA / Reality Protocol',
          retrievedAtTimestamp: new Date().toISOString(),
          underlyingStockSymbol: 'MSFT',
          dataSource: 'reality',
          contentHash: 'hash4',
          dataMode: 'BITGET_WALLET_RWA_REALITY_READ_ONLY',
        },
      };

      const pulse = evaluateRealityPulse(prevSnap, currentQuote);
      expect(pulse).not.toBeNull();
      expect(pulse?.direction).toBe('DOWN');
      expect(pulse?.percentageMovePct).toBe(-2.5);
    });
  });

  describe('24-Hour Native Change Pulse Detection (evaluate24hRealityPulse)', () => {
    it('should TRIGGER 24h pulse when native price_24h_change_ratio is >= 1.5%', () => {
      const quote: MarketContextWithRwaProvenance = {
        symbol: 'RNVDA',
        name: 'NVDA Tokenized Stock',
        currentPrice: 120.0,
        prevClose: 117.5,
        change24hPct: 2.1276, // 2.13% >= 1.5%
        bidPrice: 119.9,
        askPrice: 120.1,
        spreadPct: 0.05,
        volume24hUsd: 1000000,
        liquidityDepthIndex: 90,
        sessionStatus: 'OVERNIGHT_ACTIVE',
        isDemoData: false,
        chain: 'morph',
        contractAddress: '0x111',
        externalProvenance: {
          sourceUrl: 'https://bopenapi.bgwapi.io/bgw-pro/market/v3/rwa/stockInfo',
          publisherName: 'Bitget Wallet RWA / Reality Protocol',
          retrievedAtTimestamp: new Date().toISOString(),
          underlyingStockSymbol: 'NVDA',
          dataSource: 'reality',
          contentHash: 'hash-24h-1',
          dataMode: 'BITGET_WALLET_RWA_REALITY_READ_ONLY',
          raw24hChangePct: 2.1276,
        },
      };

      const pulse = evaluate24hRealityPulse(quote);
      expect(pulse).not.toBeNull();
      expect(pulse?.ticker).toBe('NVDA');
      expect(pulse?.triggerType).toBe('API_24H_CHANGE');
      expect(pulse?.direction).toBe('UP');
      expect(pulse?.percentageMovePct).toBe(2.13);
      expect(pulse?.raw24hChangePct).toBe(2.1276);

      const eventItem = createPulseEventItem(pulse!);
      expect(eventItem.source).toBe('BITGET_REALITY_24H_PULSE');
      expect(eventItem.title).toContain('Reality 24H Market Pulse: NVDA UP 2.13%');
      expect(eventItem.affectedSymbol).toBe('NVDA');
    });

    it('should TRIGGER 24h pulse for DOWN direction when native change is <= -1.5%', () => {
      const quote: MarketContextWithRwaProvenance = {
        symbol: 'RAAPL',
        name: 'AAPL Tokenized Stock',
        currentPrice: 200.0,
        prevClose: 204.0,
        change24hPct: -1.96, // -1.96% <= -1.5%
        bidPrice: 199.9,
        askPrice: 200.1,
        spreadPct: 0.05,
        volume24hUsd: 1000000,
        liquidityDepthIndex: 90,
        sessionStatus: 'OVERNIGHT_ACTIVE',
        isDemoData: false,
        chain: 'arbitrum',
        contractAddress: '0x222',
        externalProvenance: {
          sourceUrl: 'https://bopenapi.bgwapi.io/bgw-pro/market/v3/rwa/stockInfo',
          publisherName: 'Bitget Wallet RWA / Reality Protocol',
          retrievedAtTimestamp: new Date().toISOString(),
          underlyingStockSymbol: 'AAPL',
          dataSource: 'reality',
          contentHash: 'hash-24h-2',
          dataMode: 'BITGET_WALLET_RWA_REALITY_READ_ONLY',
          raw24hChangePct: -1.96,
        },
      };

      const pulse = evaluate24hRealityPulse(quote);
      expect(pulse).not.toBeNull();
      expect(pulse?.ticker).toBe('AAPL');
      expect(pulse?.triggerType).toBe('API_24H_CHANGE');
      expect(pulse?.direction).toBe('DOWN');
      expect(pulse?.percentageMovePct).toBe(-1.96);
    });

    it('should REJECT 24h pulse when native change is less than 1.5%', () => {
      const quote: MarketContextWithRwaProvenance = {
        symbol: 'RMSFT',
        name: 'MSFT Tokenized Stock',
        currentPrice: 400.0,
        prevClose: 396.0,
        change24hPct: 1.01, // 1.01% < 1.5%
        bidPrice: 399.9,
        askPrice: 400.1,
        spreadPct: 0.05,
        volume24hUsd: 1000000,
        liquidityDepthIndex: 90,
        sessionStatus: 'OVERNIGHT_ACTIVE',
        isDemoData: false,
        chain: 'morph',
        contractAddress: '0x333',
        externalProvenance: {
          sourceUrl: 'https://bopenapi.bgwapi.io/bgw-pro/market/v3/rwa/stockInfo',
          publisherName: 'Bitget Wallet RWA / Reality Protocol',
          retrievedAtTimestamp: new Date().toISOString(),
          underlyingStockSymbol: 'MSFT',
          dataSource: 'reality',
          contentHash: 'hash-24h-3',
          dataMode: 'BITGET_WALLET_RWA_REALITY_READ_ONLY',
          raw24hChangePct: 1.01,
        },
      };

      const pulse = evaluate24hRealityPulse(quote);
      expect(pulse).toBeNull();
    });

    it('should REJECT 24h pulse when change24hPct or raw24hChangePct is missing or invalid', () => {
      const quoteNoField: MarketContextWithRwaProvenance = {
        symbol: 'RSPY',
        name: 'SPY Tokenized Stock',
        currentPrice: 500.0,
        prevClose: 500.0,
        bidPrice: 499.9,
        askPrice: 500.1,
        spreadPct: 0.05,
        volume24hUsd: 1000000,
        liquidityDepthIndex: 90,
        sessionStatus: 'OVERNIGHT_ACTIVE',
        isDemoData: false,
        chain: 'morph',
        contractAddress: '0x444',
        externalProvenance: {
          sourceUrl: 'https://bopenapi.bgwapi.io/bgw-pro/market/v3/rwa/stockInfo',
          publisherName: 'Bitget Wallet RWA / Reality Protocol',
          retrievedAtTimestamp: new Date().toISOString(),
          underlyingStockSymbol: 'SPY',
          dataSource: 'reality',
          contentHash: 'hash-24h-4',
          dataMode: 'BITGET_WALLET_RWA_REALITY_READ_ONLY',
        },
      };

      expect(evaluate24hRealityPulse(quoteNoField)).toBeNull();

      const quoteNaN: MarketContextWithRwaProvenance = {
        ...quoteNoField,
        change24hPct: NaN,
        externalProvenance: {
          ...quoteNoField.externalProvenance,
          raw24hChangePct: NaN,
        },
      };

      expect(evaluate24hRealityPulse(quoteNaN)).toBeNull();
    });

    it('should REJECT 24h pulse when market status is CLOSED', () => {
      const quoteClosed: MarketContextWithRwaProvenance = {
        symbol: 'RQQQ',
        name: 'QQQ Tokenized Stock',
        currentPrice: 450.0,
        prevClose: 440.0,
        change24hPct: 2.27,
        bidPrice: 449.9,
        askPrice: 450.1,
        spreadPct: 0.05,
        volume24hUsd: 1000000,
        liquidityDepthIndex: 90,
        sessionStatus: 'CLOSED', // Market is CLOSED
        isDemoData: false,
        chain: 'morph',
        contractAddress: '0x555',
        externalProvenance: {
          sourceUrl: 'https://bopenapi.bgwapi.io/bgw-pro/market/v3/rwa/stockInfo',
          publisherName: 'Bitget Wallet RWA / Reality Protocol',
          retrievedAtTimestamp: new Date().toISOString(),
          underlyingStockSymbol: 'QQQ',
          dataSource: 'reality',
          contentHash: 'hash-24h-5',
          dataMode: 'BITGET_WALLET_RWA_REALITY_READ_ONLY',
          raw24hChangePct: 2.27,
        },
      };

      expect(evaluate24hRealityPulse(quoteClosed)).toBeNull();
    });
  });


  describe('Open Position Guard & Fail-Closed Logic for Pulses', () => {
    it('should block paper trade generation when an open position exists for pulse ticker', () => {
      const openReceipts: Partial<DecisionReceipt>[] = [
        {
          receiptId: 'rcpt-open-tsla',
          status: 'APPROVED_EXECUTED',
          paperOrder: {
            orderId: 'ord-tsla',
            symbol: 'RTSLA',
            side: 'BUY',
            status: 'SIMULATED_FILLED',
            qty: 5,
            fillPrice: 200,
            executedAt: new Date().toISOString(),
          },
        },
      ];

      expect(hasOpenPositionForSymbol(openReceipts as DecisionReceipt[], 'TSLA')).toBe(true);
    });
  });

  describe('Database Self-Healing & Auto-Migration (DatabaseLedgerStore)', () => {
    it('should safely execute getLatestRealitySnapshot without throwing unhandled missing table errors', async () => {
      const store = new DatabaseLedgerStore('postgresql://invalid_user:invalid_pass@127.0.0.1:54321/test_db');
      // getLatestRealitySnapshot must self-heal table schema before querying
      const snapshot = await store.getLatestRealitySnapshot('NVDA');
      expect(snapshot).toBeNull();
    });
  });

  describe('No-Pulse Cycle Audit & Snapshot Persistence', () => {
    it('should verify a valid no-pulse cycle still saves snapshots and creates one SAFE_SKIP audit', async () => {
      const { GET: cronHandler } = await import('../src/app/api/cron/paper-cycle/route');
      const { NextRequest } = await import('next/server');
      const store = new LocalFileLedgerStore();

      const snap: RealityMarketSnapshot = {
        snapshotId: `snap-nvda-nopulse-${Date.now()}`,
        ticker: 'NVDA',
        rTokenSymbol: 'RNVDA',
        chain: 'morph',
        contract: '0x1111111111111111111111111111111111111111',
        price: 120.0,
        marketStatus: 'OPEN',
        timestamp: new Date().toISOString(),
        dataSource: 'reality',
      };

      await store.saveRealitySnapshot(snap);
      const savedSnap = await store.getLatestRealitySnapshot('NVDA');
      expect(savedSnap).not.toBeNull();
      expect(savedSnap?.ticker).toBe('NVDA');

      process.env.CRON_SECRET = 'test-cron-secret';
      delete process.env.VERCEL;

      const req = new NextRequest('http://localhost:3000/api/cron/paper-cycle', {
        method: 'GET',
        headers: {
          authorization: 'Bearer test-cron-secret',
        },
      });

      const response = await cronHandler(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.auditId).toBeDefined();
      expect(data.skipped).toBe(true);
      expect(data.pipelineStatus).toBe('SAFE_SKIP');
    }, 15000);
  });
});
