import { describe, it, expect } from 'vitest';
import { LiveEventProvider } from '../src/lib/adapters/liveEventProvider';
import { LiveMarketDataProvider } from '../src/lib/adapters/liveMarketDataProvider';
import { ReceiptGenerator } from '../src/lib/engine/receiptGenerator';
import { EventItem, MarketContext, AgentDecision, RiskEvaluationResult } from '../src/types/domain';

describe('Live External Competition Data Pipeline', () => {
  const receiptGenerator = new ReceiptGenerator();

  it('LiveMarketDataProvider should return items marked with isDemoData: false or handle offline fail-closed', async () => {
    const marketProvider = new LiveMarketDataProvider({ timeoutMs: 3000 });
    const watchlist = await marketProvider.getWatchlist();

    if (watchlist.length > 0) {
      watchlist.forEach((item) => {
        expect(item.isDemoData).toBe(false);
        expect(item.symbol).toBeDefined();
        expect(item.currentPrice).toBeGreaterThan(0);
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
        expect((evt as any).externalProvenance).toBeDefined();
        expect((evt as any).externalProvenance.dataMode).toBe('LIVE_EXTERNAL');
        expect((evt as any).externalProvenance.sourceUrl).toBeDefined();
      });
    } else {
      expect(events).toEqual([]);
    }
  });

  it('ReceiptGenerator should set isDemoData: false and dataMode: LIVE_EXTERNAL for live external inputs', () => {
    const liveEvent: EventItem = {
      id: 'live-evt-001',
      title: 'SEC EDGAR Official 8-K Regulatory Filing',
      source: 'SEC EDGAR (sec.gov)',
      timestamp: new Date().toISOString(),
      category: 'LEGAL',
      affectedSymbol: 'rBGB',
      impactScore: -6.5,
      rawSnippet: 'Official regulatory disclosure filed.',
      isDemoData: false,
    };

    const liveMarket: MarketContext = {
      symbol: 'rBGB',
      name: 'Bitget Token (Tokenized)',
      currentPrice: 1.15,
      prevClose: 1.18,
      change24hPct: -2.54,
      bidPrice: 1.149,
      askPrice: 1.151,
      spreadPct: 0.17,
      volume24hUsd: 12000000,
      liquidityDepthIndex: 85,
      sessionStatus: 'OVERNIGHT_ACTIVE',
      isDemoData: false,
    };

    const decision: AgentDecision = {
      id: 'dec-live-001',
      eventId: 'live-evt-001',
      targetSymbol: 'rBGB',
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
});
