import { EventItem, MarketContext, RiskBudgetConfig, LLMDecisionProposal } from '@/types/domain';

export interface ILLMDecisionInput {
  event: EventItem;
  marketContext: MarketContext;
  watchlist: MarketContext[];
  riskBudget: RiskBudgetConfig;
}

export interface ILLMDecisionProvider {
  name: string;
  getMode(): 'QWEN_LIVE' | 'MOCK_DEMO';
  evaluate(input: ILLMDecisionInput): Promise<LLMDecisionProposal>;
}
