import { describe, it, expect } from 'vitest';
import {
  computeOvernightGapRiskStatus,
  computeIllustrativeScenario,
  calculateReferenceAgeText,
  OvernightStressTestEngine,
} from '../src/lib/engine/overnightStressTestEngine';
import { MarketContextWithRwaProvenance } from '../src/lib/adapters/bitgetWalletRwaMarketProvider';

describe('Overnight Collateral Stress Test Engine & Threshold Verification', () => {
  it('should correctly classify Gap Risk Status as Stable for native 24h change < 1.0%', () => {
    const resPositive = computeOvernightGapRiskStatus(0.85);
    expect(resPositive.gapRiskStatus).toBe('Stable');
    expect(resPositive.recommendedPosture).toBe('No Action');
    expect(resPositive.thresholdRationale).toContain('<1.00%');

    const resNegative = computeOvernightGapRiskStatus(-0.45);
    expect(resNegative.gapRiskStatus).toBe('Stable');
    expect(resNegative.recommendedPosture).toBe('No Action');
  });

  it('should correctly classify Gap Risk Status as Watch for native 24h change between 1.0% and 1.49%', () => {
    const resPositive = computeOvernightGapRiskStatus(1.25);
    expect(resPositive.gapRiskStatus).toBe('Watch');
    expect(resPositive.recommendedPosture).toBe('Monitor');
    expect(resPositive.thresholdRationale).toContain('Early Warning Risk Review');

    const resNegative = computeOvernightGapRiskStatus(-1.15);
    expect(resNegative.gapRiskStatus).toBe('Watch');
    expect(resNegative.recommendedPosture).toBe('Monitor');
  });

  it('should correctly classify Gap Risk Status as Elevated for native 24h change >= 1.5%', () => {
    const resPositive = computeOvernightGapRiskStatus(1.85);
    expect(resPositive.gapRiskStatus).toBe('Elevated');
    expect(resPositive.recommendedPosture).toBe('Reduce Exposure');
    expect(resPositive.thresholdRationale).toContain('High Conviction Pulse');

    const resNegative = computeOvernightGapRiskStatus(-2.40);
    expect(resNegative.gapRiskStatus).toBe('Elevated');
    expect(resNegative.recommendedPosture).toBe('Reduce Exposure');
  });

  it('should compute illustrative collateral stress scenario math correctly', () => {
    const scenario = computeIllustrativeScenario(-2.0, 100000, 150);
    expect(scenario.hypotheticalPortfolioUsd).toBe(100000);
    expect(scenario.baseCollateralRatioPct).toBe(150);
    expect(scenario.stressedPortfolioUsd).toBe(98000);
    expect(scenario.bufferImpactUsd).toBe(-2000);
    expect(scenario.stressedCollateralRatioPct).toBe(147);
    expect(scenario.disclaimer).toContain('Illustrative collateral scenario — no wallet connected');
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

  it('should build full OvernightStressTestAssessment with exact required labels & provenance', () => {
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

    expect(assessment.ticker).toBe('NVDA');
    expect(assessment.rTokenSymbol).toBe('rNVDA');
    expect(assessment.latestRTokenPrice).toBe(135.5);
    expect(assessment.native24hChangePct).toBe(2.65);
    expect(assessment.gapRiskStatus).toBe('Elevated');
    expect(assessment.recommendedPosture).toBe('Reduce Exposure');

    // Required label assertions
    expect(assessment.labels.verifiedInput).toBe('Verified Reality market input');
    expect(assessment.labels.underlyingRef).toBe('Underlying reference only');
    expect(assessment.labels.illustrativeScenario).toBe(
      'Illustrative collateral scenario — no wallet connected'
    );
    expect(assessment.labels.notTradeSignal).toBe('Not a trade signal');

    // Provenance assertions
    expect(assessment.provenance.chain).toBe('arbitrum');
    expect(assessment.provenance.contractAddress).toBe(
      '0x1234567890abcdef1234567890abcdef12345678'
    );
    expect(assessment.provenance.sourceEndpoint).toBe(
      'https://bopenapi.bgwapi.io/bgw-pro/market/v3/rwa/stockList'
    );
    expect(assessment.provenance.traceId).toBe('trace-test-123');

    // Qwen Risk Assessment & Underlying Reference assertions
    expect(assessment.qwenRiskAssessment).toContain('Qwen Risk Assessment:');
    expect(assessment.underlyingReference.symbol).toBe('NVDA.US');
    expect(assessment.underlyingReference.disclaimer).toContain('Underlying reference only');
  });
});
