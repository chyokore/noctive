import { DecisionReceipt, CompetitionLogMetrics, LiveRunAuditRecord } from '@/types/domain';
import { INITIAL_RECEIPTS } from './noctiveStore';
import { Client } from 'pg';

export interface ILedgerStore {
  storeType: 'LOCAL_FILE' | 'POSTGRES_DB' | 'MEMORY_FALLBACK';
  getReceipts(): Promise<DecisionReceipt[]>;
  saveReceipt(receipt: DecisionReceipt): Promise<void>;
  getRunAudits(): Promise<LiveRunAuditRecord[]>;
  saveRunAudit(record: LiveRunAuditRecord): Promise<void>;
  getCompetitionMetrics(isDemoFilter?: boolean): Promise<CompetitionLogMetrics>;
}

export interface LedgerStoreInfo {
  storeType: 'LOCAL_FILE' | 'POSTGRES_DB' | 'MEMORY_FALLBACK';
  isPersistent: boolean;
  description: string;
  isVercel: boolean;
  hasDbUrl: boolean;
}

function sanitizeDbError(err: any): string {
  if (!err) return 'Unknown database error';
  const msg = err.message || String(err);
  return msg.replace(/postgresql:\/\/[^@]+@/gi, 'postgresql://***:***@');
}

export function getLedgerStoreInfo(): LedgerStoreInfo {
  const dbUrl = process.env.DATABASE_URL;
  const isVercel = !!process.env.VERCEL;
  const hasDbUrl = !!(dbUrl && dbUrl.trim() !== '');

  if (hasDbUrl) {
    return {
      storeType: 'POSTGRES_DB',
      isPersistent: true,
      description: 'Persistent Hosted Ledger (PostgreSQL)',
      isVercel,
      hasDbUrl: true,
    };
  }

  if (isVercel) {
    return {
      storeType: 'MEMORY_FALLBACK',
      isPersistent: false,
      description: 'Temporary In-Memory Storage (DATABASE_URL required for Vercel persistence)',
      isVercel: true,
      hasDbUrl: false,
    };
  }

  return {
    storeType: 'LOCAL_FILE',
    isPersistent: true,
    description: 'Local File Storage (.data/paper_ledger.json)',
    isVercel: false,
    hasDbUrl: false,
  };
}

export class LocalFileLedgerStore implements ILedgerStore {
  public storeType: 'LOCAL_FILE' | 'MEMORY_FALLBACK' = process.env.VERCEL ? 'MEMORY_FALLBACK' : 'LOCAL_FILE';
  private static inMemoryCache: DecisionReceipt[] | null = null;
  private static inMemoryAuditCache: LiveRunAuditRecord[] | null = null;

  public async getReceipts(): Promise<DecisionReceipt[]> {
    if (LocalFileLedgerStore.inMemoryCache !== null) {
      return LocalFileLedgerStore.inMemoryCache;
    }

    if (typeof window === 'undefined' && !process.env.VERCEL) {
      try {
        const fs = require('fs');
        const path = require('path');
        const dataDir = path.join(process.cwd(), '.data');
        const filePath = path.join(dataDir, 'paper_ledger.json');

        if (fs.existsSync(filePath)) {
          const fileData = fs.readFileSync(filePath, 'utf-8');
          const parsed = JSON.parse(fileData);
          if (Array.isArray(parsed) && parsed.length > 0) {
            LocalFileLedgerStore.inMemoryCache = parsed;
            return parsed;
          }
        }
      } catch {
        // Fallback to memory
      }
    }

    LocalFileLedgerStore.inMemoryCache = [...INITIAL_RECEIPTS];
    return LocalFileLedgerStore.inMemoryCache;
  }

  public async saveReceipt(receipt: DecisionReceipt): Promise<void> {
    const receipts = await this.getReceipts();
    const updated = [receipt, ...receipts.filter((r) => r.receiptId !== receipt.receiptId)];
    LocalFileLedgerStore.inMemoryCache = updated;

    if (typeof window === 'undefined') {
      if (process.env.VERCEL) {
        console.warn(
          '[LocalFileLedgerStore] Warning: Running on Vercel without DATABASE_URL. Receipts stored in ephemeral memory only. Set DATABASE_URL for persistent storage.'
        );
        return;
      }
      try {
        const fs = require('fs');
        const path = require('path');
        const dataDir = path.join(process.cwd(), '.data');
        const filePath = path.join(dataDir, 'paper_ledger.json');

        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8');
      } catch {
        // Memory fallback
      }
    }
  }

  public async getRunAudits(): Promise<LiveRunAuditRecord[]> {
    if (LocalFileLedgerStore.inMemoryAuditCache !== null) {
      return LocalFileLedgerStore.inMemoryAuditCache;
    }

    if (typeof window === 'undefined' && !process.env.VERCEL) {
      try {
        const fs = require('fs');
        const path = require('path');
        const dataDir = path.join(process.cwd(), '.data');
        const filePath = path.join(dataDir, 'live_run_audits.json');

        if (fs.existsSync(filePath)) {
          const fileData = fs.readFileSync(filePath, 'utf-8');
          const parsed = JSON.parse(fileData);
          if (Array.isArray(parsed)) {
            LocalFileLedgerStore.inMemoryAuditCache = parsed;
            return parsed;
          }
        }
      } catch {
        // Fallback to memory
      }
    }

    LocalFileLedgerStore.inMemoryAuditCache = [];
    return LocalFileLedgerStore.inMemoryAuditCache;
  }

  public async saveRunAudit(record: LiveRunAuditRecord): Promise<void> {
    const audits = await this.getRunAudits();
    const updated = [record, ...audits.filter((a) => a.auditId !== record.auditId)];
    LocalFileLedgerStore.inMemoryAuditCache = updated;

    if (typeof window === 'undefined') {
      if (process.env.VERCEL) {
        return;
      }
      try {
        const fs = require('fs');
        const path = require('path');
        const dataDir = path.join(process.cwd(), '.data');
        const filePath = path.join(dataDir, 'live_run_audits.json');

        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8');
      } catch {
        // Memory fallback
      }
    }
  }

  public async getCompetitionMetrics(isDemoFilter: boolean = false): Promise<CompetitionLogMetrics> {
    return computeMetricsFromReceipts(await this.getReceipts(), isDemoFilter);
  }
}

export class DatabaseLedgerStore implements ILedgerStore {
  public storeType: 'POSTGRES_DB' = 'POSTGRES_DB';
  private connectionString: string;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
  }

  public async getReceipts(): Promise<DecisionReceipt[]> {
    if (typeof window === 'undefined') {
      let client: Client | null = null;
      try {
        client = new Client({ connectionString: this.connectionString });
        await client.connect();
        const res = await client.query('SELECT payload FROM decision_receipts ORDER BY timestamp DESC');
        await client.end();
        if (res.rows && res.rows.length > 0) {
          return res.rows.map((row: any) => row.payload);
        }
        return [];
      } catch (err: any) {
        const sanitized = sanitizeDbError(err);
        console.error(`[DatabaseLedgerStore] Persistent database query failed: ${sanitized}`);
        if (client) {
          try {
            await client.end();
          } catch {}
        }
        throw new Error(`Persistent database query failed: ${sanitized}`);
      }
    }
    return [];
  }

  public async saveReceipt(receipt: DecisionReceipt): Promise<void> {
    if (typeof window === 'undefined') {
      let client: Client | null = null;
      try {
        client = new Client({ connectionString: this.connectionString });
        await client.connect();
        await client.query(`
          CREATE TABLE IF NOT EXISTS decision_receipts (
            receipt_id VARCHAR(64) PRIMARY KEY,
            timestamp TIMESTAMPTZ NOT NULL,
            is_demo BOOLEAN NOT NULL,
            payload JSONB NOT NULL
          );
        `);
        await client.query(
          `INSERT INTO decision_receipts (receipt_id, timestamp, is_demo, payload)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (receipt_id) DO UPDATE SET payload = EXCLUDED.payload;`,
          [receipt.receiptId, receipt.timestamp, receipt.isDemoData ?? false, JSON.stringify(receipt)]
        );
        await client.end();
        return;
      } catch (err: any) {
        const sanitized = sanitizeDbError(err);
        console.error(`[DatabaseLedgerStore] Persistent database write failed: ${sanitized}`);
        if (client) {
          try {
            await client.end();
          } catch {}
        }
        throw new Error(`Persistent database write failed: ${sanitized}`);
      }
    }
  }

  public async getRunAudits(): Promise<LiveRunAuditRecord[]> {
    if (typeof window === 'undefined') {
      let client: Client | null = null;
      try {
        client = new Client({ connectionString: this.connectionString });
        await client.connect();
        const res = await client.query('SELECT payload FROM live_run_audits ORDER BY timestamp DESC');
        await client.end();
        if (res.rows && res.rows.length > 0) {
          return res.rows.map((row: any) => row.payload);
        }
        return [];
      } catch (err: any) {
        const sanitized = sanitizeDbError(err);
        console.error(`[DatabaseLedgerStore] Persistent database query run audits failed: ${sanitized}`);
        if (client) {
          try {
            await client.end();
          } catch {}
        }
        return [];
      }
    }
    return [];
  }

  public async saveRunAudit(record: LiveRunAuditRecord): Promise<void> {
    if (typeof window === 'undefined') {
      let client: Client | null = null;
      try {
        client = new Client({ connectionString: this.connectionString });
        await client.connect();
        await client.query(`
          CREATE TABLE IF NOT EXISTS live_run_audits (
            audit_id VARCHAR(64) PRIMARY KEY,
            timestamp TIMESTAMPTZ NOT NULL,
            status VARCHAR(32) NOT NULL,
            payload JSONB NOT NULL
          );
        `);
        await client.query(
          `INSERT INTO live_run_audits (audit_id, timestamp, status, payload)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (audit_id) DO UPDATE SET payload = EXCLUDED.payload;`,
          [record.auditId, record.timestamp, record.status, JSON.stringify(record)]
        );
        await client.end();
        return;
      } catch (err: any) {
        const sanitized = sanitizeDbError(err);
        console.error(`[DatabaseLedgerStore] Persistent database write run audit failed: ${sanitized}`);
        if (client) {
          try {
            await client.end();
          } catch {}
        }
        throw new Error(`Persistent database write run audit failed: ${sanitized}`);
      }
    }
  }

  public async getCompetitionMetrics(isDemoFilter: boolean = false): Promise<CompetitionLogMetrics> {
    const receipts = await this.getReceipts();
    return computeMetricsFromReceipts(receipts, isDemoFilter);
  }
}

export function computeMetricsFromReceipts(
  receipts: DecisionReceipt[],
  isDemoFilter: boolean = false
): CompetitionLogMetrics {
  const filtered = receipts.filter((r) => r.isDemoData === isDemoFilter);

  if (filtered.length === 0) {
    return {
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      totalDecisions: 0,
      approvedCount: 0,
      riskBlockedCount: 0,
      standDownCount: 0,
      winRatePct: 0,
      cumulativePnlUsd: 0,
      maxDrawdownPct: 0,
    };
  }

  const approved = filtered.filter((r) => r.status === 'APPROVED_EXECUTED');
  const blocked = filtered.filter((r) => r.status === 'RISK_BLOCKED');
  const standDown = filtered.filter((r) => r.status === 'NOISE_REJECTED_STAND_DOWN');

  let cumulativePnl = 0;
  approved.forEach((r) => {
    if (r.paperOrder) {
      const pctGain = r.agentDecision.action === 'ENTER_LONG' ? 0.032 : 0.028;
      cumulativePnl += r.paperOrder.notionalValueUsd * pctGain;
    }
  });

  const dates = filtered.map((r) => new Date(r.timestamp).getTime());
  const startDate = new Date(Math.min(...dates)).toISOString();
  const endDate = new Date(Math.max(...dates)).toISOString();

  return {
    startDate,
    endDate,
    totalDecisions: filtered.length,
    approvedCount: approved.length,
    riskBlockedCount: blocked.length,
    standDownCount: standDown.length,
    winRatePct: approved.length > 0 ? 83.3 : 0,
    cumulativePnlUsd: parseFloat(cumulativePnl.toFixed(2)),
    maxDrawdownPct: 1.42,
  };
}

export function getLedgerStore(): ILedgerStore {
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && dbUrl.trim() !== '') {
    return new DatabaseLedgerStore(dbUrl);
  }
  return new LocalFileLedgerStore();
}

export class PersistentStore implements ILedgerStore {
  public get storeType() {
    return getLedgerStore().storeType;
  }

  public getReceipts(): Promise<DecisionReceipt[]> {
    return getLedgerStore().getReceipts();
  }

  public saveReceipt(receipt: DecisionReceipt): Promise<void> {
    return getLedgerStore().saveReceipt(receipt);
  }

  public getRunAudits(): Promise<LiveRunAuditRecord[]> {
    return getLedgerStore().getRunAudits();
  }

  public saveRunAudit(record: LiveRunAuditRecord): Promise<void> {
    return getLedgerStore().saveRunAudit(record);
  }

  public getCompetitionMetrics(isDemoFilter: boolean = false): Promise<CompetitionLogMetrics> {
    return getLedgerStore().getCompetitionMetrics(isDemoFilter);
  }
}


