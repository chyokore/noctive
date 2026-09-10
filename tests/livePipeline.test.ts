import { describe, it, expect } from 'vitest';
import { LiveEventProvider } from '../src/lib/adapters/liveEventProvider';
import {
  LiveMarketDataProvider,
  RTOKEN_EQUITY_MAPPINGS,
  EXCHANGE_SYMBOL_LOOKUP,
} from '../src/lib/adapters/liveMarketDataProvider';
import { StooqMarketDataProvider, STOCK_REFERENCE_MAPPINGS, STOCK_SYMBOL_LOOKUP } from '../src/lib/adapters/stooqMarketDataProvider';
import { ReceiptGenerator } from '../src/lib/engine/receiptGenerator';
import { EventItem, MarketContext, AgentDecision, RiskEvaluationResult } from '../src/types/domain';

describe('Live External Competition Data Pipeline & Symbol Resolution', () => {
  const receiptGenerator = new ReceiptGenerator();

  it('should maintain exact rToken conceptual symbol to Bitget candidate exchange market symbol mappings', () => {
    expect(RTOKEN_EQUITY_MAPPINGS.rNVDA.exchangeMarketSymbol).toBe('NVDAUSDT');
    expect(RTOKEN_EQUITY_MAPPINGS.rAAPL.exchangeMarketSymbol).toBe('AAPLUSDT');
    expect(RTOKEN_EQUITY_MAPPINGS.rMSFT.exchangeMarketSymbol).toBe('MSFTUSDT');
    expect(RTOKEN_EQUITY_MAPPINGS.rTSLA.exchangeMarketSymbol).toBe('TSLAUSDT');
    expect(RTOKEN_EQUITY_MAPPINGS.rSPY.exchangeMarketSymbol).toBe('SPYUSDT');
    expect(RTOKEN_EQUITY_MAPPINGS.rQQQ.exchangeMarketSymbol).toBe('QQQUSDT');

    // Inverse lookup checks
    expect(EXCHANGE_SYMBOL_LOOKUP['NVDAUSDT'].rToken).toBe('rNVDA');
    expect(EXCHANGE_SYMBOL_LOOKUP['AAPLUSDT'].rToken).toBe('rAAPL');
    expect(EXCHANGE_SYMBOL_LOOKUP['MSFTUSDT'].rToken).toBe('rMSFT');
    expect(EXCHANGE_SYMBOL_LOOKUP['TSLAUSDT'].rToken).toBe('rTSLA');
    expect(EXCHANGE_SYMBOL_LOOKUP['SPYUSDT'].rToken).toBe('rSPY');
    expect(EXCHANGE_SYMBOL_LOOKUP['QQQUSDT'].rToken).toBe('rQQQ');
  });

  it('should maintain exact Stooq underlying stock symbol mappings', () => {
    expect(STOCK_REFERENCE_MAPPINGS.rNVDA.underlyingStockSymbol).toBe('NVDA.US');
    expect(STOCK_REFERENCE_MAPPINGS.rAAPL.underlyingStockSymbol).toBe('AAPL.US');
    expect(STOCK_REFERENCE_MAPPINGS.rMSFT.underlyingStockSymbol).toBe('MSFT.US');
    expect(STOCK_REFERENCE_MAPPINGS.rTSLA.underlyingStockSymbol).toBe('TSLA.US');
    expect(STOCK_REFERENCE_MAPPINGS.rSPY.underlyingStockSymbol).toBe('SPY.US');
    expect(STOCK_REFERENCE_MAPPINGS.rQQQ.underlyingStockSymbol).toBe('QQQ.US');

    expect(STOCK_SYMBOL_LOOKUP['NVDA.US'].rToken).toBe('rNVDA');
    expect(STOCK_SYMBOL_LOOKUP['AAPL.US'].rToken).toBe('rAAPL');
  });

  it('StooqMarketDataProvider should return underlying stock reference items or fail-closed gracefully', async () => {
    const stooqProvider = new StooqMarketDataProvider({ timeoutMs: 3000 });
    const watchlist = await stooqProvider.getWatchlist();

    if (watchlist.length > 0) {
      watchlist.forEach((item: any) => {
        expect(item.isDemoData).toBe(false);
        expect(item.symbol).toBeDefined();
        expect(supportedEquitiesOnly(item.symbol)).toBe(true);
        expect(item.externalProvenance).toBeDefined();
        expect(item.externalProvenance.dataMode).toBe('LIVE_EXTERNAL_UNDERLYING_REFERENCE');
        expect(item.externalProvenance.underlyingStockSymbol).toBeDefined();
        expect(item.externalProvenance.rawPrice).toBeGreaterThan(0);
      });
    } else {
      expect(watchlist).toEqual([]);
    }
  });

  it('LiveMarketDataProvider should return items marked with isDemoData: false or handle offline fail-closed', async () => {
    const marketProvider = new LiveMarketDataProvider({ timeoutMs: 3000 });
    const watchlist = await marketProvider.getWatchlist();

    if (watchlist.length > 0) {
      watchlist.forEach((item) => {
        expect(item.isDemoData).toBe(false);
        expect(item.symbol).toBeDefined();
        expect(supportedEquitiesOnly(item.symbol)).toBe(true);
      });
    } else {
      expect(watchlist).toEqual([]);
    }
  });

  it('LiveEventProvider should return items marked with isDemoData: false and externalProvenance or handle fail-closed', async () => {
    const eventProvider = new LiveEventProvider({ timeoutMs: 3000 });
    const events = await eventProvider.getLatestEvents();

    if (events.length > 0) {
      events.forEach((evt) => {
        expect(evt.isDemoData).toBe(false);
        expect(evt.title).toBeDefined();
        expect(supportedEquitiesOnly(evt.affectedSymbol)).toBe(true);
        expect((evt as any).externalProvenance).toBeDefined();
        expect((evt as any).externalProvenance.dataMode).toBe('LIVE_EXTERNAL');
        expect((evt as any).externalProvenance.sourceUrl).toBeDefined();
      });
    } else {
      expect(events).toEqual([]);
    }
  });

  it('ReceiptGenerator should set dataMode: LIVE_EXTERNAL_UNDERLYING_REFERENCE for Stooq reference prices', () => {
    const liveEvent: EventItem = {
      id: 'live-evt-stooq-001',
      title: 'SEC EDGAR Official 8-K Regulatory Filing for NVIDIA Corp',
      source: 'SEC EDGAR (sec.gov)',
      timestamp: new Date().toISOString(),
      category: 'LEGAL',
      affectedSymbol: 'rNVDA',
      impactScore: -6.5,
      rawSnippet: 'Official regulatory disclosure filed by NVIDIA Corp.',
      isDemoData: false,
    };

    const stooqMarket: MarketContext = {
      symbol: 'rNVDA',
      name: 'NVIDIA Corp (Underlying Reference)',
      currentPrice: 128.45,
      prevClose: 124.10,
      change24hPct: 3.51,
      bidPrice: 128.38,
      askPrice: 128.52,
      spreadPct: 0.05,
      volume24hUsd: 50000000,
      liquidityDepthIndex: 90,
      sessionStatus: 'OVERNIGHT_ACTIVE',
      isDemoData: false,
      externalProvenance: {
        sourceUrl: 'https://stooq.com/q/l/?s=nvda.us',
        publisherName: 'Stooq Public Stock Reference',
        retrievedAtTimestamp: new Date().toISOString(),
        dataAsOfTimestamp: '2026-09-10T22:00:00Z',
        underlyingStockSymbol: 'NVDA.US',
        rawPrice: 128.45,
        contentHash: 'abc123hash',
        dataMode: 'LIVE_EXTERNAL_UNDERLYING_REFERENCE',
      },
    } as any;

    const decision: AgentDecision = {
      id: 'dec-stooq-001',
      eventId: 'live-evt-stooq-001',
      targetSymbol: 'rNVDA',
      action: 'STAND_DOWN',
      confidence: 90,
      summary: 'Standing down due to legal uncertainty',
      reasoning: ['Legal regulatory risk high'],
      evidenceReferences: ['SEC Form 8-K'],
      invalidationCondition: 'Clearance published',
      priceDiscoveryProbability: 80,
      calculatedPositionSizeUsd: 0,
      suggestedStopLossPct: 2.0,
      suggestedTakeProfitPct: 5.0,
      timestamp: new Date().toISOString(),
    };

    const risk: RiskEvaluationResult = {
      isApproved: false,
      overallStatus: 'BLOCKED',
      rules: [],
      blockingReasons: ['Agent decision stand down'],
      timestamp: new Date().toISOString(),
    };

    const receipt = receiptGenerator.generateReceipt(liveEvent, stooqMarket, decision, risk);

    expect(receipt.isDemoData).toBe(false);
    expect(receipt.provenance.isDemoData).toBe(false);
    expect(receipt.provenance.dataMode).toBe('LIVE_EXTERNAL_UNDERLYING_REFERENCE');
    expect(receipt.provenance.marketSource).toBe('Stooq Public Stock Reference');
    expect(receipt.provenance.externalProvenance?.underlyingStockSymbol).toBe('NVDA.US');
  });

  it('ReceiptGenerator should set isDemoData: false and dataMode: LIVE_EXTERNAL for live external equity inputs', () => {
    const liveEvent: EventItem = {
      id: 'live-evt-001',
      title: 'SEC EDGAR Official 8-K Regulatory Filing for NVIDIA Corp',
      source: 'SEC EDGAR (sec.gov)',
      timestamp: new Date().toISOString(),
      category: 'LEGAL',
      affectedSymbol: 'rNVDA',
      impactScore: -6.5,
      rawSnippet: 'Official regulatory disclosure filed by NVIDIA Corp.',
      isDemoData: false,
    };

    const liveMarket: MarketContext = {
      symbol: 'rNVDA',
      name: 'NVIDIA Corp (Tokenized Equity)',
      currentPrice: 128.45,
      prevClose: 124.10,
      change24hPct: 3.51,
      bidPrice: 128.38,
      askPrice: 128.52,
      spreadPct: 0.11,
      volume24hUsd: 14000000,
      liquidityDepthIndex: 88,
      sessionStatus: 'OVERNIGHT_ACTIVE',
      isDemoData: false,
    };

    const decision: AgentDecision = {
      id: 'dec-live-001',
      eventId: 'live-evt-001',
      targetSymbol: 'rNVDA',
      action: 'STAND_DOWN',
      confidence: 90,
      summary: 'Standing down due to legal uncertainty',
      reasoning: ['Legal regulatory risk high'],
      evidenceReferences: ['SEC Form 8-K'],
      invalidationCondition: 'Clearance published',
      priceDiscoveryProbability: 80,
      calculatedPositionSizeUsd: 0,
      suggestedStopLossPct: 2.0,
      suggestedTakeProfitPct: 5.0,
      timestamp: new Date().toISOString(),
    };

    const risk: RiskEvaluationResult = {
      isApproved: false,
      overallStatus: 'BLOCKED',
      rules: [],
      blockingReasons: ['Agent decision stand down'],
      timestamp: new Date().toISOString(),
    };

    const receipt = receiptGenerator.generateReceipt(liveEvent, liveMarket, decision, risk);

    expect(receipt.isDemoData).toBe(false);
    expect(receipt.provenance.isDemoData).toBe(false);
    expect(receipt.provenance.dataMode).toBe('LIVE_EXTERNAL');
  });

  it('ReceiptGenerator should preserve isDemoData: true for pre-seeded demo inputs', () => {
    const demoEvent: EventItem = {
      id: 'evt-demo-001',
      title: 'Demo Event',
      source: 'Mock Wire',
      timestamp: new Date().toISOString(),
      category: 'NOISE',
      affectedSymbol: 'rTSLA',
      impactScore: 1.0,
      rawSnippet: 'Demo snippet',
      isDemoData: true,
    };

    const demoMarket: MarketContext = {
      symbol: 'rTSLA',
      name: 'Tesla Inc',
      currentPrice: 200,
      prevClose: 200,
      change24hPct: 0,
      bidPrice: 200,
      askPrice: 200,
      spreadPct: 0,
      volume24hUsd: 1000,
      liquidityDepthIndex: 50,
      sessionStatus: 'OVERNIGHT_ACTIVE',
      isDemoData: true,
    };

    const decision: AgentDecision = {
      id: 'dec-demo-001',
      eventId: 'evt-demo-001',
      targetSymbol: 'rTSLA',
      action: 'STAND_DOWN',
      confidence: 50,
      summary: 'Noise',
      reasoning: ['Noise'],
      evidenceReferences: [],
      invalidationCondition: 'None',
      priceDiscoveryProbability: 10,
      calculatedPositionSizeUsd: 0,
      suggestedStopLossPct: 0,
      suggestedTakeProfitPct: 0,
      timestamp: new Date().toISOString(),
    };

    const risk: RiskEvaluationResult = {
      isApproved: false,
      overallStatus: 'BLOCKED',
      rules: [],
      blockingReasons: ['Noise'],
      timestamp: new Date().toISOString(),
    };

    const receipt = receiptGenerator.generateReceipt(demoEvent, demoMarket, decision, risk);

    expect(receipt.isDemoData).toBe(true);
    expect(receipt.provenance.isDemoData).toBe(true);
    expect(receipt.provenance.dataMode).not.toBe('LIVE_EXTERNAL');
  });

  function supportedEquitiesOnly(symbol: string): boolean {
    return ['rNVDA', 'rAAPL', 'rMSFT', 'rTSLA', 'rSPY', 'rQQQ'].includes(symbol);
  }
});

