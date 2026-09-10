export type EventCategory = 'EARNINGS' | 'MACRO' | 'POLICY' | 'LEGAL' | 'NOISE';

export interface EventItem {
  id: string;
  title: string;
  source: string;
  timestamp: string;
  category: EventCategory;
  affectedSymbol: string;
  impactScore: number; // -10 to +10
  rawSnippet: string;
  isDemoData: boolean;
}

export type SessionStatus = 'OVERNIGHT_ACTIVE' | 'WEEKEND_ACTIVE' | 'REGULAR_CLOSED';

export interface MarketContext {
  symbol: string;
  name: string;
  currentPrice: number;
  prevClose: number;
  change24hPct: number;
  bidPrice: number;
  askPrice: number;
  spreadPct: number;
  volume24hUsd: number;
  liquidityDepthIndex: number; // 0 to 100
  sessionStatus: SessionStatus;
  isDemoData: boolean;
}

export type AgentAction = 'ENTER_LONG' | 'ENTER_SHORT' | 'REDUCE_EXPOSURE' | 'STAND_DOWN';

export interface LLMDecisionProposal {
  action: AgentAction;
  symbol: string;
  confidence: number; // 0 to 100
  rationale: string[];
  evidenceReferences: string[];
  invalidationCondition: string;
  proposedStopLossPct: number;
  proposedTakeProfitPct: number;
  standDownReason?: string | null;
  rawLlmResponse?: string;
  providerMode: 'QWEN_LIVE' | 'MOCK_DEMO';
}

export interface AgentDecision {
  id: string;
  eventId: string;
  targetSymbol: string;
  action: AgentAction;
  confidence: number;
  summary: string;
  reasoning: string[];
  evidenceReferences: string[];
  invalidationCondition: string;
  priceDiscoveryProbability: number;
  calculatedPositionSizeUsd: number;
  suggestedStopLossPct: number;
  suggestedTakeProfitPct: number;
  timestamp: string;
  llmProposal?: LLMDecisionProposal;
}

export type RiskGateRuleId =
  | 'MAX_POSITION_SIZE'
  | 'MAX_CONCURRENT_POSITIONS'
  | 'MIN_CONFIDENCE_THRESHOLD'
  | 'VOLATILITY_LIQUIDITY_GUARD'
  | 'COOLDOWN_PERIOD'
  | 'STOP_LOSS_REQUIRED'
  | 'TAKE_PROFIT_REQUIRED'
  | 'DAILY_LOSS_LIMIT';

export interface RiskCheckRule {
  ruleId: RiskGateRuleId;
  name: string;
  passed: boolean;
  metricValue: string;
  thresholdValue: string;
  detail: string;
}

export interface RiskEvaluationResult {
  isApproved: boolean;
  overallStatus: 'APPROVED' | 'BLOCKED';
  rules: RiskCheckRule[];
  blockingReasons: string[];
  timestamp: string;
}

export interface PaperOrder {
  orderId: string;
  decisionId: string;
  symbol: string;
  side: 'BUY' | 'SELL' | 'CLOSE';
  quantityTokens: number;
  entryPrice: number;
  notionalValueUsd: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  status: 'SIMULATED_FILLED' | 'REJECTED' | 'STAND_DOWN';
  timestamp: string;
}

export interface ExternalInputProvenance {
  sourceUrl: string;
  publisherName: string;
  retrievedAtTimestamp: string;
  publishedAtTimestamp?: string;
  symbolMapping?: string;
  contentHash: string;
  dataMode: 'LIVE_EXTERNAL' | 'DEMO_DATA';
}

export interface LivePipelineStatus {
  lastRunTimestamp: string;
  eventsFetched: number;
  marketPricesFetched: number;
  status: 'HEALTHY' | 'DEGRADED' | 'NO_QUALIFYING_EVENTS' | 'FAILED';
  lastSourceUrl?: string;
  message: string;
  activeEventSources: string[];
  activeMarketSources: string[];
}

export interface DataProvenance {
  dataMode: 'DEMO_DATA' | 'MOCK_MARKET_ADAPTER' | 'QWEN_CONNECTED' | 'LIVE_EXTERNAL';
  marketSource: string;
  llmSource: string;
  isDemoData: boolean;
  externalProvenance?: ExternalInputProvenance;
}

export interface DecisionAuthoritySummary {
  aiProposedAction: AgentAction;
  aiConfidence: number;
  evidenceStrength: 'HIGH' | 'MEDIUM' | 'LOW';
  riskGateOutcome: 'APPROVED' | 'BLOCKED';
  finalExecutedAction: AgentAction;
  isOverriddenByRisk: boolean;
  overrideExplanation?: string;
}

export type LiveRunAuditStatus = 'QUALIFIED' | 'SAFE_SKIP' | 'PROVIDER_UNAVAILABLE';

export interface LiveRunAuditRecord {
  auditId: string;
  timestamp: string;
  hash: string;
  status: LiveRunAuditStatus;
  eventProviderStatus: 'HEALTHY' | 'NO_EVENTS' | 'UNAVAILABLE';
  marketProviderStatus: 'HEALTHY' | 'UNVERIFIED_EQUITY_MARKET' | 'UNAVAILABLE';
  qwenInvoked: boolean;
  decisionCreated: boolean;
  safeSkipReason?: string;
  eventProviderDomain: string;
  marketProviderDomain: string;
  llmProviderDomain: string;
  mappedIssuerTicker?: string;
  mappedRToken?: string;
  confirmedMarketSymbol?: string;
}

export interface DecisionReceipt {
  receiptId: string;
  timestamp: string;
  hash: string;
  event: EventItem;
  marketContext: MarketContext;
  agentDecision: AgentDecision;
  riskGate: RiskEvaluationResult;
  paperOrder?: PaperOrder;
  standDownReasons?: string[];
  status: 'APPROVED_EXECUTED' | 'RISK_BLOCKED' | 'NOISE_REJECTED_STAND_DOWN';
  provenance: DataProvenance;
  decisionAuthority: DecisionAuthoritySummary;
  isDemoData: boolean;
}

export interface ReplayOutcome {
  receiptId: string;
  symbol: string;
  decisionAction: AgentAction;
  overnightPrice: number;
  marketOpenPrice: number;
  actualOpenGapPct: number;
  simulatedPnlUsd: number;
  simulatedPnlPct: number;
  priceDiscoveryVerified: boolean;
  agentLessonLearned: string;
  timestamp: string;
  isDemoData: boolean;
}

export interface RiskBudgetConfig {
  maxPositionSizeUsd: number;
  maxConcurrentPositions: number;
  minConfidenceThresholdPct: number;
  maxSpreadPct: number;
  minLiquidityScore: number;
  dailyLossLimitUsd: number;
  currentDailyLossUsd: number;
  currentActivePositions: number;
  cooldownMinutes: number;
  lastTradeTimestamp?: string;
}

export interface DemoScenario {
  id: string;
  title: string;
  badgeLabel: string;
  description: string;
  category: 'CREDIBLE_APPROVED' | 'NOISY_REJECTED' | 'HIGH_RISK_BLOCKED';
  event: EventItem;
  marketContext: MarketContext;
  expectedDecision: AgentAction;
  expectedRiskResult: 'APPROVED' | 'BLOCKED' | 'STAND_DOWN';
}

export interface CompetitionLogMetrics {
  startDate: string;
  endDate: string;
  totalDecisions: number;
  approvedCount: number;
  riskBlockedCount: number;
  standDownCount: number;
  winRatePct: number;
  cumulativePnlUsd: number;
  maxDrawdownPct: number;
}

// ============================================================================
// UTA SENTINEL DOMAIN TYPES & SCHEMAS
// ============================================================================

export type MarginBufferStatus = 'HEALTHY' | 'CAUTION' | 'CRITICAL';
export type SentinelRecommendationAction = 'HOLD_MONITOR' | 'REDUCE_FUTURES_RISK' | 'PROTECT_MARGIN_STAND_DOWN';

export interface SimulatedRTokenPosition {
  symbol: string;
  name: string;
  quantityTokens: number;
  markPriceUsd: number;
  haircutPct: number;
  collateralRatioPct: number;
}

export interface SimulatedUsdtCash {
  amountUsd: number;
}

export interface SimulatedFuturesPosition {
  symbol: string;
  positionSizeUsd: number;
  leverageX: number;
  maintenanceMarginReqUsd: number;
}

export interface CollateralPolicyConfig {
  policyVersion: string;
  scenarioAssumptionsVersion: string;
  illustrativeHaircutPct: number;
  illustrativeCollateralRatioPct: number;
  cautionCoverageThreshold: number;
  criticalCoverageThreshold: number;
}

export interface CollateralShockAssessment {
  preShockCollateralValueUsd: number;
  preShockAdjustedCollateralUsd: number;
  preShockTotalCollateralUsd: number;
  eventShockPct: number;
  stressedRTokenPriceUsd: number;
  stressedCollateralValueUsd: number;
  stressedAdjustedCollateralUsd: number;
  stressedTotalCollateralUsd: number;
  collateralValueLostUsd: number;
  maintenanceMarginRequirementUsd: number;
  preShockMarginCoverageRatio: number;
  postShockMarginCoverageRatio: number;
  marginBufferStatus: MarginBufferStatus;
  recommendation: SentinelRecommendationAction;
  recommendationSummary: string;
  rationale: string[];
  assumptionsDisclaimer: string;
  timestamp: string;
}

export interface UTASentinelScenario {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  isHighImpact: boolean;
  event: EventItem;
  rTokenPosition: SimulatedRTokenPosition;
  usdtCash: SimulatedUsdtCash;
  futuresPosition: SimulatedFuturesPosition;
  policyConfig: CollateralPolicyConfig;
  expectedBufferStatus: MarginBufferStatus;
  expectedRecommendation: SentinelRecommendationAction;
}

