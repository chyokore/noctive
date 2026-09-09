# Noctive — Autonomous Overnight Intelligence Agent for Tokenized US Equities

> **Bitget AI Base Camp Hackathon S2**  
> **Track**: Agentic Trading  
> **Sub-theme**: Event-Driven Agent  

Noctive is an autonomous, paper-trading intelligence agent for tokenized US equities (rTokens). Operating during traditional US equity market closures (overnight/weekend 24/7 sessions), Noctive determines whether an overnight price movement in a tokenized asset (e.g., `rNVDA`, `rAAPL`, `rTSLA`, `rMSFT`, `rSPY`) reflects **meaningful fundamental price discovery** or **low-liquidity speculative noise**.

---

## 🛡️ Safe Mode & Competition Statement

> [!IMPORTANT]
> **SIMULATED PAPER TRADING ONLY**: Noctive is strictly a paper-trading demonstration and analysis platform. All paper orders are simulated and are not live trades. It contains **no real-money trading, wallet connections, withdrawal functionality, or live exchange order routing**.

> [!NOTE]
> **DEMO DATA TRANSPARENCY**: Current event and market scenarios are seeded demo data. All pre-packaged scenarios and mock feeds are explicitly tagged with `Demo Data` or `Simulated Feed` badges in full compliance with hackathon rules. No simulated data is represented as live exchange market state.

> [!TIP]
> **PROOF PACKAGE & SYSTEM BOUNDARIES**: Read [docs/competition-proof.md](file:///c:/Users/HP%20840%20G3/Documents/antigravity/dazzling-fermi/docs/competition-proof.md) for full architectural proofs, Mermaid flows, screenshot logs, and explicit system boundary disclaimers.

---

## 🤖 LLM Decision Provider Modes

Noctive implements a typed decision provider interface (`ILLMDecisionProvider`):
1. **Live Qwen Inference**: Live Qwen inference is verified through the official Bitget endpoint (`https://hackathon.bitgetops.com/v1` / `qwen3.8-max`). `QwenDecisionProvider` connects via server-side environment variables configured in `.env.local`:
   - `BITGET_QWEN_API_KEY`: Server-side API key (never exposed to browser or client code; excluded in `.gitignore`).
   - `BITGET_QWEN_BASE_URL`: Official Bitget API endpoint (`https://hackathon.bitgetops.com/v1`).
   - `BITGET_QWEN_MODEL`: Model name (`qwen3.8-max`).
2. **Mock Demo Mode (Fallback)**: `MockLLMDecisionProvider` runs offline out-of-the-box when no API key is present.

> [!NOTE]
> **SECRET ISOLATION**: No proxy credentials, proxy URLs, or API keys are committed to the project source or documentation.

To test Qwen AI mode locally:
```bash
# Ensure BITGET_QWEN_API_KEY is configured in .env.local
npx tsx scripts/test-qwen-connection.ts
```

---

## 💾 Storage Architecture (`ILedgerStore`)

Noctive features a dual-mode persistent storage abstraction:
1. **`LocalFileLedgerStore` (Local Dev/Demo)**: Persists immutable decision receipts to `.data/paper_ledger.json`. (Verified & Active locally).
2. **`DatabaseLedgerStore` (Production PostgreSQL)**: Connects via `DATABASE_URL` environment variable. Automatically initializes database schema using `scripts/init-db.sql`. *(Flagged as development-only until deployed against a live remote database).*

---

## 💡 Core Product Thesis & Problem Solved

Traditional US equity stock exchanges operate during fixed trading hours (9:30 AM – 4:00 PM EST). However, major macroeconomic shifts, SEC Form 8-K earnings previews, geopolitical tariff announcements, and regulatory rulings routinely occur overnight or on weekends.

Tokenized US equities (rTokens) trade 24/7, allowing market participants to react instantly. However, overnight tokenized markets frequently suffer from **thin order books, wide bid-ask spreads, and retail FOMO spikes**, creating false signals.

**Noctive solves this problem by:**
1. Ingesting structured macro, earnings, policy, and legal news evidence overnight.
2. Checking bid-ask spreads and order book liquidity depth to filter out illiquid noise.
3. Generating one autonomous decision (`Enter Long`, `Enter Short / Hedge`, `Reduce Exposure`, or `Stand Down`).
4. Verifying proposed actions against a **deterministic 8-gate risk engine**.
5. Creating immutable audit receipts and validating predictions against US regular market opening gaps in the **Replay Lab**.

---

## 🏗️ System Architecture & Data Flow

```
┌────────────────────────┐      ┌────────────────────────┐
│  Structured Events     │      │   24/7 rToken Market   │
│  (Earnings, Policy)    │      │ (Bid/Ask, Depth Index) │
└───────────┬────────────┘      └───────────┬────────────┘
            │                               │
            └───────────────┬───────────────┘
                            ▼
           ┌─────────────────────────────────┐
           │      LLM Decision Provider      │
           │  (Qwen Live AI or Mock Provider)│
           └────────────────┬────────────────┘
                            ▼
           ┌─────────────────────────────────┐
           │  Autonomous Agent Decision      │
           │  (Long, Short, Stand Down)      │
           └────────────────┬────────────────┘
                            ▼
           ┌─────────────────────────────────┐
           │  Deterministic 8-Gate Risk Engine│
           │  (Size, Spread, Loss Limits)    │
           └───────┬─────────────────┬───────┘
                   │                 │
           PASSED  ▼                 ▼  BLOCKED / STAND DOWN
    ┌──────────────────────┐   ┌───────────────────────────┐
    │ Executed Paper Order │   │ Stand-Down Audit Rationale│
    └──────────┬───────────┘   └─────────────┬─────────────┘
               │                             │
               └──────────────┬──────────────┘
                              ▼
           ┌─────────────────────────────────┐
           │   Immutable Decision Receipt    │
           │  (Payload SHA-256 Signature)    │
           └────────────────┬────────────────┘
                            ▼
           ┌─────────────────────────────────┐
           │      Opening-Gap Replay Lab     │
           │ (Retrospective Lesson Learned)  │
           └─────────────────────────────────┘
```

---

## 🔒 Deterministic 8-Gate Risk Control Matrix

Every proposed trade must pass 8 independent, un-bypassable risk checks before a paper order can be created:

| Rule ID | Rule Name | Requirement / Boundary | Function |
|:---|:---|:---|:---|
| **1. MAX_POSITION_SIZE** | Position Size Limit | Max `$10,000` per trade | Prevents over-concentration in single overnight events |
| **2. MAX_CONCURRENT_POSITIONS** | Active Positions Limit | Max `3` concurrent open positions | Caps total account exposure |
| **3. MIN_CONFIDENCE_THRESHOLD** | Agent Confidence | Min `75%` confidence score | Rejects weak signals |
| **4. VOLATILITY_LIQUIDITY_GUARD** | Spread & Depth Guard | Spread `<= 0.80%` & Depth `>= 60` | Filters out low-liquidity noise |
| **5. COOLDOWN_PERIOD** | Execution Cooldown | `5 minutes` between trades | Stops algorithmic over-trading |
| **6. STOP_LOSS_REQUIRED** | Mandatory Stop-Loss | Configured SL `0% < SL <= 10%` | Ensures downside protection |
| **7. TAKE_PROFIT_REQUIRED** | Mandatory Take-Profit | TP `>=` Stop-Loss | Enforces minimum 1:1 reward-to-risk |
| **8. DAILY_LOSS_LIMIT** | Risk Budget Cap | Max `$2,500` daily cumulative loss | Halts trading if daily limit reached |

---

## 🧪 Pre-packaged Demo Scenarios

Noctive includes 3 pre-configured demo cases accessible via the `/demo-scenarios` page:

1. **Scenario 1: Credible Tech Event → Approved Paper Trade**
   - **Event**: NVIDIA receives unexpected EU AI export clearance overnight (Impact +8.5).
   - **Market Context**: `rNVDA` bid-ask spread 0.11%, liquidity depth 88/100.
   - **Outcome**: Agent proposes `ENTER_LONG`, passes all 8 risk gates, generates a paper order (`$8,500` notional), and issues an immutable receipt.

2. **Scenario 2: Low-Liquidity Speculative Noise → Stand Down**
   - **Event**: Tesla unverified social media rumor regarding battery density (Category: NOISE).
   - **Market Context**: `rTSLA` overnight spike +3.25%, but bid-ask spread is **2.19%** and liquidity depth is **32/100**.
   - **Outcome**: Volatility Guard triggers noise flag. Agent autonomously decides `STAND_DOWN`, saving capital from slippage.

3. **Scenario 3: High-Severity Event → Blocked by Risk Gate**
   - **Event**: Apple faces preliminary $4.2B antitrust fine (Impact -7.8).
   - **Market Context**: `rAAPL` liquid market context. Agent proposes `ENTER_SHORT` hedge.
   - **Outcome**: Account is already at max concurrent positions limit (3/3). The **Risk Gate BLOCKS execution**, rendering a `RISK_BLOCKED` receipt.

---

## 🚀 Vercel & GitHub Deployment Guide

Noctive is structured for zero-configuration serverless deployment on Vercel with persistent PostgreSQL storage and protected automated daily cron paper cycles.

### 1. Required Vercel Environment Variables
Set the following environment variables in your Vercel Project Settings (never commit real values to Git):

| Variable Name | Description | Example / Required Value |
| :--- | :--- | :--- |
| `BITGET_QWEN_API_KEY` | Bitget Qwen API Access Token | *(Your private server-side key)* |
| `BITGET_QWEN_BASE_URL` | Bitget Qwen API Base URL | `https://hackathon.bitgetops.com/v1` |
| `BITGET_QWEN_MODEL` | Bitget Qwen Model Identifier | `qwen3.8-max` |
| `DATABASE_URL` | PostgreSQL Connection String | `postgresql://user:password@ep-host.region.aws.neon.tech/noctive_db?sslmode=require` |
| `CRON_SECRET` | Secret token to authorize Vercel cron calls | *(Random 32-character secret)* |

### 2. Hosted PostgreSQL Database Setup & Migration
Initialize your hosted PostgreSQL database (e.g. Neon, Supabase, or Vercel Postgres) using the provided migration script:
```bash
# Apply initial table schema to remote PostgreSQL instance
psql $DATABASE_URL -f scripts/init-db.sql
```

### 3. Automated Cron Schedule & Endpoint Security
- `vercel.json` configures a once-daily schedule (`0 12 * * *` at 12:00 UTC / 1:00 PM WAT) invoking `/api/cron/paper-cycle`.
- The endpoint strictly enforces `Authorization: Bearer <CRON_SECRET>`. Unauthenticated public calls are rejected with `401 Unauthorized`.

> [!WARNING]
> **NETWORK CONNECTIVITY & PROXY NOTICE**: Vercel serverless functions run directly from Vercel's cloud infrastructure. If access to `https://hackathon.bitgetops.com/v1` requires a proxy or local VPN in your region, Vercel outbound connectivity must be tested separately (or `HTTPS_PROXY` set in Vercel environment variables). If the endpoint is unreachable, Noctive automatically falls back to `MockLLMDecisionProvider` mode without throwing runtime errors.

---

## 🛠️ Execution Scripts & CLI Commands

```bash
# Run Unit Tests (100% Passing)
npm test

# Run Qwen Connection Verification
npx tsx scripts/test-qwen-connection.ts

# Execute Scheduled Autonomous Paper Trade Cycle
npm run cycle

# Capture All 7 Browser Verification Screenshots
npx tsx scripts/take-screenshots.ts

# Production Next.js Build
npm run build
```

---

## 📜 License & Compliance

Developed for the **Bitget AI Base Camp Hackathon S2**.  
All rights reserved. Paper trading simulation only.


