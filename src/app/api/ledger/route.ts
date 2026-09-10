import { NextResponse } from 'next/server';
import { PersistentStore, getLedgerStoreInfo } from '@/lib/store/persistentStore';

const store = new PersistentStore();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const isDemo = searchParams.get('demo') === 'true';

  const receipts = await store.getReceipts();
  const filtered = receipts.filter((r) => r.isDemoData === isDemo);
  const metrics = await store.getCompetitionMetrics(isDemo);
  const audits = await store.getRunAudits();
  const storageInfo = getLedgerStoreInfo();

  return NextResponse.json({
    success: true,
    receipts: filtered,
    metrics,
    audits,
    storageInfo,
  });
}
