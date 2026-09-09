import { AgentDecision, MarketContext, PaperOrder } from '@/types/domain';

export class PaperExchange {
  public executePaperOrder(
    decision: AgentDecision,
    market: MarketContext,
    isRiskApproved: boolean
  ): PaperOrder {
    const side = decision.action === 'ENTER_LONG' ? 'BUY' : decision.action === 'ENTER_SHORT' ? 'SELL' : 'CLOSE';
    const entryPrice = market.currentPrice;
    const notionalValueUsd = decision.calculatedPositionSizeUsd;
    const quantityTokens = parseFloat((notionalValueUsd / entryPrice).toFixed(4));

    let stopLossPrice = 0;
    let takeProfitPrice = 0;

    if (side === 'BUY') {
      stopLossPrice = parseFloat((entryPrice * (1 - decision.suggestedStopLossPct / 100)).toFixed(2));
      takeProfitPrice = parseFloat((entryPrice * (1 + decision.suggestedTakeProfitPct / 100)).toFixed(2));
    } else if (side === 'SELL') {
      stopLossPrice = parseFloat((entryPrice * (1 + decision.suggestedStopLossPct / 100)).toFixed(2));
      takeProfitPrice = parseFloat((entryPrice * (1 - decision.suggestedTakeProfitPct / 100)).toFixed(2));
    }

    return {
      orderId: `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      decisionId: decision.id,
      symbol: market.symbol,
      side,
      quantityTokens,
      entryPrice,
      notionalValueUsd,
      stopLossPrice,
      takeProfitPrice,
      status: isRiskApproved ? 'SIMULATED_FILLED' : 'REJECTED',
      timestamp: new Date().toISOString(),
    };
  }
}
