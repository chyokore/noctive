import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QwenDecisionProvider } from '../src/lib/adapters/qwenDecisionProvider';
import { ILLMDecisionInput } from '../src/lib/adapters/llmDecisionProvider';

describe('QwenDecisionProvider Release Audit Tests', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.BITGET_QWEN_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  const mockInput: ILLMDecisionInput = {
    event: {
      id: 'evt-test-101',
      title: 'Tesla Robotaxi Regulatory Approval Granted in California',
      timestamp: new Date().toISOString(),
      source: 'SEC Filing',
      category: 'LEGAL',
      impactScore: 92,
      rawSnippet: 'California DMV has issued autonomous taxi operational permit to Tesla Inc.',
      affectedSymbol: 'rTSLA',
      isDemoData: true,
    },
    marketContext: {
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
    watchlist: [
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

  it('defaults to safe demo mode when BITGET_QWEN_API_KEY is unset', () => {
    const provider = new QwenDecisionProvider();
    expect(provider.getMode()).toBe('MOCK_DEMO');
  });

  it('detects QWEN_LIVE mode when BITGET_QWEN_API_KEY is present', () => {
    process.env.BITGET_QWEN_API_KEY = 'sk-dummy-key-for-test';
    const provider = new QwenDecisionProvider();
    expect(provider.getMode()).toBe('QWEN_LIVE');
  });

  it('throws error when evaluating without API key (triggering agent engine fallback)', async () => {
    const provider = new QwenDecisionProvider();
    await expect(provider.evaluate(mockInput)).rejects.toThrow('BITGET_QWEN_API_KEY environment variable is not configured.');
  });

  it('safely handles unapproved symbol returned by LLM with STAND_DOWN fallback', async () => {
    process.env.BITGET_QWEN_API_KEY = 'sk-dummy-key-for-test';
    const provider = new QwenDecisionProvider();

    // Mock fetch response with unapproved symbol (e.g. AAPL instead of rTSLA or rNVDA)
    const mockResponseBody = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              action: 'ENTER_LONG',
              symbol: 'UNAPPROVED_COIN',
              confidence: 90,
              rationale: ['Solid event'],
              evidenceReferences: ['SEC Filing'],
              invalidationCondition: 'Stop loss hit',
              proposedStopLossPct: 2.0,
              proposedTakeProfitPct: 5.0,
              standDownReason: null,
            }),
          },
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponseBody,
    } as Response);

    const result = await provider.evaluate(mockInput);
    expect(result.action).toBe('STAND_DOWN');
    expect(result.confidence).toBe(0);
    expect(result.standDownReason).toContain('unapproved symbol');
  });

  it('safely handles trade action missing evidence references with STAND_DOWN fallback', async () => {
    process.env.BITGET_QWEN_API_KEY = 'sk-dummy-key-for-test';
    const provider = new QwenDecisionProvider();

    const mockResponseBody = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              action: 'ENTER_LONG',
              symbol: 'rTSLA',
              confidence: 85,
              rationale: ['High impact news'],
              evidenceReferences: [], // Missing required evidence
              invalidationCondition: 'Stop loss',
              proposedStopLossPct: 1.5,
              proposedTakeProfitPct: 4.0,
              standDownReason: null,
            }),
          },
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponseBody,
    } as Response);

    const result = await provider.evaluate(mockInput);
    expect(result.action).toBe('STAND_DOWN');
    expect(result.confidence).toBe(0);
    expect(result.standDownReason).toContain('without providing required evidence references');
  });

  it('safely handles malformed JSON response with STAND_DOWN fallback', async () => {
    process.env.BITGET_QWEN_API_KEY = 'sk-dummy-key-for-test';
    const provider = new QwenDecisionProvider();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: 'INVALID JSON STRING {{{',
            },
          },
        ],
      }),
    } as Response);

    const result = await provider.evaluate(mockInput);
    expect(result.action).toBe('STAND_DOWN');
    expect(result.confidence).toBe(0);
    expect(result.standDownReason).toContain('Qwen LLM evaluation failed or produced malformed response');
  });

  it('never logs or leaks the API key in fallback or error output', async () => {
    const secretKey = 'sk-secret-super-sensitive-key-9999';
    process.env.BITGET_QWEN_API_KEY = secretKey;
    const provider = new QwenDecisionProvider();

    global.fetch = vi.fn().mockRejectedValue(new Error('Network connection timeout'));

    const result = await provider.evaluate(mockInput);
    expect(JSON.stringify(result)).not.toContain(secretKey);
  });
});
