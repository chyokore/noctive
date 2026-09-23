import React, { useState } from 'react';
import { DataProvenance } from '@/types/domain';
import { Database, ChevronDown, ChevronUp } from 'lucide-react';

interface DataProvenanceBadgeProps {
  provenance: DataProvenance;
}

export const DataProvenanceBadge: React.FC<DataProvenanceBadgeProps> = ({ provenance }) => {
  const [showDetails, setShowDetails] = useState(false);
  const ext = provenance.externalProvenance;

  return (
    <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-3 text-xs font-mono">
      <div className="flex items-center justify-between border-b border-navy-800 pb-2.5">
        <span className="text-[11px] text-slate-300 uppercase font-bold flex items-center gap-1.5 font-sans">
          <Database className="w-3.5 h-3.5 text-electric-400" />
          Data Provenance &amp; Verification Stream
        </span>

        <div className="flex flex-wrap items-center gap-1.5">
          {provenance.triggerProfile === 'EARLY_WARNING_RISK_REVIEW' || ext?.triggerProfile === 'EARLY_WARNING_RISK_REVIEW' ? (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30">
              EARLY WARNING (1.0%-1.49%)
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/10 text-purple-300 border border-purple-500/30">
              HIGH CONVICTION (&gt;=1.5%)
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
        <div>
          <span className="text-slate-400 block text-[10px] uppercase">Market Data Provider:</span>
          <span className="text-slate-200 font-medium">{provenance.marketSource}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] uppercase">Intelligence Engine:</span>
          <span className="text-electric-400 font-medium">{provenance.llmSource}</span>
        </div>
      </div>

      {ext && (
        <div className="pt-2 border-t border-navy-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-slate-300">
              <span className="text-slate-400">Underlying Asset: </span>
              <strong className="text-emerald-400 font-bold">
                {ext.underlyingStockSymbol || 'Equity Contract'} {ext.raw24hChangePct !== undefined ? `(${ext.raw24hChangePct >= 0 ? '+' : ''}${ext.raw24hChangePct.toFixed(2)}%)` : ''}
              </strong>
            </div>

            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-electric-400 hover:text-electric-300 underline text-[11px] font-semibold flex items-center gap-1 transition-colors"
            >
              <span>{showDetails ? 'Hide details' : 'View details'}</span>
              {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {showDetails && (
            <div className="p-3 rounded-lg bg-navy-900 border border-navy-800 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] text-slate-300 mt-2 space-y-1 sm:space-y-0">
              {ext.contractAddress && (
                <div>
                  <span className="text-slate-400 block uppercase">Chain &amp; Contract:</span>
                  <span className="text-purple-300 font-bold truncate block">{ext.chain}: {ext.contractAddress}</span>
                </div>
              )}
              {ext.traceId && (
                <div>
                  <span className="text-slate-400 block uppercase">Bitget Trace ID:</span>
                  <span className="text-cyan-400 font-mono font-bold">{ext.traceId}</span>
                </div>
              )}
              {ext.dataMode && (
                <div>
                  <span className="text-slate-400 block uppercase">Protocol Mode:</span>
                  <span className="text-slate-200 font-bold">{ext.dataMode}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
