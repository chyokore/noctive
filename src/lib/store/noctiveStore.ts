import {
  DemoScenario,
  DecisionReceipt,
  RiskBudgetConfig,
  PaperOrder,
  ReplayOutcome,
  MarketContext,
  EventItem,
} from '@/types/domain';
import { MOCK_EVENTS } from '../adapters/eventProvider';
import { MOCK_WATCHLIST } from '../adapters/marketDataProvider';
import { AgentEngine } from '../engine/agentEngine';
import { RiskEngine } from '../engine/riskEngine';
import { PaperExchange } from '../engine/paperExchange';
import { ReceiptGenerator } from '../engine/receiptGenerator';

export const INITIAL_RISK_BUDGET: RiskBudgetConfig = {
  maxPositionSizeUsd: 10000,
  maxConcurrentPositions: 3,
  minConfidenceThresholdPct: 75,
  maxSpreadPct: 0.8,
  minLiquidityScore: 60,
  dailyLossLimitUsd: 2500,
  currentDailyLossUsd: 350,
  currentActivePositions: 1,
  cooldownMinutes: 5,
};

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'demo-credible-approved',
    title: 'Scenario 1: Credible Macro/Tech Event → Approved Paper Trade',
    badgeLabel: 'APPROVED PAPER TRADE',
    description: 'NVIDIA receives unexpected EU export regulatory clearance overnight. High event impact score (+8.5), strong market liquidity (spread 0.11%), and clean risk check pass resulting in an executed paper long order.',
    category: 'CREDIBLE_APPROVED',
    event: MOCK_EVENTS[0], // NVDA EU export clearance
    marketContext: MOCK_WATCHLIST['rNVDA'],
    expectedDecision: 'ENTER_LONG',
    expectedRiskResult: 'APPROVED',
  },
  {
    id: 'demo-noisy-rejected',
    title: 'Scenario 2: Low-Liquidity Speculative Noise → Stand Down',
    badgeLabel: 'LOW-LIQUIDITY NOISE STAND DOWN',
    description: 'Tesla experiences an overnight speculative price spike (+3.25%) triggered by unverified social media rumors. High bid-ask spread (2.19%) and low liquidity depth score (32/100) trigger the agent to autonomously stand down.',
    category: 'NOISY_REJECTED',
    event: MOCK_EVENTS[1], // TSLA rumor
    marketContext: MOCK_WATCHLIST['rTSLA'],
    expectedDecision: 'STAND_DOWN',
    expectedRiskResult: 'STAND_DOWN',
  },
  {
    id: 'demo-risk-blocked',
    title: 'Scenario 3: High-Severity Event → Blocked by Risk Gate',
    badgeLabel: 'RISK GATE BLOCKED',
    description: 'Apple faces a severe $4.2B antitrust penalty announcement. The agent proposes an autonomous short hedge position, but the deterministic Risk Gate blocks execution because the account is already at max concurrent positions / risk threshold.',
    category: 'HIGH_RISK_BLOCKED',
    event: MOCK_EVENTS[2], // AAPL fine
    marketContext: MOCK_WATCHLIST['rAAPL'],
    expectedDecision: 'ENTER_SHORT',
    expectedRiskResult: 'BLOCKED',
  },
];

export const INITIAL_RECEIPTS: DecisionReceipt[] = [];

// Seed initial receipts for the 3 demo scenarios so Decision Ledger is populated immediately
const agentEngine = new AgentEngine();
const riskEngine = new RiskEngine();
const paperExchange = new PaperExchange();
const receiptGenerator = new ReceiptGenerator();

// 1. Seed Credible Approved Receipt
const dec1 = agentEngine.evaluateEvent(DEMO_SCENARIOS[0].event, DEMO_SCENARIOS[0].marketContext);
const risk1 = riskEngine.evaluateRisk(dec1, DEMO_SCENARIOS[0].marketContext, INITIAL_RISK_BUDGET);
const order1 = paperExchange.executePaperOrder(dec1, DEMO_SCENARIOS[0].marketContext, risk1.isApproved);
const rcpt1 = receiptGenerator.generateReceipt(DEMO_SCENARIOS[0].event, DEMO_SCENARIOS[0].marketContext, dec1, risk1, order1);
INITIAL_RECEIPTS.push(rcpt1);

// 2. Seed Noise Stand-down Receipt
const dec2 = agentEngine.evaluateEvent(DEMO_SCENARIOS[1].event, DEMO_SCENARIOS[1].marketContext);
const risk2 = riskEngine.evaluateRisk(dec2, DEMO_SCENARIOS[1].marketContext, INITIAL_RISK_BUDGET);
const rcpt2 = receiptGenerator.generateReceipt(DEMO_SCENARIOS[1].event, DEMO_SCENARIOS[1].marketContext, dec2, risk2);
INITIAL_RECEIPTS.push(rcpt2);

// 3. Seed Risk Gate Blocked Receipt (using max concurrent positions condition)
const dec3 = agentEngine.evaluateEvent(DEMO_SCENARIOS[2].event, DEMO_SCENARIOS[2].marketContext);
const restrictedRiskConfig: RiskBudgetConfig = { ...INITIAL_RISK_BUDGET, currentActivePositions: 3 }; // Forced block
const risk3 = riskEngine.evaluateRisk(dec3, DEMO_SCENARIOS[2].marketContext, restrictedRiskConfig);
const order3 = paperExchange.executePaperOrder(dec3, DEMO_SCENARIOS[2].marketContext, risk3.isApproved);
const rcpt3 = receiptGenerator.generateReceipt(DEMO_SCENARIOS[2].event, DEMO_SCENARIOS[2].marketContext, dec3, risk3, order3);
INITIAL_RECEIPTS.push(rcpt3);

export const INITIAL_PAPER_POSITIONS: PaperOrder[] = [
  {
    orderId: 'ord-active-101',
    decisionId: 'dec-seed-101',
    symbol: 'rMSFT',
    side: 'BUY',
    quantityTokens: 18.9478,
    entryPrice: 448.60,
    notionalValueUsd: 8500,
    stopLossPrice: 437.38,
    takeProfitPrice: 471.03,
    status: 'SIMULATED_FILLED',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
];

export const INITIAL_REPLAY_OUTCOMES: ReplayOutcome[] = [
  {
    receiptId: rcpt1.receiptId,
    symbol: 'rNVDA',
    decisionAction: 'ENTER_LONG',
    overnightPrice: 128.45,
    marketOpenPrice: 132.80,
    actualOpenGapPct: 3.38,
    simulatedPnlUsd: 287.30,
    simulatedPnlPct: 3.38,
    priceDiscoveryVerified: true,
    agentLessonLearned: 'EU AI export regulatory clearance represented true structural price discovery. The overnight rToken momentum correctly front-ran the regular US market open gap (+3.38%).',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    isDemoData: true,
  },
  {
    receiptId: rcpt2.receiptId,
    symbol: 'rTSLA',
    decisionAction: 'STAND_DOWN',
    overnightPrice: 218.90,
    marketOpenPrice: 211.50,
    actualOpenGapPct: -3.38,
    simulatedPnlUsd: 0,
    simulatedPnlPct: 0,
    priceDiscoveryVerified: false,
    agentLessonLearned: 'Overnight rToken spike of +3.25% reversed completely at regular market open due to zero underlying news credibility. Standing down saved the account $286.00 in simulated slippage & drawdown.',
    timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
    isDemoData: true,
  },
];
