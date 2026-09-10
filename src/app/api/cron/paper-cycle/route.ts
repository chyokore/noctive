import { NextRequest, NextResponse } from 'next/server';
import { AgentEngine } from '@/lib/engine/agentEngine';
import { RiskEngine } from '@/lib/engine/riskEngine';
import { PaperExchange } from '@/lib/engine/paperExchange';
import { ReceiptGenerator } from '@/lib/engine/receiptGenerator';
import { getLedgerStore } from '@/lib/store/persistentStore';
import { LiveEventProvider } from '@/lib/adapters/liveEventProvider';
import { LiveMarketDataProvider } from '@/lib/adapters/liveMarketDataProvider';
import { createRunAuditRecord } from '@/lib/engine/runAuditGenerator';
import { INITIAL_RISK_BUDGET } from '@/lib/store/noctiveStore';
import { DecisionReceipt } from '@/types/domain';

const NO_MARKET_SKIP_REASON = 'No verified matching rToken market snapshot; competition decision skipped.';

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

  const liveEventProvider = new LiveEventProvider();
  const liveMarketProvider = new LiveMarketDataProvider();

  const events = await liveEventProvider.getLatestEvents();
  const watchlist = await liveMarketProvider.getWatchlist();

  // Fail-closed requirement: If no qualifying live external equity events or confirmed Bitget market tickers available, skip execution and record run audit
  if (events.length === 0 || watchlist.length === 0) {
    const audit = createRunAuditRecord({
      status: 'SAFE_SKIP',
      eventProviderStatus: events.length > 0 ? 'HEALTHY' : 'NO_EVENTS',
      marketProviderStatus: watchlist.length > 0 ? 'HEALTHY' : 'UNVERIFIED_EQUITY_MARKET',
      qwenInvoked: false,
      decisionCreated: false,
      safeSkipReason: NO_MARKET_SKIP_REASON,
    });

    try {
      await store.saveRunAudit(audit);
    } catch (auditErr) {
      console.warn('[CronPaperCycle] Persistent run audit save failed:', auditErr);
    }

    console.log(`[CronPaperCycle] ${NO_MARKET_SKIP_REASON}`);
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: NO_MARKET_SKIP_REASON,
      pipelineStatus: 'NO_QUALIFYING_EVENTS',
      auditId: audit.auditId,
      auditHash: audit.hash,
      cyclesExecuted: 0,
      storeType: store.storeType,
      timestamp: new Date().toISOString(),
    });
  }

  const generatedReceipts: DecisionReceipt[] = [];

  try {
    for (const evt of events) {
      const market = watchlist.find((m) => m.symbol === evt.affectedSymbol);
      if (!market) {
        console.log(`[CronPaperCycle] ${NO_MARKET_SKIP_REASON} (Symbol: ${evt.affectedSymbol})`);
        continue;
      }

      const decision = await agentEngine.evaluateEventAsync(evt, market, watchlist, INITIAL_RISK_BUDGET);
      const risk = riskEngine.evaluateRisk(decision, market, INITIAL_RISK_BUDGET);
      const order = paperExchange.executePaperOrder(decision, market, risk.isApproved);
      const receipt = receiptGenerator.generateReceipt(evt, market, decision, risk, order);

      await store.saveReceipt(receipt);
      generatedReceipts.push(receipt);
    }
  } catch (err: any) {
    const rawMsg = err.message || 'Unknown database write error';
    const sanitizedMsg = rawMsg.replace(/postgresql:\/\/[^@]+@/gi, 'postgresql://***:***@');
    console.error(`[CronPaperCycle] Persistent receipt saving failed: ${sanitizedMsg}`);

    return NextResponse.json(
      {
        success: false,
        error: `Persistent receipt saving failed: ${sanitizedMsg}`,
        storageMode: store.storeType,
      },
      { status: 500 }
    );
  }

  const isQualified = generatedReceipts.length > 0;
  const audit = createRunAuditRecord({
    status: isQualified ? 'QUALIFIED' : 'SAFE_SKIP',
    eventProviderStatus: 'HEALTHY',
    marketProviderStatus: isQualified ? 'HEALTHY' : 'UNVERIFIED_EQUITY_MARKET',
    qwenInvoked: isQualified,
    decisionCreated: isQualified,
    safeSkipReason: isQualified ? undefined : NO_MARKET_SKIP_REASON,
  });

  try {
    await store.saveRunAudit(audit);
  } catch (auditErr) {
    console.warn('[CronPaperCycle] Persistent run audit save failed:', auditErr);
  }

  if (!isQualified) {
    console.log(`[CronPaperCycle] ${NO_MARKET_SKIP_REASON}`);
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: NO_MARKET_SKIP_REASON,
      pipelineStatus: 'NO_QUALIFYING_EVENTS',
      auditId: audit.auditId,
      auditHash: audit.hash,
      cyclesExecuted: 0,
      storeType: store.storeType,
      timestamp: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    success: true,
    message: 'Scheduled live autonomous paper trading cycle completed successfully.',
    safeMode: true,
    paperTradingOnly: true,
    providerMode: agentEngine.getProviderMode(),
    providerName: agentEngine.getProviderName(),
    storeType: store.storeType,
    cyclesExecuted: generatedReceipts.length,
    receiptIds: generatedReceipts.map((r) => r.receiptId),
    auditId: audit.auditId,
    auditHash: audit.hash,
    timestamp: new Date().toISOString(),
  });
}

export async function GET(request: NextRequest) {
  return handlePaperCycle(request);
}

export async function POST(request: NextRequest) {
  return handlePaperCycle(request);
}
