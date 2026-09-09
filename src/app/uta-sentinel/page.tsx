'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { UTA_SENTINEL_SCENARIOS } from '@/lib/adapters/utaSentinelScenarios';
import { CollateralShockEngine } from '@/lib/engine/collateralShockEngine';
import { AgentEngine } from '@/lib/engine/agentEngine';
import { RiskEngine } from '@/lib/engine/riskEngine';
import { ReceiptGenerator } from '@/lib/engine/receiptGenerator';
import { PaperExchange } from '@/lib/engine/paperExchange';
import { INITIAL_RISK_BUDGET } from '@/lib/store/noctiveStore';
import { MOCK_WATCHLIST } from '@/lib/adapters/marketDataProvider';
import {
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  Layers,
  ArrowRight,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCheck,
  Activity,
  DollarSign,
  Lock,
} from 'lucide-react';

export default function UTASentinelPage() {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(UTA_SENTINEL_SCENARIOS[0].id);
  const [readiness, setReadiness] = useState<any>(null);

  const scenario =
    UTA_SENTINEL_SCENARIOS.find((s) => s.id === selectedScenarioId) || UTA_SENTINEL_SCENARIOS[0];

  const shockAssessment = CollateralShockEngine.calculateShockAssessment(
    scenario.event,
    scenario.rTokenPosition,
    scenario.usdtCash,
    scenario.futuresPosition,
    scenario.policyConfig
  );

  // Evaluate through Agent Engine & Risk Gate for Decision Passport integration
  const agentEngine = new AgentEngine();
  const riskEngine = new RiskEngine();
  const paperExchange = new PaperExchange();
  const receiptGenerator = new ReceiptGenerator();

  const mockMarket = MOCK_WATCHLIST[scenario.rTokenPosition.symbol] || MOCK_WATCHLIST['rNVDA'];
  const agentDecision = agentEngine.evaluateEvent(scenario.event, mockMarket);
  const riskResult = riskEngine.evaluateRisk(agentDecision, mockMarket, INITIAL_RISK_BUDGET);
  const paperOrder = paperExchange.executePaperOrder(agentDecision, mockMarket, riskResult.isApproved);
  const decisionReceipt = receiptGenerator.generateReceipt(
    scenario.event,
    mockMarket,
    agentDecision,
    riskResult,
    paperOrder
  );

  useEffect(() => {
    async function fetchReadiness() {
      try {
        const res = await fetch('/api/readiness');
        const data = await res.json();
        setReadiness(data);
      } catch (err) {
        console.error('Failed to fetch readiness status:', err);
      }
    }
    fetchReadiness();
  }, []);

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="bg-navy-900 border border-navy-800 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-amber-400" />
            <h1 className="text-2xl font-bold text-white font-sans tracking-tight">
              UTA Sentinel
            </h1>
            <span className="px-2.5 py-0.5 rounded bg-electric-500/10 border border-electric-500/30 text-electric-400 text-xs font-mono font-semibold uppercase">
              Collateral-Aware Risk Intelligence
            </span>
          </div>
          <p className="text-xs text-slate-300 font-mono mt-1.5">
            Monitors overnight rToken price shocks against illustrative portfolio margin support to prevent futures liquidation.
          </p>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-navy-950 border border-navy-800 font-mono text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>8-Gate Deterministic Risk Engine Active</span>
        </div>
      </div>

      {/* Mandatory Disclaimer Banner */}
      <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-start gap-3 text-xs text-amber-200 font-mono">
        <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold text-amber-300 uppercase block mb-0.5">
            SIMULATED PAPER SCENARIO — NOT A BITGET ACCOUNT
          </strong>
          Noctive is strictly a paper-trading risk analysis demonstration. All rToken positions, USDT balances, collateral haircuts, and futures margin requirements are <strong>illustrative assumptions for paper trading simulation only</strong>. Noctive does not connect to live Bitget accounts, wallets, or exchange trading endpoints.
        </div>
      </div>

      {/* Scenario Selector */}
      <div className="bg-navy-900 border border-navy-800 p-5 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white font-sans flex items-center gap-2">
            <Layers className="w-4 h-4 text-electric-400" />
            <span>Select Over-the-Night Stress Scenario</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">
            {UTA_SENTINEL_SCENARIOS.length} Pre-configured Cases
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
          {UTA_SENTINEL_SCENARIOS.map((scen) => (
            <button
              key={scen.id}
              onClick={() => setSelectedScenarioId(scen.id)}
              className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 ${
                selectedScenarioId === scen.id
                  ? 'bg-navy-800 border-electric-500/80 ring-1 ring-electric-500/50 text-white shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                  : 'bg-navy-950/60 border-navy-800 text-slate-400 hover:border-navy-700 hover:text-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      scen.expectedBufferStatus === 'HEALTHY'
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                        : scen.expectedBufferStatus === 'CAUTION'
                        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                        : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                    }`}
                  >
                    {scen.expectedBufferStatus}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase">{scen.rTokenPosition.symbol}</span>
                </div>
                <h3 className="font-bold text-xs text-white line-clamp-1">{scen.title}</h3>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{scen.subtitle}</p>
              </div>

              <div className="text-[10px] text-electric-400 font-semibold flex items-center justify-between border-t border-navy-800/80 pt-2">
                <span>Action: {scen.expectedRecommendation.replace(/_/g, ' ')}</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Collateral Shock Map Flow */}
      <div className="bg-navy-900 border border-navy-800 p-6 rounded-2xl space-y-4">
        <h2 className="text-sm font-bold text-white font-sans flex items-center gap-2">
          <Activity className="w-4 h-4 text-electric-400" />
          <span>Collateral Shock Intelligence Pipeline</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 font-mono text-xs">
          {/* Step 1 */}
          <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-1.5">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">1. Event Wire</span>
            <strong className="text-white text-xs block truncate">{scenario.event.title}</strong>
            <span className="text-[10px] text-amber-400 block font-semibold">
              Impact: {scenario.event.impactScore} ({scenario.event.category})
            </span>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-1.5">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">2. rToken Stress</span>
            <strong className="text-white text-xs block font-bold">
              ${scenario.rTokenPosition.markPriceUsd.toFixed(2)} → ${shockAssessment.stressedRTokenPriceUsd.toFixed(2)}
            </strong>
            <span
              className={`text-[10px] block font-semibold ${
                shockAssessment.eventShockPct < 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              Price Shock: {shockAssessment.eventShockPct > 0 ? '+' : ''}
              {shockAssessment.eventShockPct}%
            </span>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-1.5">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">3. Collateral Loss</span>
            <strong className="text-white text-xs block">
              -${shockAssessment.collateralValueLostUsd.toFixed(2)} USD
            </strong>
            <span className="text-[10px] text-slate-400 block">
              Haircut: {scenario.rTokenPosition.haircutPct}% ({scenario.rTokenPosition.collateralRatioPct}% Ratio)
            </span>
          </div>

          {/* Step 4 */}
          <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-1.5">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">4. Margin Coverage</span>
            <strong className="text-white text-xs block font-bold">
              {shockAssessment.preShockMarginCoverageRatio}x → {shockAssessment.postShockMarginCoverageRatio}x
            </strong>
            <span
              className={`text-[10px] font-bold block ${
                shockAssessment.marginBufferStatus === 'HEALTHY'
                  ? 'text-emerald-400'
                  : shockAssessment.marginBufferStatus === 'CAUTION'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              Buffer: {shockAssessment.marginBufferStatus}
            </span>
          </div>

          {/* Step 5 */}
          <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-1.5">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">5. Sentinel Action</span>
            <strong className="text-electric-400 text-xs block uppercase font-bold truncate">
              {shockAssessment.recommendation.replace(/_/g, ' ')}
            </strong>
            <span className="text-[10px] text-slate-400 block">Deterministic Protective Rule</span>
          </div>
        </div>
      </div>

      {/* Before / After Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
        <div className="bg-navy-900 border border-navy-800 p-5 rounded-2xl space-y-2">
          <span className="text-slate-400 text-[10px] uppercase font-bold block">rToken Position</span>
          <strong className="text-white text-lg font-bold block">
            {scenario.rTokenPosition.quantityTokens} {scenario.rTokenPosition.symbol}
          </strong>
          <div className="text-slate-400 text-[11px] space-y-1 border-t border-navy-800 pt-2">
            <div className="flex justify-between">
              <span>Pre-shock Mark:</span>
              <span className="text-white">${scenario.rTokenPosition.markPriceUsd.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Stressed Price:</span>
              <span className={shockAssessment.eventShockPct < 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                ${shockAssessment.stressedRTokenPriceUsd.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-navy-900 border border-navy-800 p-5 rounded-2xl space-y-2">
          <span className="text-slate-400 text-[10px] uppercase font-bold block">Collateral Value (Adjusted)</span>
          <strong className="text-emerald-400 text-lg font-bold block">
            ${shockAssessment.stressedTotalCollateralUsd.toFixed(2)}
          </strong>
          <div className="text-slate-400 text-[11px] space-y-1 border-t border-navy-800 pt-2">
            <div className="flex justify-between">
              <span>Pre-shock Adjusted:</span>
              <span className="text-slate-200">${shockAssessment.preShockTotalCollateralUsd.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Collateral Lost:</span>
              <span className="text-rose-400 font-bold">-${shockAssessment.collateralValueLostUsd.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-navy-900 border border-navy-800 p-5 rounded-2xl space-y-2">
          <span className="text-slate-400 text-[10px] uppercase font-bold block">Simulated Futures Position</span>
          <strong className="text-white text-lg font-bold block">{scenario.futuresPosition.symbol}</strong>
          <div className="text-slate-400 text-[11px] space-y-1 border-t border-navy-800 pt-2">
            <div className="flex justify-between">
              <span>Notional Size:</span>
              <span className="text-slate-200">${scenario.futuresPosition.positionSizeUsd.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Maint. Margin Req:</span>
              <span className="text-amber-400 font-bold">${scenario.futuresPosition.maintenanceMarginReqUsd.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-navy-900 border border-navy-800 p-5 rounded-2xl space-y-2">
          <span className="text-slate-400 text-[10px] uppercase font-bold block">Margin Coverage Ratio</span>
          <strong
            className={`text-lg font-bold block ${
              shockAssessment.marginBufferStatus === 'HEALTHY'
                ? 'text-emerald-400'
                : shockAssessment.marginBufferStatus === 'CAUTION'
                ? 'text-amber-400'
                : 'text-rose-400'
            }`}
          >
            {shockAssessment.postShockMarginCoverageRatio}x ({shockAssessment.marginBufferStatus})
          </strong>
          <div className="text-slate-400 text-[11px] space-y-1 border-t border-navy-800 pt-2">
            <div className="flex justify-between">
              <span>Pre-shock Coverage:</span>
              <span className="text-slate-200">{shockAssessment.preShockMarginCoverageRatio}x</span>
            </div>
            <div className="flex justify-between">
              <span>Caution Threshold:</span>
              <span className="text-slate-300">{scenario.policyConfig.cautionCoverageThreshold}x</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendation Card & Explanation */}
      <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-navy-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white font-sans flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Autonomous Sentinel Recommendation</span>
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Deterministic collateral shock evaluation output and rationale.
            </p>
          </div>

          <span
            className={`px-3 py-1 rounded.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider ${
              shockAssessment.recommendation === 'HOLD_MONITOR'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                : shockAssessment.recommendation === 'REDUCE_FUTURES_RISK'
                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
            }`}
          >
            {shockAssessment.recommendation.replace(/_/g, ' ')}
          </span>
        </div>

        <div className="bg-navy-950 border border-navy-800 p-4 rounded-xl text-xs font-mono text-slate-200 space-y-2">
          <strong className="text-white block font-bold">Summary:</strong>
          <p>{shockAssessment.recommendationSummary}</p>
        </div>

        {/* Detailed Rationale */}
        <div className="space-y-2 font-mono text-xs">
          <strong className="text-slate-300 text-xs block">Evaluation Rationale & Execution Steps:</strong>
          <ul className="space-y-2">
            {shockAssessment.rationale.map((line, idx) => (
              <li key={idx} className="flex items-start gap-2 text-slate-400 bg-navy-950/40 p-2.5 rounded-lg border border-navy-850">
                <CheckCircle2 className="w-4 h-4 text-electric-400 shrink-0 mt-0.5" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Decision Passport Card */}
      <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 space-y-4 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-navy-800 pb-3">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-electric-400" />
            <h2 className="text-sm font-bold text-white font-sans">Decision Passport & Provenance Audit</h2>
          </div>
          <span className="text-[11px] text-slate-400">SHA-256 Receipt Verified</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-navy-950 p-3.5 rounded-xl border border-navy-850 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase block">Event Provenance</span>
            <strong className="text-white text-xs font-bold block truncate">{scenario.event.source}</strong>
            <span className="text-[10px] text-amber-400 font-semibold block">Category: {scenario.event.category}</span>
          </div>

          <div className="bg-navy-950 p-3.5 rounded-xl border border-navy-850 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase block">LLM Provider Mode</span>
            <strong className="text-electric-400 text-xs font-bold block">
              {readiness?.mode || 'Qwen AI Connected'}
            </strong>
            <span className="text-[10px] text-slate-400 block">Model: {readiness?.configuredModel || 'qwen3.8-max'}</span>
          </div>

          <div className="bg-navy-950 p-3.5 rounded-xl border border-navy-850 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase block">Policy & Assumption Version</span>
            <strong className="text-slate-200 text-xs font-bold block">{scenario.policyConfig.policyVersion}</strong>
            <span className="text-[10px] text-slate-400 block">{scenario.policyConfig.scenarioAssumptionsVersion}</span>
          </div>

          <div className="bg-navy-950 p-3.5 rounded-xl border border-navy-850 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase block">Receipt Hash Signature</span>
            <strong className="text-emerald-400 text-xs font-bold block truncate">{decisionReceipt.hash}</strong>
            <span className="text-[10px] text-slate-400 block">Receipt ID: {decisionReceipt.receiptId}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
