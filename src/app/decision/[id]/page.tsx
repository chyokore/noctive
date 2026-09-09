'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { INITIAL_RECEIPTS } from '@/lib/store/noctiveStore';
import { RiskCheckMatrix } from '@/components/RiskCheckMatrix';
import { DecisionAuthorityPanel } from '@/components/DecisionAuthorityPanel';
import { DataProvenanceBadge } from '@/components/DataProvenanceBadge';
import {
  FileCheck2,
  ArrowLeft,
  ShieldCheck,
  Cpu,
  Copy,
  Check,
  TrendingUp,
  AlertTriangle,
  FileText,
  Clock,
  Database,
  Terminal,
} from 'lucide-react';

export default function DecisionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const receiptId = (params.id as string) || '';

  const [copied, setCopied] = useState(false);

  // Search initial receipts or fallback to first receipt
  const receipt =
    INITIAL_RECEIPTS.find((r) => r.receiptId === receiptId) || INITIAL_RECEIPTS[0];

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(receipt, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!receipt) {
    return (
      <div className="py-20 text-center space-y-4 font-mono">
        <h1 className="text-xl font-bold text-white">Decision Receipt Not Found</h1>
        <Link href="/decision-ledger" className="text-electric-400 underline text-xs">
          ← Back to Decision Ledger
        </Link>
      </div>
    );
  }

  const { event, marketContext, agentDecision, riskGate, paperOrder, status, provenance, decisionAuthority } = receipt;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-navy-800 pb-4">
        <Link
          href="/decision-ledger"
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-electric-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Decision Ledger</span>
        </Link>

        <div className="flex items-center gap-3 font-mono text-xs">
          <span
            className={`px-3 py-1 rounded font-bold uppercase ${
              status === 'APPROVED_EXECUTED'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : status === 'RISK_BLOCKED'
                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
            }`}
          >
            {status.replace(/_/g, ' ')}
          </span>

          <button
            onClick={handleCopyJson}
            className="px-3 py-1.5 rounded bg-navy-900 border border-navy-800 text-slate-300 hover:text-white hover:border-navy-700 flex items-center gap-1.5 transition-all text-xs font-mono"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied JSON</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Export JSON Payload</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Data Provenance Badge */}
      {provenance && <DataProvenanceBadge provenance={provenance} />}

      {/* Header Title & Receipt Signature */}
      <div className="bg-navy-900 border border-navy-800 p-6 rounded-2xl space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-navy-800 pb-4">
          <div>
            <span className="text-[11px] font-mono text-electric-400 uppercase tracking-widest block">
              Immutable Decision Audit Receipt
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-white font-sans mt-0.5">
              Receipt ID: <span className="font-mono text-electric-400">{receipt.receiptId}</span>
            </h1>
          </div>

          <div className="text-right font-mono text-xs space-y-1">
            <span className="text-slate-400 text-[10px] block">Cryptographic Signature Hash</span>
            <span className="text-emerald-400 font-bold bg-navy-950 px-2.5 py-1 rounded border border-navy-800 block">
              {receipt.hash}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs font-mono">
          <div>
            <span className="text-slate-400 block text-[10px]">Target Asset</span>
            <strong className="text-white font-bold text-sm">{marketContext.symbol} ({marketContext.name})</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Timestamp</span>
            <strong className="text-slate-300">{new Date(receipt.timestamp).toLocaleString()}</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Overnight Price</span>
            <strong className="text-white">${marketContext.currentPrice.toFixed(2)}</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Session Status</span>
            <strong className="text-electric-400">OVERNIGHT ACTIVE</strong>
          </div>
        </div>
      </div>

      {/* Decision Authority & Override Panel */}
      {decisionAuthority && (
        <DecisionAuthorityPanel
          authority={decisionAuthority}
          llmProposal={agentDecision.llmProposal}
        />
      )}

      {/* Stage 1: Event Evidence Card */}
      <div className="bg-navy-900 border border-navy-800 p-6 rounded-2xl space-y-3">
        <div className="flex items-center gap-2 border-b border-navy-800 pb-3">
          <FileText className="w-5 h-5 text-electric-400" />
          <h2 className="font-sans font-bold text-base text-white">Stage 1: Event Evidence & Market Context</h2>
        </div>

        <div className="space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 rounded bg-navy-950 text-electric-400 border border-navy-800 font-bold">
              Source: {event.source}
            </span>
            <span
              className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                event.impactScore > 0
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              }`}
            >
              Category: {event.category} • Impact Score: {event.impactScore > 0 ? '+' : ''}{event.impactScore}
            </span>
          </div>

          <h3 className="font-sans font-bold text-base text-white">{event.title}</h3>

          <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 text-slate-300 font-sans text-xs leading-relaxed">
            <span className="font-mono text-[10px] text-slate-500 uppercase block mb-1">Raw Ingested Snippet:</span>
            "{event.rawSnippet}"
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-[11px]">
            <div className="p-2.5 rounded bg-navy-950 border border-navy-800">
              <span className="text-slate-400 block text-[10px]">Bid-Ask Spread</span>
              <strong className={marketContext.spreadPct > 0.8 ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                {marketContext.spreadPct.toFixed(2)}%
              </strong>
            </div>

            <div className="p-2.5 rounded bg-navy-950 border border-navy-800">
              <span className="text-slate-400 block text-[10px]">Liquidity Depth Index</span>
              <strong className="text-emerald-400">{marketContext.liquidityDepthIndex}/100</strong>
            </div>

            <div className="p-2.5 rounded bg-navy-950 border border-navy-800">
              <span className="text-slate-400 block text-[10px]">24h Volume USD</span>
              <strong className="text-slate-200">${(marketContext.volume24hUsd / 1e6).toFixed(2)}M</strong>
            </div>

            <div className="p-2.5 rounded bg-navy-950 border border-navy-800">
              <span className="text-slate-400 block text-[10px]">24h Price Chg</span>
              <strong className={marketContext.change24hPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {marketContext.change24hPct >= 0 ? '+' : ''}{marketContext.change24hPct}%
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Stage 2: Agent Reasoning Card */}
      <div className="bg-navy-900 border border-navy-800 p-6 rounded-2xl space-y-4">
        <div className="flex items-center gap-2 border-b border-navy-800 pb-3">
          <Cpu className="w-5 h-5 text-teal-400" />
          <h2 className="font-sans font-bold text-base text-white">Stage 2: Autonomous LLM Agent Reasoning</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
          <div className="p-3.5 rounded-xl bg-navy-950 border border-navy-800 space-y-1">
            <span className="text-slate-400 text-[10px] block uppercase">Proposed Action</span>
            <span className="font-bold text-white text-sm uppercase">{agentDecision.action.replace(/_/g, ' ')}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-navy-950 border border-navy-800 space-y-1">
            <span className="text-slate-400 text-[10px] block uppercase">Agent Confidence Score</span>
            <span className="font-bold text-emerald-400 text-sm">{agentDecision.confidence}%</span>
          </div>

          <div className="p-3.5 rounded-xl bg-navy-950 border border-navy-800 space-y-1">
            <span className="text-slate-400 text-[10px] block uppercase">Price Discovery Probability</span>
            <span className="font-bold text-electric-400 text-sm">{agentDecision.priceDiscoveryProbability}%</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-3 text-xs font-mono">
          <h3 className="font-bold text-slate-200">Synthesis Summary:</h3>
          <p className="text-slate-300 font-sans leading-relaxed text-xs">{agentDecision.summary}</p>

          <h3 className="font-bold text-slate-200 pt-2">Detailed Rationale:</h3>
          <ul className="list-disc list-inside space-y-1.5 text-slate-400 font-mono text-[11px]">
            {agentDecision.reasoning.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Stage 3: Deterministic 8-Rule Risk Gate */}
      <RiskCheckMatrix evaluation={riskGate} title="Stage 3: Independent Deterministic Risk Gate Verification" />

      {/* Stage 4: Paper Order Receipt or Stand-Down Rationale */}
      <div className="bg-navy-900 border border-navy-800 p-6 rounded-2xl space-y-4">
        <div className="flex items-center gap-2 border-b border-navy-800 pb-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h2 className="font-sans font-bold text-base text-white">Stage 4: Paper Execution Receipt & Stand-Down Audit</h2>
        </div>

        {paperOrder && paperOrder.status === 'SIMULATED_FILLED' ? (
          <div className="p-5 rounded-xl bg-navy-950 border border-emerald-500/30 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-navy-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>PAPER ORDER SIMULATED FILLED</span>
              </div>
              <span className="text-slate-400">Order ID: {paperOrder.orderId}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-slate-400 block text-[10px]">Side / Type</span>
                <strong className="text-white text-sm">{paperOrder.side}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Notional Value</span>
                <strong className="text-emerald-400 text-sm">${paperOrder.notionalValueUsd.toLocaleString()}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Entry Price</span>
                <strong className="text-white">${paperOrder.entryPrice.toFixed(2)}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Token Quantity</span>
                <strong className="text-slate-300">{paperOrder.quantityTokens} {paperOrder.symbol}</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-navy-800 text-[11px]">
              <div className="p-2.5 rounded bg-rose-950/30 border border-rose-500/20">
                <span className="text-rose-300 block text-[10px]">Stop-Loss Bracket ({agentDecision.suggestedStopLossPct}%)</span>
                <strong className="text-rose-400 font-bold">${paperOrder.stopLossPrice.toFixed(2)}</strong>
              </div>
              <div className="p-2.5 rounded bg-emerald-950/30 border border-emerald-500/20">
                <span className="text-emerald-300 block text-[10px]">Take-Profit Target ({agentDecision.suggestedTakeProfitPct}%)</span>
                <strong className="text-emerald-400 font-bold">${paperOrder.takeProfitPrice.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-xl bg-navy-950 border border-amber-500/30 space-y-3 font-mono text-xs">
            <div className="flex items-center gap-2 text-amber-400 font-bold border-b border-navy-800 pb-3">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>NO PAPER TRADE EXECUTED • REASON: {status.replace(/_/g, ' ')}</span>
            </div>

            <div className="space-y-2 text-slate-300 font-sans text-xs">
              <p className="font-semibold text-white">Stand-Down Audit Rationale:</p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400 font-mono">
                {receipt.standDownReasons?.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                )) || (
                  <li>No active trade was created in accordance with safety controls.</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
