'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { HeaderNav } from '@/components/HeaderNav';
import {
  ShieldAlert,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Radio,
  FileText,
  Clock,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { OvernightStressTestAssessment } from '@/lib/engine/overnightStressTestEngine';

export default function OvernightStressTestPage() {
  const [activeTicker, setActiveTicker] = useState<string>('NVDA');
  const [data, setData] = useState<{
    success: boolean;
    providerStatus: string;
    activeAssessment: OvernightStressTestAssessment | null;
    watchlistAssessments: OvernightStressTestAssessment[];
    errorMessage?: string;
    timestamp?: string;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchStressTest = async (ticker: string) => {
    try {
      setRefreshing(true);
      const res = await fetch(`/api/overnight-stress-test?ticker=${ticker}`, {
        cache: 'no-store',
      });
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error('Failed to fetch overnight stress test data:', err);
      setData({
        success: false,
        providerStatus: 'ERROR',
        activeAssessment: null,
        watchlistAssessments: [],
        errorMessage:
          'Verified Reality market data is currently unavailable for Overnight Collateral Stress Test.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStressTest(activeTicker);
  }, [activeTicker]);

  const active = data?.activeAssessment;

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 font-sans selection:bg-electric-500 selection:text-white pb-20">
      <HeaderNav />

      {/* Top Evaluator Banner */}
      <div className="bg-amber-500/10 border-b border-amber-500/30 py-3 px-4 sm:px-6 text-center">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-xs sm:text-sm font-mono text-amber-300">
          <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>
            Traditional equities may be closed while tokenized-equity price discovery continues. Noctive surfaces potential overnight collateral stress before the next market open.
          </span>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Title Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-navy-800 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                NOCTIVE UTA SENTINEL
              </span>
              <span className="text-xs font-mono text-slate-400">| Judge-Facing Risk Profile</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Overnight Collateral Stress Test
            </h1>
            <p className="text-sm text-slate-400 max-w-3xl mt-1 leading-relaxed">
              Noctive is an overnight collateral-risk sentinel for tokenized US equities. Its job is to identify when verified Bitget Wallet Reality rToken price movement creates potential collateral risk while traditional equity markets are closed.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchStressTest(activeTicker)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-900 border border-navy-700 text-xs font-mono text-slate-300 hover:text-white hover:border-slate-500 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Reality Data</span>
            </button>

            <Link
              href="/market-pulse"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-electric-500/10 border border-electric-500/30 text-xs font-mono text-electric-400 hover:bg-electric-500/20 transition-all"
            >
              <Radio className="w-3.5 h-3.5 text-electric-400" />
              <span>Market Pulse</span>
            </Link>
          </div>
        </div>

        {/* Watchlist Ticker Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Select Watchlist Asset for Stress Test:
            </span>
            <span className="text-xs font-mono text-amber-400/80">
              Verified Bitget Wallet Watchlist
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {['NVDA', 'AAPL', 'MSFT', 'TSLA', 'SPY', 'QQQ'].map((t) => {
              const rSymbol = `r${t}`;
              const isSelected = activeTicker === t;
              const matchingAssessment = data?.watchlistAssessments?.find(
                (a) => a.ticker === t
              );
              const changePct = matchingAssessment?.native24hChangePct;

              return (
                <button
                  key={t}
                  onClick={() => setActiveTicker(t)}
                  className={`flex flex-col items-center p-3 rounded-xl border transition-all text-left ${
                    isSelected
                      ? 'bg-electric-500/15 border-electric-400/80 shadow-[0_0_15px_rgba(59,130,246,0.25)] text-white'
                      : 'bg-navy-900/80 border-navy-800 hover:border-navy-700 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-mono font-bold text-sm">{rSymbol}</span>
                    <span className="text-[10px] font-mono text-slate-400">{t}</span>
                  </div>
                  {changePct !== undefined ? (
                    <span
                      className={`text-xs font-mono font-bold mt-1 ${
                        changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {changePct >= 0 ? '+' : ''}
                      {changePct.toFixed(2)}%
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-500 mt-1">Live</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-12 rounded-2xl bg-navy-900/50 border border-navy-800 flex flex-col items-center justify-center space-y-4">
            <RefreshCw className="w-8 h-8 text-electric-400 animate-spin" />
            <p className="text-sm font-mono text-slate-400">
              Fetching verified Bitget Wallet Reality market data & computing overnight collateral stress...
            </p>
          </div>
        )}

        {/* Fail Closed Error State */}
        {!loading && (!data?.success || !active) && (
          <div className="p-8 rounded-2xl bg-navy-900/90 border border-rose-500/40 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-lg text-white">
                Verified Market Data Unavailable
              </h3>
              <p className="text-sm text-slate-300 mt-1 max-w-xl mx-auto font-mono">
                {data?.errorMessage ||
                  'Verified Reality market data is currently unavailable for Overnight Collateral Stress Test.'}
              </p>
            </div>
            <div className="pt-2 text-xs font-mono text-slate-400">
              Fail-Closed Protection Active — No speculative or fabricated prices rendered.
            </div>
          </div>
        )}

        {/* Main Stress Test Dashboard */}
        {!loading && data?.success && active && (
          <div className="space-y-6">
            {/* Status Header Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Verified Native 24h Change */}
              <div className="p-6 rounded-2xl bg-navy-900/90 border border-navy-800 flex flex-col justify-between space-y-4 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    {active.labels.verifiedInput}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {active.labels.notTradeSignal}
                  </span>
                </div>

                <div>
                  <div className="text-xs font-mono text-slate-400 uppercase">
                    {active.rTokenSymbol} Native 24h Change
                  </div>
                  <div className="flex items-baseline gap-3 mt-1">
                    <span
                      className={`text-3xl font-mono font-extrabold ${
                        active.native24hChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {active.native24hChangePct >= 0 ? '+' : ''}
                      {active.native24hChangePct.toFixed(2)}%
                    </span>
                    <span className="text-sm font-mono text-slate-300">
                      ${active.latestRTokenPrice.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-slate-400 border-t border-navy-800/80 pt-3 flex justify-between">
                  <span>Reality Chain: {active.provenance.chain}</span>
                  <span className="truncate max-w-[140px]" title={active.provenance.contractAddress}>
                    Contract: {active.provenance.contractAddress.slice(0, 6)}...
                  </span>
                </div>
              </div>

              {/* Card 2: Underlying Stock Reference */}
              <div className="p-6 rounded-2xl bg-navy-900/90 border border-navy-800 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-sky-400 uppercase tracking-wider px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">
                    {active.labels.underlyingRef}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {active.underlyingReference.referenceAgeText}
                  </span>
                </div>

                <div>
                  <div className="text-xs font-mono text-slate-400 uppercase">
                    {active.underlyingReference.symbol} Reference
                  </div>
                  <div className="text-xl font-mono font-bold text-white mt-1">
                    {active.underlyingReference.name}
                  </div>
                  <div className="text-xs font-mono text-slate-400 mt-1">
                    Source: {active.underlyingReference.source}
                  </div>
                </div>

                <div className="text-[11px] font-mono text-amber-300/90 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 leading-snug">
                  {active.underlyingReference.disclaimer}
                </div>
              </div>

              {/* Card 3: Deterministic Gap Risk Status & Posture */}
              <div className="p-6 rounded-2xl bg-navy-900/90 border border-navy-800 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">
                    Deterministic Status
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">8-Gate Engine</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-xs font-mono text-slate-400 uppercase block mb-1">
                      Overnight Gap Risk
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-mono font-bold text-sm border ${
                        active.gapRiskStatus === 'Elevated'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                          : active.gapRiskStatus === 'Watch'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4" />
                      <span>{active.gapRiskStatus.toUpperCase()} GAP RISK</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-mono text-slate-400 uppercase block mb-1">
                      Recommended Posture
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-mono font-bold text-sm border ${
                        active.recommendedPosture === 'Reduce Exposure'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : active.recommendedPosture === 'Monitor'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-electric-500/20 text-electric-300 border-electric-500/40'
                      }`}
                    >
                      <Activity className="w-4 h-4" />
                      <span>{active.recommendedPosture}</span>
                    </span>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-slate-400 border-t border-navy-800/80 pt-2">
                  {active.thresholdRationale}
                </div>
              </div>
            </div>

            {/* Illustrative Collateral Scenario Panel */}
            <div className="p-6 rounded-2xl bg-navy-900/90 border border-amber-500/30 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-navy-800 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20">
                    {active.labels.illustrativeScenario}
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Fixed Hypothetical Model ($100,000 Portfolio)
                </span>
              </div>

              <div className="text-xs font-mono text-amber-300/90 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 leading-relaxed">
                {active.collateralScenario.disclaimer}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-navy-950 border border-navy-800">
                  <span className="text-[11px] font-mono text-slate-400 uppercase block">
                    Hypothetical Position
                  </span>
                  <span className="text-lg font-mono font-bold text-white mt-1 block">
                    ${active.collateralScenario.hypotheticalPortfolioUsd.toLocaleString()}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 mt-1 block">
                    Tokenized Equity Collateral
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-navy-950 border border-navy-800">
                  <span className="text-[11px] font-mono text-slate-400 uppercase block">
                    Base Collateral Ratio
                  </span>
                  <span className="text-lg font-mono font-bold text-emerald-400 mt-1 block">
                    {active.collateralScenario.baseCollateralRatioPct.toFixed(1)}%
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 mt-1 block">
                    Initial Margin Requirement
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-navy-950 border border-navy-800">
                  <span className="text-[11px] font-mono text-slate-400 uppercase block">
                    Stressed Position Value
                  </span>
                  <span
                    className={`text-lg font-mono font-bold mt-1 block ${
                      active.collateralScenario.bufferImpactUsd >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    ${active.collateralScenario.stressedPortfolioUsd.toLocaleString()}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 mt-1 block">
                    Impact: {active.collateralScenario.bufferImpactUsd >= 0 ? '+' : ''}$
                    {active.collateralScenario.bufferImpactUsd.toLocaleString()}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-navy-950 border border-navy-800">
                  <span className="text-[11px] font-mono text-slate-400 uppercase block">
                    Stressed Margin Buffer
                  </span>
                  <span
                    className={`text-lg font-mono font-bold mt-1 block ${
                      active.collateralScenario.isLiquidationWarning
                        ? 'text-rose-400'
                        : active.collateralScenario.stressedCollateralRatioPct < 145
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {active.collateralScenario.stressedCollateralRatioPct.toFixed(1)}%
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 mt-1 block">
                    Liquidation Alert: &lt;{active.collateralScenario.liquidationWarningRatioPct}%
                  </span>
                </div>
              </div>
            </div>

            {/* Stage 2: Qwen Risk Assessment */}
            <div className="p-6 rounded-2xl bg-navy-900/90 border border-electric-500/30 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-electric-500/20 border border-electric-500/40 flex items-center justify-center text-electric-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-sans font-bold text-base text-white">
                    Stage 2: Qwen Risk Assessment
                  </h2>
                  <p className="text-[11px] font-mono text-slate-400">
                    Autonomous LLM evaluation of verified overnight price discovery & collateral impact
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 font-mono text-xs text-slate-300 leading-relaxed">
                {active.qwenRiskAssessment}
              </div>
            </div>

            {/* Full Provenance & Traceability Panel */}
            <div className="p-6 rounded-2xl bg-navy-900/90 border border-navy-800 space-y-4">
              <div className="flex items-center justify-between border-b border-navy-800 pb-3">
                <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Full Provenance & Audit Verification</span>
                </span>
                <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified Read-Only Telemetry</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block">Bitget Reality Chain:</span>
                  <span className="text-slate-200 font-bold">{active.provenance.chain}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Smart Contract Address:</span>
                  <span className="text-slate-200 font-bold truncate block" title={active.provenance.contractAddress}>
                    {active.provenance.contractAddress}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Quote Timestamp:</span>
                  <span className="text-slate-200">{active.provenance.quoteTimestamp}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Retrieval Timestamp:</span>
                  <span className="text-slate-200">{active.provenance.retrievalTimestamp}</span>
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <span className="text-slate-500 block">Source API Endpoint:</span>
                  <span className="text-slate-200 truncate block" title={active.provenance.sourceEndpoint}>
                    {active.provenance.sourceEndpoint}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
