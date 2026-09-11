import { NextResponse } from 'next/server';
import { PersistentStore, getLedgerStoreInfo } from '@/lib/store/persistentStore';

const store = new PersistentStore();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const demoParam = searchParams.get('demo');

  const receipts = await store.getReceipts();
  let filtered = receipts;

  if (demoParam === 'true') {
    filtered = receipts.filter((r) => r.isDemoData);
  } else if (demoParam === 'false') {
    filtered = receipts.filter((r) => !r.isDemoData);
  } else if (demoParam !== 'all') {
    // Default to false (live competition receipts) if not specified or 'all'
    filtered = receipts.filter((r) => !r.isDemoData);
  }

  const isDemoMetrics = demoParam === 'true';
  const metrics = await store.getCompetitionMetrics(isDemoMetrics);
  const audits = await store.getRunAudits();
  const storageInfo = getLedgerStoreInfo();

  return NextResponse.json({
    success: true,
    receipts: filtered,
    allReceipts: receipts,
    metrics,
    audits,
    storageInfo,
  });
}
