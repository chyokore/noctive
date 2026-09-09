import { describe, it, expect } from 'vitest';
import { CollateralShockEngine } from '../src/lib/engine/collateralShockEngine';
import { UTA_SENTINEL_SCENARIOS } from '../src/lib/adapters/utaSentinelScenarios';
import {
  SimulatedRTokenPosition,
  SimulatedUsdtCash,
  SimulatedFuturesPosition,
  CollateralPolicyConfig,
  EventItem,
} from '../src/types/domain';

describe('UTA Sentinel — Collateral Shock Engine & Deterministic Rules', () => {
  const mockPolicy: CollateralPolicyConfig = {
    policyVersion: 'UTA-POLICY-v1.4',
    scenarioAssumptionsVersion: 'ILLUSTRATIVE-ASSUMPTIONS-2026.1',
    illustrativeHaircutPct: 20,
    illustrativeCollateralRatioPct: 80,
    cautionCoverageThreshold: 2.0,
    criticalCoverageThreshold: 1.3,
  };

  const mockPosition: SimulatedRTokenPosition = {
    symbol: 'rNVDA',
    name: 'NVIDIA Tokenized Equity',
    quantityTokens: 200,
    markPriceUsd: 130.0,
    haircutPct: 20,
    collateralRatioPct: 80,
  };

  const mockCash: SimulatedUsdtCash = {
    amountUsd: 5000,
  };

  const mockFutures: SimulatedFuturesPosition = {
    symbol: 'BTCUSDT Perpetual',
    positionSizeUsd: 100000,
    leverageX: 10,
    maintenanceMarginReqUsd: 15000,
  };

  it('should correctly classify a mild/no-shock scenario as HEALTHY and recommend HOLD_MONITOR', () => {
    const mildEvent: EventItem = {
      id: 'evt-test-mild',
      title: 'Minor Earnings Preview Wire',
      source: 'Wire Feed',
      timestamp: new Date().toISOString(),
      category: 'EARNINGS',
      affectedSymbol: 'rNVDA',
      impactScore: 4.0, // positive / mild shock
      rawSnippet: 'Mild positive guidance',
      isDemoData: true,
    };

    // USDT cash: $15,000 to keep margin coverage very healthy
    const healthyCash: SimulatedUsdtCash = { amountUsd: 18000 };

    const assessment = CollateralShockEngine.calculateShockAssessment(
      mildEvent,
      mockPosition,
      healthyCash,
      mockFutures,
      mockPolicy
    );

    expect(assessment.marginBufferStatus).toBe('HEALTHY');
    expect(assessment.recommendation).toBe('HOLD_MONITOR');
    expect(assessment.postShockMarginCoverageRatio).toBeGreaterThanOrEqual(2.0);
  });

  it('should correctly classify a moderate rToken shock as CAUTION and recommend REDUCE_FUTURES_RISK', () => {
    const moderateEvent: EventItem = {
      id: 'evt-test-mod',
      title: 'rNVDA Tariff Investigation',
      source: 'Regulatory Update',
      timestamp: new Date().toISOString(),
      category: 'POLICY',
      affectedSymbol: 'rNVDA',
      impactScore: -8.5,
      rawSnippet: 'Preliminary regulatory restriction',
      isDemoData: true,
    };

    const assessment = CollateralShockEngine.calculateShockAssessment(
      moderateEvent,
      mockPosition,
      mockCash,
      mockFutures,
      mockPolicy
    );

    expect(assessment.marginBufferStatus).toBe('CAUTION');
    expect(assessment.recommendation).toBe('REDUCE_FUTURES_RISK');
    expect(assessment.postShockMarginCoverageRatio).toBeLessThan(2.0);
    expect(assessment.postShockMarginCoverageRatio).toBeGreaterThanOrEqual(1.3);
  });

  it('should correctly classify a catastrophic rToken shock as CRITICAL and recommend PROTECT_MARGIN_STAND_DOWN', () => {
    const severeEvent: EventItem = {
      id: 'evt-test-severe',
      title: 'rNVDA Global Trade Ban',
      source: 'Emergency Wire',
      timestamp: new Date().toISOString(),
      category: 'LEGAL',
      affectedSymbol: 'rNVDA',
      impactScore: -10.0,
      rawSnippet: 'Complete trade halt imposed',
      isDemoData: true,
    };

    // Low cash reserve to trigger critical coverage
    const lowCash: SimulatedUsdtCash = { amountUsd: 1000 };

    const assessment = CollateralShockEngine.calculateShockAssessment(
      severeEvent,
      mockPosition,
      lowCash,
      mockFutures,
      mockPolicy
    );

    expect(assessment.marginBufferStatus).toBe('CRITICAL');
    expect(assessment.recommendation).toBe('PROTECT_MARGIN_STAND_DOWN');
    expect(assessment.postShockMarginCoverageRatio).toBeLessThan(1.3);
  });

  it('should confirm low-credibility noise scenario results in HOLD_MONITOR without forcing protective action', () => {
    const noiseScenario = UTA_SENTINEL_SCENARIOS.find((s) => s.id === 'scen-uta-02');
    expect(noiseScenario).toBeDefined();

    if (noiseScenario) {
      const assessment = CollateralShockEngine.calculateShockAssessment(
        noiseScenario.event,
        noiseScenario.rTokenPosition,
        noiseScenario.usdtCash,
        noiseScenario.futuresPosition,
        noiseScenario.policyConfig
      );

      expect(assessment.marginBufferStatus).toBe('HEALTHY');
      expect(assessment.recommendation).toBe('HOLD_MONITOR');
    }
  });

  it('should evaluate all pre-packaged UTA Sentinel scenarios deterministically and pass Zod validation', () => {
    for (const scen of UTA_SENTINEL_SCENARIOS) {
      const assessment = CollateralShockEngine.calculateShockAssessment(
        scen.event,
        scen.rTokenPosition,
        scen.usdtCash,
        scen.futuresPosition,
        scen.policyConfig
      );

      expect(assessment.marginBufferStatus).toBe(scen.expectedBufferStatus);
      expect(assessment.recommendation).toBe(scen.expectedRecommendation);
      expect(assessment.assumptionsDisclaimer).toContain('SIMULATED PAPER SCENARIO');
    }
  });
});
