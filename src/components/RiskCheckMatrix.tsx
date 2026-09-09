import React from 'react';
import { RiskEvaluationResult, RiskCheckRule } from '@/types/domain';
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

interface RiskCheckMatrixProps {
  evaluation: RiskEvaluationResult;
  title?: string;
}

export const RiskCheckMatrix: React.FC<RiskCheckMatrixProps> = ({ evaluation, title = 'Deterministic 8-Gate Risk Check Matrix' }) => {
  return (
    <div className="rounded-xl bg-navy-900 border border-navy-800 p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-navy-800 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-electric-400" />
          <h3 className="font-sans font-bold text-sm text-white tracking-wide">{title}</h3>
        </div>
        <div
          className={`px-3 py-1 rounded font-mono text-xs font-bold uppercase flex items-center gap-1.5 ${
            evaluation.isApproved
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
          }`}
        >
          {evaluation.isApproved ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>PASSED ALL GATES</span>
            </>
          ) : (
            <>
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>BLOCKED BY RISK GATE</span>
            </>
          )}
        </div>
      </div>

      {/* Rules list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {evaluation.rules.map((rule: RiskCheckRule) => (
          <div
            key={rule.ruleId}
            className={`p-3 rounded-lg border text-xs space-y-1.5 transition-all ${
              rule.passed
                ? 'bg-navy-950/60 border-navy-800 hover:border-navy-700'
                : 'bg-rose-950/20 border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.1)]'
            }`}
          >
            <div className="flex items-center justify-between font-mono">
              <span className="font-semibold text-slate-200">{rule.name}</span>
              {rule.passed ? (
                <span className="flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> PASS
                </span>
              ) : (
                <span className="flex items-center gap-1 text-rose-400 font-bold text-[11px]">
                  <XCircle className="w-3.5 h-3.5 text-rose-400" /> FAIL
                </span>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Metric: <strong className="text-white">{rule.metricValue}</strong></span>
              <span>Limit: <strong className="text-slate-300">{rule.thresholdValue}</strong></span>
            </div>

            <p className={`text-[11px] leading-tight ${rule.passed ? 'text-slate-400' : 'text-rose-300 font-medium'}`}>
              {rule.detail}
            </p>
          </div>
        ))}
      </div>

      {/* Blocking Reasons Summary if failed */}
      {!evaluation.isApproved && evaluation.blockingReasons.length > 0 && (
        <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200 space-y-1 font-mono">
          <div className="flex items-center gap-1.5 font-bold text-rose-400">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Risk Blocking Summary:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-300">
            {evaluation.blockingReasons.map((reason, idx) => (
              <li key={idx}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
