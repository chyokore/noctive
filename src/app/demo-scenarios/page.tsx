'use client';

import React, { useState } from 'react';
import { DEMO_SCENARIOS, INITIAL_RISK_BUDGET } from '@/lib/store/noctiveStore';
import { DemoScenario, DecisionReceipt, RiskEvaluationResult, AgentDecision, PaperOrder } from '@/types/domain';
import { AgentEngine } from '@/lib/engine/agentEngine';
import { RiskEngine } from '@/lib/engine/riskEngine';
import { PaperExchange } from '@/lib/engine/paperExchange';
import { ReceiptGenerator } from '@/lib/engine/receiptGenerator';
import { RiskCheckMatrix } from '@/components/RiskCheckMatrix';
import Link from 'next/link';
import {
  PlayCircle,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCheck2,
  Radio,
  Cpu,
  ShieldCheck,
  ArrowRight,
  Info,
} from 'lucide-react';

export default function DemoScenariosPage() {
  const [scenarios] = useState<DemoScenario[]>(DEMO_SCENARIOS);
  const [activeScenario, setActiveScenario] = useState<DemoScenario>(DEMO_SCENARIOS[0]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const [activeReceipt, setActiveReceipt] = useState<DecisionReceipt | null>(null);

  const agentEngine = new AgentEngine();
  const riskEngine = new RiskEngine();
  const paperExchange = new PaperExchange();
  const receiptGenerator = new ReceiptGenerator();

  const handleRunScenario = (sc: DemoScenario) => {
    setActiveScenario(sc);
    setIsRunning(true);
    setCurrentStep(1);
    setActiveReceipt(null);

    // Step 1: Event Ingestion
    setTimeout(() => {
      setCurrentStep(2); // Agent Synthesis
    }, 600);

    // Step 2: Risk Evaluation
    setTimeout(() => {
      setCurrentStep(3); // Risk Gate
    }, 1200);

    // Step 3: Receipt Generation
    setTimeout(() => {
      setCurrentStep(4); // Execution & Receipt

      // Calculate receipt
      let config = INITIAL_RISK_BUDGET;
      if (sc.id === 'demo-risk-blocked') {
        config = { ...INITIAL_RISK_BUDGET, currentActivePositions: 3 }; // Force max positions block
      }

      const dec = agentEngine.evaluateEvent(sc.event, sc.marketContext);
      const risk = riskEngine.evaluateRisk(dec, sc.marketContext, config);
      const order = paperExchange.executePaperOrder(dec, sc.marketContext, risk.isApproved);
      const receipt = receiptGenerator.generateReceipt(sc.event, sc.marketContext, dec, risk, order);

      setActiveReceipt(receipt);
      setIsRunning(false);
    }, 1800);
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-navy-900 border border-navy-800 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <PlayCircle className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-bold text-white font-sans tracking-tight">Interactive Demo Scenarios</h1>
            <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-medium flex items-center gap-1">
              <Info className="w-3 h-3 text-amber-400" /> Demo Data
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Pre-packaged realistic scenarios testing autonomous agent decisions, liquidity noise rejection, and deterministic risk gate enforcement.
          </p>
        </div>
      </div>

      {/* Scenarios Selector Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {scenarios.map((sc) => {
          const isSelected = activeScenario.id === sc.id;
          return (
            <div
              key={sc.id}
              onClick={() => handleRunScenario(sc)}
              className={`p-6 rounded-2xl border transition-all cursor-pointer space-y-4 flex flex-col justify-between ${
                isSelected
                  ? 'bg-navy-850 border-electric-500 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                  : 'bg-navy-900 border-navy-800 hover:border-navy-700'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span
                    className={`px-2.5 py-1 rounded font-bold uppercase text-[10px] ${
                      sc.category === 'CREDIBLE_APPROVED'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : sc.category === 'NOISY_REJECTED'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {sc.badgeLabel}
                  </span>
                  <span className="text-slate-500">Demo Data</span>
                </div>

                <h3 className="font-sans font-bold text-base text-white">{sc.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">{sc.description}</p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRunScenario(sc);
                }}
                className={`w-full py-2.5 rounded-xl font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  isSelected
                    ? 'bg-electric-600 text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                    : 'bg-navy-950 text-slate-300 hover:bg-navy-800 border border-navy-800'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Run Interactive Scenario</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Live Runner Processing Timeline */}
      <div className="bg-navy-900 border border-navy-800 p-6 rounded-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-navy-800 pb-4">
          <div>
            <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest block">
              Autonomous Execution Pipeline
            </span>
            <h2 className="text-lg font-bold text-white font-sans">
              Scenario: {activeScenario.title}
            </h2>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
            <span className="px-2 py-0.5 rounded bg-navy-950 border border-navy-800">
              Asset: <strong className="text-white">{activeScenario.marketContext.symbol}</strong>
            </span>
          </div>
        </div>

        {/* Timeline progress steps */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div
            className={`p-3.5 rounded-xl border space-y-1 transition-all ${
              currentStep >= 1
                ? 'bg-electric-500/10 border-electric-500/40 text-electric-400'
                : 'bg-navy-950 border-navy-800 text-slate-500'
            }`}
          >
            <span className="text-[10px] block uppercase font-bold">Step 1</span>
            <span className="font-sans font-bold block text-white text-xs">Event Ingestion</span>
          </div>

          <div
            className={`p-3.5 rounded-xl border space-y-1 transition-all ${
              currentStep >= 2
                ? 'bg-electric-500/10 border-electric-500/40 text-electric-400'
                : 'bg-navy-950 border-navy-800 text-slate-500'
            }`}
          >
            <span className="text-[10px] block uppercase font-bold">Step 2</span>
            <span className="font-sans font-bold block text-white text-xs">Agent Synthesis</span>
          </div>

          <div
            className={`p-3.5 rounded-xl border space-y-1 transition-all ${
              currentStep >= 3
                ? 'bg-electric-500/10 border-electric-500/40 text-electric-400'
                : 'bg-navy-950 border-navy-800 text-slate-500'
            }`}
          >
            <span className="text-[10px] block uppercase font-bold">Step 3</span>
            <span className="font-sans font-bold block text-white text-xs">Risk Gate Check</span>
          </div>

          <div
            className={`p-3.5 rounded-xl border space-y-1 transition-all ${
              currentStep >= 4
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                : 'bg-navy-950 border-navy-800 text-slate-500'
            }`}
          >
            <span className="text-[10px] block uppercase font-bold">Step 4</span>
            <span className="font-sans font-bold block text-white text-xs">Receipt Generation</span>
          </div>
        </div>

        {/* Results output */}
        {activeReceipt ? (
          <div className="space-y-6 pt-4 border-t border-navy-800">
            {/* Top result alert */}
            <div
              className={`p-4 rounded-xl border flex items-center justify-between text-xs font-mono ${
                activeReceipt.status === 'APPROVED_EXECUTED'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : activeReceipt.status === 'RISK_BLOCKED'
                  ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {activeReceipt.status === 'APPROVED_EXECUTED' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : activeReceipt.status === 'RISK_BLOCKED' ? (
                  <XCircle className="w-5 h-5 text-rose-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                )}
                <div>
                  <span className="font-bold text-sm block">OUTCOME: {activeReceipt.status.replace(/_/g, ' ')}</span>
                  <span className="text-[11px]">
                    {activeReceipt.status === 'APPROVED_EXECUTED'
                      ? 'Paper order created & simulated filled cleanly.'
                      : activeReceipt.status === 'RISK_BLOCKED'
                      ? 'Order execution was blocked by the deterministic risk gate.'
                      : 'Agent autonomously stood down due to low-liquidity noise.'}
                  </span>
                </div>
              </div>

              <Link
                href={`/decision/${activeReceipt.receiptId}`}
                className="px-3.5 py-1.5 rounded bg-navy-900 border border-navy-800 text-electric-400 hover:text-white text-xs font-bold inline-flex items-center gap-1 transition-all"
              >
                <span>Full Audit Receipt</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Risk Check Matrix */}
            <RiskCheckMatrix evaluation={activeReceipt.riskGate} />
          </div>
        ) : isRunning ? (
          <div className="py-12 text-center text-slate-400 font-mono text-xs space-y-2">
            <Cpu className="w-8 h-8 text-electric-400 mx-auto animate-spin" />
            <p>Evaluating event evidence, checking order book depth, and running 8 risk gate checks...</p>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-500 font-mono text-xs">
            Click "Run Interactive Scenario" on any card above to launch execution.
          </div>
        )}
      </div>
    </div>
  );
}
