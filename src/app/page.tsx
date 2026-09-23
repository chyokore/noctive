'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  ShieldAlert,
  Cpu,
  ArrowRight,
  Radio,
  Zap,
  BarChart3,
  FileCheck2,
  CheckCircle2,
  Sparkles,
  Activity,
  Layers,
} from 'lucide-react';
import { MOCK_WATCHLIST } from '@/lib/adapters/marketDataProvider';

export default function LandingPage() {
  const watchlistAssets = Object.values(MOCK_WATCHLIST);

  return (
    <div className="space-y-16 py-4">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-navy-900 via-navy-900 to-navy-950 border border-navy-800 p-8 md:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-electric-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-4xl space-y-6">
          {/* Product Label & Headline */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold tracking-wide uppercase">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Noctive UTA Sentinel</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight font-sans">
              Stress-test tokenized-equity collateral before overnight risk becomes a position problem.
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-sans max-w-3xl pt-1">
              Noctive combines verified Bitget Wallet Reality data, Qwen risk context, and deterministic safety gates to produce auditable, paper-only decisions for tokenized US equities.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/uta-sentinel"
              className="px-6 py-3.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-mono text-sm font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all hover:scale-105"
            >
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Launch UTA Sentinel</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/competition-log"
              className="px-6 py-3.5 rounded-xl bg-electric-600 hover:bg-electric-500 text-white font-mono text-sm font-semibold flex items-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all hover:scale-105"
            >
              <Activity className="w-4 h-4" />
              <span>View Competition Log</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/decision-ledger"
              className="px-6 py-3.5 rounded-xl bg-navy-800 hover:bg-navy-700 border border-navy-700 text-slate-200 font-mono text-sm font-medium flex items-center gap-2 transition-all hover:text-white"
            >
              <FileCheck2 className="w-4 h-4 text-electric-400" />
              <span>Audit Decision Ledger</span>
            </Link>
          </div>
        </div>

        {/* Quiet System Status Telemetry */}
        <div className="mt-10 pt-6 border-t border-navy-800/80 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3 rounded-lg bg-navy-950/60 border border-navy-800">
            <span className="text-slate-400 block text-[11px]">System Sentinel Status</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Monitoring Active
            </span>
          </div>

          <div className="p-3 rounded-lg bg-navy-950/60 border border-navy-800">
            <span className="text-slate-400 block text-[11px]">Market Verification</span>
            <span className="text-electric-400 font-bold mt-1 block">
              Bitget Wallet Reality Protocol
            </span>
          </div>

          <div className="p-3 rounded-lg bg-navy-950/60 border border-navy-800">
            <span className="text-slate-400 block text-[11px]">Risk Engine</span>
            <span className="text-amber-400 font-bold mt-1 block">
              8 Deterministic Gates Active
            </span>
          </div>

          <div className="p-3 rounded-lg bg-navy-950/60 border border-navy-800">
            <span className="text-slate-400 block text-[11px]">Execution Environment</span>
            <span className="text-slate-300 font-bold mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Paper-Trading Sentinel
            </span>
          </div>
        </div>
      </section>

      {/* 3-Step How Noctive Works Section */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-mono text-electric-400 uppercase tracking-widest">
            Collateral-Aware Risk Architecture
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white font-sans">
            How Noctive Works
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            A 3-step transparent workflow protecting overnight portfolio collateral.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="p-6 rounded-2xl bg-navy-900 border border-navy-800 space-y-4 relative hover:border-navy-700 transition-all">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-electric-500/10 border border-electric-500/30 flex items-center justify-center text-electric-400 font-mono font-bold text-base">
                01
              </div>
              <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">Data Verification</span>
            </div>
            <h3 className="font-sans font-bold text-base text-white">Verify Live Reality &amp; Event Data</h3>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Monitors 24/7 Bitget Wallet Reality tokenized-equity quotes (rNVDA, rTSLA, rAAPL, rMSFT, rSPY, rQQQ) and live SEC 8-K filings during market closures with strict 1 QPS rate limits.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-2xl bg-navy-900 border border-navy-800 space-y-4 relative hover:border-navy-700 transition-all">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-mono font-bold text-base">
                02
              </div>
              <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">AI Risk Context</span>
            </div>
            <h3 className="font-sans font-bold text-sm sm:text-base text-white">Ask Qwen to Assess Risk Context</h3>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Evaluates overnight price discovery against low-liquidity noise, session status, and headline severity, formulating a reasoned risk action proposal with confidence scoring.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-2xl bg-navy-900 border border-navy-800 space-y-4 relative hover:border-navy-700 transition-all">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-base">
                03
              </div>
              <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">Deterministic Gates</span>
            </div>
            <h3 className="font-sans font-bold text-sm sm:text-base text-white">Apply Safety Gates &amp; Log Receipts</h3>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              An independent 8-gate risk engine evaluates position sizing, volatility, stop losses, and UTA margin support. Approved or blocked outcomes issue immutable paper decision receipts.
            </p>
          </div>
        </div>
      </section>

      {/* Monitored rToken Watchlist Overview */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight font-sans">
              Monitored Tokenized Equity Watchlist
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              24/7 Reality Protocol tokenized equity contracts monitored during market closures.
            </p>
          </div>
          <Link
            href="/command-center"
            className="text-xs font-mono text-electric-400 hover:underline flex items-center gap-1"
          >
            View Market Depth →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {watchlistAssets.map((asset) => (
            <div
              key={asset.symbol}
              className="p-3.5 rounded-xl bg-navy-900 border border-navy-800 space-y-1.5 hover:border-navy-700 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-white">{asset.symbol}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                    asset.change24hPct >= 0
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {asset.change24hPct >= 0 ? '+' : ''}
                  {asset.change24hPct}%
                </span>
              </div>
              <div className="font-mono text-sm text-slate-200 font-bold">${asset.currentPrice.toFixed(2)}</div>
              <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between pt-1 border-t border-navy-800">
                <span>Spread:</span>
                <span className={asset.spreadPct > 0.8 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                  {asset.spreadPct.toFixed(2)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-navy-900 border border-navy-800 space-y-3">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          <h3 className="font-bold text-white text-base">Deterministic Safety Outcomes</h3>
          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            Safety gates evaluate margin support, position limits, confidence thresholds, and stop-loss requirements. A <strong>Risk Blocked</strong> outcome is a successful safety intervention protecting portfolio collateral.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-navy-900 border border-navy-800 space-y-3">
          <FileCheck2 className="w-6 h-6 text-electric-400" />
          <h3 className="font-bold text-white text-base">Audit-Ready Decision Ledger</h3>
          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            Every evaluated candidate generates a timestamped decision receipt with full cryptographic data provenance, storing event context, AI reasoning, and risk gate results.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-navy-900 border border-navy-800 space-y-3">
          <BarChart3 className="w-6 h-6 text-amber-400" />
          <h3 className="font-bold text-white text-base">UTA Margin Stress-Testing</h3>
          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            Simulates overnight rToken collateral haircut scenarios against active USDT derivative positions to identify margin health degradation prior to regular market open.
          </p>
        </div>
      </section>
    </div>
  );
}
