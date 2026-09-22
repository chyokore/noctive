import { NextRequest, NextResponse } from 'next/server';
import { AgentEngine } from '@/lib/engine/agentEngine';
import { RiskEngine } from '@/lib/engine/riskEngine';
import { PaperExchange } from '@/lib/engine/paperExchange';
import { ReceiptGenerator } from '@/lib/engine/receiptGenerator';
import { getLedgerStore, hasOpenPositionForSymbol } from '@/lib/store/persistentStore';
import { LiveEventProvider } from '@/lib/adapters/liveEventProvider';
import { BitgetWalletRwaMarketProvider, APPROVED_EQUITY_WATCHLIST } from '@/lib/adapters/bitgetWalletRwaMarketProvider';
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
  const rwaMarketProvider = new BitgetWalletRwaMarketProvider();

  const events = await liveEventProvider.getLatestEvents();
  const marketProviderDomain = 'bopenapi.bgwapi.io (Bitget Wallet RWA / Reality Protocol)';

  // Rule 1: Find qualifying live SEC events matching approved equity watchlist
  const qualifyingEvents = events.filter((e) =>
    APPROVED_EQUITY_WATCHLIST.includes((e.affectedSymbol || '').toUpperCase())
  );

  if (events.length === 0 || qualifyingEvents.length === 0) {
    const audit = createRunAuditRecord({
      status: 'SAFE_SKIP',
      eventProviderStatus: events.length > 0 ? 'HEALTHY' : 'NO_EVENTS',
      marketProviderStatus: 'HEALTHY',
      qwenInvoked: false,
      decisionCreated: false,
      safeSkipReason: 'No qualifying live SEC event matching approved equity watchlist.',
      marketProviderDomain,
    });

    try {
      await store.saveRunAudit(audit);
    } catch (auditErr) {
      console.warn('[CronPaperCycle] Persistent run audit save failed:', auditErr);
    }

    return NextResponse.json({
      success: true,
      skipped: true,
      reason: 'No qualifying live SEC event matching approved equity watchlist.',
      pipelineStatus: 'NO_QUALIFYING_EVENTS',
      auditId: audit.auditId,
      auditHash: audit.hash,
      cyclesExecuted: 0,
      storeType: store.storeType,
      timestamp: new Date().toISOString(),
    });
  }

  const existingReceipts = await store.getReceipts();
  const generatedReceipts: DecisionReceipt[] = [];
  let lastSkipReason = NO_MARKET_SKIP_REASON;
  let mappedIssuerTicker: string | undefined;
  let mappedRToken: string | undefined;

  for (const evt of qualifyingEvents) {
    const ticker = evt.affectedSymbol.toUpperCase();
    mappedIssuerTicker = ticker;

    // Rule 1 & 2: Resolve matching live Reality quote via stockList -> stockInfo
    const quote = await rwaMarketProvider.getSingleQuote(ticker);

    if (!quote) {
      lastSkipReason = `No verified matching Reality quote available for symbol ${ticker}; competition decision skipped.`;
      console.log(`[CronPaperCycle] ${lastSkipReason}`);
      continue;
    }

    mappedRToken = quote.symbol;

    // Rule 3: Verify market status is OPEN / OVERNIGHT_ACTIVE
    const isMarketOpen = quote.sessionStatus === 'OVERNIGHT_ACTIVE' || quote.sessionStatus === 'REGULAR_CLOSED';
    if (!isMarketOpen) {
      lastSkipReason = `Market status is not OPEN for symbol ${ticker}; paper trade skipped.`;
      console.log(`[CronPaperCycle] ${lastSkipReason}`);
      continue;
    }

    // Rule 3: Check open-position guard
    if (hasOpenPositionForSymbol(existingReceipts, ticker)) {
      lastSkipReason = `Open paper position already exists for symbol ${ticker}; paper trade skipped per position limit guard.`;
      console.log(`[CronPaperCycle] ${lastSkipReason}`);
      continue;
    }

    // Pass verified Reality quote into Qwen + deterministic risk pipeline
    const watchlist = [quote];
    const decision = await agentEngine.evaluateEventAsync(evt, quote, watchlist, INITIAL_RISK_BUDGET);
    const risk = riskEngine.evaluateRisk(decision, quote, INITIAL_RISK_BUDGET);

    if (!risk.isApproved) {
      lastSkipReason = `Deterministic Risk Gate BLOCKED AI proposal: ${risk.blockingReasons.join('; ')}`;
      console.log(`[CronPaperCycle] ${lastSkipReason}`);
      continue;
    }

    // Execute paper order & generate decision receipt with Reality provenance
    const order = paperExchange.executePaperOrder(decision, quote, risk.isApproved);
    const receipt = receiptGenerator.generateReceipt(evt, quote, decision, risk, order);

    await store.saveReceipt(receipt);
    generatedReceipts.push(receipt);
  }

  const isQualified = generatedReceipts.length > 0;
  const audit = createRunAuditRecord({
    status: isQualified ? 'QUALIFIED' : 'SAFE_SKIP',
    eventProviderStatus: 'HEALTHY',
    marketProviderStatus: 'HEALTHY',
    qwenInvoked: isQualified,
    decisionCreated: isQualified,
    safeSkipReason: isQualified ? undefined : lastSkipReason,
    marketProviderDomain,
    mappedIssuerTicker,
    mappedRToken,
  });

  try {
    await store.saveRunAudit(audit);
  } catch (auditErr) {
    console.warn('[CronPaperCycle] Persistent run audit save failed:', auditErr);
  }

  if (!isQualified) {
    console.log(`[CronPaperCycle] Safe Skip: ${lastSkipReason}`);
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: lastSkipReason,
      pipelineStatus: 'SAFE_SKIP',
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
