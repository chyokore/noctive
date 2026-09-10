import crypto from 'crypto';
import { LiveRunAuditRecord, LiveRunAuditStatus } from '@/types/domain';

export interface CreateRunAuditOptions {
  status: LiveRunAuditStatus;
  eventProviderStatus: 'HEALTHY' | 'NO_EVENTS' | 'UNAVAILABLE';
  marketProviderStatus: 'HEALTHY' | 'UNVERIFIED_EQUITY_MARKET' | 'UNAVAILABLE';
  qwenInvoked: boolean;
  decisionCreated: boolean;
  safeSkipReason?: string;
  mappedIssuerTicker?: string;
  mappedRToken?: string;
  confirmedMarketSymbol?: string;
  marketProviderDomain?: string;
}

export function createRunAuditRecord(opts: CreateRunAuditOptions): LiveRunAuditRecord {
  const timestamp = new Date().toISOString();
  const auditId = `audit-live-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  // Domain-only URLs, no secrets
  const eventProviderDomain = 'www.sec.gov (SEC EDGAR Form 8-K Atom)';
  const marketProviderDomain =
    opts.marketProviderDomain || 'api.bitget.com (Bitget Public Spot Tickers API)';
  const llmProviderDomain = 'hackathon.bitgetops.com (Qwen3.8-max)';

  const payloadToHash = JSON.stringify({
    auditId,
    timestamp,
    status: opts.status,
    eventProviderStatus: opts.eventProviderStatus,
    marketProviderStatus: opts.marketProviderStatus,
    qwenInvoked: opts.qwenInvoked,
    decisionCreated: opts.decisionCreated,
    safeSkipReason: opts.safeSkipReason || '',
    eventProviderDomain,
    marketProviderDomain,
    llmProviderDomain,
  });

  const sha256 = crypto.createHash('sha256').update(payloadToHash).digest('hex').substring(0, 16);
  const hash = `0x9a4b${sha256}`;

  return {
    auditId,
    timestamp,
    hash,
    status: opts.status,
    eventProviderStatus: opts.eventProviderStatus,
    marketProviderStatus: opts.marketProviderStatus,
    qwenInvoked: opts.qwenInvoked,
    decisionCreated: opts.decisionCreated,
    safeSkipReason: opts.safeSkipReason,
    eventProviderDomain,
    marketProviderDomain,
    llmProviderDomain,
    mappedIssuerTicker: opts.mappedIssuerTicker,
    mappedRToken: opts.mappedRToken,
    confirmedMarketSymbol: opts.confirmedMarketSymbol,
  };
}
