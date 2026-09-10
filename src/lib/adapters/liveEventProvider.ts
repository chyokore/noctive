import crypto from 'crypto';
import { EventItem, EventCategory, ExternalInputProvenance } from '@/types/domain';
import { IEventProvider } from './eventProvider';

export interface LiveEventConfig {
  secRssUrl?: string;
  timeoutMs?: number;
}

const SEC_EDGAR_ATOM_URL = 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=8-K&output=atom';

export interface LiveEventItemWithProvenance extends EventItem {
  externalProvenance: ExternalInputProvenance;
  issuerTicker: string;
}

export interface EquityTickerMapping {
  issuerTicker: string;
  rToken: string;
}

const EQUITY_ALLOWLIST: Record<string, EquityTickerMapping> = {
  NVDA: { issuerTicker: 'NVDA', rToken: 'rNVDA' },
  AAPL: { issuerTicker: 'AAPL', rToken: 'rAAPL' },
  MSFT: { issuerTicker: 'MSFT', rToken: 'rMSFT' },
  TSLA: { issuerTicker: 'TSLA', rToken: 'rTSLA' },
  SPY:  { issuerTicker: 'SPY',  rToken: 'rSPY' },
  QQQ:  { issuerTicker: 'QQQ',  rToken: 'rQQQ' },
};

export class LiveEventProvider implements IEventProvider {
  private secRssUrl: string;
  private timeoutMs: number;

  constructor(config: LiveEventConfig = {}) {
    this.secRssUrl = config.secRssUrl || SEC_EDGAR_ATOM_URL;
    this.timeoutMs = config.timeoutMs || 8000;
  }

  async getLatestEvents(): Promise<EventItem[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const retrievedAtTimestamp = new Date().toISOString();

    try {
      const res = await fetch(this.secRssUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'NoctiveIntelligenceAgent/1.0 (contact@noctive.ai)',
          'Accept': 'application/atom+xml, application/rss+xml, application/xml, text/xml, */*',
        },
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`SEC EDGAR RSS HTTP ${res.status}`);
      }

      const xmlText = await res.text();
      const entries = this.parseXmlEntries(xmlText);

      if (!entries || entries.length === 0) {
        return [];
      }

      const results: EventItem[] = [];

      for (const entry of entries) {
        // Extract issuer ticker and map ONLY to supported rToken equity allowlist
        const mappedEquity = this.extractAndMapTicker(entry.title, entry.companyName, entry.rawSnippet);

        // Fail-closed requirement: Only eligible when it maps to a supported rToken equity
        if (!mappedEquity) continue;

        const id = `live-sec-${crypto.createHash('md5').update(entry.link || entry.title).digest('hex').substring(0, 12)}`;
        const contentHash = crypto.createHash('sha256').update(entry.rawSnippet).digest('hex').substring(0, 16);
        const category = this.categorizeTitle(entry.title, entry.rawSnippet);
        const impactScore = this.calculateImpactScore(category, entry.rawSnippet);

        const externalProvenance: ExternalInputProvenance = {
          sourceUrl: entry.link || this.secRssUrl,
          publisherName: 'U.S. SEC EDGAR (sec.gov)',
          retrievedAtTimestamp,
          publishedAtTimestamp: entry.published || retrievedAtTimestamp,
          symbolMapping: `SEC Issuer Ticker: ${mappedEquity.issuerTicker} -> Equity rToken: ${mappedEquity.rToken}`,
          contentHash,
          dataMode: 'LIVE_EXTERNAL',
        };

        const item: EventItem = {
          id,
          title: entry.title,
          source: `SEC EDGAR Form 8-K (${entry.companyName || mappedEquity.issuerTicker})`,
          timestamp: entry.published || retrievedAtTimestamp,
          category,
          affectedSymbol: mappedEquity.rToken,
          impactScore,
          rawSnippet: entry.rawSnippet,
          isDemoData: false,
        };

        (item as LiveEventItemWithProvenance).externalProvenance = externalProvenance;
        (item as LiveEventItemWithProvenance).issuerTicker = mappedEquity.issuerTicker;

        results.push(item);
      }

      return results;
    } catch (err: any) {
      clearTimeout(timer);
      console.warn(`[LiveEventProvider] Live SEC EDGAR fetch unavailable (${err.message}). Fail-closed: 0 events returned.`);
      return [];
    }
  }

  async getEventById(id: string): Promise<EventItem | null> {
    const events = await this.getLatestEvents();
    return events.find((e) => e.id === id) || null;
  }

  private parseXmlEntries(xml: string): Array<{
    title: string;
    link: string;
    published: string;
    companyName: string;
    rawSnippet: string;
  }> {
    const items: Array<{
      title: string;
      link: string;
      published: string;
      companyName: string;
      rawSnippet: string;
    }> = [];

    const entryBlocks = xml.match(/<(entry|item)[\s\S]*?<\/(entry|item)>/gi) || [];

    for (const block of entryBlocks) {
      const titleMatch = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const linkMatch = block.match(/href=["']([^"']+)["']/i) || block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
      const updatedMatch = block.match(/<(updated|pubDate|published)[^>]*>([\s\S]*?)<\/\1>/i);
      const summaryMatch = block.match(/<(summary|description|content)[^>]*>([\s\S]*?)<\/\1>/i);

      const rawTitle = titleMatch ? this.stripHtml(titleMatch[1]) : '';
      const rawLink = linkMatch ? linkMatch[1] : '';
      const rawDate = updatedMatch ? this.stripHtml(updatedMatch[2]) : new Date().toISOString();
      const rawSummary = summaryMatch ? this.stripHtml(summaryMatch[2]) : rawTitle;

      if (!rawTitle) continue;

      const companyMatch = rawTitle.match(/^([^-–]+)/);
      const companyName = companyMatch ? companyMatch[1].trim() : 'SEC Filer';

      items.push({
        title: rawTitle,
        link: rawLink,
        published: new Date(rawDate).toString() !== 'Invalid Date' ? new Date(rawDate).toISOString() : new Date().toISOString(),
        companyName,
        rawSnippet: rawSummary.substring(0, 350),
      });
    }

    return items;
  }

  private stripHtml(str: string): string {
    return str.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').replace(/<[^>]+>/g, '').trim();
  }

  private extractAndMapTicker(title: string, companyName: string, snippet: string): EquityTickerMapping | null {
    const text = `${title} ${companyName} ${snippet}`.toUpperCase();

    if (text.includes('NVIDIA') || text.includes('NVDA')) return EQUITY_ALLOWLIST.NVDA;
    if (text.includes('APPLE') || text.includes('AAPL')) return EQUITY_ALLOWLIST.AAPL;
    if (text.includes('MICROSOFT') || text.includes('MSFT')) return EQUITY_ALLOWLIST.MSFT;
    if (text.includes('TESLA') || text.includes('TSLA')) return EQUITY_ALLOWLIST.TSLA;
    if (text.includes('S&P 500') || text.includes('SPDR') || text.includes('SPY')) return EQUITY_ALLOWLIST.SPY;
    if (text.includes('NASDAQ') || text.includes('QQQ') || text.includes('INVESCO')) return EQUITY_ALLOWLIST.QQQ;

    // Strict fail closed for any unrecognized ticker or crypto symbol
    return null;
  }

  private categorizeTitle(title: string, snippet: string): EventCategory {
    const text = `${title} ${snippet}`.toLowerCase();
    if (text.includes('earnings') || text.includes('revenue') || text.includes('quarterly') || text.includes('result')) {
      return 'EARNINGS';
    }
    if (text.includes('litigation') || text.includes('investigation') || text.includes('court') || text.includes('sec') || text.includes('fine')) {
      return 'LEGAL';
    }
    if (text.includes('rate') || text.includes('fed') || text.includes('inflation') || text.includes('treasury')) {
      return 'MACRO';
    }
    return 'POLICY';
  }

  private calculateImpactScore(category: EventCategory, snippet: string): number {
    const text = snippet.toLowerCase();
    let score = 5.0;
    if (category === 'LEGAL') score = -6.5;
    if (category === 'EARNINGS' && (text.includes('surge') || text.includes('beat'))) score = 8.2;
    if (category === 'EARNINGS' && (text.includes('miss') || text.includes('loss'))) score = -7.0;
    if (category === 'MACRO') score = text.includes('hike') ? -5.5 : 6.0;
    return score;
  }
}
