import { NextRequest, NextResponse } from 'next/server';
import { AgentEngine } from '@/lib/engine/agentEngine';
import { RiskEngine } from '@/lib/engine/riskEngine';
import { PaperExchange } from '@/lib/engine/paperExchange';
import { ReceiptGenerator } from '@/lib/engine/receiptGenerator';
import { getLedgerStore, hasOpenPositionForSymbol } from '@/lib/store/persistentStore';
import { LiveEventProvider } from '@/lib/adapters/liveEventProvider';
import { BitgetWalletRwaMarketProvider, APPROVED_EQUITY_WATCHLIST, MarketContextWithRwaProvenance } from '@/lib/adapters/bitgetWalletRwaMarketProvider';
import { createRunAuditRecord } from '@/lib/engine/runAuditGenerator';
import { INITIAL_RISK_BUDGET } from '@/lib/store/noctiveStore';
import { DecisionReceipt, RealityMarketSnapshot, EventItem, RealityMarketPulse } from '@/types/domain';
import { evaluateRealityPulse, createPulseEventItem } from '@/lib/engine/realityPulseDetector';

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

  // 1. Fetch live Reality quotes for approved equity watchlist (with 1 QPS rate limit)
  const watchlistQuotes = await rwaMarketProvider.getWatchlist();
  const pulseCandidates: { pulse: RealityMarketPulse; pulseEvent: EventItem; quote: MarketContextWithRwaProvenance }[] = [];

  for (const rawQuote of watchlistQuotes) {
    const quote = rawQuote as MarketContextWithRwaProvenance;
    if (!quote || !quote.externalProvenance) continue;

    const ticker = (quote.externalProvenance.underlyingStockSymbol || quote.symbol).toUpperCase().replace(/^R/, '');

    // Persist independent quote snapshot in PostgreSQL / Store
    const prevSnapshot = await store.getLatestRealitySnapshot(ticker);

    const currentSnapshot: RealityMarketSnapshot = {
      snapshotId: `snap-${ticker}-${Date.now()}`,
      ticker,
      rTokenSymbol: quote.symbol,
      chain: quote.chain || 'ethereum',
      contract: quote.contractAddress || '',
      price: quote.currentPrice,
      marketStatus: quote.sessionStatus === 'OVERNIGHT_ACTIVE' ? 'OPEN' : 'CLOSED',
      timestamp: quote.externalProvenance.retrievedAtTimestamp || new Date().toISOString(),
      traceId: quote.externalProvenance.traceId,
      dataSource: 'reality',
    };

    try {
      await store.saveRealitySnapshot(currentSnapshot);
    } catch (snapErr) {
      console.warn(`[CronPaperCycle] Failed to save Reality snapshot for ${ticker}:`, snapErr);
    }

    // Evaluate Reality Market Pulse (30-min window, >=1.5% move, verified Reality data, OPEN status)
    const detectedPulse = evaluateRealityPulse(prevSnapshot, quote);
    if (detectedPulse) {
      const pulseEvent = createPulseEventItem(detectedPulse);
      pulseCandidates.push({ pulse: detectedPulse, pulseEvent, quote });
    }
  }

  // 2. Find qualifying live SEC events matching approved equity watchlist
  const qualifyingSecEvents = events.filter((e) =>
    APPROVED_EQUITY_WATCHLIST.includes((e.affectedSymbol || '').toUpperCase())
  );

  const hasEvents = qualifyingSecEvents.length > 0 || pulseCandidates.length > 0;

  if (!hasEvents) {
    const audit = createRunAuditRecord({
      status: 'SAFE_SKIP',
      eventProviderStatus: events.length > 0 ? 'HEALTHY' : 'NO_EVENTS',
      marketProviderStatus: watchlistQuotes.length > 0 ? 'HEALTHY' : 'UNAVAILABLE',
      qwenInvoked: false,
      decisionCreated: false,
      safeSkipReason: 'No qualifying live SEC event or Reality Market Pulse matching approved equity watchlist.',
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
      reason: 'No qualifying live SEC event or Reality Market Pulse matching approved equity watchlist.',
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

  // Process Reality Market Pulses
  for (const candidate of pulseCandidates) {
    const ticker = candidate.pulse.ticker;
    mappedIssuerTicker = ticker;
    mappedRToken = candidate.pulse.rTokenSymbol;

    if (hasOpenPositionForSymbol(existingReceipts, ticker)) {
      lastSkipReason = `Open paper position already exists for symbol ${ticker}; paper trade skipped per position limit guard.`;
      console.log(`[CronPaperCycle] ${lastSkipReason}`);
      continue;
    }

    const decision = await agentEngine.evaluateEventAsync(
      candidate.pulseEvent,
      candidate.quote,
      [candidate.quote],
      INITIAL_RISK_BUDGET
    );
    const risk = riskEngine.evaluateRisk(decision, candidate.quote, INITIAL_RISK_BUDGET);

    if (!risk.isApproved) {
      lastSkipReason = `Deterministic Risk Gate BLOCKED Reality Pulse AI proposal: ${risk.blockingReasons.join('; ')}`;
      console.log(`[CronPaperCycle] ${lastSkipReason}`);
      continue;
    }

    const order = paperExchange.executePaperOrder(decision, candidate.quote, risk.isApproved);
    const receipt = receiptGenerator.generateReceipt(candidate.pulseEvent, candidate.quote, decision, risk, order);

    await store.saveReceipt(receipt);
    generatedReceipts.push(receipt);
  }

  // Process SEC events
  for (const evt of qualifyingSecEvents) {
    const ticker = evt.affectedSymbol.toUpperCase();
    mappedIssuerTicker = ticker;

    const quote = await rwaMarketProvider.getSingleQuote(ticker);

    if (!quote) {
      lastSkipReason = `No verified matching Reality quote available for symbol ${ticker}; competition decision skipped.`;
      console.log(`[CronPaperCycle] ${lastSkipReason}`);
      continue;
    }

    mappedRToken = quote.symbol;

    const isMarketOpen = quote.sessionStatus === 'OVERNIGHT_ACTIVE' || quote.sessionStatus === 'REGULAR_CLOSED';
    if (!isMarketOpen) {
      lastSkipReason = `Market status is not OPEN for symbol ${ticker}; paper trade skipped.`;
      console.log(`[CronPaperCycle] ${lastSkipReason}`);
      continue;
    }

    if (hasOpenPositionForSymbol(existingReceipts, ticker)) {
      lastSkipReason = `Open paper position already exists for symbol ${ticker}; paper trade skipped per position limit guard.`;
      console.log(`[CronPaperCycle] ${lastSkipReason}`);
      continue;
    }

    const watchlist = [quote];
    const decision = await agentEngine.evaluateEventAsync(evt, quote, watchlist, INITIAL_RISK_BUDGET);
    const risk = riskEngine.evaluateRisk(decision, quote, INITIAL_RISK_BUDGET);

    if (!risk.isApproved) {
      lastSkipReason = `Deterministic Risk Gate BLOCKED AI proposal: ${risk.blockingReasons.join('; ')}`;
      console.log(`[CronPaperCycle] ${lastSkipReason}`);
      continue;
    }

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
