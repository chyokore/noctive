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

import { LiveEventProvider } from '../src/lib/adapters/liveEventProvider';
import { LiveMarketDataProvider } from '../src/lib/adapters/liveMarketDataProvider';
import { AgentEngine } from '../src/lib/engine/agentEngine';
import { RiskEngine } from '../src/lib/engine/riskEngine';
import { PaperExchange } from '../src/lib/engine/paperExchange';
import { ReceiptGenerator } from '../src/lib/engine/receiptGenerator';
import { INITIAL_RISK_BUDGET } from '../src/lib/store/noctiveStore';
import { PersistentStore } from '../src/lib/store/persistentStore';

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

  console.log('\nFetching live external market tickers from Bitget API...');
  const watchlist = await liveMarketProvider.getWatchlist();
  console.log(`Fetched ${watchlist.length} live spot market tickers.`);

  console.log('\nFetching live primary events from SEC EDGAR RSS feed...');
  const events = await liveEventProvider.getLatestEvents();
  console.log(`Fetched ${events.length} live primary external events.`);

  if (events.length === 0 || watchlist.length === 0) {
    console.log('\n====================================================');
    console.log('⚠️ NO QUALIFYING LIVE EXTERNAL EVENTS OR MARKET TICKERS AVAILABLE.');
    console.log('🛑 FAIL-CLOSED: 0 COMPETITION RECORDS CREATED.');
    console.log('====================================================');
    return;
  }

  console.log(`\nProcessing ${events.length} live external events...\n`);

  for (const evt of events) {
    const market = watchlist.find((m) => m.symbol === evt.affectedSymbol) || watchlist[0];
    const provenance = (evt as any).externalProvenance;

    console.log(`----------------------------------------------------`);
    console.log(`Event Title: ${evt.title}`);
    console.log(`Source URL: ${provenance?.sourceUrl || evt.source}`);
    console.log(`Publisher: ${provenance?.publisherName || 'External Source'}`);
    console.log(`Content Hash: ${provenance?.contentHash || 'N/A'}`);
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

  console.log('\n====================================================');
  console.log('✅ LIVE COMPETITION PAPER CYCLE COMPLETE. LEDGER UPDATED.');
  console.log('====================================================');
}

runLiveCompetitionCycle().catch((err) => {
  console.error('Live competition cycle failed:', err);
  process.exit(1);
});
