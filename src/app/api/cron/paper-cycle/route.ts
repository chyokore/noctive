import { NextRequest, NextResponse } from 'next/server';
import { AgentEngine } from '@/lib/engine/agentEngine';
import { RiskEngine } from '@/lib/engine/riskEngine';
import { PaperExchange } from '@/lib/engine/paperExchange';
import { ReceiptGenerator } from '@/lib/engine/receiptGenerator';
import { getLedgerStore } from '@/lib/store/persistentStore';
import { MOCK_EVENTS } from '@/lib/adapters/eventProvider';
import { MOCK_WATCHLIST } from '@/lib/adapters/marketDataProvider';
import { INITIAL_RISK_BUDGET } from '@/lib/store/noctiveStore';
import { DecisionReceipt } from '@/types/domain';

async function handlePaperCycle(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized: Invalid or missing Bearer CRON_SECRET authorization header.',
      },
      { status: 401 }
    );
  }

  // On Vercel serverless deployment, refuse execution if persistent PostgreSQL store is missing
  if (process.env.VERCEL && (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === '')) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Database not configured. DATABASE_URL environment variable is required to persist scheduled paper cycle receipts on Vercel serverless deployment.',
        storageMode: 'MEMORY_FALLBACK',
        isPersistent: false,
      },
      { status: 400 }
    );
  }

  const agentEngine = new AgentEngine();
  const riskEngine = new RiskEngine();
  const paperExchange = new PaperExchange();
  const receiptGenerator = new ReceiptGenerator();
  const store = getLedgerStore();

  const watchlist = Object.values(MOCK_WATCHLIST);
  const events = MOCK_EVENTS;
  const generatedReceipts: DecisionReceipt[] = [];

  for (const evt of events) {
    const market = MOCK_WATCHLIST[evt.affectedSymbol] || MOCK_WATCHLIST['rNVDA'];
    const decision = await agentEngine.evaluateEventAsync(evt, market, watchlist, INITIAL_RISK_BUDGET);
    const risk = riskEngine.evaluateRisk(decision, market, INITIAL_RISK_BUDGET);
    const order = paperExchange.executePaperOrder(decision, market, risk.isApproved);
    const receipt = receiptGenerator.generateReceipt(evt, market, decision, risk, order);

    await store.saveReceipt(receipt);
    generatedReceipts.push(receipt);
  }

  return NextResponse.json({
    success: true,
    message: 'Scheduled autonomous paper trading cycle completed successfully.',
    safeMode: true,
    paperTradingOnly: true,
    providerMode: agentEngine.getProviderMode(),
    providerName: agentEngine.getProviderName(),
    storeType: store.storeType,
    cyclesExecuted: generatedReceipts.length,
    receiptIds: generatedReceipts.map((r) => r.receiptId),
    timestamp: new Date().toISOString(),
  });
}

export async function GET(request: NextRequest) {
  return handlePaperCycle(request);
}

export async function POST(request: NextRequest) {
  return handlePaperCycle(request);
}

