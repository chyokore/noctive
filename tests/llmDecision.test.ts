import { describe, it, expect } from 'vitest';
import { AgentEngine } from '../src/lib/engine/agentEngine';
import { RiskEngine } from '../src/lib/engine/riskEngine';
import { ReceiptGenerator } from '../src/lib/engine/receiptGenerator';
import { PaperExchange } from '../src/lib/engine/paperExchange';
import { ILLMDecisionProvider, ILLMDecisionInput } from '../src/lib/adapters/llmDecisionProvider';
import { EventItem, MarketContext, RiskBudgetConfig, LLMDecisionProposal } from '../src/lib/types/domain';

// Mock Provider that returns Malformed / Invalid LLM output
class MalformedLLMProvider implements ILLMDecisionProvider {
  public name = 'Malformed Mock Provider';
  public getMode(): 'MOCK_DEMO' {
    return 'MOCK_DEMO';
  }
  public async evaluate(): Promise<LLMDecisionProposal> {
    throw new Error('JSON syntax error: Unexpected token < in JSON at position 0');
  }
}

// Mock Provider that proposes an Unapproved Symbol outside the watchlist
class UnapprovedSymbolLLMProvider implements ILLMDecisionProvider {
  public name = 'Unapproved Symbol Provider';
  public getMode(): 'MOCK_DEMO' {
    return 'MOCK_DEMO';
  }
  public async evaluate(input: ILLMDecisionInput): Promise<LLMDecisionProposal> {
    return {
      action: 'ENTER_LONG',
      symbol: 'UNAPPROVED_MEME_COIN', // Not in approved watchlist
      confidence: 90,
      rationale: ['Speculative spike'],
      evidenceReferences: ['Social media post'],
      invalidationCondition: 'Reversal',
      proposedStopLossPct: 2.0,
      proposedTakeProfitPct: 5.0,
      providerMode: 'MOCK_DEMO',
    };
  }
}

// Mock Provider that proposes a trade WITHOUT required evidence references
class MissingEvidenceLLMProvider implements ILLMDecisionProvider {
  public name = 'Missing Evidence Provider';
  public getMode(): 'MOCK_DEMO' {
    return 'MOCK_DEMO';
  }
  public async evaluate(): Promise<LLMDecisionProposal> {
    return {
      action: 'ENTER_LONG',
      symbol: 'rNVDA',
      confidence: 85,
      rationale: ['Trade recommendation'],
      evidenceReferences: [], // Missing evidence!
      invalidationCondition: 'Market drop',
      proposedStopLossPct: 2.0,
      proposedTakeProfitPct: 5.0,
      providerMode: 'MOCK_DEMO',
    };
  }
}

describe('LLM Decision Architecture & Safety Controls', () => {
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

  const mockEvent: EventItem = {
    id: 'evt-test-01',
    title: 'NVIDIA EU Export Clearance',
    source: 'Bloomberg Wire',
    timestamp: new Date().toISOString(),
    category: 'POLICY',
    affectedSymbol: 'rNVDA',
    impactScore: 8.5,
    rawSnippet: 'Approved by EU regulators',
    isDemoData: true,
  };

  const mockConfig: RiskBudgetConfig = {
    maxPositionSizeUsd: 10000,
    maxConcurrentPositions: 3,
    minConfidenceThresholdPct: 75,
    maxSpreadPct: 0.8,
    minLiquidityScore: 60,
    dailyLossLimitUsd: 2500,
    currentDailyLossUsd: 100,
    currentActivePositions: 1,
    cooldownMinutes: 5,
  };

  it('should safely fall back to STAND_DOWN when LLM output is malformed or throws error', async () => {
    const agent = new AgentEngine(new MalformedLLMProvider());
    const decision = await agent.evaluateEventAsync(mockEvent, mockMarket, [mockMarket], mockConfig);

    expect(decision.action).toBe('STAND_DOWN');
    expect(decision.summary).toContain('Stand Down');
  });

  it('should safely fall back to STAND_DOWN when LLM proposes an unapproved symbol', async () => {
    const qwenSim = new UnapprovedSymbolLLMProvider();
    const proposal = await qwenSim.evaluate({
      event: mockEvent,
      marketContext: mockMarket,
      watchlist: [mockMarket],
      riskBudget: mockConfig,
    });

    const isApprovedSymbol = [mockMarket.symbol].includes(proposal.symbol);
    expect(isApprovedSymbol).toBe(false);
  });

  it('should safely fall back to STAND_DOWN when LLM trade proposal lacks evidence references', async () => {
    const missingEv = new MissingEvidenceLLMProvider();
    const proposal = await missingEv.evaluate({
      event: mockEvent,
      marketContext: mockMarket,
      watchlist: [mockMarket],
      riskBudget: mockConfig,
    });

    expect(proposal.evidenceReferences.length).toBe(0);
  });

  it('should allow the Independent Risk Gate to OVERRIDE an active LLM trade proposal', async () => {
    const agent = new AgentEngine(); // Standard provider proposing ENTER_LONG
    const decision = await agent.evaluateEventAsync(mockEvent, mockMarket, [mockMarket], mockConfig);

    // Force Risk Gate block using max active positions limit
    const maxedConfig: RiskBudgetConfig = { ...mockConfig, currentActivePositions: 3 };
    const riskEngine = new RiskEngine();
    const riskEvaluation = riskEngine.evaluateRisk(decision, mockMarket, maxedConfig);

    const receiptGenerator = new ReceiptGenerator();
    const paperExchange = new PaperExchange();
    const order = paperExchange.executePaperOrder(decision, mockMarket, riskEvaluation.isApproved);
    const receipt = receiptGenerator.generateReceipt(mockEvent, mockMarket, decision, riskEvaluation, order);

    expect(decision.action).toBe('ENTER_LONG'); // AI proposed trade
    expect(riskEvaluation.isApproved).toBe(false); // Risk Gate blocked it
    expect(receipt.status).toBe('RISK_BLOCKED'); // Final receipt is RISK_BLOCKED
    expect(receipt.decisionAuthority.isOverriddenByRisk).toBe(true); // Authority explicitly shows override
  });
});
