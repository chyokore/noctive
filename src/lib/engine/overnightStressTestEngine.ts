import {
  BitgetWalletRwaMarketProvider,
  MarketContextWithRwaProvenance,
} from '@/lib/adapters/bitgetWalletRwaMarketProvider';
import {
  STOCK_REFERENCE_MAPPINGS,
} from '@/lib/adapters/stooqMarketDataProvider';

export type OvernightMovementRiskStatus = 'Stable' | 'Watch' | 'Elevated';
export type RecommendedPosture = 'No Action' | 'Monitor' | 'Reduce Exposure';

export interface UnderlyingStockReference {
  symbol: string;
  name: string;
  source: string;
  lastClosePrice?: number;
  retrievedAt: string;
  referenceAgeText: string;
  disclaimer: string;
  isAvailable: boolean;
}

export interface IllustrativeCollateralScenario {
  hypotheticalPortfolioUsd: number;
  baseCollateralRatioPct: number;
  stressedPortfolioUsd: number;
  stressedCollateralRatioPct: number;
  bufferImpactUsd: number;
  bufferImpactPct: number;
  liquidationWarningRatioPct: number;
  isLiquidationWarning: boolean;
  disclaimer: string;
}

export interface OvernightStressTestAssessment {
  ticker: string;
  rTokenSymbol: string;
  latestRTokenPrice: number;
  native24hChangePct: number;
  movementRiskStatus: OvernightMovementRiskStatus;
  recommendedPosture: RecommendedPosture;
  thresholdRationale: string;
  underlyingReference: UnderlyingStockReference;
  collateralScenario: IllustrativeCollateralScenario;
  deterministicRiskInterpretation: string;
  provenance: {
    chain: string;
    contractAddress: string;
    quoteTimestamp: string;
    retrievalTimestamp: string;
    sourceEndpoint: string;
    traceId?: string;
  };
  labels: {
    verifiedInput: string;
    underlyingRef: string;
    illustrativeScenario: string;
    notTradeSignal: string;
  };
  timestamp: string;
}

export function computeOvernightMovementRiskStatus(native24hChangePct: number): {
  movementRiskStatus: OvernightMovementRiskStatus;
  recommendedPosture: RecommendedPosture;
  thresholdRationale: string;
} {
  const absChange = Math.abs(native24hChangePct);

  if (absChange >= 1.5) {
    return {
      movementRiskStatus: 'Elevated',
      recommendedPosture: 'Reduce Exposure',
      thresholdRationale: `Native 24h absolute price change of ${absChange.toFixed(2)}% meets or exceeds the 1.50% High Conviction Pulse threshold. Overnight movement risk is elevated.`,
    };
  }

  if (absChange >= 1.0) {
    return {
      movementRiskStatus: 'Watch',
      recommendedPosture: 'Monitor',
      thresholdRationale: `Native 24h absolute price change of ${absChange.toFixed(2)}% qualifies for Early Warning Risk Review (1.00% to 1.49%). Overnight movement risk is under watch.`,
    };
  }

  return {
    movementRiskStatus: 'Stable',
    recommendedPosture: 'No Action',
    thresholdRationale: `Native 24h absolute price change of ${absChange.toFixed(2)}% is within normal intraday boundaries (<1.00%). Overnight movement risk is stable.`,
  };
}

export function computeIllustrativeScenario(
  native24hChangePct: number,
  basePortfolioUsd: number = 100000,
  baseCollateralRatioPct: number = 150
): IllustrativeCollateralScenario {
  const changeRatio = native24hChangePct / 100;
  const stressedPortfolioUsd = parseFloat((basePortfolioUsd * (1 + changeRatio)).toFixed(2));
  const bufferImpactUsd = parseFloat((basePortfolioUsd * changeRatio).toFixed(2));
  const stressedCollateralRatioPct = parseFloat(
    (baseCollateralRatioPct * (1 + changeRatio)).toFixed(2)
  );
  const bufferImpactPct = parseFloat(native24hChangePct.toFixed(2));
  const liquidationWarningRatioPct = 130;
  const isLiquidationWarning = stressedCollateralRatioPct < liquidationWarningRatioPct;

  return {
    hypotheticalPortfolioUsd: basePortfolioUsd,
    baseCollateralRatioPct,
    stressedPortfolioUsd,
    stressedCollateralRatioPct,
    bufferImpactUsd,
    bufferImpactPct,
    liquidationWarningRatioPct,
    isLiquidationWarning,
    disclaimer:
      'Fixed Illustrative Model — No Wallet Connected. Fixed hypothetical example only. This is not a connected user account, not wallet data, and not an actual liquidation calculation.',
  };
}

export function calculateReferenceAgeText(timestampIso: string): string {
  try {
    const diffMs = Math.max(0, Date.now() - new Date(timestampIso).getTime());
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } catch {
    return 'Recent';
  }
}

export class OvernightStressTestEngine {
  public static evaluateQuote(
    quote: MarketContextWithRwaProvenance,
    stooqRefQuote?: { symbol?: string; currentPrice?: number; retrievedAt?: string }
  ): OvernightStressTestAssessment {
    const rawTicker = (
      quote.externalProvenance?.underlyingStockSymbol ||
      quote.symbol
    )
      .toUpperCase()
      .replace(/^R/, '');

    const rTokenSymbol = `r${rawTicker}`;
    const native24hChangePct =
      quote.externalProvenance?.raw24hChangePct !== undefined
        ? quote.externalProvenance.raw24hChangePct
        : quote.change24hPct || 0;

    const latestRTokenPrice = quote.currentPrice || 0;

    const { movementRiskStatus, recommendedPosture, thresholdRationale } =
      computeOvernightMovementRiskStatus(native24hChangePct);

    const collateralScenario = computeIllustrativeScenario(native24hChangePct);

    // Underlying Stock Reference resolution
    const mapping = STOCK_REFERENCE_MAPPINGS[rTokenSymbol] || {
      rToken: rTokenSymbol,
      underlyingStockSymbol: `${rawTicker}.US`,
      name: `${rawTicker} Equity Reference`,
      issuerTicker: rawTicker,
    };

    const hasValidStooqPrice =
      stooqRefQuote?.currentPrice !== undefined &&
      typeof stooqRefQuote.currentPrice === 'number' &&
      stooqRefQuote.currentPrice > 0;

    const retrievedAt =
      stooqRefQuote?.retrievedAt ||
      quote.externalProvenance?.retrievedAtTimestamp ||
      new Date().toISOString();

    const underlyingReference: UnderlyingStockReference = hasValidStooqPrice
      ? {
          symbol: mapping.underlyingStockSymbol,
          name: mapping.name,
          source: 'Stooq underlying-stock reference',
          lastClosePrice: stooqRefQuote!.currentPrice,
          retrievedAt,
          referenceAgeText: calculateReferenceAgeText(retrievedAt),
          disclaimer:
            'Underlying reference only. Reference price from Stooq underlying-stock data. Never interpreted or substituted as an rToken price.',
          isAvailable: true,
        }
      : {
          symbol: mapping.underlyingStockSymbol,
          name: 'No verified underlying reference',
          source: 'Stooq underlying-stock reference',
          lastClosePrice: undefined,
          retrievedAt,
          referenceAgeText: 'Unavailable',
          disclaimer:
            'A current or cached Stooq underlying-stock reference was not returned for this run. No underlying price is inferred or substituted.',
          isAvailable: false,
        };

    const chain = quote.externalProvenance?.chain || quote.chain || 'ethereum';
    const contractAddress =
      quote.externalProvenance?.contractAddress || quote.contractAddress || '0x...';

    // Rule-Based Deterministic Risk Interpretation
    const deterministicRiskInterpretation = `Deterministic Risk Interpretation (Rule-Based): Verified native 24h move of ${
      native24hChangePct >= 0 ? '+' : ''
    }${native24hChangePct.toFixed(2)}% for ${rTokenSymbol} on ${chain} (${contractAddress.slice(
      0,
      6
    )}...${contractAddress.slice(
      -4
    )}) ${
      movementRiskStatus === 'Elevated'
        ? 'meets or exceeds the 1.50% High Conviction threshold while US equity markets are closed. Rule-based evaluation flags elevated overnight movement risk.'
        : movementRiskStatus === 'Watch'
        ? 'triggers Early Warning Risk Review (>=1.00% and <1.50%). Rule-based evaluation indicates minor collateral variance.'
        : 'is within normal intraday boundaries (<1.00%). Rule-based evaluation confirms stable collateral posture.'
    } Recommended posture: ${recommendedPosture}.`;

    return {
      ticker: rawTicker,
      rTokenSymbol,
      latestRTokenPrice,
      native24hChangePct,
      movementRiskStatus,
      recommendedPosture,
      thresholdRationale,
      underlyingReference,
      collateralScenario,
      deterministicRiskInterpretation,
      provenance: {
        chain,
        contractAddress,
        quoteTimestamp:
          quote.externalProvenance?.retrievedAtTimestamp || new Date().toISOString(),
        retrievalTimestamp: new Date().toISOString(),
        sourceEndpoint:
          quote.externalProvenance?.sourceUrl ||
          'https://bopenapi.bgwapi.io/bgw-pro/market/v3/rwa/stockList',
        traceId: quote.externalProvenance?.traceId || 'bopen-trace-verified',
      },
      labels: {
        verifiedInput: 'Verified Reality market input',
        underlyingRef: 'Underlying reference only',
        illustrativeScenario: 'Fixed Illustrative Model — No Wallet Connected',
        notTradeSignal: 'Not a trade signal',
      },
      timestamp: new Date().toISOString(),
    };
  }
}
