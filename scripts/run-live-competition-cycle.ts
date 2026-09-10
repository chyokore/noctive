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
import { LiveMarketDataProvider, MarketContextWithProvenance } from '../src/lib/adapters/liveMarketDataProvider';
import { AgentEngine } from '../src/lib/engine/agentEngine';
import { RiskEngine } from '../src/lib/engine/riskEngine';
import { PaperExchange } from '../src/lib/engine/paperExchange';
import { ReceiptGenerator } from '../src/lib/engine/receiptGenerator';
import { INITIAL_RISK_BUDGET } from '../src/lib/store/noctiveStore';
import { PersistentStore } from '../src/lib/store/persistentStore';

const NO_MARKET_SKIP_REASON = 'No verified matching rToken market snapshot; competition decision skipped.';

async function runLiveCompetitionCycle() {
  console.log('====================================================');
  console.log('📡 NOCTIVE LIVE EXTERNAL COMPETITION PAPER CYCLE');
  console.log('====================================================');

  const agentEngine = new AgentEngine();
  const riskEngine = new RiskEngine();
  const paperExchange = new PaperExchange();
  const receiptGenerator = new ReceiptGenerator();
  const store = new PersistentStore();

  const liveEventProvider = new LiveEventProvider();
  const liveMarketProvider = new LiveMarketDataProvider();

  console.log(`LLM Provider Mode: ${agentEngine.getProviderMode()}`);
  console.log(`LLM Provider Name: ${agentEngine.getProviderName()}`);
  console.log(`Store Type: ${store.storeType}`);

  console.log('\nQuerying Bitget public API for verified tokenized-equity market symbols (NVDA, AAPL, MSFT, TSLA, SPY, QQQ)...');
  const watchlist = await liveMarketProvider.getWatchlist();
  console.log(`Bitget Verified Equity Markets Found: ${watchlist.length}`);

  console.log('\nFetching live primary events from SEC EDGAR RSS feed...');
  const events = await liveEventProvider.getLatestEvents();
  console.log(`Mapped SEC Eligible Equity Events Found: ${events.length}`);

  if (events.length === 0 && watchlist.length === 0) {
    console.log('\n----------------------------------------------------');
    console.log('Mapped SEC Issuer Ticker: None retrieved in current window');
    console.log('Mapped rToken: None');
    console.log('Confirmed Bitget Market Symbol: None found on Bitget public API');
    console.log(`Safe Skip Reason: ${NO_MARKET_SKIP_REASON}`);
    console.log('----------------------------------------------------');
    console.log('\n====================================================');
    console.log(`🛑 FAIL-CLOSED: ${NO_MARKET_SKIP_REASON}`);
    console.log('====================================================');
    return;
  }

  let executedCount = 0;

  for (const evt of events) {
    const liveEvt = evt as LiveEventItemWithProvenance;
    const market = watchlist.find((m) => m.symbol === evt.affectedSymbol) as MarketContextWithProvenance | undefined;

    console.log(`\n----------------------------------------------------`);
    console.log(`Mapped SEC Issuer Ticker: ${liveEvt.issuerTicker || 'N/A'}`);
    console.log(`Mapped rToken: ${evt.affectedSymbol}`);
    console.log(`Confirmed Bitget Market Symbol: ${market?.confirmedMarketSymbol || 'NOT_FOUND_ON_BITGET'}`);

    if (!market) {
      console.log(`Safe Skip Reason: ${NO_MARKET_SKIP_REASON}`);
      console.log(`----------------------------------------------------`);
      continue;
    }

    executedCount++;
    console.log(`Event Title: ${evt.title}`);
    console.log(`Source URL: ${liveEvt.externalProvenance?.sourceUrl}`);
    console.log(`Content Hash: ${liveEvt.externalProvenance?.contentHash}`);
    console.log(`Market Price: ${market.symbol} @ $${market.currentPrice} (24h: ${market.change24hPct}%)`);

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
    console.log(`Receipt Saved to Competition Ledger! Hash: ${receipt.hash} (ID: ${receipt.receiptId}, isDemoData: ${receipt.isDemoData})`);
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
