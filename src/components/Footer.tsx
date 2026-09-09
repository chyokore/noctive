import React from 'react';
import { ShieldCheck, Cpu, Terminal, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-navy-950 border-t border-navy-800/80 text-slate-400 py-10 mt-16 text-xs font-mono">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-white font-sans font-bold text-base">
              <Cpu className="w-4 h-4 text-electric-400" />
              <span>NOCTIVE</span>
            </div>
            <p className="text-slate-400 text-xs">
              Autonomous Paper-Trading Intelligence Agent for Tokenized US Equities (rTokens).
            </p>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-navy-900 border border-navy-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Safe Mode Active</span>
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-navy-900 border border-navy-800 text-electric-400">
              <Terminal className="w-3.5 h-3.5" />
              <span>Bitget AI Hackathon S2</span>
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-navy-900/60 border border-navy-800 text-slate-400 space-y-2 text-[11px] leading-relaxed">
          <p className="font-semibold text-slate-300">Disclaimer & Safe-Mode Statement:</p>
          <p>
            Noctive is designed exclusively for hackathon evaluation and educational paper-trading analysis. It does not execute live financial transactions, connect to real wallets, or manage actual monetary capital. All performance metrics, order executions, and profit/loss calculations are simulated representations.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-500 pt-4 border-t border-navy-800/40">
          <p>© {new Date().getFullYear()} Noctive Intelligence System. Built for Bitget AI Base Camp Hackathon S2.</p>
          <p className="mt-2 sm:mt-0 font-mono">Agentic Trading Track • Event-Driven Sub-theme</p>
        </div>
      </div>
    </footer>
  );
};
