'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SafeModeBadge } from './SafeModeBadge';
import { Activity, ShieldAlert, Cpu, Database, PlayCircle, BarChart3, Radio, Trophy, Sparkles } from 'lucide-react';

export const HeaderNav: React.FC = () => {
  const pathname = usePathname();
  const [readinessMode, setReadinessMode] = useState<string>('Mock LLM Demo');

  useEffect(() => {
    async function checkReadiness() {
      try {
        const res = await fetch('/api/readiness');
        const data = await res.json();
        if (data.hasQwenKey) {
          setReadinessMode('Live Qwen / Demo Market Data');
        } else {
          setReadinessMode('Mock LLM Demo');
        }
      } catch {
        setReadinessMode('Mock LLM Demo');
      }
    }
    checkReadiness();
  }, []);

  const navItems = [
    { label: 'Overview', path: '/', icon: Activity },
    { label: 'Command Center', path: '/command-center', icon: Cpu },
    { label: 'Replay Lab', path: '/replay-lab', icon: BarChart3 },
    { label: 'Decision Ledger', path: '/decision-ledger', icon: Database },
    { label: 'Competition Log', path: '/competition-log', icon: Trophy },
    { label: 'Demo Scenarios', path: '/demo-scenarios', icon: PlayCircle },
  ];

  return (
    <header className="sticky top-0 z-50 bg-navy-950/90 backdrop-blur-md border-b border-navy-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Track */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-lg bg-electric-600/20 border border-electric-500/40 flex items-center justify-center text-electric-400 group-hover:border-electric-400 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all">
                <Cpu className="w-5 h-5 text-electric-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-sans font-bold text-lg text-white tracking-tight">NOCTIVE</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-electric-500/10 text-electric-400 border border-electric-500/20">v1.0</span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono hidden sm:block">Collateral-Aware Overnight Risk Intelligence</p>
              </div>
            </Link>

            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded bg-navy-900 border border-navy-800 text-[11px] font-mono text-slate-300">
              <Sparkles className="w-3 h-3 text-electric-400" />
              <span>LLM: <strong className="text-electric-400">{readinessMode}</strong></span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link
              href="/uta-sentinel"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono font-bold transition-all ${
                pathname === '/uta-sentinel'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                  : 'text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>UTA Sentinel</span>
            </Link>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono font-medium transition-all ${
                    isActive
                      ? 'bg-electric-500/15 text-electric-400 border border-electric-500/30 shadow-[0_0_10px_rgba(59,130,246,0.1)]'
                      : 'text-slate-400 hover:text-white hover:bg-navy-850/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-electric-400' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Safe Mode & Status */}
          <div className="flex items-center gap-3">
            <SafeModeBadge />
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-navy-800/50 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex flex-col items-center gap-1 p-1 text-[10px] font-mono whitespace-nowrap px-2 ${
                  isActive ? 'text-electric-400' : 'text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
};
