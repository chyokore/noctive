# Noctive — UTA Sentinel Architecture & Documentation

## Product Overview

**UTA Sentinel** is a collateral-aware overnight risk intelligence agent for tokenized US equities (rTokens).

> [!IMPORTANT]
> **SIMULATED PAPER SCENARIO DISCLAIMER**: Noctive is strictly a paper-trading demonstration and analysis platform. All portfolio balances, rToken mark prices, collateral haircuts (e.g. 20%), USDT cash reserves, and crypto futures maintenance margin requirements are **illustrative assumptions for paper trading simulation only**. Noctive does **not** connect to live Bitget accounts, wallets, UTA balances, or exchange execution endpoints.

---

## The Core Thesis & Problem Solved

Traditional US equity markets close overnight (4:00 PM – 9:30 AM EST). Tokenized US equities (rTokens) trade 24/7. When major overnight macroeconomic shifts or regulatory announcements occur, rTokens experience immediate overnight price discovery.

In a Unified Trading Account (UTA) framework, tokenized assets can serve as portfolio collateral to support active perpetual crypto futures positions (e.g. `BTCUSDT` or `ETHUSDT`). If an overnight rToken fundamental catalyst causes a sharp price drop, the portfolio's collateral value drops while the crypto futures margin requirement remains active, creating a risk of sudden margin call or liquidation before traditional US exchanges open.

**UTA Sentinel solves this by:**
1. Ingesting structured overnight event evidence (e.g. SEC filings, trade tariff updates).
2. Stress-testing rToken collateral values against illustrative haircut ratios (e.g. 80% collateral ratio / 20% haircut).
3. Computing pre- and post-shock **Margin Coverage Ratios** against active crypto futures maintenance margin requirements.
4. Classifying margin buffer health into 3 deterministic states:
   - **`HEALTHY`** (`>= 2.0x` coverage): `HOLD / MONITOR`
   - **`CAUTION`** (`1.3x - 2.0x` coverage): `REDUCE FUTURES RISK`
   - **`CRITICAL`** (`< 1.3x` coverage): `PROTECT MARGIN / STAND DOWN`
5. Issuing immutable SHA-256 Decision Passports with full data and model provenance.

---

## Pure Deterministic Calculation Formulas

```text
1. Gross Collateral Value (Pre-Shock)  = Quantity_rToken * MarkPrice_PreShock
2. Adjusted Collateral Value (Pre-Shock)= GrossCollateralValue * CollateralRatio_Pct (e.g. 80%)
3. Total Available Collateral           = AdjustedCollateralValue + USDT_Cash

4. Stressed rToken Price               = MarkPrice_PreShock * (1 + EventPriceShock_Pct)
5. Stressed Collateral Value            = Quantity_rToken * StressedRTokenPrice * CollateralRatio_Pct
6. Total Stressed Collateral            = StressedCollateralValue + USDT_Cash

7. Collateral Lost                      = AdjustedCollateralValue_PreShock - StressedCollateralValue

8. Pre-Shock Margin Coverage Ratio      = TotalAvailableCollateral_PreShock / Futures_MaintenanceMarginReq
9. Post-Shock Margin Coverage Ratio     = TotalStressedCollateral / Futures_MaintenanceMarginReq
```

---

## Margin Buffer Classification Matrix

| Coverage Ratio (`Post-Shock`) | Buffer Status | Recommended Action | Operational Description |
| :--- | :--- | :--- | :--- |
| **`>= 2.0x`** | **`HEALTHY`** | **`HOLD / MONITOR`** | Margin buffer comfortably absorbs overnight shock. No forced deleveraging required. |
| **`1.3x – 1.99x`** | **`CAUTION`** | **`REDUCE FUTURES RISK`** | Overnight rToken shock eroded margin support into CAUTION zone. Proactively cut futures leverage by 30%. |
| **`< 1.3x`** | **`CRITICAL`** | **`PROTECT MARGIN / STAND DOWN`** | Critical margin deficit near liquidation boundary. Stand down on new trades and cut futures exposure by 50%+. |

---

## Pre-packaged Evaluation Scenarios

1. **High-Impact Stress Scenario (`rNVDA`)**:
   - Overnight EU AI export restriction catalyst (-15.0% `rNVDA` stress).
   - `rNVDA` collateral drops from $20,800 to $17,680 ($3,120 lost).
   - Margin coverage drops from `1.72x` to `1.51x` (`CAUTION` zone).
   - Sentinel Action: `REDUCE_FUTURES_RISK`.

2. **Low-Credibility Noise Scenario (`rTSLA`)**:
   - Unverified social media rumor (-1.2% minor noise).
   - Margin coverage remains at `6.01x` (`HEALTHY` zone).
   - Sentinel Action: `HOLD_MONITOR` (Refuses false urgency).

3. **Critical Margin Deficit Scenario (`rAAPL`)**:
   - Major $4.2B antitrust fine & operational injunction (-22.0% `rAAPL` stress).
   - Margin coverage drops to `1.02x` (`CRITICAL` zone).
   - Sentinel Action: `PROTECT_MARGIN_STAND_DOWN`.

---

## System Boundaries & Limitations

- **Simulated Paper Trading Only**: No live exchange order placement, account login, API keys, or wallet transfers.
- **Illustrative Haircut Ratios**: Uses pre-configured policy assumptions (`UTA-POLICY-v1.4`), not live exchange collateral parameters.
- **Data Provenance**: Explicitly tagged as `Demo Data` or `Live Qwen Connected` in every Decision Passport.
