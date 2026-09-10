import fs from 'fs';
import path from 'path';

// Safely load .env.local into process.env if present (without printing secrets)
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.substring(0, idx).trim();
      const val = trimmed.substring(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (key && !process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

import { LiveEventProvider, LiveEventItemWithProvenance } from '../src/lib/adapters/liveEventProvider';
import { LiveMarketDataProvider, MarketContextWithProvenance, RTOKEN_EQUITY_MAPPINGS } from '../src/lib/adapters/liveMarketDataProvider';
import { StooqMarketDataProvider, STOCK_REFERENCE_MAPPINGS } from '../src/lib/adapters/stooqMarketDataProvider';
import { AgentEngine } from '../src/lib/engine/agentEngine';
import { RiskEngine } from '../src/lib/engine/riskEngine';
import { PaperExchange } from '../src/lib/engine/paperExchange';
import { ReceiptGenerator } from '../src/lib/engine/receiptGenerator';
import { createRunAuditRecord } from '../src/lib/engine/runAuditGenerator';
import { INITIAL_RISK_BUDGET } from '../src/lib/store/noctiveStore';
import { PersistentStore } from '../src/lib/store/persistentStore';

const NO_MARKET_SKIP_REASON = 'No verified matching rToken market snapshot; competition decision skipped.';

async function runLiveCompetitionCycle() {
  const rawRetrievedTimestamp = new Date().toISOString();
  console.log('====================================================');
  console.log('📡 NOCTIVE LIVE EXTERNAL COMPETITION PAPER CYCLE');
  console.log('====================================================');
  console.log(`Raw Retrieval Timestamp: ${rawRetrievedTimestamp}`);

  const agentEngine = new AgentEngine();
  const riskEngine = new RiskEngine();
  const paperExchange = new PaperExchange();
  const receiptGenerator = new ReceiptGenerator();
  const store = new PersistentStore();

  const liveEventProvider = new LiveEventProvider();
  const liveMarketProvider = new LiveMarketDataProvider();
  const stooqMarketProvider = new StooqMarketDataProvider();

  console.log(`LLM Provider Mode: ${agentEngine.getProviderMode()}`);
  console.log(`LLM Provider Name: ${agentEngine.getProviderName()}`);
  console.log(`Store Type: ${store.storeType}`);

  console.log('\nQuerying Bitget public API for verified exchange market symbols (NVDAUSDT, AAPLUSDT, MSFTUSDT, TSLAUSDT, SPYUSDT, QQQUSDT)...');
  let watchlist = await liveMarketProvider.getWatchlist();

  console.log('\nExchange Market Symbol Resolution Results:');
  Object.values(RTOKEN_EQUITY_MAPPINGS).forEach((mapping) => {
    const found = watchlist.find((m) => m.symbol === mapping.rToken);
    if (found) {
      console.log(`  ✅ ${mapping.rToken} -> ${mapping.exchangeMarketSymbol}: CONFIRMED ($${found.currentPrice})`);
    } else {
      console.log(`  🛑 ${mapping.rToken} -> ${mapping.exchangeMarketSymbol}: NOT LISTED ON BITGET SPOT`);
    }
  });

  let marketProviderDomain = 'api.bitget.com';

  if (watchlist.length === 0) {
    console.log('\nFallback: Querying Stooq for underlying stock reference prices (NVDA.US, AAPL.US, MSFT.US, TSLA.US, SPY.US, QQQ.US)...');
    watchlist = await stooqMarketProvider.getWatchlist();
    if (watchlist.length > 0) {
      marketProviderDomain = 'stooq.com';
      console.log('Underlying Stock Reference Quotes Retrieved from Stooq:');
      Object.values(STOCK_REFERENCE_MAPPINGS).forEach((mapping) => {
        const found = watchlist.find((m) => m.symbol === mapping.rToken);
        if (found) {
          console.log(`  📈 ${mapping.issuerTicker} (${mapping.underlyingStockSymbol}) -> ${mapping.rToken}: $${found.currentPrice} (Data Mode: LIVE_EXTERNAL_UNDERLYING_REFERENCE)`);
        }
      });
    }
  }

  console.log('\nFetching live primary events from SEC EDGAR RSS feed...');
  const events = await liveEventProvider.getLatestEvents();
  console.log(`Mapped SEC Eligible Equity Events Found: ${events.length}`);

  if (events.length > 0) {
    const firstEvt = events[0] as LiveEventItemWithProvenance;
    console.log(`Mapped SEC Event: "${firstEvt.title}" (Issuer: ${firstEvt.issuerTicker} -> rToken: ${firstEvt.affectedSymbol})`);
  } else {
    console.log('Mapped SEC Event: None retrieved in current window');
  }

  if (events.length === 0 || watchlist.length === 0) {
    const audit = createRunAuditRecord({
      status: 'SAFE_SKIP',
      eventProviderStatus: events.length > 0 ? 'HEALTHY' : 'NO_EVENTS',
      marketProviderStatus: watchlist.length > 0 ? 'HEALTHY' : 'UNVERIFIED_EQUITY_MARKET',
      qwenInvoked: false,
      decisionCreated: false,
      safeSkipReason: NO_MARKET_SKIP_REASON,
      marketProviderDomain,
    });
    await store.saveRunAudit(audit);

    console.log('\n----------------------------------------------------');
    console.log(`Qualifying Live Paper Decision: SAFELY SKIPPED`);
    console.log(`Safe Skip Reason: ${NO_MARKET_SKIP_REASON}`);
    console.log(`Run Audit Hash: ${audit.hash} (ID: ${audit.auditId})`);
    console.log('----------------------------------------------------');
    console.log('\n====================================================');
    console.log(`🛑 FAIL-CLOSED: ${NO_MARKET_SKIP_REASON}`);
    console.log('====================================================');
    return;
  }

  let executedCount = 0;

  for (const evt of events) {
    const liveEvt = evt as LiveEventItemWithProvenance;
    const market = watchlist.find((m) => m.symbol === evt.affectedSymbol) as (MarketContextWithProvenance & { underlyingStockSymbol?: string }) | undefined;

    console.log(`\n----------------------------------------------------`);
    console.log(`Mapped SEC Issuer Ticker: ${liveEvt.issuerTicker || 'N/A'}`);
    console.log(`Mapped Conceptual rToken: ${evt.affectedSymbol}`);
    console.log(`Market Reference Domain: ${marketProviderDomain}`);
    if (market?.confirmedMarketSymbol) {
      console.log(`Bitget Live Market Symbol: ${market.confirmedMarketSymbol}`);
    } else if (market?.underlyingStockSymbol) {
      console.log(`Stooq Stock Reference Symbol: ${market.underlyingStockSymbol}`);
    }

    if (!market) {
      const audit = createRunAuditRecord({
        status: 'SAFE_SKIP',
        eventProviderStatus: 'HEALTHY',
        marketProviderStatus: 'UNVERIFIED_EQUITY_MARKET',
        qwenInvoked: false,
        decisionCreated: false,
        safeSkipReason: NO_MARKET_SKIP_REASON,
        mappedIssuerTicker: liveEvt.issuerTicker,
        mappedRToken: evt.affectedSymbol,
        marketProviderDomain,
      });
      await store.saveRunAudit(audit);

      console.log(`Safe Skip Reason: ${NO_MARKET_SKIP_REASON}`);
      console.log(`Run Audit Saved: ${audit.hash} (ID: ${audit.auditId})`);
      console.log(`----------------------------------------------------`);
      continue;
    }

    executedCount++;
    console.log(`Event Title: ${evt.title}`);
    console.log(`Source URL: ${liveEvt.externalProvenance?.sourceUrl}`);
    console.log(`Content Hash: ${liveEvt.externalProvenance?.contentHash}`);
    console.log(`Market Price: ${market.symbol} @ $${market.currentPrice} (${market.externalProvenance?.publisherName || marketProviderDomain})`);

    const decision = await agentEngine.evaluateEventAsync(evt, market, watchlist, INITIAL_RISK_BUDGET);
    console.log(`AI Proposal: ${decision.action} (Confidence: ${decision.confidence}%)`);

    const risk = riskEngine.evaluateRisk(decision, market, INITIAL_RISK_BUDGET);
    console.log(`Deterministic Risk Gate: ${risk.overallStatus}`);

    const order = paperExchange.executePaperOrder(decision, market, risk.isApproved);
    if (risk.isApproved && order.status === 'SIMULATED_FILLED') {
      console.log(`✅ LIVE COMPETITION PAPER ORDER CREATED: ${order.side} ${order.quantityTokens} ${order.symbol} @ $${order.entryPrice}`);
    } else {
      console.log(`🛑 NO TRADE EXECUTED: ${risk.blockingReasons[0] || decision.summary}`);
    }

    const receipt = receiptGenerator.generateReceipt(evt, market, decision, risk, order);
    await store.saveReceipt(receipt);

    const audit = createRunAuditRecord({
      status: 'QUALIFIED',
      eventProviderStatus: 'HEALTHY',
      marketProviderStatus: 'HEALTHY',
      qwenInvoked: true,
      decisionCreated: true,
      mappedIssuerTicker: liveEvt.issuerTicker,
      mappedRToken: evt.affectedSymbol,
      confirmedMarketSymbol: market.confirmedMarketSymbol || market.underlyingStockSymbol,
      marketProviderDomain,
    });
    await store.saveRunAudit(audit);

    console.log(`Receipt Saved to Competition Ledger! Hash: ${receipt.hash} (ID: ${receipt.receiptId})`);
    console.log(`Run Audit Saved: ${audit.hash} (ID: ${audit.auditId})`);
  }

  if (executedCount === 0) {
    console.log('\n====================================================');
    console.log(`🛑 FAIL-CLOSED: ${NO_MARKET_SKIP_REASON}`);
    console.log('====================================================');
    return;
  }

  console.log('\n====================================================');
  console.log('✅ LIVE COMPETITION PAPER CYCLE COMPLETE. LEDGER UPDATED.');
  console.log('====================================================');
}

runLiveCompetitionCycle().catch((err) => {
  console.error('Live competition cycle failed:', err);
  process.exit(1);
});
