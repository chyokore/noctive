'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DecisionReceipt, CompetitionLogMetrics, LiveRunAuditRecord } from '@/types/domain';
import {
  Trophy,
  ShieldCheck,
  ArrowRight,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';

export default function CompetitionLogPage() {
  const [activeTab, setActiveTab] = useState<'COMPETITION' | 'DEMO'>('COMPETITION');
  const [receipts, setReceipts] = useState<DecisionReceipt[]>([]);
  const [audits, setAudits] = useState<LiveRunAuditRecord[]>([]);
  const [metrics, setMetrics] = useState<CompetitionLogMetrics | null>(null);
  const [storageInfo, setStorageInfo] = useState<{
    storeType: string;
    isPersistent: boolean;
    description: string;
  } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const isDemo = activeTab === 'DEMO';
        const res = await fetch(`/api/ledger?demo=${isDemo}`);
        const data = await res.json();
        if (data.success) {
          setReceipts(data.receipts || []);
          setAudits(data.audits || []);
          setMetrics(data.metrics || null);
          if (data.storageInfo) {
            setStorageInfo(data.storageInfo);
          }
        }
      } catch (err) {
        console.error('Failed to load competition ledger:', err);
      }
    }
    loadData();
  }, [activeTab]);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-navy-900 border border-navy-800 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-bold text-white font-sans tracking-tight">Competition Paper Log</h1>
            <span className="px-2 py-0.5 rounded bg-electric-500/10 border border-electric-500/30 text-electric-400 text-xs font-mono font-medium">
              BITGET HACKATHON S2
            </span>
            {storageInfo && (
              <span
                className={`px-2 py-0.5 rounded text-xs font-mono font-medium flex items-center gap-1.5 ${
                  storageInfo.isPersistent
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    storageInfo.isPersistent ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span>{storageInfo.description}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Auditable paper-trading execution statistics, live verification run audit, and persistent decision ledger (Read-Only Judge View).
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-navy-950 border border-navy-800 font-mono text-xs font-semibold">
          <button
            onClick={() => setActiveTab('COMPETITION')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'COMPETITION'
                ? 'bg-electric-600 text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Competition Paper Log
          </button>
          <button
            onClick={() => setActiveTab('DEMO')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'DEMO'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Pre-seeded Demo Data
          </button>
        </div>
      </div>

      {/* Live External Pipeline Health Banner */}
      <div className="bg-navy-900 border border-navy-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <strong className="text-white font-sans text-sm">Live External Data Pipeline Status:</strong>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                ACTIVE & AUDITABLE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Read-Only Inputs: SEC EDGAR 8-K Atom Feed &amp; Stooq / Bitget Public APIs. Zero account/key/wallet dependency.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-slate-400">
          <div>
            <span className="block text-[10px] uppercase text-slate-400">Event Source</span>
            <span className="text-slate-200">SEC EDGAR (Form 8-K)</span>
          </div>
          <div className="h-6 w-px bg-navy-800" />
          <div>
            <span className="block text-[10px] uppercase text-slate-400">Market Source</span>
            <span className="text-slate-200">Stooq / Bitget Public APIs</span>
          </div>
        </div>
      </div>

      {/* Metrics Performance Cards */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
          <div className="p-4 rounded-xl bg-navy-900 border border-navy-800 space-y-1">
            <span className="text-slate-400 text-[10px] block uppercase">Total Decisions</span>
            <strong className="text-white text-lg font-bold">{metrics.totalDecisions}</strong>
          </div>

          <div className="p-4 rounded-xl bg-navy-900 border border-navy-800 space-y-1">
            <span className="text-slate-400 text-[10px] block uppercase">Approved Trades</span>
            <strong className="text-emerald-400 text-lg font-bold">{metrics.approvedCount}</strong>
          </div>

          <div className="p-4 rounded-xl bg-navy-900 border border-navy-800 space-y-1">
            <span className="text-slate-400 text-[10px] block uppercase">Risk Blocked</span>
            <strong className="text-rose-400 text-lg font-bold">{metrics.riskBlockedCount}</strong>
          </div>

          <div className="p-4 rounded-xl bg-navy-900 border border-navy-800 space-y-1">
            <span className="text-slate-400 text-[10px] block uppercase">Stand Down (Noise)</span>
            <strong className="text-amber-400 text-lg font-bold">{metrics.standDownCount}</strong>
          </div>

          <div className="p-4 rounded-xl bg-navy-900 border border-navy-800 space-y-1">
            <span className="text-slate-400 text-[10px] block uppercase">Cumulative PnL</span>
            <strong className="text-emerald-400 text-lg font-bold">${metrics.cumulativePnlUsd.toFixed(2)}</strong>
          </div>

          <div className="p-4 rounded-xl bg-navy-900 border border-navy-800 space-y-1">
            <span className="text-slate-400 text-[10px] block uppercase">Max Drawdown</span>
            <strong className="text-teal-400 text-lg font-bold">{metrics.maxDrawdownPct}%</strong>
          </div>
        </div>
      )}

      {/* SECTION 1: Persistent Live Verification Run Log */}
      {activeTab === 'COMPETITION' && (
        <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-navy-800 pb-3 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-electric-400" />
                <h2 className="font-sans font-bold text-base text-white">Live Verification Run Log</h2>
                <span className="px-2 py-0.5 rounded bg-electric-500/10 border border-electric-500/30 text-electric-400 text-xs font-mono font-medium">
                  CRON AUDIT
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Persistent audit log of every protected scheduled cycle check. Note: A SAFE SKIP is an operational verification event, not a simulated trade, and does not alter portfolio performance metrics.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400 whitespace-nowrap">{audits.length} Audit Records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-navy-800 text-slate-400">
                  <th className="pb-2">Timestamp</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Event Source</th>
                  <th className="pb-2">Market Source</th>
                  <th className="pb-2">Qwen Invoked</th>
                  <th className="pb-2">Decision Created</th>
                  <th className="pb-2">Detail / Safe Skip Reason</th>
                  <th className="pb-2 text-right">Audit Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800/60">
                {audits.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-400">
                      No run-audit records logged yet. Scheduled Vercel cron cycles or run-live-competition-cycle script will populate run audits automatically.
                    </td>
                  </tr>
                ) : (
                  audits.map((audit) => (
                    <tr key={audit.auditId} className="hover:bg-navy-850/50">
                      <td className="py-3 text-slate-400">{new Date(audit.timestamp).toLocaleTimeString()}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            audit.status === 'QUALIFIED'
                              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                              : audit.status === 'SAFE_SKIP'
                              ? 'bg-sky-500/10 border border-sky-500/30 text-sky-400'
                              : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                          }`}
                        >
                          {audit.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 text-slate-300">{audit.eventProviderDomain}</td>
                      <td className="py-3 text-slate-300">{audit.marketProviderDomain}</td>
                      <td className="py-3 text-slate-300">{audit.qwenInvoked ? 'YES' : 'NO'}</td>
                      <td className="py-3 text-slate-300">{audit.decisionCreated ? 'YES' : 'NO'}</td>
                      <td className="py-3 text-slate-400 max-w-xs truncate">{audit.safeSkipReason || 'Verified Live Market Decision Created'}</td>
                      <td className="py-3 text-right font-bold text-electric-400">{audit.hash}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 2: Competition Paper Executions */}
      <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-navy-800 pb-3">
          <div>
            <h2 className="font-sans font-bold text-base text-white">
              {activeTab === 'COMPETITION' ? 'Live Competition Paper Executions' : 'Demo Scenario Executions'}
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              {activeTab === 'COMPETITION'
                ? 'Durable persistent ledger recording qualified live agent proposals and risk checks.'
                : 'Isolated pre-seeded hackathon evaluation test cases.'}
            </p>
          </div>

          <span className="text-xs font-mono text-slate-400">{receipts.length} Executions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-navy-800 text-slate-400">
                <th className="pb-2">Timestamp</th>
                <th className="pb-2">Provenance</th>
                <th className="pb-2">Receipt ID</th>
                <th className="pb-2">Symbol</th>
                <th className="pb-2">AI Proposal</th>
                <th className="pb-2">Confidence</th>
                <th className="pb-2">Risk Gate</th>
                <th className="pb-2">Final Status</th>
                <th className="pb-2 text-right">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60">
              {receipts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    {activeTab === 'COMPETITION'
                      ? 'No live external competition paper records created yet. Competition paper records are exclusive to verified live external events + verified matching Bitget rToken equity market snapshots.'
                      : 'No demo records found.'}
                  </td>
                </tr>
              ) : (
                receipts.map((rcpt) => (
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
                          DEMO DATA
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
                          rcpt.riskGate.isApproved
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {rcpt.riskGate.isApproved ? 'PASS' : 'BLOCK'}
                      </span>
                    </td>
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
