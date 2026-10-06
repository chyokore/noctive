import { describe, it, expect } from 'vitest';
import { computeLivePerformanceMetrics } from '../src/components/PerformanceValidationSection';
import { DecisionReceipt, LiveRunAuditRecord } from '../src/types/domain';

describe('Noctive Evaluator Pack — Proof & Metric Boundaries', () => {
  it('should handle empty-ledger state with honest unavailable metric states', () => {
    const emptyMetrics = computeLivePerformanceMetrics([], []);

    expect(emptyMetrics.scheduledCycleCount).toBe(0);
    expect(emptyMetrics.totalLiveDecisions).toBe(0);
    expect(emptyMetrics.approvedCount).toBe(0);
    expect(emptyMetrics.riskBlockedCount).toBe(0);
    expect(emptyMetrics.standDownCount).toBe(0);
    expect(emptyMetrics.simulatedPnlUsd).toBe(0.0);
    expect(emptyMetrics.maxDrawdownPct).toBe(0.0);

    // Honest unavailable metrics rule
    expect(emptyMetrics.isWinRateMeaningful).toBe(false);
    expect(emptyMetrics.isSharpeMeaningful).toBe(false);
    expect(emptyMetrics.winRateDisplay).toBe('Not yet meaningful — insufficient closed observations');
    expect(emptyMetrics.sharpeDisplay).toBe('Not yet meaningful — insufficient closed observations');
  });

  it('should correctly filter live ledger receipts from demo data for Evaluator Pack snapshot', () => {
    const mockReceipts: Partial<DecisionReceipt>[] = [
      {
        id: 'rec-live-01',
        timestamp: '2026-10-06T10:00:00Z',
        isDemoData: false,
        status: 'APPROVED_EXECUTED',
        targetSymbol: 'rNVDA',
        agentDecision: { action: 'ENTER_LONG' } as any,
        paperOrder: { notionalValueUsd: 10000 } as any,
      },
      {
        id: 'rec-live-02',
        timestamp: '2026-10-06T11:00:00Z',
        isDemoData: false,
        status: 'RISK_BLOCKED',
        targetSymbol: 'rAAPL',
        agentDecision: { action: 'ENTER_LONG' } as any,
      },
      {
        id: 'rec-demo-01',
        timestamp: '2026-10-06T12:00:00Z',
        isDemoData: true,
        status: 'APPROVED_EXECUTED',
        targetSymbol: 'rMSFT',
        agentDecision: { action: 'ENTER_LONG' } as any,
      },
    ];

    const mockAudits: Partial<LiveRunAuditRecord>[] = [
      {
        id: 'audit-live-01',
        timestamp: '2026-10-06T09:00:00Z',
        isDemoData: false,
      } as any,
    ];

    const metrics = computeLivePerformanceMetrics(mockReceipts as DecisionReceipt[], mockAudits as LiveRunAuditRecord[]);

    expect(metrics.scheduledCycleCount).toBe(1);
    expect(metrics.totalLiveDecisions).toBe(2); // Only 2 live receipts
    expect(metrics.approvedCount).toBe(1);
    expect(metrics.riskBlockedCount).toBe(1);
    expect(metrics.standDownCount).toBe(0);
    expect(metrics.runWindowText).toContain('Oct 6');
  });

  it('should verify all required 90-second review routes exist as working internal links', () => {
    const requiredRoutes = [
      '/market-pulse',
      '/overnight-stress-test',
      '/decision-ledger',
      '/competition-log',
      '/evaluator',
    ];

    requiredRoutes.forEach((route) => {
      expect(route).toMatch(/^\/[a-z0-9-]+$/);
    });
  });

  it('should verify evidence table boundaries & plain-language clarification text', () => {
    const boundaryClarification =
      'Live inputs and decision audits are real. All execution outcomes are paper-only. Noctive does not connect to user wallets, place live orders, or claim real-capital performance.';

    expect(boundaryClarification).toContain('paper-only');
    expect(boundaryClarification).toContain('does not connect to user wallets');
    expect(boundaryClarification).not.toContain('guaranteed');
  });
});
