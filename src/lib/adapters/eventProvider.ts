import { EventItem } from '@/types/domain';

export interface IEventProvider {
  getLatestEvents(): Promise<EventItem[]>;
  getEventById(id: string): Promise<EventItem | null>;
}

export const MOCK_EVENTS: EventItem[] = [
  {
    id: 'evt-nvda-001',
    title: 'EU Regulatory Body Grants Unconditional AI Hardware Export Clearance',
    source: 'Bloomberg Terminal (Overnight Wire)',
    timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    category: 'POLICY',
    affectedSymbol: 'rNVDA',
    impactScore: 8.5,
    rawSnippet: 'European Union competition authorities have approved Next-Gen AI accelerator exports without structural remedies. Supply chain backorders are expected to normalize immediately in EU cloud hubs.',
    isDemoData: true,
  },
  {
    id: 'evt-tsla-002',
    title: 'Unverified Social Media Rumor of Battery Architecture Redesign',
    source: 'X / Crypto Telegram Channel (Low Credibility)',
    timestamp: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
    category: 'NOISE',
    affectedSymbol: 'rTSLA',
    impactScore: 2.1,
    rawSnippet: 'Speculative posts claim a breakthrough in 4680 cell density. No SEC filing, company press release, or official verification provided.',
    isDemoData: true,
  },
  {
    id: 'evt-aapl-003',
    title: 'Antitrust Commission Proposes Preliminary $4.2B European Fine',
    source: 'Reuters Financial News',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    category: 'LEGAL',
    affectedSymbol: 'rAAPL',
    impactScore: -7.8,
    rawSnippet: 'Regulatory regulators announce intent to impose non-compliance fines regarding app store payment routing rules. Legal appeals process anticipated.',
    isDemoData: true,
  },
  {
    id: 'evt-msft-004',
    title: 'Microsoft Azure Commercial Cloud Revenue Surges 29% in Q3 Preliminary Preview',
    source: 'SEC Form 8-K / Investor Relations',
    timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    category: 'EARNINGS',
    affectedSymbol: 'rMSFT',
    impactScore: 9.1,
    rawSnippet: 'Enterprise AI workloads drove Q3 commercial cloud revenues above guidance ranges. Operating margins expanded 180bps year-over-year.',
    isDemoData: true,
  },
  {
    id: 'evt-spy-005',
    title: 'Federal Reserve Member Signals Extended Higher Rate Stance in Off-Hours Q&A',
    source: 'Federal Reserve Newsfeed',
    timestamp: new Date(Date.now() - 140 * 60 * 1000).toISOString(),
    category: 'MACRO',
    affectedSymbol: 'rSPY',
    impactScore: -6.2,
    rawSnippet: 'Speaking at an academic symposium in Tokyo, regional Fed governor indicated inflation persistence may delay rate cuts past Q4.',
    isDemoData: true,
  },
];

export class MockEventProvider implements IEventProvider {
  async getLatestEvents(): Promise<EventItem[]> {
    return MOCK_EVENTS;
  }

  async getEventById(id: string): Promise<EventItem | null> {
    return MOCK_EVENTS.find((e) => e.id === id) || null;
  }
}
