'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { INITIAL_RECEIPTS } from '@/lib/store/noctiveStore';
import { DecisionReceipt } from '@/types/domain';
import {
  Database,
  Search,
  Filter,
  FileCheck2,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Copy,
  Check,
  ShieldCheck,
} from 'lucide-react';

export default function DecisionLedgerPage() {
  const [receipts, setReceipts] = useState<DecisionReceipt[]>(INITIAL_RECEIPTS);

  const [searchTerm, setSearchTerm] = useState('');
  const [symbolFilter, setSymbolFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [decisionFilter, setDecisionFilter] = useState('ALL');
  const [streamFilter, setStreamFilter] = useState<'LIVE_ONLY' | 'DEMO_ONLY' | 'ALL'>('LIVE_ONLY');

  useEffect(() => {
    async function loadLedger() {
      try {
        const res = await fetch('/api/ledger?demo=all');
        const data = await res.json();
        if (data.success && Array.isArray(data.allReceipts)) {
          setReceipts(data.allReceipts.length > 0 ? data.allReceipts : INITIAL_RECEIPTS);
        }
      } catch (err) {
        console.error('Failed to load ledger from API:', err);
      }
    }
    loadLedger();
  }, []);

  const filteredReceipts = receipts.filter((rcpt) => {
    // Stream Filter Logic
    if (streamFilter === 'LIVE_ONLY' && rcpt.isDemoData) return false;
    if (streamFilter === 'DEMO_ONLY' && !rcpt.isDemoData) return false;

    const matchesSearch =
      rcpt.receiptId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rcpt.marketContext.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rcpt.event.title.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSymbol = symbolFilter === 'ALL' || rcpt.marketContext.symbol === symbolFilter;
    const matchesStatus = statusFilter === 'ALL' || rcpt.status === statusFilter;
    const matchesDecision = decisionFilter === 'ALL' || rcpt.agentDecision.action === decisionFilter;

    return matchesSearch && matchesSymbol && matchesStatus && matchesDecision;
  });

  const handleExportAll = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(receipts, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `noctive-decision-ledger-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-navy-900 border border-navy-800 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-6 h-6 text-electric-400" />
            <h1 className="text-2xl font-bold text-white font-sans tracking-tight">Audit-Ready Decision Ledger</h1>
            <span className="px-2 py-0.5 rounded bg-electric-500/10 border border-electric-500/30 text-electric-400 text-xs font-mono font-medium">
              IMMUTABLE RECEIPTS
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Searchable, timestamped record of all event evidence, agent decisions, risk gate evaluations, and paper orders.
          </p>
        </div>

        <button
          onClick={handleExportAll}
          className="px-4 py-2.5 rounded-xl bg-electric-600 hover:bg-electric-500 text-white font-mono text-xs font-semibold flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(59,130,246,0.2)]"
        >
          <Download className="w-4 h-4" /> Export Full Ledger JSON
        </button>
      </div>

      {/* Stream Filter Bar */}
      <div className="bg-navy-900 border border-navy-800 p-4 rounded-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-navy-800 pb-3">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
            <Filter className="w-4 h-4 text-electric-400" />
            <span className="font-bold text-white uppercase text-[11px]">Data Stream Filter:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <button
              onClick={() => setStreamFilter('LIVE_ONLY')}
              className={`px-3 py-1.5 rounded-lg border transition-all ${
                streamFilter === 'LIVE_ONLY'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                  : 'bg-navy-950 text-slate-400 border-navy-800 hover:text-white'
              }`}
            >
              Live Competition Stream (Default)
            </button>
            <button
              onClick={() => setStreamFilter('DEMO_ONLY')}
              className={`px-3 py-1.5 rounded-lg border transition-all ${
                streamFilter === 'DEMO_ONLY'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                  : 'bg-navy-950 text-slate-400 border-navy-800 hover:text-white'
              }`}
            >
              Pre-seeded Demo Data
            </button>
            <button
              onClick={() => setStreamFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg border transition-all ${
                streamFilter === 'ALL'
                  ? 'bg-electric-500/20 text-electric-300 border-electric-500/40 font-bold shadow-[0_0_10px_rgba(59,130,246,0.2)]'
                  : 'bg-navy-950 text-slate-400 border-navy-800 hover:text-white'
              }`}
            >
              All Data Streams
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search receipt ID, symbol, headline..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-navy-950 border border-navy-800 text-slate-200 focus:outline-none focus:border-electric-500"
            />
          </div>

          {/* Symbol Filter */}
          <div>
            <select
              value={symbolFilter}
              onChange={(e) => setSymbolFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-800 text-slate-200 focus:outline-none focus:border-electric-500"
            >
              <option value="ALL">All Assets</option>
              <option value="rNVDA">rNVDA</option>
              <option value="rTSLA">rTSLA</option>
              <option value="rAAPL">rAAPL</option>
              <option value="rMSFT">rMSFT</option>
              <option value="rSPY">rSPY</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-800 text-slate-200 focus:outline-none focus:border-electric-500"
            >
              <option value="ALL">All Execution Outcomes</option>
              <option value="APPROVED_EXECUTED">Approved & Executed</option>
              <option value="NOISE_REJECTED_STAND_DOWN">Stand Down (Noise)</option>
              <option value="RISK_BLOCKED">Risk Gate Blocked</option>
            </select>
          </div>

          {/* Decision Filter */}
          <div>
            <select
              value={decisionFilter}
              onChange={(e) => setDecisionFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-800 text-slate-200 focus:outline-none focus:border-electric-500"
            >
              <option value="ALL">All Decision Actions</option>
              <option value="ENTER_LONG">Enter Long</option>
              <option value="ENTER_SHORT">Enter Short</option>
              <option value="STAND_DOWN">Stand Down</option>
            </select>
          </div>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-navy-800 pb-3">
          <h2 className="font-sans font-bold text-base text-white">Decision Receipts Audit Trail</h2>
          <span className="text-xs font-mono text-slate-400">{filteredReceipts.length} Matching Records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-navy-800 text-slate-400">
                <th className="pb-2">Timestamp</th>
                <th className="pb-2">Provenance</th>
                <th className="pb-2">Receipt ID</th>
                <th className="pb-2">Symbol</th>
                <th className="pb-2">Action</th>
                <th className="pb-2">Confidence</th>
                <th className="pb-2">Status</th>
                <th className="pb-2 text-right">Audit Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60">
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    {streamFilter === 'LIVE_ONLY'
                      ? 'No live competition paper decision receipts created yet. (Vercel cron ran safely with status SAFE_SKIP due to no fresh qualifying SEC filings).'
                      : 'No decision receipts match the active filters.'}
                  </td>
                </tr>
              ) : (
                filteredReceipts.map((rcpt) => (
                  <tr key={rcpt.receiptId} className="hover:bg-navy-850/50">
                    <td className="py-3 text-slate-400">{new Date(rcpt.timestamp).toLocaleTimeString()}</td>
                    <td className="py-3">
                      {rcpt.provenance?.dataMode === 'LIVE_EXTERNAL_UNDERLYING_REFERENCE' ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                          LIVE EXTERNAL — UNDERLYING REFERENCE
                        </span>
                      ) : rcpt.provenance?.dataMode === 'LIVE_EXTERNAL' || (!rcpt.isDemoData && rcpt.provenance?.dataMode !== 'DEMO_DATA') ? (
                        <span className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[10px] font-bold">
                          LIVE EXTERNAL — VERIFIED BITGET RTOKEN
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
                          DEMO / SEEDED
                        </span>
                      )}
                    </td>
                    <td className="py-3 font-bold text-electric-400">{rcpt.receiptId}</td>
                    <td className="py-3 font-bold text-white">{rcpt.marketContext.symbol}</td>
                    <td className="py-3 uppercase text-slate-200">{rcpt.agentDecision.action.replace(/_/g, ' ')}</td>
                    <td className="py-3 text-slate-300">{rcpt.agentDecision.confidence}%</td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rcpt.status === 'APPROVED_EXECUTED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : rcpt.status === 'RISK_BLOCKED'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {rcpt.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/decision/${rcpt.receiptId}`}
                        className="px-2.5 py-1 rounded bg-navy-950 hover:bg-navy-800 border border-navy-800 text-electric-400 text-[11px] font-semibold inline-flex items-center gap-1 transition-all"
                      >
                        <span>View</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
