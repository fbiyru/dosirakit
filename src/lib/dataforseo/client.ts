import { DataForSEOError } from './errors';

const BASE_URL = 'https://api.dataforseo.com/v3';

function getAuth(): string {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) {
    throw new DataForSEOError('DataForSEO credentials not configured', 500);
  }
  return 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64');
}

async function apiPost(path: string, body: unknown[]): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: getAuth(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new DataForSEOError(`DataForSEO ${res.status}: ${text}`, res.status);
  }
  return res.json();
}

export function extractDomain(url: string): string {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .toLowerCase();
}

export interface KeywordOpportunity {
  keyword: string;
  volume: number;
  kd: number;
  traffic_potential: number;
}

interface DFSEOItem {
  keyword_data?: {
    keyword?: string;
    keyword_info?: { search_volume?: number };
    keyword_properties?: { keyword_difficulty?: number };
  };
  first_domain_serp_element?: unknown;
  second_domain_serp_element?: unknown;
}

function getItems(response: unknown): DFSEOItem[] {
  const r = response as {
    tasks?: Array<{ result?: Array<{ items?: unknown[] }> }>;
  };
  return (r?.tasks?.[0]?.result?.[0]?.items ?? []) as DFSEOItem[];
}

function parseItem(item: DFSEOItem): KeywordOpportunity | null {
  const kd = item.keyword_data;
  if (!kd?.keyword) return null;
  const volume = Number(kd.keyword_info?.search_volume ?? 0);
  const difficulty = Number(kd.keyword_properties?.keyword_difficulty ?? 0);
  return {
    keyword: kd.keyword,
    volume,
    kd: difficulty,
    traffic_potential: Math.round(volume * 0.1),
  };
}

/**
 * Keywords where the brand ranks 6–20 on Google — close to page 1.
 */
export async function getStrikingDistance(
  siteUrl: string
): Promise<KeywordOpportunity[]> {
  const domain = extractDomain(siteUrl);
  const response = await apiPost('/dataforseo_labs/google/ranked_keywords/live', [
    {
      target: domain,
      language_name: 'English',
      location_code: 2840,
      filters: [
        ['ranked_serp_element.serp_item.rank_absolute', '>=', 6],
        'and',
        ['ranked_serp_element.serp_item.rank_absolute', '<=', 20],
        'and',
        ['keyword_data.keyword_info.search_volume', '>', 50],
      ],
      order_by: ['keyword_data.keyword_info.search_volume,desc'],
      limit: 100,
    },
  ]);

  return getItems(response)
    .map(parseItem)
    .filter((k): k is KeywordOpportunity => k !== null);
}

/**
 * Keywords a competitor ranks for (top 20) that the brand doesn't rank for at all.
 * Returns empty array on any error so one bad competitor doesn't abort the fetch.
 */
export async function getCompetitorGap(
  siteUrl: string,
  competitorUrl: string
): Promise<KeywordOpportunity[]> {
  try {
    const competitor = extractDomain(competitorUrl);
    const domain = extractDomain(siteUrl);
    const response = await apiPost(
      '/dataforseo_labs/google/domain_intersection/live',
      [
        {
          // target1 = competitor, target2 = brand; intersections:false returns
          // keywords where only one domain ranks. We filter below for target1-only.
          target1: competitor,
          target2: domain,
          language_name: 'English',
          location_code: 2840,
          intersections: false,
          filters: [['keyword_data.keyword_info.search_volume', '>', 50]],
          order_by: ['keyword_data.keyword_info.search_volume,desc'],
          limit: 50,
        },
      ]
    );

    return getItems(response)
      .filter(
        (item) =>
          item.first_domain_serp_element !== null &&
          item.first_domain_serp_element !== undefined &&
          (item.second_domain_serp_element === null ||
            item.second_domain_serp_element === undefined)
      )
      .map(parseItem)
      .filter((k): k is KeywordOpportunity => k !== null);
  } catch {
    return [];
  }
}

/**
 * Keywords topically related to the brand's site that it doesn't yet dominate.
 * Returns empty array on error.
 */
export async function getUnownedOpportunities(
  siteUrl: string
): Promise<KeywordOpportunity[]> {
  try {
    const domain = extractDomain(siteUrl);
    const response = await apiPost(
      '/dataforseo_labs/google/keywords_for_site/live',
      [
        {
          target: domain,
          language_name: 'English',
          location_code: 2840,
          filters: [
            ['keyword_data.keyword_info.search_volume', '>', 100],
            'and',
            ['keyword_data.keyword_properties.keyword_difficulty', '<', 50],
          ],
          order_by: ['keyword_data.keyword_info.search_volume,desc'],
          limit: 100,
        },
      ]
    );

    return getItems(response)
      .map(parseItem)
      .filter((k): k is KeywordOpportunity => k !== null);
  } catch {
    return [];
  }
}
