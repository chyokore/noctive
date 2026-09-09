import { NextResponse } from 'next/server';
import { getLedgerStoreInfo } from '@/lib/store/persistentStore';

export async function GET() {
  const hasQwenKey = !!process.env.BITGET_QWEN_API_KEY;
  const configuredModel = process.env.BITGET_QWEN_MODEL || 'qwen3.8-max';
  const baseUrl = process.env.BITGET_QWEN_BASE_URL || 'https://hackathon.bitgetops.com/v1';

  const storeInfo = getLedgerStoreInfo();
  const cronSecretConfigured = !!(process.env.CRON_SECRET && process.env.CRON_SECRET.trim() !== '');

  return NextResponse.json({
    status: 'ready',
    mode: hasQwenKey ? 'Qwen AI Connected' : 'Mock LLM Demo Mode',
    hasQwenKey,
    configuredModel,
    baseUrl: hasQwenKey ? baseUrl : 'Mock Endpoint',
    safeMode: true,
    paperTradingOnly: true,
    riskEngine: '8-Gate Deterministic Active',
    storageMode: storeInfo.storeType,
    storageDescription: storeInfo.description,
    isPersistent: storeInfo.isPersistent,
    hasDbUrl: storeInfo.hasDbUrl,
    isVercel: storeInfo.isVercel,
    cronSecretConfigured,
    timestamp: new Date().toISOString(),
  });
}

