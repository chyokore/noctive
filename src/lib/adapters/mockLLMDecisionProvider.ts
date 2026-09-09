import { ILLMDecisionProvider, ILLMDecisionInput } from './llmDecisionProvider';
import { LLMDecisionProposal, AgentAction } from '@/types/domain';

export class MockLLMDecisionProvider implements ILLMDecisionProvider {
  public name = 'Mock LLM Provider (Demo Engine)';

  public getMode(): 'QWEN_LIVE' | 'MOCK_DEMO' {
    return 'MOCK_DEMO';
  }

  public async evaluate(input: ILLMDecisionInput): Promise<LLMDecisionProposal> {
    const { event, marketContext } = input;

    const isNoise = event.category === 'NOISE' || (event.impactScore < 3.0 && event.impactScore > -3.0);
    const isIlliquid = marketContext.spreadPct > 0.8 || marketContext.liquidityDepthIndex < 60;

    if (isNoise) {
      return {
        action: 'STAND_DOWN',
        symbol: marketContext.symbol,
        confidence: 88,
        rationale: [
          `Event headline "${event.title}" sourced from ${event.source} has insufficient fundamental catalyst (impact score ${event.impactScore}).`,
          `Category ${event.category} represents unverified news or low-credibility rumor.`,
        ],
        evidenceReferences: [event.title, event.source],
        invalidationCondition: `Verifiable SEC Form 8-K filing or official corporate press release published.`,
        proposedStopLossPct: 0,
        proposedTakeProfitPct: 0,
        standDownReason: `Event impact score of ${event.impactScore} indicates absence of verifiable institutional catalyst.`,
        providerMode: 'MOCK_DEMO',
      };
    }

    if (isIlliquid) {
      return {
        action: 'STAND_DOWN',
        symbol: marketContext.symbol,
        confidence: 82,
        rationale: [
          `Target asset ${marketContext.symbol} is displaying dangerous overnight illiquidity.`,
          `Bid-Ask spread is ${marketContext.spreadPct.toFixed(2)}% (safe limit <= 0.80%), and depth index is ${marketContext.liquidityDepthIndex}/100.`,
        ],
        evidenceReferences: [event.title, `Spread: ${marketContext.spreadPct.toFixed(2)}%`],
        invalidationCondition: `Bid-Ask spread narrows below 0.80% and liquidity depth index exceeds 60/100.`,
        proposedStopLossPct: 0,
        proposedTakeProfitPct: 0,
        standDownReason: `Wide bid-ask spread (${marketContext.spreadPct.toFixed(2)}%) flags overnight price action as un-actionable noise.`,
        providerMode: 'MOCK_DEMO',
      };
    }

    if (event.impactScore >= 4.0) {
      return {
        action: 'ENTER_LONG',
        symbol: marketContext.symbol,
        confidence: Math.min(95, 75 + Math.round(event.impactScore * 2)),
        rationale: [
          `Strong positive catalyst identified: "${event.title}" (Impact +${event.impactScore}).`,
          `Tight bid-ask spread (${marketContext.spreadPct.toFixed(2)}%) and high liquidity index (${marketContext.liquidityDepthIndex}/100) confirm genuine overnight price discovery.`,
          `Expected positive opening gap when US regular market session opens.`,
        ],
        evidenceReferences: [event.title, event.source, `Impact: +${event.impactScore}`],
        invalidationCondition: `Overnight price falls back below $${(marketContext.currentPrice * 0.98).toFixed(2)} or regulatory clearance is delayed.`,
        proposedStopLossPct: 2.5,
        proposedTakeProfitPct: 5.0,
        standDownReason: null,
        providerMode: 'MOCK_DEMO',
      };
    }

    if (event.impactScore <= -4.0) {
      return {
        action: 'ENTER_SHORT',
        symbol: marketContext.symbol,
        confidence: Math.min(95, 75 + Math.round(Math.abs(event.impactScore) * 2)),
        rationale: [
          `Severe downside catalyst identified: "${event.title}" (Impact ${event.impactScore}).`,
          `Legal or regulatory penalty poses material downside risk to ${marketContext.symbol}.`,
          `Order book depth (${marketContext.liquidityDepthIndex}/100) supports short position entry for portfolio hedging.`,
        ],
        evidenceReferences: [event.title, event.source, `Impact: ${event.impactScore}`],
        invalidationCondition: `Official retraction issued by regulatory authorities or company announces counter-settlement.`,
        proposedStopLossPct: 2.5,
        proposedTakeProfitPct: 5.0,
        standDownReason: null,
        providerMode: 'MOCK_DEMO',
      };
    }

    return {
      action: 'STAND_DOWN',
      symbol: marketContext.symbol,
      confidence: 70,
      rationale: [
        `Neutral catalyst impact score (${event.impactScore}) does not justify overnight position allocation.`,
      ],
      evidenceReferences: [event.title],
      invalidationCondition: `Subsequent high-credibility news wire updates event magnitude.`,
      proposedStopLossPct: 0,
      proposedTakeProfitPct: 0,
      standDownReason: `Catalyst magnitude is insufficient to overcome overnight session execution risk.`,
      providerMode: 'MOCK_DEMO',
    };
  }
}
