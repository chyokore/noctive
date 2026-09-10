import {
  EventItem,
  MarketContext,
  AgentDecision,
  RiskEvaluationResult,
  PaperOrder,
  DecisionReceipt,
  DataProvenance,
  DecisionAuthoritySummary,
  AgentAction,
} from '@/types/domain';

export class ReceiptGenerator {
  public generateReceipt(
    event: EventItem,
    marketContext: MarketContext,
    agentDecision: AgentDecision,
    riskGate: RiskEvaluationResult,
    paperOrder?: PaperOrder,
    standDownReasons?: string[]
  ): DecisionReceipt {
    const timestamp = new Date().toISOString();
    const receiptId = `rcpt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    let status: 'APPROVED_EXECUTED' | 'RISK_BLOCKED' | 'NOISE_REJECTED_STAND_DOWN';

    if (agentDecision.action === 'STAND_DOWN') {
      status = 'NOISE_REJECTED_STAND_DOWN';
    } else if (riskGate.isApproved && paperOrder?.status === 'SIMULATED_FILLED') {
      status = 'APPROVED_EXECUTED';
    } else {
      status = 'RISK_BLOCKED';
    }

    const absImpact = Math.abs(event.impactScore);
    const evidenceStrength: 'HIGH' | 'MEDIUM' | 'LOW' =
      absImpact >= 7.0 ? 'HIGH' : absImpact >= 4.0 ? 'MEDIUM' : 'LOW';

    const isOverriddenByRisk = agentDecision.action !== 'STAND_DOWN' && !riskGate.isApproved;

    const finalExecutedAction: AgentAction =
      riskGate.isApproved && paperOrder?.status === 'SIMULATED_FILLED'
        ? agentDecision.action
        : 'STAND_DOWN';

    const decisionAuthority: DecisionAuthoritySummary = {
      aiProposedAction: agentDecision.action,
      aiConfidence: agentDecision.confidence,
      evidenceStrength,
      riskGateOutcome: riskGate.isApproved ? 'APPROVED' : 'BLOCKED',
      finalExecutedAction,
      isOverriddenByRisk,
      overrideExplanation: isOverriddenByRisk
        ? `Deterministic Risk Gate OVERRODE AI proposal: ${riskGate.blockingReasons.join('; ')}`
        : undefined,
    };

    // Provenance Audit: Determine isDemo dynamically based on inputs
    const isDemo = Boolean(event.isDemoData || marketContext.isDemoData);

    const extProvenance = (event as any).externalProvenance || (marketContext as any).externalProvenance;

    const provenance: DataProvenance = {
      dataMode: !isDemo
        ? 'LIVE_EXTERNAL'
        : agentDecision.llmProposal?.providerMode === 'QWEN_LIVE'
        ? 'QWEN_CONNECTED'
        : 'DEMO_DATA',
      marketSource: !isDemo
        ? 'Bitget Public Spot Tickers API'
        : 'Simulated rToken 24/7 Market Feed',
      llmSource:
        agentDecision.llmProposal?.providerMode === 'QWEN_LIVE'
          ? 'Bitget Qwen AI API'
          : 'Deterministic Risk Engine + LLM',
      isDemoData: isDemo,
      externalProvenance: extProvenance,
    };

    const payloadToHash = JSON.stringify({
      receiptId,
      timestamp,
      eventId: event.id,
      symbol: marketContext.symbol,
      aiAction: agentDecision.action,
      confidence: agentDecision.confidence,
      riskApproved: riskGate.isApproved,
      finalAction: finalExecutedAction,
      orderId: paperOrder?.orderId,
    });

    const hash = this.computeSimpleHash(payloadToHash);

    return {
      receiptId,
      timestamp,
      hash,
      event,
      marketContext,
      agentDecision,
      riskGate,
      paperOrder,
      standDownReasons:
        standDownReasons ||
        (status === 'NOISE_REJECTED_STAND_DOWN' ? agentDecision.reasoning : undefined),
      status,
      provenance,
      decisionAuthority,
      isDemoData: isDemo,
    };
  }

  private computeSimpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `0x8f3c7a9b${hex}e4d1f2`;
  }
}
