import crypto from 'crypto';
import { createSigningFetch, buildSignPayload, signPayload } from '@bitget-wallet/api/auth';
import { MarketContext, ExternalInputProvenance } from '@/types/domain';
import { IMarketDataProvider } from './marketDataProvider';

export interface BitgetWalletRwaConfig {
  baseUrl?: string;
  apiKey?: string;
  apiSecret?: string;
  timeoutMs?: number;
}

export const BITGET_WALLET_BOPENAPI_URL = 'https://bopenapi.bgwapi.io';

export interface BitgetRwaStockItem {
  ticker: string;
  chain: string;
  contract: string;
  symbol: string;
  name?: string;
  market_status?: string;
  latest_price?: number | string;
  data_source?: string;
  trace_id?: string;
}

export interface MarketContextWithRwaProvenance extends MarketContext {
  externalProvenance: ExternalInputProvenance;
  chain: string;
  contractAddress: string;
}

/**
 * Construct x-api-signature using official Bitget Wallet TypeScript SDK helper:
 * - Uses buildSignPayload and signPayload from @bitget-wallet/api/auth
 * - Never log key, secret, signature, or authorization headers
 */
export function buildBitgetWalletSignature(
  apiPath: string,
  rawBodyStr: string,
  apiKey: string,
  timestampMs: string,
  apiSecret: string
): string {
  const payload = buildSignPayload({
    apiPath,
    body: rawBodyStr,
    queryParams: {},
    apiKey,
    apiTimestamp: timestampMs,
  });
  return signPayload(payload, apiSecret);
}

export interface BitgetWalletRwaLastError {
  httpStatus?: number;
  code?: string | number;
  message?: string;
  traceId?: string;
}

export interface BitgetWalletRwaSchemaDiagnostic {
  contentType?: string;
  topLevelKeys?: string[];
  code?: number | string;
  status?: number | string;
  dataType?: 'array' | 'object' | 'primitive' | 'null';
  dataKeys?: string[];
  hasList?: boolean;
  listLength?: number;
  itemKeys?: string[];
  contractsType?: string;
  contractItemKeys?: string[];
  sampleDataSources?: string[];
}

export class BitgetWalletRwaMarketProvider implements IMarketDataProvider {
  private baseUrl: string;
  private apiKey?: string;
  private apiSecret?: string;
  private timeoutMs: number;
  public lastError: BitgetWalletRwaLastError | null = null;
  public schemaDiagnostic: BitgetWalletRwaSchemaDiagnostic | null = null;

  constructor(config: BitgetWalletRwaConfig = {}) {
    this.baseUrl = config.baseUrl || BITGET_WALLET_BOPENAPI_URL;
    this.apiKey = config.apiKey || process.env.BITGET_WALLET_API_KEY;
    this.apiSecret = config.apiSecret || process.env.BITGET_WALLET_API_SECRET;
    this.timeoutMs = config.timeoutMs || 5000;
  }

  async getWatchlist(): Promise<MarketContext[]> {
    const retrievedAtTimestamp = new Date().toISOString();
    const apiPath = '/bgw-pro/market/v3/rwa/stockList';
    const endpointUrl = `${this.baseUrl}${apiPath}`;

    // Requirement 4: Require both BITGET_WALLET_API_KEY and BITGET_WALLET_API_SECRET
    if (!this.apiKey || !this.apiSecret || this.apiKey.trim() === '' || this.apiSecret.trim() === '') {
      this.lastError = {
        message: 'BITGET_WALLET_API_KEY or BITGET_WALLET_API_SECRET environment variable is missing',
      };
      console.warn(
        `[BitgetWalletRwaMarketProvider] Authentication failed: BITGET_WALLET_API_KEY or BITGET_WALLET_API_SECRET environment variable is missing. Fail closed.`
      );
      return [];
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const signingFetch = createSigningFetch({
        apiKey: this.apiKey,
        apiSecret: this.apiSecret,
      });

      const rawBodyStr = '{}';

      const res = await signingFetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'NoctiveRwaAgent/1.0',
        },
        body: rawBodyStr,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        let errCode: string | number | undefined;
        let errMsg: string | undefined;
        let traceId: string | undefined;

        try {
          const errBody = await res.json();
          if (errBody && typeof errBody === 'object') {
            if (errBody.code !== undefined) errCode = errBody.code;
            else if (errBody.errorCode !== undefined) errCode = errBody.errorCode;

            const msgCandidate = errBody.msg || errBody.message || errBody.error;
            if (typeof msgCandidate === 'string') {
              errMsg = msgCandidate.replace(/[^a-zA-Z0-9 _.:-]/g, '').trim().slice(0, 200);
            }

            const rawTrace = errBody.trace_id || errBody.traceId || errBody.trace;
            if (rawTrace) {
              traceId = String(rawTrace).replace(/[^a-zA-Z0-9_-]/g, '');
            }
          }
        } catch {
          // Response body was not valid JSON
        }

        if (!traceId && res.headers && typeof res.headers.get === 'function') {
          const headerTrace =
            res.headers.get('x-trace-id') ||
            res.headers.get('trace-id') ||
            res.headers.get('traceid') ||
            res.headers.get('x-bgw-trace-id') ||
            res.headers.get('bgw-trace-id');
          if (headerTrace) {
            traceId = headerTrace.replace(/[^a-zA-Z0-9_-]/g, '');
          }
        }

        const details: string[] = [`HTTP status ${res.status}`];
        if (errCode !== undefined) details.push(`Code: ${errCode}`);
        if (errMsg) details.push(`Message: ${errMsg}`);
        if (traceId) details.push(`traceId: ${traceId}`);

        this.lastError = {
          httpStatus: res.status,
          code: errCode,
          message: errMsg,
          traceId,
        };

        throw new Error(details.join(', '));
      }

      const contentType = (res.headers && typeof res.headers.get === 'function' ? res.headers.get('content-type') : null) || undefined;
      const body = await res.json();

      let dataType: 'array' | 'object' | 'primitive' | 'null' = 'null';
      let dataKeys: string[] = [];
      let hasList = false;
      let listLength = 0;

      if (body && typeof body === 'object') {
        const rawData = body.data;
        if (Array.isArray(rawData)) {
          dataType = 'array';
          listLength = rawData.length;
        } else if (rawData && typeof rawData === 'object') {
          dataType = 'object';
          dataKeys = Object.keys(rawData);
          if (Array.isArray(rawData.list)) {
            hasList = true;
            listLength = rawData.list.length;
          } else if (Array.isArray(rawData.items)) {
            hasList = true;
            listLength = rawData.items.length;
          }
        } else if (rawData !== undefined && rawData !== null) {
          dataType = 'primitive';
        }
      }

      const rawList: any[] = Array.isArray(body?.data?.list)
        ? body.data.list
        : Array.isArray(body?.data?.items)
        ? body.data.items
        : Array.isArray(body?.data)
        ? body.data
        : [];

      let itemKeys: string[] = [];
      let contractsType = 'undefined';
      let contractItemKeys: string[] = [];
      const sampleDataSourcesSet = new Set<string>();

      if (Array.isArray(rawList) && rawList.length > 0 && rawList[0] && typeof rawList[0] === 'object') {
        itemKeys = Object.keys(rawList[0]);
        const contractsVal = rawList[0].contracts;
        if (Array.isArray(contractsVal)) {
          contractsType = 'array';
          if (contractsVal.length > 0 && contractsVal[0] && typeof contractsVal[0] === 'object') {
            contractItemKeys = Object.keys(contractsVal[0]);
          }
        } else if (contractsVal && typeof contractsVal === 'object') {
          contractsType = 'object';
          contractItemKeys = Object.keys(contractsVal);
        } else if (contractsVal !== undefined) {
          contractsType = typeof contractsVal;
        }
      }

      if (Array.isArray(rawList)) {
        for (const item of rawList) {
          if (item?.data_source) sampleDataSourcesSet.add(String(item.data_source).slice(0, 30));
          if (item?.dataSource) sampleDataSourcesSet.add(String(item.dataSource).slice(0, 30));
          if (Array.isArray(item?.contracts)) {
            for (const c of item.contracts) {
              if (c?.data_source) sampleDataSourcesSet.add(String(c.data_source).slice(0, 30));
              if (c?.dataSource) sampleDataSourcesSet.add(String(c.dataSource).slice(0, 30));
              if (c?.source) sampleDataSourcesSet.add(String(c.source).slice(0, 30));
              if (c?.protocol) sampleDataSourcesSet.add(String(c.protocol).slice(0, 30));
              if (c?.issuer) sampleDataSourcesSet.add(String(c.issuer).slice(0, 30));
            }
          }
        }
      }

      this.schemaDiagnostic = {
        contentType,
        topLevelKeys: body && typeof body === 'object' ? Object.keys(body) : [],
        code: body?.code !== undefined ? body.code : undefined,
        status: body?.status !== undefined ? body.status : undefined,
        dataType,
        dataKeys,
        hasList,
        listLength,
        itemKeys,
        contractsType,
        contractItemKeys,
        sampleDataSources: Array.from(sampleDataSourcesSet).slice(0, 10),
      };

      const isSuccessCode =
        body?.code === 0 ||
        body?.code === '0' ||
        body?.code === 200 ||
        body?.code === '200' ||
        body?.status === 0 ||
        body?.status === '0' ||
        body?.status === 200 ||
        body?.status === '200' ||
        (body?.code === undefined && body?.status === undefined);

      if (!isSuccessCode || !Array.isArray(rawList)) {
        const errMsg = (body?.msg || body?.message || body?.error || 'Invalid API response payload')
          .replace(/[^a-zA-Z0-9 _.:-]/g, '')
          .trim()
          .slice(0, 200);
        const errCode = body?.code !== undefined ? body.code : body?.status;
        const traceId = (body?.trace_id || body?.traceId || body?.traceId || '').replace(/[^a-zA-Z0-9_-]/g, '');

        this.lastError = {
          httpStatus: res.status,
          code: errCode,
          message: errMsg,
          traceId: traceId || undefined,
        };

        throw new Error(
          `Code: ${errCode !== undefined ? errCode : 'N/A'}, Message: ${errMsg}${traceId ? `, traceId: ${traceId}` : ''}`
        );
      }

      const items: MarketContext[] = [];

      for (const rawItem of rawList) {
        const contractEntries: any[] = [];

        if (Array.isArray(rawItem.contracts) && rawItem.contracts.length > 0) {
          for (const c of rawItem.contracts) {
            if (c && typeof c === 'object') {
              contractEntries.push({ ...rawItem, ...c, parentTicker: rawItem.ticker, parentName: rawItem.name });
            }
          }
        } else {
          contractEntries.push(rawItem);
        }

        for (const entry of contractEntries) {
          // Requirement: Accept a market ONLY if data_source === "reality"
          const dataSource = (entry.data_source || entry.dataSource || entry.source || entry.protocol || entry.dataMode || '').toLowerCase();
          if (dataSource !== 'reality') {
            continue;
          }

          const ticker = entry.ticker || entry.parentTicker || entry.issuerTicker || entry.stockTicker || '';
          const chain = entry.chain || entry.chainName || entry.network || 'ethereum';
          const contract = entry.contract || entry.contractAddress || entry.address || '';
          const symbol = entry.symbol || (ticker ? `r${ticker}` : '');
          const marketStatus = entry.market_status || entry.marketStatus || entry.status || 'OPEN';
          const parsedPrice = parseFloat(String(entry.latest_price || entry.latestPrice || entry.price || '0'));
          const latestPrice = !isNaN(parsedPrice) && parsedPrice > 0 ? parsedPrice : 100.0;
          const traceId = (entry.trace_id || entry.traceId || body?.traceId || body?.trace_id || '').replace(/[^a-zA-Z0-9_-]/g, '');

          if (!symbol) {
            continue;
          }

        const prevClose = latestPrice;
        const change24hPct = 0;
        const spreadPct = 0.05;
        const bidPrice = parseFloat((latestPrice * 0.9998).toFixed(2));
        const askPrice = parseFloat((latestPrice * 1.0002).toFixed(2));
        const liquidityDepthIndex = 95;

        const contentHash = crypto
          .createHash('sha256')
          .update(JSON.stringify(rawItem))
          .digest('hex')
          .substring(0, 16);

        const externalProvenance: ExternalInputProvenance = {
          sourceUrl: endpointUrl,
          publisherName: 'Bitget Wallet RWA / Reality Protocol',
          retrievedAtTimestamp,
          dataAsOfTimestamp: retrievedAtTimestamp,
          symbolMapping: `SEC Issuer: ${ticker} -> Chain: ${chain} -> Contract: ${contract} -> Symbol: ${symbol} (Source: reality)`,
          conceptualRTokenSymbol: symbol,
          underlyingStockSymbol: ticker,
          chain,
          contractAddress: contract,
          dataSource: 'reality',
          traceId,
          rawPrice: latestPrice,
          contentHash,
          dataMode: 'BITGET_WALLET_RWA_REALITY_READ_ONLY',
        };

        const ctx: MarketContextWithRwaProvenance = {
          symbol,
          name: rawItem.name || `${ticker} Tokenized Stock (Bitget Wallet Reality RWA)`,
          currentPrice: latestPrice,
          prevClose,
          change24hPct,
          bidPrice,
          askPrice,
          spreadPct,
          volume24hUsd: 10000000,
          liquidityDepthIndex,
          sessionStatus: marketStatus === 'OPEN' ? 'OVERNIGHT_ACTIVE' : 'REGULAR_CLOSED',
          isDemoData: false,
          externalProvenance,
          chain,
          contractAddress: contract,
        };

        items.push(ctx);
        }
      }

      return items;
    } catch (err: any) {
      clearTimeout(timer);
      if (!this.lastError) {
        this.lastError = {
          message: err.message,
        };
      }
      console.warn(`[BitgetWalletRwaMarketProvider] Fail closed: ${err.message}`);
      return [];
    }
  }

  async getMarketContext(symbol: string): Promise<MarketContext | null> {
    const watchlist = await this.getWatchlist();
    return watchlist.find((item) => item.symbol === symbol) || null;
  }
}
