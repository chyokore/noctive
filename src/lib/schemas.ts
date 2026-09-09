import { z } from 'zod';

export const EventCategorySchema = z.enum(['EARNINGS', 'MACRO', 'POLICY', 'LEGAL', 'NOISE']);

export const EventItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  source: z.string().min(1),
  timestamp: z.string(),
  category: EventCategorySchema,
  affectedSymbol: z.string().min(1),
  impactScore: z.number().min(-10).max(10),
  rawSnippet: z.string(),
  isDemoData: z.boolean(),
});

export const SessionStatusSchema = z.enum(['OVERNIGHT_ACTIVE', 'WEEKEND_ACTIVE', 'REGULAR_CLOSED']);

export const MarketContextSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  currentPrice: z.number().positive(),
  prevClose: z.number().positive(),
  change24hPct: z.number(),
  bidPrice: z.number().positive(),
  askPrice: z.number().positive(),
  spreadPct: z.number().nonnegative(),
  volume24hUsd: z.number().nonnegative(),
  liquidityDepthIndex: z.number().min(0).max(100),
  sessionStatus: SessionStatusSchema,
  isDemoData: z.boolean(),
});

export const AgentActionSchema = z.enum(['ENTER_LONG', 'ENTER_SHORT', 'REDUCE_EXPOSURE', 'STAND_DOWN']);

export const LLMDecisionProposalSchema = z.object({
  action: AgentActionSchema,
  symbol: z.string().min(1),
  confidence: z.number().min(0).max(100),
  rationale: z.array(z.string()).min(1),
  evidenceReferences: z.array(z.string()),
  invalidationCondition: z.string().min(1),
  proposedStopLossPct: z.number().min(0).max(10),
  proposedTakeProfitPct: z.number().min(0).max(20),
  standDownReason: z.string().nullable().optional(),
  rawLlmResponse: z.string().optional(),
  providerMode: z.enum(['QWEN_LIVE', 'MOCK_DEMO']),
});

export const AgentDecisionSchema = z.object({
  id: z.string().min(1),
  eventId: z.string().min(1),
  targetSymbol: z.string().min(1),
  action: AgentActionSchema,
  confidence: z.number().min(0).max(100),
  summary: z.string(),
  reasoning: z.array(z.string()),
  evidenceReferences: z.array(z.string()),
  invalidationCondition: z.string(),
  priceDiscoveryProbability: z.number().min(0).max(100),
  calculatedPositionSizeUsd: z.number().nonnegative(),
  suggestedStopLossPct: z.number().nonnegative(),
  suggestedTakeProfitPct: z.number().nonnegative(),
  timestamp: z.string(),
  llmProposal: LLMDecisionProposalSchema.optional(),
});

export const RiskGateRuleIdSchema = z.enum([
  'MAX_POSITION_SIZE',
  'MAX_CONCURRENT_POSITIONS',
  'MIN_CONFIDENCE_THRESHOLD',
  'VOLATILITY_LIQUIDITY_GUARD',
  'COOLDOWN_PERIOD',
  'STOP_LOSS_REQUIRED',
  'TAKE_PROFIT_REQUIRED',
  'DAILY_LOSS_LIMIT',
]);

export const RiskCheckRuleSchema = z.object({
  ruleId: RiskGateRuleIdSchema,
  name: z.string(),
  passed: z.boolean(),
  metricValue: z.string(),
  thresholdValue: z.string(),
  detail: z.string(),
});

export const RiskEvaluationResultSchema = z.object({
  isApproved: z.boolean(),
  overallStatus: z.enum(['APPROVED', 'BLOCKED']),
  rules: z.array(RiskCheckRuleSchema),
  blockingReasons: z.array(z.string()),
  timestamp: z.string(),
});

export const PaperOrderSchema = z.object({
  orderId: z.string().min(1),
  decisionId: z.string().min(1),
  symbol: z.string().min(1),
  side: z.enum(['BUY', 'SELL', 'CLOSE']),
  quantityTokens: z.number().positive(),
  entryPrice: z.number().positive(),
  notionalValueUsd: z.number().positive(),
  stopLossPrice: z.number().positive(),
  takeProfitPrice: z.number().positive(),
  status: z.enum(['SIMULATED_FILLED', 'REJECTED', 'STAND_DOWN']),
  timestamp: z.string(),
});

export const DataProvenanceSchema = z.object({
  dataMode: z.enum(['DEMO_DATA', 'MOCK_MARKET_ADAPTER', 'QWEN_CONNECTED']),
  marketSource: z.string(),
  llmSource: z.string(),
  isDemoData: z.boolean(),
});

export const DecisionAuthoritySummarySchema = z.object({
  aiProposedAction: AgentActionSchema,
  aiConfidence: z.number(),
  evidenceStrength: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  riskGateOutcome: z.enum(['APPROVED', 'BLOCKED']),
  finalExecutedAction: AgentActionSchema,
  isOverriddenByRisk: z.boolean(),
  overrideExplanation: z.string().optional(),
});

export const DecisionReceiptSchema = z.object({
  receiptId: z.string().min(1),
  timestamp: z.string(),
  hash: z.string().min(8),
  event: EventItemSchema,
  marketContext: MarketContextSchema,
  agentDecision: AgentDecisionSchema,
  riskGate: RiskEvaluationResultSchema,
  paperOrder: PaperOrderSchema.optional(),
  standDownReasons: z.array(z.string()).optional(),
  status: z.enum(['APPROVED_EXECUTED', 'RISK_BLOCKED', 'NOISE_REJECTED_STAND_DOWN']),
  provenance: DataProvenanceSchema,
  decisionAuthority: DecisionAuthoritySummarySchema,
  isDemoData: z.boolean(),
});

export const RiskBudgetConfigSchema = z.object({
  maxPositionSizeUsd: z.number().positive(),
  maxConcurrentPositions: z.number().int().positive(),
  minConfidenceThresholdPct: z.number().min(0).max(100),
  maxSpreadPct: z.number().positive(),
  minLiquidityScore: z.number().min(0).max(100),
  dailyLossLimitUsd: z.number().positive(),
  currentDailyLossUsd: z.number().nonnegative(),
  currentActivePositions: z.number().int().nonnegative(),
  cooldownMinutes: z.number().nonnegative(),
  lastTradeTimestamp: z.string().optional(),
});
