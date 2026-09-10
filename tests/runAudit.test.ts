import { describe, it, expect } from 'vitest';
import { createRunAuditRecord } from '../src/lib/engine/runAuditGenerator';
import { LocalFileLedgerStore } from '../src/lib/store/persistentStore';

describe('Live Verification Run Audit & Fail-Closed Guarantee', () => {
  it('should create an immutable run audit record with valid hash format and domain-only endpoints', () => {
    const audit = createRunAuditRecord({
      status: 'SAFE_SKIP',
      eventProviderStatus: 'NO_EVENTS',
      marketProviderStatus: 'UNVERIFIED_EQUITY_MARKET',
      qwenInvoked: false,
      decisionCreated: false,
      safeSkipReason: 'No verified matching rToken market snapshot; competition decision skipped.',
    });

    expect(audit.auditId.startsWith('audit-live-')).toBe(true);
    expect(audit.hash.startsWith('0x9a4b')).toBe(true);
    expect(audit.status).toBe('SAFE_SKIP');
    expect(audit.qwenInvoked).toBe(false);
    expect(audit.decisionCreated).toBe(false);
    expect(audit.eventProviderDomain).toContain('sec.gov');
    expect(audit.marketProviderDomain).toContain('api.bitget.com');
    expect(audit.llmProviderDomain).toContain('hackathon.bitgetops.com');

    // Never contain API keys or secrets
    expect(audit.eventProviderDomain).not.toContain('API_KEY');
    expect(audit.marketProviderDomain).not.toContain('SECRET');
    expect(audit.llmProviderDomain).not.toContain('BITGET_QWEN_API_KEY');
  });

  it('should persist run audit records in LocalFileLedgerStore without creating competition paper receipts on safe skip', async () => {
    const store = new LocalFileLedgerStore();
    const initialReceipts = await store.getReceipts();
    const competitionReceiptsCountBefore = initialReceipts.filter((r) => !r.isDemoData).length;

    const audit = createRunAuditRecord({
      status: 'SAFE_SKIP',
      eventProviderStatus: 'HEALTHY',
      marketProviderStatus: 'UNVERIFIED_EQUITY_MARKET',
      qwenInvoked: false,
      decisionCreated: false,
      safeSkipReason: 'No verified matching rToken market snapshot; competition decision skipped.',
    });

    await store.saveRunAudit(audit);

    const audits = await store.getRunAudits();
    expect(audits.some((a) => a.auditId === audit.auditId)).toBe(true);

    // Assert NO competition paper decision receipt was created during safe skip
    const updatedReceipts = await store.getReceipts();
    const competitionReceiptsCountAfter = updatedReceipts.filter((r) => !r.isDemoData).length;
    expect(competitionReceiptsCountAfter).toBe(competitionReceiptsCountBefore);
  });
});
