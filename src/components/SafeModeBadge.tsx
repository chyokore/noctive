import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';

export const SafeModeBadge: React.FC = () => {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-medium shadow-[0_0_12px_rgba(16,185,129,0.15)]">
      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
      <span>SAFE MODE: Paper Trading Only</span>
      <span className="hidden md:inline text-emerald-600">|</span>
      <span className="hidden md:inline text-emerald-400/80">No Real Funds / Wallets</span>
    </div>
  );
};
