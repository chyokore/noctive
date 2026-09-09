import React from 'react';
import { DataProvenance } from '@/types/domain';
import { Database, Cpu, Radio, AlertCircle } from 'lucide-react';

interface DataProvenanceBadgeProps {
  provenance: DataProvenance;
}

export const DataProvenanceBadge: React.FC<DataProvenanceBadgeProps> = ({ provenance }) => {
  return (
    <div className="p-3.5 rounded-xl bg-navy-950 border border-navy-800 space-y-2 text-xs font-mono">
      <div className="flex items-center justify-between border-b border-navy-800 pb-2">
        <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-electric-400" />
          Data Provenance & Source Transparency
        </span>

        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
            provenance.isDemoData
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
          }`}
        >
          {provenance.isDemoData ? 'DEMO DATA' : 'COMPETITION PAPER STREAM'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
        <div>
          <span className="text-slate-500 block text-[10px]">Market Data Provider:</span>
          <span className="text-slate-200 font-medium">{provenance.marketSource}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">LLM Intelligence Engine:</span>
          <span className="text-electric-400 font-medium">{provenance.llmSource}</span>
        </div>
      </div>
    </div>
  );
};
