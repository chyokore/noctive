'use client';

import React, { useState } from 'react';
import {
  MOCK_EVENTS,
} from '@/lib/adapters/eventProvider';
import { MOCK_WATCHLIST } from '@/lib/adapters/marketDataProvider';
import {
  INITIAL_RISK_BUDGET,
  INITIAL_PAPER_POSITIONS,
  INITIAL_RECEIPTS,
} from '@/lib/store/noctiveStore';
import { AgentEngine } from '@/lib/engine/agentEngine';
import { RiskEngine } from '@/lib/engine/riskEngine';
import { PaperExchange } from '@/lib/engine/paperExchange';
import { ReceiptGenerator } from '@/lib/engine/receiptGenerator';
import {
  EventItem,
  MarketContext,
  AgentDecision,
  RiskEvaluationResult,
  PaperOrder,
  DecisionReceipt,
  EventCategory,
} from '@/types/domain';
import { RiskCheckMatrix } from '@/components/RiskCheckMatrix';
import Link from 'next/link';
import {
  Cpu,
  Radio,
  Sliders,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Layers,
  ShieldCheck,
  TrendingUp,
  FileCheck2,
} from 'lucide-react';

export default function CommandCenterPage() {
  const [events] = useState<EventItem[]>(MOCK_EVENTS);
  const [watchlist] = useState<MarketContext[]>(Object.values(MOCK_WATCHLIST));
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const [selectedEvent, setSelectedEvent] = useState<EventItem>(MOCK_EVENTS[0]);
  const [selectedMarket, setSelectedMarket] = useState<MarketContext>(MOCK_WATCHLIST['rNVDA']);

  const [riskBudget, setRiskBudget] = useState(INITIAL_RISK_BUDGET);
  const [positions, setPositions] = useState<PaperOrder[]>(INITIAL_PAPER_POSITIONS);
  const [receipts, setReceipts] = useState<DecisionReceipt[]>(INITIAL_RECEIPTS);

  const [latestEvaluation, setLatestEvaluation] = useState<{
    decision: AgentDecision;
    risk: RiskEvaluationResult;
    order?: PaperOrder;
    receipt: DecisionReceipt;
  } | null>(null);

  const agentEngine = new AgentEngine();
  const riskEngine = new RiskEngine();
  const paperExchange = new PaperExchange();
  const receiptGenerator = new ReceiptGenerator();

  const handleEvaluate = (evt: EventItem) => {
    setSelectedEvent(evt);
    const mkt = MOCK_WATCHLIST[evt.affectedSymbol] || MOCK_WATCHLIST['rNVDA'];
    setSelectedMarket(mkt);

    const dec = agentEngine.evaluateEvent(evt, mkt);
    const risk = riskEngine.evaluateRisk(dec, mkt, riskBudget);
    const order = paperExchange.executePaperOrder(dec, mkt, risk.isApproved);
    const receipt = receiptGenerator.generateReceipt(evt, mkt, dec, risk, order);

    setLatestEvaluation({
      decision: dec,
      risk,
      order: dec.action !== 'STAND_DOWN' ? order : undefined,
      receipt,
    });

    // Add to local receipts list if new
    if (!receipts.some((r) => r.receiptId === receipt.receiptId)) {
      setReceipts((prev) => [receipt, ...prev]);
    }
  };

  const filteredEvents =
    categoryFilter === 'ALL'
      ? events
      : events.filter((e) => e.category === categoryFilter);

  return (
    <div className="space-y-8">
      {/* Top Header & Telemetry */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-navy-900 border border-navy-800 p-6 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-6 h-6 text-electric-400" />
            <h1 className="text-2xl font-bold text-white font-sans tracking-tight">Agent Command Center</h1>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-medium">
              LIVE AGENT FEED
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Real-time event evidence evaluation, deterministic risk verification, and paper order management.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="px-3 py-2 rounded-xl bg-navy-950 border border-navy-800 space-y-0.5">
            <span className="text-slate-400 text-[10px]">Session Status</span>
            <span className="text-emerald-400 font-bold block flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              US Closed • rToken Active
            </span>
          </div>

          <div className="px-3 py-2 rounded-xl bg-navy-950 border border-navy-800 space-y-0.5">
            <span className="text-slate-400 text-[10px]">Monitored Assets</span>
            <span className="text-electric-400 font-bold block">7 rToken Symbols</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Event Feed vs Agent Live Evaluation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 Cols: Event Stream */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-navy-900 border border-navy-800 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-electric-400 animate-pulse" />
                <h2 className="font-bold text-sm text-white font-sans">Structured Event Feed</h2>
              </div>
              <span className="text-[11px] font-mono text-slate-400">{filteredEvents.length} Events</span>
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['ALL', 'EARNINGS', 'MACRO', 'POLICY', 'LEGAL', 'NOISE'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium transition-all ${
                    categoryFilter === cat
                      ? 'bg-electric-500 text-white'
                      : 'bg-navy-950 text-slate-400 hover:text-slate-200 border border-navy-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Events List */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredEvents.map((evt) => {
              const isSelected = selectedEvent.id === evt.id;
              return (
                <div
                  key={evt.id}
                  onClick={() => handleEvaluate(evt)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2 ${
                    isSelected
                      ? 'bg-navy-850 border-electric-500 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                      : 'bg-navy-900 border-navy-800 hover:border-navy-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="px-2 py-0.5 rounded bg-navy-950 text-electric-400 border border-navy-800 font-bold">
                      {evt.affectedSymbol}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        evt.category === 'NOISE'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : evt.impactScore > 0
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {evt.category} • Impact {evt.impactScore > 0 ? '+' : ''}{evt.impactScore}
                    </span>
                  </div>

                  <h3 className="font-bold text-xs text-white leading-snug">{evt.title}</h3>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{evt.rawSnippet}</p>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-navy-800/60">
                    <span>Source: {evt.source}</span>
                    <span className="text-electric-400 font-medium">Evaluate Event →</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 7 Cols: Real-time Evaluation & Risk Gate Panel */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Evaluation Panel */}
          <div className="bg-navy-900 border border-navy-800 p-6 rounded-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-navy-800 pb-4">
              <div>
                <span className="text-[11px] font-mono text-electric-400 uppercase tracking-wider block">
                  Active Agent Telemetry Evaluation
                </span>
                <h2 className="font-sans font-bold text-lg text-white">
                  Target: {selectedMarket.symbol} ({selectedMarket.name})
                </h2>
              </div>
              <button
                onClick={() => handleEvaluate(selectedEvent)}
                className="px-3.5 py-1.5 rounded-lg bg-electric-600 hover:bg-electric-500 text-white font-mono text-xs font-semibold flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(59,130,246,0.2)]"
              >
                <Zap className="w-3.5 h-3.5" /> Re-run Agent Evaluation
              </button>
            </div>

            {latestEvaluation ? (
              <div className="space-y-6">
                {/* Decision Summary Banner */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 block uppercase">Proposed Action</span>
                    <span
                      className={`font-mono text-sm font-extrabold uppercase px-2.5 py-1 rounded inline-block ${
                        latestEvaluation.decision.action === 'ENTER_LONG'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : latestEvaluation.decision.action === 'ENTER_SHORT'
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {latestEvaluation.decision.action.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 block uppercase">Agent Confidence</span>
                    <span className="font-mono text-lg font-bold text-white">
                      {latestEvaluation.decision.confidence}%
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 block uppercase">Price Discovery Prob.</span>
                    <span className="font-mono text-lg font-bold text-electric-400">
                      {latestEvaluation.decision.priceDiscoveryProbability}%
                    </span>
                  </div>
                </div>

                {/* Agent Reasoning */}
                <div className="p-4 rounded-xl bg-navy-950/80 border border-navy-800 space-y-2">
                  <h4 className="font-mono text-xs font-bold text-slate-300">Agent Rationale & Synthesis:</h4>
                  <p className="text-xs text-slate-200 font-sans leading-relaxed">{latestEvaluation.decision.summary}</p>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400 font-mono pt-1">
                    {latestEvaluation.decision.reasoning.map((r, idx) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                </div>

                {/* Deterministic Risk Gate Matrix */}
                <RiskCheckMatrix evaluation={latestEvaluation.risk} />

                {/* Execution / Stand Down Result */}
                <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 flex items-center justify-between">
                  <div className="space-y-1 font-mono text-xs">
                    <span className="text-slate-400 block text-[11px]">Audit Decision Receipt</span>
                    <span className="text-white font-bold">{latestEvaluation.receipt.receiptId}</span>
                    <span className="text-slate-500 text-[10px] block">Signature: {latestEvaluation.receipt.hash}</span>
                  </div>

                  <Link
                    href={`/decision/${latestEvaluation.receipt.receiptId}`}
                    className="px-4 py-2 rounded-lg bg-electric-500/10 hover:bg-electric-500/20 text-electric-400 border border-electric-500/30 text-xs font-mono font-semibold transition-all flex items-center gap-1.5"
                  >
                    <span>Full Audit View</span>
                    <FileCheck2 className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 font-mono text-xs space-y-2">
                <Cpu className="w-8 h-8 text-electric-400 mx-auto animate-bounce" />
                <p>Click on any event in the feed to evaluate it with the Noctive Agent.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Monitored Watchlist & Active Positions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Watchlist Table (7 Cols) */}
        <div className="lg:col-span-7 bg-navy-900 border border-navy-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-navy-800 pb-3">
            <h2 className="font-sans font-bold text-base text-white">Monitored rToken Equity Watchlist</h2>
            <span className="text-xs font-mono text-slate-400">7 Approved Assets</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-navy-800 text-slate-400">
                  <th className="pb-2">Symbol</th>
                  <th className="pb-2">Price</th>
                  <th className="pb-2">24h Chg</th>
                  <th className="pb-2">Spread</th>
                  <th className="pb-2">Liquidity</th>
                  <th className="pb-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800/60">
                {watchlist.map((asset) => (
                  <tr key={asset.symbol} className="hover:bg-navy-850/50">
                    <td className="py-3 font-bold text-white">{asset.symbol}</td>
                    <td className="py-3 text-slate-200">${asset.currentPrice.toFixed(2)}</td>
                    <td className={`py-3 ${asset.change24hPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {asset.change24hPct >= 0 ? '+' : ''}{asset.change24hPct}%
                    </td>
                    <td className={`py-3 ${asset.spreadPct > 0.8 ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                      {asset.spreadPct.toFixed(2)}%
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        asset.liquidityDepthIndex >= 70
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {asset.liquidityDepthIndex}/100
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-electric-500/10 text-electric-400 border border-electric-500/20">
                        OVERNIGHT
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Daily Risk Budget & Current Positions (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Daily Risk Budget Panel */}
          <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-navy-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-400" />
                <h2 className="font-sans font-bold text-base text-white">Daily Risk Budget</h2>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-bold">$2,150 Remaining</span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="space-y-1">
                <div className="flex justify-between text-slate-300 text-[11px]">
                  <span>Daily Loss Utilization ($350 / $2,500)</span>
                  <span className="text-emerald-400">14% Used</span>
                </div>
                <div className="w-full bg-navy-950 h-2 rounded-full overflow-hidden border border-navy-800">
                  <div className="bg-emerald-500 h-full w-[14%]" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-slate-300 text-[11px]">
                  <span>Active Concurrent Positions (1 / 3)</span>
                  <span className="text-electric-400">33% Capacity</span>
                </div>
                <div className="w-full bg-navy-950 h-2 rounded-full overflow-hidden border border-navy-800">
                  <div className="bg-electric-500 h-full w-[33%]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-2">
                <div className="p-2.5 rounded bg-navy-950 border border-navy-800 space-y-0.5">
                  <span className="text-slate-400 block text-[10px]">Max Pos Size</span>
                  <span className="text-white font-bold">${riskBudget.maxPositionSizeUsd.toLocaleString()}</span>
                </div>
                <div className="p-2.5 rounded bg-navy-950 border border-navy-800 space-y-0.5">
                  <span className="text-slate-400 block text-[10px]">Min Confidence</span>
                  <span className="text-white font-bold">{riskBudget.minConfidenceThresholdPct}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Active Paper Positions */}
          <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-navy-800 pb-3">
              <h2 className="font-sans font-bold text-base text-white">Active Paper Positions</h2>
              <span className="text-xs font-mono text-slate-400">{positions.length} Open</span>
            </div>

            {positions.map((pos) => (
              <div key={pos.orderId} className="p-3.5 rounded-xl bg-navy-950 border border-navy-800 space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{pos.symbol}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                    {pos.side} • SIMULATED FILLED
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[11px] text-slate-400">
                  <div>Entry: <strong className="text-white">${pos.entryPrice.toFixed(2)}</strong></div>
                  <div>Notional: <strong className="text-white">${pos.notionalValueUsd.toLocaleString()}</strong></div>
                  <div>Stop Loss: <strong className="text-rose-400">${pos.stopLossPrice.toFixed(2)}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
