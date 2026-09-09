import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Noctive Autonomous Trading Intelligence Agent',
    version: '1.0.0',
    safeMode: true,
  });
}
