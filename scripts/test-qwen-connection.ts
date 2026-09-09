import fs from 'fs';
import path from 'path';
import { QwenDecisionProvider } from '../src/lib/adapters/qwenDecisionProvider';
import { ILLMDecisionInput } from '../src/lib/adapters/llmDecisionProvider';
import { LLMDecisionProposalSchema } from '../src/lib/schemas';

// Safely load .env.local into process.env if present (without printing secrets)
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.substring(0, idx).trim();
      const val = trimmed.substring(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (key && !process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

async function testQwenConnection() {
  console.log('--- Noctive Qwen Connection Verification Script ---');

  const apiKey = process.env.BITGET_QWEN_API_KEY;
  const baseUrl = process.env.BITGET_QWEN_BASE_URL || 'https://hackathon.bitgetops.com/v1';
  const model = process.env.BITGET_QWEN_MODEL || 'qwen3.8-max';

  if (!apiKey) {
    console.log('[INFO] BITGET_QWEN_API_KEY is not set in process environment.');
    console.log('[INFO] Safe Mock Mode remains ACTIVE by default.');
    console.log('[INFO] To test live Qwen AI decision generation:');
    console.log('       1. Copy .env.example to .env.local');
    console.log('       2. Set BITGET_QWEN_API_KEY=your_dashscope_key');
    console.log('       3. Re-run: npx tsx scripts/test-qwen-connection.ts');
    process.exit(0);
  }

  console.log(`[LIVE MODE DETECTED] Testing bounded Qwen API evaluation...`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Model: ${model}`);
  console.log(`[CONFIRMED] BITGET_QWEN_API_KEY environment variable is configured.`);

  const provider = new QwenDecisionProvider();

  const testInput: ILLMDecisionInput = {
    event: {
      id: 'evt-qwen-live-01',
      title: 'NVIDIA Announces Next-Gen Blackwell Architecture Delivery Ahead of Schedule',
      timestamp: new Date().toISOString(),
      source: 'Official Press Release',
      category: 'EARNINGS',
      impactScore: 88,
      rawSnippet: 'NVIDIA Corporation announced accelerated volume shipments of Blackwell architecture GPUs to cloud data centers.',
      affectedSymbol: 'rNVDA',
      isDemoData: true,
    },
    marketContext: {
      symbol: 'rNVDA',
      name: 'Tokenized NVIDIA Corp.',
      currentPrice: 128.4,
      prevClose: 125.0,
      change24hPct: 2.72,
      bidPrice: 128.3,
      askPrice: 128.5,
      spreadPct: 0.15,
      volume24hUsd: 1500000,
      liquidityDepthIndex: 92,
      sessionStatus: 'OVERNIGHT_ACTIVE',
      isDemoData: true,
    },
    watchlist: [
      {
        symbol: 'rNVDA',
        name: 'Tokenized NVIDIA Corp.',
        currentPrice: 128.4,
        prevClose: 125.0,
        change24hPct: 2.72,
        bidPrice: 128.3,
        askPrice: 128.5,
        spreadPct: 0.15,
        volume24hUsd: 1500000,
        liquidityDepthIndex: 92,
        sessionStatus: 'OVERNIGHT_ACTIVE',
        isDemoData: true,
      },
      {
        symbol: 'rTSLA',
        name: 'Tokenized Tesla Inc.',
        currentPrice: 245.5,
        prevClose: 240.0,
        change24hPct: 2.29,
        bidPrice: 245.3,
        askPrice: 245.7,
        spreadPct: 0.16,
        volume24hUsd: 1200000,
        liquidityDepthIndex: 88,
        sessionStatus: 'OVERNIGHT_ACTIVE',
        isDemoData: true,
      },
    ],
    riskBudget: {
      maxPositionSizeUsd: 10000,
      maxConcurrentPositions: 3,
      minConfidenceThresholdPct: 75,
      maxSpreadPct: 0.8,
      minLiquidityScore: 60,
      dailyLossLimitUsd: 2500,
      currentDailyLossUsd: 0,
      currentActivePositions: 0,
      cooldownMinutes: 5,
    },
  };

  try {
    const proposal = await provider.evaluate(testInput);
    console.log('\n[SUCCESS] Qwen Response Received & Validated by Zod Schema:');
    console.log('Action:', proposal.action);
    console.log('Symbol:', proposal.symbol);
    console.log('Confidence:', proposal.confidence, '%');
    console.log('Rationale:', proposal.rationale);
    console.log('Evidence References:', proposal.evidenceReferences);
    console.log('Stop Loss:', proposal.proposedStopLossPct, '%');
    console.log('Take Profit:', proposal.proposedTakeProfitPct, '%');
    console.log('Provider Mode:', proposal.providerMode);

    // Zod assertion check
    LLMDecisionProposalSchema.parse(proposal);
    console.log('\n✅ Zod validation passed completely.');
  } catch (err: any) {
    console.error('\n❌ Qwen Connection Test Failed:', err.message);
    process.exit(1);
  }
}

testQwenConnection();
