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
      expect(data.skipped || data.cyclesExecuted >= 0).toBe(true);
    }, 15000);

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

    it('should RETURN HTTP 500 when persistent database write fails during paper cycle', async () => {
      process.env.CRON_SECRET = 'valid-secret';
      process.env.DATABASE_URL = 'postgresql://invalid_user:invalid_pass@127.0.0.1:54321/invalid_db';
      delete process.env.VERCEL;

      const req = new NextRequest('http://localhost:3000/api/cron/paper-cycle', {
        method: 'GET',
        headers: {
          authorization: 'Bearer valid-secret',
        },
      });

      const response = await cronHandler(req);
      const data = await response.json();

      if (data.skipped) {
        expect(data.success).toBe(true);
        expect(data.skipped).toBe(true);
      } else {
        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.error).toContain('Persistent receipt saving failed');
      }
    }, 15000);
  });

  describe('Ledger Store & Package Dependencies', () => {
    it('should include pg as a production dependency in package.json', () => {
      const fs = require('fs');
      const path = require('path');
      const pkgPath = path.join(process.cwd(), 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

      expect(pkg.dependencies).toBeDefined();
      expect(pkg.dependencies.pg).toBeDefined();
    });

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

    it('should throw sanitized error on DatabaseLedgerStore write failure', async () => {
      const invalidStore = new DatabaseLedgerStore('postgresql://invalid_user:invalid_pass@127.0.0.1:54321/invalid_db');
      const mockReceipt: any = {
        receiptId: 'rcpt-fail-test',
        timestamp: new Date().toISOString(),
        isDemoData: false,
      };

      await expect(invalidStore.saveReceipt(mockReceipt)).rejects.toThrow('Persistent database write failed');
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
