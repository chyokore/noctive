import { ILLMDecisionProvider, ILLMDecisionInput } from './llmDecisionProvider';
import { LLMDecisionProposal, AgentAction } from '@/types/domain';
import { LLMDecisionProposalSchema } from '../schemas';

export class QwenDecisionProvider implements ILLMDecisionProvider {
  public name = 'Bitget Qwen AI Decision Provider';

  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor() {
    // Read ONLY from server-side environment variables
    // Official Bitget Hackathon S2 configuration: https://hackathon.bitgetops.com/v1 / qwen3.8-max
    // Preserved fallback configuration: https://dashscope.aliyuncs.com/compatible-mode/v1 / qwen-max
    this.apiKey = process.env.BITGET_QWEN_API_KEY || '';
    this.baseUrl = process.env.BITGET_QWEN_BASE_URL || 'https://hackathon.bitgetops.com/v1';
    this.model = process.env.BITGET_QWEN_MODEL || 'qwen3.8-max';
  }

  public getMode(): 'QWEN_LIVE' | 'MOCK_DEMO' {
    return this.apiKey ? 'QWEN_LIVE' : 'MOCK_DEMO';
  }

  public async evaluate(input: ILLMDecisionInput): Promise<LLMDecisionProposal> {
    const { event, marketContext, watchlist, riskBudget } = input;

    // If no server-side API key is present, throw error so caller can fallback to Mock Provider
    if (!this.apiKey) {
      throw new Error('BITGET_QWEN_API_KEY environment variable is not configured.');
    }

    const approvedSymbols = watchlist.map((w) => w.symbol);

    const systemPrompt = `You are Noctive, an autonomous AI trading intelligence agent specializing in 24/7 tokenized US equities (rTokens) during traditional market closures.
Your job is to analyze overnight news events, evaluate order book liquidity and spread, and propose one autonomous trading action.

CRITICAL CONSTRAINTS:
1. You must output STRICT JSON ONLY matching the JSON schema below. No markdown formatting outside JSON.
2. Approved watchlist symbols: ${JSON.stringify(approvedSymbols)}. You CANNOT propose trades on any symbol outside this list.
3. If an event is noisy, unverified, or has high spread (>0.8%), or low liquidity (<60), you MUST propose action: "STAND_DOWN".
4. Every trade proposal MUST include evidenceReferences from the event snippet and a clear invalidationCondition.

JSON Output Schema:
{
  "action": "ENTER_LONG" | "ENTER_SHORT" | "REDUCE_EXPOSURE" | "STAND_DOWN",
  "symbol": string,
  "confidence": number (0 to 100),
  "rationale": [string],
  "evidenceReferences": [string],
  "invalidationCondition": string,
  "proposedStopLossPct": number (0.5 to 10.0),
  "proposedTakeProfitPct": number (1.0 to 20.0),
  "standDownReason": string | null
}`;

    const userPrompt = JSON.stringify({
      eventEvidence: {
        id: event.id,
        title: event.title,
        source: event.source,
        category: event.category,
        affectedSymbol: event.affectedSymbol,
        impactScore: event.impactScore,
        rawSnippet: event.rawSnippet,
      },
      marketContext: {
        symbol: marketContext.symbol,
        currentPrice: marketContext.currentPrice,
        bidPrice: marketContext.bidPrice,
        askPrice: marketContext.askPrice,
        spreadPct: marketContext.spreadPct,
        liquidityDepthIndex: marketContext.liquidityDepthIndex,
        sessionStatus: marketContext.sessionStatus,
      },
      portfolioRiskState: {
        maxPositionSizeUsd: riskBudget.maxPositionSizeUsd,
        activePositionsCount: riskBudget.currentActivePositions,
        maxConcurrentPositions: riskBudget.maxConcurrentPositions,
        dailyLossLimitUsd: riskBudget.dailyLossLimitUsd,
        currentDailyLossUsd: riskBudget.currentDailyLossUsd,
      },
    });

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        throw new Error(`Qwen API returned status ${response.status}`);
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content || '';

      // Parse JSON from LLM response
      const parsedJson = JSON.parse(rawContent);
      parsedJson.providerMode = 'QWEN_LIVE';
      parsedJson.rawLlmResponse = rawContent;

      // Validate strict schema with Zod
      const validatedProposal = LLMDecisionProposalSchema.parse(parsedJson);

      // Verify asset is in approved watchlist
      if (!approvedSymbols.includes(validatedProposal.symbol)) {
        return this.createFallbackProposal(
          marketContext.symbol,
          `LLM proposed unapproved symbol "${validatedProposal.symbol}" outside explicit rToken watchlist.`,
          rawContent
        );
      }

      // Verify evidence references are non-empty if proposing actionable trade
      if (
        (validatedProposal.action === 'ENTER_LONG' || validatedProposal.action === 'ENTER_SHORT') &&
        (!validatedProposal.evidenceReferences || validatedProposal.evidenceReferences.length === 0)
      ) {
        return this.createFallbackProposal(
          marketContext.symbol,
          `LLM proposed trade action "${validatedProposal.action}" without providing required evidence references.`,
          rawContent
        );
      }

      return validatedProposal;
    } catch (err: any) {
      // Safe fallback on malformed JSON, API error, or Zod validation failure
      return this.createFallbackProposal(
        marketContext.symbol,
        `Qwen LLM evaluation failed or produced malformed response: ${err.message || 'Validation error'}`
      );
    }
  }

  private createFallbackProposal(
    symbol: string,
    reason: string,
    rawLlmResponse?: string
  ): LLMDecisionProposal {
    return {
      action: 'STAND_DOWN',
      symbol,
      confidence: 0,
      rationale: [
        `Safety Override: LLM decision provider triggered safe Stand-Down fallback.`,
        reason,
      ],
      evidenceReferences: ['Safety Fallback Triggered'],
      invalidationCondition: 'Re-run LLM evaluation with valid inputs.',
      proposedStopLossPct: 0,
      proposedTakeProfitPct: 0,
      standDownReason: reason,
      rawLlmResponse,
      providerMode: 'QWEN_LIVE',
    };
  }
}
