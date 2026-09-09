import {
  EventItem,
  MarketContext,
  AgentDecision,
  AgentAction,
  RiskBudgetConfig,
  LLMDecisionProposal,
} from '@/types/domain';
import { ILLMDecisionProvider } from '../adapters/llmDecisionProvider';
import { MockLLMDecisionProvider } from '../adapters/mockLLMDecisionProvider';
import { QwenDecisionProvider } from '../adapters/qwenDecisionProvider';

export class AgentEngine {
  private llmProvider: ILLMDecisionProvider;

  constructor(provider?: ILLMDecisionProvider) {
    if (provider) {
      this.llmProvider = provider;
    } else {
      // Auto-detect Qwen key or default to Mock Provider
      if (process.env.BITGET_QWEN_API_KEY) {
        this.llmProvider = new QwenDecisionProvider();
      } else {
        this.llmProvider = new MockLLMDecisionProvider();
      }
    }
  }

  public getProviderName(): string {
    return this.llmProvider.name;
  }

  public getProviderMode(): 'QWEN_LIVE' | 'MOCK_DEMO' {
    return this.llmProvider.getMode();
  }

  public async evaluateEventAsync(
    event: EventItem,
    market: MarketContext,
    watchlist: MarketContext[],
    riskBudget: RiskBudgetConfig
  ): Promise<AgentDecision> {
    let proposal: LLMDecisionProposal;

    try {
      proposal = await this.llmProvider.evaluate({
        event,
        marketContext: market,
        watchlist,
        riskBudget,
      });
    } catch (err: any) {
      proposal = {
        action: 'STAND_DOWN',
        symbol: market.symbol,
        confidence: 0,
        rationale: [`Safety Fallback: LLM provider threw an error or malformed response: ${err.message || 'Unknown error'}`],
        evidenceReferences: ['LLM Provider Error'],
        invalidationCondition: 'Re-run evaluation when provider is operational.',
        proposedStopLossPct: 0,
        proposedTakeProfitPct: 0,
        standDownReason: `LLM evaluation error: ${err.message || 'Malformed output'}`,
        providerMode: this.getProviderMode(),
      };
    }

    // Convert proposal to AgentDecision structure
    let calculatedPositionSizeUsd = 0;
    if (proposal.action === 'ENTER_LONG' || proposal.action === 'ENTER_SHORT') {
      calculatedPositionSizeUsd = 8500; // Standard $8,500 sizing
    } else if (proposal.action === 'REDUCE_EXPOSURE') {
      calculatedPositionSizeUsd = 4000;
    }

    return {
      id: `dec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      eventId: event.id,
      targetSymbol: market.symbol,
      action: proposal.action,
      confidence: proposal.confidence,
      summary: proposal.standDownReason
        ? `Stand Down: ${proposal.standDownReason}`
        : `${proposal.action.replace('_', ' ')} proposed on ${market.symbol} with ${proposal.confidence}% confidence.`,
      reasoning: proposal.rationale,
      evidenceReferences: proposal.evidenceReferences,
      invalidationCondition: proposal.invalidationCondition,
      priceDiscoveryProbability: Math.min(98, Math.max(10, proposal.confidence)),
      calculatedPositionSizeUsd,
      suggestedStopLossPct: proposal.proposedStopLossPct,
      suggestedTakeProfitPct: proposal.proposedTakeProfitPct,
      timestamp: new Date().toISOString(),
      llmProposal: proposal,
    };
  }

  // Synchronous evaluation wrapper using Mock Provider for initial static state rendering
  public evaluateEvent(event: EventItem, market: MarketContext): AgentDecision {
    const mockProvider = new MockLLMDecisionProvider();
    // Synchronous execution using mock provider logic
    const isNoise = event.category === 'NOISE' || (event.impactScore < 3.0 && event.impactScore > -3.0);
    const isIlliquid = market.spreadPct > 0.8 || market.liquidityDepthIndex < 60;

    let action: AgentAction = 'STAND_DOWN';
    let confidence = 50;
    let priceDiscoveryProb = 30;
    let summary = '';
    const reasoning: string[] = [];

    reasoning.push(`Analyzed headline: "${event.title}" sourced from ${event.source}.`);
    reasoning.push(`Target asset: ${market.symbol} (${market.name}) currently trading at $${market.currentPrice.toFixed(2)}.`);

    if (isNoise) {
      action = 'STAND_DOWN';
      confidence = 88;
      priceDiscoveryProb = 15;
      summary = `Stand Down: Event classified as low-credibility noise with negligible fundamental catalyst.`;
      reasoning.push(`Event impact score of ${event.impactScore} and category ${event.category} indicates absence of verifiable institutional catalyst.`);
    } else if (isIlliquid) {
      action = 'STAND_DOWN';
      confidence = 82;
      priceDiscoveryProb = 28;
      summary = `Stand Down: Wide spread (${market.spreadPct.toFixed(2)}%) and low liquidity depth (${market.liquidityDepthIndex}/100) flag overnight price action as dangerous noise.`;
      reasoning.push(`Bid-Ask Spread is ${market.spreadPct.toFixed(2)}%, exceeding safe threshold of 0.80%.`);
    } else if (event.impactScore >= 4.0) {
      action = 'ENTER_LONG';
      confidence = Math.min(95, 75 + Math.round(event.impactScore * 2));
      priceDiscoveryProb = Math.min(98, 70 + Math.round(event.impactScore * 2.5));
      summary = `Autonomous Action: Proposed ENTER LONG on ${market.symbol} based on strong positive catalyst (Impact Score +${event.impactScore}).`;
      reasoning.push(`Event impact score is +${event.impactScore}, indicating significant fundamental tailwind for ${market.symbol}.`);
    } else if (event.impactScore <= -4.0) {
      action = 'ENTER_SHORT';
      confidence = Math.min(95, 75 + Math.round(Math.abs(event.impactScore) * 2));
      priceDiscoveryProb = Math.min(98, 70 + Math.round(Math.abs(event.impactScore) * 2.5));
      summary = `Autonomous Action: Proposed ENTER SHORT / HEDGE on ${market.symbol} due to high-severity downside catalyst (Impact Score ${event.impactScore}).`;
      reasoning.push(`Material downside risk identified with event impact score of ${event.impactScore}.`);
    } else {
      action = 'STAND_DOWN';
      confidence = 70;
      priceDiscoveryProb = 45;
      summary = `Stand Down: Neutral event impact score (${event.impactScore}) does not warrant overnight trade allocation.`;
    }

    let calculatedPositionSizeUsd = 0;
    let suggestedStopLossPct = 0;
    let suggestedTakeProfitPct = 0;

    if (action === 'ENTER_LONG' || action === 'ENTER_SHORT') {
      calculatedPositionSizeUsd = 8500;
      suggestedStopLossPct = 2.5;
      suggestedTakeProfitPct = 5.0;
    }

    const proposal: LLMDecisionProposal = {
      action,
      symbol: market.symbol,
      confidence,
      rationale: reasoning,
      evidenceReferences: [event.title, event.source],
      invalidationCondition: 'Subsequent news wire updates event severity or market conditions shift.',
      proposedStopLossPct: suggestedStopLossPct,
      proposedTakeProfitPct: suggestedTakeProfitPct,
      standDownReason: action === 'STAND_DOWN' ? summary : null,
      providerMode: 'MOCK_DEMO',
    };

    return {
      id: `dec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      eventId: event.id,
      targetSymbol: market.symbol,
      action,
      confidence,
      summary,
      reasoning,
      evidenceReferences: [event.title, event.source],
      invalidationCondition: 'Subsequent news wire updates event severity or market conditions shift.',
      priceDiscoveryProbability: priceDiscoveryProb,
      calculatedPositionSizeUsd,
      suggestedStopLossPct,
      suggestedTakeProfitPct,
      timestamp: new Date().toISOString(),
      llmProposal: proposal,
    };
  }
}
