import { describe, it, expect } from 'vitest';
import {
  computeOvernightMovementRiskStatus,
  computeIllustrativeScenario,
  calculateReferenceAgeText,
  OvernightStressTestEngine,
} from '../src/lib/engine/overnightStressTestEngine';
import { MarketContextWithRwaProvenance } from '../src/lib/adapters/bitgetWalletRwaMarketProvider';

describe('Overnight Collateral Stress Test — Truthfulness & Provenance Boundaries', () => {
  it('should correctly classify Movement Risk Status as Stable for native 24h change < 1.0%', () => {
    const resPositive = computeOvernightMovementRiskStatus(0.85);
    expect(resPositive.movementRiskStatus).toBe('Stable');
    expect(resPositive.recommendedPosture).toBe('No Action');
    expect(resPositive.thresholdRationale).toContain('<1.00%');
    expect(resPositive.thresholdRationale).toContain('Overnight movement risk is stable');

    const resNegative = computeOvernightMovementRiskStatus(-0.45);
    expect(resNegative.movementRiskStatus).toBe('Stable');
    expect(resNegative.recommendedPosture).toBe('No Action');
  });

  it('should correctly classify Movement Risk Status as Watch for native 24h change between 1.0% and 1.49%', () => {
    const resPositive = computeOvernightMovementRiskStatus(1.25);
    expect(resPositive.movementRiskStatus).toBe('Watch');
    expect(resPositive.recommendedPosture).toBe('Monitor');
    expect(resPositive.thresholdRationale).toContain('Early Warning Risk Review');
    expect(resPositive.thresholdRationale).toContain('Overnight movement risk is under watch');

    const resNegative = computeOvernightMovementRiskStatus(-1.15);
    expect(resNegative.movementRiskStatus).toBe('Watch');
    expect(resNegative.recommendedPosture).toBe('Monitor');
  });

  it('should correctly classify Movement Risk Status as Elevated for native 24h change >= 1.5%', () => {
    const resPositive = computeOvernightMovementRiskStatus(1.85);
    expect(resPositive.movementRiskStatus).toBe('Elevated');
    expect(resPositive.recommendedPosture).toBe('Reduce Exposure');
    expect(resPositive.thresholdRationale).toContain('High Conviction Pulse');
    expect(resPositive.thresholdRationale).toContain('Overnight movement risk is elevated');

    const resNegative = computeOvernightMovementRiskStatus(-2.40);
    expect(resNegative.movementRiskStatus).toBe('Elevated');
    expect(resNegative.recommendedPosture).toBe('Reduce Exposure');
  });

  it('should compute fixed illustrative collateral stress scenario math and prominent model disclaimer', () => {
    const scenario = computeIllustrativeScenario(-2.0, 100000, 150);
    expect(scenario.hypotheticalPortfolioUsd).toBe(100000);
    expect(scenario.baseCollateralRatioPct).toBe(150);
    expect(scenario.stressedPortfolioUsd).toBe(98000);
    expect(scenario.bufferImpactUsd).toBe(-2000);
    expect(scenario.stressedCollateralRatioPct).toBe(147);
    expect(scenario.disclaimer).toContain('Fixed Illustrative Model — No Wallet Connected');
    expect(scenario.disclaimer).toContain('not a connected user account');
  });

  it('should trigger liquidation warning when stressed collateral ratio falls below 130%', () => {
    const severeScenario = computeIllustrativeScenario(-15.0, 100000, 150);
    expect(severeScenario.stressedCollateralRatioPct).toBe(127.5);
    expect(severeScenario.isLiquidationWarning).toBe(true);
  });

  it('should calculate underlying stock reference age text properly', () => {
    const nowIso = new Date().toISOString();
    expect(calculateReferenceAgeText(nowIso)).toBe('Just now');

    const tenMinsAgoIso = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    expect(calculateReferenceAgeText(tenMinsAgoIso)).toBe('10 mins ago');

    const twoHoursAgoIso = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(calculateReferenceAgeText(twoHoursAgoIso)).toBe('2 hours ago');
  });

  it('should use Stooq underlying-stock reference label and NEVER include SEC EDGAR in price labels', () => {
    const mockQuote: MarketContextWithRwaProvenance = {
      symbol: 'rNVDA',
      name: 'NVIDIA Tokenized Equity',
      currentPrice: 135.5,
      prevClose: 132.0,
      change24hPct: 2.65,
      bidPrice: 135.4,
      askPrice: 135.6,
      spreadPct: 0.15,
      volume24hUsd: 1200000,
      liquidityDepthIndex: 92,
      sessionStatus: 'OVERNIGHT_ACTIVE',
      isDemoData: false,
      chain: 'arbitrum',
      contractAddress: '0x1234567890abcdef1234567890abcdef12345678',
      externalProvenance: {
        raw24hChangePct: 2.65,
        chain: 'arbitrum',
        contractAddress: '0x1234567890abcdef1234567890abcdef12345678',
        underlyingStockSymbol: 'NVDA',
        sourceUrl: 'https://bopenapi.bgwapi.io/bgw-pro/market/v3/rwa/stockList',
        retrievedAtTimestamp: new Date().toISOString(),
        traceId: 'trace-test-123',
        dataMode: 'BITGET_WALLET_RWA_REALITY_READ_ONLY',
      },
    };

    const stooqQuote = {
      symbol: 'NVDA.US',
      currentPrice: 134.8,
      retrievedAt: new Date().toISOString(),
    };

    const assessment = OvernightStressTestEngine.evaluateQuote(mockQuote, stooqQuote);

    expect(assessment.underlyingReference.source).toBe('Stooq underlying-stock reference');
    expect(assessment.underlyingReference.source).not.toContain('SEC EDGAR');
    expect(assessment.underlyingReference.disclaimer).not.toContain('SEC EDGAR');
    expect(assessment.underlyingReference.isAvailable).toBe(true);
    expect(assessment.underlyingReference.lastClosePrice).toBe(134.8);
  });

  it('should show "Underlying reference unavailable" when no valid Stooq price is present', () => {
    const mockQuote: MarketContextWithRwaProvenance = {
      symbol: 'rNVDA',
      name: 'NVIDIA Tokenized Equity',
      currentPrice: 135.5,
      prevClose: 132.0,
      change24hPct: 0.5,
      bidPrice: 135.4,
      askPrice: 135.6,
      spreadPct: 0.15,
      volume24hUsd: 1200000,
      liquidityDepthIndex: 92,
      sessionStatus: 'OVERNIGHT_ACTIVE',
      isDemoData: false,
      chain: 'arbitrum',
      contractAddress: '0x1234567890abcdef',
      externalProvenance: {
        raw24hChangePct: 0.5,
        chain: 'arbitrum',
        contractAddress: '0x1234567890abcdef',
        underlyingStockSymbol: 'NVDA',
        sourceUrl: 'https://bopenapi.bgwapi.io/bgw-pro/market/v3/rwa/stockList',
        retrievedAtTimestamp: new Date().toISOString(),
        dataMode: 'BITGET_WALLET_RWA_REALITY_READ_ONLY',
      },
    };

    // No stooqQuote passed
    const assessment = OvernightStressTestEngine.evaluateQuote(mockQuote);

    expect(assessment.underlyingReference.name).toBe('Underlying reference unavailable');
    expect(assessment.underlyingReference.source).toBe('Underlying reference unavailable');
    expect(assessment.underlyingReference.lastClosePrice).toBeUndefined();
    expect(assessment.underlyingReference.isAvailable).toBe(false);
  });

  it('should label on-the-fly evaluation as "Deterministic Risk Interpretation" and clearly state it is rule-based', () => {
    const mockQuote: MarketContextWithRwaProvenance = {
      symbol: 'rNVDA',
      name: 'NVIDIA Tokenized Equity',
      currentPrice: 135.5,
      prevClose: 132.0,
      change24hPct: 2.65,
      bidPrice: 135.4,
      askPrice: 135.6,
      spreadPct: 0.15,
      volume24hUsd: 1200000,
      liquidityDepthIndex: 92,
      sessionStatus: 'OVERNIGHT_ACTIVE',
      isDemoData: false,
      chain: 'arbitrum',
      contractAddress: '0x1234567890abcdef1234567890abcdef12345678',
      externalProvenance: {
        raw24hChangePct: 2.65,
        chain: 'arbitrum',
        contractAddress: '0x1234567890abcdef1234567890abcdef12345678',
        underlyingStockSymbol: 'NVDA',
        sourceUrl: 'https://bopenapi.bgwapi.io/bgw-pro/market/v3/rwa/stockList',
        retrievedAtTimestamp: new Date().toISOString(),
        traceId: 'trace-test-123',
        dataMode: 'BITGET_WALLET_RWA_REALITY_READ_ONLY',
      },
    };

    const assessment = OvernightStressTestEngine.evaluateQuote(mockQuote);

    expect(assessment.deterministicRiskInterpretation).toContain('Deterministic Risk Interpretation (Rule-Based):');
    expect(assessment.deterministicRiskInterpretation).toContain('Rule-based evaluation');
    expect(assessment.deterministicRiskInterpretation).not.toContain('Qwen Risk Assessment:');
  });
});
