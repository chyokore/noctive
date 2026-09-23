import { NextRequest, NextResponse } from 'next/server';
import { AgentEngine } from '@/lib/engine/agentEngine';
import { RiskEngine } from '@/lib/engine/riskEngine';
import { PaperExchange } from '@/lib/engine/paperExchange';
import { ReceiptGenerator } from '@/lib/engine/receiptGenerator';
import { getLedgerStore, hasOpenPositionForSymbol, hasRecentReceiptForSymbol } from '@/lib/store/persistentStore';
import { LiveEventProvider } from '@/lib/adapters/liveEventProvider';
import { BitgetWalletRwaMarketProvider, APPROVED_EQUITY_WATCHLIST, MarketContextWithRwaProvenance } from '@/lib/adapters/bitgetWalletRwaMarketProvider';
import { createRunAuditRecord } from '@/lib/engine/runAuditGenerator';
import { INITIAL_RISK_BUDGET } from '@/lib/store/noctiveStore';
import { DecisionReceipt, RealityMarketSnapshot, EventItem, RealityMarketPulse } from '@/types/domain';
import { evaluateRealityPulse, evaluate24hRealityPulse, createPulseEventItem, collectRealityDiagnostics, formatRealityDiagnosticsText } from '@/lib/engine/realityPulseDetector';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
      {
        status: 401,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
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
      {
        status: 400,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  }

  const store = getLedgerStore();
  const marketProviderDomain = 'bopenapi.bgwapi.io (Bitget Wallet RWA / Reality Protocol)';

  let runStatus: 'QUALIFIED' | 'SAFE_SKIP' = 'SAFE_SKIP';
  let safeSkipReason = 'No live trigger met the review threshold. Audit recorded.';
  let eventProviderStatus: 'HEALTHY' | 'NO_EVENTS' | 'UNAVAILABLE' = 'NO_EVENTS';
  let marketProviderStatus: 'HEALTHY' | 'UNAVAILABLE' = 'UNAVAILABLE';
  let qwenInvoked = false;
  let decisionCreated = false;
  let mappedIssuerTicker: string | undefined;
  let mappedRToken: string | undefined;
  let watchlistQuotes: MarketContextWithRwaProvenance[] = [];
  const prevSnapshotsMap = new Map<string, RealityMarketSnapshot | null>();
  const generatedReceipts: DecisionReceipt[] = [];

  try {
    const liveEventProvider = new LiveEventProvider();
    const rwaMarketProvider = new BitgetWalletRwaMarketProvider();

    // 1. Fetch live Reality quotes for approved equity watchlist (MUST RUN BEFORE SEC CHECK)
    try {
      watchlistQuotes = (await rwaMarketProvider.getWatchlist()) as MarketContextWithRwaProvenance[];
      marketProviderStatus = watchlistQuotes.length > 0 ? 'HEALTHY' : 'UNAVAILABLE';
    } catch (mktErr: any) {
      console.warn('[CronPaperCycle] Watchlist fetch error:', mktErr?.message || mktErr);
      marketProviderStatus = 'UNAVAILABLE';
    }

    const pulseCandidates: { pulse: RealityMarketPulse; pulseEvent: EventItem; quote: MarketContextWithRwaProvenance }[] = [];

    for (const rawQuote of watchlistQuotes) {
      const quote = rawQuote as MarketContextWithRwaProvenance;
      if (!quote || !quote.externalProvenance) continue;

      const ticker = (quote.externalProvenance.underlyingStockSymbol || quote.symbol).toUpperCase().replace(/^R/, '');

      // Persist snapshot safely
      const prevSnapshot = await store.getLatestRealitySnapshot(ticker);
      prevSnapshotsMap.set(ticker, prevSnapshot);

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

      // Trigger 1: Native 24-Hour API Change Ratio Pulse (API_24H_CHANGE)
      const detected24hPulse = evaluate24hRealityPulse(quote);
      if (detected24hPulse) {
        const pulseEvent = createPulseEventItem(detected24hPulse);
        pulseCandidates.push({ pulse: detected24hPulse, pulseEvent, quote });
      }

      // Trigger 2: 30-Minute Snapshot Interval Pulse (SNAPSHOT_30M)
      const detected30mPulse = evaluateRealityPulse(prevSnapshot, quote);
      if (detected30mPulse) {
        const pulseEvent = createPulseEventItem(detected30mPulse);
        pulseCandidates.push({ pulse: detected30mPulse, pulseEvent, quote });
      }
    }

    // 2. Fetch live SEC events
    let events: EventItem[] = [];
    try {
      events = await liveEventProvider.getLatestEvents();
      eventProviderStatus = events.length > 0 ? 'HEALTHY' : 'NO_EVENTS';
    } catch (evtErr: any) {
      console.warn('[CronPaperCycle] Live event fetch error:', evtErr?.message || evtErr);
      eventProviderStatus = 'UNAVAILABLE';
    }

    const qualifyingSecEvents = events.filter((e) =>
      APPROVED_EQUITY_WATCHLIST.includes((e.affectedSymbol || '').toUpperCase())
    );

    const existingReceipts = await store.getReceipts();

    // Process Reality Pulses
    for (const candidate of pulseCandidates) {
      const ticker = candidate.pulse.ticker;
      mappedIssuerTicker = ticker;
      mappedRToken = candidate.pulse.rTokenSymbol;

      if (candidate.quote.externalProvenance) {
        candidate.quote.externalProvenance.triggerProfile = candidate.pulse.triggerProfile;
      }

      if (hasOpenPositionForSymbol(existingReceipts, ticker)) {
        safeSkipReason = `Open paper position already exists for symbol ${ticker}; paper trade skipped per position limit guard.`;
        console.log(`[CronPaperCycle] ${safeSkipReason}`);
        continue;
      }

      if (hasRecentReceiptForSymbol(existingReceipts, ticker, 24 * 60 * 60 * 1000)) {
        safeSkipReason = `Paper decision receipt already exists for symbol ${ticker} within 24-hour cooldown window; paper decision skipped per cooldown guard.`;
        console.log(`[CronPaperCycle] ${safeSkipReason}`);
        continue;
      }

      const agentEngine = new AgentEngine();
      const riskEngine = new RiskEngine();
      const paperExchange = new PaperExchange();
      const receiptGenerator = new ReceiptGenerator();

      const decision = await agentEngine.evaluateEventAsync(
        candidate.pulseEvent,
        candidate.quote,
        [candidate.quote],
        INITIAL_RISK_BUDGET
      );
      qwenInvoked = true;

      const risk = riskEngine.evaluateRisk(decision, candidate.quote, INITIAL_RISK_BUDGET);

      const order = paperExchange.executePaperOrder(decision, candidate.quote, risk.isApproved);
      const receipt = receiptGenerator.generateReceipt(candidate.pulseEvent, candidate.quote, decision, risk, order);

      await store.saveReceipt(receipt);
      generatedReceipts.push(receipt);
      decisionCreated = true;

      if (!risk.isApproved) {
        safeSkipReason = `Verified Live Decision Created (${receipt.status}): Paper Trade Created: NO. Deterministic Risk Gate BLOCKED Reality Pulse: ${risk.blockingReasons.join('; ')}`;
        console.log(`[CronPaperCycle] ${safeSkipReason}`);
      } else if (decision.action === 'STAND_DOWN') {
        safeSkipReason = `Verified Live Decision Created (${receipt.status}): Paper Trade Created: NO. AI proposed STAND_DOWN.`;
        console.log(`[CronPaperCycle] ${safeSkipReason}`);
      } else {
        safeSkipReason = `Verified Live Decision Created (${receipt.status}): Paper Trade Created: YES (${order.side} ${order.quantityTokens} ${order.symbol} @ $${order.entryPrice}).`;
        console.log(`[CronPaperCycle] ${safeSkipReason}`);
      }
    }

    // Process SEC events
    for (const evt of qualifyingSecEvents) {
      const ticker = evt.affectedSymbol.toUpperCase();
      mappedIssuerTicker = ticker;

      const quote = await rwaMarketProvider.getSingleQuote(ticker);

      if (!quote) {
        safeSkipReason = `No verified matching Reality quote available for symbol ${ticker}; competition decision skipped.`;
        console.log(`[CronPaperCycle] ${safeSkipReason}`);
        continue;
      }

      mappedRToken = quote.symbol;

      const isMarketOpen = quote.sessionStatus === 'OVERNIGHT_ACTIVE' || quote.sessionStatus === 'REGULAR_CLOSED';
      if (!isMarketOpen) {
        safeSkipReason = `Market status is not OPEN for symbol ${ticker}; paper trade skipped.`;
        console.log(`[CronPaperCycle] ${safeSkipReason}`);
        continue;
      }

      if (hasOpenPositionForSymbol(existingReceipts, ticker)) {
        safeSkipReason = `Open paper position already exists for symbol ${ticker}; paper trade skipped per position limit guard.`;
        console.log(`[CronPaperCycle] ${safeSkipReason}`);
        continue;
      }

      const agentEngine = new AgentEngine();
      const riskEngine = new RiskEngine();
      const paperExchange = new PaperExchange();
      const receiptGenerator = new ReceiptGenerator();

      const watchlist = [quote];
      const decision = await agentEngine.evaluateEventAsync(evt, quote, watchlist, INITIAL_RISK_BUDGET);
      qwenInvoked = true;

      const risk = riskEngine.evaluateRisk(decision, quote, INITIAL_RISK_BUDGET);

      const order = paperExchange.executePaperOrder(decision, quote, risk.isApproved);
      const receipt = receiptGenerator.generateReceipt(evt, quote, decision, risk, order);

      await store.saveReceipt(receipt);
      generatedReceipts.push(receipt);
      decisionCreated = true;

      if (!risk.isApproved) {
        safeSkipReason = `Verified Live Decision Created (${receipt.status}): Paper Trade Created: NO. Deterministic Risk Gate BLOCKED: ${risk.blockingReasons.join('; ')}`;
        console.log(`[CronPaperCycle] ${safeSkipReason}`);
      } else if (decision.action === 'STAND_DOWN') {
        safeSkipReason = `Verified Live Decision Created (${receipt.status}): Paper Trade Created: NO. AI proposed STAND_DOWN.`;
        console.log(`[CronPaperCycle] ${safeSkipReason}`);
      } else {
        safeSkipReason = `Verified Live Decision Created (${receipt.status}): Paper Trade Created: YES (${order.side} ${order.quantityTokens} ${order.symbol} @ $${order.entryPrice}).`;
        console.log(`[CronPaperCycle] ${safeSkipReason}`);
      }
    }

    if (generatedReceipts.length > 0) {
      runStatus = 'QUALIFIED';
    }
  } catch (uncaughtErr: any) {
    console.error('[CronPaperCycle] Uncaught error during paper cycle execution:', uncaughtErr);
    safeSkipReason = `Pipeline execution error: ${uncaughtErr?.message || String(uncaughtErr)}`;
  } finally {
    if (runStatus === 'SAFE_SKIP') {
      const diagSummary = collectRealityDiagnostics(
        watchlistQuotes,
        prevSnapshotsMap,
        marketProviderStatus === 'UNAVAILABLE' ? 'Bitget Wallet RWA API unavailable or offline' : undefined
      );
      const diagText = formatRealityDiagnosticsText(diagSummary);

      if (safeSkipReason === 'No live trigger met the review threshold. Audit recorded.') {
        safeSkipReason = `No live trigger met the review threshold. Audit recorded. ${diagText}`;
      } else if (!safeSkipReason.includes('Reality Diagnostics:')) {
        safeSkipReason = `${safeSkipReason} ${diagText}`;
      }
    }

    // FINALLY-STYLE GUARANTEE: Always write exactly ONE LiveRunAuditRecord
    const audit = createRunAuditRecord({
      status: runStatus,
      eventProviderStatus,
      marketProviderStatus,
      qwenInvoked,
      decisionCreated,
      safeSkipReason,
      marketProviderDomain,
      mappedIssuerTicker,
      mappedRToken,
    });

    try {
      await store.saveRunAudit(audit);
    } catch (auditErr) {
      console.warn('[CronPaperCycle] Persistent run audit save failed in finally block:', auditErr);
    }

    if (runStatus === 'QUALIFIED') {
      return NextResponse.json(
        {
          success: true,
          message: 'Scheduled live autonomous paper trading cycle completed successfully.',
          safeMode: true,
          paperTradingOnly: true,
          cyclesExecuted: generatedReceipts.length,
          receiptIds: generatedReceipts.map((r) => r.receiptId),
          auditId: audit.auditId,
          auditHash: audit.hash,
          storeType: store.storeType,
          timestamp: new Date().toISOString(),
        },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        skipped: true,
        reason: safeSkipReason,
        pipelineStatus: 'SAFE_SKIP',
        auditId: audit.auditId,
        auditHash: audit.hash,
        cyclesExecuted: 0,
        storeType: store.storeType,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  }
}

export async function GET(request: NextRequest) {
  return handlePaperCycle(request);
}

export async function POST(request: NextRequest) {
  return handlePaperCycle(request);
}
