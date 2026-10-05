import { describe, it, expect } from 'vitest';
import { computeLivePerformanceMetrics } from '../src/components/PerformanceValidationSection';
import { DecisionReceipt, LiveRunAuditRecord } from '../src/types/domain';

describe('Performance & Validation Metrics Engine', () => {
  it('should return honest fallback strings when no live data exists', () => {
    const metrics = computeLivePerformanceMetrics([], []);

    expect(metrics.runWindowText).toBe('No active run window recorded yet');
    expect(metrics.scheduledCycleCount).toBe(0);
    expect(metrics.totalLiveDecisions).toBe(0);
    expect(metrics.approvedCount).toBe(0);
    expect(metrics.riskBlockedCount).toBe(0);
    expect(metrics.standDownCount).toBe(0);
    expect(metrics.winRateDisplay).toBe('Not yet meaningful — insufficient closed observations');
    expect(metrics.sharpeDisplay).toBe('Not yet meaningful — insufficient closed observations');
    expect(metrics.isWinRateMeaningful).toBe(false);
    expect(metrics.isSharpeMeaningful).toBe(false);
  });

  it('should exclude pre-seeded demo data and compute metrics strictly from live receipts & audits', () => {
    const mockDemoReceipt: Partial<DecisionReceipt> = {
      receiptId: 'rcpt-demo-1',
      timestamp: '2026-10-01T10:00:00.000Z',
      isDemoData: true,
      status: 'APPROVED_EXECUTED',
    };

    const mockLiveAudit1: Partial<LiveRunAuditRecord> = {
      auditId: 'audit-live-1',
      timestamp: '2026-10-04T17:00:00.000Z',
      status: 'QUALIFIED',
      qwenInvoked: true,
      decisionCreated: true,
    };

    const mockLiveAudit2: Partial<LiveRunAuditRecord> = {
      auditId: 'audit-live-2',
      timestamp: '2026-10-05T12:00:00.000Z',
      status: 'SAFE_SKIP',
      qwenInvoked: false,
      decisionCreated: false,
    };

    const mockLiveReceiptBlocked: Partial<DecisionReceipt> = {
      receiptId: 'rcpt-live-blocked-1',
      timestamp: '2026-10-04T17:05:00.000Z',
      isDemoData: false,
      status: 'RISK_BLOCKED',
      event: { affectedSymbol: 'rNVDA' } as any,
      marketContext: { symbol: 'rNVDA' } as any,
    };

    const mockLiveReceiptStandDown: Partial<DecisionReceipt> = {
      receiptId: 'rcpt-live-standdown-1',
      timestamp: '2026-10-05T11:00:00.000Z',
      isDemoData: false,
      status: 'NOISE_REJECTED_STAND_DOWN',
      event: { affectedSymbol: 'rAAPL' } as any,
      marketContext: { symbol: 'rAAPL' } as any,
    };

    const metrics = computeLivePerformanceMetrics(
      [mockDemoReceipt as any, mockLiveReceiptBlocked as any, mockLiveReceiptStandDown as any],
      [mockLiveAudit1 as any, mockLiveAudit2 as any]
    );

    expect(metrics.scheduledCycleCount).toBe(2);
    expect(metrics.totalLiveDecisions).toBe(2);
    expect(metrics.approvedCount).toBe(0);
    expect(metrics.riskBlockedCount).toBe(1);
    expect(metrics.standDownCount).toBe(1);
    expect(metrics.runWindowText).toContain('Oct 4');
    expect(metrics.runWindowText).toContain('Oct 5');

    // Win rate and Sharpe must NOT be fabricated when closed observations < 3
    expect(metrics.winRateDisplay).toBe('Not yet meaningful — insufficient closed observations');
    expect(metrics.sharpeDisplay).toBe('Not yet meaningful — insufficient closed observations');
  });

  it('should compute actual win rate and Sharpe ratio ONLY when 3 or more closed trade observations exist', () => {
    const makeClosedReceipt = (id: string, pnl: number): Partial<DecisionReceipt> => ({
      receiptId: id,
      timestamp: new Date().toISOString(),
      isDemoData: false,
      status: 'APPROVED_EXECUTED',
      agentDecision: { action: 'ENTER_LONG' } as any,
      paperOrder: {
        orderId: `ord-${id}`,
        notionalValueUsd: 10000,
        status: 'SIMULATED_FILLED',
        isClosed: true,
        pnlUsd: pnl,
      } as any,
    });

    const closedReceipts = [
      makeClosedReceipt('r-1', 320),
      makeClosedReceipt('r-2', 280),
      makeClosedReceipt('r-3', -150),
    ];

    const metrics = computeLivePerformanceMetrics(closedReceipts as any[], []);

    expect(metrics.isWinRateMeaningful).toBe(true);
    expect(metrics.isSharpeMeaningful).toBe(true);
    expect(metrics.winRateDisplay).toBe('66.7%');
    expect(metrics.sharpeDisplay).toBe('1.85');
  });
});
