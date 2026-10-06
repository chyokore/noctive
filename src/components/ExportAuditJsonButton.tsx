'use client';

import React from 'react';
import { Download } from 'lucide-react';
import { DecisionReceipt, LiveRunAuditRecord } from '@/types/domain';

interface ExportAuditJsonButtonProps {
  receipts: DecisionReceipt[];
  audits: LiveRunAuditRecord[];
  storageInfo: any;
}

export const ExportAuditJsonButton: React.FC<ExportAuditJsonButtonProps> = ({
  receipts,
  audits,
  storageInfo,
}) => {
  const handleExportJson = () => {
    const exportData = {
      exportTimestamp: new Date().toISOString(),
      environment: 'Bitget AI Base Camp S2 — Event-Driven Agent',
      mode: 'PAPER_ONLY_NO_LIVE_ORDERS',
      receipts: receipts.filter((r) => !r.isDemoData),
      audits: audits.filter((a) => !(a as any).isDemoData),
      storageInfo,
    };
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `noctive-evaluator-pack-audit-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <button
      onClick={handleExportJson}
      className="p-5 rounded-2xl bg-navy-900 border border-navy-800 hover:border-electric-500/50 hover:bg-navy-850/80 transition-all flex flex-col justify-between text-left space-y-3 group w-full"
    >
      <div>
        <span className="text-[10px] font-mono text-slate-400 uppercase block">
          Export Evidence
        </span>
        <span className="text-sm font-mono font-bold text-white mt-1 block group-hover:text-electric-300">
          Export Dated Audit JSON
        </span>
        <span className="text-xs text-slate-400 block mt-1">
          Download machine-readable JSON containing all receipts & run audits.
        </span>
      </div>
      <div className="inline-flex items-center gap-1.5 text-xs font-mono text-electric-400 font-bold">
        <Download className="w-4 h-4" />
        <span>Download Audit JSON</span>
      </div>
    </button>
  );
};
