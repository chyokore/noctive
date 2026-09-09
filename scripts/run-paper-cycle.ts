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

import { MOCK_EVENTS } from '../src/lib/adapters/eventProvider';
import { MOCK_WATCHLIST } from '../src/lib/adapters/marketDataProvider';
import { AgentEngine } from '../src/lib/engine/agentEngine';
import { RiskEngine } from '../src/lib/engine/riskEngine';
import { PaperExchange } from '../src/lib/engine/paperExchange';
import { ReceiptGenerator } from '../src/lib/engine/receiptGenerator';
import { INITIAL_RISK_BUDGET } from '../src/lib/store/noctiveStore';
import { PersistentStore } from '../src/lib/store/persistentStore';

async function runPaperCycle() {
  console.log('====================================================');
  console.log('🤖 NOCTIVE AUTONOMOUS OVERNIGHT PAPER TRADING CYCLE');
  console.log('====================================================');

  const agentEngine = new AgentEngine();
  const riskEngine = new RiskEngine();
  const paperExchange = new PaperExchange();
  const receiptGenerator = new ReceiptGenerator();
  const store = new PersistentStore();

  console.log(`Provider Mode: ${agentEngine.getProviderMode()}`);
  console.log(`Provider Name: ${agentEngine.getProviderName()}`);

  const watchlist = Object.values(MOCK_WATCHLIST);
  const events = MOCK_EVENTS;

  console.log(`Processing ${events.length} overnight news events...\n`);

  for (const evt of events) {
    const market = MOCK_WATCHLIST[evt.affectedSymbol] || MOCK_WATCHLIST['rNVDA'];
    console.log(`----------------------------------------------------`);
    console.log(`Event: ${evt.title} (${evt.affectedSymbol})`);
    console.log(`Impact Score: ${evt.impactScore} | Source: ${evt.source}`);

    const decision = await agentEngine.evaluateEventAsync(evt, market, watchlist, INITIAL_RISK_BUDGET);
    console.log(`AI Proposal: ${decision.action} (Confidence: ${decision.confidence}%)`);

    const risk = riskEngine.evaluateRisk(decision, market, INITIAL_RISK_BUDGET);
    console.log(`Deterministic Risk Gate: ${risk.overallStatus}`);

    const order = paperExchange.executePaperOrder(decision, market, risk.isApproved);
    if (risk.isApproved && order.status === 'SIMULATED_FILLED') {
      console.log(`✅ PAPER ORDER CREATED: ${order.side} ${order.quantityTokens} ${order.symbol} @ $${order.entryPrice}`);
    } else {
      console.log(`🛑 NO TRADE EXECUTED: ${risk.blockingReasons[0] || decision.summary}`);
    }

    const receipt = receiptGenerator.generateReceipt(evt, market, decision, risk, order);
    await store.saveReceipt(receipt);
    console.log(`Receipt Hash: ${receipt.hash} (ID: ${receipt.receiptId})`);
  }

  console.log('\n====================================================');
  console.log('✅ PAPER TRADING CYCLE COMPLETE. LEDGER UPDATED.');
  console.log('====================================================');
}

runPaperCycle().catch((err) => {
  console.error('Paper cycle failed:', err);
  process.exit(1);
});
