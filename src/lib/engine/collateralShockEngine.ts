import {
  SimulatedRTokenPosition,
  SimulatedUsdtCash,
  SimulatedFuturesPosition,
  CollateralPolicyConfig,
  CollateralShockAssessment,
  MarginBufferStatus,
  SentinelRecommendationAction,
  EventItem,
} from '@/types/domain';
import { CollateralShockAssessmentSchema } from '@/lib/schemas';

export class CollateralShockEngine {
  public static calculateShockAssessment(
    event: EventItem,
    rTokenPosition: SimulatedRTokenPosition,
    usdtCash: SimulatedUsdtCash,
    futuresPosition: SimulatedFuturesPosition,
    policy: CollateralPolicyConfig
  ): CollateralShockAssessment {
    // 1. Calculate pre-shock values
    const preShockCollateralValueUsd = parseFloat(
      (rTokenPosition.quantityTokens * rTokenPosition.markPriceUsd).toFixed(2)
    );
    const preShockAdjustedCollateralUsd = parseFloat(
      (preShockCollateralValueUsd * (rTokenPosition.collateralRatioPct / 100)).toFixed(2)
    );
    const preShockTotalCollateralUsd = parseFloat(
      (preShockAdjustedCollateralUsd + usdtCash.amountUsd).toFixed(2)
    );

    // 2. Map event impact score (-10 to +10) to rToken price shock percentage
    // e.g. Impact score -8.5 maps to -15.0% price shock
    let eventShockPct = 0;
    if (event.category === 'NOISE' || (event.impactScore > -3.0 && event.impactScore < 3.0)) {
      eventShockPct = event.impactScore > 0 ? 1.0 : -1.2; // minimal noise shock
    } else {
      eventShockPct = parseFloat((event.impactScore * 1.8).toFixed(2));
    }

    // 3. Calculate post-shock stressed values
    const stressedRTokenPriceUsd = Math.max(
      0.01,
      parseFloat((rTokenPosition.markPriceUsd * (1 + eventShockPct / 100)).toFixed(2))
    );
    const stressedCollateralValueUsd = parseFloat(
      (rTokenPosition.quantityTokens * stressedRTokenPriceUsd).toFixed(2)
    );
    const stressedAdjustedCollateralUsd = parseFloat(
      (stressedCollateralValueUsd * (rTokenPosition.collateralRatioPct / 100)).toFixed(2)
    );
    const stressedTotalCollateralUsd = parseFloat(
      (stressedAdjustedCollateralUsd + usdtCash.amountUsd).toFixed(2)
    );

    const collateralValueLostUsd = parseFloat(
      Math.max(0, preShockAdjustedCollateralUsd - stressedAdjustedCollateralUsd).toFixed(2)
    );

    const maintenanceMarginRequirementUsd = futuresPosition.maintenanceMarginReqUsd;

    // 4. Calculate Margin Coverage Ratios (Total Collateral / Maintenance Margin)
    const preShockMarginCoverageRatio = parseFloat(
      (preShockTotalCollateralUsd / maintenanceMarginRequirementUsd).toFixed(2)
    );
    const postShockMarginCoverageRatio = parseFloat(
      (stressedTotalCollateralUsd / maintenanceMarginRequirementUsd).toFixed(2)
    );

    // 5. Margin Buffer Status Classification & Action Recommendation
    let marginBufferStatus: MarginBufferStatus = 'HEALTHY';
    let recommendation: SentinelRecommendationAction = 'HOLD_MONITOR';
    let recommendationSummary = '';
    const rationale: string[] = [];

    rationale.push(
      `Ingested overnight catalyst: "${event.title}" (${event.source}) with impact score ${event.impactScore}.`
    );
    rationale.push(
      `Overnight price stress for ${rTokenPosition.symbol}: ${eventShockPct > 0 ? '+' : ''}${eventShockPct}% ($${rTokenPosition.markPriceUsd.toFixed(
        2
      )} → $${stressedRTokenPriceUsd.toFixed(2)}).`
    );
    rationale.push(
      `Illustrative collateral haircut of ${rTokenPosition.haircutPct}% (${rTokenPosition.collateralRatioPct}% ratio) yields $${collateralValueLostUsd.toFixed(
        2
      )} lost collateral value.`
    );
    rationale.push(
      `Simulated futures margin requirement: $${maintenanceMarginRequirementUsd.toFixed(
        2
      )} (${futuresPosition.symbol} at ${futuresPosition.leverageX}x leverage).`
    );

    if (postShockMarginCoverageRatio >= policy.cautionCoverageThreshold) {
      marginBufferStatus = 'HEALTHY';
      recommendation = 'HOLD_MONITOR';
      recommendationSummary = `Margin buffer remains HEALTHY (${postShockMarginCoverageRatio}x coverage vs ${policy.cautionCoverageThreshold}x threshold). Hold positions and monitor overnight news wire.`;
      rationale.push(
        `Post-shock coverage of ${postShockMarginCoverageRatio}x comfortably exceeds caution threshold (${policy.cautionCoverageThreshold}x). No forced deleveraging required.`
      );
    } else if (postShockMarginCoverageRatio >= policy.criticalCoverageThreshold) {
      marginBufferStatus = 'CAUTION';
      recommendation = 'REDUCE_FUTURES_RISK';
      recommendationSummary = `Overnight rToken shock eroded margin buffer into CAUTION zone (${postShockMarginCoverageRatio}x coverage). Proactively reduce futures leverage/position size to prevent liquidation.`;
      rationale.push(
        `Post-shock coverage dropped to ${postShockMarginCoverageRatio}x, below caution threshold (${policy.cautionCoverageThreshold}x) but above critical threshold (${policy.criticalCoverageThreshold}x).`
      );
      rationale.push(
        `Autonomous action: Recommend reducing ${futuresPosition.symbol} futures risk by 30% to restore healthy margin buffer.`
      );
    } else {
      marginBufferStatus = 'CRITICAL';
      recommendation = 'PROTECT_MARGIN_STAND_DOWN';
      recommendationSummary = `CRITICAL MARGIN DEFICIT (${postShockMarginCoverageRatio}x coverage). Immediately protect margin by cutting active futures exposure and standing down on new rToken allocations.`;
      rationale.push(
        `Post-shock coverage of ${postShockMarginCoverageRatio}x breaches critical liquidation threshold (${policy.criticalCoverageThreshold}x).`
      );
      rationale.push(
        `Autonomous action: Emergency stand down on new trades and immediate 50%+ reduction in futures risk required to protect collateral balance.`
      );
    }

    const rawAssessment: CollateralShockAssessment = {
      preShockCollateralValueUsd,
      preShockAdjustedCollateralUsd,
      preShockTotalCollateralUsd,
      eventShockPct,
      stressedRTokenPriceUsd,
      stressedCollateralValueUsd,
      stressedAdjustedCollateralUsd,
      stressedTotalCollateralUsd,
      collateralValueLostUsd,
      maintenanceMarginRequirementUsd,
      preShockMarginCoverageRatio,
      postShockMarginCoverageRatio,
      marginBufferStatus,
      recommendation,
      recommendationSummary,
      rationale,
      assumptionsDisclaimer:
        'SIMULATED PAPER SCENARIO — Illustrative assumptions for paper trading demonstration. Not live Bitget account, wallet, or exchange UTA balance.',
      timestamp: new Date().toISOString(),
    };

    // Validate against strict Zod schema
    return CollateralShockAssessmentSchema.parse(rawAssessment);
  }
}
