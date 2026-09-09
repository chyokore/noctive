import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as cronHandler } from '../src/app/api/cron/paper-cycle/route';
import { getLedgerStoreInfo, getLedgerStore, DatabaseLedgerStore, LocalFileLedgerStore } from '../src/lib/store/persistentStore';

describe('Deployment Readiness & Cron Security', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Protected Cron Endpoint Security (/api/cron/paper-cycle)', () => {
    it('should REJECT requests missing the Authorization header with HTTP 401', async () => {
      process.env.CRON_SECRET = 'super-secret-cron-key';

      const req = new NextRequest('http://localhost:3000/api/cron/paper-cycle', {
        method: 'GET',
      });

      const response = await cronHandler(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Unauthorized');
    });

    it('should REJECT requests with an invalid Bearer token with HTTP 401', async () => {
      process.env.CRON_SECRET = 'correct-cron-key';

      const req = new NextRequest('http://localhost:3000/api/cron/paper-cycle', {
        method: 'GET',
        headers: {
          authorization: 'Bearer wrong-secret-key',
        },
      });

      const response = await cronHandler(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should EXECUTE bounded paper cycle when valid Bearer CRON_SECRET is provided', async () => {
      process.env.CRON_SECRET = 'valid-cron-secret-abc123';
      delete process.env.VERCEL;

      const req = new NextRequest('http://localhost:3000/api/cron/paper-cycle', {
        method: 'GET',
        headers: {
          authorization: 'Bearer valid-cron-secret-abc123',
        },
      });

      const response = await cronHandler(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.paperTradingOnly).toBe(true);
      expect(data.safeMode).toBe(true);
      expect(Array.isArray(data.receiptIds)).toBe(true);
      expect(data.cyclesExecuted).toBeGreaterThan(0);
    });

    it('should REFUSE cron paper cycle execution on Vercel if DATABASE_URL is missing', async () => {
      process.env.CRON_SECRET = 'valid-secret';
      process.env.VERCEL = '1';
      delete process.env.DATABASE_URL;

      const req = new NextRequest('http://localhost:3000/api/cron/paper-cycle', {
        method: 'GET',
        headers: {
          authorization: 'Bearer valid-secret',
        },
      });

      const response = await cronHandler(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('DATABASE_URL environment variable is required');
    });
  });

  describe('Ledger Store Selection Logic', () => {
    it('should select LocalFileLedgerStore when DATABASE_URL is missing in local environment', () => {
      delete process.env.DATABASE_URL;
      delete process.env.VERCEL;

      const store = getLedgerStore();
      const info = getLedgerStoreInfo();

      expect(store).toBeInstanceOf(LocalFileLedgerStore);
      expect(info.storeType).toBe('LOCAL_FILE');
      expect(info.isPersistent).toBe(true);
      expect(info.hasDbUrl).toBe(false);
    });

    it('should select DatabaseLedgerStore when DATABASE_URL is configured', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/noctive_db';

      const store = getLedgerStore();
      const info = getLedgerStoreInfo();

      expect(store).toBeInstanceOf(DatabaseLedgerStore);
      expect(info.storeType).toBe('POSTGRES_DB');
      expect(info.isPersistent).toBe(true);
      expect(info.hasDbUrl).toBe(true);
    });

    it('should flag MEMORY_FALLBACK as non-persistent when running on Vercel without DATABASE_URL', () => {
      delete process.env.DATABASE_URL;
      process.env.VERCEL = '1';

      const info = getLedgerStoreInfo();

      expect(info.storeType).toBe('MEMORY_FALLBACK');
      expect(info.isPersistent).toBe(false);
      expect(info.isVercel).toBe(true);
      expect(info.description).toContain('DATABASE_URL required for Vercel persistence');
    });
  });
});
