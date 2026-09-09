import {
  AgentDecision,
  MarketContext,
  RiskBudgetConfig,
  RiskCheckRule,
  RiskEvaluationResult,
} from '@/types/domain';

export class RiskEngine {
  public evaluateRisk(
    decision: AgentDecision,
    market: MarketContext,
    config: RiskBudgetConfig
  ): RiskEvaluationResult {
    const rules: RiskCheckRule[] = [];
    const blockingReasons: string[] = [];

    // If decision is STAND_DOWN, risk gate doesn't block (it evaluates stand-down state)
    if (decision.action === 'STAND_DOWN') {
      return {
        isApproved: false,
        overallStatus: 'BLOCKED',
        rules: [
          {
            ruleId: 'MIN_CONFIDENCE_THRESHOLD',
            name: 'Agent Decision Status',
            passed: false,
            metricValue: 'STAND_DOWN',
            thresholdValue: 'ACTIONABLE_TRADE',
            detail: 'Agent recommended Standing Down due to low event significance or high liquidity noise.',
          },
        ],
        blockingReasons: ['Agent recommended Standing Down; no paper trade generated.'],
        timestamp: new Date().toISOString(),
      };
    }

    // 1. Max Position Size
    const passPosSize = decision.calculatedPositionSizeUsd <= config.maxPositionSizeUsd;
    rules.push({
      ruleId: 'MAX_POSITION_SIZE',
      name: 'Maximum Position Size Limit',
      passed: passPosSize,
      metricValue: `$${decision.calculatedPositionSizeUsd.toLocaleString()}`,
      thresholdValue: `Max $${config.maxPositionSizeUsd.toLocaleString()}`,
      detail: passPosSize
        ? `Position size of $${decision.calculatedPositionSizeUsd.toLocaleString()} is within safe capital allocation limits.`
        : `Proposed position size $${decision.calculatedPositionSizeUsd.toLocaleString()} exceeds maximum allowed limit of $${config.maxPositionSizeUsd.toLocaleString()}.`,
    });
    if (!passPosSize) {
      blockingReasons.push(`Position size exceeds maximum limit of $${config.maxPositionSizeUsd.toLocaleString()}`);
    }

    // 2. Max Concurrent Active Positions
    const passConcurrent = config.currentActivePositions < config.maxConcurrentPositions;
    rules.push({
      ruleId: 'MAX_CONCURRENT_POSITIONS',
      name: 'Concurrent Active Positions Limit',
      passed: passConcurrent,
      metricValue: `${config.currentActivePositions} Active`,
      thresholdValue: `Max ${config.maxConcurrentPositions} Positions`,
      detail: passConcurrent
        ? `Active positions count (${config.currentActivePositions}) is below maximum limit of ${config.maxConcurrentPositions}.`
        : `Account has reached maximum concurrent active positions limit (${config.currentActivePositions}/${config.maxConcurrentPositions}).`,
    });
    if (!passConcurrent) {
      blockingReasons.push(`Max concurrent positions limit reached (${config.currentActivePositions}/${config.maxConcurrentPositions})`);
    }

    // 3. Minimum Agent Confidence Threshold
    const passConfidence = decision.confidence >= config.minConfidenceThresholdPct;
    rules.push({
      ruleId: 'MIN_CONFIDENCE_THRESHOLD',
      name: 'Minimum Confidence Threshold',
      passed: passConfidence,
      metricValue: `${decision.confidence}%`,
      thresholdValue: `Min ${config.minConfidenceThresholdPct}%`,
      detail: passConfidence
        ? `Agent confidence level (${decision.confidence}%) meets required threshold (${config.minConfidenceThresholdPct}%).`
        : `Agent confidence score of ${decision.confidence}% is below minimum required threshold of ${config.minConfidenceThresholdPct}%.`,
    });
    if (!passConfidence) {
      blockingReasons.push(`Confidence score (${decision.confidence}%) is below minimum threshold (${config.minConfidenceThresholdPct}%)`);
    }

    // 4. Volatility & Liquidity Guard
    const passSpread = market.spreadPct <= config.maxSpreadPct;
    const passDepth = market.liquidityDepthIndex >= config.minLiquidityScore;
    const passLiquidity = passSpread && passDepth;
    rules.push({
      ruleId: 'VOLATILITY_LIQUIDITY_GUARD',
      name: 'Overnight Volatility & Liquidity Guard',
      passed: passLiquidity,
      metricValue: `Spread: ${market.spreadPct.toFixed(2)}% | Depth: ${market.liquidityDepthIndex}/100`,
      thresholdValue: `Spread <= ${config.maxSpreadPct}% | Depth >= ${config.minLiquidityScore}`,
      detail: passLiquidity
        ? `Order book spread (${market.spreadPct.toFixed(2)}%) and liquidity depth (${market.liquidityDepthIndex}/100) are healthy.`
        : `Unsafe overnight execution conditions: Bid-Ask spread is ${market.spreadPct.toFixed(2)}% (limit ${config.maxSpreadPct}%) or liquidity depth is ${market.liquidityDepthIndex} (min ${config.minLiquidityScore}).`,
    });
    if (!passLiquidity) {
      blockingReasons.push(`Liquidity guard triggered: Bid-Ask spread is ${market.spreadPct.toFixed(2)}% (max ${config.maxSpreadPct}%) or depth is ${market.liquidityDepthIndex} (min ${config.minLiquidityScore})`);
    }

    // 5. Cooldown Period Check
    let passCooldown = true;
    let cooldownMetric = '0 mins since last trade';
    if (config.lastTradeTimestamp) {
      const minutesElapsed = (Date.now() - new Date(config.lastTradeTimestamp).getTime()) / (1000 * 60);
      passCooldown = minutesElapsed >= config.cooldownMinutes;
      cooldownMetric = `${minutesElapsed.toFixed(1)} mins elapsed`;
    }
    rules.push({
      ruleId: 'COOLDOWN_PERIOD',
      name: 'Trade Execution Cooldown',
      passed: passCooldown,
      metricValue: cooldownMetric,
      thresholdValue: `Min ${config.cooldownMinutes} mins`,
      detail: passCooldown
        ? `Cooldown timer satisfied.`
        : `System is in cooldown period. Please wait ${config.cooldownMinutes} minutes between trade executions.`,
    });
    if (!passCooldown) {
      blockingReasons.push(`Execution cooldown period active (${config.cooldownMinutes} minutes required between trades)`);
    }

    // 6. Stop-Loss Configuration Check
    const passStopLoss = decision.suggestedStopLossPct > 0 && decision.suggestedStopLossPct <= 10.0;
    rules.push({
      ruleId: 'STOP_LOSS_REQUIRED',
      name: 'Mandatory Stop-Loss Parameter',
      passed: passStopLoss,
      metricValue: `${decision.suggestedStopLossPct}% SL`,
      thresholdValue: `Defined (0% < SL <= 10%)`,
      detail: passStopLoss
        ? `Valid stop-loss parameter configured at ${decision.suggestedStopLossPct}%.`
        : `Invalid or missing stop-loss parameter.`,
    });
    if (!passStopLoss) {
      blockingReasons.push(`Mandatory stop-loss parameter missing or invalid (${decision.suggestedStopLossPct}%)`);
    }

    // 7. Take-Profit Configuration Check
    const passTakeProfit = decision.suggestedTakeProfitPct > 0 && decision.suggestedTakeProfitPct >= decision.suggestedStopLossPct;
    rules.push({
      ruleId: 'TAKE_PROFIT_REQUIRED',
      name: 'Mandatory Take-Profit Parameter',
      passed: passTakeProfit,
      metricValue: `${decision.suggestedTakeProfitPct}% TP`,
      thresholdValue: `>= Stop-Loss (${decision.suggestedStopLossPct}%)`,
      detail: passTakeProfit
        ? `Valid take-profit target configured at ${decision.suggestedTakeProfitPct}%.`
        : `Take-profit parameter (${decision.suggestedTakeProfitPct}%) must provide a 1:1 or better reward-to-risk ratio.`,
    });
    if (!passTakeProfit) {
      blockingReasons.push(`Take-profit parameter (${decision.suggestedTakeProfitPct}%) does not meet risk/reward threshold`);
    }

    // 8. Daily Loss Limit & Budget Check
    const passDailyLoss = config.currentDailyLossUsd < config.dailyLossLimitUsd;
    rules.push({
      ruleId: 'DAILY_LOSS_LIMIT',
      name: 'Daily Loss Limit & Risk Budget',
      passed: passDailyLoss,
      metricValue: `$${config.currentDailyLossUsd.toLocaleString()} Used`,
      thresholdValue: `Limit $${config.dailyLossLimitUsd.toLocaleString()}`,
      detail: passDailyLoss
        ? `Daily risk budget is healthy ($${(config.dailyLossLimitUsd - config.currentDailyLossUsd).toLocaleString()} remaining).`
        : `Daily loss limit reached ($${config.currentDailyLossUsd.toLocaleString()} lost out of $${config.dailyLossLimitUsd.toLocaleString()} daily budget). Trading halted.`,
    });
    if (!passDailyLoss) {
      blockingReasons.push(`Daily loss limit reached ($${config.currentDailyLossUsd.toLocaleString()}/${config.dailyLossLimitUsd.toLocaleString()})`);
    }

    const isApproved = rules.every((r) => r.passed);
    const overallStatus = isApproved ? 'APPROVED' : 'BLOCKED';

    return {
      isApproved,
      overallStatus,
      rules,
      blockingReasons,
      timestamp: new Date().toISOString(),
    };
  }
}
