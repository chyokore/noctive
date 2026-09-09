import { NextResponse } from 'next/server';
import { EventItemSchema, MarketContextSchema } from '@/lib/schemas';
import { AgentEngine } from '@/lib/engine/agentEngine';
import { RiskEngine } from '@/lib/engine/riskEngine';
import { PaperExchange } from '@/lib/engine/paperExchange';
import { ReceiptGenerator } from '@/lib/engine/receiptGenerator';
import { INITIAL_RISK_BUDGET } from '@/lib/store/noctiveStore';
import { MOCK_WATCHLIST } from '@/lib/adapters/marketDataProvider';
import { PersistentStore } from '@/lib/store/persistentStore';

const agentEngine = new AgentEngine();
const riskEngine = new RiskEngine();
const paperExchange = new PaperExchange();
const receiptGenerator = new ReceiptGenerator();
const store = new PersistentStore();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const event = EventItemSchema.parse(body.event);
    const market = MarketContextSchema.parse(body.marketContext);
    const config = body.riskConfig ? body.riskConfig : INITIAL_RISK_BUDGET;

    const watchlist = Object.values(MOCK_WATCHLIST);

    // Run async LLM decision provider (Qwen or Mock)
    const decision = await agentEngine.evaluateEventAsync(event, market, watchlist, config);
    const risk = riskEngine.evaluateRisk(decision, market, config);
    const order = paperExchange.executePaperOrder(decision, market, risk.isApproved);
    const receipt = receiptGenerator.generateReceipt(event, market, decision, risk, order);

    // Save receipt to persistent store
    await store.saveReceipt(receipt);

    return NextResponse.json({
      success: true,
      decision,
      risk,
      order: decision.action !== 'STAND_DOWN' ? order : null,
      receipt,
      providerMode: agentEngine.getProviderMode(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Validation or processing error' },
      { status: 400 }
    );
  }
}
