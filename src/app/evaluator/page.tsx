import React from 'react';
import Link from 'next/link';
import { PersistentStore, getLedgerStoreInfo } from '@/lib/store/persistentStore';
import { computeLivePerformanceMetrics } from '@/components/PerformanceValidationSection';
import { ExportAuditJsonButton } from '@/components/ExportAuditJsonButton';
import {
  Clock,
  ArrowRight,
  Radio,
  Zap,
  Database,
  Trophy,
  Layers,
  FileCheck2,
  Activity,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EvaluatorPackPage() {
  let allReceipts: any[] = [];
  let audits: any[] = [];
  let storageInfo: any = null;
  let isLiveDataUnavailable = false;

  try {
    const store = new PersistentStore();
    allReceipts = (await store.getReceipts()) || [];
    audits = (await store.getRunAudits()) || [];
    storageInfo = getLedgerStoreInfo();
  } catch (err) {
    console.error('[EvaluatorPackPage] Server-side store read error:', err);
    isLiveDataUnavailable = true;
    allReceipts = [];
    audits = [];
    storageInfo = null;
  }

  const liveReceipts = Array.isArray(allReceipts) ? allReceipts.filter((r) => r && !r.isDemoData) : [];
  const newestLiveReceipt = [...liveReceipts].sort(
    (a, b) => new Date(b?.timestamp || 0).getTime() - new Date(a?.timestamp || 0).getTime()
  )[0];

  const newestReceiptId = newestLiveReceipt?.receiptId || (newestLiveReceipt as any)?.id;
  const newestTargetSymbol =
    newestLiveReceipt?.event?.affectedSymbol ||
    newestLiveReceipt?.marketContext?.symbol ||
    newestLiveReceipt?.agentDecision?.targetSymbol ||
    'rToken';

  let computedMetrics;
  try {
    computedMetrics = computeLivePerformanceMetrics(allReceipts, audits);
  } catch (err) {
    console.error('[EvaluatorPackPage] Metric computation error:', err);
    isLiveDataUnavailable = true;
    computedMetrics = computeLivePerformanceMetrics([], []);
  }

  return (
    <div className="space-y-10">
      {/* 1. Hero Section */}
      <div className="bg-navy-900 border border-navy-800 p-6 sm:p-8 rounded-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
              NOCTIVE EVALUATOR PACK
            </span>
          </div>
          <span className="px-3 py-1 rounded-full bg-electric-500/10 text-electric-400 border border-electric-500/30 text-xs font-mono font-bold">
            Paper-only • No wallet connected • No live orders
          </span>
        </div>

        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Noctive Evaluator Pack
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-4xl mt-2 leading-relaxed">
            Overnight collateral-risk intelligence for tokenized US equities, backed by verified Reality inputs, Qwen assessment, deterministic safeguards, and paper-only decision receipts.
          </p>
        </div>
      </div>

      {/* 2. Review Noctive in 90 Seconds */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-electric-400" />
          <h2 className="font-sans font-bold text-xl text-white">
            Review Noctive in 90 Seconds
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/market-pulse"
            className="p-5 rounded-2xl bg-navy-900 border border-navy-800 hover:border-electric-500/50 hover:bg-navy-850/80 transition-all space-y-3 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl font-mono font-extrabold text-electric-400">01</span>
              <Radio className="w-5 h-5 text-slate-500 group-hover:text-electric-400 transition-colors" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-base text-white group-hover:text-electric-300 flex items-center justify-between">
                <span>View Market Pulse</span>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Verified Bitget Wallet Reality rToken quotes.
              </p>
            </div>
          </Link>

          <Link
            href="/overnight-stress-test"
            className="p-5 rounded-2xl bg-navy-900 border border-navy-800 hover:border-electric-500/50 hover:bg-navy-850/80 transition-all space-y-3 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl font-mono font-extrabold text-electric-400">02</span>
              <Zap className="w-5 h-5 text-slate-500 group-hover:text-electric-400 transition-colors" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-base text-white group-hover:text-electric-300 flex items-center justify-between">
                <span>View Overnight Stress</span>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Deterministic overnight movement-risk interpretation and fixed illustrative collateral model.
              </p>
            </div>
          </Link>

          <Link
            href="/decision-ledger"
            className="p-5 rounded-2xl bg-navy-900 border border-navy-800 hover:border-electric-500/50 hover:bg-navy-850/80 transition-all space-y-3 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl font-mono font-extrabold text-electric-400">03</span>
              <Database className="w-5 h-5 text-slate-500 group-hover:text-electric-400 transition-colors" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-base text-white group-hover:text-electric-300 flex items-center justify-between">
                <span>Inspect Live Decisions</span>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Qwen-assessed, risk-governed paper-only receipts.
              </p>
            </div>
          </Link>

          <Link
            href="/competition-log"
            className="p-5 rounded-2xl bg-navy-900 border border-navy-800 hover:border-electric-500/50 hover:bg-navy-850/80 transition-all space-y-3 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl font-mono font-extrabold text-electric-400">04</span>
              <Trophy className="w-5 h-5 text-slate-500 group-hover:text-electric-400 transition-colors" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-base text-white group-hover:text-electric-300 flex items-center justify-between">
                <span>Verify Competition Log</span>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Persistent run audits and dated ledger evidence.
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* 3. Event-Driven Agent Loop (Track Alignment) */}
      <div className="p-6 rounded-2xl bg-navy-900 border border-navy-800 space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-electric-400" />
          <h2 className="font-sans font-bold text-xl text-white">
            Event-Driven Agent Loop
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-center text-xs font-mono">
          <div className="p-3 rounded-xl bg-navy-950 border border-navy-800 flex flex-col justify-center items-center">
            <span className="text-electric-400 font-bold block mb-1">Step 1</span>
            <span className="text-slate-200">Verified Event / Movement</span>
          </div>
          <div className="p-3 rounded-xl bg-navy-950 border border-navy-800 flex flex-col justify-center items-center">
            <span className="text-electric-400 font-bold block mb-1">Step 2</span>
            <span className="text-slate-200">Qwen Assessment</span>
          </div>
          <div className="p-3 rounded-xl bg-navy-950 border border-navy-800 flex flex-col justify-center items-center">
            <span className="text-electric-400 font-bold block mb-1">Step 3</span>
            <span className="text-slate-200">Deterministic Risk Gate</span>
          </div>
          <div className="p-3 rounded-xl bg-navy-950 border border-navy-800 flex flex-col justify-center items-center">
            <span className="text-electric-400 font-bold block mb-1">Step 4</span>
            <span className="text-slate-200">Paper-Only Outcome</span>
          </div>
          <div className="p-3 rounded-xl bg-navy-950 border border-navy-800 flex flex-col justify-center items-center">
            <span className="text-electric-400 font-bold block mb-1">Step 5</span>
            <span className="text-slate-200">Persistent Receipt & Audit</span>
          </div>
        </div>
      </div>

      {/* 4. What Noctive Proves (Evidence Table) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileCheck2 className="w-5 h-5 text-electric-400" />
          <h2 className="font-sans font-bold text-xl text-white">
            What Noctive Proves
          </h2>
        </div>

        <div className="bg-navy-900 border border-navy-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-navy-950/80 text-slate-400 uppercase border-b border-navy-800">
                  <th className="p-4 w-1/4">Evidence</th>
                  <th className="p-4 w-5/12">What it demonstrates</th>
                  <th className="p-4 w-1/3">Boundary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800/60 text-slate-300">
                <tr className="hover:bg-navy-850/40">
                  <td className="p-4 font-bold text-white">Bitget Wallet Reality quotes</td>
                  <td className="p-4">Verified rToken market inputs and provenance</td>
                  <td className="p-4 text-slate-400">Read-only market data</td>
                </tr>
                <tr className="hover:bg-navy-850/40">
                  <td className="p-4 font-bold text-white">SEC EDGAR events</td>
                  <td className="p-4">Live filing-event context</td>
                  <td className="p-4 text-slate-400">Filing source, not price data</td>
                </tr>
                <tr className="hover:bg-navy-850/40">
                  <td className="p-4 font-bold text-white">Qwen risk assessment</td>
                  <td className="p-4">Structured assessment on genuinely evaluated live decision receipts</td>
                  <td className="p-4 text-slate-400">Qwen does not bypass deterministic rules</td>
                </tr>
                <tr className="hover:bg-navy-850/40">
                  <td className="p-4 font-bold text-white">Deterministic risk gates</td>
                  <td className="p-4">Position, confidence, liquidity, volatility, stop-loss and exposure controls</td>
                  <td className="p-4 text-slate-400">A blocked or stand-down outcome is a valid safety result</td>
                </tr>
                <tr className="hover:bg-navy-850/40">
                  <td className="p-4 font-bold text-white">Paper execution receipts</td>
                  <td className="p-4">Auditable simulated decision outcomes</td>
                  <td className="p-4 text-slate-400">No real funds, wallet connection, or live order execution</td>
                </tr>
                <tr className="hover:bg-navy-850/40">
                  <td className="p-4 font-bold text-white">Overnight Stress Test</td>
                  <td className="p-4">Rule-based rToken movement-risk interpretation</td>
                  <td className="p-4 text-slate-400">Fixed illustrative model, not a user account or liquidation calculation</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 5. Live Evidence Snapshot */}
      <div className="space-y-4">
        {isLiveDataUnavailable && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-semibold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Live evidence is temporarily unavailable. Verification links remain available.</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-electric-400" />
            <h2 className="font-sans font-bold text-xl text-white">
              Live Evidence Snapshot
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Window: <strong className="text-slate-200">{computedMetrics.runWindowText}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 font-mono">
          <div className="p-3 rounded-xl bg-navy-900 border border-navy-800">
            <span className="text-[10px] text-slate-400 uppercase block">Audits</span>
            <span className="text-lg font-bold text-white block mt-1">
              {computedMetrics.scheduledCycleCount}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-navy-900 border border-navy-800">
            <span className="text-[10px] text-slate-400 uppercase block">Decisions</span>
            <span className="text-lg font-bold text-white block mt-1">
              {computedMetrics.totalLiveDecisions}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-navy-900 border border-navy-800">
            <span className="text-[10px] text-slate-400 uppercase block">Approved</span>
            <span className="text-lg font-bold text-emerald-400 block mt-1">
              {computedMetrics.approvedCount}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-navy-900 border border-navy-800">
            <span className="text-[10px] text-slate-400 uppercase block">Blocked</span>
            <span className="text-lg font-bold text-rose-400 block mt-1">
              {computedMetrics.riskBlockedCount}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-navy-900 border border-navy-800">
            <span className="text-[10px] text-slate-400 uppercase block">Stand-Down</span>
            <span className="text-lg font-bold text-amber-400 block mt-1">
              {computedMetrics.standDownCount}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-navy-900 border border-navy-800">
            <span className="text-[10px] text-slate-400 uppercase block">Sim PnL</span>
            <span className="text-lg font-bold text-emerald-400 block mt-1">
              {computedMetrics.simulatedPnlUsd >= 0 ? '+' : ''}${computedMetrics.simulatedPnlUsd.toFixed(2)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-navy-900 border border-navy-800">
            <span className="text-[10px] text-slate-400 uppercase block">Max DD</span>
            <span className="text-lg font-bold text-slate-200 block mt-1">
              {computedMetrics.maxDrawdownPct.toFixed(2)}%
            </span>
          </div>

          <div className="p-3 rounded-xl bg-navy-900 border border-navy-800 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-400 uppercase block">Win Rate</span>
            <span className="text-xs font-bold text-amber-300 block mt-1 truncate" title={computedMetrics.winRateDisplay}>
              {computedMetrics.winRateDisplay}
            </span>
          </div>
        </div>
      </div>

      {/* 6. Evaluation Boundaries */}
      <div className="p-6 rounded-2xl bg-navy-900 border border-amber-500/30 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <h2 className="font-sans font-bold text-xl text-white">
            Evaluation Boundaries
          </h2>
        </div>

        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs sm:text-sm font-mono text-amber-300 leading-relaxed font-semibold">
          Live inputs and decision audits are real. All execution outcomes are paper-only. Noctive does not connect to user wallets, place live orders, or claim real-capital performance.
        </div>

        <ul className="space-y-2 text-xs font-mono text-slate-300 list-disc list-inside leading-relaxed">
          <li>Historical Reality candles are displayed only when the official authenticated Kline endpoint returns valid data.</li>
          <li>Underlying-stock references are labelled separately and are never substituted for rToken prices.</li>
          <li>The Overnight Stress Test is a fixed illustrative model, not account-level advice.</li>
        </ul>
      </div>

      {/* 7. Verification Links */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ExternalLink className="w-5 h-5 text-electric-400" />
          <h2 className="font-sans font-bold text-xl text-white">
            Verification Links
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Dynamic Latest Live Decision Receipt Link */}
          <div className="p-5 rounded-2xl bg-navy-900 border border-navy-800 flex flex-col justify-between space-y-3">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block">
                Latest Live Decision Receipt
              </span>
              {newestLiveReceipt ? (
                <div className="mt-2 space-y-1">
                  <span className="text-sm font-mono font-bold text-white block">
                    {newestTargetSymbol} — {newestLiveReceipt.status}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 block truncate">
                    ID: {newestReceiptId}
                  </span>
                </div>
              ) : (
                <span className="text-xs font-mono text-amber-400 block mt-2">
                  No live decision receipt available yet.
                </span>
              )}
            </div>

            {newestLiveReceipt ? (
              <Link
                href={`/decision/${newestReceiptId}`}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-electric-500/10 border border-electric-500/30 text-xs font-mono text-electric-400 hover:bg-electric-500/20 transition-all font-bold"
              >
                <span>Inspect Live Decision</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <span className="text-xs font-mono text-slate-500 italic">
                Awaiting next live event trigger
              </span>
            )}
          </div>

          <Link
            href="/decision-ledger"
            className="p-5 rounded-2xl bg-navy-900 border border-navy-800 hover:border-electric-500/50 hover:bg-navy-850/80 transition-all flex flex-col justify-between space-y-3 group"
          >
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block">
                Decision Ledger
              </span>
              <span className="text-sm font-mono font-bold text-white mt-1 block group-hover:text-electric-300">
                Full Auditable Receipts
              </span>
              <span className="text-xs text-slate-400 block mt-1">
                View all approved, risk-blocked, and stand-down decision receipts.
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs font-mono text-electric-400 font-bold">
              <span>Open Decision Ledger</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/competition-log"
            className="p-5 rounded-2xl bg-navy-900 border border-navy-800 hover:border-electric-500/50 hover:bg-navy-850/80 transition-all flex flex-col justify-between space-y-3 group"
          >
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block">
                Competition Log
              </span>
              <span className="text-sm font-mono font-bold text-white mt-1 block group-hover:text-electric-300">
                Persistent Audit Record
              </span>
              <span className="text-xs text-slate-400 block mt-1">
                View complete scheduled cycle audits and runtime proof telemetry.
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs font-mono text-electric-400 font-bold">
              <span>Open Competition Log</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <ExportAuditJsonButton
            receipts={allReceipts}
            audits={audits}
            storageInfo={storageInfo}
          />

          <a
            href="https://github.com/chyokore/noctive"
            target="_blank"
            rel="noopener noreferrer"
            className="p-5 rounded-2xl bg-navy-900 border border-navy-800 hover:border-electric-500/50 hover:bg-navy-850/80 transition-all flex flex-col justify-between space-y-3 group"
          >
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block">
                Source Code
              </span>
              <span className="text-sm font-mono font-bold text-white mt-1 block group-hover:text-electric-300">
                GitHub Repository
              </span>
              <span className="text-xs text-slate-400 block mt-1">
                Inspect open codebase, risk gates, and Bitget Wallet integration.
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs font-mono text-electric-400 font-bold">
              <span>github.com/chyokore/noctive</span>
              <ExternalLink className="w-4 h-4" />
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
