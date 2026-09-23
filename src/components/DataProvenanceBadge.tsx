import React from 'react';
import { DataProvenance } from '@/types/domain';
import { Database, Cpu, Radio, AlertCircle } from 'lucide-react';

interface DataProvenanceBadgeProps {
  provenance: DataProvenance;
}

export const DataProvenanceBadge: React.FC<DataProvenanceBadgeProps> = ({ provenance }) => {
  const ext = provenance.externalProvenance;
  const isRwaReality = provenance.dataMode === 'BITGET_WALLET_RWA_REALITY_READ_ONLY';
  const isMcp = provenance.dataMode === 'BITGET_MCP_US_STOCKS_READ_ONLY';
  const isStooqRef = provenance.dataMode === 'LIVE_EXTERNAL_UNDERLYING_REFERENCE';

  return (
    <div className="p-3.5 rounded-xl bg-navy-950 border border-navy-800 space-y-2 text-xs font-mono">
      <div className="flex items-center justify-between border-b border-navy-800 pb-2">
        <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-electric-400" />
          Data Provenance &amp; Source Transparency
        </span>

        <div className="flex flex-wrap items-center gap-1.5">
          {provenance.triggerProfile === 'EARLY_WARNING_RISK_REVIEW' || ext?.triggerProfile === 'EARLY_WARNING_RISK_REVIEW' ? (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30">
              EARLY WARNING RISK REVIEW (1.0%-1.49%)
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/10 text-purple-300 border border-purple-500/30">
              HIGH CONVICTION PULSE (&gt;=1.5%)
            </span>
          )}
          {(ext?.publisherName?.includes('PULSE') || ext?.sourceUrl?.includes('pulse') || ext?.symbolMapping?.includes('PULSE')) && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              LIVE REALITY MARKET PULSE
            </span>
          )}
        </div>
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

      {ext && (
        <div className="mt-2 pt-2 border-t border-navy-800/60 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
          {ext.underlyingStockSymbol && (
            <div>
              <span className="text-slate-500 block">Underlying Ticker / Change:</span>
              <span className="text-emerald-400 font-bold">
                {ext.underlyingStockSymbol} {ext.raw24hChangePct !== undefined ? `(${ext.raw24hChangePct >= 0 ? '+' : ''}${ext.raw24hChangePct.toFixed(2)}%)` : ''}
              </span>
            </div>
          )}
          {ext.contractAddress && (
            <div>
              <span className="text-slate-500 block">Chain / Contract:</span>
              <span className="text-purple-300 font-bold truncate block">{ext.chain}: {ext.contractAddress}</span>
            </div>
          )}
          {ext.traceId && (
            <div>
              <span className="text-slate-500 block">Bitget Trace ID:</span>
              <span className="text-cyan-400 font-mono font-bold">{ext.traceId}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
