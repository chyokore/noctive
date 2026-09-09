import React from 'react';
import { DecisionAuthoritySummary, LLMDecisionProposal } from '@/types/domain';
import { Cpu, ShieldCheck, AlertOctagon, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

interface DecisionAuthorityPanelProps {
  authority: DecisionAuthoritySummary;
  llmProposal?: LLMDecisionProposal;
}

export const DecisionAuthorityPanel: React.FC<DecisionAuthorityPanelProps> = ({
  authority,
  llmProposal,
}) => {
  return (
    <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 space-y-5">
      <div className="flex items-center justify-between border-b border-navy-800 pb-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-electric-400" />
          <h2 className="font-sans font-bold text-base text-white">Decision Authority & Override Panel</h2>
        </div>

        <span
          className={`px-3 py-1 rounded font-mono text-xs font-bold uppercase ${
            authority.isOverriddenByRisk
              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              : authority.riskGateOutcome === 'APPROVED'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
          }`}
        >
          {authority.isOverriddenByRisk
            ? 'RISK GATE OVERRODE AI PROPOSAL'
            : authority.riskGateOutcome === 'APPROVED'
            ? 'AI PROPOSAL APPROVED BY RISK GATE'
            : 'NO TRADE EXECUTED'}
        </span>
      </div>

      {/* Decision Flow Stepper Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 font-mono text-xs">
        {/* Step 1: AI Proposal */}
        <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-1.5">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">1. AI LLM Proposal</span>
          <strong className="text-white text-sm block uppercase">{authority.aiProposedAction.replace(/_/g, ' ')}</strong>
          <span className="text-electric-400 text-[11px] block">Confidence: {authority.aiConfidence}%</span>
        </div>

        {/* Step 2: Evidence Strength */}
        <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-1.5">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">2. Evidence Strength</span>
          <strong
            className={`text-sm block font-bold ${
              authority.evidenceStrength === 'HIGH'
                ? 'text-emerald-400'
                : authority.evidenceStrength === 'MEDIUM'
                ? 'text-amber-400'
                : 'text-slate-400'
            }`}
          >
            {authority.evidenceStrength} STRENGTH
          </strong>
          <span className="text-slate-400 text-[11px] block">News & Macro Catalyst</span>
        </div>

        {/* Step 3: Deterministic Risk Gate */}
        <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-1.5">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">3. Risk Gate Authority</span>
          <strong
            className={`text-sm block font-bold ${
              authority.riskGateOutcome === 'APPROVED' ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {authority.riskGateOutcome}
          </strong>
          <span className="text-slate-400 text-[11px] block">8 Hard Rules Enforced</span>
        </div>

        {/* Step 4: Final Executed Outcome */}
        <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-1.5">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">4. Final Paper Outcome</span>
          <strong className="text-white text-sm block uppercase">{authority.finalExecutedAction.replace(/_/g, ' ')}</strong>
          <span className="text-slate-400 text-[11px] block">
            {authority.finalExecutedAction === 'STAND_DOWN' ? 'No Order Generated' : 'Paper Order Created'}
          </span>
        </div>
      </div>

      {/* Override Alert Banner if Risk Gate blocked the AI */}
      {authority.isOverriddenByRisk && authority.overrideExplanation && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 space-y-2 font-mono text-xs">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
            <AlertOctagon className="w-4 h-4 text-rose-400" />
            <span>Deterministic Risk Gate Override Explanation:</span>
          </div>
          <p className="text-rose-200 leading-relaxed text-[11px] font-sans">
            The AI engine proposed an autonomous <code>{authority.aiProposedAction}</code> position, but the independent <strong>Deterministic Risk Gate</strong> had final authority and blocked paper trade creation:
          </p>
          <div className="p-2.5 rounded bg-navy-950 border border-rose-500/30 text-rose-300 text-[11px] font-mono">
            {authority.overrideExplanation}
          </div>
        </div>
      )}

      {/* Invalidation Condition */}
      {llmProposal?.invalidationCondition && (
        <div className="p-3.5 rounded-xl bg-navy-950 border border-navy-800 space-y-1 font-mono text-xs">
          <span className="text-[10px] text-slate-400 uppercase block font-bold">Trade Invalidation Condition:</span>
          <p className="text-slate-300 font-sans text-xs">{llmProposal.invalidationCondition}</p>
        </div>
      )}
    </div>
  );
};
