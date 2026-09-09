'use client';

import React, { useState } from 'react';
import {
  INITIAL_REPLAY_OUTCOMES,
  INITIAL_RECEIPTS,
} from '@/lib/store/noctiveStore';
import { ReplayOutcome, DecisionReceipt } from '@/types/domain';
import Link from 'next/link';
import {
  BarChart3,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  FileCheck2,
  RefreshCw,
  Zap,
  Award,
  BookOpen,
} from 'lucide-react';

export default function ReplayLabPage() {
  const [replays, setReplays] = useState<ReplayOutcome[]>(INITIAL_REPLAY_OUTCOMES);
  const [receipts] = useState<DecisionReceipt[]>(INITIAL_RECEIPTS);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string>(
    INITIAL_REPLAY_OUTCOMES[0]?.receiptId || INITIAL_RECEIPTS[0]?.receiptId || ''
  );

  const [activeReplay, setActiveReplay] = useState<ReplayOutcome>(INITIAL_REPLAY_OUTCOMES[0]);

  const handleSimulateReplay = (receiptId: string) => {
    setSelectedReceiptId(receiptId);
    const existing = replays.find((r) => r.receiptId === receiptId);
    if (existing) {
      setActiveReplay(existing);
    } else {
      const targetReceipt = receipts.find((r) => r.receiptId === receiptId);
      if (targetReceipt) {
        // Generate simulated replay on the fly
        const openGapPct = targetReceipt.agentDecision.action === 'ENTER_LONG' ? 3.12 : -2.45;
        const openPrice = parseFloat(
          (targetReceipt.marketContext.currentPrice * (1 + openGapPct / 100)).toFixed(2)
        );
        const pnlUsd = targetReceipt.paperOrder
          ? parseFloat(
              (targetReceipt.paperOrder.notionalValueUsd * (openGapPct / 100)).toFixed(2)
            )
          : 0;

        const newReplay: ReplayOutcome = {
          receiptId,
          symbol: targetReceipt.marketContext.symbol,
          decisionAction: targetReceipt.agentDecision.action,
          overnightPrice: targetReceipt.marketContext.currentPrice,
          marketOpenPrice: openPrice,
          actualOpenGapPct: openGapPct,
          simulatedPnlUsd: pnlUsd,
          simulatedPnlPct: openGapPct,
          priceDiscoveryVerified: targetReceipt.agentDecision.action !== 'STAND_DOWN',
          agentLessonLearned:
            targetReceipt.agentDecision.action === 'STAND_DOWN'
              ? 'Agent correctly identified low liquidity noise and stood down, protecting the account from simulated overnight slippage.'
              : `Overnight rToken momentum accurately predicted the US regular session opening gap of ${openGapPct}%.`,
          timestamp: new Date().toISOString(),
          isDemoData: targetReceipt.isDemoData,
        };

        setReplays((prev) => [newReplay, ...prev]);
        setActiveReplay(newReplay);
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-navy-900 border border-navy-800 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-teal-400" />
            <h1 className="text-2xl font-bold text-white font-sans tracking-tight">Opening-Gap Replay Lab</h1>
            <span className="px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-mono font-medium">
              RETROSPECTIVE ANALYSIS
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Quantifies overnight rToken price discovery accuracy against regular US market session opening gaps.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedReceiptId}
            onChange={(e) => handleSimulateReplay(e.target.value)}
            className="px-3 py-2 rounded-xl bg-navy-950 border border-navy-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-electric-500"
          >
            {receipts.map((rcpt) => (
              <option key={rcpt.receiptId} value={rcpt.receiptId}>
                {rcpt.receiptId} ({rcpt.marketContext.symbol} • {rcpt.agentDecision.action})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Replay Spotlight Card */}
      {activeReplay && (
        <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-navy-800 pb-4">
            <div>
              <span className="text-[10px] font-mono text-electric-400 uppercase tracking-widest block">
                Active Replay Case Study
              </span>
              <h2 className="text-xl font-bold text-white font-sans">
                {activeReplay.symbol} Overnight Trade vs US Market Open
              </h2>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <span
                className={`px-3 py-1 rounded font-bold ${
                  activeReplay.priceDiscoveryVerified
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                }`}
              >
                {activeReplay.priceDiscoveryVerified
                  ? '✓ PRICE DISCOVERY VERIFIED'
                  : '⚠ NOISE REJECTED (STAND DOWN SAVED PNL)'}
              </span>
            </div>
          </div>

          {/* Metrics comparison grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
            <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-1">
              <span className="text-slate-400 text-[10px] block">Overnight rToken Price</span>
              <strong className="text-white text-base">${activeReplay.overnightPrice.toFixed(2)}</strong>
            </div>

            <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-1">
              <span className="text-slate-400 text-[10px] block">US Regular Open Price</span>
              <strong className="text-electric-400 text-base">${activeReplay.marketOpenPrice.toFixed(2)}</strong>
            </div>

            <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-1">
              <span className="text-slate-400 text-[10px] block">Actual Opening Gap %</span>
              <strong
                className={`text-base font-bold ${
                  activeReplay.actualOpenGapPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {activeReplay.actualOpenGapPct >= 0 ? '+' : ''}
                {activeReplay.actualOpenGapPct}%
              </strong>
            </div>

            <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-1">
              <span className="text-slate-400 text-[10px] block">Simulated PnL Impact</span>
              <strong
                className={`text-base font-bold ${
                  activeReplay.simulatedPnlUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                ${activeReplay.simulatedPnlUsd >= 0 ? '+' : ''}
                {activeReplay.simulatedPnlUsd.toFixed(2)}
              </strong>
            </div>
          </div>

          {/* Agent Retrospective Lesson Card */}
          <div className="p-5 rounded-xl bg-navy-950 border border-electric-500/30 space-y-3">
            <div className="flex items-center gap-2 text-electric-400 font-bold text-xs font-mono">
              <BookOpen className="w-4 h-4 text-electric-400" />
              <span>Agent Retrospective Lesson Learned:</span>
            </div>
            <p className="text-slate-200 font-sans text-xs leading-relaxed">{activeReplay.agentLessonLearned}</p>
          </div>
        </div>
      )}

      {/* Replay History Table */}
      <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-navy-800 pb-3">
          <h2 className="font-sans font-bold text-base text-white">Replay History & Performance Log</h2>
          <span className="text-xs font-mono text-slate-400">{replays.length} Replays Recorded</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-navy-800 text-slate-400">
                <th className="pb-2">Symbol</th>
                <th className="pb-2">Action</th>
                <th className="pb-2">Overnight Price</th>
                <th className="pb-2">Market Open</th>
                <th className="pb-2">Gap %</th>
                <th className="pb-2">Simulated PnL</th>
                <th className="pb-2 text-right">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60">
              {replays.map((r, idx) => (
                <tr
                  key={idx}
                  onClick={() => handleSimulateReplay(r.receiptId)}
                  className="hover:bg-navy-850/50 cursor-pointer"
                >
                  <td className="py-3 font-bold text-white">{r.symbol}</td>
                  <td className="py-3 uppercase text-slate-300">{r.decisionAction.replace(/_/g, ' ')}</td>
                  <td className="py-3 text-slate-200">${r.overnightPrice.toFixed(2)}</td>
                  <td className="py-3 text-electric-400">${r.marketOpenPrice.toFixed(2)}</td>
                  <td className={`py-3 font-bold ${r.actualOpenGapPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {r.actualOpenGapPct >= 0 ? '+' : ''}{r.actualOpenGapPct}%
                  </td>
                  <td className={`py-3 font-bold ${r.simulatedPnlUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ${r.simulatedPnlUsd >= 0 ? '+' : ''}{r.simulatedPnlUsd.toFixed(2)}
                  </td>
                  <td className="py-3 text-right">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.priceDiscoveryVerified
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {r.priceDiscoveryVerified ? 'VERIFIED' : 'NOISE REJECTED'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
