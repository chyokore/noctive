'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Cpu,
  ArrowRight,
  Radio,
  Zap,
  Lock,
  BarChart3,
  Layers,
  FileCheck2,
  CheckCircle2,
  TrendingUp,
  AlertOctagon,
  LineChart,
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
          {/* Hackathon Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-electric-500/10 border border-electric-500/30 text-electric-400 text-xs font-mono font-medium">
            <Radio className="w-3.5 h-3.5 text-electric-400 animate-pulse" />
            <span>Bitget AI Base Camp Hackathon S2 • Agentic Trading Track</span>
          </div>

          {/* Main Title & Thesis */}
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Autonomous Overnight Intelligence for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-electric-400 via-blue-400 to-teal-400">
              Tokenized US Equities
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-sans max-w-3xl">
            <strong>Noctive</strong> is a collateral-aware overnight risk intelligence agent for tokenized US equities (rTokens). Operating during traditional US market closures, Noctive determines whether an overnight price movement reflects <strong>meaningful price discovery</strong> or <strong>low-liquidity noise</strong>, protecting simulated portfolio margin support before market open.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/uta-sentinel"
              className="px-6 py-3.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-mono text-sm font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all hover:scale-105"
            >
              <span>Explore UTA Sentinel</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/command-center"
              className="px-6 py-3.5 rounded-xl bg-electric-600 hover:bg-electric-500 text-white font-mono text-sm font-semibold flex items-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all hover:scale-105"
            >
              <span>Launch Command Center</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/demo-scenarios"
              className="px-6 py-3.5 rounded-xl bg-navy-800 hover:bg-navy-700 border border-navy-700 text-slate-200 font-mono text-sm font-medium flex items-center gap-2 transition-all hover:text-white"
            >
              <span>Run Interactive Demo Scenarios</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </Link>
          </div>
        </div>

        {/* System Telemetry Bar */}
        <div className="mt-10 pt-6 border-t border-navy-800/80 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3 rounded-lg bg-navy-950/60 border border-navy-800">
            <span className="text-slate-400 block text-[11px]">System Status</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Agent Monitoring Active
            </span>
          </div>

          <div className="p-3 rounded-lg bg-navy-950/60 border border-navy-800">
            <span className="text-slate-400 block text-[11px]">Market Session</span>
            <span className="text-electric-400 font-bold mt-1 block">
              US Closed • rToken 24/7 Session
            </span>
          </div>

          <div className="p-3 rounded-lg bg-navy-950/60 border border-navy-800">
            <span className="text-slate-400 block text-[11px]">Risk Engine</span>
            <span className="text-teal-400 font-bold mt-1 block">
              8 Deterministic Gates Active
            </span>
          </div>

          <div className="p-3 rounded-lg bg-navy-950/60 border border-navy-800">
            <span className="text-slate-400 block text-[11px]">Execution Mode</span>
            <span className="text-emerald-400 font-bold mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Paper Trading Only
            </span>
          </div>
        </div>
      </section>

      {/* Core Watchlist Overview */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight font-sans">
              Monitored rToken Equity Watchlist
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Configurable 24/7 tokenized stocks monitored for overnight price discovery.
            </p>
          </div>
          <Link
            href="/command-center"
            className="text-xs font-mono text-electric-400 hover:underline flex items-center gap-1"
          >
            View Live Depth →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {watchlistAssets.map((asset) => (
            <div
              key={asset.symbol}
              className="p-3 rounded-xl bg-navy-900 border border-navy-800 space-y-1 hover:border-navy-700 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-white">{asset.symbol}</span>
                <span
                  className={`text-[10px] font-mono px-1 rounded ${
                    asset.change24hPct >= 0
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-rose-500/10 text-rose-400'
                  }`}
                >
                  {asset.change24hPct >= 0 ? '+' : ''}
                  {asset.change24hPct}%
                </span>
              </div>
              <div className="font-mono text-sm text-slate-200">${asset.currentPrice.toFixed(2)}</div>
              <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
                <span>Spread:</span>
                <span className={asset.spreadPct > 0.8 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                  {asset.spreadPct.toFixed(2)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How Noctive Works Section */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-mono text-electric-400 uppercase tracking-widest">
            Deterministic Decision Architecture
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white font-sans">
            How Noctive Protects & Allocates Overnight
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Every step is transparent, audit-ready, and backed by cryptographic decision receipts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Step 1 */}
          <div className="p-5 rounded-xl bg-navy-900 border border-navy-800 space-y-3 relative">
            <div className="w-8 h-8 rounded-lg bg-electric-500/10 border border-electric-500/30 flex items-center justify-center text-electric-400 font-mono font-bold text-sm">
              01
            </div>
            <h3 className="font-sans font-bold text-sm text-white">Event Evidence Ingestion</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Gathers structured headline evidence, SEC Form 8-K filings, regulatory wires, and macro announcements during traditional market closures.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-5 rounded-xl bg-navy-900 border border-navy-800 space-y-3 relative">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-mono font-bold text-sm">
              02
            </div>
            <h3 className="font-sans font-bold text-sm text-white">Overnight Liquidity Guard</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Evaluates bid-ask spread and order book depth score to filter out low-liquidity speculative noise before trade evaluation.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-5 rounded-xl bg-navy-900 border border-navy-800 space-y-3 relative">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 font-mono font-bold text-sm">
              03
            </div>
            <h3 className="font-sans font-bold text-sm text-white">Autonomous Decision Engine</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Formulates one clear decision: <code>Enter Long</code>, <code>Enter Short</code>, <code>Reduce</code>, or <code>Stand Down</code> with strict confidence scoring.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-5 rounded-xl bg-navy-900 border border-navy-800 space-y-3 relative">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-sm">
              04
            </div>
            <h3 className="font-sans font-bold text-sm text-white">Deterministic 8-Gate Risk Check</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              An independent risk engine checks 8 hard capital rules. Approved actions generate paper orders and immutable audit receipts.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl bg-navy-900 border border-navy-800 space-y-3">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          <h3 className="font-bold text-white text-base">Deterministic Risk Gate</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Position sizing limits, maximum concurrent active positions, confidence thresholds, volatility guards, stop-loss requirements, and daily loss limits.
          </p>
        </div>

        <div className="p-6 rounded-xl bg-navy-900 border border-navy-800 space-y-3">
          <FileCheck2 className="w-6 h-6 text-electric-400" />
          <h3 className="font-bold text-white text-base">Audit-Ready Decision Ledger</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Every autonomous decision generates a timestamped receipt with cryptographic payload signature, storing event context, reasoning, and risk evaluation.
          </p>
        </div>

        <div className="p-6 rounded-xl bg-navy-900 border border-navy-800 space-y-3">
          <BarChart3 className="w-6 h-6 text-teal-400" />
          <h3 className="font-bold text-white text-base">Opening-Gap Replay Lab</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Evaluates overnight rToken decisions against actual US market regular session opening gaps to quantify price discovery accuracy and extract retrospective lessons.
          </p>
        </div>
      </section>
    </div>
  );
}
