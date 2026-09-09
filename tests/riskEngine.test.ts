import { describe, it, expect } from 'vitest';
import { RiskEngine } from '../src/lib/engine/riskEngine';
import { AgentDecision, MarketContext, RiskBudgetConfig } from '../src/lib/types/domain';

describe('RiskEngine', () => {
  const riskEngine = new RiskEngine();

  const mockBaseConfig: RiskBudgetConfig = {
    maxPositionSizeUsd: 10000,
    maxConcurrentPositions: 3,
    minConfidenceThresholdPct: 75,
    maxSpreadPct: 0.8,
    minLiquidityScore: 60,
    dailyLossLimitUsd: 2500,
    currentDailyLossUsd: 200,
    currentActivePositions: 1,
    cooldownMinutes: 5,
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
    liquidityDepthIndex: 85,
    sessionStatus: 'OVERNIGHT_ACTIVE',
    isDemoData: true,
  };

  const mockApprovedDecision: AgentDecision = {
    id: 'dec-test-01',
    eventId: 'evt-test-01',
    targetSymbol: 'rNVDA',
    action: 'ENTER_LONG',
    confidence: 85,
    summary: 'Approved long proposed',
    reasoning: ['Strong earnings beat', 'High liquidity'],
    priceDiscoveryProbability: 88,
    calculatedPositionSizeUsd: 8500,
    suggestedStopLossPct: 2.5,
    suggestedTakeProfitPct: 5.0,
    timestamp: new Date().toISOString(),
  };

  it('should APPROVE decision when all 8 risk gate checks pass', () => {
    const result = riskEngine.evaluateRisk(mockApprovedDecision, mockMarket, mockBaseConfig);
    expect(result.isApproved).toBe(true);
    expect(result.overallStatus).toBe('APPROVED');
    expect(result.blockingReasons.length).toBe(0);
    expect(result.rules.length).toBe(8);
    expect(result.rules.every((r) => r.passed)).toBe(true);
  });

  it('should BLOCK decision when position size exceeds max limits', () => {
    const oversizedDecision: AgentDecision = {
      ...mockApprovedDecision,
      calculatedPositionSizeUsd: 15000, // Exceeds $10,000 max
    };
    const result = riskEngine.evaluateRisk(oversizedDecision, mockMarket, mockBaseConfig);
    expect(result.isApproved).toBe(false);
    expect(result.overallStatus).toBe('BLOCKED');
    expect(result.blockingReasons[0]).toContain('Position size exceeds maximum limit');
  });

  it('should BLOCK decision when max concurrent active positions limit is reached', () => {
    const maxedConfig: RiskBudgetConfig = {
      ...mockBaseConfig,
      currentActivePositions: 3, // Already at limit of 3
    };
    const result = riskEngine.evaluateRisk(mockApprovedDecision, mockMarket, maxedConfig);
    expect(result.isApproved).toBe(false);
    expect(result.overallStatus).toBe('BLOCKED');
    expect(result.blockingReasons[0]).toContain('Max concurrent positions limit reached');
  });

  it('should BLOCK decision when agent confidence is below minimum threshold', () => {
    const lowConfDecision: AgentDecision = {
      ...mockApprovedDecision,
      confidence: 65, // Below 75% threshold
    };
    const result = riskEngine.evaluateRisk(lowConfDecision, mockMarket, mockBaseConfig);
    expect(result.isApproved).toBe(false);
    expect(result.blockingReasons[0]).toContain('Confidence score (65%) is below minimum threshold');
  });

  it('should BLOCK decision when market bid-ask spread exceeds volatility guard limit', () => {
    const wideSpreadMarket: MarketContext = {
      ...mockMarket,
      spreadPct: 1.45, // Exceeds 0.8% limit
    };
    const result = riskEngine.evaluateRisk(mockApprovedDecision, wideSpreadMarket, mockBaseConfig);
    expect(result.isApproved).toBe(false);
    expect(result.blockingReasons[0]).toContain('Liquidity guard triggered');
  });

  it('should BLOCK decision when daily loss limit is reached', () => {
    const hitDailyLossConfig: RiskBudgetConfig = {
      ...mockBaseConfig,
      currentDailyLossUsd: 2600, // Exceeds $2,500 daily limit
    };
    const result = riskEngine.evaluateRisk(mockApprovedDecision, mockMarket, hitDailyLossConfig);
    expect(result.isApproved).toBe(false);
    expect(result.blockingReasons[0]).toContain('Daily loss limit reached');
  });
});
