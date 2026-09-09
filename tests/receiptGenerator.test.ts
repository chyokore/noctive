import { describe, it, expect } from 'vitest';
import { ReceiptGenerator } from '../src/lib/engine/receiptGenerator';
import { EventItem, MarketContext, AgentDecision, RiskEvaluationResult, PaperOrder } from '../src/lib/types/domain';

describe('ReceiptGenerator', () => {
  const receiptGenerator = new ReceiptGenerator();

  const mockEvent: EventItem = {
    id: 'evt-001',
    title: 'NVIDIA Receives EU Clearance',
    source: 'Bloomberg Wire',
    timestamp: new Date().toISOString(),
    category: 'POLICY',
    affectedSymbol: 'rNVDA',
    impactScore: 8.5,
    rawSnippet: 'Export clearance approved.',
    isDemoData: true,
  };

  const mockMarket: MarketContext = {
    symbol: 'rNVDA',
    name: 'NVIDIA Corp',
    currentPrice: 128.45,
    prevClose: 124.10,
    change24hPct: 3.51,
    bidPrice: 128.38,
    askPrice: 128.52,
    spreadPct: 0.11,
    volume24hUsd: 14000000,
    liquidityDepthIndex: 88,
    sessionStatus: 'OVERNIGHT_ACTIVE',
    isDemoData: true,
  };

  const mockDecision: AgentDecision = {
    id: 'dec-001',
    eventId: 'evt-001',
    targetSymbol: 'rNVDA',
    action: 'ENTER_LONG',
    confidence: 88,
    summary: 'Approved Long',
    reasoning: ['Solid catalyst'],
    priceDiscoveryProbability: 90,
    calculatedPositionSizeUsd: 8500,
    suggestedStopLossPct: 2.5,
    suggestedTakeProfitPct: 5.0,
    timestamp: new Date().toISOString(),
  };

  const mockRiskApproved: RiskEvaluationResult = {
    isApproved: true,
    overallStatus: 'APPROVED',
    rules: [],
    blockingReasons: [],
    timestamp: new Date().toISOString(),
  };

  const mockPaperOrder: PaperOrder = {
    orderId: 'ord-001',
    decisionId: 'dec-001',
    symbol: 'rNVDA',
    side: 'BUY',
    quantityTokens: 66.1736,
    entryPrice: 128.45,
    notionalValueUsd: 8500,
    stopLossPrice: 125.24,
    takeProfitPrice: 134.87,
    status: 'SIMULATED_FILLED',
    timestamp: new Date().toISOString(),
  };

  it('should generate an immutable receipt with valid cryptographic hash format for approved order', () => {
    const receipt = receiptGenerator.generateReceipt(
      mockEvent,
      mockMarket,
      mockDecision,
      mockRiskApproved,
      mockPaperOrder
    );

    expect(receipt.receiptId).toBeDefined();
    expect(receipt.receiptId.startsWith('rcpt-')).toBe(true);
    expect(receipt.hash).toBeDefined();
    expect(receipt.hash.startsWith('0x')).toBe(true);
    expect(receipt.status).toBe('APPROVED_EXECUTED');
    expect(receipt.event.affectedSymbol).toBe('rNVDA');
    expect(receipt.paperOrder?.status).toBe('SIMULATED_FILLED');
  });

  it('should generate a NOISE_REJECTED_STAND_DOWN receipt when decision is STAND_DOWN', () => {
    const standDownDecision: AgentDecision = {
      ...mockDecision,
      action: 'STAND_DOWN',
    };
    const mockRiskBlocked: RiskEvaluationResult = {
      isApproved: false,
      overallStatus: 'BLOCKED',
      rules: [],
      blockingReasons: ['Agent recommended standing down'],
      timestamp: new Date().toISOString(),
    };

    const receipt = receiptGenerator.generateReceipt(
      mockEvent,
      mockMarket,
      standDownDecision,
      mockRiskBlocked
    );

    expect(receipt.status).toBe('NOISE_REJECTED_STAND_DOWN');
    expect(receipt.standDownReasons).toBeDefined();
  });
});
